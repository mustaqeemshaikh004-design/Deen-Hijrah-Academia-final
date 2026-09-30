import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.tsx';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  alphaSpeed: number;
  colorType: 'teal' | 'cyan' | 'gold';
}

export const MovingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Create floating turquoise, aqua, and warm gold dots
    const particleCount = Math.min(75, Math.max(36, Math.floor((width * height) / 22000)));
    const particles: Particle[] = Array.from({ length: particleCount }, (_, idx) => {
      const types: Array<'teal' | 'cyan' | 'gold'> = ['teal', 'teal', 'cyan', 'gold'];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.48,
        vy: (Math.random() - 0.5) * 0.48,
        radius: Math.random() * 2.1 + 1.1,
        alpha: Math.random() * 0.55 + 0.2,
        alphaSpeed: (Math.random() * 0.006 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        colorType: types[idx % types.length],
      };
    });

    const getColorRgba = (type: Particle['colorType'], alpha: number) => {
      if (resolvedTheme === 'light') {
        if (type === 'gold') return `rgba(180, 138, 30, ${alpha * 0.65})`;
        if (type === 'cyan') return `rgba(8, 145, 178, ${alpha * 0.65})`;
        return `rgba(13, 148, 136, ${alpha * 0.7})`;
      }
      if (type === 'gold') return `rgba(212, 175, 55, ${alpha})`;
      if (type === 'cyan') return `rgba(6, 182, 212, ${alpha})`;
      return `rgba(20, 184, 166, ${alpha})`;
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update and draw each moving dot
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap smoothly around screen edges
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Gentle twinkle pulse
        p.alpha += p.alphaSpeed;
        if (p.alpha > 0.78 || p.alpha < 0.18) {
          p.alphaSpeed = -p.alphaSpeed;
        }

        // Draw dot glow & core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = getColorRgba(p.colorType, p.alpha);
        ctx.fill();

        // Draw subtle geometric constellation lines between nearby dots
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 135;

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * (resolvedTheme === 'light' ? 0.12 : 0.18);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle =
              resolvedTheme === 'light'
                ? `rgba(13, 148, 136, ${lineAlpha})`
                : `rgba(20, 184, 166, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-90"
    />
  );
};
