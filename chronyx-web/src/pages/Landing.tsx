import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckSquare, 
  BookOpen, 
  Wallet, 
  Clock, 
  Heart, 
  Shield, 
  Image,
  Play,
  ChevronDown,
  Lock,
  Download,
  Eye,
  X,
  Check,
  Sparkles,
  Crown,
  Zap,
  Monitor,
  Apple,
  WifiOff,
  RefreshCw
} from "lucide-react";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import chronyxPhilosophy from "@/assets/chronyx-philosophy.png";
import SketchBorderCard from "@/components/landing/SketchBorderCard";
import { 
  FloatingSketchElements, 
  SketchUnderline, 
  HeroSketchFrame,
  SectionConnector 
} from "@/components/landing/SketchAnimations";
import DashboardPreview from "@/components/landing/DashboardPreview";
import ScrollReveal, { StaggerContainer, StaggerItem } from "@/components/landing/ScrollReveal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// CHRONYX Logo Component
const ChronxyxLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" />
        <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
      </linearGradient>
    </defs>
    {/* Outer ring */}
    <circle 
      cx="50" cy="50" r="45" 
      stroke="url(#logo-gradient)" 
      strokeWidth="2" 
      fill="none"
      className="opacity-80"
    />
    {/* Inner dashed ring */}
    <circle 
      cx="50" cy="50" r="35" 
      stroke="hsl(var(--primary))" 
      strokeWidth="1" 
      strokeDasharray="6 4"
      fill="none"
      className="opacity-40"
    />
    {/* Center dot */}
    <circle 
      cx="50" cy="50" r="5" 
      fill="hsl(var(--primary))"
      className="opacity-90"
    />
    {/* Time markers */}
    {[0, 90, 180, 270].map((angle, i) => (
      <circle 
        key={i}
        cx={50 + 40 * Math.cos((angle - 90) * Math.PI / 180)}
        cy={50 + 40 * Math.sin((angle - 90) * Math.PI / 180)}
        r="2"
        fill="hsl(var(--primary))"
        className="opacity-50"
      />
    ))}
  </svg>
);

