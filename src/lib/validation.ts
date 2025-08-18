// Client-side validation helpers

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  cleanTags?: string[];
}

export const VALIDATION_RULES = {
  maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB - YouTube allows up to 256GB, but we'll be more conservative
  maxTitleLength: 100,
  maxTagLength: 30,
  maxTags: 10,
  maxCommentLength: 1000,
  // Comprehensive video format support - covers all major formats like YouTube
  allowedVideoTypes: [
    // Primary web formats
    'video/mp4',
    'video/webm',
    'video/ogg',
    
    // Common desktop formats
    'video/avi',
    'video/mov',
    'video/quicktime', // Alternative MIME for MOV
    'video/wmv',
    'video/x-ms-wmv', // Alternative MIME for WMV
    'video/asf',
    'video/x-ms-asf',
    
    // Professional/broadcast formats
    'video/mxf',
    'video/x-mxf',
    
    // Mobile formats
    'video/3gpp', // 3GP
    'video/3gpp2', // 3G2
    'video/mp2t', // MPEG-2 Transport Stream
    
    // MPEG variants
    'video/mpeg',
    'video/mpg',
    'video/x-mpeg',
    'video/mp2v',
    'video/m2v',
    'video/m4v',
    
    // FLV and F4V
    'video/x-flv',
    'video/f4v',
    
    // Matroska
    'video/x-matroska', // MKV
    'video/mkv',
    
    // Real Media
    'video/vnd.rn-realvideo',
    'video/x-pn-realvideo',
    
    // Divx/Xvid
    'video/divx',
    'video/x-divx',
    
    // Other formats
    'video/dv',
    'video/x-dv',
    'video/vob',
    'video/x-ms-vob',
    
    // Container formats that may contain video
    'application/vnd.rn-realmedia', // RM
    'application/x-shockwave-flash' // SWF (with video)
  ],
  // File extensions mapping for better detection
  allowedVideoExtensions: [
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
    '.3gp', '.3g2', '.m4v', '.mpg', '.mpeg', '.m2v', '.asf',
    '.vob', '.dv', '.f4v', '.rm', '.rmvb', '.ts', '.mts',
    '.m2ts', '.divx', '.xvid', '.ogv', '.mxf'
  ],
  // Priority formats for conversion (web-friendly)
  preferredOutputFormats: ['video/mp4', 'video/webm'],
  bannedKeywords: [
    // Add problematic terms that should trigger warnings
    'leak', 'leaked', 'stolen', 'hacked', 'revenge',
    'underage', 'minor', 'child', 'kid',
    'private', 'personal', 'secret'
  ]
};

export function validateFile(file: File | null): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors, warnings: [] };
  }
  
  // File size check
  if (file.size > VALIDATION_RULES.maxFileSize) {
    const maxSizeGB = Math.round(VALIDATION_RULES.maxFileSize / 1024 / 1024 / 1024 * 10) / 10;
    errors.push(`File too large. Max size: ${maxSizeGB}GB`);
  }
  
  // Enhanced file type validation
  const isValidMimeType = VALIDATION_RULES.allowedVideoTypes.includes(file.type);
  const fileExtension = getFileExtension(file.name).toLowerCase();
  const isValidExtension = VALIDATION_RULES.allowedVideoExtensions.includes(fileExtension);
  
  // Check both MIME type and file extension for better compatibility
  if (!isValidMimeType && !isValidExtension) {
    errors.push(`Unsupported video format. Supported formats: ${VALIDATION_RULES.allowedVideoExtensions.join(', ')}`);
  } else if (!isValidMimeType && isValidExtension) {
    // File has valid extension but browser doesn't recognize MIME type
    warnings.push('File format detected by extension. Video may need conversion for web playback.');
  }
  
  // Check if format might need conversion for web compatibility
  if (!VALIDATION_RULES.preferredOutputFormats.includes(file.type) && isValidMimeType) {
    warnings.push('Video format will be optimized for web playback during upload.');
  }
  
  // File size warnings for very large files
  if (file.size > 1024 * 1024 * 1024) { // > 1GB
    warnings.push('Large file detected. Upload may take longer and processing time will be extended.');
  }
  
  // Filename check for suspicious content
  const suspiciousPatterns = /(?:leak|stolen|hack|revenge|private|personal)/i;
  if (suspiciousPatterns.test(file.name)) {
    errors.push('Filename contains inappropriate content');
  }
  
  // Basic file integrity check
  if (file.size === 0) {
    errors.push('File appears to be empty or corrupted');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper function to extract file extension
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}

