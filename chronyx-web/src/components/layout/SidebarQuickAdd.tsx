import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, 
  FolderPlus, 
  FileText, 
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarQuickAddProps {
  collapsed?: boolean;
  onClose?: () => void;
}

export const SidebarQuickAdd = ({ collapsed = false, onClose }: SidebarQuickAddProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "folder" | "document">("menu");
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFolder = async () => {
    if (!user || !name.trim()) return;
    
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from("memory_folders")
        .insert({
          user_id: user.id,
          name: name.trim(),
          color: "bg-accent/30",
          icon: "Default",
        });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["memory-folders"] });
      toast.success(`Folder "${name}" created`);
      setOpen(false);
      setMode("menu");
      setName("");
      onClose?.();
      navigate("/app/memory");
    } catch (error) {
      toast.error("Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!user || !name.trim()) return;
    
    // Navigate to documents page - user can add the document there
    setOpen(false);
    setMode("menu");
    setName("");
    onClose?.();
    toast.info("Redirecting to Documents...");
    navigate("/app/documents");
  };

  const resetAndClose = () => {
    setOpen(false);
    setMode("menu");
    setName("");
  };

  const QuickAddButton = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Quick Add</p>
      </TooltipContent>
    </Tooltip>
  ) : (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
    >
      <Plus className="w-4 h-4" />
      Quick Add
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {QuickAddButton}
      </PopoverTrigger>
      <PopoverContent 
        side={collapsed ? "right" : "top"} 
        align="start" 
        className="w-56 p-2"
      >
        {mode === "menu" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 pb-1">Quick Create</p>
            <button
              onClick={() => setMode("folder")}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted text-sm transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-muted-foreground" />
              <span>New Memory Folder</span>
            </button>
            <button
              onClick={() => setMode("document")}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted text-sm transition-colors"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Add Document</span>
            </button>
          </div>
        )}

        {mode === "folder" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground px-1">Create Memory Folder</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleCreateFolder();
                } else if (e.key === "Escape") {
                  resetAndClose();
                }
              }}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={resetAndClose}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleCreateFolder}
                disabled={!name.trim() || isCreating}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        )}

        {mode === "document" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground px-1">Add Identity Document</p>
            <p className="text-xs text-muted-foreground/70 px-1">
              You'll be redirected to upload your document.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={resetAndClose}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleCreateDocument}
              >
                Go to Documents
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SidebarQuickAdd;
