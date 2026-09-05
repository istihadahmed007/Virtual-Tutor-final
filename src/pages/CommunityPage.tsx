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
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Hero banner */}
      <div className="relative bg-white border-b border-stone-200/60 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Learning Community
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Ask questions, share insights, and learn together
              </p>
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" /> New Post
            </Button>
          </div>

          {/* Visual community banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 relative overflow-hidden rounded-2xl h-28 sm:h-36"
          >
            <LazyImage
              src={COMMUNITY_HEADER}
              alt="Students collaborating in a study group, discussing ideas and learning together"
              aspectRatio="3/1"
              objectFit="cover"
              className="w-full h-full"
              wrapperClassName="w-full h-full rounded-2xl"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-slate-900/30 to-transparent flex items-center">
              <div className="px-6">
                <p className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-1">
                  Community
                </p>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Learn Together, Grow Together
                </h2>
              </div>
            </div>
          </motion.div>

          <div className="mt-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search discussions..."
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSubject("")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${!selectedSubject ? "bg-teal-600 text-white" : "bg-white border border-stone-200 text-slate-600 hover:bg-stone-50"}`}
            >
              All Topics
            </button>
            {allSubjects.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedSubject === s ? "bg-teal-600 text-white" : "bg-white border border-stone-200 text-slate-600 hover:bg-stone-50"}`}
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
                className="bg-white rounded-2xl border border-stone-200 p-5 h-40 animate-pulse"
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
              className="bg-white rounded-2xl border border-stone-200/80 p-5 hover:shadow-lg hover:shadow-stone-200/50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <ProfileAvatar
                  name={post.authorName}
                  role={post.authorRole === "teacher" ? "teacher" : "student"}
                  size="md"
                  isVerified={post.authorRole === "teacher"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">
                      {post.authorName}
                    </span>
                    {post.authorRole === "teacher" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-full">
                        <Shield className="w-2.5 h-2.5" /> Teacher
                      </span>
                    )}
                    {post.subject && (
                      <span className="px-1.5 py-0.5 bg-stone-100 text-slate-500 text-[10px] font-medium rounded-full">
                        {post.subject}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-stone-100 text-slate-500 text-[10px] font-medium rounded-full"
                      >
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100">
                    <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
                      <Heart className="w-4 h-4" />{" "}
                      <span className="text-xs font-medium">
                        {post.likesCount}
                      </span>
                    </button>
                    <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors">
                      <MessageCircle className="w-4 h-4" />{" "}
                      <span className="text-xs font-medium">
                        {post.repliesCount} replies
                      </span>
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
