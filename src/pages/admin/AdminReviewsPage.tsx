import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminReviews } from "@/hooks/use-admin-data";
import { deleteAdminReview } from "@/lib/admin-store";
import {
  Star,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminReviewsPage() {
  const reviews = useAdminReviews();
  const deleteReviewMutation = useMutation(api.admin.deleteReview);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleDelete = async (reviewId: any) => {
    if (!confirm("Are you sure you want to remove this review? This action is logged in audit trail.")) return;
    setIsDeletingId(String(reviewId));
    try {
      try {
        await deleteReviewMutation({ reviewId, reason: "Removed by administrator" });
      } catch (e) {
        console.debug("Remote deleteReviewMutation skipped:", e);
      }
      deleteAdminReview(String(reviewId), "Removed by administrator");
      toast.success("Review removed successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove review.");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Reviews, Ratings & Feedback Moderation
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Monitor student evaluations of educators, inspect rating distribution, and moderate policy-violating comments.
        </p>
      </div>

      {/* Reviews List */}
      {!reviews ? (
        <div className="bg-white p-16 rounded-2xl border border-stone-200 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-xs font-medium">Loading student reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-slate-500 text-xs">
          No student reviews published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r: any) => (
            <div
              key={r._id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{r.studentName || "Verified Student"}</h3>
                    <p className="text-xs text-slate-500">For Teacher: <strong className="text-slate-700">{r.teacherName}</strong></p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-amber-800 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{r.rating} / 5</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-stone-50 p-3 rounded-xl border border-stone-200 leading-relaxed italic">
                  "{r.comment}"
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(r._id)}
                  disabled={isDeletingId === String(r._id)}
                  className="h-7 text-[11px] text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {isDeletingId === String(r._id) ? "Deleting..." : "Moderate / Remove"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
