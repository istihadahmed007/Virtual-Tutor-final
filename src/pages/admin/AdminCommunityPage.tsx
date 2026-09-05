import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminCommunity } from "@/hooks/use-admin-data";
import { deleteAdminCommunityPost } from "@/lib/admin-store";
import {
  MessageSquare,
  Search,
  Trash2,
  ThumbsUp,
  MessageCircle,
  Loader2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminCommunityPage() {
  const posts = useAdminCommunity();
  const deletePostMutation = useMutation(api.admin.deleteCommunityPost);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleDelete = async (postId: any) => {
    if (!confirm("Are you sure you want to delete this community post and all its replies?")) return;
    setIsDeletingId(String(postId));
    try {
      try {
        await deletePostMutation({ postId, reason: "Violated community guidelines" });
      } catch (e) {
        console.debug("Remote deletePostMutation skipped:", e);
      }
      deleteAdminCommunityPost(String(postId), "Violated community guidelines");
      toast.success("Community post removed.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete post.");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-teal-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Community & Forum Moderation
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Inspect public discussions, student queries, educational questions, and moderate forum content.
        </p>
      </div>

      {!posts ? (
        <div className="bg-white p-16 rounded-2xl border border-stone-200 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-xs font-medium">Loading community discussions...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-slate-500 text-xs">
          No community discussions published.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p: any) => (
            <div
              key={p._id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Posted by <strong className="text-slate-700">{p.authorName}</strong> ({p.authorRole}) •{" "}
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(p._id)}
                  disabled={isDeletingId === String(p._id)}
                  className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {isDeletingId === String(p._id) ? "Deleting..." : "Delete Post"}
                </Button>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                {p.content}
              </p>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-slate-400" /> {p.likes || 0} Likes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-slate-400" /> {p.replyCount || 0} Replies
                  </span>
                </div>
                {p.category && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-slate-700 text-[10px] font-semibold">
                    #{p.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
