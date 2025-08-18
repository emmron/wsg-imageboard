import type { APIRoute } from 'astro';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

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
    if (!globalThis.uploadSessions?.has(uploadId)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid or expired upload session'
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
      
    } catch (error) {
      console.error('Failed to combine chunks:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to combine uploaded chunks'
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
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error during upload completion'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};