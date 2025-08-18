import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const videoId = url.searchParams.get('videoId');
  const time = url.searchParams.get('time') || '0'; // Time in seconds for thumbnail
  
  if (!videoId) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Video ID is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // In a real implementation, this would:
    // 1. Retrieve the video file from storage
    // 2. Extract a frame at the specified time using FFmpeg or similar
    // 3. Return the thumbnail image
    
    // For demo purposes, we'll generate a placeholder thumbnail
    const thumbnailSvg = generatePlaceholderThumbnail(videoId, parseInt(time));
    
    return new Response(thumbnailSvg, {
      status: 200,
      headers: { 
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    
    return new Response('Error generating thumbnail', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

function generatePlaceholderThumbnail(videoId: string, time: number): string {
  // Generate a deterministic color based on video ID
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) {
    hash = videoId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  const saturation = 70;
  const lightness = 50;
  
  return `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness}%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${(hue + 30) % 360}, ${saturation}%, ${lightness - 10}%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)" />
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.3)" />
      
      <!-- Play button -->
      <circle cx="160" cy="90" r="25" fill="rgba(255,255,255,0.9)" />
      <polygon points="150,80 150,100 175,90" fill="rgba(0,0,0,0.8)" />
      
      <!-- Video info -->
      <text x="10" y="25" font-family="Arial, sans-serif" font-size="12" fill="white" font-weight="bold">
        Video ID: ${videoId.substring(0, 8)}...
      </text>
      <text x="10" y="165" font-family="Arial, sans-serif" font-size="10" fill="white">
        Thumbnail at ${time}s
      </text>
    </svg>
  `.trim();
}