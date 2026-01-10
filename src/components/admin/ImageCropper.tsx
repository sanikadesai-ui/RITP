import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number; // width / height
  isQRCode?: boolean; // If true, use white background, else transparent/image bg
  maxOutputWidth?: number; // Max width of output image in pixels
}

export function ImageCropper({ 
  open, 
  onOpenChange, 
  imageFile, 
  onCropComplete, 
  aspectRatio = 1,
  isQRCode = false,
  maxOutputWidth = 800 // Default to 800px for posters, higher quality
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setZoom([1]);
        setOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCrop = async () => {
    if (!imgRef.current || !containerRef.current) return;
    setProcessing(true);

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Use higher resolution for better quality
        // For posters (aspectRatio != 1), use HD resolution
        const isPortrait = aspectRatio < 1;
        const cropWidth = aspectRatio === 1 ? 500 : (isPortrait ? 1080 : 1920);
        const cropHeight = aspectRatio === 1 ? 500 : cropWidth / aspectRatio;

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        // Only add white background for QR codes, keep transparent for posters
        if (isQRCode) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const scale = zoom[0];
        
        // Get actual image dimensions
        const img = imgRef.current;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        // Calculate scale factor based on displayed vs natural size
        const displayedWidth = img.width;
        const displayedHeight = img.height;
        const scaleFactorX = naturalWidth / displayedWidth;
        const scaleFactorY = naturalHeight / displayedHeight;
        
        // Calculate the visible crop area in natural image coordinates
        const viewportWidth = 250; // The visible crop window width
        const viewportHeight = viewportWidth / aspectRatio;
        
        // Source coordinates in natural image space
        const srcX = ((viewportWidth / 2) - offset.x - (displayedWidth * scale / 2)) * scaleFactorX / scale;
        const srcY = ((viewportHeight / 2) - offset.y - (displayedHeight * scale / 2)) * scaleFactorY / scale;
        const srcWidth = viewportWidth * scaleFactorX / scale;
        const srcHeight = viewportHeight * scaleFactorY / scale;

        // Draw with better image quality settings
        // Calculate scale factor between display and canvas
        const displayWidth = 250;
        const displayHeight = 250 / aspectRatio;
        const scaleFactorX = cropWidth / displayWidth;
        const scaleFactorY = cropHeight / displayHeight;
        
        // Dimensions of the image as displayed in the DOM (before transform scale)
        const displayedWidth = imgRef.current.width;
        const displayedHeight = imgRef.current.height;

        // Dimensions to draw on canvas - scale up for HD
        const drawnWidth = displayedWidth * scale * scaleFactorX;
        const drawnHeight = displayedHeight * scale * scaleFactorY;

        // Position to draw on canvas
        // Center of canvas + offset (scaled) - half of drawn size
        const dx = (canvas.width / 2) + (offset.x * scaleFactorX) - (drawnWidth / 2);
        const dy = (canvas.height / 2) + (offset.y * scaleFactorY) - (drawnHeight / 2);

        // Enable high quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            img,
            srcX, srcY, srcWidth, srcHeight,  // Source rectangle
            0, 0, canvas.width, canvas.height  // Destination rectangle
        );
        
        // Use higher quality for non-QR images
        const quality = isQRCode ? 0.9 : 0.95;
        // Use maximum quality for JPEG (1.0) for event posters
        const quality = aspectRatio === 1 ? 0.9 : 1.0;
        // Use maximum quality for JPEG (1.0) for event posters
        const quality = aspectRatio === 1 ? 0.9 : 1.0;
        canvas.toBlob((blob) => {
            if (blob) onCropComplete(blob);
            setProcessing(false);
            onOpenChange(false);
        }, 'image/jpeg', quality);

    } catch (e) {
        console.error(e);
        setProcessing(false);
    }
  };

  // Preview crop area size
  const previewWidth = 250;
  const previewHeight = 250 / aspectRatio;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>{isQRCode ? 'Crop QR Code' : 'Crop Image'}</DialogTitle>
        </DialogHeader>
        
        <div 
            className="relative w-full h-[300px] bg-black overflow-hidden flex items-center justify-center cursor-move select-none rounded-md border border-zinc-800"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {imageSrc && (
                <img 
                    ref={imgRef}
                    src={imageSrc} 
                    alt="Crop target"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom[0]})`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                    draggable={false}
                />
            )}
            
            {/* Overlay to show crop area */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/50">
                {/* The "hole" */}
                <div 
                    style={{ 
                        width: `${previewWidth}px`, 
                        height: `${previewHeight}px`, 
                        border: '2px solid white',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                        background: 'transparent'
                    }} 
                />
            </div>
        </div>

        <div className="py-4">
            <label className="text-xs text-zinc-400 mb-2 block">Zoom</label>
            <Slider 
                value={zoom} 
                min={0.5} 
                max={3} 
                step={0.1} 
                onValueChange={setZoom} 
            />
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCrop} disabled={processing} className="bg-red-600 hover:bg-red-700">
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crop & Upload
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}