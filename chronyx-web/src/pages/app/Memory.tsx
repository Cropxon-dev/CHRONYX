import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { 
  Image, 
  Video, 
  Upload, 
  FolderPlus, 
  Grid3X3,
  List,
  Calendar,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Download,
  Filter,
  SortAsc,
  FolderOpen,
  Layers,
  Eye,
  EyeOff,
  Key,
  Clock,
  Camera,
  FileArchive,
  Play,
  GripVertical,
  MapPin,
  ChevronRight,
  Home,
  FolderPlus as FolderPlusIcon
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { MemorySearch } from "@/components/memory/MemorySearch";
import { BulkActions } from "@/components/memory/BulkActions";
import { extractExifData, formatGpsCoords } from "@/components/memory/ExifExtractor";
import { MemoryExport } from "@/components/memory/MemoryExport";
import { MemorySlideshow } from "@/components/memory/MemorySlideshow";
import { FolderCard as _FolderCard } from "@/components/memory/FolderCard";
import { AnimatedFolderCard, FOLDER_COLORS, FOLDER_ICONS } from "@/components/memory/AnimatedFolderCard";
import { CollectionCard } from "@/components/memory/CollectionCard";
import { MemoryMap } from "@/components/memory/MemoryMap";
import { GalleryView, GalleryViewMode } from "@/components/memory/GalleryView";
import { encryptFile } from "@/utils/crypto";

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

type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  is_locked: boolean;
  lock_hash: string | null;
  color?: string;
  icon?: string;
};

// Utility to generate thumbnail from image
const generateImageThumbnail = (file: File, maxSize: number = 300): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');
    
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create thumbnail'));
      }, 'image/jpeg', 0.7);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Utility to generate thumbnail from video
const generateVideoThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadeddata = () => {
      video.currentTime = 1;
    };
    
    video.onseeked = () => {
      canvas.width = Math.min(300, video.videoWidth);
      canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create video thumbnail'));
      }, 'image/jpeg', 0.7);
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
  });
};

