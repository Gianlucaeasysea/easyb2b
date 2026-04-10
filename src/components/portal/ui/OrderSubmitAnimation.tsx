import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

type Phase = 'sending' | 'success';

interface Props {
  isVisible: boolean;
  orderCode: string;
  onClose: () => void;
}

function WaveLoader() {
  return (
    <div className="flex items-end gap-1.5 h-8">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-primary"
          animate={{ height: ['8px', '28px', '8px'] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.12,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function CheckmarkSVG() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <motion.circle
        cx="32" cy="32" r="30"
        stroke="hsl(162 94% 42%)"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.path
        d="M18 32 L28 42 L46 22"
        stroke="hsl(162 94% 42%)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
      />
    </svg>
  );
}

export function OrderSubmitAnimation({ isVisible, orderCode, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('sending');

  useEffect(() => {
    if (!isVisible) {
      setPhase('sending');
      return;
    }

    const t = setTimeout(() => {
      setPhase('success');
      // Only fire confetti on capable devices
      const canConfetti = typeof navigator === 'undefined' || (navigator.hardwareConcurrency ?? 4) >= 4;
      if (canConfetti) {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#3366FF', '#1ECB7F', '#FFCC00', '#ffffff'],
          gravity: 0.9,
          scalar: 0.85,
        });
      }
    }, 1800);

    return () => clearTimeout(t);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-card-solid rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <AnimatePresence mode="wait">
              {phase === 'sending' ? (
                <motion.div
                  key="sending"
                  className="flex flex-col items-center gap-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <WaveLoader />
                  <div>
                    <p className="font-heading font-bold text-lg text-foreground">
                      Invio ordine in corso
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Stiamo elaborando la tua richiesta...
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  className="flex flex-col items-center gap-5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                >
                  <CheckmarkSVG />
                  <div>
                    <motion.p
                      className="font-heading font-black text-xl text-foreground"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Ordine inviato!
                    </motion.p>
                    <motion.p
                      className="text-muted-foreground text-sm mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      Rif. <span className="text-primary font-semibold">{orderCode}</span>
                    </motion.p>
                    <motion.p
                      className="text-muted-foreground text-xs mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      Riceverai una conferma via email
                    </motion.p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    className="gradient-blue text-primary-foreground px-6 py-2.5 rounded-xl font-heading font-semibold text-sm w-full"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Vai ai miei ordini
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
