import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropper = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const getCroppedImage = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to the cropped area
    const outputSize = 400; // Output image size
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate the source coordinates
    const sourceX = completedCrop.x * scaleX;
    const sourceY = completedCrop.y * scaleY;
    const sourceWidth = completedCrop.width * scaleX;
    const sourceHeight = completedCrop.height * scaleY;

    // Apply zoom and rotation
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw the cropped image
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize,
      outputSize
    );

    ctx.restore();

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      "image/jpeg",
      0.9
    );
  }, [completedCrop, zoom, rotation, onCropComplete]);

  return (
    <div className="space-y-4">
      <div className="relative max-h-[400px] overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspectRatio}
          circularCrop
          className="max-h-[400px]"
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={onImageLoad}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxHeight: "400px",
              width: "auto",
            }}
            className="transition-transform"
          />
        </ReactCrop>
      </div>

      {/* Zoom Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            onValueChange={([value]) => setZoom(value)}
            min={0.5}
            max={3}
            step={0.1}
            className="flex-1"
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Rotation Control */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRotation((r) => (r - 90) % 360)}
        >
          <RotateCw className="w-4 h-4 mr-1 scale-x-[-1]" />
          Left
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRotation((r) => (r + 90) % 360)}
        >
          <RotateCw className="w-4 h-4 mr-1" />
          Right
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={getCroppedImage} className="flex-1">
          Apply Crop
        </Button>
      </div>
    </div>
  );
};
