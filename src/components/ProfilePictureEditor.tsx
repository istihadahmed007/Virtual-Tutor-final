import React, { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfilePictureCropperModal } from "@/components/ProfilePictureCropperModal";
import { validateImageFile } from "@/lib/image-utils";
import { updateUserProfile } from "@/lib/auth-store";
import { toast } from "sonner";
import {
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  ShieldCheck,
} from "lucide-react";

export interface ProfilePictureEditorProps {
  userId?: string;
  currentAvatarUrl?: string | null;
  userName?: string;
  userRole?: string;
  isVerified?: boolean;
  onAvatarUpdated?: (newAvatarUrl: string | null) => void;
  className?: string;
}

export function ProfilePictureEditor({
  userId,
  currentAvatarUrl,
  userName = "User",
  userRole = "student",
  isVerified = false,
  onAvatarUpdated,
  className = "",
}: ProfilePictureEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileSrc, setSelectedFileSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("Uploading profile picture...");
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const generateUploadUrlMut = useMutation(api.users.generateProfileImageUploadUrl);
  const saveProfileImageMut = useMutation(api.users.saveProfileImage);
  const removeProfileImageMut = useMutation(api.users.removeProfileImage);

  // ─── File Selection & Validation ─────────────────────────────
  const processFile = async (file: File) => {
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Please select a valid image file.");
      return;
    }

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFileSrc(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
    // Clear input so same file can be re-selected if needed
    e.target.value = "";
  };

  // ─── Drag & Drop Handlers ────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  // ─── Upload Pipeline ─────────────────────────────────────────
  const handleConfirmCrop = async (croppedBlob: Blob) => {
    try {
      setIsUploading(true);
      setUploadStatus("Requesting secure storage upload...");

      // 1. Generate Convex storage upload URL
      let uploadUrl: string;
      try {
        uploadUrl = await generateUploadUrlMut();
      } catch (err: unknown) {
        console.warn("Convex storage token error, trying direct save:", err);
        throw new Error("Unable to obtain secure upload URL. Please check your connection.");
      }

      // 2. Upload file blob directly to Convex storage
      setUploadStatus("Uploading image to storage...");
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": croppedBlob.type || "image/jpeg",
        },
        body: croppedBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status code ${uploadResponse.status}`);
      }

      const { storageId } = await uploadResponse.json();
      if (!storageId) {
        throw new Error("Storage service did not return a valid file reference.");
      }

      // 3. Save reference in database and user profile
      setUploadStatus("Updating profile records...");
      const result = await saveProfileImageMut({ storageId });

      // 4. Update local auth session store
      if (result.avatarUrl) {
        updateUserProfile({
          avatarUrl: result.avatarUrl,
          avatarStorageId: storageId,
          image: result.avatarUrl,
        });
      }

      toast.success("Profile picture updated successfully!");
      setIsCropperOpen(false);
      setSelectedFileSrc(null);

      if (onAvatarUpdated && result.avatarUrl) {
        onAvatarUpdated(result.avatarUrl);
      }
    } catch (err: unknown) {
      console.error("Profile picture upload failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload profile picture. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Remove Profile Picture ──────────────────────────────────
  const handleRemovePhoto = async () => {
    try {
      setIsRemoving(true);
      await removeProfileImageMut();

      // Clear local auth session state
      updateUserProfile({
        avatarUrl: undefined,
        avatarStorageId: undefined,
        image: undefined,
      });

      setShowRemoveConfirm(false);
      toast.success("Profile picture removed. Initials will be used.");

      if (onAvatarUpdated) {
        onAvatarUpdated(null);
      }
    } catch (err: unknown) {
      console.error("Remove profile image error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove profile picture.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs ${className}`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload profile picture file"
      />

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
        {/* Current Avatar Frame with Quick Actions */}
        <div className="relative group shrink-0">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer relative rounded-3xl overflow-hidden shadow-md ring-4 ring-stone-100 group-hover:ring-teal-500/30 transition-all"
            title="Click to change profile picture"
          >
            <ProfileAvatar
              name={userName}
              image={currentAvatarUrl}
              userId={userId}
              role={userRole}
              size="2xl"
              shape="rounded"
              isVerified={isVerified}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            {/* Hover overlay with camera icon */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2 text-center">
              <Camera className="w-6 h-6 mb-1 drop-shadow-sm" />
              <span className="text-[11px] font-bold tracking-wide">Change Photo</span>
            </div>
          </div>
        </div>

        {/* Action Controls and Requirements */}
        <div className="flex-1 flex flex-col justify-center text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Profile Picture</h3>
            {currentAvatarUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Custom Photo Active
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-1 max-w-lg">
            Upload a clear, front-facing professional portrait. Your profile picture will be shown
            across the marketplace, virtual classrooms, messaging, and community forums.
          </p>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-4 border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDragOver
                ? "border-teal-500 bg-teal-50/70"
                : "border-stone-200 hover:border-teal-400 bg-stone-50/60 hover:bg-stone-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800">
                  {isDragOver ? "Drop image to upload" : "Click to browse or drag & drop photo"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  JPG, PNG or WebP (max 5MB) • Recommended 512×512px
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shrink-0 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Select Photo
            </Button>
          </div>

          {/* Secondary Actions & Specifications */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Square crop tool included
              </span>
            </div>

            {currentAvatarUrl && (
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Remove Confirmation Dialog ─────────────────────────── */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-sm w-full shadow-xl">
            <h4 className="text-base font-bold text-slate-900">Remove Profile Picture?</h4>
            <p className="text-xs text-slate-500 mt-2">
              Your profile picture will be removed from your account and replaced with your
              name initials. You can upload a new photo anytime.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemoving}
                className="border-stone-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRemovePhoto}
                disabled={isRemoving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {isRemoving ? "Removing..." : "Yes, Remove Photo"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cropper & Adjustment Modal ─────────────────────────── */}
      <ProfilePictureCropperModal
        isOpen={isCropperOpen}
        imageSrc={selectedFileSrc}
        fileName={selectedFileName}
        userName={userName}
        isUploading={isUploading}
        uploadProgress={uploadStatus}
        onClose={() => {
          setIsCropperOpen(false);
          setSelectedFileSrc(null);
        }}
        onConfirm={handleConfirmCrop}
        onChangeFile={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
