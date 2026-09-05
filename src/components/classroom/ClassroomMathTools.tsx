import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Grid,
  Square,
  Circle,
  Triangle,
  Plus,
  Trash2,
  Copy,
  Check,
  Sigma,
  Pi,
} from "lucide-react";

export function ClassroomMathTools() {
  const [equation, setEquation] = useState<string>("f(x) = 2x + 1");
  const [copied, setCopied] = useState(false);

  // Graph state
  const [graphType, setGraphType] = useState<"linear" | "quadratic" | "sine" | "circle">("linear");
  const [paramA, setParamA] = useState<number>(2);
  const [paramB, setParamB] = useState<number>(1);
  const [paramC, setParamC] = useState<number>(-4);

  // Geometry tool state
  const [geoShape, setGeoShape] = useState<"right_triangle" | "circle" | "rectangle">("right_triangle");
  const [triangleBase, setTriangleBase] = useState<number>(3);
  const [triangleHeight, setTriangleHeight] = useState<number>(4);

  const mathSymbols = [
    { label: "x²", insert: "^2" },
    { label: "√x", insert: "√(" },
    { label: "a/b", insert: " / " },
    { label: "π", insert: "π" },
    { label: "θ", insert: "θ" },
    { label: "α", insert: "α" },
    { label: "β", insert: "β" },
    { label: "Δ", insert: "Δ" },
    { label: "∞", insert: "∞" },
    { label: "∫", insert: "∫" },
    { label: "∑", insert: "∑" },
    { label: "±", insert: "±" },
    { label: "≤", insert: "≤" },
    { label: "≥", insert: "≥" },
    { label: "≠", insert: "≠" },
    { label: "×", insert: "×" },
    { label: "÷", insert: "÷" },
    { label: "sin", insert: "sin(" },
    { label: "cos", insert: "cos(" },
    { label: "tan", insert: "tan(" },
    { label: "log", insert: "log(" },
    { label: "lim", insert: "lim " },
  ];

  const handleInsertSymbol = (sym: string) => {
    setEquation((prev) => prev + sym);
  };

  const copyFormula = () => {
    navigator.clipboard.writeText(equation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute hypotenuse for triangle
  const hypotenuse = Math.sqrt(triangleBase * triangleBase + triangleHeight * triangleHeight).toFixed(2);
  const triangleArea = ((triangleBase * triangleHeight) / 2).toFixed(2);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto p-4 select-none">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Math & Science Workspace</h2>
              <p className="text-[11px] text-slate-400">Interactive Formula Editor, Function Plotter & Geometry Visualizer</p>
            </div>
          </div>
        </div>

        {/* 1. Formula & Equation Builder */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sigma className="w-3.5 h-3.5" /> Equation & Symbol Palette
            </h3>
            <button
              onClick={copyFormula}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="relative mb-3">
            <input
              type="text"
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              placeholder="e.g. f(x) = a·x² + b·x + c"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>

          {/* Math Symbols buttons */}
          <div className="flex flex-wrap gap-1.5">
            {mathSymbols.map((s) => (
              <button
                key={s.label}
                onClick={() => handleInsertSymbol(s.insert)}
                className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-teal-600 hover:text-white text-slate-200 rounded-lg text-xs font-mono font-medium transition-colors border border-slate-600/50"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Interactive Coordinate Function Plotter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5" /> Function Grapher
              </h3>

              {/* Function Selector */}
              <div className="flex items-center gap-2 mb-4">
                {[
                  { id: "linear" as const, label: "Linear (y=mx+c)" },
                  { id: "quadratic" as const, label: "Quadratic (y=ax²+c)" },
                  { id: "sine" as const, label: "Trig sin(ax)" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setGraphType(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      graphType === f.id ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Parameter Sliders */}
              <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Parameter a (Slope / Amplitude): {paramA}</span>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={paramA}
                    onChange={(e) => setParamA(parseFloat(e.target.value))}
                    className="w-28 accent-teal-500"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Parameter b / c (Offset): {paramB}</span>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={paramB}
                    onChange={(e) => setParamB(parseFloat(e.target.value))}
                    className="w-28 accent-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic SVG Plot */}
            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl h-44 relative flex items-center justify-center overflow-hidden">
              <svg viewBox="-100 -50 200 100" className="w-full h-full">
                {/* Axes */}
                <line x1="-100" y1="0" x2="100" y2="0" stroke="#475569" strokeWidth="1" />
                <line x1="0" y1="-50" x2="0" y2="50" stroke="#475569" strokeWidth="1" />

                {/* Grid Lines */}
                {[-75, -50, -25, 25, 50, 75].map((x) => (
                  <line key={x} x1={x} y1="-50" x2={x} y2="50" stroke="#1E293B" strokeWidth="0.5" />
                ))}

                {/* Function Curve */}
                {graphType === "linear" && (
                  <line
                    x1="-100"
                    y1={-(paramA * -100 + paramB * 5)}
                    x2="100"
                    y2={-(paramA * 100 + paramB * 5)}
                    stroke="#14B8A6"
                    strokeWidth="2.5"
                  />
                )}

                {graphType === "quadratic" && (
                  <path
                    d={`M -100 ${-(0.05 * paramA * 100 * 100 + paramB * 5)} Q 0 ${-(paramB * 5)} 100 ${-(0.05 * paramA * 100 * 100 + paramB * 5)}`}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                  />
                )}

                {graphType === "sine" && (
                  <path
                    d="M -100 0 Q -75 -30 -50 0 T 0 0 T 50 0 T 100 0"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2.5"
                  />
                )}
              </svg>
              <span className="absolute bottom-2 left-2 text-[10px] text-teal-400 font-mono">
                {graphType === "linear" && `y = ${paramA}x + ${paramB}`}
                {graphType === "quadratic" && `y = ${paramA}x² + ${paramB}`}
                {graphType === "sine" && `y = ${paramA}·sin(x)`}
              </span>
            </div>
          </div>

          {/* 3. Geometry Visualizer */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Triangle className="w-3.5 h-3.5" /> Geometry Shape Constructor
              </h3>

              {/* Triangle parameter inputs */}
              <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800 mb-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Base (a): {triangleBase} units</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={triangleBase}
                    onChange={(e) => setTriangleBase(parseFloat(e.target.value))}
                    className="w-28 accent-teal-500"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Height (b): {triangleHeight} units</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={triangleHeight}
                    onChange={(e) => setTriangleHeight(parseFloat(e.target.value))}
                    className="w-28 accent-teal-500"
                  />
                </div>
              </div>

              {/* Geometric Calculations */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-teal-950/40 border border-teal-800/40 rounded-lg text-teal-300">
                  <p className="text-[10px] text-slate-400">Hypotenuse (c)</p>
                  <p className="font-mono font-bold text-sm">c = {hypotenuse}</p>
                </div>
                <div className="p-2 bg-indigo-950/40 border border-indigo-800/40 rounded-lg text-indigo-300">
                  <p className="text-[10px] text-slate-400">Area (A = ½·b·h)</p>
                  <p className="font-mono font-bold text-sm">{triangleArea} sq units</p>
                </div>
              </div>
            </div>

            {/* Shape SVG Render */}
            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl h-44 flex items-center justify-center p-4 relative">
              <svg viewBox="0 0 150 100" className="w-full h-full">
                {/* Right Triangle */}
                <polygon
                  points="20,80 120,80 20,20"
                  fill="rgba(13, 148, 136, 0.15)"
                  stroke="#14B8A6"
                  strokeWidth="2"
                />
                {/* Right angle marker */}
                <rect x="20" y="70" width="10" height="10" fill="none" stroke="#14B8A6" strokeWidth="1.5" />
                {/* Labels */}
                <text x="70" y="95" fill="#94A3B8" fontSize="9" textAnchor="middle">
                  Base = {triangleBase}
                </text>
                <text x="10" y="55" fill="#94A3B8" fontSize="9" textAnchor="middle">
                  h = {triangleHeight}
                </text>
                <text x="80" y="45" fill="#38BDF8" fontSize="9" fontWeight="bold">
                  c = {hypotenuse}
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
