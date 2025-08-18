import type { APIRoute } from 'astro';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const prerender = false;

interface InitRequest {
  filename: string;
  fileSize: number;
  contentType: string;
  title: string;
  tags: string;
}

interface InitResponse {
  success: boolean;
  uploadId?: string;
  message?: string;
}

const UPLOAD_DIR = './public/uploads/videos';
const TEMP_DIR = './public/uploads/temp';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { filename, fileSize, contentType, title, tags }: InitRequest = await request.json();

    // Validate input
    if (!filename || !fileSize || !title?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields: filename, fileSize, title'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (fileSize > maxSize) {
      return new Response(JSON.stringify({
        success: false,
        message: 'File too large. Maximum size is 2GB'
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique upload ID
    const uploadId = generateUploadId();
    
    // Ensure directories exist
    try {
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }
      if (!existsSync(TEMP_DIR)) {
        await mkdir(TEMP_DIR, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create directories:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to prepare upload directories'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store upload metadata (in production, use database)
    if (!globalThis.uploadSessions) {
      globalThis.uploadSessions = new Map();
    }

    const sanitizedFilename = sanitizeFileName(filename);
    const fileExtension = getFileExtension(sanitizedFilename);
    const finalFilename = `${uploadId}${fileExtension}`;

    globalThis.uploadSessions.set(uploadId, {
      filename: sanitizedFilename,
      finalFilename,
      fileSize,
      contentType,
      title: title.trim(),
      tags: tags.trim(),
      chunks: new Map(),
      totalChunks: 0,
      uploadedChunks: 0,
      createdAt: Date.now()
    });

    const response: InitResponse = {
      success: true,
      uploadId,
      message: 'Chunked upload initialized successfully'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload initialization error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error during upload initialization'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function generateUploadId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}

function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\.+/g, '.')
    .replace(/^\.+/, '')
    .trim()
    .substring(0, 255);
}