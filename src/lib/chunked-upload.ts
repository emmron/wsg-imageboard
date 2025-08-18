// Chunked upload implementation for large files
// This provides better performance and reliability for uploads > 100MB

export interface ChunkedUploadOptions {
  file: File;
  chunkSize?: number; // Default 5MB chunks
  onProgress?: (progress: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onError?: (error: Error) => void;
  metadata?: {
    title: string;
    tags: string;
  };
}

export interface ChunkedUploadResult {
  success: boolean;
  videoId?: string;
  fileUrl?: string;
  message?: string;
  needsConversion?: boolean;
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;

export class ChunkedUploader {
  private file: File;
  private chunkSize: number;
  private onProgress?: (progress: number) => void;
  private onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  private onError?: (error: Error) => void;
  private metadata: { title: string; tags: string };
  private aborted = false;

  constructor(options: ChunkedUploadOptions) {
    this.file = options.file;
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    this.onProgress = options.onProgress;
    this.onChunkComplete = options.onChunkComplete;
    this.onError = options.onError;
    this.metadata = options.metadata || { title: '', tags: '' };
  }

  async upload(): Promise<ChunkedUploadResult> {
    try {
      // For files smaller than chunk size, use regular upload
      if (this.file.size <= this.chunkSize) {
        return await this.regularUpload();
      }

      return await this.chunkedUpload();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      this.onError?.(new Error(errorMsg));
      return {
        success: false,
        message: errorMsg
      };
    }
  }

  abort() {
    this.aborted = true;
  }

  private async regularUpload(): Promise<ChunkedUploadResult> {
    const formData = new FormData();
    formData.append('video', this.file);
    formData.append('title', this.metadata.title);
    formData.append('tags', this.metadata.tags);

    const response = await this.fetchWithRetry('/api/video/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    this.onProgress?.(100);
    
    return result;
  }

  private async chunkedUpload(): Promise<ChunkedUploadResult> {
    const totalChunks = Math.ceil(this.file.size / this.chunkSize);
    let uploadedBytes = 0;

    // Initialize chunked upload
    const initResponse = await this.initializeChunkedUpload();
    if (!initResponse.success) {
      throw new Error(initResponse.message || 'Failed to initialize upload');
    }

    const uploadId = initResponse.uploadId;

    // Upload chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (this.aborted) {
        await this.abortChunkedUpload(uploadId);
        throw new Error('Upload aborted');
      }

      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const chunk = this.file.slice(start, end);

      await this.uploadChunk(uploadId, chunkIndex, chunk, totalChunks);
      
      uploadedBytes += chunk.size;
      const progress = Math.round((uploadedBytes / this.file.size) * 100);
      this.onProgress?.(progress);
      this.onChunkComplete?.(chunkIndex, totalChunks);
    }

    // Complete the upload
    return await this.completeChunkedUpload(uploadId);
  }

  private async initializeChunkedUpload(): Promise<any> {
    const response = await this.fetchWithRetry('/api/video/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: this.file.name,
        fileSize: this.file.size,
        contentType: this.file.type,
        title: this.metadata.title,
        tags: this.metadata.tags
      })
    });

    return await response.json();
  }

  private async uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob, totalChunks: number): Promise<void> {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('chunk', chunk);

    const response = await this.fetchWithRetry('/api/video/upload/chunk', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || `Failed to upload chunk ${chunkIndex}`);
    }
  }

  private async completeChunkedUpload(uploadId: string): Promise<ChunkedUploadResult> {
    const response = await this.fetchWithRetry('/api/video/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId })
    });

    return await response.json();
  }

  private async abortChunkedUpload(uploadId: string): Promise<void> {
    try {
      await fetch('/api/video/upload/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId })
      });
    } catch (error) {
      console.warn('Failed to abort upload:', error);
    }
  }

  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (this.aborted) {
        throw new Error('Upload aborted');
      }

      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Network error');
        
        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff: wait 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Upload failed after retries');
  }
}

// Utility function to determine if chunked upload should be used
export function shouldUseChunkedUpload(file: File): boolean {
  // Use chunked upload for files larger than 100MB
  return file.size > 100 * 1024 * 1024;
}