import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  X
} from "lucide-react";

const FOLDER_COLORS = [
  { name: "Default", value: "bg-accent/30", textColor: "text-muted-foreground" },
  { name: "Blue", value: "bg-blue-500/20", textColor: "text-blue-500" },
  { name: "Green", value: "bg-green-500/20", textColor: "text-green-500" },
  { name: "Yellow", value: "bg-yellow-500/20", textColor: "text-yellow-500" },
  { name: "Red", value: "bg-red-500/20", textColor: "text-red-500" },
  { name: "Purple", value: "bg-purple-500/20", textColor: "text-purple-500" },
  { name: "Pink", value: "bg-pink-500/20", textColor: "text-pink-500" },
  { name: "Orange", value: "bg-orange-500/20", textColor: "text-orange-500" },
];

const FOLDER_ICONS = [
  { name: "Default", icon: FolderOpen },
  { name: "Heart", icon: FolderHeart },
  { name: "Archive", icon: FolderArchive },
  { name: "Settings", icon: FolderCog },
  { name: "Star", icon: Star },
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

interface FolderCardProps {
  folder: Folder;
  isUnlocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  onRelock: () => void;
  onUpdate: (updates: { color?: string; icon?: string; name?: string }) => void;
  onDelete: () => void;
  onDrop?: (memoryId: string) => void;
}

export const FolderCard = ({
  folder,
  isUnlocked,
  onLock,
  onUnlock,
  onRelock,
  onUpdate,
  onDelete,
}: FolderCardProps) => {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(folder.color || FOLDER_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(folder.icon || "Default");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const IconComponent = FOLDER_ICONS.find(i => i.name === selectedIcon)?.icon || FolderOpen;
  const colorClass = FOLDER_COLORS.find(c => c.value === selectedColor) || FOLDER_COLORS[0];

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      onUpdate({ name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setNewName(folder.name);
      setIsRenaming(false);
    }
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
    // Handle drop - implemented in parent
  };

  const saveCustomization = () => {
    onUpdate({ color: selectedColor, icon: selectedIcon });
    setCustomizeOpen(false);
  };

  return (
    <>
      <Card 
        className={`cursor-pointer transition-all duration-200 group border ${
          isDragOver ? 'ring-2 ring-primary scale-105' : 'hover:scale-[1.02]'
        }`}
        style={{
          backgroundColor: colorClass.value.includes('bg-') ? undefined : colorClass.value,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className={`p-3 ${colorClass.value}`}>
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-background/50`}>
              <IconComponent className={`w-4 h-4 ${colorClass.textColor}`} />
            </div>
            
            {/* Name and Controls */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {isRenaming ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-sm py-0 px-2 bg-background"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename();
                    }}
                  >
                    <Check className="w-3 h-3 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewName(folder.name);
                      setIsRenaming(false);
                    }}
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ) : (
                <span 
                  className="text-sm font-medium truncate flex-1 cursor-pointer"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsRenaming(true);
                  }}
                  title={folder.name}
                >
                  {folder.name}
                </span>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {folder.is_locked ? (
                isUnlocked ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRelock();
                    }}
                  >
                    <Unlock className="w-3.5 h-3.5 text-green-500" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnlock();
                    }}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  </Button>
                )
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLock();
                  }}
                >
                  <Key className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
                title="Rename folder"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomizeOpen(true);
                }}
              >
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customize Dialog */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="grid grid-cols-4 gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.value)}
                    className={`h-10 rounded-md ${color.value} transition-all ${
                      selectedColor === color.value ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Icon Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {FOLDER_ICONS.map((icon) => (
                  <button
                    key={icon.name}
                    onClick={() => setSelectedIcon(icon.name)}
                    className={`h-12 flex items-center justify-center rounded-md bg-accent/30 transition-all ${
                      selectedIcon === icon.name ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    title={icon.name}
                  >
                    <icon.icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="text-sm font-medium mb-2 block">Preview</label>
              <Card className={`${FOLDER_COLORS.find(c => c.value === selectedColor)?.value}`}>
                <CardContent className="p-4 flex items-center gap-2">
                  {(() => {
                    const PreviewIcon = FOLDER_ICONS.find(i => i.name === selectedIcon)?.icon || FolderOpen;
                    const previewColor = FOLDER_COLORS.find(c => c.value === selectedColor);
                    return (
                      <>
                        <PreviewIcon className={`w-5 h-5 ${previewColor?.textColor}`} />
                        <span className="text-sm font-medium">{folder.name}</span>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                onDelete();
                setCustomizeOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Folder
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setCustomizeOpen(false)}>Cancel</Button>
            <Button onClick={saveCustomization}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { FOLDER_COLORS, FOLDER_ICONS };