// Enhanced function to detect video format and get metadata
export async function getVideoMetadata(file: File): Promise<{
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  canPlayInBrowser: boolean;
  bitrate?: number;
  frameRate?: number;
  estimatedSize?: string;
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.preload = 'metadata';
    video.muted = true;
    video.volume = 0;
    
    let metadataLoaded = false;
    let timeoutId: number;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      video.remove();
    };
    
    const resolveMetadata = (metadata: any) => {
      if (metadataLoaded) return;
      metadataLoaded = true;
      cleanup();
      resolve(metadata);
    };

    video.onloadedmetadata = () => {
      try {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;
        const canPlayInBrowser = !video.error && duration > 0 && !isNaN(duration);
        
        // Calculate estimated bitrate
        let bitrate: number | undefined;
        if (duration > 0 && file.size > 0) {
          bitrate = Math.round((file.size * 8) / duration); // bits per second
        }
        
        // Estimate frame rate (this is approximate)
        let frameRate: number | undefined;
        if (canPlayInBrowser) {
          // Common frame rates to check against
          const commonFrameRates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
          
          // For now, we'll estimate based on file size and duration
          // In a real implementation, you'd use a library like ffprobe.js
          if (width && height && duration) {
            const pixelsPerSecond = width * height / duration;
            if (pixelsPerSecond > 2000000) frameRate = 60;
            else if (pixelsPerSecond > 1000000) frameRate = 30;
            else frameRate = 24;
          }
        }

        const metadata = {
          duration: duration || undefined,
          width: width || undefined,
          height: height || undefined,
          format: file.type || getFormatFromExtension(file.name),
          canPlayInBrowser,
          bitrate,
          frameRate,
          estimatedSize: formatFileSize(file.size)
        };
        
        resolveMetadata(metadata);
      } catch (error) {
        console.warn('Error reading video metadata:', error);
        resolveMetadata({
          format: file.type || getFormatFromExtension(file.name),
          canPlayInBrowser: false,
          estimatedSize: formatFileSize(file.size)
        });
      }
    };
    
    video.onerror = (event) => {
      console.warn('Video metadata loading failed:', event);
      resolveMetadata({
        format: file.type || getFormatFromExtension(file.name),
        canPlayInBrowser: false,
        estimatedSize: formatFileSize(file.size)
      });
    };
    
    video.onabort = () => {
      resolveMetadata({
        format: file.type || getFormatFromExtension(file.name),
        canPlayInBrowser: false,
        estimatedSize: formatFileSize(file.size)
      });
    };
    
    // Comprehensive timeout to avoid hanging
    timeoutId = setTimeout(() => {
      console.warn('Video metadata loading timed out');
      resolveMetadata({
        format: file.type || getFormatFromExtension(file.name),
        canPlayInBrowser: false,
        estimatedSize: formatFileSize(file.size)
      });
    }, 10000); // Increased timeout to 10 seconds
    
    // Try to load the video
    try {
      video.src = url;
      video.load(); // Explicitly trigger load
    } catch (error) {
      console.warn('Failed to load video for metadata extraction:', error);
      resolveMetadata({
        format: file.type || getFormatFromExtension(file.name),
        canPlayInBrowser: false,
        estimatedSize: formatFileSize(file.size)
      });
    }
  });
}

// Helper function to guess format from file extension
function getFormatFromExtension(filename: string): string {
  const extension = getFileExtension(filename).toLowerCase();
  const formatMap: { [key: string]: string } = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.ogv': 'video/ogg',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    '.3gp': 'video/3gpp',
    '.m4v': 'video/m4v',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg'
  };
  
  return formatMap[extension] || 'video/unknown';
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateTitle(title: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
    return { valid: false, errors, warnings };
  }
  
  if (title.length > VALIDATION_RULES.maxTitleLength) {
    errors.push(`Title too long. Max ${VALIDATION_RULES.maxTitleLength} characters.`);
  }
  
  // Check for banned keywords
  const lowerTitle = title.toLowerCase();
  const foundKeywords = VALIDATION_RULES.bannedKeywords.filter(keyword => 
    lowerTitle.includes(keyword.toLowerCase())
  );
  
  if (foundKeywords.length > 0) {
    warnings.push('Title may contain inappropriate content. Please review community guidelines.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateTags(tagsString: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!tagsString || tagsString.trim().length === 0) {
    return { valid: true, errors: [], warnings: [], cleanTags: [] };
  }
  
  const tags = tagsString.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  if (tags.length > VALIDATION_RULES.maxTags) {
    errors.push(`Too many tags. Max ${VALIDATION_RULES.maxTags} allowed.`);
  }
  
  const longTags = tags.filter(tag => tag.length > VALIDATION_RULES.maxTagLength);
  if (longTags.length > 0) {
    errors.push(`Tags too long. Max ${VALIDATION_RULES.maxTagLength} characters per tag.`);
  }
  
  // Check tags for inappropriate content
  const problematicTags = tags.filter(tag => {
    const lowerTag = tag.toLowerCase();
    return VALIDATION_RULES.bannedKeywords.some(keyword => 
      lowerTag.includes(keyword.toLowerCase())
    );
  });
  
  if (problematicTags.length > 0) {
    warnings.push('Some tags may be inappropriate. Consider reviewing them.');
  }
  
  // Clean tags (basic sanitization)
  const cleanTags = tags
    .map(tag => tag.replace(/[<>]/g, '')) // Remove potential HTML
    .filter(tag => tag.length > 0);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    cleanTags
  };
}

export function validateComment(text: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!text || text.trim().length === 0) {
    errors.push('Comment cannot be empty');
    return { valid: false, errors, warnings };
  }
  
  if (text.length > VALIDATION_RULES.maxCommentLength) {
    errors.push(`Comment too long. Max ${VALIDATION_RULES.maxCommentLength} characters.`);
  }
  
  // Check for problematic content
  const lowerText = text.toLowerCase();
  const foundKeywords = VALIDATION_RULES.bannedKeywords.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  if (foundKeywords.length > 0) {
    warnings.push('Comment may contain inappropriate content.');
  }
  
  // Basic spam detection
  const repeatedChars = /(.)\1{10,}/; // 10+ repeated characters
  const capsLock = /[A-Z]{20,}/; // 20+ consecutive caps
  
  if (repeatedChars.test(text) || capsLock.test(text)) {
    warnings.push('Comment appears to be spam-like.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .trim();
}