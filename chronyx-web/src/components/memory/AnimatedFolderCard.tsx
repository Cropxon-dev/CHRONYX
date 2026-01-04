import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  FolderOpen, 
  Lock, 
  Unlock, 
  Key, 
  Palette,
  Trash2,
  FolderHeart,
  FolderArchive,
  FolderCog,
  Star,
  Pencil,
  Check,
  FolderClosed
} from "lucide-react";
import { cn } from "@/lib/utils";

const FOLDER_COLORS = [
  { name: "Default", value: "bg-accent/30", textColor: "text-muted-foreground", borderColor: "border-border" },
  { name: "Blue", value: "bg-blue-500/20", textColor: "text-blue-500", borderColor: "border-blue-500/30" },
  { name: "Green", value: "bg-green-500/20", textColor: "text-green-500", borderColor: "border-green-500/30" },
  { name: "Yellow", value: "bg-yellow-500/20", textColor: "text-yellow-500", borderColor: "border-yellow-500/30" },
  { name: "Red", value: "bg-red-500/20", textColor: "text-red-500", borderColor: "border-red-500/30" },
  { name: "Purple", value: "bg-purple-500/20", textColor: "text-purple-500", borderColor: "border-purple-500/30" },
  { name: "Pink", value: "bg-pink-500/20", textColor: "text-pink-500", borderColor: "border-pink-500/30" },
  { name: "Orange", value: "bg-orange-500/20", textColor: "text-orange-500", borderColor: "border-orange-500/30" },
];

const FOLDER_ICONS = [
  { name: "Default", icon: FolderOpen, closedIcon: FolderClosed },
  { name: "Heart", icon: FolderHeart, closedIcon: FolderHeart },
  { name: "Archive", icon: FolderArchive, closedIcon: FolderArchive },
  { name: "Settings", icon: FolderCog, closedIcon: FolderCog },
  { name: "Star", icon: Star, closedIcon: Star },
];

type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  is_locked: boolean;
  lock_hash: string | null;
  color?: string;
  icon?: string;
};

interface AnimatedFolderCardProps {
  folder: Folder;
  isUnlocked: boolean;
  isOpen?: boolean;
  onLock: () => void;
  onUnlock: () => void;
  onRelock: () => void;
  onUpdate: (updates: { color?: string; icon?: string; name?: string }) => void;
  onDelete: () => void;
  onClick?: () => void;
  onDrop?: (memoryId: string) => void;
}

