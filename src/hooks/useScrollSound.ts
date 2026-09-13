import { useEffect, useRef, useCallback } from 'react';

/**
 * Generates a subtle "whoosh" sound using Web Audio API.
 * No external assets required. Triggered only after user interaction.
 */
export function useScrollSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    const enable = () => {
      enabledRef.current = true;
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) ctxRef.current = new AC();
      }
      window.removeEventListener('click', enable);
      window.removeEventListener('keydown', enable);
    };
    window.addEventListener('click', enable);
    window.addEventListener('keydown', enable);
    return () => {
      window.removeEventListener('click', enable);
      window.removeEventListener('keydown', enable);
    };
  }, []);

  const playWhoosh = useCallback((variant: 'low' | 'high' = 'low') => {
    const ctx = ctxRef.current;
    if (!ctx || !enabledRef.current) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(variant === 'high' ? 1200 : 600, now);
      filter.Q.value = 8;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(variant === 'high' ? 800 : 200, now);
      osc.frequency.exponentialRampToValueAtTime(variant === 'high' ? 200 : 60, now + 0.5);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } catch {
      // Silent fail
    }
  }, []);

  return { playWhoosh };
}
