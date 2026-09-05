import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  RefreshCw,
  Upload,
  AlertCircle,
  Move,
} from "lucide-react";
import { CropArea, getCroppedImg } from "@/lib/image-utils";

export interface ProfilePictureCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  fileName?: string;
  userName?: string;
  isUploading?: boolean;
  uploadProgress?: string;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob) => Promise<void>;
  onChangeFile?: () => void;
}

export function ProfilePictureCropperModal({
  isOpen,
  imageSrc,
  fileName,
  userName = "User",
  isUploading = false,
  uploadProgress = "Uploading profile picture...",
  onClose,
  onConfirm,
  onChangeFile,
}: ProfilePictureCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Reset state when opening a new image
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setErrorMsg(null);
    }
  }, [isOpen, imageSrc]);

  // Compute live crop area and update live preview
  const computeCropAndPreview = useCallback(async () => {
    if (!imageRef.current || !containerRef.current || !imageSrc) return;

    try {
      const img = imageRef.current;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      if (!naturalWidth || !naturalHeight) return;

      // Crop dimension calculation relative to natural image dimensions
      const minDimension = Math.min(naturalWidth, naturalHeight);
      const scaledDimension = minDimension / zoom;

      // Normalized center offset based on user pan
      const offsetX = (pan.x / (150 * zoom)) * (naturalWidth / 2);
      const offsetY = (pan.y / (150 * zoom)) * (naturalHeight / 2);

      let cropX = (naturalWidth - scaledDimension) / 2 - offsetX;
      let cropY = (naturalHeight - scaledDimension) / 2 - offsetY;

      // Clamp bounds
      cropX = Math.max(0, Math.min(cropX, naturalWidth - scaledDimension));
      cropY = Math.max(0, Math.min(cropY, naturalHeight - scaledDimension));

      const cropArea: CropArea = {
        x: cropX,
        y: cropY,
        width: scaledDimension,
        height: scaledDimension,
      };

      const blob = await getCroppedImg(imageSrc, cropArea, rotation, 256);
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      // Quiet fail on intermediate animation frames
    }
  }, [imageSrc, zoom, rotation, pan]);

  // Debounced live preview calculation
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    const timer = setTimeout(() => {
      computeCropAndPreview();
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen, imageSrc, zoom, rotation, pan, computeCropAndPreview]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  if (!isOpen || !imageSrc) return null;

  // ─── Drag Pan Handlers (Mouse & Touch) ─────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    // Bound pan range
    const maxPan = 140 * zoom;
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY)),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = e.touches[0].clientX - dragStart.x;
    const newY = e.touches[0].clientY - dragStart.y;
    const maxPan = 140 * zoom;
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY)),
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(3, Math.max(1, prev + delta)));
  };

  // ─── Rotation Handlers ─────────────────────────────────────────
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // ─── Final Confirm & Crop Export ───────────────────────────────
  const handleSaveCropped = async () => {
    if (!imageRef.current || !imageSrc) return;
    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const img = imageRef.current;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      const minDimension = Math.min(naturalWidth, naturalHeight);
      const scaledDimension = minDimension / zoom;

      const offsetX = (pan.x / (150 * zoom)) * (naturalWidth / 2);
      const offsetY = (pan.y / (150 * zoom)) * (naturalHeight / 2);

      let cropX = (naturalWidth - scaledDimension) / 2 - offsetX;
      let cropY = (naturalHeight - scaledDimension) / 2 - offsetY;

      cropX = Math.max(0, Math.min(cropX, naturalWidth - scaledDimension));
      cropY = Math.max(0, Math.min(cropY, naturalHeight - scaledDimension));

      const cropArea: CropArea = {
        x: cropX,
        y: cropY,
        width: scaledDimension,
        height: scaledDimension,
      };

      // Export high-res 512x512 square image
      const finalBlob = await getCroppedImg(imageSrc, cropArea, rotation, 512);
      await onConfirm(finalBlob);
    } catch (err: unknown) {
      console.error("Crop export error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to crop and save profile image.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-stone-50/90 border-b border-stone-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Adjust & Crop Profile Picture</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag to position, zoom and rotate to create your perfect profile avatar.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading || isProcessing}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-stone-200/60 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Body ──────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6 items-center">
          {/* Main Interactive Canvas / Viewport */}
          <div className="flex-1 flex flex-col items-center w-full">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-slate-900 border-2 border-stone-200 overflow-hidden cursor-${
                isDragging ? "grabbing" : "grab"
              } select-none shadow-inner flex items-center justify-center`}
              title="Drag to reposition, mouse wheel to zoom"
            >
              {/* Target Image with Transforms */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Source preview"
                className="max-w-none transition-transform pointer-events-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  maxHeight: "100%",
                }}
                draggable={false}
              />

              {/* Circular Vignette Overlay Mask */}
              <div className="absolute inset-0 pointer-events-none">
                {/* SVG circular cut-out */}
                <svg className="w-full h-full" viewBox="0 0 288 288">
                  <defs>
                    <mask id="hole">
                      <rect width="288" height="288" fill="white" />
                      <circle cx="144" cy="144" r="110" fill="black" />
                    </mask>
                  </defs>
                  <rect
                    width="288"
                    height="288"
                    fill="rgba(15, 23, 42, 0.75)"
                    mask="url(#hole)"
                  />
                  <circle
                    cx="144"
                    cy="144"
                    r="110"
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    className="animate-pulse"
                  />
                </svg>
              </div>

              {/* Guide hint */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium rounded-full pointer-events-none flex items-center gap-1">
                <Move className="w-2.5 h-2.5" />
                <span>Drag to align face in circle</span>
              </div>
            </div>

            {/* Controls Bar: Zoom & Rotate */}
            <div className="w-full max-w-xs mt-4 space-y-3">
              {/* Zoom slider */}
              <div className="flex items-center gap-2.5">
                <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-teal-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                  aria-label="Zoom level"
                />
                <ZoomIn className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="text-xs font-mono font-semibold text-slate-600 w-9 text-right">
                  {zoom.toFixed(1)}x
                </span>
              </div>

              {/* Action buttons: Rotate & Reset */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRotateLeft}
                    className="h-8 px-2.5 text-xs text-slate-700 border-stone-200 gap-1"
                    title="Rotate 90° counter-clockwise"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>-90°</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRotateRight}
                    className="h-8 px-2.5 text-xs text-slate-700 border-stone-200 gap-1"
                    title="Rotate 90° clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>+90°</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-800 gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="w-full md:w-56 flex flex-col items-center justify-center p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Preview Result
            </span>

            {/* 96px Preview */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-stone-200 mb-2">
              {previewBlobUrl ? (
                <img
                  src={previewBlobUrl}
                  alt="Cropped Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-teal-600 text-white flex items-center justify-center font-bold">
                  {userName.charAt(0)}
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">
              {userName}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Profile Header (96px)</p>

            <div className="w-full h-px bg-stone-200 my-3" />

            {/* Small sizes preview */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white shadow-xs bg-stone-200">
                  {previewBlobUrl && (
                    <img
                      src={previewBlobUrl}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1">40px Card</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-white shadow-xs bg-stone-200">
                  {previewBlobUrl && (
                    <img
                      src={previewBlobUrl}
                      alt="Small Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1">28px Nav</span>
              </div>
            </div>

            {fileName && (
              <p className="text-[10px] text-slate-400 truncate max-w-[180px] mt-3">
                {fileName}
              </p>
            )}

            {onChangeFile && (
              <button
                type="button"
                onClick={onChangeFile}
                disabled={isUploading || isProcessing}
                className="mt-3 text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Choose different photo</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Error Alert ────────────────────────────────────────── */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ─── Footer ────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUploading || isProcessing}
            className="border-stone-200 text-slate-700 hover:bg-stone-100"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSaveCropped}
            disabled={isUploading || isProcessing}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-bold px-6 shadow-sm shadow-teal-600/20"
          >
            {isUploading || isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{uploadProgress}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply Profile Picture</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
