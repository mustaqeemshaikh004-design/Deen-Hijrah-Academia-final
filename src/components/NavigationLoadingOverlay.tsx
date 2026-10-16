import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AcademyLogo } from './AcademyLogo.tsx';

interface NavigationLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  targetViewTitle?: string;
}

export const NavigationLoadingOverlay: React.FC<NavigationLoadingOverlayProps> = ({
  isLoading,
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="nav-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030914]/92 backdrop-blur-md select-none pointer-events-auto"
        >
          {/* Subtle celestial ambient light */}
          <div className="absolute w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute w-64 h-64 rounded-full bg-amber-400/5 blur-2xl pointer-events-none" />

          {/* Central Elegant Unified Loading Emblem with Animated Icon */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center justify-center space-y-4 px-6 text-center z-10"
          >
            {/* The animated icon itself with sacred geometric halo */}
            <div className="relative flex items-center justify-center">
              {/* Outer rotating celestial dashes */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="absolute w-28 h-28 rounded-full border border-teal-500/30 border-dashed pointer-events-none"
              />
              {/* Inner glowing pulse ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-teal-500/20 to-amber-500/20 blur-md pointer-events-none"
              />

              {/* Central Logo Container with animated icon */}
              <div className="relative p-3.5 rounded-2xl bg-[#061427] shadow-2xl border border-teal-400/30 ring-1 ring-teal-300/20">
                <AcademyLogo size="lg" pulse animated />
              </div>
            </div>

            {/* Title written directly below the icon in the stately brand font */}
            <div className="space-y-1 flex flex-col items-center">
              <h3 className="font-brand-emblem text-sm sm:text-base tracking-[0.2em] font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-amber-200 to-teal-100 uppercase drop-shadow-sm">
                Deen Hijrah Academia
              </h3>
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[10px] font-mono-tabular tracking-widest text-teal-400/80 uppercase"
              >
                Entering Sanctuary...
              </motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