const Landing = () => {
  const [mounted, setMounted] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showDesktopDialog, setShowDesktopDialog] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Enable smooth scrolling for the page
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const features = [
    { icon: CheckSquare, label: "Tasks", desc: "Record daily todos", sketch: "M" },
    { icon: BookOpen, label: "Study", desc: "Hold your syllabus", sketch: "◇" },
    { icon: Wallet, label: "Finance", desc: "Budget & loans", sketch: "△" },
    { icon: Heart, label: "Insurance", desc: "Policy records", sketch: "○" },
    { icon: Image, label: "Memory", desc: "Private photo vault", sketch: "□" },
    { icon: Clock, label: "Time", desc: "Lifespan view", sketch: "◎" },
  ];

  return (
    <motion.main 
      className="relative min-h-screen w-full overflow-x-hidden bg-chronyx-landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Paper-like texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} 
      />

      {/* Handmade sketch grid background */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sketch-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path 
                d="M 80 0 L 0 0 0 80" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.3"
                strokeDasharray="3,6"
                className="text-foreground"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sketch-grid)" />
        </svg>
      </div>

      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--chronyx-landing-vignette))_100%)]" />
      
      {/* Slow rotating concentric rings - meditative motion */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          className="chronyx-ring-rotate"
          width="700"
          height="700"
          viewBox="0 0 700 700"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="350"
            cy="350"
            r="320"
            stroke="hsl(var(--chronyx-arc-stroke))"
            strokeWidth="0.5"
            strokeDasharray="502 1508"
            strokeLinecap="round"
            fill="none"
            className="opacity-[0.03]"
          />
          <circle
            cx="350"
            cy="350"
            r="280"
            stroke="hsl(var(--chronyx-arc-stroke))"
            strokeWidth="0.5"
            strokeDasharray="220 1540"
            strokeLinecap="round"
            fill="none"
            className="opacity-[0.04]"
          />
          <circle
            cx="350"
            cy="350"
            r="240"
            stroke="hsl(var(--chronyx-arc-stroke))"
            strokeWidth="0.5"
            fill="none"
            className="opacity-[0.02]"
          />
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="w-full px-6 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChronxyxLogo className="w-8 h-8" />
              <span className="text-lg font-light tracking-[0.2em] text-foreground/80">CHRONYX</span>
            </div>
            <Link to="/login">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Enter
              </button>
            </Link>
          </div>
        </header>

        {/* Hero Section - Two Column Layout */}
        <section className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-8 lg:py-12">
          {/* Floating sketch decorations */}
          <FloatingSketchElements />
          
          {/* Hero frame corners */}
          <HeroSketchFrame />

          <div className="max-w-6xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left side - Text content */}
              <div className="text-center lg:text-left">
                {/* Logo animation with sketch ring */}
                <motion.div 
                  className={`relative mb-5 inline-block transition-all duration-1000 ease-out ${
                    mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Sketch ring around logo */}
                  <motion.svg
                    className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)]"
                    viewBox="0 0 100 100"
                    initial={{ opacity: 0, rotate: -180 }}
                    animate={{ opacity: 0.15, rotate: 0 }}
                    transition={{ delay: 0.3, duration: 1.5, ease: "easeOut" }}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.5"
                      strokeDasharray="8,6"
                    />
                  </motion.svg>
                  <ChronxyxLogo className="w-16 h-16 md:w-20 md:h-20" />
                </motion.div>

                {/* Primary Title with animated underline */}
                <motion.h1 
                  className={`relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extralight tracking-[0.12em] sm:tracking-[0.15em] text-chronyx-landing-title transition-all duration-[800ms] ease-out ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  CHRONYX
                  <SketchUnderline delay={0.8} />
                </motion.h1>

                {/* Tagline with entrance animation */}
                <motion.p 
                  className={`mt-4 text-base sm:text-lg md:text-xl font-light text-chronyx-landing-tagline`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  A quiet space for your life.
                </motion.p>

                {/* Subdescription */}
                <p 
                  className={`mt-2 text-xs sm:text-sm font-light text-muted-foreground/60 max-w-sm lg:max-w-none transition-all duration-[600ms] ease-out ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '300ms' }}
                >
                  A private system to hold your life with continuity.
                </p>

                {/* Feature pills - tighter */}
                <div 
                  className={`mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 max-w-lg transition-all duration-[600ms] ease-out ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '400ms' }}
                >
                  {features.slice(0, 4).map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div 
                        key={feature.label}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/30 bg-card/20 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all duration-300 group"
                      >
                        <Icon className="w-3 h-3 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] sm:text-xs font-light tracking-wide">{feature.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Buttons - tighter */}
                <div 
                  className={`mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-3 transition-all duration-[600ms] ease-out ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '500ms' }}
                >
                  <Link to="/login">
                    <button className="group relative px-6 py-2.5 text-xs sm:text-sm tracking-wider font-light border border-primary/80 text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-all duration-300 ease-out overflow-hidden">
                      <span className="relative z-10 flex items-center gap-2">
                        Enter CHRONYX
                        <Shield className="w-3.5 h-3.5 opacity-70" />
                      </span>
                    </button>
                  </Link>
                  
                  <button 
                    onClick={() => setShowDemo(true)}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm tracking-wider font-light border border-border/40 text-muted-foreground bg-transparent rounded-md hover:border-primary/30 hover:text-foreground transition-all duration-300"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Watch Demo
                  </button>
                </div>

                {/* PWA Install Button for Offline Use */}
                <motion.div 
                  className={`mt-4 transition-all duration-[600ms] ease-out ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '600ms' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <PWAInstallPrompt variant="hero" />
                </motion.div>

                {/* Scroll indicator - smaller, only on mobile */}
                <div 
                  className={`mt-10 flex lg:hidden flex-col items-center gap-1 text-muted-foreground/30 transition-all duration-[600ms] ease-out ${
                    mounted ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ transitionDelay: '700ms' }}
                >
                  <span className="text-[10px] tracking-widest uppercase">Explore</span>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                </div>
              </div>

              {/* Right side - Dashboard Preview */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative">
                  {/* Background glow effect */}
                  <motion.div
                    className="absolute -inset-8 bg-gradient-to-br from-primary/5 via-transparent to-chronyx-success/5 rounded-3xl blur-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                  />
                  
                  {/* Platform Overview Label */}
                  <motion.div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-border/50" />
                    <span className="text-[10px] tracking-widest text-muted-foreground/60 uppercase whitespace-nowrap">
                      Platform Overview
                    </span>
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-border/50" />
                  </motion.div>
                  
                  <DashboardPreview />
                  
                  {/* Scroll indicator - desktop only */}
                  <motion.div 
                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                  >
                    <span className="text-[10px] tracking-widest uppercase">Explore</span>
                    <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Connector */}
        <SectionConnector className="hidden md:block" />

        {/* What is CHRONYX Section */}
        <ScrollReveal direction="up" delay={0.1}>
          <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-border/20">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl sm:text-2xl font-light text-foreground mb-4">
                What is CHRONYX?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                CHRONYX is a <strong className="text-foreground font-medium">personal system of record</strong> — 
                a quiet place to hold the threads of your life. Tasks, knowledge, finances, and memories.
              </p>
              <p className="text-muted-foreground/60 mt-2 text-xs sm:text-sm">
                Not a productivity tool. Just a place for continuity.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* Why CHRONYX Section */}
        <ScrollReveal direction="up" delay={0.15}>
          <section className="px-4 sm:px-6 py-12 sm:py-16 bg-card/20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-xl sm:text-2xl font-light text-foreground mb-8">
                Why CHRONYX?
              </h2>
              <StaggerContainer className="grid grid-cols-3 gap-4 sm:gap-6" staggerDelay={0.15}>
                <StaggerItem>
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-accent/40 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-medium text-foreground mb-1">No Gamification</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/70">No streaks. No pressure.</p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-accent/40 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-medium text-foreground mb-1">Completely Private</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/70">Your data. Your control.</p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-accent/40 flex items-center justify-center">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-medium text-foreground mb-1">Full Control</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/70">Export everything anytime.</p>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </section>
        </ScrollReveal>

        {/* Features Grid Section */}
        <ScrollReveal direction="up" delay={0.1}>
          <section className="px-4 sm:px-6 py-12 sm:py-16">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-center text-xl sm:text-2xl font-light text-foreground mb-2">
                Everything in one place
              </h2>
              <p className="text-center text-muted-foreground/70 mb-8 max-w-sm mx-auto text-xs sm:text-sm">
                A personal dashboard for tasks, studies, finances, and memories
              </p>
              
              <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4" staggerDelay={0.08}>
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <StaggerItem key={feature.label}>
                      <SketchBorderCard
                        delay={0}
                        mounted={true}
                        className="transition-all duration-400"
                      >
                        {/* Sketch corner decoration */}
                        <div className="absolute top-1.5 right-2 text-[10px] text-muted-foreground/15 font-mono">
                          {feature.sketch}
                        </div>
                        
                        <div className="flex flex-col items-start">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-accent/40 flex items-center justify-center mb-2.5 group-hover:bg-primary/10 transition-colors">
                            <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <h3 className="text-sm sm:text-base font-medium text-foreground mb-0.5">{feature.label}</h3>
                          <p className="text-[10px] sm:text-xs text-muted-foreground/70">{feature.desc}</p>
                        </div>
                        
                        {/* Hover line effect */}
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-400" />
                      </SketchBorderCard>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </section>
        </ScrollReveal>

        {/* Philosophy Image Section */}
        <ScrollReveal direction="up" delay={0.1}>
          <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-border/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-center text-xl sm:text-2xl font-light text-foreground mb-2">
                The Philosophy of CHRONYX
              </h2>
              <p className="text-center text-muted-foreground/70 mb-6 max-w-md mx-auto text-xs sm:text-sm">
                An integrated view of your life — from finances to memories
              </p>
              {/* Image with bottom cropped to hide NotebookLM watermark */}
              <div className="relative rounded-lg overflow-hidden border border-border/30 shadow-md">
                <div className="overflow-hidden" style={{ marginBottom: '-40px' }}>
                  <img 
                    src={chronyxPhilosophy} 
                    alt="CHRONYX Philosophy - A quiet space for your life" 
                    className="w-full h-auto"
                  />
                </div>
                {/* Gradient overlay at bottom to smoothly hide watermark area */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/90 to-transparent" />
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Chronyx Desktop Section */}
        <ScrollReveal direction="up" delay={0.1}>
          <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-border/20">
            <div className="max-w-2xl mx-auto text-center">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-primary" />
                </div>
                {/* Coming Soon Badge */}
                <div className="absolute -top-2 -right-8 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-medium rounded-full transform rotate-12 shadow-lg">
                  Coming Soon
                </div>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-light text-foreground mb-2">
                CHRONYX Desktop
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70 leading-relaxed mb-6 max-w-md mx-auto">
                Experience CHRONYX as a native desktop application. 
                Faster, offline-capable, and seamlessly integrated with your system.
              </p>
              
              <button 
                onClick={() => setShowDesktopDialog(true)}
                className="group inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm tracking-wider font-light border border-border/40 text-muted-foreground bg-card/30 rounded-md hover:border-primary/40 hover:text-foreground transition-all duration-300"
              >
                <Download className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span>Download for Desktop</span>
              </button>
              
              {/* Platform Icons Preview */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-muted-foreground/50">
                  <Apple className="w-4 h-4" />
                  <span className="text-[10px]">macOS</span>
                </div>
                <div className="w-px h-4 bg-border/30" />
                <div className="flex items-center gap-1.5 text-muted-foreground/50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 5.557l7.357-1.002v7.1H3V5.557zm0 12.886l7.357 1.002v-7.06H3v6.058zM11.543 5.03L21 3.674v8.074h-9.457V5.03zm0 13.94L21 20.326v-8.064h-9.457v6.708z"/>
                  </svg>
                  <span className="text-[10px]">Windows</span>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Privacy Section */}
        <ScrollReveal direction="none" delay={0.1}>
          <section className="px-4 sm:px-6 py-10 sm:py-14 border-t border-border/20">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-lg sm:text-xl font-light text-foreground mb-3">
                Privacy, Ownership, Control
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/70 leading-relaxed">
                Your data never leaves your account. Export everything as JSON or PDF anytime. 
                This is a system you can trust for many years.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* Pricing Section */}
        <ScrollReveal direction="up" delay={0.1}>
          <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-border/20 bg-card/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-center text-xl sm:text-2xl font-light text-foreground mb-2">
                Simple Pricing
              </h2>
              <p className="text-center text-muted-foreground/70 mb-8 max-w-sm mx-auto text-xs sm:text-sm">
                Start free, upgrade when you need more
              </p>
              
              <StaggerContainer className="grid md:grid-cols-3 gap-4" staggerDelay={0.12}>
                {/* Free */}
                <StaggerItem direction="up">
                  <div className="p-5 rounded-lg border border-border/30 bg-card/30 h-full">
                    <Zap className="w-6 h-6 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium text-foreground">Free</h3>
                    <p className="text-2xl font-light text-foreground mt-1">₹0<span className="text-sm text-muted-foreground">/forever</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Everything to get started</p>
                    <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3" />Unlimited tasks & todos</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3" />Financial tracking</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3" />2GB memory storage</li>
                    </ul>
                  </div>
                </StaggerItem>
                
                {/* Pro */}
                <StaggerItem direction="up">
                  <div className="p-5 rounded-lg border border-primary/50 bg-primary/5 relative h-full">
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-full">Popular</div>
                    <Sparkles className="w-6 h-6 text-primary mb-2" />
                    <h3 className="text-lg font-medium text-foreground">Pro</h3>
                    <p className="text-2xl font-light text-foreground mt-1">₹99<span className="text-sm text-muted-foreground">/month</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Enhanced features</p>
                    <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" />10GB storage</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" />Tax savings insights</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" />Advanced reports</li>
                    </ul>
                  </div>
                </StaggerItem>
                
                {/* Premium */}
                <StaggerItem direction="up">
                  <div className="p-5 rounded-lg border border-amber-500/30 bg-amber-500/5 relative h-full">
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">Lifetime</div>
                    <Crown className="w-6 h-6 text-amber-500 mb-2" />
                    <h3 className="text-lg font-medium text-foreground">Premium</h3>
                    <p className="text-2xl font-light text-foreground mt-1">₹2,999<span className="text-sm text-muted-foreground">/once</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Forever access</p>
                    <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-500" />Unlimited storage</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-500" />All future updates</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-500" />Early access</li>
                    </ul>
                  </div>
                </StaggerItem>
              </StaggerContainer>
              
              <div className="text-center mt-6">
                <Link to="/pricing" className="text-xs text-primary hover:underline">View full pricing details →</Link>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Quiet Closing Section */}
        <ScrollReveal direction="none" delay={0.1}>
          <section className="px-4 sm:px-6 py-14 sm:py-20 text-center">
            <p className="text-base sm:text-lg font-light text-muted-foreground/60 mb-5">
              A system someone could trust<br />and live with for many years.
            </p>
            <Link to="/login">
              <button className="px-6 py-2.5 text-xs sm:text-sm tracking-wider font-light border border-primary/80 text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-all duration-300">
                Enter CHRONYX
              </button>
            </Link>
          </section>
        </ScrollReveal>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-6 border-t border-border/20">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ChronxyxLogo className="w-4 h-4 opacity-40" />
                <span className="font-light tracking-wide text-xs text-muted-foreground/40">CHRONYX by CROPXON</span>
              </div>
              
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50">
                <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                <Link to="/refund" className="hover:text-foreground transition-colors">Refund</Link>
                <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              </div>
              
              <p className="text-[10px] text-muted-foreground/40">Private · Quiet · Timeless</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Demo Video Modal */}
      {showDemo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4"
          onClick={() => setShowDemo(false)}
        >
          <div 
            className="relative w-full max-w-4xl aspect-video bg-card rounded-xl border border-border overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video Player */}
            <video
              className="w-full h-full object-cover"
              controls
              autoPlay
              playsInline
            >
              <source 
                src="https://ewevnteuyfpinnlhvoty.supabase.co/storage/v1/object/public/chronyx/CHRONYX__A_Quiet_Space.mp4" 
                type="video/mp4" 
              />
              Your browser does not support the video tag.
            </video>
            
            {/* Brand Overlay - covers NotebookLM branding in top-left corner */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-background via-background/80 to-transparent px-4 py-3 pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChronxyxLogo className="w-6 h-6" />
                  <span className="text-base font-light tracking-[0.15em] text-foreground">CHRONYX</span>
                </div>
                <span className="text-xs font-light tracking-wide text-muted-foreground mr-10">by CROPXON</span>
              </div>
            </div>
            
            {/* Bottom overlay to hide any watermarks */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent h-16 pointer-events-none flex items-end justify-center pb-2">
              <span className="text-xs font-light tracking-widest text-muted-foreground/60">A QUIET SPACE FOR YOUR LIFE</span>
            </div>
            
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
              onClick={() => setShowDemo(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Platform Selection Dialog */}
      <Dialog open={showDesktopDialog} onOpenChange={setShowDesktopDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-light tracking-wide">
              <Monitor className="w-5 h-5 text-primary" />
              CHRONYX Desktop
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose your platform to download CHRONYX Desktop
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 mt-4">
            {/* macOS Option */}
            <button 
              className="group relative flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card/30 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
              onClick={() => {
                // Future download link
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <Apple className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-medium text-foreground">macOS</h4>
                <p className="text-xs text-muted-foreground">Apple Silicon (M1/M2/M3)</p>
              </div>
              <div className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-medium rounded-full">
                Coming Soon
              </div>
            </button>
            
            {/* Windows Option */}
            <button 
              className="group relative flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card/30 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
              onClick={() => {
                // Future download link
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5.557l7.357-1.002v7.1H3V5.557zm0 12.886l7.357 1.002v-7.06H3v6.058zM11.543 5.03L21 3.674v8.074h-9.457V5.03zm0 13.94L21 20.326v-8.064h-9.457v6.708z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-medium text-foreground">Windows</h4>
                <p className="text-xs text-muted-foreground">Intel / AMD (x64)</p>
              </div>
              <div className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-medium rounded-full">
                Coming Soon
              </div>
            </button>
          </div>
          
          <p className="text-center text-[10px] text-muted-foreground/60 mt-4">
            Sign up to be notified when CHRONYX Desktop is available
          </p>
        </DialogContent>
      </Dialog>
    </motion.main>
  );
};

export default Landing;
