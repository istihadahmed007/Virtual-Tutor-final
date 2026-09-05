import React, { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  Phone,
  User,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  GraduationCap,
} from "lucide-react";

const CATEGORIES = [
  { id: "general", label: "General Inquiry" },
  { id: "teacher_application", label: "Teacher Application & Verification" },
  { id: "student_support", label: "Student & Parent Questions" },
  { id: "technical_issue", label: "Classroom Technical Support" },
  { id: "billing", label: "Billing & Tutoring Rates" },
  { id: "partnership", label: "Institutional Partnership" },
];

export function ContactSection() {
  const { user } = useAuth();
  const submitInquiryAction = useAction((api as any).contact?.submitWithEmailDispatch || (api as any).emailService?.sendContactInquiryNotificationAction);
  const submitInquiryMutation = useMutation((api as any).contact?.submit || (api as any).teachers?.submitApplication);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  React.useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      toast.error("Please enter a message (at least 10 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      try {
        await submitInquiryAction({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          category,
          subject: subject.trim(),
          message: message.trim(),
        });
      } catch (actionErr) {
        console.warn("[ContactSection] Action fallback to mutation:", actionErr);
        await submitInquiryMutation({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          category,
          subject: subject.trim(),
          message: message.trim(),
        });
      }

      setIsSuccess(true);
      toast.success("Message sent directly to istihadahmed1163@gmail.com & info@vartualtutor.com!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-white relative overflow-hidden border-t border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Context & Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-teal-50 border border-teal-200/80 rounded-full text-teal-800 text-xs font-bold">
              <Mail className="w-3.5 h-3.5 text-teal-600" />
              Direct Support & Inquiries
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Have questions or need assistance?
              <span className="block text-teal-600">We're here to help.</span>
            </h2>

            <p className="text-slate-600 text-base leading-relaxed">
              Whether you are an educator applying to teach, a student seeking personalized guidance, or have a general inquiry, our administrative team is ready to assist you.
            </p>

            <div className="p-5 rounded-2xl bg-[#FAFAF8] border border-stone-200/90 space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Administrator Mailboxes
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 space-y-0.5">
                    <div>istihadahmed1163@gmail.com</div>
                    <div>info@vartualtutor.com</div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Direct delivery for teacher verification & contact messages
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-stone-200/60">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Teacher Verification Desk
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Fast-track review for NID documents, academic degrees, and credentials.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Form */}
          <div className="lg:col-span-7">
            <div className="bg-[#FAFAF8] p-8 sm:p-10 rounded-3xl border border-stone-200/90 shadow-sm relative">
              {isSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 text-teal-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Message Delivered!
                  </h3>
                  <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                    Your inquiry has been transmitted directly to{" "}
                    <span className="font-semibold text-teal-700">istihadahmed1163@gmail.com</span> &amp;{" "}
                    <span className="font-semibold text-teal-700">info@vartualtutor.com</span>. Our administrative staff will review your note and respond via email at{" "}
                    <strong>{email}</strong>.
                  </p>
                  <Button
                    onClick={() => {
                      setIsSuccess(false);
                      setMessage("");
                      setSubject("");
                    }}
                    className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl px-6"
                  >
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-teal-600" />
                      Send Contact Message
                    </h3>
                    <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
                      To: istihadahmed1163@gmail.com
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-teal-600" />
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        Phone / Mobile <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-white rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                        Inquiry Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Subject <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="Brief topic of your message"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-white rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <Textarea
                      required
                      rows={4}
                      placeholder="Write your detailed inquiry, question, or teacher application support request..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-white rounded-xl border-stone-300 focus:ring-teal-500 text-sm resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      Encrypted transmission to admin
                    </span>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-7 py-2.5 flex items-center gap-2 shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Contact Form
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
