import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  ArrowLeft,
  Send,
  Plus,
  Sparkles,
  BookOpen,
  Calculator,
  Lightbulb,
  Target,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router";

const suggestedPrompts = [
  {
    icon: Calculator,
    label: "Explain this topic",
    prompt: "Can you explain this topic in simple terms with examples?",
  },
  {
    icon: Lightbulb,
    label: "Give me a practice question",
    prompt: "Can you create a practice question for me on this topic?",
  },
  {
    icon: Target,
    label: "Help me plan my revision",
    prompt: "Can you help me plan my revision for this subject?",
  },
  {
    icon: BookOpen,
    label: "Summarize key points",
    prompt: "Can you summarize the key points I should remember from this lesson?",
  },
];

export default function AiAssistantPage() {
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const conversations = useQuery(api.ai.listConversations);
  const messages = useQuery(
    api.ai.listMessages,
    conversationId ? { conversationId } : "skip",
  );
  const createConversation = useMutation(api.ai.createConversation);
  const sendMessage = useMutation(api.ai.sendMessage);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation({
        title: msg.slice(0, 50) + (msg.length > 50 ? "..." : ""),
      });
      setConversationId(convId);
    }

    setInput("");
    setIsTyping(true);

    try {
      await sendMessage({ conversationId: convId, content: msg });
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setIsTyping(false);
    }
  };

  const startNew = () => {
    setConversationId(null);
  };

  return (
    <main className="min-h-screen bg-transparent text-white pb-24 relative z-10">
      <header className="bg-slate-950/60 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="rounded-full text-xs font-semibold gap-1.5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h1 className="text-sm font-bold text-white font-display">
              AI Study Assistant
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={startNew}
            className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs font-semibold px-3.5 py-1 gap-1 backdrop-blur-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Conversation list (when no active conversation) */}
        {!conversationId && (
          <div className="space-y-6">
            {/* Intro text */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-violet-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1 font-display">
                    Your AI Learning Companion
                  </h2>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Ask for comprehensive explanations, step-by-step problem walkthroughs, practice questions, or curriculum study plans. This is designed to support your live educator sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent conversations */}
            {conversations && conversations.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider font-display">
                  Recent Discussions
                </h2>
                <div className="space-y-2.5">
                  {conversations.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => setConversationId(c._id)}
                      className="w-full text-left p-5 bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/12 hover:border-violet-400/40 hover:bg-white/[0.07] transition-all shadow-sm cursor-pointer"
                    >
                      <p className="text-sm font-bold text-white">
                        {c.title}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {new Date(c.lastMessageAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested prompts */}
            <div>
              <h2 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider font-display">
                Suggested Prompts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {suggestedPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.prompt)}
                    className="p-5 bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 hover:border-violet-400/40 hover:bg-white/[0.07] transition-all text-left group shadow-[0_8px_32px_rgba(0,0,0,0.36)] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-violet-400 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-indigo-600 group-hover:text-white transition-all">
                        <p.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                          {p.label}
                        </p>
                        <p className="text-xs text-white/60 mt-0.5 line-clamp-1">
                          {p.prompt}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-white/[0.03] rounded-2xl border border-white/10 text-xs text-white/70">
              <AlertTriangle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                AI-generated answers are for research and learning support. Always verify foundational proof steps and exam criteria with your educator.
              </p>
            </div>
          </div>
        )}

        {/* Active conversation */}
        {conversationId && (
          <div className="space-y-6">
            <div className="space-y-4 min-h-[420px]">
              {messages?.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-5 rounded-3xl ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-md shadow-[0_4px_15px_rgba(139,92,246,0.3)]"
                        : "bg-white/[0.06] backdrop-blur-xl border border-white/12 text-white rounded-bl-md shadow-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/12 rounded-3xl rounded-bl-md px-5 py-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <div
                        className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="sticky bottom-4 pt-2 pb-2">
              <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 backdrop-blur-2xl border border-white/15 rounded-full shadow-2xl">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    handleSend()
                  }
                  placeholder="Ask a question about your curriculum or study topics..."
                  className="flex-1 px-4 py-2.5 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                  disabled={isTyping}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white h-10 w-10 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {(!conversations || conversations.length === 0) &&
          !conversationId && (
            <EmptyState
              icon={MessageCircle}
              title="Start a conversation"
              description="Ask the AI assistant to explain concepts, create practice questions, or help you plan your study."
            />
          )}
      </div>
    </main>
  );
}
