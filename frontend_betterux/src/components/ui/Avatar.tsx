import React from 'react';
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
}
const sizeStyles: Record<AvatarSize, {
  container: string;
  text: string;
  indicator: string;
}> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    indicator: 'w-2 h-2 border'
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    indicator: 'w-2.5 h-2.5 border-2'
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    indicator: 'w-3 h-3 border-2'
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-lg',
    indicator: 'w-3.5 h-3.5 border-2'
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-xl',
    indicator: 'w-4 h-4 border-2'
  }
};
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
export function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  online,
  className = ''
}: AvatarProps) {
  const styles = sizeStyles[size];
  return <div className={`relative inline-flex ${className}`}>
      {src ? <img src={src} alt={alt || name} className={`${styles.container} rounded-full object-cover bg-gray-100`} /> : <div className={`${styles.container} ${styles.text} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-medium`}>
          {name ? getInitials(name) : '?'}
        </div>}
      {online !== undefined && <span className={`absolute bottom-0 right-0 ${styles.indicator} rounded-full border-white ${online ? 'bg-emerald-500' : 'bg-gray-400'}`} aria-label={online ? 'Online' : 'Offline'} />}
    </div>;
}