import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  X, 
  Wallet, 
  FileText, 
  CheckSquare, 
  BookOpen,
  Image,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FloatingQuickAction = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: Wallet, label: "Add Expense", path: "/app/expenses", color: "text-red-400" },
    { icon: FileText, label: "Add Income", path: "/app/income", color: "text-green-400" },
    { icon: CheckSquare, label: "Add Task", path: "/app/todos", color: "text-blue-400" },
    { icon: BookOpen, label: "Study Log", path: "/app/study", color: "text-purple-400" },
    { icon: Image, label: "Add Memory", path: "/app/memory", color: "text-amber-400" },
    { icon: Shield, label: "Insurance", path: "/app/insurance", color: "text-cyan-400" },
  ];

  const handleAction = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action buttons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <span className="px-2 py-1 text-xs font-medium bg-card border border-border rounded-md shadow-md whitespace-nowrap">
                    {action.label}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className={`w-10 h-10 rounded-full shadow-lg border-border/50 bg-card hover:bg-accent ${action.color}`}
                    onClick={() => handleAction(action.path)}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          isOpen 
            ? "bg-muted-foreground text-background rotate-45" 
            : "bg-primary text-primary-foreground"
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </motion.button>

      {/* Backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingQuickAction;
