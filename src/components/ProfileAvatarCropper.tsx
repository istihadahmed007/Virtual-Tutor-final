import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProfileAvatar } from "./ProfileAvatar";
import { Id } from "@/convex/_generated/dataModel";

interface ProfileAvatarCropperProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  userRole?: string;
  userId?: string;
  onUploadSuccess?: (newUrl: string, storageId: string) => void;
  onRemoveSuccess?: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const ProfileAvatarCropper: React.FC<ProfileAvatarCropperProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  userName,
  userRole,
  userId,
  onUploadSuccess,
  onRemoveSuccess,
}) => {
  // Modal & File States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  // Crop & Transform States
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Live preview canvas data
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Convex mutations
  const generateUploadUrl = useMutation((api as any).avatars?.generateProfileImageUploadUrl || (api as any).users?.generateProfileImageUploadUrl);
  const saveProfileImage = useMutation((api as any).avatars?.saveProfileImage || (api as any).users?.saveProfileImage);
  const removeProfileImage = useMutation((api as any).avatars?.removeProfileImage || (api as any).users?.removeProfileImage);

  // Reset internal states when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowConfirmRemove(false);
    } else {
      // Clean up file object URLs to prevent memory leaks
      if (imageSrc && imageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
      setSelectedFile(null);
      setImageSrc(null);
      setPreviewDataUrl(null);
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle file selection and validation
  const processFile = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage("Invalid file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    // 2. Validate Max size (5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("Image is too large. Please upload an image under 5 MB.");
      return;
    }

    // 3. Create blob URL for interactive editor
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setImageSrc(objectUrl);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageElementRef.current = img;
      updatePreview(img, 1, 0, { x: 0, y: 0 });
    };
    img.src = objectUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Generate cropped preview
  const updatePreview = useCallback(
    (
      img: HTMLImageElement,
      currentScale: number,
      currentRotation: number,
      currentPos: { x: 0; y: 0 } | { x: number; y: number },
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const OUTPUT_SIZE = 512;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.save();

      // Center transformations
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.rotate((currentRotation * Math.PI) / 180);
      ctx.scale(currentScale, currentScale);
      ctx.translate(currentPos.x, currentPos.y);

      // Fit image cover
      const scaleToCover = Math.max(OUTPUT_SIZE / img.width, OUTPUT_SIZE / img.height);
      const drawWidth = img.width * scaleToCover;
      const drawHeight = img.height * scaleToCover;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/webp", 0.92);
      setPreviewDataUrl(dataUrl);
    },
    [],
  );

  // Update preview on interaction changes
  useEffect(() => {
    if (imageElementRef.current) {
      updatePreview(imageElementRef.current, scale, rotation, position);
    }
  }, [scale, rotation, position, updatePreview]);

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    // Restrain excessive panning
    const limit = 200 * scale;
    setPosition({
      x: Math.max(-limit, Math.min(limit, newX)),
      y: Math.max(-limit, Math.min(limit, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(3, +(s + 0.15).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(0.75, +(s - 0.15).toFixed(2)));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Save / Upload Execution
  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      // 1. Export canvas as blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob((b) => resolve(b), "image/webp", 0.92);
      });

      if (!blob) {
        throw new Error("Failed to process image canvas.");
      }

      // 2. Request Convex upload URL
      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl) {
        throw new Error("Could not initialize upload channel.");
      }

      // 3. Upload file directly to storage endpoint
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/webp" },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }

      const { storageId } = (await uploadRes.json()) as { storageId: Id<"_storage"> };
      if (!storageId) {
        throw new Error("No storage reference returned.");
      }

      // 4. Authoritatively link storageId to user record & profiles
      const saveRes = await saveProfileImage({
        storageId,
        targetUserId: userId,
      });

      setSuccessMessage("Profile picture updated successfully.");
      if (onUploadSuccess && saveRes.avatarUrl) {
        onUploadSuccess(saveRes.avatarUrl, String(storageId));
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      console.error("[ProfileAvatarCropper] Upload error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to upload profile picture. Please check your network and try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Remove Profile Picture
  const handleRemove = async () => {
    setIsRemoving(true);
    setErrorMessage(null);

    try {
      await removeProfileImage({ targetUserId: userId });
      setSuccessMessage("Profile picture removed successfully.");
      if (onRemoveSuccess) {
        onRemoveSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      console.error("[ProfileAvatarCropper] Removal error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to remove profile picture. Please try again.",
      );
    } finally {
      setIsRemoving(false);
      setShowConfirmRemove(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="profile_avatar_modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading && !isRemoving) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Profile Picture</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Upload and adjust your official portrait photo
            </p>
          </div>
          <button
            id="close_avatar_modal_btn"
            onClick={onClose}
            disabled={isUploading || isRemoving}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Notifications */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-sm">
              <Check className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Hidden Canvas used for high-res cropping */}
          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {!imageSrc ? (
            /* Step 1: Upload Prompt & Dropzone */
            <div className="space-y-4">
              <div className="flex items-center gap-5 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                <ProfileAvatar
                  name={userName}
                  image={currentAvatarUrl}
                  role={userRole}
                  size="xl"
                  id="current_profile_avatar_preview"
                />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {userName || "Your Profile"}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {currentAvatarUrl ? "Custom profile picture active" : "No custom photo uploaded yet"}
                  </div>
                  {currentAvatarUrl && !showConfirmRemove && (
                    <button
                      id="trigger_remove_avatar_btn"
                      onClick={() => setShowConfirmRemove(true)}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 pt-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove current photo
                    </button>
                  )}
                </div>
              </div>

              {/* Remove confirmation */}
              {showConfirmRemove && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 space-y-3">
                  <p className="text-xs text-rose-800 dark:text-rose-200 font-medium">
                    Are you sure you want to remove your profile picture? Your profile will revert to your neutral initials avatar.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      id="confirm_remove_avatar_btn"
                      onClick={handleRemove}
                      disabled={isRemoving}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isRemoving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Yes, Remove Picture
                    </button>
                    <button
                      id="cancel_remove_avatar_btn"
                      onClick={() => setShowConfirmRemove(false)}
                      disabled={isRemoving}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Dropzone */}
              <div
                id="avatar_dropzone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 text-center transition-all bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Click to upload <span className="font-normal text-neutral-500">or drag and drop</span>
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  JPG, PNG or WebP · Max 5 MB · Recommended square portrait
                </p>
              </div>
            </div>
          ) : (
            /* Step 2: Interactive Cropper, Pan & Zoom Editor */
            <div className="space-y-5">
              {/* Crop Viewport */}
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Square Crop Frame */}
                <div
                  className="relative w-64 h-64 rounded-2xl overflow-hidden bg-neutral-950 select-none border border-neutral-800 shadow-inner flex items-center justify-center cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Grid Overlay */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25 z-10">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Circular guide cutout */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none z-10" />

                  {/* Interactive Image */}
                  <img
                    src={imageSrc}
                    alt="Crop preview"
                    className="max-w-none pointer-events-none transition-transform duration-75 ease-out"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                {/* Real-time Multi-Size Previews */}
                <div className="flex-1 w-full flex flex-col items-center md:items-start space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Live Display Previews
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <ProfileAvatar
                        image={previewDataUrl}
                        name={userName}
                        role={userRole}
                        size="xl"
                        id="cropper_preview_large"
                      />
                      <span className="text-[11px] text-neutral-500 font-mono">Profile</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                      <ProfileAvatar
                        image={previewDataUrl}
                        name={userName}
                        role={userRole}
                        size="md"
                        id="cropper_preview_medium"
                      />
                      <span className="text-[11px] text-neutral-500 font-mono">List/Card</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                      <ProfileAvatar
                        image={previewDataUrl}
                        name={userName}
                        role={userRole}
                        size="sm"
                        id="cropper_preview_small"
                      />
                      <span className="text-[11px] text-neutral-500 font-mono">Navbar</span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Drag the image inside the frame to adjust the focal point. Use zoom and rotation below.
                  </p>
                </div>
              </div>

              {/* Adjust Controls: Zoom & Rotate */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Zoom & Positioning
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
                  >
                    Reset Position
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="0.75"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700 mx-1" />

                  <button
                    onClick={handleRotate}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center gap-1 text-xs font-medium"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>90°</span>
                  </button>
                </div>
              </div>

              {/* Change selected file button */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                  {selectedFile?.name} ({(selectedFile?.size ? (selectedFile.size / 1024 / 1024).toFixed(2) : 0)} MB)
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Choose a different photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800">
          <button
            id="cancel_avatar_crop_btn"
            onClick={onClose}
            disabled={isUploading || isRemoving}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {imageSrc && (
            <button
              id="save_avatar_picture_btn"
              onClick={handleSave}
              disabled={isUploading || isRemoving}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving portrait...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Profile Picture</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default ProfileAvatarCropper;
