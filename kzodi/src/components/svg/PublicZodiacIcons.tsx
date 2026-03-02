import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const publicZodiacIcons: Record<string, React.FC<IconProps>> = {
  aries: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5a5 5 0 1 0 -4 8" />
  <path d="M16 13a5 5 0 1 0 -4 -8" />
  <path d="M12 21l0 -16" />
    </svg>
  ),
  taurus: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3a6 6 0 0 0 12 0" />
  <path d="M6 15a6 6 0 1 0 12 0a6 6 0 1 0 -12 0" />
    </svg>
  ),
  gemini: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3a21 21 0 0 0 18 0" />
  <path d="M3 21a21 21 0 0 1 18 0" />
  <path d="M7 4.5l0 15" />
  <path d="M17 4.5l0 15" />
    </svg>
  ),
  cancer: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
  <path d="M15 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
  <path d="M3 12a10 6.5 0 0 1 14 -6.5" />
  <path d="M21 12a10 6.5 0 0 1 -14 6.5" />
    </svg>
  ),
  leo: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 17a4 4 0 1 0 8 0" />
  <path d="M3 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
  <path d="M7 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
  <path d="M7 7c0 3 2 5 2 9" />
  <path d="M15 7c0 4 -2 6 -2 10" />
    </svg>
  ),
  virgo: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 4a2 2 0 0 1 2 2v9" />
  <path d="M5 6a2 2 0 0 1 4 0v9" />
  <path d="M9 6a2 2 0 0 1 4 0v10a7 5 0 0 0 7 5" />
  <path d="M12 21a7 5 0 0 0 7 -5v-2a3 3 0 0 0 -6 0" />
    </svg>
  ),
  libra: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 20l14 0" />
  <path d="M5 17h5v-.3a7 7 0 1 1 4 0v.3h5" />
    </svg>
  ),
  scorpio: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 4a2 2 0 0 1 2 2v9" />
  <path d="M5 6a2 2 0 0 1 4 0v9" />
  <path d="M9 6a2 2 0 0 1 4 0v10a3 3 0 0 0 3 3h5l-3 -3m0 6l3 -3" />
    </svg>
  ),
  sagittarius: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20l16 -16" />
  <path d="M13 4h7v7" />
  <path d="M6.5 12.5l5 5" />
    </svg>
  ),
  capricorn: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4a3 3 0 0 1 3 3v9" />
  <path d="M7 7a3 3 0 0 1 6 0v11a3 3 0 0 1 -3 3" />
  <path d="M13 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    </svg>
  ),
  aquarius: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 10l3 -3l3 3l3 -3l3 3l3 -3l3 3" />
  <path d="M3 17l3 -3l3 3l3 -3l3 3l3 -3l3 3" />
    </svg>
  ),
  pisces: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 3a21 21 0 0 1 0 18" />
  <path d="M19 3a21 21 0 0 0 0 18" />
  <path d="M5 12l14 0" />
    </svg>
  ),
};

