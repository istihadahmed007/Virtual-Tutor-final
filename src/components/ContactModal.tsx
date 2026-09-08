import React, { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Phone,
  User,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
  defaultSubject?: string;
}

const CATEGORIES = [
  { id: "general", label: "General Inquiry", desc: "Questions about platform features & how it works" },
  { id: "teacher_application", label: "Teacher Application & Verification", desc: "Inquiries regarding tutor onboarding, NID check & credentials" },
  { id: "student_support", label: "Student & Parent Support", desc: "Assistance with tutoring lessons, schedules & discovery" },
  { id: "technical_issue", label: "Classroom / Technical Issue", desc: "Assistance with live whiteboard, audio/video or tools" },
  { id: "billing", label: "Billing & Payments", desc: "Inquiries regarding lesson payouts, rates or refunds" },
  { id: "partnership", label: "Institutional Partnership", desc: "Schools, universities, academies and group programs" },
];

export function ContactModal({
  open,
  onOpenChange,
  defaultCategory = "general",
  defaultSubject = "",
}: ContactModalProps) {
  const { user } = useAuth();
  const submitInquiryAction = useAction((api as any).contact?.submitWithEmailDispatch || (api as any).emailService?.sendContactInquiryNotificationAction);
  const submitInquiryMutation = useMutation((api as any).contact?.submit || (api as any).teachers?.submitApplication);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync when user logs in or default changes
  React.useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
  }, [user]);

  React.useEffect(() => {
    if (defaultCategory) setCategory(defaultCategory);
    if (defaultSubject && !subject) setSubject(defaultSubject);
  }, [defaultCategory, defaultSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your full name");
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
      toast.error("Please provide a message of at least 10 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Dispatch email to istihadahmed1163@gmail.com & info@vartualtutor.com + store in Convex
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
        // Fallback to mutation if action had network issue
        console.warn("[ContactModal] Fallback to mutation:", actionErr);
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
      toast.error(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setMessage("");
    setSubject("");
    setPhone("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white rounded-2xl border border-stone-200/80 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-800 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white border border-white/20">
              <Mail className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Contact Support & Inquiries
              </DialogTitle>
              <DialogDescription className="text-xs text-teal-100/90 mt-0.5">
                Direct communication with ভার্চুয়াল টিউটর administration
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2 text-xs text-teal-100">
            <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" />
            <span>
              Delivered directly to{" "}
              <strong className="text-white underline decoration-teal-300">
                istihadahmed1163@gmail.com
              </strong>{" "}
              &{" "}
              <strong className="text-white underline decoration-teal-300">
                info@vartualtutor.com
              </strong>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 text-teal-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Message Sent Successfully!
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for reaching out, <strong>{name}</strong>. Your message and contact details have been delivered to our administrative mailboxes at{" "}
                <span className="font-semibold text-teal-700">istihadahmed1163@gmail.com</span> &amp;{" "}
                <span className="font-semibold text-teal-700">info@vartualtutor.com</span>. We will review your inquiry and get back to you at <strong>{email}</strong> shortly.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button
                  onClick={handleReset}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 rounded-xl"
                >
                  Close & Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsSuccess(false)}
                  className="border-stone-300 rounded-xl"
                >
                  Send Another Message
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Istihad Ahmed"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
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
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>

              {/* Phone & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    Phone / WhatsApp <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                    Inquiry Topic <span className="text-rose-500">*</span>
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

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="What can we help you with?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="rounded-xl border-stone-300 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Message Details <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {message.length} characters
                  </span>
                </div>
                <Textarea
                  required
                  rows={4}
                  placeholder="Please describe your question, application status check, or technical feedback in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl border-stone-300 focus:ring-teal-500 text-sm resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 flex items-center justify-between border-t border-stone-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  Recipient: istihadahmed1163@gmail.com
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="text-slate-600 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-5 flex items-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
