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
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
      <header className="bg-white/70 backdrop-blur-xs border-b border-[#E5E4DE] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="rounded-full text-xs font-semibold gap-1.5 text-[#111111]/70 hover:text-[#111111] hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F26522]" />
            <h1 className="text-sm font-bold text-[#111111] font-display">
              AI Study Assistant
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={startNew}
            className="rounded-full border-[#E5E4DE] text-[#111111] hover:bg-white text-xs font-semibold px-3 py-1 gap-1"
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
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 lg:p-8 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F4EF] border border-[#E5E4DE] flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-[#F26522]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#111111] mb-1 font-display">
                    Your AI Learning Companion
                  </h2>
                  <p className="text-sm text-[#111111]/70 leading-relaxed">
                    Ask for comprehensive explanations, step-by-step problem walkthroughs, practice questions, or curriculum study plans. This is designed to support your live educator sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent conversations */}
            {conversations && conversations.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-[#111111] mb-3 uppercase tracking-wider text-xs">
                  Recent Discussions
                </h2>
                <div className="space-y-2.5">
                  {conversations.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => setConversationId(c._id)}
                      className="w-full text-left p-5 bg-white rounded-2xl border border-[#E5E4DE] hover:border-[#111111]/40 hover:shadow-md transition-all shadow-xs"
                    >
                      <p className="text-sm font-bold text-[#111111]">
                        {c.title}
                      </p>
                      <p className="text-xs text-[#111111]/50 mt-1">
                        {new Date(c.lastMessageAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested prompts */}
            <div>
              <h2 className="text-sm font-bold text-[#111111] mb-3 uppercase tracking-wider text-xs">
                Suggested Prompts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {suggestedPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.prompt)}
                    className="p-5 bg-white rounded-3xl border border-[#E5E4DE] hover:border-[#111111]/40 hover:shadow-md transition-all text-left group shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#F5F4EF] border border-[#E5E4DE] flex items-center justify-center shrink-0">
                        <p.icon className="w-5 h-5 text-[#F26522]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#111111]">
                          {p.label}
                        </p>
                        <p className="text-xs text-[#111111]/60 mt-0.5">
                          {p.prompt}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-[#E5E4DE] text-xs text-[#111111]/80">
              <AlertTriangle className="w-4 h-4 text-[#F26522] shrink-0 mt-0.5" />
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
                        ? "bg-[#111111] text-white rounded-br-md"
                        : "bg-white border border-[#E5E4DE] text-[#111111] rounded-bl-md shadow-xs"
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
                  <div className="bg-white border border-[#E5E4DE] rounded-3xl rounded-bl-md px-5 py-4 shadow-xs">
                    <div className="flex gap-1.5">
                      <div
                        className="w-2 h-2 bg-[#111111] rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-[#111111] rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-[#111111] rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="sticky bottom-4 bg-[#F5F4EF]/90 backdrop-blur-xs pt-2 pb-2">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    handleSend()
                  }
                  placeholder="Ask a question about your curriculum or study topics..."
                  className="flex-1 px-5 py-3.5 bg-white border border-[#E5E4DE] rounded-full text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:border-[#111111] transition-all shadow-xs"
                  disabled={isTyping}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="rounded-full bg-[#111111] hover:bg-[#F26522] text-white h-12 w-12 flex items-center justify-center shrink-0 shadow-xs transition-all"
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
