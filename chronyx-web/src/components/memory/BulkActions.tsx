import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, FolderInput, X, CheckSquare } from "lucide-react";

interface Collection {
  id: string;
  name: string;
}

interface BulkActionsProps {
  selectedCount: number;
  collections: Collection[];
  onMoveToCollection: (collectionId: string | null) => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isDeleting?: boolean;
  isMoving?: boolean;
}

export const BulkActions = ({
  selectedCount,
  collections,
  onMoveToCollection,
  onDelete,
  onClearSelection,
  isDeleting,
  isMoving,
}: BulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-primary" />
        <Badge variant="secondary" className="font-medium">
          {selectedCount} selected
        </Badge>
      </div>
      
      <div className="h-6 w-px bg-border" />
      
      <Select onValueChange={onMoveToCollection} disabled={isMoving}>
        <SelectTrigger className="w-40 h-8">
          <FolderInput className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Move to..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Remove from collection</SelectItem>
          {collections.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={isDeleting}
      >
        <Trash2 className="w-4 h-4 mr-1" />
        Delete
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onClearSelection}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
