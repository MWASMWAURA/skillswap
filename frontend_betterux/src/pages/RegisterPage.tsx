import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, GraduationCapIcon, CameraIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { PasswordStrength } from '../components/auth/PasswordStrength';
import { passwordService } from '../services/passwordService';
import { apiClient } from '../lib/api';
export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrengthResult, setPasswordStrengthResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handlePasswordStrengthChange = (result: any) => {
    setPasswordStrengthResult(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordStrengthResult?.isStrong) {
      newErrors.password = 'Password must be strong enough (see requirements below)';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the terms';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      setSuccessMessage('');
      try {
        const response = await apiClient.register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        
        if (response.error) {
          // Handle specific error cases
          if (response.error.includes('already exists') || response.error.includes('duplicate')) {
            setErrors({ 
              email: 'An account with this email already exists. Please use a different email or try logging in.' 
            });
          } else {
            setErrors({ general: response.error });
          }
        } else if (response.data) {
          // Registration successful
          const { user, accessToken, refreshToken } = response.data;
          
          // Store tokens in localStorage (handle both response formats)
          if (accessToken) {
            localStorage.setItem('authToken', accessToken);
          } else if ((response.data as any).token) {
            localStorage.setItem('authToken', (response.data as any).token);
          }
          
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
          
          setSuccessMessage('Registration successful! Redirecting to dashboard...');
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }
      } catch (error) {
        console.error('Registration error:', error);
        setErrors({ general: 'Registration failed. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Listen for password generation events
  React.useEffect(() => {
    const handleGeneratePassword = (event: CustomEvent) => {
      setFormData(prev => ({ ...prev, password: event.detail }));
    };
    
    window.addEventListener('generatePassword', handleGeneratePassword as EventListener);
    return () => {
      window.removeEventListener('generatePassword', handleGeneratePassword as EventListener);
    };
  }, []);
  return <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Back Navigation */}
      <div className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" padding="lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <GraduationCapIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-blue-500">
                SkillSwap
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Create Your Account
            </h1>
            <p className="text-gray-600 mt-2">
              Join our community of learners and teachers
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Photo */}
            <div className="flex justify-center mb-6">
              <button type="button" className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center group">
                <CameraIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="absolute -bottom-6 text-xs text-gray-500">
                  Add photo
                </span>
              </button>
            </div>

            <Input label="Full Name" type="text" placeholder="John Doe" value={formData.name} onChange={e => setFormData({
            ...formData,
            name: e.target.value
          })} error={errors.name} />

            <Input label="Email" type="email" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({
            ...formData,
            email: e.target.value
          })} error={errors.email} />

            <div>
              <Input 
                label="Password" 
                type="password" 
                placeholder="Create a strong password" 
                value={formData.password} 
                onChange={e => setFormData({
                  ...formData,
                  password: e.target.value
                })} 
                error={errors.password} 
              />
              {formData.password && (
                <PasswordStrength 
                  password={formData.password}
                  onStrengthChange={handlePasswordStrengthChange}
                  showSuggestions={true}
                  showGenerateOption={true}
                />
              )}
            </div>

            <Input label="Confirm Password" type="password" placeholder="Confirm your password" value={formData.confirmPassword} onChange={e => setFormData({
            ...formData,
            confirmPassword: e.target.value
          })} error={errors.confirmPassword} />

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#terms" className="text-blue-500 hover:text-blue-600">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#privacy" className="text-blue-500 hover:text-blue-600">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.terms && <p className="text-sm text-red-500">{errors.terms}</p>}

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                <span className="text-sm text-gray-600">
                  Send me updates about new features and community news
                </span>
              </label>
            </div>

            {errors.general && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {errors.general}
              </div>
            )}

            {successMessage && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                {successMessage}
              </div>
            )}

            <Button 
              type="submit" 
              fullWidth 
              size="lg"
              disabled={isSubmitting || (formData.password && passwordStrengthResult && !passwordStrengthResult.isStrong)}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-600 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-500 hover:text-blue-600">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>;
}