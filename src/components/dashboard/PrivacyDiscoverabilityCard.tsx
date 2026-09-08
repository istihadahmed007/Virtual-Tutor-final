import { useState } from "react";
import { 
  ShieldCheck, 
  Eye, 
  Lock, 
  Sparkles, 
  Check, 
  X, 
  Settings2,
  Info
} from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";

interface PrivacyDiscoverabilityCardProps {
  isDiscoverable: boolean;
  onToggleDiscoverable?: (val: boolean) => void;
  className?: string;
}

export function PrivacyDiscoverabilityCard({
  isDiscoverable = true,
  onToggleDiscoverable,
  className = "",
}: PrivacyDiscoverabilityCardProps) {
  const [localDiscoverable, setLocalDiscoverable] = useState(isDiscoverable);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [shareGoals, setShareGoals] = useState(true);
  const [shareCurriculum, setShareCurriculum] = useState(true);
  const [allowTeacherInvites, setAllowTeacherInvites] = useState(true);

  const handleToggle = (checked: boolean) => {
    setLocalDiscoverable(checked);
    if (onToggleDiscoverable) onToggleDiscoverable(checked);
    try {
      localStorage.setItem("vtp_student_discoverable", checked ? "true" : "false");
    } catch (_) {}
  };

  const handleSaveModal = () => {
    setIsManageModalOpen(false);
  };

  return (
    <div
      role="region"
      aria-label="Student Privacy & Teacher Discovery Settings"
      className={`rounded-2xl border border-slate-200/90 bg-white p-6 md:p-7 shadow-xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200/50">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900">
                Teacher Discovery & Privacy
              </h4>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  localDiscoverable
                    ? "bg-teal-50 text-teal-700 border border-teal-200/50"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {localDiscoverable ? "Discoverable by Teachers" : "Private (Hidden)"}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-500 mt-1 leading-relaxed max-w-xl">
              Control whether verified educators can find your learning profile to invite you to specialized classes or suggest custom study plans.
            </p>
          </div>
        </div>

        {/* Switch Control */}
        <div className="flex items-center gap-3 self-start sm:self-center pl-13 sm:pl-0">
          <Switch
            checked={localDiscoverable}
            onCheckedChange={handleToggle}
            aria-label="Toggle Teacher Discovery"
          />
        </div>
      </div>

      {/* Transparent Plain-Language Explanations */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 pt-5 border-t border-slate-100 text-xs">
        <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
            <Eye className="w-3.5 h-3.5 text-teal-600" />
            <span>Who Can Discover You</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Only verified, identity-checked educators on ভার্চুয়াল টিউটর can view discoverable student requests.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>What Teachers See</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Teachers see your grade level, curriculum, and target subjects. Your email, phone, and billing details are <strong className="text-slate-700">never shared</strong>.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Why This Is Useful</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Qualified tutors can proactively reach out with tailored study plans, trial slots, or small-group discounts matching your syllabus.
          </p>
        </div>
      </div>

      {/* Manage Action */}
      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsManageModalOpen(true)}
          className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Manage privacy settings</span>
        </Button>
      </div>

      {/* Detailed Privacy Management Dialog */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Student Privacy & Profile Sharing
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Fine-tune the data visible to verified teachers when browsing student learning requests.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Global Teacher Discoverability
                </p>
                <p className="text-[11px] text-slate-500">
                  Show your student profile in the teacher network directory.
                </p>
              </div>
              <Switch checked={localDiscoverable} onCheckedChange={handleToggle} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Share Academic Goals & Target Exams
                </p>
                <p className="text-[11px] text-slate-500">
                  Allows tutors to match you with curriculum-specific prep materials.
                </p>
              </div>
              <Switch checked={shareGoals} onCheckedChange={setShareGoals} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Share Curriculum & Board Information
                </p>
                <p className="text-[11px] text-slate-500">
                  e.g., Cambridge, Edexcel, IB, National Curriculum English Version.
                </p>
              </div>
              <Switch checked={shareCurriculum} onCheckedChange={setShareCurriculum} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Allow Direct Session Invitations
                </p>
                <p className="text-[11px] text-slate-500">
                  Receive personalized lesson proposals and trial invites.
                </p>
              </div>
              <Switch checked={allowTeacherInvites} onCheckedChange={setAllowTeacherInvites} />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button
              onClick={handleSaveModal}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
