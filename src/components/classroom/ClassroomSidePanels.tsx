import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  ListTodo,
  FileText,
  Send,
  Hand,
  CheckCircle2,
  Circle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PenTool,
  Shield,
  HelpCircle,
  Sparkles,
  UserX,
} from "lucide-react";
import { ParticipantPresence } from "./ClassroomVideoGrid";

export interface ClassMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: number;
  type: "chat" | "question" | "reaction" | "hand-raise" | "system";
}

export interface LessonObjective {
  id: string;
  text: string;
  completed: boolean;
}

interface ClassroomSidePanelsProps {
  activeTab: "chat" | "participants" | "plan" | "notes";
  onTabChange: (tab: "chat" | "participants" | "plan" | "notes") => void;
  currentUserId: string;
  currentUserName: string;
  isTeacher: boolean;
  messages: ClassMessage[];
  participants: ParticipantPresence[];
  objectives: LessonObjective[];
  onSendMessage: (text: string, type: "chat" | "question") => void;
  onToggleObjective: (id: string, completed: boolean) => void;
  onManageParticipant?: (
    targetUserId: string,
    action:
      | "mute"
      | "unmute"
      | "disable_cam"
      | "allow_cam"
      | "grant_annotate"
      | "revoke_annotate"
      | "grant_screen"
      | "revoke_screen"
      | "remove_participant",
  ) => void;
  onOpenHostControls?: () => void;
}

export function ClassroomSidePanels({
  activeTab,
  onTabChange,
  currentUserId,
  currentUserName,
  isTeacher,
  messages,
  participants,
  objectives,
  onSendMessage,
  onToggleObjective,
  onManageParticipant,
  onOpenHostControls,
}: ClassroomSidePanelsProps) {
  const [chatInput, setChatInput] = useState("");
  const [filterQuestionsOnly, setFilterQuestionsOnly] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim(), filterQuestionsOnly ? "question" : "chat");
    setChatInput("");
  };

  const filteredMessages = filterQuestionsOnly
    ? messages.filter((m) => m.type === "question" || m.type === "hand-raise")
    : messages;

  return (
    <div className="w-full sm:w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 select-none text-white">
      {/* ─── Top Tabs ─────────────────────────────────────────────────── */}
      <div className="bg-slate-950 px-2 pt-2 border-b border-slate-800 flex items-center justify-between">
        {[
          { id: "chat" as const, label: "Chat", icon: MessageSquare, badge: messages.length },
          { id: "participants" as const, label: "People", icon: Users, badge: participants.length },
          { id: "plan" as const, label: "Plan", icon: ListTodo },
          { id: "notes" as const, label: "Notes", icon: FileText },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex-1 pb-2 pt-1 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-teal-500 text-teal-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 1. CHAT TAB */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Filter bar */}
            <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Classroom Stream</span>
              <button
                onClick={() => setFilterQuestionsOnly(!filterQuestionsOnly)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  filterQuestionsOnly
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {filterQuestionsOnly ? "Showing Q&A Only" : "Filter Q&A"}
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredMessages.map((m) => {
                const isMe = m.senderId === currentUserId;
                const isSystem = m.senderRole === "system" || m.type === "system";

                if (isSystem) {
                  return (
                    <div
                      key={m._id}
                      className="p-2 bg-slate-800/40 border border-slate-700/50 rounded-lg text-center text-[11px] text-slate-400 leading-snug"
                    >
                      {m.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={m._id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">{m.senderName}</span>
                      {m.senderRole === "teacher" && (
                        <span className="px-1 bg-teal-500/20 text-teal-300 rounded text-[9px] font-bold">
                          Teacher
                        </span>
                      )}
                      <span>· {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        m.type === "question"
                          ? "bg-amber-950/60 border border-amber-700/50 text-amber-200"
                          : isMe
                            ? "bg-teal-600 text-white"
                            : "bg-slate-800 border border-slate-700/80 text-slate-200"
                      }`}
                    >
                      {m.type === "question" && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 mb-0.5">
                          <HelpCircle className="w-3 h-3" /> Question
                        </div>
                      )}
                      <p>{m.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={filterQuestionsOnly ? "Ask a question..." : "Send a message to class..."}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-teal-500"
              />
              <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white h-8 w-8 p-0 rounded-xl shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        )}

        {/* 2. PARTICIPANTS TAB */}
        {activeTab === "participants" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Classroom Roster ({participants.length})
              </span>
              {isTeacher && onOpenHostControls && (
                <button
                  onClick={onOpenHostControls}
                  className="text-[10px] text-teal-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Shield className="w-3 h-3" /> Manage Permissions
                </button>
              )}
            </div>

            {participants.map((p) => {
              const isTeacherRole = p.role === "teacher";
              return (
                <div
                  key={p._id}
                  className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold capitalize ${
                              isTeacherRole ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "bg-slate-900 text-slate-400"
                            }`}
                          >
                            {p.role}
                          </span>
                          {p.handRaised && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-0.5">
                              <Hand className="w-2.5 h-2.5" /> Hand
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {p.micOn ? (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-red-400" />
                      )}
                      {p.camOn ? (
                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Teacher Quick Controls for this Student */}
                  {isTeacher && !isTeacherRole && onManageParticipant && (
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-end gap-1 text-[10px]">
                      <button
                        onClick={() => onManageParticipant(p.userId, p.micOn ? "mute" : "unmute")}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {p.micOn ? "Mute" : "Unmute"}
                      </button>
                      <button
                        onClick={() => onManageParticipant(p.userId, p.camOn ? "disable_cam" : "allow_cam")}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {p.camOn ? "Disable Cam" : "Allow Cam"}
                      </button>
                      <button
                        onClick={() =>
                          onManageParticipant(p.userId, p.canAnnotate ? "revoke_annotate" : "grant_annotate")
                        }
                        className={`px-2 py-0.5 rounded transition-colors ${
                          p.canAnnotate
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                        title="Whiteboard Drawing Permission"
                      >
                        <PenTool className="w-2.5 h-2.5 inline mr-1" />
                        {p.canAnnotate ? "Revoke Draw" : "Allow Draw"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. LESSON PLAN TAB */}
        {activeTab === "plan" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Lesson Objectives</span>
              <span className="text-teal-400 font-mono text-[10px]">
                {objectives.filter((o) => o.completed).length} / {objectives.length} Done
              </span>
            </div>

            <div className="space-y-2">
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => {
                    if (isTeacher) {
                      onToggleObjective(obj.id, !obj.completed);
                    }
                  }}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                    isTeacher ? "cursor-pointer" : "cursor-default"
                  } ${
                    obj.completed
                      ? "bg-teal-950/40 border-teal-800/60 text-slate-300"
                      : "bg-slate-800/80 border-slate-700 text-slate-100 hover:border-slate-600"
                  }`}
                >
                  <button type="button" className="mt-0.5 shrink-0 text-teal-400">
                    {obj.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <span className={`text-xs leading-relaxed ${obj.completed ? "line-through text-slate-400" : ""}`}>
                    {obj.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. NOTES TAB */}
        {activeTab === "notes" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Live Lesson Takeaways
            </div>
            <p className="text-xs text-slate-400">
              Key formulas, definitions, and remarks noted during class are saved into student dashboards upon completion.
            </p>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" /> Structured Summary
              </div>
              <p>• Review core definitions from the multi-page whiteboard.</p>
              <p>• Complete assigned worksheet questions before next session.</p>
              <p>• Practice pronunciation drills in the Language Studio.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
