/**
 * Virtual Tutor Pro - Image Processing & Avatar Utilities
 * Provides secure file validation (size, MIME, magic numbers),
 * deterministic initial extraction & color styling, and canvas-based square cropping.
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Validates selected file size and MIME type.
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (!file) {
    return { valid: false, error: "No file was selected." };
  }

  // 1. File Size Check (Max 5MB)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB} MB). Maximum allowed size is 5 MB.`,
    };
  }

  // 2. MIME Type Check
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a JPG, PNG, or WebP image.",
    };
  }

  // 3. Magic Byte Verification (Protects against disguised files)
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isWebP =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 && // "RIFF"
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50; // "WEBP"

    if (!isJpeg && !isPng && !isWebP) {
      return {
        valid: false,
        error: "File signature mismatch. Please upload a genuine JPG, PNG, or WebP image.",
      };
    }
  } catch (err) {
    console.warn("Could not read file magic bytes, continuing with MIME check:", err);
  }

  return { valid: true, file };
}

/**
 * Extracts 1-2 clean uppercase initials from a name.
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generates a deterministic, pleasant modern gradient palette based on a string seed (name or userId).
 */
export function getDeterministicGradient(seed?: string | null): {
  from: string;
  to: string;
  textColor: string;
  bgClass: string;
} {
  const palettes = [
    { from: "#0f766e", to: "#0d9488", textColor: "#ffffff", bgClass: "from-teal-700 to-teal-600" },
    { from: "#1e3a8a", to: "#2563eb", textColor: "#ffffff", bgClass: "from-blue-900 to-blue-600" },
    { from: "#4338ca", to: "#6366f1", textColor: "#ffffff", bgClass: "from-indigo-700 to-indigo-500" },
    { from: "#047857", to: "#10b981", textColor: "#ffffff", bgClass: "from-emerald-700 to-emerald-500" },
    { from: "#b45309", to: "#f59e0b", textColor: "#ffffff", bgClass: "from-amber-700 to-amber-500" },
    { from: "#be185d", to: "#ec4899", textColor: "#ffffff", bgClass: "from-pink-700 to-pink-500" },
    { from: "#7c2d12", to: "#ea580c", textColor: "#ffffff", bgClass: "from-orange-800 to-orange-500" },
    { from: "#4c1d95", to: "#8b5cf6", textColor: "#ffffff", bgClass: "from-purple-900 to-purple-600" },
  ];

  if (!seed) return palettes[0];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

/**
 * Loads an image from a URL or data URL.
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

/**
 * Crops and rotates an image on a canvas, outputting a high quality square Blob.
 * Target output: 512x512 square format optimized for fast web delivery.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0,
  outputSize = 512
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2D context available on canvas");
  }

  // Set square output dimensions
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Create temporary canvas to handle rotation if needed
  const rotRad = (rotation * Math.PI) / 180;
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  if (!tempCtx) {
    throw new Error("No 2D context available on temp canvas");
  }

  // Calculate rotated bounds
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  tempCanvas.width = image.width * cos + image.height * sin;
  tempCanvas.height = image.width * sin + image.height * cos;

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = "high";

  tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  tempCtx.rotate(rotRad);
  tempCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Now draw the cropped area onto our final 512x512 square canvas
  ctx.drawImage(
    tempCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    // Prefer webp with fallback to jpeg
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas export produced an empty image blob"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}
