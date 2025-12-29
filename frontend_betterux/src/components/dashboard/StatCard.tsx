import React from 'react';
type StatCardVariant = 'blue' | 'purple' | 'green' | 'orange';
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant: StatCardVariant;
  badge?: string;
  progress?: {
    current: number;
    max: number;
  };
}
const variantStyles: Record<StatCardVariant, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  orange: 'bg-gradient-to-br from-orange-400 to-orange-500'
};
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant,
  badge,
  progress
}: StatCardProps) {
  return <div className={`${variantStyles[variant]} rounded-2xl p-6 text-white relative overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

      {/* Badge */}
      {badge && <span className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
          {badge}
        </span>}

      {/* Icon */}
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>

      {/* Value */}
      <div className="text-3xl font-bold mb-1">{value}</div>

      {/* Title */}
      <div className="text-sm text-white/80">{title}</div>

      {/* Progress bar */}
      {progress && <div className="mt-4">
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>
              {progress.current} / {progress.max} XP
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{
          width: `${progress.current / progress.max * 100}%`
        }} />
          </div>
        </div>}

      {/* Subtitle */}
      {subtitle && <div className="mt-2 text-sm text-white/70">{subtitle}</div>}
    </div>;
}