// Client-side validation helpers
import { checkContent, checkFilename, validateUploadContent, type ViolationType } from './content-policy';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  cleanTags?: string[];
  violations?: ViolationType[];
}

export const VALIDATION_RULES = {
  maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
  maxTitleLength: 100,
  maxDescriptionLength: 2000,
  maxTagLength: 30,
  maxTags: 10,
  maxCommentLength: 1000,
  minPasswordLength: 8,
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
  // Image format support
  allowedImageTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  ],
  allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'],
  maxImageSize: 50 * 1024 * 1024, // 50MB
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
  
  // Filename content policy check
  const filenameCheck = checkFilename(file.name);
  if (filenameCheck.blocked) {
    errors.push(filenameCheck.warnings[0] || 'Filename violates content policy');
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

  // Content policy check - blocks prohibited content, warns on suspicious
  const policyCheck = checkContent(title);
  if (policyCheck.blocked) {
    errors.push('Title violates community guidelines and cannot be used.');
    return { valid: false, errors, warnings, violations: policyCheck.violations };
  }
  warnings.push(...policyCheck.warnings);

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

  // Content policy check on each tag
  for (const tag of tags) {
    const policyCheck = checkContent(tag);
    if (policyCheck.blocked) {
      errors.push(`Tag "${tag}" violates community guidelines.`);
      return { valid: false, errors, warnings, violations: policyCheck.violations };
    }
    warnings.push(...policyCheck.warnings);
  }

  // Clean tags (sanitize HTML)
  const cleanTags = tags
    .map(tag => sanitizeText(tag))
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

  // Content policy check
  const policyCheck = checkContent(text);
  if (policyCheck.blocked) {
    errors.push('Comment violates community guidelines.');
    return { valid: false, errors, warnings, violations: policyCheck.violations };
  }
  warnings.push(...policyCheck.warnings);

  // Spam detection
  const repeatedChars = /(.)\1{10,}/;
  const capsLock = /[A-Z]{20,}/;
  const linkSpam = /(https?:\/\/[^\s]+){4,}/; // 4+ links

  if (repeatedChars.test(text) || capsLock.test(text)) {
    warnings.push('Comment appears to be spam.');
  }
  if (linkSpam.test(text)) {
    warnings.push('Comment contains excessive links and may be flagged as spam.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a full upload (title + tags + filename) against content policy.
 */
export function validateUpload(title: string, tags: string, filename: string): ValidationResult {
  const contentCheck = validateUploadContent(title, tags, filename);
  if (contentCheck.blocked) {
    return {
      valid: false,
      errors: contentCheck.warnings.length > 0 ? contentCheck.warnings : ['Content violates community guidelines.'],
      warnings: [],
      violations: contentCheck.violations,
    };
  }

  // Run individual field validations
  const titleResult = validateTitle(title);
  if (!titleResult.valid) return titleResult;

  const tagsResult = validateTags(tags);
  if (!tagsResult.valid) return tagsResult;

  return {
    valid: true,
    errors: [],
    warnings: [...titleResult.warnings, ...tagsResult.warnings, ...contentCheck.warnings],
    cleanTags: tagsResult.cleanTags,
  };
}

export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .trim();
}