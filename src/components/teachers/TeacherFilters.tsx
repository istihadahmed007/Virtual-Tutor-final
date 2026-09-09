import { useState } from "react";
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown, 
  Sparkles, 
  Globe, 
  Clock, 
  Check 
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#111111]/40" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => handleUpdate("query", e.target.value)}
            placeholder="Search by teacher name, subject, topic (e.g. Calculus, Python, IELTS)..."
            className="w-full h-11 pl-11 pr-10 text-sm rounded-full border border-[#E5E4DE] bg-white placeholder-[#111111]/40 focus:outline-hidden focus:border-[#111111] transition-all shadow-xs"
          />
          {filters.query && (
            <button
              onClick={() => handleUpdate("query", "")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#111111]/40 hover:text-[#111111] p-1"
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
              className="h-11 pl-4 pr-9 text-xs font-semibold rounded-full border border-[#E5E4DE] bg-white text-[#111111] hover:border-[#111111]/40 focus:outline-hidden shadow-xs appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#111111]/40" />
          </div>

          {/* Filter Drawer Toggle Button */}
          <Button
            variant="outline"
            onClick={() => setIsDrawerOpen(true)}
            className="h-11 px-4 rounded-full border-[#E5E4DE] bg-white hover:bg-[#F5F4EF] text-[#111111] text-xs font-semibold shadow-xs inline-flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#F26522]" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F26522] text-white text-[11px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Filter Badges Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Curriculum Chips */}
          {["All Curriculums", "Cambridge", "Edexcel", "AP", "IB"].map((cur) => {
            const isSelected = filters.curriculum === cur;
            return (
              <button
                key={cur}
                type="button"
                onClick={() => handleUpdate("curriculum", cur)}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  isSelected
                    ? "bg-[#111111] text-white shadow-xs"
                    : "bg-white border border-[#E5E4DE] text-[#111111]/70 hover:border-[#111111]/40"
                }`}
              >
                {cur}
              </button>
            );
          })}

          {/* Quick Rating 4.8+ Toggle */}
          <button
            type="button"
            onClick={() => handleUpdate("ratingMin", filters.ratingMin === 4.8 ? 0 : 4.8)}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all inline-flex items-center gap-1 ${
              filters.ratingMin === 4.8
                ? "bg-[#F26522] text-white shadow-xs"
                : "bg-white border border-[#E5E4DE] text-[#111111]/70 hover:border-[#111111]/40"
            }`}
          >
            <span>★ 4.8+ Stars</span>
          </button>
        </div>

        {/* Results Counter & Clear Action */}
        <div className="flex items-center gap-3 text-slate-500">
          <span>
            <strong className="text-slate-900 font-bold">{totalResultsCount}</strong> teacher{totalResultsCount === 1 ? "" : "s"} found
          </span>
          {(activeFilterCount > 0 || filters.query) && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-teal-700 hover:text-teal-800 font-medium hover:underline"
            >
              Reset all
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Filter Side Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
          <SheetHeader className="mb-5 pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-bold text-slate-900">
              Filter Teachers
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Narrow down educators by curriculum, academic level, language, price, and availability.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-2">
            {/* Curriculum */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
                Curriculum / Board
              </label>
              <select
                value={filters.curriculum}
                onChange={(e) => handleUpdate("curriculum", e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white"
              >
                {CURRICULUM_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Academic Grade Level */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
                Grade / Academic Level
              </label>
              <select
                value={filters.gradeLevel}
                onChange={(e) => handleUpdate("gradeLevel", e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white"
              >
                {GRADE_LEVEL_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
                Instruction Language
              </label>
              <select
                value={filters.language}
                onChange={(e) => handleUpdate("language", e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
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
                      className={`p-2.5 text-left rounded-xl text-xs font-medium border transition ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
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
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
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
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        isSelected
                          ? "bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
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
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
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
                      className={`p-2.5 text-left rounded-xl text-xs font-medium border transition ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timezone Match */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Prioritize My Timezone
                </p>
                <p className="text-[11px] text-slate-500">
                  Matches slots active in your local time window.
                </p>
              </div>
              <input
                type="checkbox"
                checked={filters.matchMyTimezone}
                onChange={(e) => handleUpdate("matchMyTimezone", e.target.checked)}
                className="h-4 w-4 rounded-sm text-teal-600 focus:ring-teal-500"
              />
            </div>
          </div>

          <SheetFooter className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="flex-1 rounded-xl text-xs"
            >
              Clear Filters
            </Button>
            <Button
              onClick={() => setIsDrawerOpen(false)}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              Show {totalResultsCount} Teachers
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
