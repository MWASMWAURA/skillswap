import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
}
export function Input({
  label,
  error,
  helperText,
  type = 'text',
  className = '',
  id,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password';
  return <div className="w-full">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>}
      <div className="relative">
        <input id={inputId} type={isPassword && showPassword ? 'text' : type} className={`
            w-full px-4 py-2.5 text-gray-900 bg-white border rounded-lg
            transition-all duration-200
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            ${isPassword ? 'pr-12' : ''}
            ${className}
          `} aria-invalid={error ? 'true' : 'false'} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
        {isPassword && <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>}
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-500">
          {error}
        </p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>}
    </div>;
}