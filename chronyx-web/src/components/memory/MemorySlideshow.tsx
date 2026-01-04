import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Play, 
  Pause,
  Maximize2,
  Download
} from "lucide-react";

type Memory = {
  id: string;
  title: string | null;
  file_url: string;
  thumbnail_url: string | null;
  media_type: "photo" | "video";
  file_name: string;
  created_date: string;
};

interface MemorySlideshowProps {
  open: boolean;
  onClose: () => void;
  memories: Memory[];
  startIndex?: number;
}

export const MemorySlideshow = ({ open, onClose, memories, startIndex = 0 }: MemorySlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentMemory = memories[currentIndex];

  const goToNext = useCallback(() => {
    if (memories.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % memories.length);
      setIsTransitioning(false);
    }, 300);
  }, [memories.length]);

  const goToPrev = useCallback(() => {
    if (memories.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + memories.length) % memories.length);
      setIsTransitioning(false);
    }, 300);
  }, [memories.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !open) return;
    
    const interval = setInterval(() => {
      goToNext();
    }, 5000); // 5 seconds per slide

    return () => clearInterval(interval);
  }, [isPlaying, open, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "Escape":
          onClose();
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goToNext, goToPrev, onClose]);

  // Reset index when startIndex changes
  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  if (!currentMemory) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Controls */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
              asChild
            >
              <a href={currentMemory.file_url} download>
                <Download className="w-5 h-5" />
              </a>
            </Button>
          </div>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-white/60 text-sm font-medium">
            {currentIndex + 1} / {memories.length}
          </div>

          {/* Navigation arrows */}
          {memories.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 text-white/70 hover:text-white hover:bg-white/10 h-12 w-12"
                onClick={goToPrev}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 text-white/70 hover:text-white hover:bg-white/10 h-12 w-12"
                onClick={goToNext}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          {/* Media content with transition */}
          <div 
            className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
          >
            {currentMemory.media_type === "photo" ? (
              <img
                src={currentMemory.file_url}
                alt={currentMemory.title || currentMemory.file_name}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={currentMemory.file_url}
                controls
                autoPlay={isPlaying}
                className="max-w-[90vw] max-h-[90vh] rounded-lg"
              />
            )}
          </div>

          {/* Caption */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-center">
            {currentMemory.title && (
              <p className="text-white font-medium text-lg mb-1">{currentMemory.title}</p>
            )}
            <p className="text-white/50 text-sm">{currentMemory.created_date}</p>
          </div>

          {/* Thumbnail strip */}
          {memories.length > 1 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 flex gap-2 max-w-[80vw] overflow-x-auto p-2">
              {memories.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((memory, idx) => {
                const actualIdx = Math.max(0, currentIndex - 3) + idx;
                return (
                  <button
                    key={memory.id}
                    onClick={() => setCurrentIndex(actualIdx)}
                    className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden transition-all ${
                      actualIdx === currentIndex ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={memory.thumbnail_url || memory.file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
