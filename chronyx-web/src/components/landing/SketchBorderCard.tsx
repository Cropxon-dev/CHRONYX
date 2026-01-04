import { ReactNode } from "react";

interface SketchBorderCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  mounted?: boolean;
}

const SketchBorderCard = ({ children, className = "", delay = 0, mounted = true }: SketchBorderCardProps) => {
  return (
    <div
      className={`group relative ${className} ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* SVG Hand-drawn border */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 200 120"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top edge - sketchy line */}
        <path
          d="M 3 3 Q 10 2, 50 4 Q 100 2, 150 4 Q 190 3, 197 4"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.8"
          className="opacity-40 group-hover:opacity-70 group-hover:stroke-[hsl(var(--primary))] transition-all duration-300"
          strokeLinecap="round"
        />
        {/* Right edge */}
        <path
          d="M 197 4 Q 198 20, 196 40 Q 198 70, 197 90 Q 198 110, 196 117"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.8"
          className="opacity-40 group-hover:opacity-70 group-hover:stroke-[hsl(var(--primary))] transition-all duration-300"
          strokeLinecap="round"
        />
        {/* Bottom edge */}
        <path
          d="M 196 117 Q 180 118, 150 116 Q 100 118, 50 116 Q 10 117, 4 116"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.8"
          className="opacity-40 group-hover:opacity-70 group-hover:stroke-[hsl(var(--primary))] transition-all duration-300"
          strokeLinecap="round"
        />
        {/* Left edge */}
        <path
          d="M 4 116 Q 3 100, 4 80 Q 2 50, 4 30 Q 3 10, 3 3"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.8"
          className="opacity-40 group-hover:opacity-70 group-hover:stroke-[hsl(var(--primary))] transition-all duration-300"
          strokeLinecap="round"
        />
        
        {/* Corner decorations - small crosses/marks */}
        <path
          d="M 1 1 L 6 6 M 1 6 L 6 1"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          className="opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          strokeLinecap="round"
        />
        <path
          d="M 194 1 L 199 6 M 194 6 L 199 1"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          className="opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          strokeLinecap="round"
        />
        <path
          d="M 1 114 L 6 119 M 1 119 L 6 114"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          className="opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          strokeLinecap="round"
        />
        <path
          d="M 194 114 L 199 119 M 194 119 L 199 114"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          className="opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Content */}
      <div className="relative p-4 sm:p-5 bg-card/20 hover:bg-card/40 transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

export default SketchBorderCard;
