import { useState, useRef } from 'react';
import { X, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/features/settings/services/settingsService';

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ value, onChange, maxImages = 5 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (value.length >= maxImages) {
      toast.error(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadImage(file);
      onChange([...value, url]);
      toast.success('Imagen cargada correctamente');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Error al cargar imagen');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...value];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {value.map((url, index) => (
          <div key={index} className="relative group w-32 h-32 rounded-lg overflow-hidden border bg-muted">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Cargar Imagen</span>
              </>
            )}
          </button>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <p className="text-[10px] text-muted-foreground italic">JPG, PNG o WEBP. Máx 5MB.</p>
    </div>
  );
}
