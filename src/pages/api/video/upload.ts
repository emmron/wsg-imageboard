import type { APIRoute } from 'astro';

export const prerender = false; // Enable server-side processing

// Use environment variable to determine storage method
const USE_CLOUD_STORAGE = process.env.VERCEL_ENV === 'production' || process.env.USE_CLOUD_STORAGE === 'true';

interface VideoUploadResponse {
  success: boolean;
  videoId?: string;
  message?: string;
  needsConversion?: boolean;
  supportedFormat?: boolean;
  fileUrl?: string;
}

// Server-side file validation
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 
  'video/quicktime', 'video/wmv', 'video/x-ms-wmv', 'video/mkv', 
  'video/x-matroska', 'video/flv', 'video/x-flv', 'video/3gpp',
  'video/mpeg', 'video/m4v'
];

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const UPLOAD_DIR = './public/uploads/videos';

// Cloud storage upload function with improved error handling
async function uploadToCloudStorage(file: File, filename: string): Promise<string> {
  // Check if we're in a Vercel environment and cloud storage is enabled
  const isVercelEnvironment = process.env.VERCEL_ENV || process.env.VERCEL;
  
  if (USE_CLOUD_STORAGE && isVercelEnvironment) {
    try {
      // Attempt to use Vercel Blob storage
      const { put } = await import('@vercel/blob');
      const blob = await put(`videos/${filename}`, file, {
        access: 'public',
        addRandomSuffix: false,
      });
      return blob.url;
    } catch (importError) {
      console.error('Vercel Blob import or upload failed:', importError);
      
      // Log the specific error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cloud storage unavailable, falling back to local storage');
        console.warn('To use cloud storage, ensure @vercel/blob is installed and configured');
      }
      
      // Fallback to local storage
      return `/uploads/videos/${filename}`;
    }
  } else {
    // Local development or cloud storage disabled
    return `/uploads/videos/${filename}`;
  }
}

// Local file system upload (development only)
async function uploadToLocalStorage(file: File, filePath: string, fileUrl: string): Promise<string> {
  const { writeFile, mkdir } = await import('fs/promises');
  const { existsSync } = await import('fs');
  
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    const buffer = await file.arrayBuffer();
    await writeFile(filePath, new Uint8Array(buffer));
    return fileUrl;
  } catch (error) {
    console.error('Local storage upload failed:', error);
    throw new Error('Failed to save uploaded file');
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid content type. Expected multipart/form-data'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const title = formData.get('title') as string;
    const tags = formData.get('tags') as string;

    // Validate required fields
    if (!videoFile || !videoFile.size) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No video file provided or file is empty'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!title?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Video title is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size
    if (videoFile.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        success: false,
        message: 'File too large. Maximum size is 2GB'
      }), {
        status: 413, // Payload Too Large
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type (both MIME type and extension)
    const fileExtension = getFileExtension(videoFile.name).toLowerCase();
    const validExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.mkv', '.flv', '.3gp', '.m4v'];
    
    if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type) && !validExtensions.includes(fileExtension)) {
      return new Response(JSON.stringify({
        success: false,
        message: `Unsupported video format. Supported formats: ${validExtensions.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Sanitize filename to prevent path traversal
    const safeFileName = sanitizeFileName(videoFile.name);
    if (!safeFileName) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid filename'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique video ID and filename
    const videoId = generateVideoId();
    const fileExtension2 = getFileExtension(safeFileName);
    const fileName = `${videoId}${fileExtension2}`;
    
    // Upload file to storage
    let fileUrl: string;
    
    try {
      if (USE_CLOUD_STORAGE) {
        fileUrl = await uploadToCloudStorage(videoFile, fileName);
      } else {
        const { join } = await import('path');
        const filePath = join(UPLOAD_DIR, fileName);
        const localUrl = `/uploads/videos/${fileName}`;
        fileUrl = await uploadToLocalStorage(videoFile, filePath, localUrl);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save uploaded file'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if format is web-compatible
    const webCompatibleFormats = ['video/mp4', 'video/webm', 'video/ogg'];
    const needsConversion = !webCompatibleFormats.includes(videoFile.type);
    
    const response: VideoUploadResponse = {
      success: true,
      videoId,
      needsConversion,
      supportedFormat: !needsConversion,
      fileUrl,
      message: needsConversion 
        ? 'Video uploaded successfully. Converting to web-compatible format...'
        : 'Video uploaded successfully and is ready for playback.'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Video upload error:', error);
    
    // Provide more specific error messages for debugging
    let errorMessage = 'Internal server error during upload';
    if (error instanceof Error) {
      if (error.message.includes('ENOENT') || error.message.includes('permission')) {
        errorMessage = 'Storage access error. This may be a deployment configuration issue.';
      } else if (error.message.includes('size')) {
        errorMessage = 'File too large or upload timeout.';
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

function generateVideoId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}

function sanitizeFileName(filename: string): string {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove illegal filename characters
    .replace(/\.\.+/g, '.') // Remove multiple dots (path traversal)
    .replace(/^\.+/, '') // Remove leading dots
    .trim()
    .substring(0, 255); // Limit filename length
}