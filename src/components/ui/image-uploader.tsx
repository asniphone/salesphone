"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface ImageUploaderProps {
  images: string[];
  setImages: (images: string[]) => void;
  maxUploads?: number;
}

export function ImageUploader({
  images,
  setImages,
  maxUploads = 5,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= maxUploads) {
      toast.error(`Maksimal ${maxUploads} gambar diperbolehkan.`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengunggah gambar");
      }

      setImages([...images, data.url]);
      toast.success("Gambar berhasil diunggah.");

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-4 shadow-sm border p-4 rounded-lg bg-card">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((url, idx) => (
          <div
            key={idx}
            className="group relative aspect-square rounded-md border bg-muted overflow-hidden"
          >
            <Image
              src={url}
              alt={`Uploaded ${idx}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex justify-end p-2">
              <Button
                variant="destructive"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeImage(idx)}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {images.length < maxUploads && (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed hover:bg-muted/50 transition-colors"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs text-center text-muted-foreground font-medium px-2">Unggah Foto</span>
              </>
            )}
          </div>
        )}
      </div>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <p>
          Format: JPG, PNG, WebP (Maks 5MB)
        </p>
        <p>
          {images.length} / {maxUploads} Foto
        </p>
      </div>
    </div>
  );
}
