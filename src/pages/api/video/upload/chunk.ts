import type { APIRoute } from 'astro';

export const prerender = false;

const TEMP_DIR = './public/uploads/temp';
const USE_CLOUD_STORAGE = process.env.VERCEL_ENV === 'production' || process.env.USE_CLOUD_STORAGE === 'true';

// Cloud chunk storage - store chunks in memory for cloud assembly
// WARNING: In serverless environments, this memory is not shared between function invocations
// For production, use external storage like Redis, S3, or database
if (!globalThis.chunkStorage) {
  globalThis.chunkStorage = new Map();
}

// Memory cleanup to prevent accumulation
function cleanupExpiredChunks() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (globalThis.chunkStorage) {
    for (const [chunkKey, chunkData] of globalThis.chunkStorage.entries()) {
      if (chunkData.uploadedAt < oneHourAgo) {
        globalThis.chunkStorage.delete(chunkKey);
      }
    }
  }
}

// Local chunk storage (development only)
async function saveChunkLocally(uploadId: string, chunkIndex: number, chunk: File): Promise<string> {
  const { writeFile } = await import('fs/promises');
  const { join } = await import('path');
  
  const chunkFilename = `${uploadId}_chunk_${chunkIndex}`;
  const chunkPath = join(TEMP_DIR, chunkFilename);
  
  const buffer = await chunk.arrayBuffer();
  await writeFile(chunkPath, new Uint8Array(buffer));
  
  return chunkFilename;
}

// Cloud chunk storage - store in memory temporarily
// WARNING: This approach is unreliable in serverless environments
function saveChunkToMemory(uploadId: string, chunkIndex: number, chunk: File): string {
  const chunkKey = `${uploadId}_${chunkIndex}`;
  
  // Clean up expired chunks before storing new one
  cleanupExpiredChunks();
  
  // Store the chunk as a blob in memory
  if (!globalThis.chunkStorage) {
    globalThis.chunkStorage = new Map();
  }
  
  globalThis.chunkStorage.set(chunkKey, {
    data: chunk,
    uploadedAt: Date.now(),
    size: chunk.size,
    type: chunk.type
  });
  
  // Log memory usage for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`Stored chunk ${chunkIndex} (${chunk.size} bytes) for upload ${uploadId}`);
    console.log(`Total chunks in memory: ${globalThis.chunkStorage.size}`);
  }
  
  return chunkKey;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const chunk = formData.get('chunk') as File;

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunk) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields: uploadId, chunkIndex, totalChunks, chunk'
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
        message: 'Invalid or expired upload session. This may be due to serverless function isolation. Consider using external session storage.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = globalThis.uploadSessions.get(uploadId);
    
    // Update session activity timestamp
    session.lastActivity = Date.now();
    
    // Update total chunks if this is the first chunk
    if (session.totalChunks === 0) {
      session.totalChunks = totalChunks;
    }
    
    // Validate total chunks consistency
    if (session.totalChunks !== totalChunks) {
      console.warn(`Chunk count mismatch for ${uploadId}: session has ${session.totalChunks}, request has ${totalChunks}`);
      // Update to the most recent value
      session.totalChunks = totalChunks;
    }

    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid chunk index'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if chunk already uploaded (idempotency protection)
    if (session.chunks.has(chunkIndex)) {
      // Update activity timestamp even for duplicate chunks
      session.lastActivity = Date.now();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Chunk already uploaded (idempotent)',
        uploadedChunks: session.uploadedChunks,
        totalChunks: session.totalChunks,
        progress: Math.round((session.uploadedChunks / session.totalChunks) * 100)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save chunk based on storage type
    let chunkFilename: string;
    
    try {
      if (session.useCloudStorage) {
        // Store chunk in memory for cloud assembly
        chunkFilename = saveChunkToMemory(uploadId, chunkIndex, chunk);
      } else {
        // Save chunk to local file system
        chunkFilename = await saveChunkLocally(uploadId, chunkIndex, chunk);
      }
      
      // Record chunk in session with atomic update
      const chunkInfo = {
        filename: chunkFilename,
        size: chunk.size,
        uploadedAt: Date.now(),
        isCloudStorage: session.useCloudStorage
      };
      
      // Atomic update to prevent race conditions
      session.chunks.set(chunkIndex, chunkInfo);
      session.uploadedChunks = session.chunks.size; // Recalculate based on actual chunks
      session.lastActivity = Date.now();
      
      // Validate upload progress consistency
      if (session.uploadedChunks > session.totalChunks) {
        console.warn(`Upload chunk count exceeds total for ${uploadId}: ${session.uploadedChunks}/${session.totalChunks}`);
      }
      
    } catch (error) {
      console.error('Failed to save chunk:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save chunk'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate upload progress
    const progress = Math.round((session.uploadedChunks / session.totalChunks) * 100);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks,
      progress,
      serverlessWarning: session.serverlessWarning && session.uploadedChunks === 1 
        ? 'First chunk uploaded. Subsequent chunks may fail in serverless environments due to session isolation.'
        : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chunk upload error:', error);
    
    let errorMessage = 'Internal server error during chunk upload';
    if (error instanceof Error) {
      if (error.message.includes('ENOSPC')) {
        errorMessage = 'Insufficient storage space.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Storage permission error.';
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