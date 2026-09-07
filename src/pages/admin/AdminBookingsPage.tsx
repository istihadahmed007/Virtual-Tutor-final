import { useState } from "react";
import { useAdminBookings } from "@/hooks/use-admin-data";
import {
  CalendarCheck,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
  DollarSign,
  User,
  GraduationCap,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminBookingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const bookings = useAdminBookings({
    status: statusFilter,
    searchQuery: searchQuery.trim() || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Booking & Reservation Schedule
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global timetable of student reservations, teacher bookings, scheduled dates, and completed sessions.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teacher, student, subject..."
            className="pl-9 text-xs rounded-xl bg-stone-50 border-stone-200"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["all", "confirmed", "pending", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
              statusFilter === s
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {!bookings ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-medium">Loading platform bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No bookings found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Subject & Session</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Educator</th>
                  <th className="py-3.5 px-4">Scheduled Date & Time</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((b: any) => (
                  <tr key={b._id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{b.subject}</p>
                      <p className="text-[11px] text-slate-500">{b.sessionType || "1-on-1"} • {b.durationMinutes || 60} mins</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{b.studentName || "Student"}</p>
                      <p className="text-[11px] text-slate-400">{b.userId}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{b.teacherName || "Teacher"}</p>
                      <p className="text-[11px] text-slate-400">{b.teacherId}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{b.date}</p>
                      <p className="text-[11px] text-slate-500">{b.timeSlot}</p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ৳{(b.price || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          b.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : b.status === "completed"
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : b.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
