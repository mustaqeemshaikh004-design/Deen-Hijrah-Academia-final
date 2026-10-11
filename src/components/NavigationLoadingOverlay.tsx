import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AcademyLogo } from './AcademyLogo.tsx';
import { Sparkles } from 'lucide-react';

interface NavigationLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  targetViewTitle?: string;
}

export const NavigationLoadingOverlay: React.FC<NavigationLoadingOverlayProps> = ({
  isLoading,
  message = 'Loading Sacred Knowledge...',
  targetViewTitle,
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="nav-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020610]/85 backdrop-blur-md select-none pointer-events-auto"
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

          {/* Central Logo & Orbital Ring */}
          <motion.div
            initial={{ scale: 0.82, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center justify-center space-y-5 px-6"
          >
            <div className="relative">
              {/* Outer Rotating Sacred Geometry Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-5 rounded-full border border-teal-400/35 border-dashed pointer-events-none"
              />

              {/* Middle Counter-rotating subtle ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-8 rounded-full border border-teal-500/15 pointer-events-none"
              />

              {/* Inner Pulsing Gold Ring */}
              <motion.div
                animate={{ scale: [1, 1.09, 1], opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-2.5 rounded-full border border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.3)] pointer-events-none"
              />

              {/* Central Academy Logo Container */}
              <div className="relative z-10 p-3.5 rounded-2xl bg-gradient-to-br from-[#07172E] via-[#051122] to-[#030914] border border-teal-500/50 shadow-[0_0_45px_rgba(45,212,191,0.3)]">
                <AcademyLogo size="lg" animated />
              </div>
            </div>

            {/* Typography & Subtext */}
            <div className="text-center space-y-1.5 max-w-sm">
              <div className="text-[11px] font-mono-tabular tracking-widest uppercase text-amber-300/80 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Deen Hijrah Academia</span>
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              </div>

              {targetViewTitle && (
                <h3 className="font-display text-lg font-bold tracking-tight text-white drop-shadow">
                  {targetViewTitle}
                </h3>
              )}

              <p className="text-xs text-teal-300 font-medium tracking-wide flex items-center justify-center gap-2 font-mono-tabular pt-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span>{message}</span>
              </p>

              {/* Shimmering Loading Progress Line */}
              <div className="w-48 h-1 mx-auto mt-2 rounded-full bg-slate-800/80 overflow-hidden relative border border-teal-500/30">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full h-full bg-gradient-to-r from-transparent via-teal-400 to-amber-300"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
