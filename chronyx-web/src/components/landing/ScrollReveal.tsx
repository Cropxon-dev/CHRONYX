import { ReactNode, useRef } from "react";
import { motion, useInView, Variant } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  once?: boolean;
}

const ScrollReveal = ({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 50,
  once = true,
}: ScrollRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { 
    once, 
    margin: "-50px 0px -50px 0px" 
  });

  const getInitialPosition = (): { x: number; y: number } => {
    switch (direction) {
      case "up":
        return { x: 0, y: distance };
      case "down":
        return { x: 0, y: -distance };
      case "left":
        return { x: distance, y: 0 };
      case "right":
        return { x: -distance, y: 0 };
      case "none":
        return { x: 0, y: 0 };
    }
  };

  const initial = getInitialPosition();

  const variants = {
    hidden: {
      opacity: 0,
      x: initial.x,
      y: initial.y,
      scale: direction === "none" ? 0.95 : 1,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Staggered children animation wrapper
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}

export const StaggerContainer = ({
  children,
  className = "",
  staggerDelay = 0.1,
  once = true,
}: StaggerContainerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-50px 0px -50px 0px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Child component for staggered animations
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export const StaggerItem = ({
  children,
  className = "",
  direction = "up",
}: StaggerItemProps) => {
  const getInitial = () => {
    switch (direction) {
      case "up":
        return { y: 30 };
      case "down":
        return { y: -30 };
      case "left":
        return { x: 30 };
      case "right":
        return { x: -30 };
      case "none":
        return {};
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      ...getInitial(),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
