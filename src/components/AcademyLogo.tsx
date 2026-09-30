import React from 'react';
import { motion } from 'motion/react';

interface AcademyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

export const AcademyLogo: React.FC<AcademyLogoProps> = ({
  size = 'md',
  animated = false,
}) => {
  const dimensions = {
    sm: 28,
    md: 36,
    lg: 64,
    xl: 96,
  }[size];

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: dimensions, height: dimensions }}
    >
      {/* Ambient Turquoise Glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-teal-400/20 blur-md"
      />

      <motion.svg
        width={dimensions}
        height={dimensions}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={animated ? { rotate: -30, scale: 0.7, opacity: 0 } : false}
        animate={animated ? { rotate: 0, scale: 1, opacity: 1 } : false}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <defs>
          <linearGradient id="dhaTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
          <linearGradient id="dhaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#926F1B" />
          </linearGradient>
        </defs>

        {/* Outer Sacred Octagonal Ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="url(#dhaTealGrad)"
          strokeWidth="1.75"
          strokeDasharray="4 2"
          opacity="0.7"
        />

        {/* Rub el Hizb (8-Pointed Islamic Geometric Star) - Square 1 */}
        <rect
          x="22"
          y="22"
          width="56"
          height="56"
          rx="4"
          stroke="url(#dhaTealGrad)"
          strokeWidth="2.5"
          fill="#061224"
          fillOpacity="0.85"
        />

        {/* Rub el Hizb - Square 2 (Rotated 45 deg) */}
        <rect
          x="22"
          y="22"
          width="56"
          height="56"
          rx="4"
          transform="rotate(45 50 50)"
          stroke="url(#dhaGoldGrad)"
          strokeWidth="2.5"
          fill="#0A1A2F"
          fillOpacity="0.75"
        />

        {/* Inner Archway / Mihrab Motif */}
        <path
          d="M36 64V45C36 36.5 42.5 30 50 27C57.5 30 64 36.5 64 45V64H36Z"
          stroke="url(#dhaTealGrad)"
          strokeWidth="1.8"
          fill="#0F2942"
          fillOpacity="0.8"
        />

        {/* Open Sacred Book / Kitab Pages inside the Arch */}
        <path
          d="M50 44C46 42 41 42 39 43V57C41 56 46 56 50 58C54 56 59 56 61 57V43C59 42 54 42 50 44Z"
          stroke="url(#dhaGoldGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="50"
          y1="44"
          x2="50"
          y2="58"
          stroke="url(#dhaGoldGrad)"
          strokeWidth="1.5"
        />

        {/* Center Top Star Point */}
        <circle cx="50" cy="35" r="2.2" fill="#2DD4BF" />
      </motion.svg>
    </div>
  );
};

interface SplashIntroProps {
  onComplete: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete }) => {
  return (
    <motion.div
      key="academy-splash-intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050C17] text-slate-100 px-6 cursor-pointer select-none overflow-hidden"
    >
      {/* Ambient Radial Turquoise & Navy Glow */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        className="pointer-events-none absolute w-[480px] h-[480px] rounded-full bg-teal-500/15 blur-3xl"
      />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 1 }}
        transition={{ duration: 1.6, delay: 0.2, ease: 'easeOut' }}
        className="pointer-events-none absolute w-[320px] h-[320px] rounded-full bg-cyan-500/10 blur-2xl"
      />

      {/* Rotating Outer Sacred Geometry Ring */}
      <div className="relative flex items-center justify-center mb-8">
        <motion.div
          initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 90, scale: 1, opacity: 0.45 }}
          transition={{ duration: 2.2, ease: 'easeOut' }}
          className="absolute w-36 h-36 rounded-full border border-dashed border-teal-400/50"
        />
        <motion.div
          initial={{ rotate: 45, scale: 0.7, opacity: 0 }}
          animate={{ rotate: -45, scale: 1, opacity: 0.3 }}
          transition={{ duration: 2.2, ease: 'easeOut' }}
          className="absolute w-44 h-44 rounded-full border border-amber-400/30"
        />
        <AcademyLogo size="xl" animated />
      </div>

      {/* Brand Title & Subtitle Reveal */}
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-2 relative z-10"
      >
        <div className="text-xs font-medium tracking-[0.25em] uppercase text-teal-400">
          Bismillahir Rahmanir Raheem
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wider text-white">
          Deen Hijrah Academia
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 tracking-wide">
          Sacred Knowledge &amp; Spiritual Journey · Ustadh Mustaqeem Shaikh
        </p>
      </motion.div>

      {/* Animated Loading Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 w-56 sm:w-64 h-1 rounded-full bg-slate-800/90 overflow-hidden relative z-10"
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.55, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={onComplete}
          className="h-full bg-gradient-to-r from-teal-400 via-cyan-300 to-amber-300 rounded-full"
        />
      </motion.div>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        transition={{ delay: 0.6 }}
        className="mt-3 text-[11px] text-slate-400 font-mono-tabular"
      >
        Initializing Sanctuary &amp; Live Classrooms...
      </motion.span>
    </motion.div>
  );
};
