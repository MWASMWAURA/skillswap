import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Camera, X, Image as ImageIcon, FileText, Check, AlertCircle } from 'lucide-react';
import { useFileUpload } from '../../services/upload';
import { Button } from '../ui/Button';
import { CameraCapture } from '../camera/CameraCapture';

interface ImageUploadProps {
  onImageUpload: (url: string) => void;
  onError?: (error: string) => void;
  currentImage?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  title?: string;
  description?: string;
  showCamera?: boolean;
  showFileUpload?: boolean;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'any';
  className?: string;
}

export function ImageUpload({
  onImageUpload,
  onError,
  currentImage,
  maxSize = 5 * 1024 * 1024, // 5MB default
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  title = 'Upload Image',
  description = 'Choose an image file or take a photo',
  showCamera = true,
  showFileUpload = true,
  aspectRatio = 'square',
  className = ''
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const { uploadFile } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImage changes
  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      const error = `File type not supported. Allowed types: ${allowedTypes.join(', ')}`;
      onError?.(error);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      const error = `File size too large. Maximum size: ${maxSizeMB}MB`;
      onError?.(error);
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setUploading(true);

    try {
      // Upload file
      const result = await uploadFile(file, {
        maxSize,
        allowedTypes,
        onProgress: (progress) => {
          // You can handle progress here if needed
        },
        onComplete: (data) => {
          onImageUpload(data.url);
          setUploading(false);
        },
        onError: (error) => {
          onError?.(error);
          setUploading(false);
          setPreview(currentImage || null);
        }
      });

      if (!result.success) {
        onError?.(result.error || 'Upload failed');
        setUploading(false);
        setPreview(currentImage || null);
      }
    } catch (error) {
      onError?.('Upload failed');
      setUploading(false);
      setPreview(currentImage || null);
    }
  }, [allowedTypes, maxSize, uploadFile, onImageUpload, onError, currentImage]);

  const handleCameraCapture = useCallback(async (imageBlob: Blob) => {
    // Create a file from the blob
    const file = new File([imageBlob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
     // Create preview immediately
    const previewUrl = URL.createObjectURL(imageBlob);
    setPreview(previewUrl);
    // Upload the captured image
    setUploading(true);
    setShowCameraModal(false);

    try {
      const result = await uploadFile(file, {
        maxSize,
        allowedTypes,
        onComplete: (data) => {
          setPreview(data.url);
          onImageUpload(data.url);
          setUploading(false);
        },
        onError: (error) => {
          onError?.(error);
          setUploading(false);
          setPreview(currentImage || null);
        }
      });

      if (!result.success) {
        onError?.(result.error || 'Upload failed');
        setUploading(false);
      }
    } catch (error) {
      onError?.('Upload failed');
      setUploading(false);
    }
  }, [uploadFile, maxSize, allowedTypes, onImageUpload, onError, currentImage]);

  const clearImage = useCallback(() => {
    // Always notify parent to clear the image
    onImageUpload('');
    
    // Clean up preview URL if it's a blob URL
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    
    // Reset preview to null to show upload area
    setPreview(null);
  }, [preview, onImageUpload]);

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'landscape':
        return 'aspect-video';
      case 'portrait':
        return 'aspect-[3/4]';
      default:
        return '';
    }
  };

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />
      
      {/* Preview or Upload Area */}
      <div className={`relative ${getAspectRatioClass()} bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden`}>
        {preview ? (
          // Preview Mode - Show current photo within upload container
          <div className="relative w-full h-full">
            <img
              src={preview}
              alt="Current photo"
              className="w-full h-full object-cover"
            />
            
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Uploading...</p>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-2">
              {showFileUpload && (
                <button
                  onClick={handleUploadClick}
                  className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                  title="Upload Image"
                >
                  <Upload className="w-4 h-4" />
                </button>
              )}
              
              {showCamera && (
                <button
                  onClick={() => setShowCameraModal(true)}
                  className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                  title="Take Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={clearImage}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                title="Remove Image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Upload Progress */}
            {uploading && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                <div className="text-white text-sm text-center">Uploading...</div>
              </div>
            )}
          </div>
        ) : (
          // Upload Mode
          <div
            className={`w-full h-full flex items-center justify-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload Your Photo
              </h3>
              <p className="text-gray-600 mb-6">
                Drag and drop an image here, or choose an option below
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {showFileUpload && (
                  <Button 
                    variant="primary" 
                    onClick={handleUploadClick}
                    className="flex items-center gap-2 px-6 py-3"
                  >
                    <Upload className="w-5 h-5" />
                    Choose File
                  </Button>
                )}
                
                {showCamera && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowCameraModal(true)}
                    className="flex items-center gap-2 px-6 py-3"
                  >
                    <Camera className="w-5 h-5" />
                    Take Photo
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                or drag and drop your image anywhere in this area
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Requirements */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB</p>
        <p>• Supported formats: {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</p>
      </div>

      {/* Camera Modal */}
      <CameraCapture
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        title="Take Photo for Upload"
        maxWidth={1920}
        maxHeight={1080}
        quality={0.8}
      />
    </div>
  );
}