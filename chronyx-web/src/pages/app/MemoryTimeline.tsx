import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Image, 
  Video, 
  ArrowLeft,
  Lock,
  Download,
  Filter
} from "lucide-react";
import { format, parseISO, getYear, getMonth } from "date-fns";
import { Link } from "react-router-dom";

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
  is_locked: boolean;
};

type Collection = {
  id: string;
  name: string;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MemoryTimeline = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [filterMediaType, setFilterMediaType] = useState<"all" | "photo" | "video">("all");
  const [filterCollection, setFilterCollection] = useState<string>("all");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Fetch memories
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .order("created_date", { ascending: false });
      if (error) throw error;
      return data as Memory[];
    },
    enabled: !!user,
  });

  // Fetch collections
  const { data: collections = [] } = useQuery({
    queryKey: ["memory_collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_collections")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Collection[];
    },
    enabled: !!user,
  });

  // Filter memories
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (filterMediaType !== "all" && m.media_type !== filterMediaType) return false;
      if (filterCollection !== "all" && m.collection_id !== filterCollection) return false;
      return true;
    });
  }, [memories, filterMediaType, filterCollection]);

  // Organize memories by year > month > day
  const timelineData = useMemo(() => {
    const years: Record<number, Record<number, Record<number, Memory[]>>> = {};
    
    filteredMemories.forEach((memory) => {
      const date = parseISO(memory.created_date);
      const year = getYear(date);
      const month = getMonth(date);
      const day = date.getDate();
      
      if (!years[year]) years[year] = {};
      if (!years[year][month]) years[year][month] = {};
      if (!years[year][month][day]) years[year][month][day] = [];
      
      years[year][month][day].push(memory);
    });
    
    return years;
  }, [filteredMemories]);

  const availableYears = Object.keys(timelineData).map(Number).sort((a, b) => b - a);
  const currentViewYear = selectedYear || availableYears[0];

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading timeline...</p>
      </div>
    );
  }

  const yearData = currentViewYear ? timelineData[currentViewYear] : {};
  const sortedMonths = yearData ? Object.keys(yearData).map(Number).sort((a, b) => b - a) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/memory">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-light tracking-wide text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground mt-1">Memories through time</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select 
          value={currentViewYear?.toString() || ""} 
          onValueChange={(v) => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-32">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMediaType} onValueChange={(v: "all" | "photo" | "video") => setFilterMediaType(v)}>
          <SelectTrigger className="w-32">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="photo">Photos</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCollection} onValueChange={setFilterCollection}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            {collections.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <Badge variant="secondary">{filteredMemories.length} memories</Badge>
      </div>

      {/* Timeline */}
      {availableYears.length === 0 ? (
        <Card className="bg-card/30 border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No memories yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Year Header */}
          <div className="flex items-center gap-3 py-2">
            <span className="text-4xl font-light text-foreground">{currentViewYear}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Months */}
          {sortedMonths.map((month) => {
            const monthKey = `${currentViewYear}-${month}`;
            const isMonthExpanded = expandedMonths.has(monthKey);
            const monthData = yearData[month];
            const sortedDays = Object.keys(monthData).map(Number).sort((a, b) => b - a);
            const monthMemoryCount = Object.values(monthData).flat().length;

            return (
              <Card key={monthKey} className="bg-card/50 overflow-hidden">
                <button
                  className="w-full p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors"
                  onClick={() => toggleMonth(monthKey)}
                >
                  {isMonthExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-lg font-medium">{monthNames[month]}</span>
                  <Badge variant="outline" className="ml-auto">
                    {monthMemoryCount} {monthMemoryCount === 1 ? "memory" : "memories"}
                  </Badge>
                </button>

                {isMonthExpanded && (
                  <div className="border-t border-border">
                    {sortedDays.map((day) => {
                      const dayKey = `${monthKey}-${day}`;
                      const isDayExpanded = expandedDays.has(dayKey);
                      const dayMemories = monthData[day];

                      return (
                        <div key={dayKey} className="border-b border-border last:border-b-0">
                          <button
                            className="w-full px-6 py-3 flex items-center gap-3 hover:bg-accent/20 transition-colors"
                            onClick={() => toggleDay(dayKey)}
                          >
                            {isDayExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{day}</span>
                            <span className="text-sm text-muted-foreground">
                              — {dayMemories.length} {dayMemories.length === 1 ? "memory" : "memories"}
                            </span>
                          </button>

                          {isDayExpanded && (
                            <div className="px-6 pb-4">
                              <div className="flex gap-2 overflow-x-auto py-2">
                                {dayMemories.map((memory) => (
                                  <div
                                    key={memory.id}
                                    className="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden cursor-pointer hover:ring-2 ring-primary/30 transition-all group"
                                    onClick={() => setSelectedMemory(memory)}
                                  >
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
                                      <div className="w-full h-full bg-accent/40 flex items-center justify-center">
                                        <Video className="w-6 h-6 text-muted-foreground" />
                                      </div>
                                    )}
                                    {memory.media_type === "video" && memory.thumbnail_url && (
                                      <Video className="absolute top-1 left-1 w-3 h-3 text-white drop-shadow" />
                                    )}
                                    {memory.is_locked && (
                                      <Lock className="absolute top-1 right-1 w-3 h-3 text-white drop-shadow" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Memory Detail Dialog */}
      <Dialog open={!!selectedMemory} onOpenChange={() => setSelectedMemory(null)}>
        <DialogContent className="max-w-3xl">
          {selectedMemory && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMemory.title || selectedMemory.file_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedMemory.media_type === "photo" ? (
                  <img
                    src={selectedMemory.file_url}
                    alt=""
                    className="w-full max-h-[60vh] object-contain rounded-lg bg-accent/10"
                  />
                ) : (
                  <video
                    src={selectedMemory.file_url}
                    controls
                    className="w-full max-h-[60vh] rounded-lg bg-accent/10"
                  />
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(selectedMemory.created_date), "MMMM d, yyyy")}
                </div>
                {selectedMemory.description && (
                  <p className="text-sm">{selectedMemory.description}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" asChild>
                  <a href={selectedMemory.file_url} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemoryTimeline;
