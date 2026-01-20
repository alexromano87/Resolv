// apps/frontend/src/components/ui/Logo.tsx
import React from 'react';

interface LogoProps {
  variant?: 'color' | 'white' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ variant = 'color', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
  };

  const logoSrc = '/logo_resolv.png';

  if (variant === 'horizontal') {
    return (
      <img
        src="/logo-horizontal.svg"
        alt="RESOLV"
        className={`h-${size === 'sm' ? '8' : size === 'md' ? '12' : size === 'lg' ? '16' : '20'} w-auto ${className}`}
      />
    );
  }

  return (
    <img
      src={logoSrc}
      alt="RESOLV"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
