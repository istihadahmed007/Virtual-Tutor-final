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
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div
          onClick={() => navigate("/admin")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
            <BrandLogo variant="icon" size={32} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-base font-['Hind_Siliguri',sans-serif]">
                ভার্চুয়াল <span className="text-sky-400">টিউটর</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                ADMIN CONSOLE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {adminNavSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-0.5 pt-1">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      active
                        ? "bg-teal-600 text-white font-bold shadow-sm shadow-teal-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount !== null && badgeCount !== undefined && badgeCount > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          active
                            ? "bg-white text-teal-700"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
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
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || "Administrator"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || "admin@liveclass.edu"}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Live App
          </button>
          <button
            onClick={() => setIsErrorLogsOpen(true)}
            className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
            title="Diagnostics"
          >
            <Bug className="w-3 h-3 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row antialiased">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-40 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-stone-200 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-stone-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="hidden sm:inline">Admin Console</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <span className="font-bold text-slate-800 capitalize">
                {location.pathname.replace("/admin/", "").replace("/admin", "Overview").replace(/-/g, " ")}
              </span>
            </div>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-3">
            {stats && stats.underReviewApplications > 0 && (
              <button
                onClick={() => navigate("/admin/applications")}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>{stats.underReviewApplications} Pending Review</span>
              </button>
            )}

            <button
              onClick={() => navigate("/admin/audit-logs")}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-stone-100 rounded-xl transition-colors"
              title="Audit Logs"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsErrorLogsOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-stone-100 rounded-xl transition-colors"
              title="System Diagnostics"
            >
              <Bug className="w-4 h-4 text-amber-600" />
            </button>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
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
