import { useState } from "react";
import { useAdminStudents } from "@/hooks/use-admin-data";
import {
  BookOpen,
  Search,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminStudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const students = useAdminStudents({
    searchQuery: searchQuery.trim() || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Student Directory & Enrollment
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse enrolled student profiles, academic institutions, class levels, and learning subjects.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, school, subjects..."
            className="pl-9 text-xs rounded-xl bg-stone-50 border-stone-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {!students ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-medium">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No students found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Institution & Class</th>
                  <th className="py-3.5 px-4">Subjects</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {students.map((s: any) => (
                  <tr key={s._id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-500">{s.userEmail || "Student User"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{s.institution || "School / Academy"}</p>
                      <p className="text-[11px] text-slate-500">{s.educationLevel || "High School"} • {s.classLevel || "Standard"}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(s.subjects || []).map((sub: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-stone-100 text-slate-700 text-[10px] font-medium">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.verificationStatus === "verified"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-100 text-slate-600 border border-stone-200"
                        }`}
                      >
                        {s.verificationStatus || "standard"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {s.userCreatedAt ? new Date(s.userCreatedAt).toLocaleDateString() : "Recent"}
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
