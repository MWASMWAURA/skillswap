import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCw, Download, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function CameraCapture({
  onCapture,
  onClose,
  isOpen,
  title = 'Take Photo',
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser.');
        setIsLoading(false);
        return;
      }

      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Use simpler constraints to avoid issues
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video is playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      
      // Handle specific error types
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other apps using the camera.');
      } else {
        setError('Unable to access camera. Please check your camera and permissions.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const switchCamera = useCallback(async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
        }
      },
      'image/jpeg',
      quality
    );
  }, [quality]);

  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
  }, [capturedImage]);

  const confirmPhoto = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          handleClose();
        }
      },
      'image/jpeg',
      quality
    );
  }, [onCapture, quality]);

  const handleClose = useCallback(() => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setError(null);
    onClose();
  }, [stopCamera, capturedImage, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      // Simple approach - start camera immediately
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  React.useEffect(() => {
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 mb-2">{error}</p>
                  <Button 
                    onClick={startCamera}
                    variant="secondary"
                    size="sm"
                    disabled={isLoading}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!capturedImage ? (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden max-h-[60vh]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
                
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <Button
                  variant="ghost"
                  onClick={switchCamera}
                  disabled={isLoading}
                  className="p-3"
                >
                  <RotateCw className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  disabled={isLoading || !stream}
                  className="p-4 rounded-full"
                >
                  <Camera className="w-6 h-6" />
                </Button>
                
                <div className="w-10"></div> {/* Spacer for centering */}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Captured Image Preview */}
              <div className="bg-black rounded-lg overflow-hidden max-h-[60vh] flex items-center justify-center">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  onClick={retakePhoto}
                  className="flex items-center gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  Retake
                </Button>
                
                <Button
                  onClick={confirmPhoto}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Use Photo
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Canvas for Image Processing */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}