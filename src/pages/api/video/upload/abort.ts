import type { APIRoute } from 'astro';
import { unlink } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

interface AbortRequest {
  uploadId: string;
}

const TEMP_DIR = './public/uploads/temp';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { uploadId }: AbortRequest = await request.json();

    if (!uploadId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Upload ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean up upload session if it exists
    if (globalThis.uploadSessions?.has(uploadId)) {
      const session = globalThis.uploadSessions.get(uploadId);
      
      // Delete temporary chunk files
      for (const [chunkIndex, chunkInfo] of session.chunks.entries()) {
        const chunkPath = join(TEMP_DIR, chunkInfo.filename);
        try {
          await unlink(chunkPath);
        } catch (error) {
          console.warn(`Failed to delete chunk ${chunkIndex}:`, error);
        }
      }
      
      // Remove session
      globalThis.uploadSessions.delete(uploadId);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Upload aborted and temporary files cleaned up'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload abort error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error during upload abort'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};