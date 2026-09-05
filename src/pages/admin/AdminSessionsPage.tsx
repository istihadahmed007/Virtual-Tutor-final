import { useState } from "react";
import { useAdminSessions } from "@/hooks/use-admin-data";
import {
  Video,
  Loader2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminSessionsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const sessions = useAdminSessions({
    status: statusFilter,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Classroom Sessions & Live Streams
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time classroom monitoring, scheduled live sessions, group seminars, and completed recordings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["all", "scheduled", "in_progress", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                statusFilter === s
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {!sessions ? (
        <div className="bg-white p-16 rounded-2xl border border-stone-200 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-xs font-medium">Loading session feeds...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-slate-500 text-xs">
          No classroom sessions matching filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessions.map((s: any) => (
            <div
              key={s._id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-stone-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{s.title || s.subject}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{s.teacherName || "Educator"} • {s.type === "group-live" ? "Group Live" : "1-on-1"}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      s.status === "in_progress"
                        ? "bg-emerald-500 text-white animate-pulse"
                        : s.status === "completed"
                        ? "bg-stone-100 text-slate-700"
                        : "bg-teal-50 text-teal-700 border border-teal-200"
                    }`}
                  >
                    {s.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Attendee / Enrollment:</span>
                    <strong className="text-slate-900">{s.studentName || "1 Student"}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Scheduled Time:</span>
                    <strong className="text-slate-900">{new Date(s.scheduledAt).toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <strong className="text-slate-900">{s.durationMinutes || 60} mins</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-400">ID: {String(s._id).slice(-6)}</span>
                {s.status === "in_progress" && (
                  <Button
                    size="sm"
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Live Monitor
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
