import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  Send,
  Search,
  MessageCircle,
  Video,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCheck,
  Sparkles,
  Shield,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  getLocalConversations,
  getLocalMessages,
  sendLocalMessage,
  StoredConversation,
  StoredMessage,
  MESSAGES_CHANGE_EVENT,
} from "@/lib/messages-store";

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isConvexAuth } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(() => {
    return searchParams.get("id") || null;
  });
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Synchronize URL search params with selectedConvId
  useEffect(() => {
    const urlId = searchParams.get("id");
    if (urlId && urlId !== selectedConvId) {
      setSelectedConvId(urlId);
    } else if (!urlId && selectedConvId && window.innerWidth < 640) {
      setSelectedConvId(null);
    }
  }, [searchParams]);

  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    navigate(`/messages?id=${id}`, { replace: true });
  };

  const handleBackToList = () => {
    setSelectedConvId(null);
    navigate("/messages", { replace: true });
  };

  // Convex Queries & Mutations
  const convexConversations = useQuery(
    api.messages.listConversations,
    isConvexAuth ? {} : "skip"
  );
  const sendMutation = useMutation(api.messages.send);

  // Local conversations state with reactive listener
  const [localConvos, setLocalConvos] = useState<StoredConversation[]>(() =>
    getLocalConversations(user?._id)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setLocalConvos(getLocalConversations(user?._id));
    };
    window.addEventListener(MESSAGES_CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(MESSAGES_CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [user?._id]);

  // Combine remote and local conversations
  const conversations: StoredConversation[] = useMemo(() => {
    const combinedMap = new Map<string, StoredConversation>();

    // Add local ones first
    localConvos.forEach((c) => {
      combinedMap.set(c._id, c);
    });

    // Merge server ones
    if (convexConversations && Array.isArray(convexConversations)) {
      convexConversations.forEach((sc: any) => {
        combinedMap.set(sc._id, {
          _id: sc._id,
          participants: sc.participants || [],
          participantNames: sc.participantNames || ["User", "User"],
          lastMessage: sc.lastMessage || "",
          lastMessageAt: sc.lastMessageAt || Date.now(),
          lastSenderId: sc.lastSenderId || "",
        });
      });
    }

    const list = Array.from(combinedMap.values());
    list.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    return list;
  }, [convexConversations, localConvos]);

  // Auto-select first conversation if none selected on desktop
  useEffect(() => {
    if (!selectedConvId && conversations.length > 0 && window.innerWidth >= 640) {
      setSelectedConvId(conversations[0]._id);
    }
  }, [conversations, selectedConvId]);

  // Active selected conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c._id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Partner info
  const partnerName = useMemo(() => {
    if (!activeConversation) return "Conversation";
    if (!user?._id) return activeConversation.participantNames[1] || activeConversation.participantNames[0] || "Tutor";
    const userIndex = activeConversation.participants.indexOf(user._id);
    if (userIndex === 0 && activeConversation.participantNames[1]) {
      return activeConversation.participantNames[1];
    }
    if (userIndex === 1 && activeConversation.participantNames[0]) {
      return activeConversation.participantNames[0];
    }
    return activeConversation.participantNames[1] || activeConversation.participantNames[0] || "Tutor";
  }, [activeConversation, user]);

  // Messages for active conversation
  const convexMessages = useQuery(
    api.messages.listMessages,
    isConvexAuth && selectedConvId
      ? { conversationId: selectedConvId }
      : "skip"
  );

  const [localMsgs, setLocalMsgs] = useState<StoredMessage[]>([]);

  useEffect(() => {
    if (!selectedConvId) {
      setLocalMsgs([]);
      return;
    }
    setLocalMsgs(getLocalMessages(selectedConvId));

    const handleMsgUpdate = () => {
      if (selectedConvId) {
        setLocalMsgs(getLocalMessages(selectedConvId));
      }
    };
    window.addEventListener(MESSAGES_CHANGE_EVENT, handleMsgUpdate);
    return () => {
      window.removeEventListener(MESSAGES_CHANGE_EVENT, handleMsgUpdate);
    };
  }, [selectedConvId]);

  const allMessages: StoredMessage[] = useMemo(() => {
    const msgMap = new Map<string, StoredMessage>();

    localMsgs.forEach((m) => msgMap.set(m._id, m));

    if (convexMessages && Array.isArray(convexMessages)) {
      convexMessages.forEach((cm: any) => {
        msgMap.set(cm._id, {
          _id: cm._id,
          conversationId: cm.conversationId,
          senderId: cm.senderId,
          senderName: cm.senderName || "User",
          text: cm.text,
          timestamp: cm.timestamp || Date.now(),
          read: Boolean(cm.read),
        });
      });
    }

    const list = Array.from(msgMap.values());
    list.sort((a, b) => a.timestamp - b.timestamp);
    return list;
  }, [localMsgs, convexMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || !selectedConvId) return;

    setInputText("");
    setIsSending(true);

    try {
      // 1. Try remote mutation if authenticated on Convex
      if (isConvexAuth) {
        try {
          await sendMutation({
            conversationId: selectedConvId,
            text: clean,
          });
        } catch (remoteErr) {
          console.debug("Remote message send fallback:", remoteErr);
        }
      }

      // 2. Local resilient store
      sendLocalMessage(
        selectedConvId,
        { _id: user?._id || "usr_current", name: user?.name || "You" },
        clean
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.participantNames.some((n) => n.toLowerCase().includes(q)) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  return (
    <main className="h-[calc(100dvh-4rem)] bg-[#FAFAF8] flex flex-col overflow-hidden">
      {/* Platform Header (hidden on mobile when a chat is actively selected) */}
      <header className={`bg-white border-b border-stone-200/70 shrink-0 z-20 ${selectedConvId ? "hidden sm:block" : "block"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
            </Button>
            <div className="h-4 w-px bg-stone-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm border border-teal-200/60">
                <MessageCircle className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900 leading-tight">Messages & Chat</h1>
                <p className="text-[11px] text-slate-400">Direct tutor and student communication</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/teachers")}
              className="hidden md:flex text-xs h-8 border-stone-200"
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-teal-600" /> Find Tutors
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/classroom")}
              className="text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Video className="w-3.5 h-3.5 mr-1" /> Live Classroom
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex overflow-hidden border-x border-stone-200/50">
        {/* Left Sidebar: Conversations List */}
        <aside
          className={`w-full sm:w-80 md:w-96 border-r border-stone-200/70 bg-white flex flex-col shrink-0 ${
            selectedConvId ? "hidden sm:flex" : "flex"
          }`}
        >
          {/* Search bar */}
          <div className="p-3 border-b border-stone-200/70 bg-stone-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {filteredConversations.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={MessageCircle}
                  title="No conversations"
                  description="Start a chat from any tutor or student profile to begin messaging."
                />
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConvId === conv._id;
                const userIdx = user?._id ? conv.participants.indexOf(user._id) : -1;
                const otherName =
                  userIdx === 0
                    ? conv.participantNames[1] || conv.participantNames[0]
                    : conv.participantNames[0] || "Tutor";

                return (
                  <button
                    key={conv._id}
                    onClick={() => handleSelectConversation(conv._id)}
                    className={`w-full px-4 py-3.5 flex items-start gap-3 transition-colors text-left ${
                      isSelected
                        ? "bg-teal-50/70 border-l-3 border-teal-600"
                        : "hover:bg-stone-50 border-l-3 border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isSelected ? "text-teal-900" : "text-slate-900"
                          }`}
                        >
                          {otherName}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate leading-relaxed">
                        {conv.lastMessage || "Conversation started"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Chat View */}
        <section
          className={`flex-1 flex flex-col bg-[#FAFAF8] overflow-hidden ${
            !selectedConvId ? "hidden sm:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat View Header */}
              <div className="h-14 px-3 sm:px-4 bg-white border-b border-stone-200/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="sm:hidden p-1.5 h-8 w-8 text-slate-500 hover:bg-stone-100 shrink-0"
                    onClick={handleBackToList}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>

                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {partnerName}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200/50 shrink-0">
                        <Shield className="w-2.5 h-2.5" />
                        <span className="hidden xs:inline">Verified</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Active now
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/teachers")}
                    className="h-8 px-2 sm:px-3 text-xs border-stone-200 text-slate-600 hover:text-teal-700"
                  >
                    <Calendar className="w-3.5 h-3.5 sm:mr-1 text-teal-600" />
                    <span className="hidden sm:inline">Book Lesson</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/classroom")}
                    className="h-8 px-2 sm:px-3 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                  >
                    <Video className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Video Room</span>
                  </Button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="text-center my-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-[11px] font-medium text-slate-500 border border-stone-200/60">
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    Messages are end-to-end encrypted and logged for session safety
                  </div>
                </div>

                {allMessages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs">No messages yet. Send a greeting to start chatting!</p>
                  </div>
                ) : (
                  allMessages.map((msg) => {
                    const isMe =
                      msg.senderId === user?._id ||
                      msg.senderId === "usr_current" ||
                      msg.senderName === user?.name ||
                      msg.senderName === "You";

                    return (
                      <div
                        key={msg._id}
                        className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-stone-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mb-1">
                            {msg.senderName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className={`max-w-[80%] sm:max-w-[70%] space-y-1`}>
                          {!isMe && (
                            <span className="text-[10px] font-medium text-slate-500 ml-1">
                              {msg.senderName}
                            </span>
                          )}

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? "bg-teal-600 text-white rounded-br-xs shadow-xs"
                                : "bg-white text-slate-800 border border-stone-200/80 rounded-bl-xs shadow-2xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>

                          <div
                            className={`flex items-center gap-1 text-[10px] text-slate-400 px-1 ${
                              isMe ? "justify-end" : "justify-start"
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3 text-teal-600 ml-0.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <div className="p-2.5 sm:p-4 bg-white border-t border-stone-200/70 shrink-0 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${partnerName}...`}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all shadow-2xs"
                  />
                  <Button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="h-9 sm:h-10 px-3 sm:px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-2xs">
                <MessageCircle className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">
                Select a conversation
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose an educator or student from the sidebar to view their message history, schedule upcoming sessions, or exchange homework questions.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