// Simple hash function for password
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const Memory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [filterType, setFilterType] = useState<"all" | "photo" | "video">("all");
  const [filterCollection, setFilterCollection] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadToFolderId, setUploadToFolderId] = useState<string | null>(null);
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("bg-accent/30");
  const [newFolderIcon, setNewFolderIcon] = useState("Default");
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Edit memory state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCollection, setEditCollection] = useState<string>("none");
  
  // Folder locking state
  const [lockFolderDialogOpen, setLockFolderDialogOpen] = useState(false);
  const [lockingFolder, setLockingFolder] = useState<Folder | null>(null);
  const [lockPassword, setLockPassword] = useState("");
  const [showLockPassword, setShowLockPassword] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockingFolder, setUnlockingFolder] = useState<Folder | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockedFolders, setUnlockedFolders] = useState<Set<string>>(new Set());

  // Bulk selection state
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<"single" | "collection" | "full">("full");
  const [exportCollectionName, setExportCollectionName] = useState<string>("");

  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowStartIndex, setSlideshowStartIndex] = useState(0);

  // Dragging memory state
  const [draggingMemoryId, setDraggingMemoryId] = useState<string | null>(null);

  // Nested folder navigation state
  const [currentParentFolderId, setCurrentParentFolderId] = useState<string | null>(null);
  const [folderNavigationPath, setFolderNavigationPath] = useState<Folder[]>([]);

  // Fetch memories
  const { data: memories = [], isLoading: memoriesLoading } = useQuery({
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

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ["memory_folders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_folders")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name");
      if (error) throw error;
      return data as (Folder & { sort_order?: number })[];
    },
    enabled: !!user,
  });

  // Get current folder's subfolders
  const currentFolders = useMemo(() => {
    return folders.filter(f => f.parent_folder_id === currentParentFolderId);
  }, [folders, currentParentFolderId]);

  // Get breadcrumb path for current folder
  const getBreadcrumbPath = useCallback((folderId: string | null): Folder[] => {
    if (!folderId) return [];
    const path: Folder[] = [];
    let currentId: string | null = folderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_folder_id;
      } else {
        break;
      }
    }
    return path;
  }, [folders]);

  // Navigate into a folder
  const navigateToFolder = (folderId: string) => {
    setCurrentParentFolderId(folderId);
    setFolderNavigationPath(getBreadcrumbPath(folderId));
  };

  // Navigate to specific folder in breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      setCurrentParentFolderId(null);
      setFolderNavigationPath([]);
    } else {
      const folder = folderNavigationPath[index];
      setCurrentParentFolderId(folder.id);
      setFolderNavigationPath(prev => prev.slice(0, index + 1));
    }
  };

  // Upload memory mutation with EXIF extraction and optional encryption
  const uploadMutation = useMutation({
    mutationFn: async ({ files, title, folderId, password }: { 
      files: File[]; 
      title: string;
      folderId?: string | null;
      password?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      
      // Check if uploading to a locked folder
      const targetFolder = folderId ? folders.find(f => f.id === folderId) : null;
      const shouldEncrypt = targetFolder?.is_locked && password;
      
      const uploadedMemories = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Saving memory ${i + 1} of ${files.length}...`);
        
        // Extract EXIF data for images
        let exifData = { dateTaken: null as Date | null, latitude: null, longitude: null, make: null, model: null };
        if (file.type.startsWith("image/")) {
          setUploadProgress(`Extracting metadata ${i + 1} of ${files.length}...`);
          exifData = await extractExifData(file);
        }
        
        const now = new Date();
        const dateToUse = exifData.dateTaken || now;
        const year = dateToUse.getFullYear();
        const month = String(dateToUse.getMonth() + 1).padStart(2, "0");
        const memoryId = crypto.randomUUID();
        const ext = file.name.split(".").pop();
        const datePart = format(dateToUse, "yyyy-MM-dd");
        const titlePart = title || "memory";
        const baseFileName = `${datePart}_${titlePart.replace(/\s+/g, "_")}_${memoryId.slice(0, 8)}`;
        const fileName = shouldEncrypt ? `${baseFileName}.enc` : `${baseFileName}.${ext}`;
        
        const storagePath = `${user.id}/${year}/${month}/${memoryId}/${fileName}`;
        
        // Encrypt file if uploading to locked folder
        let fileToUpload: Blob = file;
        if (shouldEncrypt && password) {
          setUploadProgress(`Encrypting ${i + 1} of ${files.length}...`);
          const { encryptedBlob } = await encryptFile(file, password);
          fileToUpload = encryptedBlob;
        }
        
        setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
        const { error: uploadError } = await supabase.storage
          .from("memories")
          .upload(storagePath, fileToUpload);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("memories")
          .getPublicUrl(storagePath);
        
        const mediaType = file.type.startsWith("video") ? "video" : "photo";
        
        // Generate thumbnail (only if not encrypting, or create a placeholder)
        let thumbnailUrl = null;
        if (!shouldEncrypt) {
          try {
            setUploadProgress(`Creating thumbnail ${i + 1} of ${files.length}...`);
            const thumbnailBlob = mediaType === "video" 
              ? await generateVideoThumbnail(file)
              : await generateImageThumbnail(file);
            
            const thumbPath = `${user.id}/${year}/${month}/${memoryId}/thumb_${baseFileName}.jpg`;
            
            const { error: thumbError } = await supabase.storage
              .from("memories")
              .upload(thumbPath, thumbnailBlob);
            
            if (!thumbError) {
              const { data: thumbUrlData } = supabase.storage
                .from("memories")
                .getPublicUrl(thumbPath);
              thumbnailUrl = thumbUrlData.publicUrl;
            }
          } catch (e) {
            console.log("Thumbnail generation failed, using original");
          }
        }
        
        // Build description with EXIF info
        let description = "";
        if (exifData.make && exifData.model) {
          description += `📷 ${exifData.make} ${exifData.model}`;
        }
        if (exifData.latitude && exifData.longitude) {
          description += description ? ` • 📍 ${exifData.latitude},${exifData.longitude}` : `📍 ${exifData.latitude},${exifData.longitude}`;
        }
        if (shouldEncrypt) {
          description += description ? " • 🔒 Encrypted" : "🔒 Encrypted";
        }
        
        const insertData: {
          user_id: string;
          title: string | null;
          description: string | null;
          media_type: string;
          file_url: string;
          thumbnail_url: string | null;
          file_name: string;
          file_size: number;
          created_date: string;
          folder_id?: string | null;
          is_locked?: boolean;
        } = {
          user_id: user.id,
          title: title || null,
          description: description || null,
          media_type: mediaType,
          file_url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          file_name: fileName,
          file_size: file.size,
          created_date: datePart,
        };
        
        if (folderId) insertData.folder_id = folderId;
        if (shouldEncrypt) insertData.is_locked = true;
        
        const { error: dbError } = await supabase.from("memories").insert(insertData);
        
        if (dbError) throw dbError;
        
        uploadedMemories.push(memoryId);
      }
      
      return uploadedMemories;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setUploadDialogOpen(false);
      setUploadFiles([]);
      setUploadTitle("");
      setUploadProgress(null);
      setUploadToFolderId(null);
      setEncryptionPassword("");
      toast({ title: "Memories saved" });
    },
    onError: (error) => {
      setUploadProgress(null);
      toast({ title: "Upload failed", description: String(error), variant: "destructive" });
    },
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("memory_collections").insert({
        user_id: user.id,
        name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_collections"] });
      setNewCollectionDialogOpen(false);
      setNewCollectionName("");
      toast({ title: "Collection created" });
    },
  });

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("memory_collections")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_collections"] });
      toast({ title: "Collection updated" });
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memory_collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_collections"] });
      toast({ title: "Collection deleted" });
    },
  });

  // Create folder mutation - supports nested subfolders
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, color, icon, parentFolderId }: { name: string; color: string; icon: string; parentFolderId?: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("memory_folders").insert({
        user_id: user.id,
        name,
        color,
        icon,
        parent_folder_id: parentFolderId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_folders"] });
      setNewFolderDialogOpen(false);
      setNewFolderName("");
      setNewFolderColor("bg-accent/30");
      setNewFolderIcon("Default");
      setCurrentParentFolderId(null);
      toast({ title: "Folder created" });
    },
  });

  // Update folder mutation
  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, color, icon, name }: { id: string; color?: string; icon?: string; name?: string }) => {
      const updateData: Record<string, unknown> = {};
      if (color !== undefined) updateData.color = color;
      if (icon !== undefined) updateData.icon = icon;
      if (name !== undefined) updateData.name = name;

      const { error } = await supabase.from("memory_folders")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_folders"] });
      toast({ title: "Folder updated" });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memory_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_folders"] });
      toast({ title: "Folder deleted" });
    },
  });

  // Reorder folders mutation
  const reorderFoldersMutation = useMutation({
    mutationFn: async (reorderedFolders: (Folder & { sort_order?: number })[]) => {
      const updates = reorderedFolders.map((folder, index) => ({
        id: folder.id,
        sort_order: index,
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from("memory_folders")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_folders"] });
    },
  });

  // Update memory mutation
  const updateMemoryMutation = useMutation({
    mutationFn: async ({ id, title, description, collection_id, folder_id }: { 
      id: string; 
      title: string | null; 
      description: string | null;
      collection_id: string | null;
      folder_id?: string | null;
    }) => {
      const updateData: any = { title, description, collection_id };
      if (folder_id !== undefined) updateData.folder_id = folder_id;
      const { error } = await supabase.from("memories").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setEditDialogOpen(false);
      setSelectedMemory(null);
      toast({ title: "Memory updated" });
    },
  });

  // Bulk update collection mutation
  const bulkUpdateCollectionMutation = useMutation({
    mutationFn: async ({ ids, collection_id }: { ids: string[]; collection_id: string | null }) => {
      const { error } = await supabase.from("memories")
        .update({ collection_id })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setSelectedMemories(new Set());
      setIsSelectionMode(false);
      toast({ title: "Memories updated" });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("memories")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setSelectedMemories(new Set());
      setIsSelectionMode(false);
      toast({ title: "Memories deleted" });
    },
  });

  // Lock folder mutation
  const lockFolderMutation = useMutation({
    mutationFn: async ({ folderId, password }: { folderId: string; password: string }) => {
      const hash = await hashPassword(password);
      const { error } = await supabase.from("memory_folders")
        .update({ is_locked: true, lock_hash: hash })
        .eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory_folders"] });
      setLockFolderDialogOpen(false);
      setLockingFolder(null);
      setLockPassword("");
      toast({ title: "Folder locked" });
    },
  });

  // Unlock folder mutation
  const unlockFolderMutation = useMutation({
    mutationFn: async ({ folderId, password }: { folderId: string; password: string }) => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder?.lock_hash) throw new Error("Folder not locked");
      
      const hash = await hashPassword(password);
      if (hash !== folder.lock_hash) {
        throw new Error("Incorrect password");
      }
      
      return folderId;
    },
    onSuccess: (folderId) => {
      setUnlockedFolders(prev => new Set([...prev, folderId]));
      setUnlockDialogOpen(false);
      setUnlockingFolder(null);
      setUnlockPassword("");
      toast({ title: "Folder unlocked" });
    },
    onError: (error) => {
      toast({ title: "Unlock failed", description: String(error), variant: "destructive" });
    },
  });

  // Delete memory mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setSelectedMemory(null);
      toast({ title: "Memory deleted" });
    },
  });

  // Handle file drop on page
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Check if it's a memory being dragged
    if (draggingMemoryId) {
      return;
    }
    
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (files.length > 0) {
      setUploadFiles(files);
      setUploadDialogOpen(true);
    }
  }, [draggingMemoryId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingMemoryId) {
      setIsDragOver(true);
    }
  }, [draggingMemoryId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Memory drag handlers
  const handleMemoryDragStart = (e: React.DragEvent, memoryId: string) => {
    setDraggingMemoryId(memoryId);
    e.dataTransfer.setData("memoryId", memoryId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleMemoryDragEnd = () => {
    setDraggingMemoryId(null);
  };

  // Handle drop on folder
  const handleFolderDrop = (folderId: string, e: React.DragEvent) => {
    e.preventDefault();
    const memoryId = e.dataTransfer.getData("memoryId");
    if (memoryId) {
      updateMemoryMutation.mutate({
        id: memoryId,
        title: memories.find(m => m.id === memoryId)?.title || null,
        description: memories.find(m => m.id === memoryId)?.description || null,
        collection_id: memories.find(m => m.id === memoryId)?.collection_id || null,
        folder_id: folderId,
      });
      toast({ title: "Memory moved to folder" });
    }
    setDraggingMemoryId(null);
  };

  // Open edit dialog
  const openEditDialog = (memory: Memory) => {
    setEditTitle(memory.title || "");
    setEditDescription(memory.description || "");
    setEditCollection(memory.collection_id || "none");
    setEditDialogOpen(true);
  };

  // Toggle memory selection
  const toggleMemorySelection = (id: string) => {
    setSelectedMemories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Open slideshow
  const openSlideshow = (startIndex: number) => {
    setSlideshowStartIndex(startIndex);
    setSlideshowOpen(true);
  };

  // Filter and sort memories with search
  const filteredMemories = useMemo(() => {
    return memories
      .filter((m) => {
        if (filterType !== "all" && m.media_type !== filterType) return false;
        if (filterCollection !== "all" && m.collection_id !== filterCollection) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const titleMatch = m.title?.toLowerCase().includes(query);
          const descMatch = m.description?.toLowerCase().includes(query);
          const fileMatch = m.file_name.toLowerCase().includes(query);
          if (!titleMatch && !descMatch && !fileMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        }
        return (a.title || a.file_name).localeCompare(b.title || b.file_name);
      });
  }, [memories, filterType, filterCollection, sortBy, searchQuery]);

  const stats = {
    total: memories.length,
    photos: memories.filter((m) => m.media_type === "photo").length,
    videos: memories.filter((m) => m.media_type === "video").length,
    collections: collections.length,
  };

  return (
    <div 
      className={`space-y-4 sm:space-y-6 transition-all duration-200 ${isDragOver ? 'ring-2 ring-primary ring-offset-4 rounded-lg' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-light tracking-wide text-foreground">Memory</h1>
          <p className="text-sm text-muted-foreground mt-1">Your private archive</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/memory/timeline">
              <Clock className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Timeline</span>
            </Link>
          </Button>
          {filteredMemories.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => openSlideshow(0)}>
              <Play className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Slideshow</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setExportType("full");
              setExportDialogOpen(true);
            }}
          >
            <FileArchive className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Backup</span>
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Save Memory</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {uploadFiles.length === 0 ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Choose files or drag here</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                ) : (
                  <div className="p-4 bg-accent/30 rounded-lg">
                    <p className="text-sm font-medium">{uploadFiles.length} file(s) selected</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {uploadFiles.map((f) => f.name).join(", ")}
                    </p>
                  </div>
                )}
                <Input
                  placeholder="Title (optional)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
                
                {/* Folder Selection */}
                {folders.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Upload to folder (optional)</label>
                    <Select 
                      value={uploadToFolderId || "none"} 
                      onValueChange={(v) => setUploadToFolderId(v === "none" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.is_locked ? "🔒 " : ""}{f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Encryption Password for Locked Folders */}
                {uploadToFolderId && folders.find(f => f.id === uploadToFolderId)?.is_locked && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Locked Folder - Files will be encrypted
                    </p>
                    <Input
                      type="password"
                      placeholder="Enter folder password to encrypt"
                      value={encryptionPassword}
                      onChange={(e) => setEncryptionPassword(e.target.value)}
                    />
                    <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                      You'll need this password to view these files later
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Camera className="w-3 h-3" />
                  Dates and location will be extracted from photo metadata
                </p>
                {uploadProgress && (
                  <p className="text-sm text-muted-foreground text-center">{uploadProgress}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => uploadMutation.mutate({ 
                    files: uploadFiles, 
                    title: uploadTitle,
                    folderId: uploadToFolderId,
                    password: encryptionPassword || undefined,
                  })}
                  disabled={
                    uploadFiles.length === 0 || 
                    uploadMutation.isPending ||
                    (uploadToFolderId && folders.find(f => f.id === uploadToFolderId)?.is_locked && !encryptionPassword)
                  }
                >
                  {uploadMutation.isPending ? "Saving..." : "Save Memory"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={newCollectionDialogOpen} onOpenChange={setNewCollectionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Layers className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Collection</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={() => createCollectionMutation.mutate(newCollectionName)}
                  disabled={!newCollectionName.trim()}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderPlus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Folder</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Folder Name</label>
                  <Input
                    placeholder="Enter folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                </div>
                
                {/* Icon Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Icon</label>
                  <div className="grid grid-cols-5 gap-2">
                    {FOLDER_ICONS.map((iconItem) => {
                      const IconComp = iconItem.icon;
                      return (
                        <button
                          key={iconItem.name}
                          type="button"
                          onClick={() => setNewFolderIcon(iconItem.name)}
                          className={`h-10 flex items-center justify-center rounded-lg bg-accent/30 transition-all hover:bg-accent/50 ${
                            newFolderIcon === iconItem.name ? 'ring-2 ring-primary ring-offset-2' : ''
                          }`}
                          title={iconItem.name}
                        >
                          <IconComp className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Color Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setNewFolderColor(color.value)}
                        className={`h-8 rounded-lg ${color.value} transition-all hover:scale-105 ${
                          newFolderColor === color.value ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Preview */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Preview</label>
                  <div className={`p-3 rounded-lg border ${newFolderColor}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center">
                        {(() => {
                          const PreviewIcon = FOLDER_ICONS.find(i => i.name === newFolderIcon)?.icon || FolderOpen;
                          const colorClass = FOLDER_COLORS.find(c => c.value === newFolderColor);
                          return <PreviewIcon className={`w-4 h-4 ${colorClass?.textColor || 'text-muted-foreground'}`} />;
                        })()}
                      </div>
                      <span className="text-sm font-medium">{newFolderName || "Folder Name"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createFolderMutation.mutate({ 
                    name: newFolderName, 
                    color: newFolderColor, 
                    icon: newFolderIcon 
                  })}
                  disabled={!newFolderName.trim() || createFolderMutation.isPending}
                >
                  Create Folder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <div>
                <p className="text-xl sm:text-2xl font-light">{stats.photos}</p>
                <p className="text-xs text-muted-foreground">Photos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <div>
                <p className="text-xl sm:text-2xl font-light">{stats.videos}</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <div>
                <p className="text-xl sm:text-2xl font-light">{stats.collections}</p>
                <p className="text-xs text-muted-foreground">Collections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <div>
                <p className="text-xl sm:text-2xl font-light">{folders.length}</p>
                <p className="text-xs text-muted-foreground">Folders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breadcrumb Navigation */}
      {currentParentFolderId && (
        <div className="flex items-center gap-2 text-sm">
          <button 
            onClick={() => navigateToBreadcrumb(-1)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Memory</span>
          </button>
          {folderNavigationPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`hover:text-foreground transition-colors ${
                  index === folderNavigationPath.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Folders Section - Interactive with drag/drop */}
      {(currentFolders.length > 0 || currentParentFolderId) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {currentParentFolderId ? 'Subfolders' : 'Folders'} {draggingMemoryId && <span className="text-primary">(Drop memory here)</span>}
            </h3>
            {currentParentFolderId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewFolderDialogOpen(true);
                }}
              >
                <FolderPlusIcon className="w-4 h-4 mr-2" />
                Create Subfolder
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {currentFolders.map((folder, index) => {
              const isUnlocked = unlockedFolders.has(folder.id);
              const hasSubfolders = folders.some(f => f.parent_folder_id === folder.id);
              return (
                <div
                  key={folder.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("folder-id", folder.id);
                    e.dataTransfer.setData("folder-index", String(index));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedFolderId = e.dataTransfer.getData("folder-id");
                    const draggedIndex = parseInt(e.dataTransfer.getData("folder-index"));
                    
                    // If dropping a memory into folder
                    if (draggingMemoryId) {
                      handleFolderDrop(folder.id, e);
                      return;
                    }
                    
                    // If reordering folders
                    if (draggedFolderId && draggedIndex !== index) {
                      const newFolders = [...currentFolders];
                      const [removed] = newFolders.splice(draggedIndex, 1);
                      newFolders.splice(index, 0, removed);
                      reorderFoldersMutation.mutate(newFolders);
                    }
                  }}
                  onDoubleClick={() => navigateToFolder(folder.id)}
                  className="cursor-grab active:cursor-grabbing"
                  title={hasSubfolders ? "Double-click to open" : undefined}
                >
                  <AnimatedFolderCard
                    folder={folder}
                    isUnlocked={isUnlocked}
                    isOpen={isUnlocked}
                    onLock={() => {
                      setLockingFolder(folder);
                      setLockFolderDialogOpen(true);
                    }}
                    onUnlock={() => {
                      setUnlockingFolder(folder);
                      setUnlockDialogOpen(true);
                    }}
                    onRelock={() => {
                      setUnlockedFolders((prev) => {
                        const next = new Set(prev);
                        next.delete(folder.id);
                        return next;
                      });
                    }}
                    onUpdate={(updates) => updateFolderMutation.mutate({ id: folder.id, ...updates })}
                    onDelete={() => deleteFolderMutation.mutate(folder.id)}
                    onClick={() => navigateToFolder(folder.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
          <MemorySearch value={searchQuery} onChange={setSearchQuery} />
        </div>
        <Select value={filterType} onValueChange={(v: "all" | "photo" | "video") => setFilterType(v)}>
          <SelectTrigger className="w-[100px] sm:w-32">
            <Filter className="w-4 h-4 mr-2 hidden sm:block" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="photo">Photos</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCollection} onValueChange={setFilterCollection}>
          <SelectTrigger className="w-[120px] sm:w-40">
            <Layers className="w-4 h-4 mr-2 hidden sm:block" />
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {collections.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: "date" | "name") => setSortBy(v)}>
          <SelectTrigger className="w-[100px] sm:w-32">
            <SortAsc className="w-4 h-4 mr-2 hidden sm:block" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 hidden sm:block" />
        <Button
          variant={isSelectionMode ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            if (isSelectionMode) setSelectedMemories(new Set());
          }}
        >
          {isSelectionMode ? "Cancel" : "Select"}
        </Button>
        <div className="flex items-center gap-1 border border-border rounded-md p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "map" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("map")}
            title="Map view"
          >
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Collections Section */}
      {collections.length > 0 && viewMode !== "map" && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Collections
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                memoryCount={memories.filter(m => m.collection_id === collection.id).length}
                onUpdate={(name) => updateCollectionMutation.mutate({ id: collection.id, name })}
                onDelete={() => deleteCollectionMutation.mutate(collection.id)}
                onClick={() => setFilterCollection(collection.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Memory Grid/List/Map */}
      {memoriesLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading memories...</div>
      ) : viewMode === "map" ? (
        <MemoryMap
          memories={filteredMemories.map(m => ({
            id: m.id,
            title: m.title,
            thumbnail_url: m.thumbnail_url,
            file_url: m.file_url,
            latitude: m.description?.match(/📍\s*([-\d.]+),\s*([-\d.]+)/)?.[1] ? parseFloat(m.description.match(/📍\s*([-\d.]+),\s*([-\d.]+)/)?.[1] || "0") : 0,
            longitude: m.description?.match(/📍\s*([-\d.]+),\s*([-\d.]+)/)?.[2] ? parseFloat(m.description.match(/📍\s*([-\d.]+),\s*([-\d.]+)/)?.[2] || "0") : 0,
            created_date: m.created_date,
          })).filter(m => m.latitude !== 0 && m.longitude !== 0)}
          onSelectMemory={(id) => {
            const memory = memories.find(m => m.id === id);
            if (memory) setSelectedMemory(memory);
          }}
        />
      ) : filteredMemories.length === 0 ? (
        <Card className="bg-card/30 border-dashed">
          <CardContent className="py-8 sm:py-12 text-center">
            <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "No memories match your search" : "No memories yet"}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {searchQuery ? "Try a different search term" : "Drag and drop photos or videos here"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {filteredMemories.map((memory, index) => {
            const isSelected = selectedMemories.has(memory.id);
            return (
              <div
                key={memory.id}
                draggable={!isSelectionMode}
                onDragStart={(e) => handleMemoryDragStart(e, memory.id)}
                onDragEnd={handleMemoryDragEnd}
                className={`group relative aspect-square bg-accent/20 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary" : "hover:ring-2 ring-primary/20"
                } ${draggingMemoryId === memory.id ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleMemorySelection(memory.id);
                  } else {
                    setSelectedMemory(memory);
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
                      onCheckedChange={() => toggleMemorySelection(memory.id)}
                    />
                  </div>
                )}
                {memory.media_type === "photo" ? (
                  <img
                    src={memory.thumbnail_url || memory.file_url}
                    alt={memory.title || memory.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  memory.thumbnail_url ? (
                    <img
                      src={memory.thumbnail_url}
                      alt={memory.title || memory.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/40">
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
                {/* Slideshow button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSlideshow(index);
                  }}
                >
                  <Play className="w-3 h-3 text-white" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMemories.map((memory, index) => {
            const isSelected = selectedMemories.has(memory.id);
            return (
              <Card
                key={memory.id}
                draggable={!isSelectionMode}
                onDragStart={(e) => handleMemoryDragStart(e, memory.id)}
                onDragEnd={handleMemoryDragEnd}
                className={`cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary" : "hover:bg-accent/30"
                } ${draggingMemoryId === memory.id ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleMemorySelection(memory.id);
                  } else {
                    setSelectedMemory(memory);
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
                      onCheckedChange={() => toggleMemorySelection(memory.id)}
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
                      openSlideshow(index);
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

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedMemories.size}
        collections={collections}
        onMoveToCollection={(collectionId) => {
          bulkUpdateCollectionMutation.mutate({
            ids: Array.from(selectedMemories),
            collection_id: collectionId === "none" ? null : collectionId,
          });
        }}
        onDelete={() => {
          bulkDeleteMutation.mutate(Array.from(selectedMemories));
        }}
        onClearSelection={() => {
          setSelectedMemories(new Set());
          setIsSelectionMode(false);
        }}
        isDeleting={bulkDeleteMutation.isPending}
        isMoving={bulkUpdateCollectionMutation.isPending}
      />

      {/* Memory Detail Dialog */}
      <Dialog open={!!selectedMemory && !editDialogOpen} onOpenChange={() => setSelectedMemory(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedMemory && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{selectedMemory.title || selectedMemory.file_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedMemory.media_type === "photo" ? (
                  <img
                    src={selectedMemory.file_url}
                    alt=""
                    className="w-full max-h-[50vh] object-contain rounded-lg bg-accent/10"
                  />
                ) : (
                  <video
                    src={selectedMemory.file_url}
                    controls
                    className="w-full max-h-[50vh] rounded-lg bg-accent/10"
                  />
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedMemory.created_date), "MMMM d, yyyy")}
                </div>
                {selectedMemory.description && (
                  <p className="text-sm">{selectedMemory.description}</p>
                )}
                {selectedMemory.collection_id && (
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {collections.find(c => c.id === selectedMemory.collection_id)?.name || "Collection"}
                    </span>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(selectedMemory)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={selectedMemory.file_url} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(selectedMemory.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Memory Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Memory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Memory title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Add a description..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Collection</label>
              <Select value={editCollection} onValueChange={setEditCollection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Collection</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedMemory) {
                  updateMemoryMutation.mutate({
                    id: selectedMemory.id,
                    title: editTitle || null,
                    description: editDescription || null,
                    collection_id: editCollection === "none" ? null : editCollection,
                  });
                }
              }}
              disabled={updateMemoryMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Folder Dialog */}
      <Dialog open={lockFolderDialogOpen} onOpenChange={setLockFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock Folder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set a password to protect "{lockingFolder?.name}". Contents will be hidden until unlocked.
          </p>
          <div className="relative">
            <Input
              type={showLockPassword ? "text" : "password"}
              placeholder="Enter password"
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setShowLockPassword(!showLockPassword)}
            >
              {showLockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ If you forget this password, the folder contents cannot be recovered.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockFolderDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (lockingFolder && lockPassword) {
                  lockFolderMutation.mutate({ folderId: lockingFolder.id, password: lockPassword });
                }
              }}
              disabled={!lockPassword || lockFolderMutation.isPending}
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Folder Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Folder</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter the password to unlock "{unlockingFolder?.name}".
          </p>
          <Input
            type="password"
            placeholder="Enter password"
            value={unlockPassword}
            onChange={(e) => setUnlockPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && unlockingFolder && unlockPassword) {
                unlockFolderMutation.mutate({ folderId: unlockingFolder.id, password: unlockPassword });
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (unlockingFolder && unlockPassword) {
                  unlockFolderMutation.mutate({ folderId: unlockingFolder.id, password: unlockPassword });
                }
              }}
              disabled={!unlockPassword || unlockFolderMutation.isPending}
            >
              <Unlock className="w-4 h-4 mr-2" />
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <MemoryExport
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        memories={memories}
        collections={collections}
        exportType={exportType}
        collectionName={exportCollectionName}
        memory={selectedMemory || undefined}
      />

      {/* Slideshow */}
      <MemorySlideshow
        open={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        memories={filteredMemories}
        startIndex={slideshowStartIndex}
      />
    </div>
  );
};

export default Memory;
