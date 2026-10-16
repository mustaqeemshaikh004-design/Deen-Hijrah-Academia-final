import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface AcademyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  pulse?: boolean;
}

export const AcademyLogo: React.FC<AcademyLogoProps> = ({
  size = 'md',
  animated = false,
  pulse = false,
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
      {/* Ambient Turquoise & Gold Glow */}
      <motion.div
        aria-hidden="true"
        animate={
          pulse
            ? {
                scale: [1, 1.25, 1],
                opacity: [0.25, 0.6, 0.25],
              }
            : {}
        }
        transition={pulse ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-teal-400/30 to-amber-400/20 blur-md pointer-events-none"
      />

      <motion.svg
        width={dimensions}
        height={dimensions}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={animated ? { rotate: -30, scale: 0.7, opacity: 0 } : false}
        animate={
          animated
            ? { rotate: 0, scale: 1, opacity: 1 }
            : pulse
              ? {
                  scale: [1, 1.05, 1],
                  filter: ['drop-shadow(0 0 0px #2dd4bf)', 'drop-shadow(0 0 8px #2dd4bf)', 'drop-shadow(0 0 0px #2dd4bf)'],
                }
              : false
        }
        transition={
          animated
            ? { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
            : pulse
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : undefined
        }
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
  useEffect(() => {
    // Elegant transition completion timer
    const timer = setTimeout(() => {
      onComplete();
    }, 1750);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      key="academy-splash-intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030812] text-slate-100 px-6 cursor-pointer select-none overflow-hidden"
    >
      {/* Ambient Radial Celestial Glows */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.8, 1.25, 1], opacity: [0.3, 0.7, 0.5] }}
        transition={{ duration: 2.2, ease: 'easeOut' }}
        className="pointer-events-none absolute w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-amber-500/10 blur-3xl"
      />
      <motion.div
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 0.35 }}
        transition={{ duration: 1.6, delay: 0.15, ease: 'easeOut' }}
        className="pointer-events-none absolute w-[360px] h-[360px] rounded-full bg-teal-400/15 blur-2xl"
      />

      {/* Central Cool Icon Transition: Orbital Rotating Rings & Pulsing Core */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center mb-6"
      >
        {/* Outer Counter-Rotating Dashed Celestial Orbit */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute w-48 h-48 rounded-full border border-teal-400/40 border-dashed pointer-events-none"
        />

        {/* Middle Clockwise Starlight Orbit */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute w-40 h-40 rounded-full border border-amber-400/35 border-dotted pointer-events-none"
        />

        {/* Expanding Cosmic Ripple Halo Ring */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: [0.8, 1.4, 1.6], opacity: [0.6, 0.25, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          className="absolute w-32 h-32 rounded-full border-2 border-teal-300/40 pointer-events-none"
        />

        {/* Breathing Radiant Core Badge */}
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative p-5 rounded-3xl bg-[#061427]/90 shadow-[0_0_40px_rgba(45,212,191,0.25)] border border-teal-400/40 ring-2 ring-teal-300/20 backdrop-blur-xl"
        >
          <AcademyLogo size="xl" animated pulse />
        </motion.div>
      </motion.div>

      {/* Elegant Brand Title Reveal without personal name or loading bar */}
      <motion.div
        initial={{ y: 16, opacity: 0, filter: 'blur(4px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-1.5 relative z-10"
      >
        <h1 className="font-brand-emblem text-2xl sm:text-3xl font-bold tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-amber-200 to-teal-100 uppercase drop-shadow-md">
          Deen Hijrah Academia
        </h1>
        <p className="text-xs text-teal-400/80 font-medium tracking-widest uppercase">
          Sacred Knowledge &amp; Spiritual Journey
        </p>
      </motion.div>
    </motion.div>
  );
};
