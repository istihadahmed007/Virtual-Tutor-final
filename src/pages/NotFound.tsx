import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-600/20">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-6xl font-extrabold text-slate-900 mb-4">404</h1>
        <p className="text-lg text-slate-500 mb-8">
          This page doesn't exist. Let's get you back to learning.
        </p>
        <Button
          onClick={() => navigate("/")}
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
