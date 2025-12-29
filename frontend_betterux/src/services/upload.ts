import React from 'react';
import { useNotificationStore, useAuthStore } from '../store';
import { apiClient } from '../lib/api';

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

class UploadService {
  private uploadQueue: UploadProgress[] = [];
  private maxConcurrentUploads = 3;

  // Upload single file
  async uploadFile(
    file: File,
    options: FileUploadOptions = {}
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Validate file
      const validation = this.validateFile(file, options);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Create upload progress entry
      const fileId = this.generateFileId();
      const progress: UploadProgress = {
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      };

      this.uploadQueue.push(progress);
      options.onProgress?.(progress);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Add metadata
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);
      formData.append('fileSize', file.size.toString());

      // Upload with progress tracking
      const response = await this.uploadWithProgress(formData, (progressPercent) => {
        progress.progress = progressPercent;
        options.onProgress?.(progress);
      });

      if (response.error) {
        progress.status = 'error';
        progress.error = response.error;
        options.onError?.(response.error);
        return { success: false, error: response.error };
      }

      progress.status = 'completed';
      progress.url = response.data.url;
      options.onProgress?.(progress);
      options.onComplete?.(response.data);

      // Remove from queue
      this.uploadQueue = this.uploadQueue.filter(p => p.fileId !== fileId);

