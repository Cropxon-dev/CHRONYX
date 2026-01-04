import { motion } from "framer-motion";

// Floating particles animation
export const FloatingParticles = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 10,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [0.2, 0.5, 0.3, 0.4, 0.2],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Sketched time flow lines animation
const TimeFlowLines = () => (
  <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute h-px bg-gradient-to-r from-transparent via-muted-foreground/40 to-transparent"
        style={{
          top: `${20 + i * 15}%`,
          left: "-100%",
          width: "200%",
        }}
        animate={{
          x: ["0%", "50%"],
        }}
        transition={{
          duration: 20 + i * 5,
          repeat: Infinity,
          ease: "linear",
          delay: i * 2,
        }}
      />
    ))}
  </div>
);

// Left side - Life records sketch
export const LeftSketchAnimation = () => (
  <div className="hidden lg:flex flex-col items-end justify-center pr-12 relative">
    <TimeFlowLines />
    
    {/* Sketched notebook/records */}
    <motion.svg
      viewBox="0 0 200 300"
      className="w-48 h-72 text-muted-foreground/30"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
    >
      {/* Notebook outline - sketchy style */}
      <motion.path
        d="M30 20 Q28 20 28 22 L28 278 Q28 280 30 280 L170 280 Q172 280 172 278 L172 22 Q172 20 170 20 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      {/* Spiral binding */}
      {[...Array(8)].map((_, i) => (
        <motion.circle
          key={i}
          cx="28"
          cy={40 + i * 30}
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
        />
      ))}
      
      {/* Sketched lines - like handwritten entries */}
      {[...Array(10)].map((_, i) => (
        <motion.line
          key={i}
          x1="45"
          y1={50 + i * 22}
          x2={120 + Math.random() * 30}
          y2={50 + i * 22}
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ delay: 1 + i * 0.15, duration: 0.5 }}
        />
      ))}
      
      {/* Date marker */}
      <motion.text
        x="150"
        y="35"
        fontSize="8"
        fill="currentColor"
        fontFamily="serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 2.5, duration: 1 }}
      >
        2026
      </motion.text>
    </motion.svg>
    
    {/* Floating label */}
    <motion.p
      className="text-xs text-muted-foreground/40 mt-4 font-light tracking-widest"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 3, duration: 1 }}
    >
      YOUR RECORDS
    </motion.p>
  </div>
);

// Right side - Time & memories sketch
export const RightSketchAnimation = () => (
  <div className="hidden lg:flex flex-col items-start justify-center pl-12 relative">
    <TimeFlowLines />
    
    {/* Clock/time visualization */}
    <motion.svg
      viewBox="0 0 200 300"
      className="w-48 h-72 text-muted-foreground/30"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
    >
      {/* Sketched clock circle */}
      <motion.circle
        cx="100"
        cy="80"
        r="50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      {/* Clock center */}
      <motion.circle
        cx="100"
        cy="80"
        r="3"
        fill="currentColor"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5, duration: 0.3 }}
      />
      
      {/* Hour hand */}
      <motion.line
        x1="100"
        y1="80"
        x2="100"
        y2="50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1, rotate: [0, 30] }}
        transition={{ delay: 1.8, duration: 0.5 }}
        style={{ transformOrigin: "100px 80px" }}
      />
      
      {/* Minute hand */}
      <motion.line
        x1="100"
        y1="80"
        x2="130"
        y2="80"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
      />
      
      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 100 + Math.cos(angle) * 42;
        const y1 = 80 + Math.sin(angle) * 42;
        const x2 = 100 + Math.cos(angle) * 48;
        const y2 = 80 + Math.sin(angle) * 48;
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.8 + i * 0.05, duration: 0.3 }}
          />
        );
      })}
      
      {/* Memory cards/photos below */}
      <motion.rect
        x="50"
        y="160"
        width="40"
        height="50"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        transform="rotate(-8, 70, 185)"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ delay: 2.2, duration: 0.6 }}
      />
      <motion.rect
        x="80"
        y="165"
        width="40"
        height="50"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        transform="rotate(5, 100, 190)"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.6, y: 0 }}
        transition={{ delay: 2.4, duration: 0.6 }}
      />
      <motion.rect
        x="110"
        y="158"
        width="40"
        height="50"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        transform="rotate(-3, 130, 183)"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.4, y: 0 }}
        transition={{ delay: 2.6, duration: 0.6 }}
      />
      
      {/* Small icons inside photo cards */}
      <motion.path
        d="M65 175 L75 185 L85 172"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 2.8, duration: 0.4 }}
      />
      
      {/* Timeline at bottom */}
      <motion.line
        x1="40"
        y1="250"
        x2="160"
        y2="250"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 3, duration: 1 }}
      />
      
      {/* Timeline dots */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.circle
          key={i}
          cx={50 + i * 28}
          cy="250"
          r="3"
          fill="currentColor"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 3.5 + i * 0.15, duration: 0.2 }}
        />
      ))}
    </motion.svg>
    
    {/* Floating label */}
    <motion.p
      className="text-xs text-muted-foreground/40 mt-4 font-light tracking-widest"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 3, duration: 1 }}
    >
      YOUR TIME
    </motion.p>
  </div>
);
