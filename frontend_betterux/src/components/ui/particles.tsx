import React from 'react';

interface ParticlesProps {
  color?: string;
  particleCount?: number;
  particleSize?: number;
  animate?: boolean;
  className?: string;
}

export const Particles: React.FC<ParticlesProps> = ({
  color = '#ffffff',
  particleCount = 500,
  particleSize = 2,
  animate = true,
  className = ''
}) => {
  // Generate random particle positions
  const particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * particleSize + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {particles.map((particle, index) => (
        <div
          key={index}
          className={`absolute rounded-full ${animate ? 'animate-pulse' : ''}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: color,
            opacity: particle.opacity,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
};