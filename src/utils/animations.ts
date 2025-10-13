/**
 * Animation Library - Централизованная система анимаций
 * Используется для создания консистентных анимаций во всем приложении
 */

export const springConfig = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export const smoothConfig = {
  type: "tween" as const,
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // cubic-bezier equivalent
};

// Fade animations
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: smoothConfig,
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: springConfig,
};

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: springConfig,
};

// Scale animations
export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: springConfig,
};

export const scaleInCenter = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
  transition: springConfig,
};

// Slide animations
export const slideInRight = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
  transition: springConfig,
};

export const slideInLeft = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -100, opacity: 0 },
  transition: springConfig,
};

// Stagger animations
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const staggerFastContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

// Специальные анимации для TrackCard
export const trackCardHover = {
  y: -4,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 25,
  },
};

export const trackCardTap = {
  scale: 0.98,
  transition: {
    type: "spring",
    stiffness: 500,
    damping: 30,
  },
};

// Progress ring animation
export const progressRingVariants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: (progress: number) => ({
    pathLength: progress / 100,
    opacity: 1,
    transition: {
      pathLength: {
        type: "spring",
        stiffness: 100,
        damping: 30,
      },
      opacity: { duration: 0.2 },
    },
  }),
};

// Pulse animation
export const pulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

// Shimmer effect (for loading states)
export const shimmer = {
  x: ["-100%", "100%"],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "linear",
  },
};

// Bounce animation (for notifications)
export const bounceIn = {
  initial: { scale: 0.3, opacity: 0 },
  animate: {
    scale: [0.3, 1.05, 0.9, 1],
    opacity: 1,
    transition: {
      duration: 0.6,
      times: [0, 0.5, 0.7, 1],
      ease: "easeOut",
    },
  },
};

// Shake animation (for errors)
export const shake = {
  x: [0, -10, 10, -10, 10, 0],
  transition: {
    duration: 0.5,
    ease: "easeInOut",
  },
};

// Success checkmark animation
export const successCheckmark = {
  pathLength: [0, 1],
  opacity: [0, 1],
  transition: {
    duration: 0.5,
    ease: "easeOut",
  },
};

// Floating animation (for hero elements)
export const float = {
  y: [-10, 10],
  transition: {
    duration: 3,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut",
  },
};

// Modal/Dialog animations
export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
  transition: springConfig,
};

// Toast notification animations
export const toastSlideIn = {
  initial: { x: 400, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 400, opacity: 0 },
  transition: { type: "spring", stiffness: 300, damping: 30 },
};

// Badge animations
export const badgePop = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  transition: {
    type: "spring",
    stiffness: 500,
    damping: 25,
  },
};

// Utility: Create custom stagger
export const createStagger = (staggerDelay: number = 0.1, delayChildren: number = 0) => ({
  animate: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

// Utility: Create custom spring
export const createSpring = (stiffness: number = 300, damping: number = 30) => ({
  type: "spring" as const,
  stiffness,
  damping,
});
