import { motion } from "framer-motion";

// Hand-drawn animated SVG path component
export const SketchPath = ({ 
  d, 
  delay = 0,
  duration = 2,
  stroke = "hsl(var(--primary))",
  strokeWidth = 1,
  className = ""
}: { 
  d: string; 
  delay?: number;
  duration?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}) => (
  <motion.path
    d={d}
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ 
      pathLength: { delay, duration, ease: "easeInOut" },
      opacity: { delay, duration: 0.3 }
    }}
  />
);

// Floating sketch decorations for hero section
export const FloatingSketchElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Top-left doodle */}
    <motion.svg
      className="absolute top-20 left-[10%] w-24 h-24 opacity-[0.08]"
      viewBox="0 0 100 100"
      initial={{ opacity: 0, rotate: -10 }}
      animate={{ opacity: 0.08, rotate: 0 }}
      transition={{ delay: 0.5, duration: 1 }}
    >
      <SketchPath d="M20,50 Q30,20 50,25 Q70,30 60,50 Q50,70 30,60 Q10,50 20,50" delay={0.5} />
      <SketchPath d="M40,40 L55,45 M42,52 L56,48" delay={0.8} strokeWidth={0.5} />
    </motion.svg>

    {/* Top-right star doodle */}
    <motion.svg
      className="absolute top-32 right-[15%] w-16 h-16 opacity-[0.06]"
      viewBox="0 0 100 100"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.06, scale: 1 }}
      transition={{ delay: 0.8, duration: 0.8 }}
    >
      <SketchPath d="M50,10 L55,40 L85,45 L60,55 L65,85 L50,65 L35,85 L40,55 L15,45 L45,40 Z" delay={0.8} />
    </motion.svg>

    {/* Left side squiggle */}
    <motion.svg
      className="absolute top-1/3 left-[5%] w-32 h-32 opacity-[0.05]"
      viewBox="0 0 100 100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 0.05, x: 0 }}
      transition={{ delay: 1, duration: 1 }}
    >
      <SketchPath d="M10,50 Q25,30 40,50 Q55,70 70,50 Q85,30 95,50" delay={1} duration={1.5} />
    </motion.svg>

    {/* Right side circles */}
    <motion.svg
      className="absolute top-1/2 right-[8%] w-20 h-20 opacity-[0.04]"
      viewBox="0 0 100 100"
      initial={{ opacity: 0, rotate: 20 }}
      animate={{ opacity: 0.04, rotate: 0 }}
      transition={{ delay: 1.2, duration: 1 }}
    >
      <SketchPath d="M50,20 Q70,20 70,40 Q70,60 50,60 Q30,60 30,40 Q30,20 50,20" delay={1.2} />
      <SketchPath d="M50,35 Q58,35 58,45 Q58,55 50,55 Q42,55 42,45 Q42,35 50,35" delay={1.4} strokeWidth={0.5} />
    </motion.svg>

    {/* Bottom floating arrow */}
    <motion.svg
      className="absolute bottom-32 left-[20%] w-16 h-16 opacity-[0.06]"
      viewBox="0 0 100 100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 0.06, y: 0 }}
      transition={{ delay: 1.4, duration: 0.8 }}
    >
      <SketchPath d="M20,50 L75,50 M60,35 L75,50 L60,65" delay={1.4} />
    </motion.svg>

    {/* Bottom right doodle */}
    <motion.svg
      className="absolute bottom-40 right-[25%] w-12 h-12 opacity-[0.05]"
      viewBox="0 0 100 100"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 0.05, scale: 1 }}
      transition={{ delay: 1.6, duration: 0.6 }}
    >
      <SketchPath d="M25,75 L50,25 L75,75 L25,75" delay={1.6} />
      <circle cx="50" cy="55" r="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.5" />
    </motion.svg>
  </div>
);

// Animated underline for hero text
export const SketchUnderline = ({ delay = 0, className = "" }: { delay?: number; className?: string }) => (
  <motion.svg
    className={`absolute -bottom-2 left-0 w-full h-3 ${className}`}
    viewBox="0 0 200 12"
    preserveAspectRatio="none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
  >
    <SketchPath 
      d="M5,8 Q50,4 100,7 Q150,10 195,6" 
      delay={delay} 
      duration={0.8}
      strokeWidth={2}
      stroke="hsl(var(--primary) / 0.3)"
    />
  </motion.svg>
);

// Hero section decorative frame
export const HeroSketchFrame = () => (
  <div className="absolute inset-0 pointer-events-none">
    {/* Corner decorations */}
    <motion.svg
      className="absolute top-4 left-4 w-12 h-12 opacity-[0.1]"
      viewBox="0 0 50 50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <SketchPath d="M5,25 L5,5 L25,5" delay={0.3} />
    </motion.svg>
    
    <motion.svg
      className="absolute top-4 right-4 w-12 h-12 opacity-[0.1]"
      viewBox="0 0 50 50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <SketchPath d="M25,5 L45,5 L45,25" delay={0.4} />
    </motion.svg>
    
    <motion.svg
      className="absolute bottom-4 left-4 w-12 h-12 opacity-[0.1]"
      viewBox="0 0 50 50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <SketchPath d="M5,25 L5,45 L25,45" delay={0.5} />
    </motion.svg>
    
    <motion.svg
      className="absolute bottom-4 right-4 w-12 h-12 opacity-[0.1]"
      viewBox="0 0 50 50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <SketchPath d="M25,45 L45,45 L45,25" delay={0.6} />
    </motion.svg>
  </div>
);

// Animated connecting lines between sections
export const SectionConnector = ({ className = "" }: { className?: string }) => (
  <div className={`w-full flex justify-center ${className}`}>
    <motion.svg
      className="w-1 h-16 opacity-20"
      viewBox="0 0 10 100"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 0.2 }}
      viewport={{ once: true }}
    >
      <motion.path
        d="M5,0 L5,30 M5,40 L5,60 M5,70 L5,100"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        strokeDasharray="5,5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </motion.svg>
  </div>
);

// Feature card sketch border animation
export const FeatureSketchBorder = ({ delay = 0 }: { delay?: number }) => (
  <motion.svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
  >
    <motion.rect
      x="2"
      y="2"
      width="calc(100% - 4px)"
      height="calc(100% - 4px)"
      rx="8"
      fill="none"
      stroke="hsl(var(--primary) / 0.2)"
      strokeWidth="1"
      strokeDasharray="8,4"
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 1.5, ease: "easeInOut" }}
    />
  </motion.svg>
);
