import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, FileText, Award, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { ImageUpload } from '../upload/ImageUpload';
import { useFileUpload } from '../../services/upload';
import { apiClient } from '../../lib/api';

interface VerificationDocument {
  id: string;
  type: 'certificate' | 'diploma' | 'portfolio' | 'work_sample' | 'id_document';
  title: string;
  url: string;
  uploadDate: string;
  status: 'pending' | 'verified' | 'rejected';
  feedback?: string;
}

interface SkillVerificationProps {
  skillId: string;
  skillTitle: string;
  currentStatus: string;
  documents?: VerificationDocument[];
  onStatusChange?: (status: string) => void;
}

const DOCUMENT_TYPES = [
  { value: 'certificate', label: 'Certificate', description: 'Course or training certificates' },
  { value: 'diploma', label: 'Diploma/Degree', description: 'Academic qualifications' },
  { value: 'portfolio', label: 'Portfolio', description: 'Work samples and projects' },
  { value: 'work_sample', label: 'Work Sample', description: 'Demonstration of skill' },
  { value: 'id_document', label: 'ID Document', description: 'Government-issued identification' },
];

export function SkillVerification({
  skillId,
  skillTitle,
  currentStatus,
  documents = [],
  onStatusChange
}: SkillVerificationProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(currentStatus);
  const [documentsList, setDocumentsList] = useState<VerificationDocument[]>(documents);
  const [loading, setLoading] = useState(false);
  const { uploadMultipleFiles } = useFileUpload();

  // Load verification status on component mount
  useEffect(() => {
    loadVerificationStatus();
  }, [skillId]);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVerificationStatus(skillId);
      if (response.data) {
        setVerificationStatus(response.data.verificationStatus);
        onStatusChange?.(response.data.verificationStatus);
      }
    } catch (error) {
      console.error('Failed to load verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Verification Rejected';
      case 'pending':
        return 'Under Review';
      default:
        return 'Not Verified';
    }
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!selectedType || files.length === 0) return;

    setUploading(true);
    try {
      // Upload files first
      const uploadResults = await uploadMultipleFiles(files, 'verification-documents');
      
      // Submit verification with uploaded file URLs
      const evidence = {
        files: uploadResults.map(result => ({
          url: result.url,
          filename: result.filename,
          type: result.type
        }))
      };

      await apiClient.submitVerification(skillId, {
        type: selectedType,
        evidence,
        notes: `Uploaded ${files.length} file(s) for verification`
      });

      setShowUploadForm(false);
      setSelectedType('');
      await loadVerificationStatus(); // Refresh status
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload verification documents. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [selectedType, skillId, uploadMultipleFiles]);

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
    handleFileUpload(files);
  }, [handleFileUpload]);

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className={`border rounded-lg p-4 ${getStatusColor(verificationStatus)}`}>
        <div className="flex items-center gap-3">
          {getStatusIcon(verificationStatus)}
          <div>
            <h3 className="font-semibold">{skillTitle} - Verification Status</h3>
            <p className="text-sm">{getStatusText(verificationStatus)}</p>
          </div>
        </div>
        
        {verificationStatus === 'rejected' && (
          <div className="mt-3 p-3 bg-white bg-opacity-50 rounded border">
            <p className="text-sm font-medium mb-1">Rejection Reason:</p>
            <p className="text-sm">
              Please review the feedback below and submit new verification documents.
            </p>
          </div>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="border rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upload Verification Documents</h3>
            <button
              onClick={() => setShowUploadForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Document Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Document Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DOCUMENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    selectedType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload Area */}
          {selectedType && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Documents
                </h4>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here, or click to select
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    handleFileUpload(files);
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="ghost" className="cursor-pointer">
                    Choose Files
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: JPG, PNG, PDF (Max 10MB each)
                </p>
              </div>

              {uploading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Uploading documents...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Documents */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Verification Documents</h3>
          <div className="grid gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.title}</h4>
                      <p className="text-sm text-gray-600">
                        {DOCUMENT_TYPES.find(t => t.value === doc.type)?.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded on {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusText(doc.status)}
                    </span>
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
                
                {doc.feedback && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-gray-300">
                    <p className="text-sm text-gray-700">{doc.feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {!showUploadForm && verificationStatus !== 'verified' && (
          <Button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <Upload className="w-4 h-4" />
            Upload Verification Documents
          </Button>
        )}
        
        {verificationStatus === 'verified' && (
          <div className="flex items-center gap-2 text-green-600">
            <Award className="w-5 h-5" />
            <span className="font-medium">This skill is verified</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Verification Process</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload relevant documents that prove your expertise</li>
          <li>• Our team reviews submissions within 2-3 business days</li>
          <li>• Verified skills get a special badge and higher visibility</li>
          <li>• You can resubmit documents if verification is rejected</li>
        </ul>
      </div>
    </div>
  );
}