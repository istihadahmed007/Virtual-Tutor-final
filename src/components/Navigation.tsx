import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate, useLocation } from "react-router";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ContactModal } from "@/components/ContactModal";
import { BrandLogo } from "@/components/BrandLogo";
import { PillButton, PrimaryButton } from "@/components/redesign/Buttons";
import {
  GraduationCap,
  Users,
  Video,
  MessageCircle,
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Bell,
  Calendar,
  Sparkles,
  User,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
  Mail,
} from "lucide-react";

const publicLinks = [
  { label: "Find Tutors", path: "/teachers" },
  { label: "How It Works", path: "/#how-it-works" },
  { label: "Become a Tutor", path: "/teacher-application" },
  { label: "Community", path: "/community" },
  { label: "FAQ", path: "/#faq" },
];

const studentLinks = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Find Tutors", path: "/teachers", icon: Users },
  { label: "Lessons", path: "/lessons", icon: Video },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Assignments", path: "/assignments", icon: FileText },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "AI Assistant", path: "/ai-assistant", icon: Sparkles },
];

const teacherLinks = [
  { label: "Dashboard", path: "/teacher-dashboard", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "Application", path: "/teacher-application", icon: FileText },
];

const adminLinks = [
  { label: "Admin Console", path: "/admin", icon: ShieldCheck },
  { label: "Applications", path: "/admin/applications", icon: FileText },
  { label: "Tutors Directory", path: "/teachers", icon: Users },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
];

