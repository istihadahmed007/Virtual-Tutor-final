import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Plus,
  Trash2,
  Eye,
  Edit3,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Star,
  Palette,
} from "lucide-react";
import { useNavigate } from "react-router";

// ─── Types ───

interface ResumeData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  location: string;
  summary: string;
  experience: {
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
    keyAchievement: string;
  }[];
  education: {
    id: string;
    degree: string;
    school: string;
    location: string;
    year: string;
    coursework: string;
    minor: string;
  }[];
  skills: { name: string; level: number }[];
  languages: string[];
  hobbies: string[];
  references: { name: string; title: string; phone: string; email: string }[];
}

const emptyResume: ResumeData = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  linkedin: "",
  website: "",
  location: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  languages: [],
  hobbies: [],
  references: [],
};

const templates = [
  { id: "classic", name: "Classic Professional", desc: "Clean, structured layout with navy accents — ideal for corporate roles" },
  { id: "dark-sidebar", name: "Dark Sidebar", desc: "Bold dark sidebar with photo — modern and eye-catching" },
  { id: "modern-green", name: "Modern Minimal", desc: "Circular photo with green accents — fresh and contemporary" },
  { id: "professional-navy", name: "Professional Navy", desc: "Dark navy header with timeline sections — polished and refined" },
  { id: "executive", name: "Executive Dark", desc: "Dark header with photo and two-column layout — premium feel" },
];

const steps = ["Templates", "Personal Info", "Experience", "Education", "Skills", "Preview"];

// ─── Helpers ───

let _idCounter = 0;
const uid = () => `_${++_idCounter}`;

function generateSampleResume(): ResumeData {
  return {
    fullName: "Jill Morgan",
    jobTitle: "Sales Representative",
    email: "jill.morgan@zety.com",
    phone: "212-555-0104",
    linkedin: "linkedin.com/in/jillmorganzety",
    website: "",
    location: "New York, NY",
    summary:
      "Results-oriented sales representative with over 5 years of experience in industrial supplies and products. Skilled at maintaining profitable client relationships and developing ambitious sales targets. Achieved over $500,000 in sales in each fiscal quarter from 2019 to the present.",
    experience: [
      {
        id: uid(),
        title: "Senior Sales Representative",
        company: "McKinsey Industrial Supplies",
        location: "Brooklyn, NY",
        startDate: "2018-09",
        endDate: "",
        current: true,
        bullets: [
          "Managed organizational sales and group of sales representatives in selling industrial equipment and maintaining large construction and contractor business relationships.",
          "Worked with the data analysis team to develop sales targets based on extensive market research and analysis.",
          "Tracked individual sales rep goals and individually mentored any representative deemed to be falling behind.",
          "Managed largest 5 corporate construction and industrial client accounts.",
        ],
        keyAchievement: "Achieved over $500,000 in sales in each fiscal quarter from 2019.",
      },
      {
        id: uid(),
        title: "Customer Relationship Officer",
        company: "XYZ Inc.",
        location: "Philadelphia, PA",
        startDate: "2016-09",
        endDate: "2018-08",
        current: false,
        bullets: [
          "Acted as liaison between XYZ Inc. and corporate clients to facilitate and maintain healthy business relationships.",
          "Checked in on clients on a weekly basis to ensure needs are being met and supplies are being filled.",
          "Managed database of clients and potential leads in a customer relationship manager (CRM) program.",
        ],
        keyAchievement: "Maintained positive client relationships with 15 corporate customers.",
      },
    ],
    education: [
      {
        id: uid(),
        degree: "BSc in Marketing, Major in Professional Sales",
        school: "Penn State University",
        location: "Philadelphia, PA",
        year: "2016",
        coursework: "Professional Selling, Sales Management, Advanced Sales & Selling Techniques, Cloud-Based CRM Systems",
        minor: "Leadership & Communication",
      },
    ],
    skills: [
      { name: "Lead Qualification & Prospecting", level: 5 },
      { name: "Salesforce & Hubspot CRM", level: 4 },
      { name: "Optimizing MRR", level: 4 },
      { name: "Contract Negotiation", level: 3 },
    ],
    languages: ["English", "Spanish"],
    hobbies: [],
    references: [],
  };
}

