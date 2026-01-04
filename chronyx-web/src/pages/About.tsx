import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Linkedin, Twitter, Globe, Users, Target, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  const team = [
    {
      name: "Founder & CEO",
      role: "Vision & Strategy",
      description: "Leading CROPXON's mission to simplify personal finance management for everyone."
    },
    {
      name: "Tech Lead",
      role: "Engineering",
      description: "Building robust and scalable solutions that power CHRONYX."
    },
    {
      name: "Design Lead",
      role: "User Experience",
      description: "Crafting intuitive interfaces that make financial tracking effortless."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">CHRONYX</span>
            <span className="text-xs text-muted-foreground">by CROPXON</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About CROPXON</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Building tools that help you understand and manage your life better.
          </p>
        </motion.section>

        {/* Company Story */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Our Story</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  CROPXON was born from a simple observation: managing personal finances, tracking life milestones, 
                  and staying organized shouldn't require multiple apps and complex spreadsheets.
                </p>
                <p>
                  We believe that everyone deserves access to powerful tools that help them understand their 
                  financial health, track their memories, and plan their future—all in one place.
                </p>
                <p>
                  CHRONYX is our flagship product, designed to be your personal life operating system. 
                  From tracking expenses and managing loans to preserving memories and planning your studies, 
                  CHRONYX brings everything together in a beautiful, intuitive interface.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Mission & Vision */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-16"
        >
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Our Mission</h3>
              </div>
              <p className="text-muted-foreground">
                To empower individuals with simple, powerful tools that help them take control of their 
                finances, preserve their memories, and achieve their goals.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Our Vision</h3>
              </div>
              <p className="text-muted-foreground">
                A world where everyone has access to the tools they need to make informed decisions 
                about their life and finances, regardless of their background.
              </p>
            </CardContent>
          </Card>
        </motion.section>

        {/* Team */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Our Team</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card className="border-border/50 bg-card/50 h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">{member.name.charAt(0)}</span>
                    </div>
                    <h3 className="font-bold mb-1">{member.name}</h3>
                    <p className="text-sm text-primary mb-3">{member.role}</p>
                    <p className="text-sm text-muted-foreground">{member.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Contact */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Get in Touch</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <a 
                  href="mailto:hello@cropxon.com" 
                  className="flex items-center gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">hello@cropxon.com</p>
                  </div>
                </a>

                <a 
                  href="tel:+919876543210" 
                  className="flex items-center gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">+91 98765 43210</p>
                  </div>
                </a>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">India</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border/50">
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-primary/10 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-primary/10 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-primary/10 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of users who trust CHRONYX to manage their life.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button asChild>
              <Link to="/login">Get Started Free</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CROPXON. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
