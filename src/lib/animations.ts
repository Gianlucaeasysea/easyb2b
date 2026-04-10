import { Variants, Transition, useReducedMotion } from 'framer-motion';

// Transizione standard EasySea
export const easysea: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const easeSmooth: Transition = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1],
};

// Fade + slide dal basso
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: easeSmooth },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// Fade semplice
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Scala (per modal, dialog)
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: easysea },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// Stagger container
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

// Item singolo per stagger
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: easeSmooth },
};

// Slide da sinistra
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: easeSmooth },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2 } },
};

// Pulse leggero (per badge, notifiche)
export const softPulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
};

// Hook per rispettare prefers-reduced-motion
export function usePortalAnimations() {
  const reduceMotion = useReducedMotion();
  return {
    transition: reduceMotion ? { duration: 0 } : easeSmooth,
    animated: !reduceMotion,
  };
}
