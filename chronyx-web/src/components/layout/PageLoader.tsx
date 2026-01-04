import { motion } from "framer-motion";

const PageLoader = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      {/* CHRONYX Logo with pulse animation */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex flex-col items-center gap-4"
      >
        {/* Logo Text */}
        <h1 className="text-4xl md:text-5xl font-light tracking-[0.3em] text-foreground">
          CHRONYX
        </h1>
        
        {/* Loading bar */}
        <div className="w-48 h-0.5 bg-muted overflow-hidden rounded-full">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full w-1/2 bg-primary/60"
          />
        </div>
        
        {/* Skeleton content preview */}
        <div className="mt-8 w-64 space-y-3">
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-3 bg-muted rounded w-full"
          />
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            className="h-3 bg-muted rounded w-3/4"
          />
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            className="h-3 bg-muted rounded w-1/2"
          />
        </div>
      </motion.div>
      
      {/* By CROPXON text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-xs tracking-[0.2em] text-muted-foreground"
      >
        CHRONYX by CROPXON
      </motion.p>
    </motion.div>
  );
};

export default PageLoader;
