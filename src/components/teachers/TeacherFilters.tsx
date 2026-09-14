import { useState } from "react";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown, 
} from "lucide-react";
import { Button } from "../ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter 
} from "../ui/sheet";

export interface FilterState {
  query: string;
  subject: string;
  curriculum: string;
  gradeLevel: string;
  language: string;
  priceRange: string;
  ratingMin: number;
  availability: string;
  matchMyTimezone: boolean;
  sortBy: "best_match" | "earliest_available" | "highest_rated" | "lowest_price";
}

interface TeacherFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  totalResultsCount: number;
  className?: string;
}

export const SUBJECT_OPTIONS = [
  "All Subjects",
  "Organic Chemistry",
  "Chemistry",
  "Advanced Chemistry & Organic Synthesis",
  "Mathematics",
  "Higher Mathematics",
  "Physics Mechanics",
  "Biology",
  "ICT & Programming",
  "English Literature",
];

export const CURRICULUM_OPTIONS = [
  "All Curriculums",
  "Cambridge",
  "Edexcel",
  "IB",
  "AP",
  "English Version",
  "Bangla Medium",
];

export const GRADE_LEVEL_OPTIONS = [
  "All Levels",
  "Middle School (Grades 6-8)",
  "Secondary / O-Level / SSC",
  "Higher Secondary / A-Level / HSC",
  "AP / IB Diploma Level",
  "College / Undergraduate",
];

export const LANGUAGE_OPTIONS = [
  "All Languages",
  "English",
  "বাংলা",
  "Spanish",
  "French",
  "हिन्दी",
];

export const PRICE_RANGE_OPTIONS = [
  { value: "all", label: "Any Tuition" },
  { value: "under_3000", label: "Under ৳3,000/mo" },
  { value: "3000_5000", label: "৳3,000 – ৳5,000/mo" },
  { value: "5000_8000", label: "৳5,000 – ৳8,000/mo" },
  { value: "over_8000", label: "Over ৳8,000/mo" },
];

export const AVAILABILITY_OPTIONS = [
  { value: "any", label: "Any Availability" },
  { value: "today", label: "Available Today" },
  { value: "next_3_days", label: "Next 3 Days" },
  { value: "this_week", label: "This Week" },
];

export const SORT_OPTIONS = [
  { value: "best_match", label: "Best Match" },
  { value: "earliest_available", label: "Earliest Available" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "lowest_price", label: "Lowest Price" },
];

