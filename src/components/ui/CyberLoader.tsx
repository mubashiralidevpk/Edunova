import { motion } from 'framer-motion';

export default function CyberLoader({ message = 'Initializing...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.22),transparent_38%),radial-gradient(circle_at_bottom,hsl(var(--accent)/0.18),transparent_30%)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        {[180, 260, 360].map((size, index) => (
          <motion.div
            key={size}
            className="absolute rounded-full border border-border/40"
            style={{ width: size, height: size }}
            animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.18, 0.36, 0.18] }}
            transition={{ duration: 4 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.35 }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center">
        <motion.div
          className="absolute w-40 h-40 rounded-full border border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute top-0 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.85)]" />
          <div className="absolute bottom-8 left-3 h-2 w-2 rounded-full bg-accent shadow-[0_0_16px_hsl(var(--accent)/0.8)]" />
        </motion.div>

        <motion.div
          className="absolute w-28 h-28 rounded-full border border-accent/30"
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent shadow-[0_0_16px_hsl(var(--accent)/0.85)]" />
          <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary-glow shadow-[0_0_16px_hsl(var(--primary-glow)/0.85)]" />
        </motion.div>

        <motion.div
          className="relative flex h-20 w-20 items-center justify-center"
          animate={{ scale: [1, 1.08, 0.98, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <motion.polygon
              points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              animate={{
                strokeDashoffset: [0, 300],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              strokeDasharray="50 10"
            />
            <motion.polygon
              points="50,20 78,35 78,65 50,80 22,65 22,35"
              fill="hsl(var(--accent) / 0.12)"
              stroke="hsl(var(--accent))"
              strokeWidth="1"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path
              d="M20 50h60"
              stroke="hsl(var(--primary-glow))"
              strokeWidth="1.5"
              strokeLinecap="round"
              animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>

          <motion.div
            className="absolute h-4 w-4 rounded-full bg-primary"
            animate={{
              boxShadow: [
                '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.5)',
                '0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary) / 0.8)',
                '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.5)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>

        <motion.div
          className="absolute h-px w-40 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ y: [-70, 70], opacity: [0, 1, 0] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute h-40 w-40 rounded-full border border-primary/10"
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-gradient-to-b from-primary to-transparent" />
          <div className="absolute left-0 top-1/2 h-px w-6 -translate-y-1/2 bg-gradient-to-r from-primary to-transparent" />
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 mt-12 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.p
          className="text-primary font-mono text-sm tracking-[0.3em] uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.p>
        <motion.p
          className="mt-3 text-xs uppercase tracking-[0.5em] text-muted-foreground"
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        >
          calibrating secure channels
        </motion.p>
        <div className="flex gap-1 justify-center mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
