import React, { Component } from 'react';
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}
const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};
export function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick
}: CardProps) {
  const Component = onClick ? 'button' : 'div';
  return <Component onClick={onClick} className={`
        bg-white rounded-xl shadow-sm border border-gray-100
        ${hover ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}
        ${paddingStyles[padding]}
        ${onClick ? 'text-left w-full' : ''}
        ${className}
      `}>
      {children}
    </Component>;
}