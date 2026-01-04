import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  CheckSquare, 
  BookOpen, 
  Wallet, 
  Heart, 
  Image,
  Clock,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 1,
    title: "Welcome to CHRONYX",
    subtitle: "A quiet space for your life.",
    description: "Your personal sanctuary for holding everything that matters — with continuity.",
    icon: Sparkles,
    sketch: "◎",
    color: "from-primary/20 to-transparent"
  },
  {
    id: 2,
    title: "Record Your Tasks",
    subtitle: "Simple daily planning",
    description: "Organize todos by date, set priorities, and build quiet routines.",
    icon: CheckSquare,
    sketch: "M",
    color: "from-emerald-500/20 to-transparent"
  },
  {
    id: 3,
    title: "Hold Your Studies",
    subtitle: "Syllabus at a glance",
    description: "Upload syllabi, track progress, and hold your learning journey.",
    icon: BookOpen,
    sketch: "◇",
    color: "from-blue-500/20 to-transparent"
  },
  {
    id: 4,
    title: "Financial Clarity",
    subtitle: "Loans, budgets & expenses",
    description: "Track EMIs, monitor spending, and stay on top of your finances.",
    icon: Wallet,
    sketch: "△",
    color: "from-amber-500/20 to-transparent"
  },
  {
    id: 5,
    title: "Insurance Hub",
    subtitle: "Policies organized",
    description: "Never miss a renewal. All your insurance in one private place.",
    icon: Heart,
    sketch: "○",
    color: "from-rose-500/20 to-transparent"
  },
  {
    id: 6,
    title: "Memory Vault",
    subtitle: "Photos preserved",
    description: "Upload, organize, and protect your precious memories.",
    icon: Image,
    sketch: "□",
    color: "from-purple-500/20 to-transparent"
  },
  {
    id: 7,
    title: "Time Perspective",
    subtitle: "Your lifespan view",
    description: "See your life in weeks. Make each one count.",
    icon: Clock,
    sketch: "◉",
    color: "from-cyan-500/20 to-transparent"
  }
];

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Sketch grid */}
        <svg className="w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="onboarding-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path 
                d="M 40 0 L 0 0 0 40" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.5"
                strokeDasharray="2,4"
                className="text-foreground"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#onboarding-grid)" />
        </svg>

        {/* Floating sketch elements */}
        <motion.div
          className="absolute top-20 left-[10%] text-6xl font-light text-primary/10"
          animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          ◇
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-[15%] text-5xl font-light text-primary/10"
          animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          △
        </motion.div>
        <motion.div
          className="absolute top-[40%] right-[8%] text-4xl font-light text-primary/10"
          animate={{ y: [-5, 15, -5], rotate: [-3, 3, -3] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          ○
        </motion.div>

        {/* Gradient orb */}
        <motion.div
          className={`absolute inset-0 bg-gradient-radial ${step.color} opacity-30`}
          key={step.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-6 text-center">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-12">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep 
                  ? "w-8 bg-primary" 
                  : i < currentStep 
                    ? "w-1.5 bg-primary/50" 
                    : "w-1.5 bg-muted-foreground/30"
              }`}
              layoutId={`dot-${i}`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-6"
          >
            {/* Icon with sketch element */}
            <div className="relative mx-auto w-24 h-24">
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="w-20 h-20 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
              </motion.div>
              
              {/* Sketch decorator */}
              <motion.span
                className="absolute -top-2 -right-2 text-2xl font-light text-primary/40"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {step.sketch}
              </motion.span>
            </div>

            {/* Title */}
            <motion.h1
              className="text-3xl md:text-4xl font-light tracking-tight text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {step.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg text-muted-foreground font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {step.subtitle}
            </motion.p>

            {/* Description */}
            <motion.p
              className="text-sm text-muted-foreground/80 max-w-sm mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {step.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="mt-12 flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleNext}
              size="lg"
              className="w-full max-w-xs mx-auto group"
            >
              {currentStep < STEPS.length - 1 ? (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              ) : (
                <>
                  Enter CHRONYX
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {currentStep < STEPS.length - 1 && (
            <motion.button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Skip intro
            </motion.button>
          )}
        </div>

        {/* Keyboard hint */}
        <motion.p
          className="mt-8 text-xs text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Press Enter or click to continue
        </motion.p>
      </div>
    </div>
  );
};

export default OnboardingFlow;
