import { useState } from "react";
import {
  Settings,
  Shield,
  Percent,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [platformFee, setPlatformFee] = useState("15");
  const [minHourlyRate, setMinHourlyRate] = useState("10");
  const [requireNid, setRequireNid] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleSave = () => {
    toast.success("Platform configuration updated successfully.");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Platform & Compliance Settings
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Adjust educator onboarding requirements, verification thresholds, platform fees, and system telemetry.
        </p>
      </div>

      <div className="space-y-6">
        {/* Onboarding & Verification Rules */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" /> Teacher Onboarding & Verification Policy
          </h3>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireNid}
                onChange={(e) => setRequireNid(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Require Government ID / Passport</span>
                <span className="text-xs text-slate-500">Teachers must provide valid National ID scans before receiving booking requests.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Realtime Compliance Notifications</span>
                <span className="text-xs text-slate-500">Push immediate alert when a new teacher submits credentials for review.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Financial Rules */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-teal-600" /> Platform Economics & Fees
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Platform Service Fee (%)</label>
              <Input
                type="number"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Minimum Hourly Rate ($ USD)</label>
              <Input
                type="number"
                value={minHourlyRate}
                onChange={(e) => setMinHourlyRate(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl px-6"
          >
            <Save className="w-4 h-4 mr-1.5" /> Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
