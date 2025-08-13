import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageSelect: (file: File | null) => void;
  onImageRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({ 
  currentImageUrl, 
  onImageSelect, 
  onImageRemove,
  disabled = false,
  className = ""
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageRemove) {
      onImageRemove();
    }
  };

  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Recipe Image
      </label>
      
      {displayImageUrl ? (
        <div className="relative inline-block">
          <img
            src={displayImageUrl}
            alt="Recipe preview"
            className="w-48 h-48 object-cover rounded-lg border-2 border-gray-300"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 p-1 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            disabled={disabled}
            className="hidden"
          />
          
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 text-gray-400">
              {dragOver ? (
                <Upload className="w-12 h-12" />
              ) : (
                <ImageIcon className="w-12 h-12" />
              )}
            </div>
            <div className="text-sm">
              <span className="font-medium text-blue-600">Click to upload</span>
              <span className="text-gray-500"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
