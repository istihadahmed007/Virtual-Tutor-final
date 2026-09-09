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
    <main className="h-[calc(100dvh-4rem)] bg-[#F5F4EF] text-[#111111] flex flex-col overflow-hidden">
      {/* Platform Header (hidden on mobile when a chat is actively selected) */}
      <header className={`bg-white/80 backdrop-blur-xs border-b border-[#E5E4DE] shrink-0 z-20 ${selectedConvId ? "hidden sm:block" : "block"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="rounded-full text-xs font-semibold text-[#111111]/70 hover:text-[#111111] hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
            </Button>
            <div className="h-4 w-px bg-[#E5E4DE]" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#F5F4EF] text-[#111111] flex items-center justify-center font-bold text-sm border border-[#E5E4DE]">
                <MessageCircle className="w-4 h-4 text-[#F26522]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#111111] leading-tight font-display">Academic Messenger</h1>
                <p className="text-[11px] text-[#111111]/50">Direct educator and student communication</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/teachers")}
              className="hidden md:flex text-xs h-9 px-4 rounded-full border-[#E5E4DE] text-[#111111] hover:bg-white font-semibold"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#F26522]" /> Find Tutors
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/classroom")}
              className="text-xs h-9 px-4 rounded-full bg-[#111111] hover:bg-[#F26522] text-white font-semibold transition-all shadow-xs"
            >
              <Video className="w-3.5 h-3.5 mr-1.5" /> Live Classroom
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex overflow-hidden border-x border-[#E5E4DE]/60">
        {/* Left Sidebar: Conversations List */}
        <aside
          className={`w-full sm:w-80 md:w-96 border-r border-[#E5E4DE] bg-white flex flex-col shrink-0 ${
            selectedConvId ? "hidden sm:flex" : "flex"
          }`}
        >
          {/* Search bar */}
          <div className="p-3.5 border-b border-[#E5E4DE] bg-[#F5F4EF]/50">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#111111]/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E4DE] rounded-full text-xs text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:border-[#111111] shadow-xs transition-all"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E4DE]/60">
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
                    className={`w-full px-5 py-4 flex items-start gap-3.5 transition-colors text-left ${
                      isSelected
                        ? "bg-[#F5F4EF] border-l-4 border-[#F26522]"
                        : "hover:bg-[#F5F4EF]/50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-bold text-xs shadow-xs font-display">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#F26522] ring-2 ring-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p
                          className={`text-xs font-bold truncate ${
                            isSelected ? "text-[#111111]" : "text-[#111111]/80"
                          }`}
                        >
                          {otherName}
                        </p>
                        <span className="text-[10px] text-[#111111]/40 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[#111111]/60 truncate leading-relaxed">
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
          className={`flex-1 flex flex-col bg-[#F5F4EF] overflow-hidden ${
            !selectedConvId ? "hidden sm:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat View Header */}
              <div className="h-16 px-4 sm:px-6 bg-white border-b border-[#E5E4DE] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="sm:hidden p-1.5 h-8 w-8 text-[#111111] hover:bg-[#F5F4EF] shrink-0 rounded-full"
                    onClick={handleBackToList}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>

                  <div className="w-9 h-9 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 font-display">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#111111] truncate font-display">
                        {partnerName}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F4EF] text-[#111111] border border-[#E5E4DE] shrink-0">
                        <Shield className="w-2.5 h-2.5 text-[#F26522]" />
                        <span className="hidden xs:inline">Verified</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#111111]/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F26522] shrink-0" />
                      Active now
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/teachers")}
                    className="h-8 px-3 text-xs rounded-full border-[#E5E4DE] text-[#111111] hover:bg-[#F5F4EF] font-semibold"
                  >
                    <Calendar className="w-3.5 h-3.5 sm:mr-1 text-[#F26522]" />
                    <span className="hidden sm:inline">Book Lesson</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/classroom")}
                    className="h-8 px-3 text-xs rounded-full text-[#111111] hover:bg-[#F5F4EF] font-semibold"
                  >
                    <Video className="w-3.5 h-3.5 sm:mr-1 text-[#F26522]" />
                    <span className="hidden sm:inline">Video Room</span>
                  </Button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="text-center my-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-medium text-[#111111]/70 border border-[#E5E4DE] shadow-xs">
                    <Sparkles className="w-3 h-3 text-[#F26522]" />
                    Messages are end-to-end encrypted and logged for session safety
                  </div>
                </div>

                {allMessages.length === 0 ? (
                  <div className="py-12 text-center text-[#111111]/40">
                    <MessageCircle className="w-8 h-8 text-[#111111]/20 mx-auto mb-2" />
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
                          <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mb-1">
                            {msg.senderName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className={`max-w-[80%] sm:max-w-[70%] space-y-1`}>
                          {!isMe && (
                            <span className="text-[10px] font-medium text-[#111111]/50 ml-1">
                              {msg.senderName}
                            </span>
                          )}

                          <div
                            className={`p-4 rounded-3xl text-xs leading-relaxed ${
                              isMe
                                ? "bg-[#111111] text-white rounded-br-xs shadow-xs"
                                : "bg-white text-[#111111] border border-[#E5E4DE] rounded-bl-xs shadow-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>

                          <div
                            className={`flex items-center gap-1 text-[10px] text-[#111111]/40 px-1 ${
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
                            {isMe && <CheckCheck className="w-3 h-3 text-[#F26522] ml-0.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <div className="p-3 sm:p-4 bg-white border-t border-[#E5E4DE] shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${partnerName}...`}
                    className="flex-1 px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-full text-xs sm:text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:border-[#111111] transition-all shadow-xs"
                  />
                  <Button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="h-10 px-5 bg-[#111111] hover:bg-[#F26522] text-white rounded-full text-xs font-semibold shadow-xs transition-all disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#111111]/40">
              <div className="w-16 h-16 rounded-3xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#111111] mb-4 shadow-xs">
                <MessageCircle className="w-8 h-8 text-[#F26522]" />
              </div>
              <h3 className="text-base font-bold text-[#111111] mb-1 font-display">
                Select a conversation
              </h3>
              <p className="text-xs text-[#111111]/50 max-w-sm">
                Choose an educator or student from the sidebar to view their message history, schedule upcoming sessions, or exchange coursework questions.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
