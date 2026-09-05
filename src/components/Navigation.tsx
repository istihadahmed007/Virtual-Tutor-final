import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate, useLocation } from "react-router";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ContactModal } from "@/components/ContactModal";
import {
  GraduationCap,
  Users,
  Video,
  MessageCircle,
  BookOpen,
  UserPlus,
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Bell,
  Calendar,
  ClipboardList,
  TrendingUp,
  Sparkles,
  User,
  Settings,
  ShieldCheck,
  FileText,
  Mail,
} from "lucide-react";

const studentLinks = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Find Teachers", path: "/teachers", icon: Users },
  { label: "Lessons", path: "/lessons", icon: Video },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "AI assistant", path: "/ai-assistant", icon: Sparkles },
];

const parentLinks = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Find Teachers", path: "/teachers", icon: Users },
  { label: "Lessons", path: "/lessons", icon: Video },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "Progress", path: "/progress", icon: TrendingUp },
];

const teacherLinks = [
  { label: "Dashboard", path: "/teacher-dashboard", icon: LayoutDashboard },
  { label: "Find Students", path: "/students", icon: Users },
  { label: "Find Teachers", path: "/teachers", icon: GraduationCap },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "My Application", path: "/teacher-application", icon: FileText },
];

const adminLinks = [
  { label: "Admin Console", path: "/admin", icon: ShieldCheck },
  { label: "Applications", path: "/admin/applications", icon: FileText },
  { label: "Teacher Directory", path: "/teachers", icon: Users },
  { label: "Live Dashboard", path: "/dashboard", icon: LayoutDashboard },
];