export function TeacherFilters({
  filters,
  onFilterChange,
  onResetFilters,
  totalResultsCount,
  className = "",
}: TeacherFiltersProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeFilterCount = [
    filters.subject !== "All Subjects",
    filters.curriculum !== "All Curriculums",
    filters.gradeLevel !== "All Levels",
    filters.language !== "All Languages",
    filters.priceRange !== "all",
    filters.ratingMin > 0,
    filters.availability !== "any",
    filters.matchMyTimezone,
  ].filter(Boolean).length;

  const handleUpdate = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input Bar + Filter Trigger + Sort Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => handleUpdate("query", e.target.value)}
            placeholder="Search by teacher name, subject, topic (e.g. Calculus, Python, IELTS)..."
            className="w-full h-11 pl-11 pr-10 text-sm rounded-full border border-white/12 bg-white/5 placeholder-white/40 focus:outline-hidden focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all text-white backdrop-blur-md"
          />
          {filters.query && (
            <button
              onClick={() => handleUpdate("query", "")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) => handleUpdate("sortBy", e.target.value as FilterState["sortBy"])}
              aria-label="Sort educators"
              className="h-11 pl-4 pr-9 text-xs font-semibold rounded-full border border-white/12 bg-slate-950/60 text-white hover:border-white/25 focus:outline-hidden focus:border-violet-400 appearance-none cursor-pointer backdrop-blur-md"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                  Sort: {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          </div>

          {/* Filter Drawer Toggle Button */}
          <Button
            variant="outline"
            onClick={() => setIsDrawerOpen(true)}
            className="h-11 px-4 rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer backdrop-blur-md"
          >
            <SlidersHorizontal className="h-4 w-4 text-violet-400" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white text-[11px] font-bold shadow-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Filter Badges Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Subject & Curriculum Chips */}
          {["All Subjects", "Physics Mechanics", "Higher Mathematics", "Organic Chemistry"].map((sub) => {
            const isSelected = filters.subject === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => handleUpdate("subject", sub)}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs border border-violet-400/50"
                    : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {sub}
              </button>
            );
          })}

          {/* Quick Rating 4.8+ Toggle */}
          <button
            type="button"
            onClick={() => handleUpdate("ratingMin", filters.ratingMin === 4.8 ? 0 : 4.8)}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all inline-flex items-center gap-1 cursor-pointer ${
              filters.ratingMin === 4.8
                ? "bg-violet-600 text-white shadow-xs border border-violet-400/50"
                : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>★ 4.8+ Stars</span>
          </button>
        </div>

        {/* Results Counter & Clear Action */}
        <div className="flex items-center gap-3 text-white/50">
          <span>
            <strong className="text-white font-bold">{totalResultsCount}</strong> teacher{totalResultsCount === 1 ? "" : "s"} found
          </span>
          {(activeFilterCount > 0 || filters.query) && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-violet-400 hover:text-violet-300 font-medium hover:underline cursor-pointer"
            >
              Reset all
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Filter Side Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto bg-slate-950/95 backdrop-blur-2xl border-l border-white/15 text-white">
          <SheetHeader className="mb-5 pb-4 border-b border-white/10">
            <SheetTitle className="text-lg font-bold text-white font-display">
              Filter Teachers
            </SheetTitle>
            <SheetDescription className="text-xs text-white/60">
              Narrow down educators by subject, curriculum, academic level, language, price, and availability.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-2">
            {/* Subject */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
                Academic Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => handleUpdate("subject", e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-white/15 bg-white/5 text-white cursor-pointer focus:border-violet-400"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                ))}
              </select>
            </div>

            {/* Curriculum */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
                Curriculum / Board
              </label>
              <select
                value={filters.curriculum}
                onChange={(e) => handleUpdate("curriculum", e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-white/15 bg-white/5 text-white cursor-pointer focus:border-violet-400"
              >
                {CURRICULUM_OPTIONS.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                ))}
              </select>
            </div>

            {/* Academic Grade Level */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
                Grade / Academic Level
              </label>
              <select
                value={filters.gradeLevel}
                onChange={(e) => handleUpdate("gradeLevel", e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-white/15 bg-white/5 text-white cursor-pointer focus:border-violet-400"
              >
                {GRADE_LEVEL_OPTIONS.map((g) => (
                  <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
                Instruction Language
              </label>
              <select
                value={filters.language}
                onChange={(e) => handleUpdate("language", e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-white/15 bg-white/5 text-white cursor-pointer focus:border-violet-400"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l} className="bg-slate-900 text-white">{l}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
                Monthly Tuition (Tk)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRICE_RANGE_OPTIONS.map((p) => {
                  const isSelected = filters.priceRange === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleUpdate("priceRange", p.value)}
                      className={`p-2.5 text-left rounded-xl text-xs font-medium border transition cursor-pointer ${
                        isSelected
                          ? "bg-violet-600/30 border-violet-400 text-white font-bold shadow-xs"
                          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
                Minimum Rating
              </label>
              <div className="flex gap-2">
                {[0, 4.5, 4.8, 4.9].map((rating) => {
                  const isSelected = filters.ratingMin === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleUpdate("ratingMin", rating)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? "bg-violet-600 border-violet-400 text-white shadow-xs"
                          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {rating === 0 ? "Any" : `${rating} ★`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
                Earliest Availability
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABILITY_OPTIONS.map((a) => {
                  const isSelected = filters.availability === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => handleUpdate("availability", a.value)}
                      className={`p-2.5 text-left rounded-xl text-xs font-medium border transition cursor-pointer ${
                        isSelected
                          ? "bg-violet-600/30 border-violet-400 text-white font-bold shadow-xs"
                          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timezone Match */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">
                  Prioritize My Timezone
                </p>
                <p className="text-[11px] text-white/50">
                  Matches slots active in your local time window.
                </p>
              </div>
              <input
                type="checkbox"
                checked={filters.matchMyTimezone}
                onChange={(e) => handleUpdate("matchMyTimezone", e.target.checked)}
                className="h-4 w-4 rounded-sm accent-violet-600 cursor-pointer"
              />
            </div>
          </div>

          <SheetFooter className="mt-6 pt-4 border-t border-white/10 flex gap-2">
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="flex-1 rounded-full text-xs border-white/15 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
            >
              Clear Filters
            </Button>
            <Button
              onClick={() => setIsDrawerOpen(false)}
              className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              Show {totalResultsCount} Teachers
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
