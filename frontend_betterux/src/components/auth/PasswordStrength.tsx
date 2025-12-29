import React from 'react';
import { Check, X, AlertCircle, Lock } from 'lucide-react';
import { passwordService, PasswordStrengthResult } from '../../services/passwordService';

interface PasswordStrengthProps {
  password: string;
  onStrengthChange?: (result: PasswordStrengthResult) => void;
  showSuggestions?: boolean;
  showGenerateOption?: boolean;
}

export function PasswordStrength({ 
  password, 
  onStrengthChange, 
  showSuggestions = true,
  showGenerateOption = true 
}: PasswordStrengthProps) {
  const result = passwordService.validatePasswordStrength(password);
  
  React.useEffect(() => {
    onStrengthChange?.(result);
  }, [result, onStrengthChange]);

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Fair';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = passwordService.generateStrongPassword();
    // You would typically set this in a parent component's state
    const event = new CustomEvent('generatePassword', { detail: newPassword });
    window.dispatchEvent(event);
  };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
          <span className={`text-sm font-medium ${
            result.score <= 1 ? 'text-red-600' :
            result.score === 2 ? 'text-orange-600' :
            result.score === 3 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {getStrengthText(result.score)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(result.score)}`}
            style={{ width: `${Math.max(0, Math.min(100, (result.score / 4) * 100))}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          {result.requirements.minLength ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className={result.requirements.minLength ? 'text-green-700' : 'text-red-700'}>
            At least 12 characters
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {result.requirements.hasUppercase ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className={result.requirements.hasUppercase ? 'text-green-700' : 'text-red-700'}>
            Uppercase letters (A-Z)
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {result.requirements.hasLowercase ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className={result.requirements.hasLowercase ? 'text-green-700' : 'text-red-700'}>
            Lowercase letters (a-z)
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {result.requirements.hasNumbers ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className={result.requirements.hasNumbers ? 'text-green-700' : 'text-red-700'}>
            Numbers (0-9)
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {result.requirements.hasSymbols ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className={result.requirements.hasSymbols ? 'text-green-700' : 'text-red-700'}>
            Special characters (!@#$%^&*)
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {result.requirements.noSequential ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className={result.requirements.noSequential ? 'text-green-700' : 'text-red-700'}>
            No sequential characters
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {result.requirements.noCommonPatterns ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className={result.requirements.noCommonPatterns ? 'text-green-700' : 'text-red-700'}>
            No common patterns
          </span>
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestions && result.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Suggestions to improve:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Generate Strong Password Button */}
      {showGenerateOption && !result.isStrong && (
        <div className="pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Generate a strong password
          </button>
        </div>
      )}
    </div>
  );
}