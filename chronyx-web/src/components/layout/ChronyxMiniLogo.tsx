import { motion } from "framer-motion";

interface ChronyxMiniLogoProps {
  className?: string;
  size?: "sm" | "md";
}

export const ChronyxMiniLogo = ({ className = "", size = "md" }: ChronyxMiniLogoProps) => {
  const dimensions = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  
  return (
    <motion.div
      className={`relative ${dimensions} ${className}`}
      whileHover="hover"
      initial="idle"
    >
      <svg 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="mini-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
          </linearGradient>
        </defs>
        
        {/* Outer ring with animation */}
        <motion.circle 
          cx="20" cy="20" r="17" 
          stroke="url(#mini-logo-gradient)" 
          strokeWidth="1.5" 
          fill="none"
          className="opacity-80"
          variants={{
            idle: { rotate: 0 },
            hover: { rotate: 360 }
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
          style={{ transformOrigin: "center" }}
        />
        
        {/* Inner dashed ring */}
        <motion.circle 
          cx="20" cy="20" r="12" 
          stroke="hsl(var(--primary))" 
          strokeWidth="0.8" 
          strokeDasharray="4 3"
          fill="none"
          className="opacity-40"
          variants={{
            idle: { rotate: 0 },
            hover: { rotate: -180 }
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
        />
        
        {/* Center dot with pulse */}
        <motion.circle 
          cx="20" cy="20" r="2.5" 
          fill="hsl(var(--primary))"
          className="opacity-90"
          variants={{
            idle: { scale: 1 },
            hover: { scale: 1.3 }
          }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Time markers */}
        {[0, 90, 180, 270].map((angle, i) => (
          <motion.circle 
            key={i}
            cx={20 + 15 * Math.cos((angle - 90) * Math.PI / 180)}
            cy={20 + 15 * Math.sin((angle - 90) * Math.PI / 180)}
            r="1"
            fill="hsl(var(--primary))"
            className="opacity-50"
            variants={{
              idle: { opacity: 0.5 },
              hover: { opacity: 1 }
            }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </svg>
    </motion.div>
  );
};
