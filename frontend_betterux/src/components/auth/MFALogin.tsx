import React, { useState } from 'react';
import { Shield, ArrowLeft, Smartphone, Key } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { mfaService } from '../../services/mfaService';

interface MFALoginProps {
  email: string;
  onSuccess: (user: any) => void;
  onBack: () => void;
  onCancel: () => void;
}

export function MFALogin({ email, onSuccess, onBack, onCancel }: MFALoginProps) {
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const request = useBackupCode 
        ? { backupCode: backupCode.trim() }
        : { token: token.trim() };

      const response = await mfaService.verifyMFA(request);
      
      if (response.success) {
        onSuccess(response.user);
      } else {
        setError(useBackupCode ? 'Invalid backup code' : 'Invalid authentication code');
      }
    } catch (err) {
      setError('MFA verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidInput = useBackupCode 
    ? backupCode.trim().length >= 8
    : token.length === 6;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-600">
          Enter the verification code for <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-1 mb-4">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(false);
              setToken('');
              setBackupCode('');
              setError('');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              !useBackupCode 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Smartphone className="w-4 h-4 inline mr-1" />
            Authenticator App
          </button>
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(true);
              setToken('');
              setBackupCode('');
              setError('');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              useBackupCode 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Key className="w-4 h-4 inline mr-1" />
            Backup Code
          </button>
        </div>

        {!useBackupCode ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Code
            </label>
            <Input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
            />
            {!token && (
              <p className="text-sm text-gray-500 mt-2">
                Enter the 6-digit code from your authenticator app
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Code
            </label>
            <Input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="XXXXXXXX"
              className="text-center font-mono tracking-wider"
              maxLength={8}
            />
            {!backupCode && (
              <p className="text-sm text-gray-500 mt-2">
                Enter one of your 8-character backup codes
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={!isValidInput || loading}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact{' '}
            <a href="#support" className="text-blue-600 hover:text-blue-700">
              support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}