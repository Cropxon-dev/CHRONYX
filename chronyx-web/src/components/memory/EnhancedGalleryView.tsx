import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Grid3X3, 
  LayoutGrid,
  List, 
  Calendar,
  Video,
  Play,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  X,
  ChevronLeft as ArrowLeft,
  ChevronRight as ArrowRight,
  Keyboard
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

interface EnhancedGalleryViewProps {
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

export function EnhancedGalleryView({
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
}: EnhancedGalleryViewProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

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

  // Fullscreen navigation
  const navigateFullscreen = useCallback((direction: "prev" | "next") => {
    if (fullscreenIndex === null) return;
    
    const newIndex = direction === "prev" 
      ? Math.max(0, fullscreenIndex - 1)
      : Math.min(memories.length - 1, fullscreenIndex + 1);
    
    setFullscreenIndex(newIndex);
  }, [fullscreenIndex, memories.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenIndex !== null) {
        switch (e.key) {
          case "ArrowLeft":
            navigateFullscreen("prev");
            break;
          case "ArrowRight":
            navigateFullscreen("next");
            break;
          case "Escape":
            setFullscreenIndex(null);
            setIsFullscreen(false);
            break;
          case "+":
          case "=":
            setZoomLevel(prev => Math.min(200, prev + 25));
            break;
          case "-":
            setZoomLevel(prev => Math.max(50, prev - 25));
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenIndex, navigateFullscreen]);

  // Open fullscreen view
  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
    setZoomLevel(100);
  };

  // Close fullscreen
  const closeFullscreen = () => {
    setFullscreenIndex(null);
    setIsFullscreen(false);
    setZoomLevel(100);
  };

  // Calculate grid columns based on zoom
  const getGridColumns = () => {
    if (zoomLevel <= 50) return "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10";
    if (zoomLevel <= 75) return "grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8";
    if (zoomLevel <= 100) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
    if (zoomLevel <= 150) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
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
            openFullscreen(index);
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
        
        {/* Quick actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-black/50 hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              openFullscreen(index);
            }}
          >
            <Maximize className="w-3 h-3 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-black/50 hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              onSlideshow(index);
            }}
          >
            <Play className="w-3 h-3 text-white" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" ref={galleryRef}>
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="w-24 sm:w-32">
            <Slider
              value={[zoomLevel]}
              min={50}
              max={200}
              step={25}
              onValueChange={([value]) => setZoomLevel(value)}
              className="cursor-pointer"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10">{zoomLevel}%</span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-2"
            onClick={() => setShowKeyboardHint(prev => !prev)}
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Keyboard hints */}
      {showKeyboardHint && (
        <div className="p-3 bg-accent/30 rounded-lg text-sm space-y-1">
          <p className="font-medium text-foreground">Keyboard Shortcuts (in fullscreen):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
            <span><kbd className="px-1 bg-accent rounded text-xs">←</kbd> Previous</span>
            <span><kbd className="px-1 bg-accent rounded text-xs">→</kbd> Next</span>
            <span><kbd className="px-1 bg-accent rounded text-xs">Esc</kbd> Close</span>
            <span><kbd className="px-1 bg-accent rounded text-xs">+</kbd> Zoom in</span>
            <span><kbd className="px-1 bg-accent rounded text-xs">-</kbd> Zoom out</span>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className={`grid ${getGridColumns()} gap-2 sm:gap-3`}>
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
                    openFullscreen(index);
                  }
                }}
              >
                {/* ... masonry item content */}
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
                  <div className={`grid ${getGridColumns()} gap-2`}>
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
                    openFullscreen(index);
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
                      <img src={memory.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : memory.media_type === "photo" ? (
                      <img src={memory.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/40">
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">{memory.title || memory.file_name}</p>
                    <p className="text-xs text-muted-foreground">{memory.created_date}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFullscreen(index);
                      }}
                    >
                      <Maximize className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSlideshow(index);
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fullscreen Viewer */}
      {isFullscreen && fullscreenIndex !== null && (
        <div 
          ref={fullscreenRef}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeFullscreen}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={closeFullscreen}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Navigation */}
          {fullscreenIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                navigateFullscreen("prev");
              }}
            >
              <ArrowLeft className="w-8 h-8" />
            </Button>
          )}
          {fullscreenIndex < memories.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                navigateFullscreen("next");
              }}
            >
              <ArrowRight className="w-8 h-8" />
            </Button>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/50 rounded-full px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setZoomLevel(Math.max(50, zoomLevel - 25));
              }}
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm min-w-[3rem] text-center">{zoomLevel}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setZoomLevel(Math.min(200, zoomLevel + 25));
              }}
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
          </div>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-50 text-white/70 text-sm">
            {fullscreenIndex + 1} / {memories.length}
          </div>

          {/* Image/Video */}
          <div 
            className="max-w-[90vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
          >
            {memories[fullscreenIndex].media_type === "photo" ? (
              <img
                src={memories[fullscreenIndex].file_url}
                alt={memories[fullscreenIndex].title || memories[fullscreenIndex].file_name}
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <video
                src={memories[fullscreenIndex].file_url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh]"
              />
            )}
          </div>

          {/* Title */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 text-white text-center">
            <p className="font-medium">{memories[fullscreenIndex].title || memories[fullscreenIndex].file_name}</p>
            <p className="text-sm text-white/70">{memories[fullscreenIndex].created_date}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export type { GalleryViewMode };
