import type { APIRoute } from 'astro';

export const prerender = false;

// Use environment variable to determine storage method
const USE_CLOUD_STORAGE = process.env.VERCEL_ENV === 'production' || process.env.USE_CLOUD_STORAGE === 'true';

// WARNING: In-memory session storage is unreliable in serverless environments
// Each serverless function invocation gets isolated memory
// For production, use external storage like Redis, Supabase, or database
if (!globalThis.uploadSessions) {
  globalThis.uploadSessions = new Map();
  
  // Log warning about session storage limitations
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    console.warn('Using in-memory session storage in production. This may cause upload failures in serverless environments.');
    console.warn('Consider implementing external session storage (Redis, database, etc.) for reliability.');
  }
}

// Session cleanup - remove sessions older than 1 hour
function cleanupExpiredSessions() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [uploadId, session] of globalThis.uploadSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      globalThis.uploadSessions.delete(uploadId);
    }
  }
}

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

// Local directory creation (development only)
async function ensureLocalDirectories(): Promise<void> {
  if (!USE_CLOUD_STORAGE) {
    const { mkdir } = await import('fs/promises');
    const { existsSync } = await import('fs');
    
    try {
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }
      if (!existsSync(TEMP_DIR)) {
        await mkdir(TEMP_DIR, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create local directories:', error);
      throw new Error('Failed to prepare local upload directories');
    }
  }
}

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
    
    // Cleanup expired sessions periodically
    cleanupExpiredSessions();
    
    // Ensure directories exist (development only)
    if (!USE_CLOUD_STORAGE) {
      try {
        await ensureLocalDirectories();
      } catch (error) {
        console.error('Directory creation failed:', error);
        return new Response(JSON.stringify({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to prepare upload directories'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Store upload metadata with enhanced session management
    // CRITICAL: In serverless environments, sessions may be lost between function invocations
    
    const sanitizedFilename = sanitizeFileName(filename);
    const fileExtension = getFileExtension(sanitizedFilename);
    const finalFilename = `${uploadId}${fileExtension}`;

    const sessionData = {
      filename: sanitizedFilename,
      finalFilename,
      fileSize,
      contentType,
      title: title.trim(),
      tags: tags.trim(),
      chunks: new Map(),
      totalChunks: Math.ceil(fileSize / (5 * 1024 * 1024)), // Estimate based on 5MB chunks
      uploadedChunks: 0,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      useCloudStorage: USE_CLOUD_STORAGE,
      serverlessWarning: process.env.VERCEL_ENV === 'production'
    };
    
    globalThis.uploadSessions.set(uploadId, sessionData);
    
    // Log session creation for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Created upload session ${uploadId} for file: ${sanitizedFilename} (${fileSize} bytes)`);
    }

    const response: InitResponse = {
      success: true,
      uploadId,
      message: process.env.VERCEL_ENV === 'production' 
        ? 'Chunked upload initialized. Note: Large uploads may fail in serverless environments due to session isolation.'
        : 'Chunked upload initialized successfully'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload initialization error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error during upload initialization';
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('EACCES')) {
        errorMessage = 'Storage permission error. This may be a deployment configuration issue.';
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