export const AnimatedFolderCard = ({
  folder,
  isUnlocked,
  isOpen = false,
  onLock,
  onUnlock,
  onRelock,
  onUpdate,
  onDelete,
  onClick,
}: AnimatedFolderCardProps) => {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(folder.color || FOLDER_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(folder.icon || "Default");
  const [isDragOver, setIsDragOver] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [isLockAnimating, setIsLockAnimating] = useState(false);
  const [isUnlockAnimating, setIsUnlockAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const iconData = FOLDER_ICONS.find(i => i.name === selectedIcon) || FOLDER_ICONS[0];
  const IconComponent = isOpen ? iconData.icon : iconData.closedIcon;
  const colorClass = FOLDER_COLORS.find(c => c.value === selectedColor) || FOLDER_COLORS[0];

  // Sync newName when folder.name changes
  useEffect(() => {
    setNewName(folder.name);
  }, [folder.name]);

  // Sync selected values when folder changes
  useEffect(() => {
    setSelectedColor(folder.color || FOLDER_COLORS[0].value);
    setSelectedIcon(folder.icon || "Default");
  }, [folder.color, folder.icon]);

  useEffect(() => {
    if (renameOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [renameOpen]);

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      onUpdate({ name: newName.trim() });
    } else {
      setNewName(folder.name);
    }
    setRenameOpen(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleLockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLockAnimating(true);
    setTimeout(() => {
      setIsLockAnimating(false);
      onLock();
    }, 400);
  };

  const handleUnlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUnlockAnimating(true);
    setTimeout(() => {
      setIsUnlockAnimating(false);
      onUnlock();
    }, 400);
  };

  const handleRelockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLockAnimating(true);
    setTimeout(() => {
      setIsLockAnimating(false);
      onRelock();
    }, 400);
  };

  const saveCustomization = () => {
    onUpdate({ color: selectedColor, icon: selectedIcon });
    setCustomizeOpen(false);
  };

  return (
    <>
      <Card 
        className={cn(
          "cursor-pointer group border transition-all duration-300 ease-out overflow-hidden",
          "hover:shadow-lg hover:-translate-y-0.5",
          isDragOver && "ring-2 ring-primary scale-105 shadow-xl",
          isOpen && "shadow-md",
          colorClass.borderColor
        )}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className={cn(
          "p-3 transition-all duration-300",
          colorClass.value
        )}>
          <div className="flex items-center gap-3">
            {/* Animated Folder Icon */}
            <div 
              className={cn(
                "relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-background/60 backdrop-blur-sm",
                "transition-all duration-300 ease-out",
                isOpen && "scale-110 rotate-[-3deg]"
              )}
            >
              <IconComponent 
                className={cn(
                  "w-5 h-5 transition-all duration-300",
                  colorClass.textColor,
                  isOpen && "animate-pulse"
                )} 
              />
              
              {/* Lock overlay animation */}
              {folder.is_locked && (
                <div 
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center",
                    "transition-all duration-300",
                    isUnlocked 
                      ? "bg-green-500/20 border border-green-500/50" 
                      : "bg-amber-500/20 border border-amber-500/50",
                    isLockAnimating && "animate-bounce",
                    isUnlockAnimating && "animate-[wiggle_0.4s_ease-in-out]"
                  )}
                >
                  {isUnlocked ? (
                    <Unlock className="w-2.5 h-2.5 text-green-500" />
                  ) : (
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                  )}
                </div>
              )}
            </div>
            
            {/* Name */}
            <div className="flex-1 min-w-0">
              <span 
                className="text-sm font-medium truncate block"
                title={folder.name}
              >
                {folder.name}
              </span>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {folder.is_locked ? (
                isUnlocked ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 transition-all duration-300",
                      isLockAnimating && "scale-110"
                    )}
                    onClick={handleRelockClick}
                  >
                    <Unlock className={cn(
                      "w-4 h-4 text-green-500 transition-transform duration-300",
                      isLockAnimating && "rotate-12"
                    )} />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 transition-all duration-300",
                      isUnlockAnimating && "scale-110"
                    )}
                    onClick={handleUnlockClick}
                  >
                    <Lock className={cn(
                      "w-4 h-4 text-amber-500 transition-transform duration-300",
                      isUnlockAnimating && "animate-[shake_0.3s_ease-in-out]"
                    )} />
                  </Button>
                )
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  onClick={handleLockClick}
                >
                  <Key className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300",
                    isLockAnimating && "rotate-45 scale-110"
                  )} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewName(folder.name);
                  setRenameOpen(true);
                }}
                title="Rename folder"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomizeOpen(true);
                }}
              >
                <Palette className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rename Dialog (Popup) */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  } else if (e.key === "Escape") {
                    setNewName(folder.name);
                    setRenameOpen(false);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setNewName(folder.name);
              setRenameOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              <Check className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customize Dialog */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Color Selection with animation */}
            <div>
              <label className="text-sm font-medium mb-3 block">Color</label>
              <div className="grid grid-cols-4 gap-2">
                {FOLDER_COLORS.map((color, idx) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "h-12 rounded-lg transition-all duration-300 relative overflow-hidden",
                      color.value,
                      color.borderColor,
                      "border-2",
                      selectedColor === color.value 
                        ? "ring-2 ring-primary ring-offset-2 scale-105" 
                        : "hover:scale-105"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    title={color.name}
                  >
                    {selectedColor === color.value && (
                      <div className="absolute inset-0 flex items-center justify-center animate-scale-in">
                        <Check className={cn("w-5 h-5", color.textColor)} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Selection with animation */}
            <div>
              <label className="text-sm font-medium mb-3 block">Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {FOLDER_ICONS.map((icon, idx) => (
                  <button
                    key={icon.name}
                    onClick={() => setSelectedIcon(icon.name)}
                    className={cn(
                      "h-14 flex items-center justify-center rounded-lg bg-muted/50 border border-border",
                      "transition-all duration-300",
                      selectedIcon === icon.name 
                        ? "ring-2 ring-primary ring-offset-2 scale-105 bg-primary/10" 
                        : "hover:scale-105 hover:bg-muted"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    title={icon.name}
                  >
                    <icon.icon className={cn(
                      "w-6 h-6 transition-transform duration-300",
                      selectedIcon === icon.name && "scale-110"
                    )} />
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <label className="text-sm font-medium mb-3 block">Preview</label>
              <Card className={cn(
                "transition-all duration-300",
                FOLDER_COLORS.find(c => c.value === selectedColor)?.value,
                FOLDER_COLORS.find(c => c.value === selectedColor)?.borderColor,
                "border"
              )}>
                <CardContent className="p-4 flex items-center gap-3">
                  {(() => {
                    const PreviewIconData = FOLDER_ICONS.find(i => i.name === selectedIcon) || FOLDER_ICONS[0];
                    const PreviewIcon = PreviewIconData.icon;
                    const previewColor = FOLDER_COLORS.find(c => c.value === selectedColor);
                    return (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center">
                          <PreviewIcon className={cn("w-5 h-5 transition-colors duration-300", previewColor?.textColor)} />
                        </div>
                        <span className="text-sm font-medium">{folder.name}</span>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                onDelete();
                setCustomizeOpen(false);
              }}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setCustomizeOpen(false)}>Cancel</Button>
            <Button onClick={saveCustomization}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { FOLDER_COLORS, FOLDER_ICONS };