export function Navigation() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const notifications = useQuery(api.notifications.listByUser);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const isAdmin =
    user?.role === "admin" ||
    user?.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com";
  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";
  const navLinks = isAdmin
    ? adminLinks
    : isTeacher
      ? teacherLinks
      : studentLinks;

  const searchParams = new URLSearchParams(location.search);
  const isMobileActiveChat =
    location.pathname === "/messages" && Boolean(searchParams.get("id"));

  // Live London / Local Clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/London",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date());
        setCurrentTime(timeStr);
      } catch {
        const d = new Date();
        setCurrentTime(
          `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
        );
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleLinkClick = (path: string) => {
    if (path.startsWith("/#")) {
      if (location.pathname !== "/") {
        navigate("/" + path.slice(1));
      } else {
        const id = path.replace("/#", "");
        const elem = document.getElementById(id);
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      navigate(path);
    }
    setMobileOpen(false);
  };

  return (
    <>
      {/* Floating Centered Pill Navbar */}
      <header className={`sticky z-50 px-3 sm:px-6 max-w-[1280px] mx-auto pointer-events-none transition-all duration-300 ${
        isScrolled ? "top-2 sm:top-2.5" : "top-3 sm:top-4"
      }`}>
        <div className={`pointer-events-auto bg-[#07142F]/75 hover:bg-[#07142F]/85 backdrop-blur-2xl rounded-full border border-white/10 transition-all duration-300 flex items-center justify-between text-white ${
          isScrolled
            ? "px-3 sm:px-4 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] border-white/14"
            : "px-3 sm:px-5 py-2 sm:py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]"
        }`}>
          {/* LEFT: Logo & Brand */}
          <div className="flex items-center gap-3 sm:gap-6">
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
              className="flex items-center shrink-0 focus:outline-hidden rounded-full cursor-pointer hover:opacity-90 transition-opacity"
            >
              <BrandLogo variant="horizontal" size="sm" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {!isAuthenticated ? (
                publicLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => handleLinkClick(link.path)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/75 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))
              ) : (
                navLinks.slice(0, 5).map((link) => {
                  const isActive =
                    link.path === "/dashboard" ||
                    link.path === "/teacher-dashboard" ||
                    link.path === "/admin"
                      ? location.pathname === link.path
                      : location.pathname.startsWith(link.path);
                  return (
                    <button
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-[#4169E1]/20 text-[#8EA7FF] border border-[#4169E1]/35 shadow-[0_0_14px_rgba(65,105,225,0.25)]"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <link.icon className="w-3.5 h-3.5" />
                      {link.label}
                    </button>
                  );
                })
              )}
            </nav>
          </div>

          {/* RIGHT: Status, Time, Actions, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Clock (Hidden on small mobile) */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/75 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <Clock className="w-3.5 h-3.5 text-[#5B7CFF]" />
              <span>{currentTime ? `${currentTime} in London` : "Live"}</span>
            </div>

            {/* Authenticated Controls */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setProfileOpen(false);
                    }}
                    className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {(unreadCount ?? 0) > 0 && (
                      <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-[#4169E1] text-[10px] text-white font-bold rounded-full flex items-center justify-center shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popover */}
                  {notificationsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setNotificationsOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-[#0B1D41]/95 backdrop-blur-2xl rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/12 py-3 z-50 max-h-[80vh] flex flex-col text-white">
                        <div className="flex items-center justify-between px-4 pb-2 border-b border-white/10">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Notifications
                          </h3>
                          {(unreadCount ?? 0) > 0 && (
                            <button
                              onClick={() => markAllAsRead()}
                              className="text-xs text-[#8EA7FF] hover:underline font-semibold cursor-pointer"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-white/10">
                          {!notifications || notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-white/50">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n._id}
                                onClick={async () => {
                                  if (!n.read)
                                    await markAsRead({ notificationId: n._id });
                                  if (n.actionUrl) {
                                    navigate(n.actionUrl);
                                    setNotificationsOpen(false);
                                  }
                                }}
                                className={`p-3.5 hover:bg-white/10 cursor-pointer transition-colors ${
                                  !n.read ? "bg-[#4169E1]/15" : ""
                                }`}
                              >
                                <p className="text-xs font-bold text-white">
                                  {n.title}
                                </p>
                                <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-white/40 mt-1">
                                  {new Date(n.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileOpen(!profileOpen);
                      setNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/15 cursor-pointer text-white"
                  >
                    <ProfileAvatar
                      name={user?.name}
                      image={user?.image || user?.avatarUrl}
                      role={user?.role}
                      size="sm"
                      showStatus={true}
                      status="online"
                    />
                    <span className="text-xs font-medium text-white hidden sm:block max-w-[90px] truncate">
                      {user?.name || "Account"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/60 hidden sm:block" />
                  </button>

                  {profileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-3 w-64 bg-[#0B1D41]/95 backdrop-blur-2xl rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/12 py-2 z-50 text-white">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                          <ProfileAvatar
                            name={user?.name}
                            image={user?.image || user?.avatarUrl}
                            role={user?.role}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">
                              {user?.name}
                            </p>
                            <p className="text-[11px] text-white/50 truncate">
                              {user?.email}
                            </p>
                            <span className="inline-block mt-1 text-[10px] font-semibold text-[#8EA7FF] bg-[#4169E1]/20 px-2 py-0.5 rounded-full border border-[#4169E1]/30">
                              {isAdmin
                                ? "Platform Admin"
                                : isTeacher
                                  ? "Verified Tutor"
                                  : isParent
                                    ? "Parent"
                                    : "Student"}
                            </span>
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              navigate("/admin");
                              setProfileOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs text-white font-semibold hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-[#5B7CFF]" />{" "}
                            Admin Console
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigate(
                              isTeacher ? "/teacher-dashboard" : "/dashboard"
                            );
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-white/90 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-white/60" />{" "}
                          Dashboard
                        </button>
                        <button
                          onClick={() => {
                            navigate("/teacher-application");
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-white/90 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 text-[#5B7CFF]" />{" "}
                          {isTeacher ? "Tutor Portal" : "Apply to Teach"}
                        </button>
                        <button
                          onClick={() => {
                            navigate("/profile");
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-white/90 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                        >
                          <User className="w-4 h-4 text-white/60" /> Profile &
                          Settings
                        </button>
                        <button
                          onClick={() => {
                            setContactOpen(true);
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-white/90 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Mail className="w-4 h-4 text-white/60" /> Support
                        </button>

                        <div className="border-t border-white/10 my-1" />
                        <button
                          onClick={() => {
                            handleSignOut();
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Public Call-To-Action buttons */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/auth")}
                  className="text-xs font-semibold text-white/80 hover:text-white px-3.5 py-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <PrimaryButton
                  size="sm"
                  onClick={() => navigate("/auth?mode=register")}
                  className="shrink-0"
                >
                  Start Learning
                </PrimaryButton>
              </div>
            )}

            {/* Mobile Circular Menu Trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 border border-white/15 cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Contact Support Modal */}
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />

      {/* MOBILE SLIDE-UP BOTTOM SHEET MENU */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="relative z-10 bg-[#07142F]/95 backdrop-blur-3xl text-white rounded-t-3xl sm:rounded-3xl mx-0 sm:mx-4 mb-0 sm:mb-4 p-6 sm:p-8 max-h-[85vh] overflow-y-auto border border-white/12 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Header bar with close button and live time */}
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                <span className="w-2 h-2 rounded-full bg-[#4169E1] animate-pulse" />
                <span>{currentTime ? `${currentTime} in London` : "Live"}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links */}
            <div className="py-6 space-y-4">
              {!isAuthenticated
                ? publicLinks.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => handleLinkClick(link.path)}
                      className="block w-full text-left text-2xl font-medium tracking-tight text-white hover:text-[#5B7CFF] transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  ))
                : navLinks.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => {
                        navigate(link.path);
                        setMobileOpen(false);
                      }}
                      className="flex items-center justify-between w-full text-left text-xl font-medium text-white hover:text-[#5B7CFF] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <link.icon className="w-5 h-5 text-[#5B7CFF]" />
                        {link.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-white/40" />
                    </button>
                  ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-white/10 space-y-3">
              {!isAuthenticated ? (
                <>
                  <PrimaryButton
                    size="lg"
                    className="w-full justify-between"
                    onClick={() => {
                      navigate("/auth");
                      setMobileOpen(false);
                    }}
                  >
                    Start learning
                  </PrimaryButton>
                  <button
                    onClick={() => {
                      navigate("/auth");
                      setMobileOpen(false);
                    }}
                    className="w-full text-center py-2 text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                  >
                    Already have an account? Sign in
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setMobileOpen(false);
                    }}
                    className="flex-1 py-3 text-center rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer border border-white/10"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                    className="flex-1 py-3 text-center rounded-full bg-rose-500/10 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 cursor-pointer border border-rose-500/20"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Dock (When logged in) */}
      {isAuthenticated && !isMobileActiveChat && (
        <nav className="md:hidden fixed bottom-3 left-4 right-4 bg-[#07142F]/85 backdrop-blur-2xl border border-white/12 rounded-full z-40 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.10)]">
          <div className="flex items-center justify-around">
            {navLinks.slice(0, 5).map((link) => {
              const isActive =
                link.path === "/dashboard" ||
                link.path === "/teacher-dashboard" ||
                link.path === "/admin"
                  ? location.pathname === link.path
                  : location.pathname.startsWith(link.path);
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? "text-[#8EA7FF] font-bold drop-shadow-[0_0_8px_rgba(65,105,225,0.4)]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight mt-0.5">
                    {link.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
