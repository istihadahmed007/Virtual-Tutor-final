import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Pencil,
  Highlighter,
  Underline,
  Type,
  Trash2,
  Download,
  Image as ImageIcon,
  FolderOpen,
} from "lucide-react";

export interface PresentationMaterial {
  _id: string;
  title: string;
  fileUrl: string;
  fileType: "pdf" | "image" | "slides" | "doc";
  totalPages: number;
  currentPage: number;
  annotationsJson?: string;
  uploadedAt: number;
}

interface ClassroomPresentationProps {
  isTeacher: boolean;
  materials: PresentationMaterial[];
  activeMaterial: PresentationMaterial | null;
  onSelectMaterial: (m: PresentationMaterial) => void;
  onUploadMaterial: (title: string, fileUrl: string, fileType: "pdf" | "image" | "slides" | "doc", totalPages: number) => void;
  onUpdatePage: (materialId: string, page: number) => void;
}

export function ClassroomPresentation({
  isTeacher,
  materials,
  activeMaterial,
  onSelectMaterial,
  onUploadMaterial,
  onUpdatePage,
}: ClassroomPresentationProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [annotateTool, setAnnotateTool] = useState<"pen" | "highlighter" | "text" | "none">("none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type.includes("pdf") || fileName.endsWith(".pdf");
    const fileType = isImage ? "image" : isPdf ? "pdf" : "slides";

    // Create local object URL for preview / storage
    const localUrl = URL.createObjectURL(file);
    onUploadMaterial(fileName, localUrl, fileType, isPdf ? 5 : 1);
  };

  const currentPage = activeMaterial?.currentPage || 1;
  const totalPages = activeMaterial?.totalPages || 1;

  const handlePrevPage = () => {
    if (activeMaterial && currentPage > 1) {
      onUpdatePage(activeMaterial._id, currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (activeMaterial && currentPage < totalPages) {
      onUpdatePage(activeMaterial._id, currentPage + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden select-none">
      {/* ─── Presentation Top Action Bar ────────────────────────────── */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between gap-3 text-white text-xs">
        {/* Left: Document selector & Upload */}
        <div className="flex items-center gap-2">
          {materials.length > 0 && (
            <select
              value={activeMaterial?._id || ""}
              onChange={(e) => {
                const found = materials.find((m) => m._id === e.target.value);
                if (found) onSelectMaterial(found);
              }}
              className="bg-slate-700 text-white rounded-lg px-2.5 py-1 text-xs border border-slate-600 outline-none"
            >
              {materials.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title} ({m.fileType.toUpperCase()})
                </option>
              ))}
            </select>
          )}

          {isTeacher && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.pptx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-2.5 gap-1.5 rounded-lg"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Slides / PDF
              </Button>
            </div>
          )}
        </div>

        {/* Middle: Page navigation */}
        {activeMaterial && (
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium">
              Page <span className="text-teal-400 font-bold">{currentPage}</span> of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right: Annotation tools & Zoom */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 border-r border-slate-700 pr-2">
            {[
              { id: "pen" as const, icon: Pencil, label: "Pen" },
              { id: "highlighter" as const, icon: Highlighter, label: "Highlighter" },
              { id: "text" as const, icon: Type, label: "Text Callout" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setAnnotateTool(annotateTool === t.id ? "none" : t.id)}
                className={`p-1.5 rounded-md transition-colors ${
                  annotateTool === t.id ? "bg-teal-600 text-white" : "text-slate-400 hover:bg-slate-700"
                }`}
                title={t.label}
              >
                <t.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="p-1 text-slate-400 hover:text-white rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-slate-400 font-mono w-8 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="p-1 text-slate-400 hover:text-white rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Presentation Content Viewport ──────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/80 relative">
        {activeMaterial ? (
          <div
            className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 relative max-w-4xl w-full aspect-[4/3] flex flex-col transition-transform"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
          >
            {/* Header of the slide */}
            <div className="bg-slate-100 border-b border-stone-200 px-4 py-2 flex items-center justify-between text-slate-700 text-xs font-semibold">
              <span className="truncate">{activeMaterial.title}</span>
              <span className="text-slate-500">Slide {currentPage}</span>
            </div>

            {/* Slide Body / Document content */}
            {activeMaterial.fileType === "image" ? (
              <div className="flex-1 p-2 flex items-center justify-center bg-stone-900">
                <img
                  src={activeMaterial.fileUrl}
                  alt={activeMaterial.title}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                />
              </div>
            ) : (
              <div className="flex-1 p-6 flex flex-col justify-between bg-white text-slate-900 font-sans">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 border-b border-stone-200 pb-2">
                    {currentPage === 1
                      ? activeMaterial.title
                      : `Section ${currentPage}: Deep Dive & Case Analysis`}
                  </h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                    <p className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-teal-950 font-medium">
                      🎯 Key Objective: Analyze core properties, theoretical derivations, and real-world applications.
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-3 text-slate-800 text-sm">
                      <li>Fundamental definitions and structural breakdown</li>
                      <li>Standard formulas, computational steps, and error margins</li>
                      <li>Collaborative walkthrough and classroom practice exercises</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-slate-500">
                  <span>ভার্চুয়াল টিউটর · Verified Learning Material</span>
                  <span>Page {currentPage} / {totalPages}</span>
                </div>
              </div>
            )}

            {/* Annotation Highlight Layer */}
            {annotateTool !== "none" && (
              <div className="absolute inset-0 pointer-events-none border-2 border-teal-400/50 rounded-xl">
                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-teal-600 text-white text-[10px] font-bold rounded-lg shadow-md">
                  Annotation Mode: {annotateTool.toUpperCase()}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center p-8 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 max-w-md">
            <FolderOpen className="w-12 h-12 text-teal-400 mx-auto mb-3 opacity-80" />
            <h3 className="text-sm font-bold text-white mb-1">No Materials Uploaded Yet</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {isTeacher
                ? "Upload lecture slides, PDF documents, or diagrams to present to your students."
                : "The teacher will present lesson slides and lecture documents here."}
            </p>
            {isTeacher && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Material
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
