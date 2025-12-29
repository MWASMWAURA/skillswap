import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CheckCircle, Clock, AlertTriangle, X, FileText } from 'lucide-react';
import { apiClient } from '../lib/api';

interface VerificationItem {
  id: number;
  skillId: number;
  skillTitle: string;
  userName: string;
  userProfilePhoto?: string;
  verificationType: string;
  status: string;
  submittedAt: string;
  evidence?: any;
}

export function AdminVerificationPage() {
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');

  useEffect(() => {
    loadVerifications();
  }, [selectedStatus]);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVerificationQueue({
        status: selectedStatus,
        limit: 20
      });
      if (response.data) {
        setVerifications(response.data.verifications || []);
      }
    } catch (error) {
      console.error('Failed to load verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const processVerification = async (verificationId: number, approved: boolean, notes?: string) => {
    try {
      setProcessingId(verificationId);
      await apiClient.processVerification(verificationId.toString(), {
        approved,
        notes: notes || (approved ? 'Verification approved' : 'Verification rejected'),
        score: approved ? 85 : 0
      });
      
      // Refresh the list
      await loadVerifications();
    } catch (error) {
      console.error('Failed to process verification:', error);
      alert('Failed to process verification. Please try again.');
    } finally {
      setProcessingId(null);
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
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'portfolio': 'Portfolio Review',
      'certification': 'Certification',
      'interview': 'Interview',
      'peer_review': 'Peer Review',
      'demonstration': 'Demonstration',
      'assessment': 'Assessment'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Skill Verification Management</h1>
          <p className="text-gray-600">Review and manage skill verification submissions</p>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <div className="flex gap-2">
            {['pending', 'in_review', 'verified', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Queue */}
        <div className="space-y-6">
          {verifications.length === 0 ? (
            <Card padding="lg" className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No verifications found</h3>
              <p className="text-gray-600">
                There are no {selectedStatus} verifications at the moment.
              </p>
            </Card>
          ) : (
            verifications.map((verification) => (
              <Card key={verification.id} padding="lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(verification.status)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {verification.skillTitle}
                        </h3>
                        <p className="text-sm text-gray-600">
                          by {verification.userName}
                        </p>
                      </div>
                      <Badge className={getStatusColor(verification.status)}>
                        {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Verification Type:</span>
                        <p className="text-sm text-gray-600">
                          {getVerificationTypeLabel(verification.verificationType)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Submitted:</span>
                        <p className="text-sm text-gray-600">
                          {new Date(verification.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {verification.evidence && (
                      <div className="mb-4">
                        <span className="text-sm font-medium text-gray-700">Evidence:</span>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(verification.evidence, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {verification.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => processVerification(verification.id, true)}
                        disabled={processingId === verification.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => processVerification(verification.id, false)}
                        disabled={processingId === verification.id}
                        variant="secondary"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {processingId === verification.id && (
                  <div className="mt-4 flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}