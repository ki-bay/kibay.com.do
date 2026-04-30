import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ImageUploadField = ({ value, onChange, className }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const { toast } = useToast();

  const handleFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, WEBP, GIF).",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image size must be less than 5MB.",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('blog_images')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
      toast({
        title: "Success",
        description: "Image uploaded successfully.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Could not upload image.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center",
          dragActive ? "border-mango-500 bg-mango-500/10" : "border-foreground/10 bg-background/50 hover:border-foreground/20",
          value ? "h-auto" : "h-48"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-mango-500 animate-spin mb-2" />
            <p className="text-foreground/60 text-sm">Uploading...</p>
          </div>
        ) : value ? (
          <div className="w-full relative group">
            <img 
              src={value} 
              alt="Featured" 
              className="w-full h-64 object-cover rounded-lg shadow-lg"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  className="bg-foreground/10 border-foreground/20 text-foreground hover:bg-foreground/20"
                >
                  Change
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onChange('')}
                >
                  <X className="w-4 h-4 mr-2" /> Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center cursor-pointer" onClick={() => inputRef.current?.click()}>
            <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center mb-3 text-mango-500">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-foreground font-medium mb-1">Click to upload featured image</p>
            <p className="text-foreground/40 text-sm">SVG, PNG, JPG or GIF (max 5MB)</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadField;