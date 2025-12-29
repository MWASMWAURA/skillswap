import React from 'react';
import { cn } from "@/lib/utils";

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'success' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950 shadow-sm',
  primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-blue-500 border border-blue-500 hover:bg-blue-50 active:bg-blue-100',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm',
  link: 'bg-transparent text-blue-600 underline-offset-4 hover:underline p-0 h-auto',
  success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-sm',
  gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-sm'
};
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )} 
      disabled={disabled} 
      {...props}
    >
      {children}
    </button>
  );
}