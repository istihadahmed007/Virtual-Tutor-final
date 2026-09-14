import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Search, BookOpen, GraduationCap, Wallet, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const HeroSearchPanel: React.FC<{ className?: string; isDark?: boolean }> = ({
  className = "",
  isDark = true,
}) => {
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [budget, setBudget] = useState("");
  const [availability, setAvailability] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (subject && subject !== "All") params.set("subject", subject);
    if (level && level !== "All") params.set("grade", level);
    if (budget && budget !== "All") params.set("price", budget);
    if (availability && availability !== "All") params.set("availability", availability);

    const queryStr = params.toString();
    navigate(queryStr ? `/teachers?${queryStr}` : "/teachers");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full max-w-5xl mx-auto rounded-3xl transition-all ${
        isDark
          ? "bg-slate-950/50 backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] p-3 sm:p-4.5"
          : "bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_20px_60px_rgba(49,46,129,0.08)] p-3 sm:p-4"
      } ${className}`}
    >
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
        {/* 1. Subject Selector */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
            isDark
              ? "bg-white/[0.06] hover:bg-white/[0.1] border-white/12 hover:border-white/25 text-white"
              : "bg-[#F8FAFC] hover:bg-slate-100/80 border-slate-200/60"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? "bg-[#6D5DFB]/25 text-[#C7D2FE] border border-[#6D5DFB]/30" : "bg-[#312E81]/10 text-[#312E81]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <label
              className={`block text-[10px] font-bold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full bg-transparent text-sm font-semibold focus:outline-none cursor-pointer truncate ${
                isDark ? "text-white [&>option]:bg-[#0F172A] [&>option]:text-white" : "text-[#0F172A]"
              }`}
            >
              <option value="">Choose subject...</option>
              <option value="Physics">Physics Mechanics</option>
              <option value="Mathematics">Higher Mathematics</option>
              <option value="Chemistry">Organic Chemistry</option>
              <option value="Biology">Biology & Life Sciences</option>
              <option value="English">English Literature & IELTS</option>
              <option value="Bangla">Bangla Literature & Grammar</option>
              <option value="ICT">ICT & Computer Programming</option>
            </select>
          </div>
        </div>

        {/* 2. Curriculum / Level */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
            isDark
              ? "bg-white/[0.06] hover:bg-white/[0.1] border-white/12 hover:border-white/25 text-white"
              : "bg-[#F8FAFC] hover:bg-slate-100/80 border-slate-200/60"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? "bg-[#312E81]/40 text-[#A5B4FC] border border-[#312E81]/50" : "bg-[#6D5DFB]/10 text-[#6D5DFB]"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <label
              className={`block text-[10px] font-bold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={`w-full bg-transparent text-sm font-semibold focus:outline-none cursor-pointer truncate ${
                isDark ? "text-white [&>option]:bg-[#0F172A] [&>option]:text-white" : "text-[#0F172A]"
              }`}
            >
              <option value="">All curricula / grades</option>
              <option value="Cambridge">Cambridge IGCSE / O-Level</option>
              <option value="Edexcel">Edexcel International A-Level</option>
              <option value="English Version">English Version (NCTB)</option>
              <option value="Bangla Medium">Bangla Medium (SSC / HSC)</option>
              <option value="Admission">University & Engineering Admission</option>
            </select>
          </div>
        </div>

        {/* 3. Budget Tier */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
            isDark
              ? "bg-white/[0.06] hover:bg-white/[0.1] border-white/12 hover:border-white/25 text-white"
              : "bg-[#F8FAFC] hover:bg-slate-100/80 border-slate-200/60"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? "bg-[#14B8A6]/25 text-[#2DD4BF] border border-[#14B8A6]/30" : "bg-[#14B8A6]/10 text-[#14B8A6]"
            }`}
          >
            <Wallet className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <label
              className={`block text-[10px] font-bold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Budget
            </label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={`w-full bg-transparent text-sm font-semibold focus:outline-none cursor-pointer truncate ${
                isDark ? "text-white [&>option]:bg-[#0F172A] [&>option]:text-white" : "text-[#0F172A]"
              }`}
            >
              <option value="">Flexible budget</option>
              <option value="under_3000">Under ৳3,000 / month</option>
              <option value="3000_6000">৳3,000 - ৳6,000 / month</option>
              <option value="above_6000">৳6,000+ / month (Senior Faculty)</option>
            </select>
          </div>
        </div>

        {/* 4. Availability & Action */}
        <div className="flex items-center gap-2">
          <div
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
              isDark
                ? "bg-white/[0.06] hover:bg-white/[0.1] border-white/12 hover:border-white/25 text-white"
                : "bg-[#F8FAFC] hover:bg-slate-100/80 border-slate-200/60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? "bg-[#6D5DFB]/25 text-[#C7D2FE] border border-[#6D5DFB]/30" : "bg-[#312E81]/10 text-[#312E81]"
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <label
                className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Time
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className={`w-full bg-transparent text-sm font-semibold focus:outline-none cursor-pointer truncate ${
                  isDark ? "text-white [&>option]:bg-[#0F172A] [&>option]:text-white" : "text-[#0F172A]"
                }`}
              >
                <option value="">Any schedule</option>
                <option value="weekdays">Weekday Evenings</option>
                <option value="weekends">Weekend Mornings</option>
                <option value="flexible">Flexible Timing</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="h-[62px] px-6 sm:px-7 rounded-2xl bg-gradient-to-r from-[#6D5DFB] via-[#5B4BE8] to-[#6D5DFB] hover:from-[#7C6EFB] hover:to-[#5B4BE8] text-white font-bold text-sm shadow-[0_8px_25px_rgba(109,93,251,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_12px_32px_rgba(109,93,251,0.55)] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <span>Search</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
