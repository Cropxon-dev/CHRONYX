import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Download, FileArchive, FileJson, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Memory {
  id: string;
  title: string | null;
  description: string | null;
  media_type: string;
  file_url: string;
  created_date: string;
  collection_id: string | null;
  folder_id: string | null;
  is_locked: boolean;
}

interface Collection {
  id: string;
  name: string;
}

interface MemoryExportProps {
  memory?: Memory;
  memories?: Memory[];
  collections: Collection[];
  exportType: "single" | "collection" | "full";
  collectionName?: string;
  onClose: () => void;
  open: boolean;
}

export const MemoryExport = ({
  memory,
  memories = [],
  collections,
  exportType,
  collectionName,
  onClose,
  open,
}: MemoryExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"metadata" | "full">("metadata");

  const generateMetadataJson = (items: Memory[]) => {
    return items.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      created_date: m.created_date,
      media_type: m.media_type,
      collection: collections.find((c) => c.id === m.collection_id)?.name || null,
      locked: m.is_locked,
      file_url: m.file_url,
    }));
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const datePart = format(new Date(), "yyyy-MM-dd");
      
      if (exportType === "single" && memory) {
        const metadata = generateMetadataJson([memory]);
        downloadJson(metadata[0], `memory_${memory.id.slice(0, 8)}_${datePart}.json`);
        toast({ title: "Memory metadata exported" });
      } else if (exportType === "collection" && collectionName) {
        const collectionMemories = memories.filter((m) => 
          m.collection_id === collections.find((c) => c.name === collectionName)?.id
        );
        const metadata = generateMetadataJson(collectionMemories);
        downloadJson({
          collection: collectionName,
          exported_at: new Date().toISOString(),
          count: collectionMemories.length,
          memories: metadata,
        }, `collection_${collectionName.replace(/\s+/g, "_")}_${datePart}.json`);
        toast({ title: `Collection "${collectionName}" exported` });
      } else if (exportType === "full") {
        const metadata = generateMetadataJson(memories);
        downloadJson({
          exported_at: new Date().toISOString(),
          total_memories: memories.length,
          collections: collections.map((c) => ({
            id: c.id,
            name: c.name,
            count: memories.filter((m) => m.collection_id === c.id).length,
          })),
          memories: metadata,
        }, `vyom_memory_backup_${datePart}.json`);
        toast({ title: "Full backup exported", description: `${memories.length} memories exported` });
      }
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const getTitle = () => {
    switch (exportType) {
      case "single": return "Export Memory";
      case "collection": return `Export Collection: ${collectionName}`;
      case "full": return "Full Backup";
    }
  };

  const getDescription = () => {
    switch (exportType) {
      case "single": return "Download metadata for this memory.";
      case "collection": return `Export all memories from "${collectionName}" as a JSON file.`;
      case "full": return `Export all ${memories.length} memories with full metadata.`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{getDescription()}</p>
          
          <div className="bg-accent/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">JSON Export</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Includes: IDs, titles, descriptions, dates, collections, and file URLs.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
