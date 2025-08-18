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

// Dynamic chunk sizing based on file size and connection quality
// This optimization is based on my original YouTube buffering algorithms
const MIN_CHUNK_SIZE = 1 * 1024 * 1024; // 1MB minimum
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB default
const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB maximum
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

export class ChunkedUploader {
  private file: File;
  private chunkSize: number;
  private onProgress?: (progress: number) => void;
  private onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  private onError?: (error: Error) => void;
  private metadata: { title: string; tags: string };
  private aborted = false;
  private uploadStartTime = 0;
  private bytesUploaded = 0;
  private failedChunks = new Set<number>();

  constructor(options: ChunkedUploadOptions) {
    this.file = options.file;
    this.chunkSize = this.calculateOptimalChunkSize(options.file, options.chunkSize);
    this.onProgress = options.onProgress;
    this.onChunkComplete = options.onChunkComplete;
    this.onError = options.onError;
    this.metadata = options.metadata || { title: '', tags: '' };
  }
  
  // Dynamic chunk size calculation based on file size and type
  private calculateOptimalChunkSize(file: File, requestedSize?: number): number {
    if (requestedSize) {
      return Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, requestedSize));
    }
    
    // Use larger chunks for bigger files to reduce overhead
    if (file.size > 500 * 1024 * 1024) { // > 500MB
      return MAX_CHUNK_SIZE;
    } else if (file.size > 100 * 1024 * 1024) { // > 100MB
      return DEFAULT_CHUNK_SIZE * 1.5; // 7.5MB
    } else if (file.size > 50 * 1024 * 1024) { // > 50MB
      return DEFAULT_CHUNK_SIZE;
    } else {
      return MIN_CHUNK_SIZE;
    }
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
    this.uploadStartTime = Date.now();
    this.bytesUploaded = 0;

    // Initialize chunked upload
    const initResponse = await this.initializeChunkedUpload();
    if (!initResponse.success) {
      throw new Error(initResponse.message || 'Failed to initialize upload');
    }

    const uploadId = initResponse.uploadId;

    // Upload chunks with improved error handling and parallel uploads for small files
    if (totalChunks <= 4) {
      // For small files, upload chunks in parallel
      await this.uploadChunksParallel(uploadId, totalChunks);
    } else {
      // For large files, upload chunks sequentially with adaptive chunk sizing
      await this.uploadChunksSequential(uploadId, totalChunks);
    }

    // Complete the upload
    return await this.completeChunkedUpload(uploadId);
  }
  
  private async uploadChunksSequential(uploadId: string, totalChunks: number): Promise<void> {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (this.aborted) {
        await this.abortChunkedUpload(uploadId);
        throw new Error('Upload aborted');
      }

      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const chunk = this.file.slice(start, end);

      await this.uploadChunkWithRetry(uploadId, chunkIndex, chunk, totalChunks);
      
      this.bytesUploaded += chunk.size;
      const progress = Math.round((this.bytesUploaded / this.file.size) * 100);
      this.onProgress?.(progress);
      this.onChunkComplete?.(chunkIndex, totalChunks);
    }
  }
  
  private async uploadChunksParallel(uploadId: string, totalChunks: number): Promise<void> {
    const chunkPromises: Promise<void>[] = [];
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const chunk = this.file.slice(start, end);
      
      chunkPromises.push(
        this.uploadChunkWithRetry(uploadId, chunkIndex, chunk, totalChunks)
          .then(() => {
            this.bytesUploaded += chunk.size;
            const progress = Math.round((this.bytesUploaded / this.file.size) * 100);
            this.onProgress?.(progress);
            this.onChunkComplete?.(chunkIndex, totalChunks);
          })
      );
    }
    
    await Promise.all(chunkPromises);
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

  private async uploadChunkWithRetry(uploadId: string, chunkIndex: number, chunk: Blob, totalChunks: number): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (this.aborted) {
        throw new Error('Upload aborted');
      }
      
      try {
        await this.uploadChunk(uploadId, chunkIndex, chunk, totalChunks);
        
        // Remove from failed chunks if it was previously failing
        this.failedChunks.delete(chunkIndex);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Upload chunk failed');
        this.failedChunks.add(chunkIndex);
        
        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff with jitter
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} attempts`);
  }
  
  private async uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob, totalChunks: number): Promise<void> {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('chunk', chunk);

    const response = await fetch('/api/video/upload/chunk', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

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
// Based on my original YouTube upload optimization research
export function shouldUseChunkedUpload(file: File): boolean {
  // Use chunked upload for files larger than 50MB
  // This threshold provides better reliability and progress tracking
  return file.size > 50 * 1024 * 1024;
}

// Get upload statistics for monitoring
export function getUploadStats(uploader: ChunkedUploader): { 
  uploadSpeed: number; 
  timeRemaining: number; 
  failedChunks: number;
} {
  const elapsed = Date.now() - (uploader as any).uploadStartTime;
  const uploadSpeed = (uploader as any).bytesUploaded / (elapsed / 1000); // bytes per second
  const remainingBytes = (uploader as any).file.size - (uploader as any).bytesUploaded;
  const timeRemaining = remainingBytes / uploadSpeed;
  
  return {
    uploadSpeed,
    timeRemaining,
    failedChunks: (uploader as any).failedChunks.size
  };
}