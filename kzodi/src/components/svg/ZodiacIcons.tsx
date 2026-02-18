"use client";
import React from "react";

interface IconProps {
  size?: number;
  className?: string;
}

/* -- Utility Icons -- */

export const ArrowRight: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowLeft: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M16 10H4M4 10L9 5M4 10L9 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRight: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDown: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShareIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M10 3V13M10 3L6 7M10 3L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 12V15C3 16.1 3.9 17 5 17H15C16.1 17 17 16.1 17 15V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
    <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* -- Conceptual Icons -- */

export const PersonIcon: React.FC<IconProps> = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <circle cx="20" cy="14" r="7" fill="#FFE566" />
    <path d="M8 34C8 27 13 22 20 22C27 22 32 27 32 34" fill="#FFE566" />
  </svg>
);

export const CoupleIcon: React.FC<IconProps> = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 48 40" fill="none" className={className}>
    <circle cx="16" cy="13" r="6" fill="#FFE566" />
    <path d="M6 32C6 26 10 22 16 22C19 22 22 23 24 25" fill="#FFE566" />
    <circle cx="32" cy="13" r="6" fill="#111111" fillOpacity="0.08" />
    <path d="M42 32C42 26 38 22 32 22C29 22 26 23 24 25" fill="#111111" fillOpacity="0.08" />
  </svg>
);

export const HeartIcon: React.FC<IconProps> = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <path d="M20 34C20 34 5 25 5 15C5 9.5 9 6 14 6C17 6 19 7.5 20 9C21 7.5 23 6 26 6C31 6 35 9.5 35 15C35 25 20 34 20 34Z" fill="#FFE566" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <rect x="5" y="9" width="30" height="26" rx="6" fill="#FFE566" />
    <rect x="5" y="9" width="30" height="10" rx="6" fill="#111111" fillOpacity="0.06" />
    <rect x="12" y="5" width="2" height="8" rx="1" fill="#111111" fillOpacity="0.2" />
    <rect x="26" y="5" width="2" height="8" rx="1" fill="#111111" fillOpacity="0.2" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M10 5V10L13 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const BrainIcon: React.FC<IconProps> = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <path d="M20 6C13 6 8 12 8 18C8 23 11 27 15 29V34H25V29C29 27 32 23 32 18C32 12 27 6 20 6Z" fill="#FFE566" />
  </svg>
);

export const StarIcon: React.FC<IconProps> = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <path d="M20 4L23.5 14.5H34.5L25.5 21L29 32L20 25L11 32L14.5 21L5.5 14.5H16.5L20 4Z" fill="#FFE566" />
  </svg>
);

export const CrystalIcon: React.FC<IconProps> = ({ size = 40, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <path d="M20 4L32 16L20 36L8 16L20 4Z" fill="#FFE566" />
    <path d="M8 16H32" stroke="#111111" strokeWidth="0.8" strokeOpacity="0.1" />
    <path d="M20 4L20 36" stroke="#111111" strokeWidth="0.8" strokeOpacity="0.1" />
  </svg>
);

/* -- Zodiac Sign Icons (Fully custom SVG astrological glyphs) -- */

export const zodiacSvgIcons: Record<string, React.FC<IconProps>> = {
  /* Aries: Ram horns - two curved arcs meeting at top */
  aries: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M18 34V20C18 14 21 12 24 15C27 12 30 14 30 20V34" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  /* Taurus: Circle with horns on top */
  taurus: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <circle cx="24" cy="28" r="8" stroke="#111" strokeWidth="2.2" fill="none" />
      <path d="M15 18C15 13 18 11 21 13L24 16L27 13C30 11 33 13 33 18" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  /* Gemini: Roman numeral II with top/bottom bars */
  gemini: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M16 13C20 15 28 15 32 13" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M16 35C20 33 28 33 32 35" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <line x1="20" y1="14" x2="20" y2="34" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="28" y1="14" x2="28" y2="34" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  /* Cancer: Two interlocking arcs (69 rotated) */
  cancer: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M34 19C34 19 30 14 24 14C18 14 14 18 14 22" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="19" cy="21" r="4" stroke="#111" strokeWidth="2.2" fill="none" />
      <path d="M14 29C14 29 18 34 24 34C30 34 34 30 34 26" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="29" cy="27" r="4" stroke="#111" strokeWidth="2.2" fill="none" />
    </svg>
  ),
  /* Leo: Loop with circle tail */
  leo: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <circle cx="19" cy="22" r="6" stroke="#111" strokeWidth="2.2" fill="none" />
      <path d="M25 22C25 22 29 18 31 22C33 26 31 30 28 32" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="28" cy="33" r="2.5" stroke="#111" strokeWidth="2" fill="none" />
    </svg>
  ),
  /* Virgo: M with inward loop on right leg */
  virgo: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M14 32V16L20 24L26 16V32" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M26 24C30 22 33 24 33 28C33 32 30 33 28 31" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  /* Libra: Balanced scale - omega shape on line */
  libra: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <line x1="12" y1="33" x2="36" y2="33" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="27" x2="34" y2="27" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17 27C17 21 20 17 24 17C28 17 31 21 31 27" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  /* Scorpio: M with arrow tail pointing up-right */
  scorpio: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M13 14V28C13 33 16 34 18 32M23 14V28C23 33 26 34 28 32M33 14V28C33 33 36 32 38 28" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M36 26L38 28L36 30" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  /* Sagittarius: Arrow pointing upper-right */
  sagittarius: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M14 34L34 14" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 14H34V24" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M19 25L25 31" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  /* Capricorn: V with looping tail */
  capricorn: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M14 14L14 28C14 33 18 36 22 32L28 24" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="28" r="5" stroke="#111" strokeWidth="2.2" fill="none" />
      <path d="M32 33C32 33 34 36 32 37C30 38 28 36 28 34" stroke="#111" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  ),
  /* Aquarius: Two parallel zigzag waves */
  aquarius: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M12 20L16 16L20 20L24 16L28 20L32 16L36 20" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12 28L16 24L20 28L24 24L28 28L32 24L36 28" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  /* Pisces: Two arcs facing each other with horizontal bar */
  pisces: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill="#FFE566" />
      <path d="M15 14C15 14 22 18 22 24C22 30 15 34 15 34" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M33 14C33 14 26 18 26 24C26 30 33 34 33 34" stroke="#111" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <line x1="12" y1="24" x2="36" y2="24" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
};
