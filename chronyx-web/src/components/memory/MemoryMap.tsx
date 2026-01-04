import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MapPin, Image, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MemoryLocation {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  file_url: string;
  latitude: number;
  longitude: number;
  created_date: string;
}

interface MemoryMapProps {
  memories: MemoryLocation[];
  onSelectMemory?: (memoryId: string) => void;
}

export const MemoryMap = ({ memories, onSelectMemory }: MemoryMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState(() => 
    localStorage.getItem("mapbox_token") || ""
  );
  const [tokenInput, setTokenInput] = useState(mapboxToken);
  const [showTokenDialog, setShowTokenDialog] = useState(!mapboxToken);
  const [selectedMemory, setSelectedMemory] = useState<MemoryLocation | null>(null);

  const memoriesWithLocation = memories.filter(m => m.latitude && m.longitude);

  const saveToken = () => {
    localStorage.setItem("mapbox_token", tokenInput);
    setMapboxToken(tokenInput);
    setShowTokenDialog(false);
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || memoriesWithLocation.length === 0) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      // Calculate bounds
      const bounds = new mapboxgl.LngLatBounds();
      memoriesWithLocation.forEach(m => {
        bounds.extend([m.longitude, m.latitude]);
      });

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        bounds: memoriesWithLocation.length > 1 ? bounds : undefined,
        center: memoriesWithLocation.length === 1 
          ? [memoriesWithLocation[0].longitude, memoriesWithLocation[0].latitude]
          : undefined,
        zoom: memoriesWithLocation.length === 1 ? 10 : undefined,
        fitBoundsOptions: { padding: 50 },
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add markers
      memoriesWithLocation.forEach(memory => {
        const el = document.createElement("div");
        el.className = "memory-marker";
        el.style.width = "48px";
        el.style.height = "48px";
        el.style.borderRadius = "50%";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.style.backgroundImage = `url(${memory.thumbnail_url || memory.file_url})`;
        el.style.transition = "transform 0.2s";
        
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.2)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });
        el.addEventListener("click", () => {
          setSelectedMemory(memory);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([memory.longitude, memory.latitude])
          .addTo(map.current!);
        
        markersRef.current.push(marker);
      });
    } catch (error) {
      console.error("Map initialization failed:", error);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [mapboxToken, memoriesWithLocation]);

  if (memoriesWithLocation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-accent/20 rounded-lg">
        <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No memories with location data</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Upload photos with GPS metadata to see them on the map
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Token Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Mapbox Token</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            To view the memory map, enter your Mapbox public token. Get one free at{" "}
            <a 
              href="https://mapbox.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
          <Input
            placeholder="pk.ey..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <Button onClick={saveToken} disabled={!tokenInput.trim()}>
            Save Token
          </Button>
        </DialogContent>
      </Dialog>

      {/* Map Container */}
      {mapboxToken ? (
        <div ref={mapContainer} className="h-[500px] rounded-lg overflow-hidden" />
      ) : (
        <div className="h-96 bg-accent/20 rounded-lg flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Mapbox token required</p>
          <Button onClick={() => setShowTokenDialog(true)}>
            Enter Token
          </Button>
        </div>
      )}

      {/* Change Token Button */}
      {mapboxToken && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 left-2"
          onClick={() => setShowTokenDialog(true)}
        >
          Change Token
        </Button>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4" />
          <span>{memoriesWithLocation.length} memories with location</span>
        </div>
      </div>

      {/* Selected Memory Preview */}
      {selectedMemory && (
        <div className="absolute bottom-4 left-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg">
          <button 
            className="absolute top-2 right-2"
            onClick={() => setSelectedMemory(null)}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <img 
              src={selectedMemory.thumbnail_url || selectedMemory.file_url}
              alt=""
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedMemory.title || "Untitled"}</p>
              <p className="text-sm text-muted-foreground">{selectedMemory.created_date}</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                onSelectMemory?.(selectedMemory.id);
                setSelectedMemory(null);
              }}
            >
              View
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