      return { success: true, url: response.data.url };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      options.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Upload multiple files
  async uploadFiles(
    files: File[],
    options: FileUploadOptions = {}
  ): Promise<{ success: boolean; results: Array<{ fileName: string; url?: string; error?: string }> }> {
    const results: Array<{ fileName: string; url?: string; error?: string }> = [];

    // Process files with concurrency limit
    const chunks = this.chunkArray(files, this.maxConcurrentUploads);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (file) => {
          const result = await this.uploadFile(file, options);
          return {
            fileName: file.name,
            url: result.success ? result.url : undefined,
            error: result.success ? undefined : result.error,
          };
        })
      );
      results.push(...chunkResults);
    }

    const successCount = results.filter(r => r.url).length;
    return {
      success: successCount > 0,
      results,
    };
  }

  // Upload profile photo
  async uploadProfilePhoto(
    file: File,
    options: FileUploadOptions = {}
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const result = await this.uploadFile(file, {
        ...options,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5MB
      });

      if (result.success && result.url) {
        // Update user profile with new photo URL
        await apiClient.updateProfile({ profilePhoto: result.url });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Photo upload failed';
      return { success: false, error: errorMessage };
    }
  }

  // Upload skill verification documents
  async uploadVerificationDocuments(
    files: File[],
    skillId: string,
    options: FileUploadOptions = {}
  ): Promise<{ success: boolean; urls?: string[]; error?: string }> {
    try {
      const result = await this.uploadFiles(files, {
        ...options,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        maxSize: 10 * 1024 * 1024, // 10MB
      });

      if (result.success) {
        const urls = result.results
          .filter(r => r.url)
          .map(r => r.url!) as string[];

        // Update skill with verification documents
        await apiClient.updateSkill(skillId, {
          // verificationDocuments property would need to be added to Skill interface
        } as any);

        return { success: true, urls };
      }

      return { success: false, error: 'Failed to upload verification documents' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Document upload failed';
      return { success: false, error: errorMessage };
    }
  }

  // Upload learning resources
  async uploadLearningResource(
    file: File,
    exchangeId: string,
    options: FileUploadOptions = {}
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const result = await this.uploadFile(file, {
        ...options,
        maxSize: 50 * 1024 * 1024, // 50MB for learning materials
      });

      if (result.success && result.url) {
        // Associate file with exchange for sharing
        await apiClient.uploadLearningResource(exchangeId, {
          fileName: file.name,
          fileUrl: result.url,
          fileType: file.type,
          fileSize: file.size,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Resource upload failed';
      return { success: false, error: errorMessage };
    }
  }

  // Generate thumbnail for images
  async generateImageThumbnail(
    file: File,
    maxWidth: number = 200,
    maxHeight: number = 200,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Private helper methods
  private validateFile(file: File, options: FileUploadOptions): { isValid: boolean; error?: string } {
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
      return { isValid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return { 
        isValid: false, 
        error: `File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  private async uploadWithProgress(
  formData: FormData,
  onProgress: (progress: number) => void
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Simulate upload progress for demo purposes
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress(i);
    }
    
    // Get the file from formData and create a blob URL
    const file = formData.get('file') as File;
    const url = URL.createObjectURL(file);
    
    return { 
      success: true, 
      data: { url, fileName: file.name } 
    };
    
    /* Comment out the actual fetch for demo:
    const token = localStorage.getItem('authToken');
    const response = await fetch(...);
    */
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
  private generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Get upload queue status
  getUploadQueue(): UploadProgress[] {
    return [...this.uploadQueue];
  }

  // Cancel upload
  cancelUpload(fileId: string): boolean {
    const index = this.uploadQueue.findIndex(p => p.fileId === fileId);
    if (index !== -1) {
      this.uploadQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  // Clear completed uploads
  clearCompletedUploads(): void {
    this.uploadQueue = this.uploadQueue.filter(p => p.status === 'uploading');
  }
}

export const uploadService = new UploadService();

// React hook for file uploads
export function useFileUpload() {
  const { addNotification } = useNotificationStore();
  const [uploading, setUploading] = React.useState(false);
  const [uploadQueue, setUploadQueue] = React.useState<UploadProgress[]>([]);

  const uploadFile = React.useCallback(async (file: File, options?: FileUploadOptions) => {
    try {
      setUploading(true);
      const result = await uploadService.uploadFile(file, {
        ...options,
        onProgress: (progress) => {
          setUploadQueue([...uploadService.getUploadQueue()]);
          options?.onProgress?.(progress);
        },
        onComplete: (data) => {
          addNotification({
            type: 'system',
            title: 'Upload Complete',
            message: `${file.name} has been uploaded successfully`,
          });
          options?.onComplete?.(data);
        },
        onError: (error) => {
          addNotification({
            type: 'system',
            title: 'Upload Failed',
            message: error,
          });
          options?.onError?.(error);
        },
      });
      
      return result;
    } finally {
      setUploading(false);
      setUploadQueue([...uploadService.getUploadQueue()]);
    }
  }, [addNotification]);

  const uploadProfilePhoto = React.useCallback(async (file: File) => {
    try {
      setUploading(true);
      const result = await uploadService.uploadProfilePhoto(file);
      
      if (result.success) {
        addNotification({
          type: 'system',
          title: 'Photo Updated',
          message: 'Your profile photo has been updated',
        });
      }
      
      return result;
    } finally {
      setUploading(false);
    }
  }, [addNotification]);

  const uploadMultipleFiles = React.useCallback(async (files: File[], options?: FileUploadOptions) => {
    try {
      setUploading(true);
      const result = await uploadService.uploadFiles(files, options);
      
      const successCount = result.results.filter(r => r.url).length;
      const totalFiles = result.results.length;
      
      addNotification({
        type: 'system',
        title: 'Upload Complete',
        message: `${successCount} of ${totalFiles} files uploaded successfully`,
      });
      
      return result;
    } finally {
      setUploading(false);
      setUploadQueue([...uploadService.getUploadQueue()]);
    }
  }, [addNotification]);

  const generateThumbnail = React.useCallback(async (
    file: File,
    maxWidth?: number,
    maxHeight?: number,
    quality?: number
  ) => {
    try {
      return await uploadService.generateImageThumbnail(file, maxWidth, maxHeight, quality);
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Thumbnail Failed',
        message: 'Failed to generate image thumbnail',
      });
      throw error;
    }
  }, [addNotification]);

  // Update queue periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setUploadQueue([...uploadService.getUploadQueue()]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    uploading,
    uploadQueue,
    uploadFile,
    uploadProfilePhoto,
    uploadMultipleFiles,
    generateThumbnail,
    cancelUpload: uploadService.cancelUpload.bind(uploadService),
    clearCompletedUploads: uploadService.clearCompletedUploads.bind(uploadService),
  };
}