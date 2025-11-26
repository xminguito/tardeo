import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Folder, 
  FolderOpen,
  Image, 
  File, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw,
  X,
  ChevronLeft,
  Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

interface Bucket {
  id: string;
  name: string;
  public: boolean;
}

export default function FileManager() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      loadFiles(selectedBucket, currentPath);
    }
  }, [selectedBucket, currentPath]);

  const loadBuckets = async () => {
    try {
      setLoading(true);
      
      // List of known buckets - listBuckets() requires admin privileges
      const knownBuckets: Bucket[] = [
        { id: "hero-banners", name: "hero-banners", public: true },
        { id: "profile-images", name: "profile-images", public: true },
        { id: "chat-attachments", name: "chat-attachments", public: true },
        { id: "activity-images", name: "activity-images", public: true },
      ];
      
      // Verify which buckets actually exist by trying to list files
      const verifiedBuckets: Bucket[] = [];
      
      for (const bucket of knownBuckets) {
        try {
          const { error } = await supabase.storage
            .from(bucket.id)
            .list("", { limit: 1 });
          
          if (!error) {
            verifiedBuckets.push(bucket);
          }
        } catch {
          // Bucket doesn't exist or no access
        }
      }
      
      setBuckets(verifiedBuckets);
      
      // Auto-select first bucket
      if (verifiedBuckets.length > 0 && !selectedBucket) {
        setSelectedBucket(verifiedBuckets[0].id);
      }
      
      if (verifiedBuckets.length === 0) {
        toast({
          title: "No buckets found",
          description: "No accessible storage buckets were found",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading buckets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (bucketId: string, path: string = "") => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from(bucketId)
        .list(path, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      setFiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading files",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBucket || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    try {
      setUploading(true);
      const fileName = `${Date.now()}_${file.name}`;
      const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      
      const { error } = await supabase.storage
        .from(selectedBucket)
        .upload(fullPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
      });

      // Reload files
      loadFiles(selectedBucket, currentPath);
    } catch (error: any) {
      toast({
        title: "Upload error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!selectedBucket) return;

    const fullPath = getFullPath(fileName);
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      const { error } = await supabase.storage
        .from(selectedBucket)
        .remove([fullPath]);

      if (error) throw error;

      toast({
        title: "File deleted",
        description: `${fileName} deleted successfully`,
      });

      loadFiles(selectedBucket, currentPath);
    } catch (error: any) {
      toast({
        title: "Delete error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!selectedBucket) return;

    const fullPath = getFullPath(fileName);

    try {
      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .download(fullPath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePreview = (fileName: string) => {
    if (!selectedBucket) return;

    const fullPath = getFullPath(fileName);

    const { data } = supabase.storage
      .from(selectedBucket)
      .getPublicUrl(fullPath);

    setPreviewFile({ url: data.publicUrl, name: fileName });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const isImage = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  };

  const isFolder = (file: StorageFile) => {
    // Folders have no metadata or size is null/undefined
    return !file.metadata?.size && file.metadata?.size !== 0;
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const getFullPath = (fileName: string) => {
    return currentPath ? `${currentPath}/${fileName}` : fileName;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-muted-foreground">Manage Supabase Storage files</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => selectedBucket && loadFiles(selectedBucket)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Buckets Sidebar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Storage Buckets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {buckets.map((bucket) => (
              <Button
                key={bucket.id}
                variant={selectedBucket === bucket.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedBucket(bucket.id);
                  setCurrentPath("");
                }}
              >
                <Folder className="mr-2 h-4 w-4" />
                {bucket.name}
                {bucket.public && (
                  <span className="ml-auto text-xs text-muted-foreground">Public</span>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Files Area */}
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentPath && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigateUp}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <CardTitle className="text-sm">
                  {selectedBucket 
                    ? currentPath 
                      ? `${selectedBucket}/${currentPath}` 
                      : `Files in ${selectedBucket}`
                    : "Select a bucket"}
                </CardTitle>
              </div>
              {selectedBucket && (
                <div className="flex gap-2">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="max-w-xs"
                    id="file-upload"
                    style={{ display: "none" }}
                  />
                  <Button
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload File"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading files...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No files in this bucket
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 gap-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                        isFolder(file) ? "cursor-pointer" : ""
                      }`}
                      onClick={() => isFolder(file) && navigateToFolder(file.name)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isFolder(file) ? (
                          <FolderOpen className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        ) : isImage(file.name) ? (
                          <Image className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isFolder(file) 
                              ? "Folder" 
                              : `${formatFileSize(file.metadata?.size || 0)} • ${new Date(file.created_at).toLocaleDateString()}`
                            }
                          </p>
                        </div>
                      </div>
                      {!isFolder(file) && (
                        <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isImage(file.name) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(file.name)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(file.name)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(file.name)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{previewFile?.name}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {previewFile && (
            <div className="flex items-center justify-center p-4">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