export function Navigation() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const notifications = useQuery(api.notifications.listByUser);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const isAdmin =
    user?.role === "admin" ||
    user?.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com";
  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";
  const navLinks = isAdmin ? adminLinks : isTeacher ? teacherLinks : isParent ? parentLinks : studentLinks;

  const searchParams = new URLSearchParams(location.search);
  const isMobileActiveChat = location.pathname === "/messages" && Boolean(searchParams.get("id"));

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      {/* Desktop/Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Navigation Group */}
            <div className="flex items-center gap-6 lg:gap-8">
              {/* Logo */}
              <button
                onClick={() =>
                  navigate(
                    isAuthenticated
                      ? isTeacher
                        ? "/teacher-dashboard"
                        : "/dashboard"
                      : "/"
                  )
                }
                className="flex items-center gap-2.5 shrink-0 group focus:outline-none"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  Live<span className="text-teal-600">Class</span>
                </span>
              </button>

              {/* Desktop Nav */}
              {isAuthenticated && (
                <>
                  <div className="h-5 w-px bg-stone-200 hidden md:block" />
                  <div className="hidden md:flex items-center gap-1.5">
                    {navLinks.slice(0, 5).map((link) => {
                      const isActive = location.pathname === link.path;
                      return (
                        <button
                          key={link.path}
                          onClick={() => navigate(link.path)}
                          className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                            isActive
                              ? "bg-teal-50 text-teal-700 font-bold border border-teal-200/70 shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-stone-100/80"
                          }`}
                        >
                          <link.icon className={`w-4 h-4 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
                          {link.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setNotificationsOpen(!notificationsOpen);
                        setProfileOpen(false);
                      }}
                      className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-stone-50 rounded-lg transition-colors"
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {(unreadCount ?? 0) > 0 && (
                        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-[10px] text-white font-bold rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {notificationsOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 py-3 z-50 max-h-[85vh] flex flex-col">
                          <div className="flex items-center justify-between px-4 pb-2 border-b border-stone-100">
                            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                            {(unreadCount ?? 0) > 0 && (
                              <button
                                onClick={async () => {
                                  await markAllAsRead();
                                }}
                                className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                              >
                                Mark all as read
                              </button>
                            )}
                          </div>
                          <div className="overflow-y-auto flex-1 divide-y divide-stone-100">
                            {(!notifications || notifications.length === 0) ? (
                              <div className="p-6 text-center text-xs text-slate-400">
                                No notifications yet
                              </div>
                            ) : (
                              notifications.map((n) => (
                                <div
                                  key={n._id}
                                  onClick={async () => {
                                    if (!n.read) await markAsRead({ notificationId: n._id });
                                    if (n.actionUrl) {
                                      navigate(n.actionUrl);
                                      setNotificationsOpen(false);
                                    }
                                  }}
                                  className={`p-3.5 hover:bg-stone-50 cursor-pointer transition-colors ${!n.read ? "bg-teal-50/40" : ""}`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.read ? "bg-teal-500" : "bg-transparent"}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-800">{n.title}</p>
                                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      id="navbar_profile_dropdown_btn"
                      onClick={() => {
                        setProfileOpen(!profileOpen);
                        setNotificationsOpen(false);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      <ProfileAvatar
                        name={user?.name}
                        image={user?.image || user?.avatarUrl}
                        role={user?.role}
                        size="sm"
                        showStatus={true}
                        status="online"
                      />
                      <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[100px] truncate">{user?.name || "User"}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                    </button>

                    {profileOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in">
                          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center gap-3">
                            <ProfileAvatar
                              name={user?.name}
                              image={user?.image || user?.avatarUrl}
                              role={user?.role}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {isAdmin ? "Platform Admin" : isTeacher ? "Verified Teacher" : isParent ? "Parent / Guardian" : "Verified Student"}
                                </span>
                              </div>
                            </div>
                          </div>
                          {isAdmin && (
                            <button onClick={() => { navigate("/admin"); setProfileOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-indigo-700 font-semibold hover:bg-indigo-50 flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Admin Console
                            </button>
                          )}
                          <button onClick={() => { navigate(isTeacher ? "/teacher-dashboard" : "/dashboard"); setProfileOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-stone-50 flex items-center gap-2.5">
                            <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
                          </button>
                          <button onClick={() => { navigate("/teacher-application"); setProfileOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-teal-700 hover:bg-teal-50 flex items-center gap-2.5">
                            <GraduationCap className="w-4 h-4 text-teal-600" /> {isTeacher ? "Teacher Application & Docs" : "Apply to Teach"}
                          </button>
                          <button onClick={() => { navigate("/profile"); setProfileOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-stone-50 flex items-center gap-2.5">
                            <User className="w-4 h-4 text-slate-400" /> Profile & Verification
                          </button>
                          <button onClick={() => { setContactOpen(true); setProfileOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-stone-50 flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-teal-600" /> Contact Support
                          </button>
                          <div className="border-t border-stone-100 my-1" />
                          <button onClick={() => { handleSignOut(); setProfileOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5">
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setContactOpen(true)} className="hidden sm:inline-flex text-slate-600 hover:text-teal-700">Contact</Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-slate-600 text-xs sm:text-sm px-2.5 sm:px-3">Sign In</Button>
                  <Button size="sm" onClick={() => navigate("/auth")} className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm px-3 sm:px-4 font-semibold">Get Started</Button>
                </div>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-slate-500 hover:bg-stone-50 rounded-lg"
                aria-label="Toggle Navigation Menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-stone-200/60 bg-white shadow-lg animate-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-3 space-y-1">
              {isAuthenticated ? (
                <>
                  {navLinks.map((link) => {
                    const isActive =
                      link.path === "/dashboard" || link.path === "/teacher-dashboard" || link.path === "/admin"
                        ? location.pathname === link.path
                        : location.pathname.startsWith(link.path);
                    return (
                      <button
                        key={link.path}
                        onClick={() => {
                          navigate(link.path);
                          setMobileOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left flex items-center gap-2.5 transition-colors ${
                          isActive ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-stone-50"
                        }`}
                      >
                        <link.icon className="w-4 h-4" /> {link.label}
                      </button>
                    );
                  })}
                  <div className="border-t border-stone-100 my-1 pt-1" />
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setMobileOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left flex items-center gap-2.5 text-slate-600 hover:bg-stone-50"
                  >
                    <User className="w-4 h-4" /> My Profile
                  </button>
                  <button
                    onClick={() => {
                      setContactOpen(true);
                      setMobileOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left flex items-center gap-2.5 text-slate-600 hover:bg-stone-50"
                  >
                    <Mail className="w-4 h-4 text-teal-600" /> Contact Support
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left flex items-center gap-2.5 text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate("/");
                      setMobileOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left flex items-center gap-2.5 text-slate-700 hover:bg-stone-50"
                  >
                    <GraduationCap className="w-4 h-4 text-teal-600" /> Home
                  </button>
                  <button
                    onClick={() => {
                      navigate("/teachers");
                      setMobileOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left flex items-center gap-2.5 text-slate-700 hover:bg-stone-50"
                  >
                    <Users className="w-4 h-4 text-teal-600" /> Find Teachers
                  </button>
                  <button
                    onClick={() => {
                      setContactOpen(true);
                      setMobileOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-left flex items-center gap-2.5 text-slate-700 hover:bg-stone-50"
                  >
                    <Mail className="w-4 h-4 text-teal-600" /> Contact Support
                  </button>
                  <div className="border-t border-stone-100 my-1 pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => {
                        navigate("/auth");
                        setMobileOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="flex-1 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                      onClick={() => {
                        navigate("/auth");
                        setMobileOpen(false);
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Contact Support Modal */}
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />

      {/* Mobile Bottom Navigation */}
      {isAuthenticated && !isMobileActiveChat && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-around py-1.5 px-1">
            {navLinks.slice(0, 5).map((link) => {
              const isActive =
                link.path === "/dashboard" || link.path === "/teacher-dashboard" || link.path === "/admin"
                  ? location.pathname === link.path
                  : location.pathname.startsWith(link.path);
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors relative min-w-[54px] ${
                    isActive ? "text-teal-600 font-semibold" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <link.icon className={`w-5 h-5 ${isActive ? "text-teal-600 stroke-[2.5]" : "stroke-[1.75]"}`} />
                  <span className="text-[10px] leading-tight truncate">{link.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
