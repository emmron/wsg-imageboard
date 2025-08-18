import type { APIRoute } from 'astro';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const prerender = false; // Enable server-side processing

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
    
    // Ensure upload directory exists
    try {
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create upload directory:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to prepare upload directory'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save file to disk
    const filePath = join(UPLOAD_DIR, fileName);
    const fileUrl = `/uploads/videos/${fileName}`;
    
    try {
      const buffer = await videoFile.arrayBuffer();
      await writeFile(filePath, new Uint8Array(buffer));
    } catch (error) {
      console.error('Failed to save file:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to save uploaded file'
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
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error during upload'
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