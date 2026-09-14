import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-6 relative z-10">
      <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/12 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-600/30">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-7xl font-extrabold text-white font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            404
          </h1>
          <p className="text-base text-white/70 mt-3 font-medium">
            This page doesn't exist or has moved. Let's get you back to learning.
          </p>
        </div>
        <Button
          onClick={() => navigate("/")}
          className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white gap-2 px-6 py-2.5 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
