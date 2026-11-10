import React from 'react';
import logoLight from '../assets/logo.png';
import logoDark from '../assets/logo-dark.png';
import logoIconLight from '../assets/logo-icon.png';
import logoIconDark from '../assets/logo-icon-dark.png';

export interface BrandLogoProps {
  iconOnly?: boolean;
  className?: string;
  imgClassName?: string;
  showSubtitle?: boolean;
  subtitleText?: string;
  forceVariant?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  iconOnly = false,
  className = '',
  imgClassName = '',
  showSubtitle = false,
  subtitleText = 'SISTEM CBT & SIMULASI UJIAN',
  forceVariant,
}) => {
  // If forceVariant is provided, render only that variant without dark: class switching
  if (forceVariant === 'dark') {
    const src = iconOnly ? logoIconDark : logoDark;
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <img
          src={src}
          alt="Detik Detik TryOut"
          className={`object-contain ${imgClassName || (iconOnly ? 'h-8 w-auto' : 'h-9 sm:h-10 w-auto')}`}
        />
        {showSubtitle && (
          <span className="text-[10px] font-mono font-bold text-cyan-300 tracking-wider uppercase mt-1 block">
            {subtitleText}
          </span>
        )}
      </div>
    );
  }

  if (forceVariant === 'light') {
    const src = iconOnly ? logoIconLight : logoLight;
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <img
          src={src}
          alt="Detik Detik TryOut"
          className={`object-contain ${imgClassName || (iconOnly ? 'h-8 w-auto' : 'h-9 sm:h-10 w-auto')}`}
        />
        {showSubtitle && (
          <span className="text-[10px] font-mono font-bold text-[#5D6371] tracking-wider uppercase mt-1 block">
            {subtitleText}
          </span>
        )}
      </div>
    );
  }

  // Responsive mode: shows light in light-mode, dark in dark-mode
  const lightSrc = iconOnly ? logoIconLight : logoLight;
  const darkSrc = iconOnly ? logoIconDark : logoDark;

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center">
        <img
          src={lightSrc}
          alt="Detik Detik TryOut"
          className={`object-contain dark:hidden ${imgClassName || (iconOnly ? 'h-8 w-auto' : 'h-9 sm:h-10 w-auto')}`}
        />
        <img
          src={darkSrc}
          alt="Detik Detik TryOut"
          className={`object-contain hidden dark:block ${imgClassName || (iconOnly ? 'h-8 w-auto' : 'h-9 sm:h-10 w-auto')}`}
        />
      </div>
      {showSubtitle && (
        <span className="text-[10px] font-mono font-bold text-[#5D6371] dark:text-cyan-300 tracking-wider uppercase mt-1 block">
          {subtitleText}
        </span>
      )}
    </div>
  );
};
