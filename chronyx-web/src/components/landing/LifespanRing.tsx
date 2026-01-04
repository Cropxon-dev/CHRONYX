import { useEffect, useState } from "react";

interface LifespanRingProps {
  percentage?: number;
}

const LifespanRing = ({ percentage = 56.4 }: LifespanRingProps) => {
  const [animated, setAnimated] = useState(false);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08]">
      <svg
        width="400"
        height="400"
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="2"
          className="vyom-ring-track"
        />
        {/* Fill */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          className="vyom-ring-fill"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: animated ? strokeDashoffset : circumference,
            transition: "stroke-dashoffset 3s ease-out",
          }}
        />
      </svg>
    </div>
  );
};

export default LifespanRing;
