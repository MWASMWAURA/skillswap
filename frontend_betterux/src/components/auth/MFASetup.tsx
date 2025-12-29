import React, { useState, useEffect } from 'react';
import { Shield, QrCode, Copy, Check, AlertCircle, Smartphone } from 'lucide-react';
import { mfaService } from '../../services/mfaService';
import { Button } from '../ui/Button';

interface MFASetupProps {
  onComplete: (backupCodes: string[]) => void;
  onCancel: () => void;
  userEmail: string;
}

export function MFASetup({ onComplete, onCancel, userEmail }: MFASetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    initializeMFA();
  }, []);

  const initializeMFA = async () => {
    setLoading(true);
    try {
      const response = await mfaService.setupMFA();
      setSecret(response.secret);
      setQrCodeUrl(response.qrCodeUrl);
    } catch (error) {
      console.error('Failed to setup MFA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!mfaService.validateTokenFormat(token)) {
      return;
    }

    setLoading(true);
    try {
      const response = await mfaService.verifyMFASetup({ secret, token });
      if (response.success) {
        setBackupCodes(response.backupCodes);
        setStep('backup');
      }
    } catch (error) {
      console.error('Failed to verify MFA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete(backupCodes);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading && step === 'setup') {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up MFA...</p>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Multi-Factor Authentication</h2>
          <p className="text-gray-600">Add an extra layer of security to your account</p>
        </div>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="text-center">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <img 
                src={qrCodeUrl} 
                alt="MFA QR Code" 
                className="w-48 h-48 mx-auto border rounded-lg"
              />
            </div>
            <p className="text-sm text-gray-600 mb-2">Scan this QR code with your authenticator app</p>
          </div>

          {/* Manual Entry */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Or enter this key manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white rounded border font-mono text-sm break-all">
                {secret}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(secret)}
                className="flex-shrink-0"
              >
                {copiedCode === secret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* App Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Recommended Apps
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Google Authenticator</li>
              <li>• Authy</li>
              <li>• Microsoft Authenticator</li>
              <li>• 1Password</li>
            </ul>
          </div>

          {/* Next Button */}
          <Button
            onClick={() => setStep('verify')}
            className="w-full"
            disabled={!secret}
          >
            I've Added the Account
          </Button>

          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Setup</h2>
          <p className="text-gray-600">Enter the 6-digit code from your authenticator app</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Code
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest"
              maxLength={6}
            />
            {token && !mfaService.validateTokenFormat(token) && (
              <p className="text-red-500 text-sm mt-1">Please enter a valid 6-digit code</p>
            )}
          </div>

          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={!mfaService.validateTokenFormat(token) || loading}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setStep('setup')}
            className="w-full"
          >
            Back to QR Code
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Save Backup Codes</h2>
          <p className="text-gray-600">Store these codes in a safe place to access your account if you lose your device</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-yellow-800 text-sm font-medium mb-2">⚠️ Important:</p>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Each code can only be used once</li>
            <li>• Store them securely, not on your device</li>
            <li>• You can generate new codes anytime</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded border text-center">
              <code className="font-mono text-sm">{code}</code>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => copyToClipboard(backupCodes.join('\n'))}
            variant="ghost"
            className="w-full"
          >
            {copiedCode === backupCodes.join('\n') ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy All Codes
              </>
            )}
          </Button>

          <Button
            onClick={handleComplete}
            className="w-full"
          >
            I've Saved My Codes
          </Button>
        </div>
      </div>
    );
  }

  return null;
}