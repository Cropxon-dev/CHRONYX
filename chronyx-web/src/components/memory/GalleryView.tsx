import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Grid3X3, 
  LayoutGrid,
  List, 
  Calendar,
  Video,
  Play,
  GripVertical,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";

type Memory = {
  id: string;
  title: string | null;
  description: string | null;
  media_type: "photo" | "video";
  file_url: string;
  thumbnail_url: string | null;
  file_name: string;
  created_date: string;
  collection_id: string | null;
  folder_id: string | null;
  is_locked: boolean;
};

type Collection = {
  id: string;
  name: string;
  folder_id: string | null;
};

type GalleryViewMode = "grid" | "masonry" | "timeline" | "list";

interface GalleryViewProps {
  memories: Memory[];
  collections: Collection[];
  viewMode: GalleryViewMode;
  onViewModeChange: (mode: GalleryViewMode) => void;
  isSelectionMode: boolean;
  selectedMemories: Set<string>;
  onToggleSelection: (id: string) => void;
  onMemoryClick: (memory: Memory) => void;
  onSlideshow: (index: number) => void;
  draggingMemoryId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

export function GalleryView({
  memories,
  collections,
  viewMode,
  onViewModeChange,
  isSelectionMode,
  selectedMemories,
  onToggleSelection,
  onMemoryClick,
  onSlideshow,
  draggingMemoryId,
  onDragStart,
  onDragEnd
}: GalleryViewProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Group memories by date for timeline view
  const memoryGroups = memories.reduce((groups, memory) => {
    const date = memory.created_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(memory);
    return groups;
  }, {} as Record<string, Memory[]>);

  const sortedDates = Object.keys(memoryGroups).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const toggleDateExpand = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const renderMemoryItem = (memory: Memory, index: number, compact = false) => {
    const isSelected = selectedMemories.has(memory.id);
    
    return (
      <div
        key={memory.id}
        draggable={!isSelectionMode}
        onDragStart={(e) => onDragStart(e, memory.id)}
        onDragEnd={onDragEnd}
        className={`group relative ${compact ? 'aspect-square' : ''} bg-accent/20 rounded-lg overflow-hidden cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-primary" : "hover:ring-2 ring-primary/20"
        } ${draggingMemoryId === memory.id ? 'opacity-50' : ''}`}
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelection(memory.id);
          } else {
            onMemoryClick(memory);
          }
        }}
      >
        {!isSelectionMode && (
          <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-white drop-shadow cursor-grab" />
          </div>
        )}
        {isSelectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={isSelected}
              className="bg-background/80"
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={() => onToggleSelection(memory.id)}
            />
          </div>
        )}
        {memory.media_type === "photo" ? (
          <img
            src={memory.thumbnail_url || memory.file_url}
            alt={memory.title || memory.file_name}
            className={`w-full h-full object-cover ${compact ? '' : 'aspect-square'}`}
            loading="lazy"
          />
        ) : (
          memory.thumbnail_url ? (
            <img
              src={memory.thumbnail_url}
              alt={memory.title || memory.file_name}
              className={`w-full h-full object-cover ${compact ? '' : 'aspect-square'}`}
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-accent/40 ${compact ? '' : 'aspect-square'}`}>
              <Video className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
          )
        )}
        {memory.media_type === "video" && (
          <div className="absolute top-2 right-2">
            <Video className="w-4 h-4 text-white drop-shadow" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white truncate">{memory.title || memory.file_name}</p>
          <p className="text-[10px] text-white/70">{memory.created_date}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
          onClick={(e) => {
            e.stopPropagation();
            onSlideshow(index);
          }}
        >
          <Play className="w-3 h-3 text-white" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Mode Switcher */}
      <div className="flex items-center gap-1 border border-border rounded-md p-1 w-fit">
        <Button
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === "masonry" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => onViewModeChange("masonry")}
          title="Masonry view"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === "timeline" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => onViewModeChange("timeline")}
          title="Timeline view"
        >
          <Calendar className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => onViewModeChange("list")}
          title="List view"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {memories.map((memory, index) => renderMemoryItem(memory, index, true))}
        </div>
      )}

      {/* Masonry View */}
      {viewMode === "masonry" && (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
          {memories.map((memory, index) => {
            const isSelected = selectedMemories.has(memory.id);
            return (
              <div
                key={memory.id}
                draggable={!isSelectionMode}
                onDragStart={(e) => onDragStart(e, memory.id)}
                onDragEnd={onDragEnd}
                className={`group relative break-inside-avoid bg-accent/20 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary" : "hover:ring-2 ring-primary/20"
                } ${draggingMemoryId === memory.id ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (isSelectionMode) {
                    onToggleSelection(memory.id);
                  } else {
                    onMemoryClick(memory);
                  }
                }}
              >
                {!isSelectionMode && (
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-white drop-shadow cursor-grab" />
                  </div>
                )}
                {isSelectionMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={isSelected}
                      className="bg-background/80"
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => onToggleSelection(memory.id)}
                    />
                  </div>
                )}
                {memory.media_type === "photo" ? (
                  <img
                    src={memory.thumbnail_url || memory.file_url}
                    alt={memory.title || memory.file_name}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                ) : (
                  memory.thumbnail_url ? (
                    <img
                      src={memory.thumbnail_url}
                      alt={memory.title || memory.file_name}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center bg-accent/40">
                      <Video className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                    </div>
                  )
                )}
                {memory.media_type === "video" && (
                  <div className="absolute top-2 right-2">
                    <Video className="w-4 h-4 text-white drop-shadow" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">{memory.title || memory.file_name}</p>
                  <p className="text-[10px] text-white/70">{memory.created_date}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlideshow(index);
                  }}
                >
                  <Play className="w-3 h-3 text-white" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dateMemories = memoryGroups[date];
            const isExpanded = expandedDates.has(date) || expandedDates.size === 0;
            const formattedDate = format(parseISO(date), "EEEE, MMMM d, yyyy");
            
            return (
              <div key={date} className="border-l-2 border-primary/30 pl-4 ml-2">
                <button
                  onClick={() => toggleDateExpand(date)}
                  className="flex items-center gap-2 mb-3 hover:text-primary transition-colors w-full text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{formattedDate}</span>
                    <span className="text-xs text-muted-foreground">
                      ({dateMemories.length} {dateMemories.length === 1 ? 'memory' : 'memories'})
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {dateMemories.map((memory, i) => {
                      const globalIndex = memories.findIndex(m => m.id === memory.id);
                      return renderMemoryItem(memory, globalIndex, true);
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {memories.map((memory, index) => {
            const isSelected = selectedMemories.has(memory.id);
            return (
              <Card
                key={memory.id}
                draggable={!isSelectionMode}
                onDragStart={(e) => onDragStart(e, memory.id)}
                onDragEnd={onDragEnd}
                className={`cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary" : "hover:bg-accent/30"
                } ${draggingMemoryId === memory.id ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (isSelectionMode) {
                    onToggleSelection(memory.id);
                  } else {
                    onMemoryClick(memory);
                  }
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {!isSelectionMode && (
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
                  )}
                  {isSelectionMode && (
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => onToggleSelection(memory.id)}
                    />
                  )}
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded overflow-hidden flex-shrink-0">
                    {memory.thumbnail_url ? (
                      <img
                        src={memory.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : memory.media_type === "photo" ? (
                      <img
                        src={memory.file_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/40">
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">{memory.title || memory.file_name}</p>
                    <p className="text-xs text-muted-foreground">{memory.created_date}</p>
                    {memory.collection_id && (
                      <p className="text-xs text-muted-foreground/70 truncate">
                        {collections.find(c => c.id === memory.collection_id)?.name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSlideshow(index);
                    }}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { GalleryViewMode };
