import type { APIRoute } from 'astro';

export const prerender = false; // Enable server-side processing

interface VideoUploadResponse {
  success: boolean;
  videoId?: string;
  message?: string;
  needsConversion?: boolean;
  supportedFormat?: boolean;
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

    if (!videoFile) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No video file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!title) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Video title is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (videoFile.size > maxSize) {
      return new Response(JSON.stringify({
        success: false,
        message: 'File too large. Maximum size is 2GB'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if format is web-compatible
    const webCompatibleFormats = ['video/mp4', 'video/webm', 'video/ogg'];
    const needsConversion = !webCompatibleFormats.includes(videoFile.type);
    
    // For now, we'll accept all formats and flag for conversion
    // In a production environment, you would:
    // 1. Store the original file in cloud storage
    // 2. Queue it for background processing/conversion
    // 3. Generate web-compatible versions
    // 4. Extract thumbnails
    // 5. Store metadata in database

    // Generate a unique video ID
    const videoId = generateVideoId();
    
    // For this demo, we'll create a video object that the client can handle
    const response: VideoUploadResponse = {
      success: true,
      videoId,
      needsConversion,
      supportedFormat: !needsConversion,
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