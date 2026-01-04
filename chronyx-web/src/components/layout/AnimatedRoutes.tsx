import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedRoutesProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

export const AnimatedPage = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

const AnimatedRoutes = ({ children }: AnimatedRoutesProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={location.pathname} 
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
