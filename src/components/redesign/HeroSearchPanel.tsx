import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Search, BookOpen, GraduationCap, Wallet, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const HeroSearchPanel: React.FC<{ className?: string }> = ({ className = "" }) => {
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
      className={`w-full max-w-5xl mx-auto rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_20px_60px_rgba(49,46,129,0.08)] p-3 sm:p-4 transition-all ${className}`}
    >
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
        {/* 1. Subject Selector */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100/80 border border-slate-200/60 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-[#312E81]/10 text-[#312E81] flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-[#0F172A] focus:outline-none cursor-pointer truncate"
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
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100/80 border border-slate-200/60 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-[#6D5DFB]/10 text-[#6D5DFB] flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-[#0F172A] focus:outline-none cursor-pointer truncate"
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
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100/80 border border-slate-200/60 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Budget</label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-[#0F172A] focus:outline-none cursor-pointer truncate"
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
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100/80 border border-slate-200/60 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#312E81]/10 text-[#312E81] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-[#0F172A] focus:outline-none cursor-pointer truncate"
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
            className="h-[62px] px-6 rounded-2xl bg-[#312E81] hover:bg-[#6D5DFB] text-white font-bold text-sm shadow-md hover:shadow-[0_8px_25px_rgba(109,93,251,0.35)] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <span>Search</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
