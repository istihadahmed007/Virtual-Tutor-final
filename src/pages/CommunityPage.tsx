import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { LazyImage } from "@/components/images/LazyImage";
import { EmptyCommunityIllustration } from "@/components/images/EmptyIllustrations";
import { COMMUNITY_HEADER } from "@/lib/images";
import { subjects } from "@/lib/data";
import {
  ArrowLeft,
  Search,
  Heart,
  MessageCircle,
  Plus,
  Shield,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router";
import { SectionLabel } from "@/components/redesign";

const allSubjects = [...new Set(subjects.map((s) => s.name))];

export default function CommunityPage() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [search, setSearch] = useState("");

  const posts = useQuery(api.community.list, {
    subject: selectedSubject || undefined,
  });
  const isLoading = posts === undefined;
  const postList = posts ?? [];

  const filtered = search
    ? postList.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.content.toLowerCase().includes(search.toLowerCase()),
      )
    : postList;

  return (
    <main className="min-h-screen bg-transparent text-white pb-24 relative z-10">
      {/* Hero Header */}
      <div className="border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <SectionLabel number="05" text="Academic Forum & Peer Exchange" />
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mt-2">
                Learning Community.
              </h1>
              <p className="text-sm sm:text-base text-white/70 mt-2 max-w-xl">
                Ask questions, share problem proofs, debate research methodologies, and collaborate across disciplines.
              </p>
            </div>
            <Button
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 py-2.5 text-xs font-semibold gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4" /> New Discussion
            </Button>
          </div>

          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search discussions, topics, and question proofs..."
                className="w-full h-11 pl-11 pr-4 bg-white/[0.06] border border-white/15 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner backdrop-blur-md"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedSubject("")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all backdrop-blur-sm ${
                !selectedSubject
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] border border-violet-400/30"
                  : "bg-white/[0.04] border border-white/10 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
              }`}
            >
              All Topics
            </button>
            {allSubjects.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all backdrop-blur-sm ${
                  selectedSubject === s
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] border border-violet-400/30"
                    : "bg-white/[0.04] border border-white/10 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/10 p-5 h-40 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={search ? "No posts found" : "No community posts yet"}
            description={
              search
                ? "Try a different search term."
                : "Be the first to start a discussion in the community."
            }
            actionLabel={!search ? "Create a Post" : undefined}
            onAction={!search ? () => {} : undefined}
            illustration={
              <EmptyCommunityIllustration className="w-full max-w-[220px]" />
            }
          />
        ) : (
          filtered.map((post) => (
            <div
              key={post._id}
              className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-violet-400/40 hover:bg-white/[0.07] transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4 sm:gap-5">
                <ProfileAvatar
                  name={post.authorName}
                  role={post.authorRole === "teacher" ? "teacher" : "student"}
                  size="md"
                  isVerified={post.authorRole === "teacher"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-bold text-white font-display">
                      {post.authorName}
                    </span>
                    {post.authorRole === "teacher" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-600/20 text-violet-300 text-[10px] font-bold rounded-full border border-violet-500/30">
                        <Shield className="w-2.5 h-2.5 text-violet-400" /> Educator
                      </span>
                    )}
                    {post.subject && (
                      <span className="px-2.5 py-0.5 bg-white/10 text-white/70 text-[10px] font-semibold rounded-full border border-white/10">
                        {post.subject}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-display">
                    {post.title}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 text-white/70 text-[11px] font-medium rounded-full border border-white/10"
                      >
                        <Tag className="w-2.5 h-2.5 text-violet-400" /> {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-5 mt-5 pt-4 border-t border-white/10">
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-violet-400 transition-colors">
                      <Heart className="w-4 h-4" />{" "}
                      <span>{post.likesCount} upvotes</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors">
                      <MessageCircle className="w-4 h-4" />{" "}
                      <span>{post.repliesCount} replies</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
