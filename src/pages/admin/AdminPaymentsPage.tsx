import { useAdminBookings } from "@/hooks/use-admin-data";
import {
  CreditCard,
  Loader2,
} from "lucide-react";

export default function AdminPaymentsPage() {
  const bookings = useAdminBookings();

  const totalVolume = (bookings || []).reduce((acc: number, b: any) => acc + (b.totalAmount || b.price || 0), 0);
  const confirmedVolume = (bookings || [])
    .filter((b: any) => b.status === "confirmed" || b.status === "completed")
    .reduce((acc: number, b: any) => acc + (b.totalAmount || b.price || 0), 0);
  const platformRevenue = Math.round(confirmedVolume * 0.15); // 15% standard platform take-rate

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-teal-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Ledger & Transactions
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Review booking invoices, educator billing volume, platform commission, and transaction reconciliation.
        </p>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Booking Volume</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-slate-900">${totalVolume.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">USD</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled & Completed</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-emerald-600">${confirmedVolume.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">USD</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Fee Revenue (15%)</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-teal-700">${platformRevenue.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">USD</span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50 font-bold text-xs text-slate-800">
          Booking Invoices & Transaction History
        </div>

        {!bookings ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-medium">Loading ledger records...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No payment transaction records generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Subject & Session</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Educator Payout</th>
                  <th className="py-3.5 px-4">Gross Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((b: any) => {
                  const gross = b.price || 0;
                  const teacherPayout = Math.round(gross * 0.85);

                  return (
                    <tr key={b._id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        INV-{String(b._id).slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {b.subject}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {b.studentName || "Student"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-700">
                        ${teacherPayout}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ${gross}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            b.status === "completed" || b.status === "confirmed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
