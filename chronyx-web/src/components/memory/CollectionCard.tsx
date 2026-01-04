import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layers, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Collection {
  id: string;
  name: string;
  folder_id: string | null;
}

interface CollectionCardProps {
  collection: Collection;
  memoryCount: number;
  onUpdate: (name: string) => void;
  onDelete: () => void;
  onClick: () => void;
}

export const CollectionCard = ({
  collection,
  memoryCount,
  onUpdate,
  onDelete,
  onClick,
}: CollectionCardProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editName, setEditName] = useState(collection.name);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(editName.trim());
      setEditOpen(false);
    }
  };

  return (
    <>
      <Card 
        className="group cursor-pointer transition-all hover:shadow-md hover:bg-accent/30 relative"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{collection.name}</p>
              <p className="text-xs text-muted-foreground">{memoryCount} memories</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setEditName(collection.name);
                  setEditOpen(true);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Collection</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Collection name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!editName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{collection.name}"? 
              Memories in this collection will not be deleted, but will be removed from the collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
