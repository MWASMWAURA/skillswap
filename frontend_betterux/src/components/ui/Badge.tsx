import React from 'react';
type BadgeVariant = 'blue' | 'purple' | 'green' | 'amber' | 'red' | 'gray';
type BadgeSize = 'sm' | 'md';
interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}
const variantStyles: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-700'
};
const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm'
};
export function Badge({
  children,
  variant = 'gray',
  size = 'sm',
  className = ''
}: BadgeProps) {
  return <span className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}>
      {children}
    </span>;
}