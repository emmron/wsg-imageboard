import type { APIRoute } from 'astro';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

const TEMP_DIR = './public/uploads/temp';

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
    
    // Update total chunks if this is the first chunk
    if (session.totalChunks === 0) {
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

    // Check if chunk already uploaded
    if (session.chunks.has(chunkIndex)) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Chunk already uploaded'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save chunk to temporary file
    const chunkFilename = `${uploadId}_chunk_${chunkIndex}`;
    const chunkPath = join(TEMP_DIR, chunkFilename);
    
    try {
      const buffer = await chunk.arrayBuffer();
      await writeFile(chunkPath, new Uint8Array(buffer));
      
      // Record chunk in session
      session.chunks.set(chunkIndex, {
        filename: chunkFilename,
        size: chunk.size,
        uploadedAt: Date.now()
      });
      session.uploadedChunks++;
      
    } catch (error) {
      console.error('Failed to save chunk:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to save chunk'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chunk upload error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error during chunk upload'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};