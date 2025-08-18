import type { APIRoute } from 'astro';

export const prerender = false;

const USE_CLOUD_STORAGE = process.env.VERCEL_ENV === 'production' || process.env.USE_CLOUD_STORAGE === 'true';

interface CompleteRequest {
  uploadId: string;
}

interface CompleteResponse {
  success: boolean;
  videoId?: string;
  fileUrl?: string;
  message?: string;
  needsConversion?: boolean;
}

const UPLOAD_DIR = './public/uploads/videos';
const TEMP_DIR = './public/uploads/temp';

// Cloud storage assembly
async function assembleChunksToCloud(session: any): Promise<string> {
  
  // Fallback assembly function for when cloud storage fails
  async function fallbackToLocalAssembly(session: any, buffer: Uint8Array): Promise<string> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');
    const { existsSync } = await import('fs');
    
    const UPLOAD_DIR = './public/uploads/videos';
    
    try {
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }
      
      const filePath = join(UPLOAD_DIR, session.finalFilename);
      await writeFile(filePath, buffer);
      
      // Clean up memory chunks
      if (globalThis.chunkStorage) {
        for (let i = 0; i < session.totalChunks; i++) {
          const chunkInfo = session.chunks.get(i);
          if (chunkInfo) {
            globalThis.chunkStorage.delete(chunkInfo.filename);
          }
        }
      }
      
      return `/uploads/videos/${session.finalFilename}`;
    } catch (error) {
      throw new Error(`Fallback local storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  try {
    // Collect all chunks from memory
    const chunkData: Uint8Array[] = [];
    let totalAssembledSize = 0;
    
    // Validate chunk storage exists
    if (!globalThis.chunkStorage) {
      throw new Error('Chunk storage not available. This may be due to serverless function isolation.');
    }
    
    // Collect chunks with better error handling
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkInfo = session.chunks.get(i);
      if (!chunkInfo) {
        throw new Error(`Missing chunk ${i}. Expected ${session.totalChunks} total chunks.`);
      }
      
      const chunkKey = chunkInfo.filename;
      const chunkEntry = globalThis.chunkStorage.get(chunkKey);
      if (!chunkEntry) {
        throw new Error(`Chunk data not found for ${chunkKey}. This may be due to serverless function memory isolation.`);
      }
      
      try {
        const buffer = await chunkEntry.data.arrayBuffer();
        const chunkBytes = new Uint8Array(buffer);
        chunkData.push(chunkBytes);
        totalAssembledSize += chunkBytes.length;
        
        // Validate chunk size matches expected
        if (chunkBytes.length !== chunkInfo.size) {
          console.warn(`Chunk ${i} size mismatch: expected ${chunkInfo.size}, got ${chunkBytes.length}`);
        }
      } catch (error) {
        throw new Error(`Failed to read chunk ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Combine chunks into single file with memory optimization
    if (totalAssembledSize === 0) {
      throw new Error('No chunk data found for assembly');
    }
    
    // Validate total size matches expected file size
    if (Math.abs(totalAssembledSize - session.fileSize) > 1024) { // Allow 1KB tolerance
      console.warn(`File size mismatch: expected ${session.fileSize}, assembled ${totalAssembledSize}`);
    }
    
    const combinedBuffer = new Uint8Array(totalAssembledSize);
    let offset = 0;
    
    for (let i = 0; i < chunkData.length; i++) {
      const chunk = chunkData[i];
      if (offset + chunk.length > totalAssembledSize) {
        throw new Error(`Buffer overflow detected at chunk ${i}`);
      }
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
      
      // Clear chunk from memory immediately to prevent accumulation
      chunkData[i] = new Uint8Array(0);
    }
    
    // Upload to cloud storage with improved error handling
    try {
      // Check if running in Vercel environment
      const isVercelEnvironment = process.env.VERCEL_ENV || process.env.VERCEL;
      
      if (isVercelEnvironment) {
        try {
          const { put } = await import('@vercel/blob');
          const file = new File([combinedBuffer], session.finalFilename, {
            type: session.contentType
          });
          
          const blob = await put(`videos/${session.finalFilename}`, file, {
            access: 'public',
            addRandomSuffix: false,
          });
          
          // Clean up memory chunks immediately
          let cleanedChunks = 0;
          for (let i = 0; i < session.totalChunks; i++) {
            const chunkInfo = session.chunks.get(i);
            if (chunkInfo && globalThis.chunkStorage) {
              const deleted = globalThis.chunkStorage.delete(chunkInfo.filename);
              if (deleted) cleanedChunks++;
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Cleaned up ${cleanedChunks}/${session.totalChunks} memory chunks`);
          }
          
          return blob.url;
        } catch (importError) {
          console.error('Vercel Blob import failed:', importError);
          // Fallback to local storage even in production if blob storage fails
          console.warn('Falling back to local storage due to cloud storage failure');
          return await fallbackToLocalAssembly(session, combinedBuffer);
        }
      } else {
        // Development environment - use local storage
        return await this.fallbackToLocalAssembly(session, combinedBuffer);
      }
    } catch (error) {
      console.error('Cloud storage upload failed completely:', error);
      throw error;
    }
  } catch (error) {
    console.error('Cloud assembly failed:', error);
    throw error;
  }
  
  // Make fallback function available to the main assembly logic
  (assembleChunksToCloud as any).fallbackToLocalAssembly = fallbackToLocalAssembly;
}

// Local file assembly (development only)
async function assembleChunksLocally(session: any): Promise<string> {
  const { writeFile, readFile, unlink } = await import('fs/promises');
  const { join } = await import('path');
  
  const finalPath = join(UPLOAD_DIR, session.finalFilename);
  const fileUrl = `/uploads/videos/${session.finalFilename}`;
  
  try {
    const chunks: Buffer[] = [];
    
    // Read chunks in order
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkInfo = session.chunks.get(i);
      if (!chunkInfo) {
        throw new Error(`Missing chunk ${i}`);
      }
      
      const chunkPath = join(TEMP_DIR, chunkInfo.filename);
      const chunkData = await readFile(chunkPath);
      chunks.push(chunkData);
    }
    
    // Combine chunks
    const finalBuffer = Buffer.concat(chunks);
    await writeFile(finalPath, finalBuffer);
    
    // Clean up temporary chunks
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkInfo = session.chunks.get(i);
      if (chunkInfo) {
        const chunkPath = join(TEMP_DIR, chunkInfo.filename);
        try {
          await unlink(chunkPath);
        } catch (error) {
          console.warn(`Failed to delete chunk ${i}:`, error);
        }
      }
    }
    
    return fileUrl;
  } catch (error) {
    console.error('Local assembly failed:', error);
    throw error;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { uploadId }: CompleteRequest = await request.json();

    if (!uploadId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Upload ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate upload session exists
    // WARNING: globalThis storage is unreliable in serverless environments
    if (!globalThis.uploadSessions?.has(uploadId)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid or expired upload session. In serverless environments, session data may be lost between function invocations.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = globalThis.uploadSessions.get(uploadId);

    // Verify all chunks are uploaded
    if (session.uploadedChunks !== session.totalChunks) {
      return new Response(JSON.stringify({
        success: false,
        message: `Upload incomplete. ${session.uploadedChunks}/${session.totalChunks} chunks uploaded`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Combine chunks into final file
    let fileUrl: string;
    
    try {
      if (session.useCloudStorage) {
        fileUrl = await assembleChunksToCloud(session);
      } else {
        fileUrl = await assembleChunksLocally(session);
      }
    } catch (error) {
      console.error('Failed to combine chunks:', error);
      
      let errorMessage = 'Failed to combine uploaded chunks';
      if (error instanceof Error) {
        if (error.message.includes('Missing chunk')) {
          errorMessage = 'Upload incomplete - some chunks are missing';
        } else if (error.message.includes('ENOSPC')) {
          errorMessage = 'Insufficient storage space to complete upload';
        } else {
          errorMessage = error.message;
        }
      }
      
      return new Response(JSON.stringify({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error?.toString() : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate video ID from upload ID
    const videoId = uploadId.substring(0, 11);
    
    // Check if format is web-compatible
    const webCompatibleFormats = ['video/mp4', 'video/webm', 'video/ogg'];
    const needsConversion = !webCompatibleFormats.includes(session.contentType);

    // Clean up session
    globalThis.uploadSessions.delete(uploadId);

    const response: CompleteResponse = {
      success: true,
      videoId,
      fileUrl,
      needsConversion,
      message: needsConversion 
        ? 'Video uploaded successfully. Converting to web-compatible format...'
        : 'Video uploaded successfully and is ready for playback.'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload completion error:', error);
    
    let errorMessage = 'Internal server error during upload completion';
    if (error instanceof Error) {
      if (error.message.includes('session')) {
        errorMessage = 'Upload session expired or invalid';
      } else {
        errorMessage = error.message;
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error?.toString() : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};