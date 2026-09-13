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
      <header className={`sticky z-50 px-3 sm:px-6 max-w-[1440px] mx-auto pointer-events-none transition-all duration-300 ${
        isScrolled ? "top-2 sm:top-2.5" : "top-3 sm:top-4"
      }`}>
        <div className={`pointer-events-auto bg-white/95 backdrop-blur-md rounded-full border border-[#E5E4DE] transition-all duration-300 flex items-center justify-between ${
          isScrolled
            ? "px-3 sm:px-4 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            : "px-3 sm:px-5 py-2 sm:py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
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
              className="flex items-center shrink-0 focus:outline-hidden rounded-full cursor-pointer"
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
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#111111]/70 hover:text-[#111111] hover:bg-[#F5F4EF] transition-all cursor-pointer"
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
                          ? "bg-[#111111] text-white"
                          : "text-[#111111]/70 hover:text-[#111111] hover:bg-[#F5F4EF]"
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
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#111111]/60 px-3 py-1 rounded-full bg-[#F5F4EF] border border-[#E5E4DE]/60">
              <Clock className="w-3.5 h-3.5 text-[#F26522]" />
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
                    className="relative p-2 text-[#111111]/70 hover:text-[#111111] hover:bg-[#F5F4EF] rounded-full transition-colors cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {(unreadCount ?? 0) > 0 && (
                      <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-[#F26522] text-[10px] text-white font-bold rounded-full flex items-center justify-center">
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
                      <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-[#E5E4DE] py-3 z-50 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between px-4 pb-2 border-b border-[#E5E4DE]">
                          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                            Notifications
                          </h3>
                          {(unreadCount ?? 0) > 0 && (
                            <button
                              onClick={() => markAllAsRead()}
                              className="text-xs text-[#F26522] hover:underline font-semibold cursor-pointer"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-[#E5E4DE]/60">
                          {!notifications || notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-[#111111]/40">
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
                                className={`p-3.5 hover:bg-[#F5F4EF] cursor-pointer transition-colors ${
                                  !n.read ? "bg-[#F26522]/5" : ""
                                }`}
                              >
                                <p className="text-xs font-bold text-[#111111]">
                                  {n.title}
                                </p>
                                <p className="text-xs text-[#111111]/70 mt-0.5 leading-relaxed">
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-[#111111]/40 mt-1">
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
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-[#F5F4EF] transition-colors border border-transparent hover:border-[#E5E4DE] cursor-pointer"
                  >
                    <ProfileAvatar
                      name={user?.name}
                      image={user?.image || user?.avatarUrl}
                      role={user?.role}
                      size="sm"
                      showStatus={true}
                      status="online"
                    />
                    <span className="text-xs font-medium text-[#111111] hidden sm:block max-w-[90px] truncate">
                      {user?.name || "Account"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#111111]/50 hidden sm:block" />
                  </button>

                  {profileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-[#E5E4DE] py-2 z-50">
                        <div className="px-4 py-3 border-b border-[#E5E4DE] flex items-center gap-3">
                          <ProfileAvatar
                            name={user?.name}
                            image={user?.image || user?.avatarUrl}
                            role={user?.role}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#111111] truncate">
                              {user?.name}
                            </p>
                            <p className="text-[11px] text-[#111111]/50 truncate">
                              {user?.email}
                            </p>
                            <span className="inline-block mt-1 text-[10px] font-semibold text-[#F26522] bg-[#F26522]/10 px-2 py-0.5 rounded-full">
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
                            className="w-full px-4 py-2.5 text-left text-xs text-[#111111] font-semibold hover:bg-[#F5F4EF] flex items-center gap-2.5 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 text-[#F26522]" />{" "}
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
                          className="w-full px-4 py-2.5 text-left text-xs text-[#111111] hover:bg-[#F5F4EF] flex items-center gap-2.5 cursor-pointer"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#111111]/50" />{" "}
                          Dashboard
                        </button>
                        <button
                          onClick={() => {
                            navigate("/teacher-application");
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-[#111111] hover:bg-[#F5F4EF] flex items-center gap-2.5 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 text-[#F26522]" />{" "}
                          {isTeacher ? "Tutor Portal" : "Apply to Teach"}
                        </button>
                        <button
                          onClick={() => {
                            navigate("/profile");
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-[#111111] hover:bg-[#F5F4EF] flex items-center gap-2.5 cursor-pointer"
                        >
                          <User className="w-4 h-4 text-[#111111]/50" /> Profile &
                          Settings
                        </button>
                        <button
                          onClick={() => {
                            setContactOpen(true);
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-[#111111] hover:bg-[#F5F4EF] flex items-center gap-2.5 cursor-pointer"
                        >
                          <Mail className="w-4 h-4 text-[#111111]/50" /> Support
                        </button>

                        <div className="border-t border-[#E5E4DE] my-1" />
                        <button
                          onClick={() => {
                            handleSignOut();
                            setProfileOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
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
                  className="text-xs font-semibold text-[#111111]/80 hover:text-[#111111] px-3.5 py-2 rounded-full hover:bg-[#F5F4EF] transition-colors cursor-pointer"
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
              className="md:hidden w-9 h-9 bg-[#111111] text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl mx-0 sm:mx-4 mb-0 sm:mb-4 p-6 sm:p-8 max-h-[85vh] overflow-y-auto border border-[#E5E4DE] shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Header bar with close button and live time */}
            <div className="flex items-center justify-between pb-6 border-b border-[#E5E4DE]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#111111]/60">
                <span className="w-2 h-2 rounded-full bg-[#F26522] animate-pulse" />
                <span>{currentTime ? `${currentTime} in London` : "Live"}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-full bg-[#F5F4EF] flex items-center justify-center text-[#111111] hover:bg-[#E5E4DE] transition-colors cursor-pointer"
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
                      className="block w-full text-left text-2xl font-medium tracking-tight text-[#111111] hover:text-[#F26522] transition-colors cursor-pointer"
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
                      className="flex items-center justify-between w-full text-left text-xl font-medium text-[#111111] hover:text-[#F26522] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <link.icon className="w-5 h-5 text-[#F26522]" />
                        {link.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#111111]/30" />
                    </button>
                  ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#E5E4DE] space-y-3">
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
                    className="w-full text-center py-2 text-xs font-semibold text-[#111111]/70 hover:text-[#111111] cursor-pointer"
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
                    className="flex-1 py-3 text-center rounded-full bg-[#F5F4EF] text-xs font-semibold text-[#111111] cursor-pointer"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                    className="flex-1 py-3 text-center rounded-full bg-red-50 text-xs font-semibold text-red-600 cursor-pointer"
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
        <nav className="md:hidden fixed bottom-3 left-4 right-4 bg-white/95 backdrop-blur-md border border-[#E5E4DE] rounded-full z-40 px-2 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
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
                      ? "text-[#F26522] font-bold"
                      : "text-[#111111]/50 hover:text-[#111111]"
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