// ─── Main Component ───

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const update = useCallback(
    (patch: Partial<ResumeData>) => setResume((r) => ({ ...r, ...patch })),
    [],
  );

  const loadSample = () => {
    setResume(generateSampleResume());
    setStep(1);
  };

  const addExperience = () =>
    setResume((r) => ({
      ...r,
      experience: [
        ...r.experience,
        {
          id: uid(),
          title: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          bullets: [""],
          keyAchievement: "",
        },
      ],
    }));

  const updateExperience = (id: string, patch: Partial<ResumeData["experience"][0]>) =>
    setResume((r) => ({
      ...r,
      experience: r.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const removeExperience = (id: string) =>
    setResume((r) => ({ ...r, experience: r.experience.filter((e) => e.id !== id) }));

  const addEducation = () =>
    setResume((r) => ({
      ...r,
      education: [
        ...r.education,
        { id: uid(), degree: "", school: "", location: "", year: "", coursework: "", minor: "" },
      ],
    }));

  const updateEducation = (id: string, patch: Partial<ResumeData["education"][0]>) =>
    setResume((r) => ({
      ...r,
      education: r.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const removeEducation = (id: string) =>
    setResume((r) => ({ ...r, education: r.education.filter((e) => e.id !== id) }));

  const addSkill = () =>
    setResume((r) => ({ ...r, skills: [...r.skills, { name: "", level: 3 }] }));

  const updateSkill = (idx: number, patch: Partial<{ name: string; level: number }>) =>
    setResume((r) => ({
      ...r,
      skills: r.skills.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const removeSkill = (idx: number) =>
    setResume((r) => ({ ...r, skills: r.skills.filter((_, i) => i !== idx) }));

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const el = previewRef.current;
      const opt = {
        margin: 0,
        filename: `${resume.fullName || "resume"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };
      await html2pdf().set(opt).from(el).save();
    } catch {
      alert("PDF export failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <button
            onClick={() => (step === 0 ? navigate("/") : setStep(step - 1))}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? "Back" : steps[step - 1]}
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-600" />
            <span className="text-sm font-bold text-slate-900">Resume Builder</span>
          </div>
          <div className="flex items-center gap-2">
            {step < steps.length - 1 && (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {step === steps.length - 1 && (
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-stone-100">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step labels */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => i <= step && setStep(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                i === step
                  ? "bg-violet-100 text-violet-700 border border-violet-200"
                  : i < step
                    ? "bg-stone-100 text-slate-600 hover:bg-stone-200 cursor-pointer"
                    : "bg-stone-50 text-slate-400 cursor-not-allowed"
              }`}
            >
              {i < step ? "✓ " : ""}
              {s}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Templates */}
          {step === 0 && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Choose a template
                </h1>
                <p className="mt-2 text-slate-500">
                  Pick a design that matches your industry. You can customize everything later.
                </p>
                <button
                  onClick={loadSample}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 text-violet-700 text-sm font-semibold rounded-xl hover:bg-violet-100 transition-all"
                >
                  <Star className="w-4 h-4" /> Load sample data to preview
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`group relative p-5 rounded-2xl border-2 transition-all text-left ${
                      selectedTemplate === t.id
                        ? "border-violet-500 bg-violet-50/50 shadow-lg shadow-violet-500/10"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-md"
                    }`}
                  >
                    {selectedTemplate === t.id && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className={`w-full h-40 rounded-xl mb-4 overflow-hidden ${getTemplateBg(t.id)}`}>
                      <TemplatePreviewMini templateId={t.id} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <SectionHeader icon={User} title="Personal information" />
              <div className="space-y-4 mt-6">
                <Input label="Full name" value={resume.fullName} onChange={(v) => update({ fullName: v })} placeholder="Jill Morgan" />
                <Input label="Job title" value={resume.jobTitle} onChange={(v) => update({ jobTitle: v })} placeholder="Sales Representative" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Email" type="email" value={resume.email} onChange={(v) => update({ email: v })} placeholder="jill@example.com" />
                  <Input label="Phone" value={resume.phone} onChange={(v) => update({ phone: v })} placeholder="212-555-0104" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="LinkedIn" value={resume.linkedin} onChange={(v) => update({ linkedin: v })} placeholder="linkedin.com/in/yourname" />
                  <Input label="Website" value={resume.website} onChange={(v) => update({ website: v })} placeholder="yourwebsite.com" />
                </div>
                <Input label="Location" value={resume.location} onChange={(v) => update({ location: v })} placeholder="New York, NY" />
                <Textarea label="Professional summary" value={resume.summary} onChange={(v) => update({ summary: v })} placeholder="A brief 2–3 sentence summary of your experience and goals..." rows={4} />
              </div>
            </motion.div>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <motion.div
              key="experience"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <SectionHeader icon={Briefcase} title="Work experience" />
              <div className="space-y-6 mt-6">
                {resume.experience.map((exp, idx) => (
                  <div key={exp.id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Experience {idx + 1}</span>
                      <button onClick={() => removeExperience(exp.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Input label="Job title" value={exp.title} onChange={(v) => updateExperience(exp.id, { title: v })} placeholder="Senior Sales Representative" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Company" value={exp.company} onChange={(v) => updateExperience(exp.id, { company: v })} placeholder="McKinsey Industrial Supplies" />
                      <Input label="Location" value={exp.location} onChange={(v) => updateExperience(exp.id, { location: v })} placeholder="Brooklyn, NY" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Start date" value={exp.startDate} onChange={(v) => updateExperience(exp.id, { startDate: v })} placeholder="2018-09" />
                      <Input
                        label="End date"
                        value={exp.endDate}
                        onChange={(v) => updateExperience(exp.id, { endDate: v })}
                        placeholder="Present"
                        disabled={exp.current}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) => updateExperience(exp.id, { current: e.target.checked, endDate: "" })}
                        className="rounded border-stone-300 text-violet-600"
                      />
                      Currently working here
                    </label>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Description (one bullet per line)</label>
                      <textarea
                        value={exp.bullets.join("\n")}
                        onChange={(e) => updateExperience(exp.id, { bullets: e.target.value.split("\n") })}
                        rows={4}
                        placeholder="Describe your responsibilities and achievements..."
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
                      />
                    </div>
                    <Input label="Key achievement (optional)" value={exp.keyAchievement} onChange={(v) => updateExperience(exp.id, { keyAchievement: v })} placeholder="Achieved over $500,000 in sales..." />
                  </div>
                ))}
                <button
                  onClick={addExperience}
                  className="w-full py-3 border-2 border-dashed border-stone-300 rounded-2xl text-sm font-semibold text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add experience
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Education */}
          {step === 3 && (
            <motion.div
              key="education"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <SectionHeader icon={GraduationCap} title="Education" />
              <div className="space-y-6 mt-6">
                {resume.education.map((edu, idx) => (
                  <div key={edu.id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Education {idx + 1}</span>
                      <button onClick={() => removeEducation(edu.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Input label="Degree" value={edu.degree} onChange={(v) => updateEducation(edu.id, { degree: v })} placeholder="BSc in Marketing" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="School" value={edu.school} onChange={(v) => updateEducation(edu.id, { school: v })} placeholder="Penn State University" />
                      <Input label="Location" value={edu.location} onChange={(v) => updateEducation(edu.id, { location: v })} placeholder="Philadelphia, PA" />
                    </div>
                    <Input label="Year" value={edu.year} onChange={(v) => updateEducation(edu.id, { year: v })} placeholder="2016" />
                    <Input label="Relevant coursework (optional)" value={edu.coursework} onChange={(v) => updateEducation(edu.id, { coursework: v })} placeholder="Professional Selling, Sales Management..." />
                    <Input label="Minor (optional)" value={edu.minor} onChange={(v) => updateEducation(edu.id, { minor: v })} placeholder="Leadership & Communication" />
                  </div>
                ))}
                <button
                  onClick={addEducation}
                  className="w-full py-3 border-2 border-dashed border-stone-300 rounded-2xl text-sm font-semibold text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add education
                </button>
              </div>

              {/* Skills inline */}
              <div className="mt-10">
                <SectionHeader icon={Wrench} title="Skills & languages" />
                <div className="space-y-4 mt-6">
                  {resume.skills.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => updateSkill(idx, { name: e.target.value })}
                        placeholder="Skill name"
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                      />
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => updateSkill(idx, { level: lvl })}
                            className={`w-5 h-5 rounded-sm transition-all ${
                              lvl <= skill.level ? "bg-slate-800" : "bg-stone-200"
                            }`}
                          />
                        ))}
                      </div>
                      <button onClick={() => removeSkill(idx)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSkill}
                    className="flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add skill
                  </button>
                </div>

                <div className="mt-6">
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Languages (comma-separated)</label>
                  <input
                    type="text"
                    value={resume.languages.join(", ")}
                    onChange={(e) =>
                      update({ languages: e.target.value.split(",").map((l) => l.trim()).filter(Boolean) })
                    }
                    placeholder="English, Spanish"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Skills (merged into step 3, but kept for navigation) */}
          {step === 4 && (
            <motion.div
              key="skills-extra"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <SectionHeader icon={Palette} title="Additional details" />
              <div className="space-y-6 mt-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Hobbies (comma-separated)</label>
                  <input
                    type="text"
                    value={resume.hobbies.join(", ")}
                    onChange={(e) =>
                      update({ hobbies: e.target.value.split(",").map((h) => h.trim()).filter(Boolean) })
                    }
                    placeholder="Writing, Photography, Design"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Preview & Export */}
          {step === 5 && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Your resume</h2>
                  <p className="text-sm text-slate-500">Review, then export as PDF</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${!showPreview ? "bg-slate-900 text-white" : "bg-stone-100 text-slate-600 hover:bg-stone-200"}`}
                  >
                    <Eye className="w-3.5 h-3.5 inline mr-1" /> Preview
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${showPreview ? "bg-slate-900 text-white" : "bg-stone-100 text-slate-600 hover:bg-stone-200"}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Edit
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Export PDF
                  </button>
                </div>
              </div>

              {showPreview && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Template:</span>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                        selectedTemplate === t.id
                          ? "bg-violet-100 text-violet-700 border border-violet-200"
                          : "bg-stone-100 text-slate-500 hover:bg-stone-200"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-stone-200 rounded-2xl p-4 sm:p-8 flex justify-center overflow-auto">
                <div ref={previewRef} className="shadow-2xl" style={{ width: "210mm", maxWidth: "100%", background: "white" }}>
                  {selectedTemplate === "classic" && <ClassicTemplate data={resume} />}
                  {selectedTemplate === "dark-sidebar" && <DarkSidebarTemplate data={resume} />}
                  {selectedTemplate === "modern-green" && <ModernGreenTemplate data={resume} />}
                  {selectedTemplate === "professional-navy" && <ProfessionalNavyTemplate data={resume} />}
                  {selectedTemplate === "executive" && <ExecutiveTemplate data={resume} />}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Reusable Form Components ───

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-violet-600" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
      />
    </div>
  );
}

// ─── Template Preview Mini ───

function getTemplateBg(id: string): string {
  switch (id) {
    case "classic":
      return "bg-white border border-stone-200";
    case "dark-sidebar":
      return "bg-slate-800";
    case "modern-green":
      return "bg-white border border-stone-200";
    case "professional-navy":
      return "bg-white border border-stone-200";
    case "executive":
      return "bg-slate-800";
    default:
      return "bg-white border border-stone-200";
  }
}

function TemplatePreviewMini({ templateId }: { templateId: string }) {
  return (
    <div className="w-full h-full p-3 flex flex-col">
      {templateId === "classic" && (
        <>
          <div className="h-2 w-16 bg-slate-800 rounded mb-1" />
          <div className="h-1.5 w-10 bg-slate-400 rounded mb-2" />
          <div className="flex gap-1 mb-2">
            <div className="h-1 w-8 bg-slate-300 rounded" />
            <div className="h-1 w-8 bg-slate-300 rounded" />
          </div>
          <div className="h-px bg-slate-300 mb-2" />
          <div className="h-1.5 w-12 bg-slate-600 rounded mb-1" />
          <div className="space-y-0.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-1 w-full bg-slate-200 rounded" />
            ))}
          </div>
        </>
      )}
      {templateId === "dark-sidebar" && (
        <div className="flex h-full gap-2">
          <div className="w-1/3 bg-slate-700 rounded-lg p-1.5">
            <div className="w-6 h-6 bg-slate-500 rounded-full mx-auto mb-1" />
            <div className="h-1 w-full bg-slate-600 rounded mb-0.5" />
            <div className="h-1 w-3/4 bg-slate-600 rounded mb-1" />
            <div className="h-1 w-full bg-slate-600 rounded mb-0.5" />
            <div className="h-1 w-full bg-slate-600 rounded mb-0.5" />
            <div className="h-1 w-2/3 bg-slate-600 rounded" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-1.5 w-12 bg-white/30 rounded" />
            <div className="h-1 w-full bg-white/15 rounded" />
            <div className="h-1 w-full bg-white/15 rounded" />
            <div className="h-1 w-3/4 bg-white/15 rounded" />
          </div>
        </div>
      )}
      {templateId === "modern-green" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-200 rounded-full" />
            <div>
              <div className="h-1.5 w-14 bg-slate-700 rounded mb-0.5" />
              <div className="h-1 w-10 bg-emerald-500 rounded" />
            </div>
          </div>
          <div className="h-px bg-emerald-300 mb-2" />
          <div className="h-1.5 w-12 bg-slate-600 rounded mb-1" />
          <div className="space-y-0.5">
            {[1, 2].map((i) => (
              <div key={i} className="h-1 w-full bg-slate-200 rounded" />
            ))}
          </div>
          <div className="flex gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`w-2 h-2 rounded-sm ${i <= 4 ? "bg-emerald-500" : "bg-stone-200"}`} />
            ))}
          </div>
        </>
      )}
      {templateId === "professional-navy" && (
        <>
          <div className="h-5 bg-slate-800 rounded-t-lg -mx-3 -mt-3 mb-2 px-3 pt-1">
            <div className="h-1 w-12 bg-white/30 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="w-1/3 space-y-1">
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-3/4 bg-slate-200 rounded" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 w-10 bg-slate-600 rounded mb-0.5" />
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
            </div>
          </div>
        </>
      )}
      {templateId === "executive" && (
        <div className="flex h-full gap-2">
          <div className="w-5/12 bg-slate-800 rounded-lg p-1.5 flex flex-col items-center">
            <div className="w-6 h-6 bg-slate-600 rounded-full mb-1" />
            <div className="h-1 w-full bg-slate-600 rounded mb-0.5" />
            <div className="h-1 w-full bg-slate-600 rounded mb-0.5" />
            <div className="h-1 w-3/4 bg-slate-600 rounded" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-1.5 w-10 bg-slate-600 rounded mb-0.5" />
            <div className="h-1 w-full bg-slate-200 rounded" />
            <div className="h-1 w-full bg-slate-200 rounded" />
            <div className="h-1 w-3/4 bg-slate-200 rounded" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Template: Classic Professional ───

function ClassicTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="p-8 sm:p-10 text-[11px] leading-relaxed font-sans text-slate-800">
      <h1 className="text-2xl font-extrabold text-slate-900">{data.fullName || "Your Name"}</h1>
      <p className="text-sm font-semibold text-slate-600 mt-0.5">{data.jobTitle || "Job Title"}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500">
        {data.phone && <span><strong className="text-slate-700">Phone</strong> {data.phone}</span>}
        {data.linkedin && <span><strong className="text-slate-700">LinkedIn</strong> {data.linkedin}</span>}
        {data.email && <span><strong className="text-slate-700">E-mail</strong> {data.email}</span>}
      </div>

      {data.summary && (
        <p className="mt-4 text-[11px] text-slate-600 leading-relaxed">{data.summary}</p>
      )}

      {data.experience.length > 0 && (
        <>
          <h2 className="text-sm font-extrabold text-slate-900 mt-6 mb-1 pb-1 border-b-2 border-slate-800">
            Experience
          </h2>
          {data.experience.map((exp) => (
            <div key={exp.id} className="mt-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {exp.startDate} – {exp.current ? "present" : exp.endDate}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{exp.title}</p>
                  <p className="italic text-slate-600 text-[10px]">
                    {exp.company}{exp.location ? `, ${exp.location}` : ""}
                  </p>
                </div>
              </div>
              <ul className="ml-[72px] mt-1 space-y-0.5 list-disc list-outside">
                {exp.bullets.filter(Boolean).map((b, i) => (
                  <li key={i} className="text-slate-600">{b}</li>
                ))}
              </ul>
              {exp.keyAchievement && (
                <div className="ml-[72px] mt-1">
                  <strong className="text-slate-700">Key Achievement</strong>
                  <p className="text-slate-600">{exp.keyAchievement}</p>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {data.education.length > 0 && (
        <>
          <h2 className="text-sm font-extrabold text-slate-900 mt-6 mb-1 pb-1 border-b-2 border-slate-800">
            Education
          </h2>
          {data.education.map((edu) => (
            <div key={edu.id} className="mt-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[10px] text-slate-500">{edu.year}</span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{edu.degree}</p>
                  <p className="italic text-slate-600 text-[10px]">
                    {edu.school}{edu.location ? `, ${edu.location}` : ""}
                  </p>
                  {edu.coursework && (
                    <p className="text-[10px] text-slate-600">
                      <strong>Relevant Coursework:</strong> {edu.coursework}
                    </p>
                  )}
                  {edu.minor && (
                    <p className="text-[10px] text-slate-600"><strong>Minor:</strong> {edu.minor}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {data.skills.length > 0 && (
        <>
          <h2 className="text-sm font-extrabold text-slate-900 mt-6 mb-1 pb-1 border-b-2 border-slate-800">
            Skills
          </h2>
          <div className="space-y-1 mt-2">
            {data.skills.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-slate-700">{s.name}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`w-3 h-3 rounded-sm ${lvl <= s.level ? "bg-slate-800" : "bg-stone-200"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data.languages.length > 0 && (
        <>
          <h2 className="text-sm font-extrabold text-slate-900 mt-6 mb-1 pb-1 border-b-2 border-slate-800">
            Languages
          </h2>
          <p className="mt-1 text-slate-600">{data.languages.join(", ")}</p>
        </>
      )}
    </div>
  );
}

// ─── Template: Dark Sidebar ───

function DarkSidebarTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="flex text-[10px] leading-relaxed font-sans text-slate-800" style={{ minHeight: "297mm" }}>
      {/* Sidebar */}
      <div className="w-[35%] bg-slate-800 text-white p-6">
        <div className="w-20 h-20 bg-slate-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          <User className="w-8 h-8 text-slate-400" />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Contact</h3>
            <div className="space-y-1.5 text-white/80">
              {data.phone && <p>📱 {data.phone}</p>}
              {data.email && <p>✉ {data.email}</p>}
              {data.location && <p>📍 {data.location}</p>}
              {data.linkedin && <p>🔗 {data.linkedin}</p>}
            </div>
          </div>

          {data.skills.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Skills</h3>
              <div className="space-y-1.5 text-white/80">
                {data.skills.map((s, i) => (
                  <p key={i}>{s.name}</p>
                ))}
              </div>
            </div>
          )}

          {data.languages.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Languages</h3>
              <div className="space-y-1.5 text-white/80">
                {data.languages.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </div>
          )}

          {data.hobbies.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Hobbies</h3>
              <div className="space-y-1.5 text-white/80">
                {data.hobbies.map((h, i) => (
                  <p key={i}>{h}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-6">
        <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
          {data.fullName || "Your Name"}
        </h1>
        <p className="text-sm font-semibold text-violet-600 mt-0.5">{data.jobTitle || "Job Title"}</p>

        {data.summary && (
          <div className="mt-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-1 mb-2">
              Profile
            </h3>
            <p className="text-slate-600">{data.summary}</p>
          </div>
        )}

        {data.experience.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-1 mb-2">
              Experience
            </h3>
            {data.experience.map((exp) => (
              <div key={exp.id} className="mb-3">
                <p className="font-bold text-slate-900">{exp.title}</p>
                <p className="text-[9px] text-slate-500 italic">
                  {exp.company}{exp.location ? `, ${exp.location}` : ""}
                </p>
                <p className="text-[9px] text-slate-400">
                  {exp.startDate} – {exp.current ? "Dec 2024" : exp.endDate}
                </p>
                <ul className="mt-1 space-y-0.5 list-disc list-outside ml-3">
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i} className="text-slate-600">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {data.education.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-1 mb-2">
              Education
            </h3>
            {data.education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <p className="font-bold text-slate-900">{edu.degree} | {edu.year}</p>
                <p className="text-[9px] text-slate-500 italic">{edu.school}, {edu.location}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Template: Modern Minimal (Green) ───

function ModernGreenTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="flex text-[10px] leading-relaxed font-sans text-slate-800" style={{ minHeight: "297mm" }}>
      {/* Sidebar */}
      <div className="w-[38%] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-emerald-200 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">{data.fullName || "Your Name"}</h1>
            <p className="text-xs font-semibold text-emerald-600 uppercase">{data.jobTitle || "Job Title"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-bold text-emerald-600 mb-1">Contact</h3>
            <div className="space-y-1 text-slate-600">
              {data.email && <p className="flex items-center gap-1.5">✉ {data.email}</p>}
              {data.phone && <p className="flex items-center gap-1.5">📞 {data.phone}</p>}
              {data.location && <p className="flex items-center gap-1.5">📍 {data.location}</p>}
              {data.website && <p className="flex items-center gap-1.5">🌐 {data.website}</p>}
            </div>
          </div>

          {data.skills.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-emerald-600 mb-1">Technical Skills</h3>
              <div className="space-y-1.5">
                {data.skills.map((s, i) => (
                  <div key={i}>
                    <p className="text-slate-700 text-[9px]">{s.name}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`w-2 h-2 rounded-sm ${lvl <= s.level ? "bg-emerald-500" : "bg-stone-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.languages.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-emerald-600 mb-1">Languages</h3>
              <div className="space-y-0.5 text-slate-600">
                {data.languages.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-6 border-l-2 border-emerald-200">
        {data.summary && (
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Professional Summary</h3>
            <p className="text-slate-600 text-[10px]">{data.summary}</p>
          </div>
        )}

        {data.experience.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 mb-2">Employment</h3>
            {data.experience.map((exp) => (
              <div key={exp.id} className="mb-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-bold text-slate-900">{exp.title}</p>
                  <span className="text-[9px] text-slate-400">{exp.current ? "Full Time" : "Full Time"}</span>
                </div>
                <p className="text-[9px] text-slate-500 italic">
                  {exp.company} • {exp.location}
                </p>
                <p className="text-[9px] text-slate-400">
                  {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                </p>
                <ul className="mt-1 space-y-0.5 list-disc list-outside ml-3">
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i} className="text-slate-600">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {data.education.length > 0 && (
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-2">Education</h3>
            {data.education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <p className="font-bold text-slate-900">{edu.degree}</p>
                <p className="text-[9px] text-slate-500">{edu.school} | {edu.location} | {edu.year}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Template: Professional Navy ───

function ProfessionalNavyTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="text-[10px] leading-relaxed font-sans text-slate-800">
      {/* Navy header */}
      <div className="bg-slate-800 text-white px-8 py-6">
        <h1 className="text-xl font-extrabold uppercase tracking-wider">{data.fullName || "Your Name"}</h1>
        <p className="text-xs text-slate-300 uppercase tracking-wider mt-0.5">{data.jobTitle || "Job Title"}</p>
      </div>

      <div className="flex">
        {/* Left sidebar */}
        <div className="w-[35%] bg-slate-100 p-6">
          <div className="space-y-5">
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Contact</h3>
              <div className="space-y-1.5 text-slate-600 text-[9px]">
                {data.phone && <p>📞 {data.phone}</p>}
                {data.email && <p>✉ {data.email}</p>}
                {data.location && <p>📍 {data.location}</p>}
                {data.website && <p>🌐 {data.website}</p>}
              </div>
            </div>

            {data.skills.length > 0 && (
              <div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Skills</h3>
                <div className="space-y-1.5 text-slate-600">
                  {data.skills.map((s, i) => (
                    <p key={i}>• {s.name}</p>
                  ))}
                </div>
              </div>
            )}

            {data.languages.length > 0 && (
              <div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Languages</h3>
                <div className="space-y-1 text-slate-600">
                  {data.languages.map((l, i) => (
                    <p key={i}>• {l}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right main */}
        <div className="flex-1 p-6">
          {data.summary && (
            <div className="mb-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-white text-[8px]">👤</span>
                Profile
              </h3>
              <p className="text-slate-600 ml-6">{data.summary}</p>
            </div>
          )}

          {data.experience.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-white text-[8px]">💼</span>
                Work Experience
              </h3>
              <div className="ml-6 border-l-2 border-slate-200 pl-4 space-y-4">
                {data.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex items-baseline justify-between">
                      <p className="font-bold text-slate-900">{exp.company}</p>
                      <span className="text-[9px] text-slate-400">
                        {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 italic">{exp.title}</p>
                    <ul className="mt-1 space-y-0.5 list-disc list-outside ml-3">
                      {exp.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-slate-600">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education.length > 0 && (
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-white text-[8px]">🎓</span>
                Education
              </h3>
              <div className="ml-6 border-l-2 border-slate-200 pl-4 space-y-3">
                {data.education.map((edu) => (
                  <div key={edu.id}>
                    <div className="flex items-baseline justify-between">
                      <p className="font-bold text-slate-900">{edu.degree}</p>
                      <span className="text-[9px] text-slate-400">{edu.year}</span>
                    </div>
                    <p className="text-[9px] text-slate-500">{edu.school}</p>
                    {edu.coursework && (
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        <strong>Coursework:</strong> {edu.coursework}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template: Executive Dark ───

function ExecutiveTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="text-[10px] leading-relaxed font-sans text-slate-800">
      {/* Dark header */}
      <div className="bg-slate-800 text-white px-8 py-6 flex items-center gap-6">
        <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center shrink-0 border-4 border-slate-700">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold uppercase tracking-wider">{data.fullName || "Your Name"}</h1>
          <p className="text-xs text-slate-300 uppercase tracking-wider mt-0.5">{data.jobTitle || "Job Title"}</p>
        </div>
      </div>

      <div className="flex">
        {/* Left sidebar */}
        <div className="w-[38%] bg-slate-100 p-6">
          <div className="space-y-5">
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Contact</h3>
              <div className="space-y-1.5 text-slate-600 text-[9px]">
                {data.phone && <p>📞 {data.phone}</p>}
                {data.email && <p>✉ {data.email}</p>}
                {data.location && <p>📍 {data.location}</p>}
                {data.linkedin && <p>🔗 {data.linkedin}</p>}
                {data.website && <p>🌐 {data.website}</p>}
              </div>
            </div>

            {data.skills.length > 0 && (
              <div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Skills</h3>
                <div className="space-y-1.5 text-slate-600">
                  {data.skills.map((s, i) => (
                    <div key={i}>
                      <p>{s.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.languages.length > 0 && (
              <div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Languages</h3>
                <div className="space-y-1 text-slate-600">
                  {data.languages.map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right main */}
        <div className="flex-1 p-6">
          {data.summary && (
            <div className="mb-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-1">Profile</h3>
              <p className="text-slate-600 text-[10px]">{data.summary}</p>
            </div>
          )}

          {data.experience.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Work Experience</h3>
              <div className="space-y-3">
                {data.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex items-baseline justify-between">
                      <p className="font-bold text-slate-900">{exp.company}</p>
                      <span className="text-[9px] text-slate-400">
                        {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 italic">{exp.title}</p>
                    <ul className="mt-1 space-y-0.5 list-disc list-outside ml-3">
                      {exp.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} className="text-slate-600">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 mb-2">Education</h3>
              {data.education.map((edu) => (
                <div key={edu.id} className="mb-2">
                  <div className="flex items-baseline justify-between">
                    <p className="font-bold text-slate-900">{edu.degree}</p>
                    <span className="text-[9px] text-slate-400">{edu.year}</span>
                  </div>
                  <p className="text-[9px] text-slate-500">{edu.school} | {edu.location}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
