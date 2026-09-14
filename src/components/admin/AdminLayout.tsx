import { useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useAdminStats } from "@/hooks/use-admin-data";
import {
  LayoutDashboard,
  ShieldCheck,
  FileCheck2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Video,
  Star,
  MessageSquare,
  CreditCard,
  Flag,
  Bell,
  History,
  Settings,
  ChevronRight,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorLogsViewerModal } from "@/components/ErrorLogsViewerModal";
import { BrandLogo } from "@/components/BrandLogo";
import { CinematicBackgroundAnimation } from "@/components/redesign/CinematicBackgroundAnimation";

interface AdminLayoutProps {
  children: ReactNode;
}

const adminNavSections = [
  {
    title: "Platform Overview",
    items: [
      { label: "Overview", path: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Verification & Compliance",
    items: [
      { label: "Applications", path: "/admin/applications", icon: FileCheck2, badgeKey: "underReviewApplications" },
      { label: "Verification Queue", path: "/admin/verification", icon: ShieldCheck, badgeKey: "needsAttentionApplications" },
    ],
  },
  {
    title: "User Management",
    items: [
      { label: "All Users", path: "/admin/users", icon: Users },
      { label: "Teachers", path: "/admin/teachers", icon: GraduationCap },
      { label: "Students", path: "/admin/students", icon: BookOpen },
    ],
  },
  {
    title: "Operations & Academics",
    items: [
      { label: "Bookings", path: "/admin/bookings", icon: CalendarCheck },
      { label: "Sessions & Classes", path: "/admin/sessions", icon: Video },
      { label: "Reviews & Ratings", path: "/admin/reviews", icon: Star },
      { label: "Community Posts", path: "/admin/community", icon: MessageSquare },
    ],
  },
  {
    title: "Finance & Moderation",
    items: [
      { label: "Payments & Ledger", path: "/admin/payments", icon: CreditCard },
      { label: "Reports & Flags", path: "/admin/reports", icon: Flag, badgeKey: "pendingReports" },
      { label: "Notifications Log", path: "/admin/notifications", icon: Bell },
      { label: "Audit Logs", path: "/admin/audit-logs", icon: History },
      { label: "Platform Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isErrorLogsOpen, setIsErrorLogsOpen] = useState(false);

  const isSoleAdmin = user?.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com";

  // Authoritative real-time stats
  const stats = useAdminStats();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isCurrentPath = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950/70 backdrop-blur-2xl text-white select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div
          onClick={() => navigate("/admin")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 p-1 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <BrandLogo variant="icon" size={32} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-base font-['Hind_Siliguri',sans-serif]">
                ভার্চুয়াল <span className="text-violet-400 font-black">টিউটর</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-white/80 border border-white/15">
                ADMIN CONSOLE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {adminNavSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-widest font-display">
              {section.title}
            </p>
            <div className="space-y-1 pt-1">
              {section.items.map((item) => {
                const active = isCurrentPath(item.path);
                const Icon = item.icon;
                const badgeCount = item.badgeKey && stats ? (stats as any)[item.badgeKey] : null;

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all group cursor-pointer ${
                      active
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(109,93,251,0.4)]"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-white/50 group-hover:text-violet-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount !== null && badgeCount !== undefined && badgeCount > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-violet-500/20 text-violet-300 border border-violet-400/30"
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-3.5 border-t border-white/10 bg-black/40 shrink-0 space-y-2.5">
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white font-display truncate">{user?.name || "Administrator"}</p>
              <p className="text-[11px] text-white/50 truncate">{user?.email || "admin@liveclass.edu"}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-white/50 hover:text-rose-400 hover:bg-rose-500/20 rounded-full transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3 h-3 text-violet-400" /> Live App
          </button>
          <button
            onClick={() => setIsErrorLogsOpen(true)}
            className="py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Diagnostics"
          >
            <Bug className="w-3 h-3 text-violet-400" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col md:flex-row antialiased overflow-x-hidden selection:bg-violet-500/30">
      {/* Universal Living Atmosphere */}
      <CinematicBackgroundAnimation />

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-40 border-r border-white/10 bg-slate-950/60 backdrop-blur-2xl text-white">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-950/95 backdrop-blur-2xl border-r border-white/12">
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 md:pl-64 flex flex-col min-w-0 bg-transparent">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-white/70 hover:text-white md:hidden rounded-full hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-white/50 font-medium">
              <span className="hidden sm:inline">Console</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 hidden sm:inline" />
              <span className="font-bold text-white capitalize font-display">
                {location.pathname.replace("/admin/", "").replace("/admin", "Overview").replace(/-/g, " ")}
              </span>
            </div>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-3">
            {stats && stats.underReviewApplications > 0 && (
              <button
                onClick={() => navigate("/admin/applications")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/30 border border-violet-400/40 text-violet-200 text-xs font-semibold hover:bg-violet-600/50 transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                <span>{stats.underReviewApplications} Pending Review</span>
              </button>
            )}

            <button
              onClick={() => navigate("/admin/audit-logs")}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors border border-white/10 cursor-pointer"
              title="Audit Logs"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsErrorLogsOpen(true)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors border border-white/10 cursor-pointer"
              title="System Diagnostics"
            >
              <Bug className="w-4 h-4 text-violet-400" />
            </button>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6 text-white">
          {children}
        </main>
      </div>

      {/* Diagnostics Modal */}
      <ErrorLogsViewerModal
        isOpen={isErrorLogsOpen}
        onClose={() => setIsErrorLogsOpen(false)}
      />
    </div>
  );
}
