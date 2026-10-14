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
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030914]/90 backdrop-blur-md select-none pointer-events-auto"
        >
          {/* Subtle celestial ambient light */}
          <div className="absolute w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          {/* Central Elegant Unified Loading Emblem */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center justify-center space-y-4 px-6 text-center z-10"
          >
            <div className="relative flex items-center justify-center">
              {/* Spinning outer golden/teal ring */}
              <div className="absolute w-24 h-24 rounded-full border-2 border-teal-400/20 border-t-teal-400 border-r-amber-400/60 animate-spin [animation-duration:1.2s]" />
              <div className="absolute w-20 h-20 rounded-full border border-teal-500/30 border-b-teal-300 animate-spin [animation-duration:2s] [animation-direction:reverse]" />

              {/* Central Logo */}
              <div className="relative p-2.5 rounded-2xl bg-[#061224] shadow-2xl border border-teal-500/30">
                <AcademyLogo size="md" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-brand-emblem text-xs tracking-widest uppercase font-bold text-teal-300">
                DEEN HIJRAH ACADEMIA
              </span>
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                <span className="text-[11px] font-mono-tabular tracking-wider text-slate-400 uppercase">
                  Loading...
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
