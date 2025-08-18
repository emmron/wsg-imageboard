import type { APIRoute } from 'astro';

export const prerender = false;

interface AbortRequest {
  uploadId: string;
}

const TEMP_DIR = './public/uploads/temp';
const USE_CLOUD_STORAGE = process.env.VERCEL_ENV === 'production' || process.env.USE_CLOUD_STORAGE === 'true';

// Clean up local files (development only)
async function cleanupLocalFiles(session: any): Promise<number> {
  const { unlink } = await import('fs/promises');
  const { join } = await import('path');
  
  let cleanedCount = 0;
  for (const [chunkIndex, chunkInfo] of session.chunks.entries()) {
    if (!chunkInfo.isCloudStorage) {
      const chunkPath = join(TEMP_DIR, chunkInfo.filename);
      try {
        await unlink(chunkPath);
        cleanedCount++;
      } catch (error) {
        console.warn(`Failed to delete chunk ${chunkIndex}:`, error);
      }
    }
  }
  return cleanedCount;
}

// Clean up memory chunks (cloud storage)
function cleanupMemoryChunks(session: any): number {
  let cleanedCount = 0;
  for (const [chunkIndex, chunkInfo] of session.chunks.entries()) {
    if (chunkInfo.isCloudStorage && globalThis.chunkStorage) {
      try {
        const deleted = globalThis.chunkStorage.delete(chunkInfo.filename);
        if (deleted) cleanedCount++;
      } catch (error) {
        console.warn(`Failed to delete memory chunk ${chunkIndex}:`, error);
      }
    }
  }
  return cleanedCount;
}

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

    let cleanupResults = {
      sessionFound: false,
      chunksCleanedUp: 0,
      memoryChunksCleanedUp: 0,
      localFilesCleanedUp: 0
    };

    // Clean up upload session if it exists
    if (globalThis.uploadSessions?.has(uploadId)) {
      const session = globalThis.uploadSessions.get(uploadId);
      cleanupResults.sessionFound = true;
      cleanupResults.chunksCleanedUp = session.chunks.size;
      
      try {
        if (session.useCloudStorage) {
          // Clean up memory chunks for cloud storage
          cleanupResults.memoryChunksCleanedUp = cleanupMemoryChunks(session);
        } else {
          // Clean up local files for development
          cleanupResults.localFilesCleanedUp = await cleanupLocalFiles(session);
        }
      } catch (error) {
        console.error('Cleanup failed during abort:', error);
      }
      
      // Remove session
      globalThis.uploadSessions.delete(uploadId);
    }

    return new Response(JSON.stringify({
      success: true,
      message: cleanupResults.sessionFound 
        ? `Upload aborted. Cleaned up ${cleanupResults.chunksCleanedUp} chunks.`
        : 'Upload session not found (may have expired or been cleaned up)',
      details: process.env.NODE_ENV === 'development' ? cleanupResults : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload abort error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error during upload abort',
      error: process.env.NODE_ENV === 'development' ? error?.toString() : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};