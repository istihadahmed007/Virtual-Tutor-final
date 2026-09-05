import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Languages,
  Volume2,
  Plus,
  Trash2,
  MessageSquare,
  BookOpen,
  Sparkles,
  Check,
} from "lucide-react";

export interface VocabularyItem {
  id: string;
  word: string;
  meaning: string;
  pos: string;
  example: string;
}

interface ClassroomLanguageToolsProps {
  isTeacher: boolean;
  sharedText: string;
  vocabulary: VocabularyItem[];
  conversationPrompts: string[];
  onUpdateText: (text: string) => void;
  onAddVocab: (vocab: VocabularyItem) => void;
  onDeleteVocab: (id: string) => void;
}

export function ClassroomLanguageTools({
  isTeacher,
  sharedText,
  vocabulary,
  conversationPrompts,
  onUpdateText,
  onAddVocab,
  onDeleteVocab,
}: ClassroomLanguageToolsProps) {
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newPos, setNewPos] = useState("Noun");
  const [newExample, setNewExample] = useState("");
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);

  // Native Speech Synthesis for pronunciation
  const speakWord = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(text);
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleCreateVocab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    onAddVocab({
      id: Date.now().toString(),
      word: newWord.trim(),
      meaning: newMeaning.trim(),
      pos: newPos,
      example: newExample.trim(),
    });

    setNewWord("");
    setNewMeaning("");
    setNewExample("");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto p-4 select-none">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Language & Fluency Studio</h2>
              <p className="text-[11px] text-slate-400">Collaborative Dialogue, Vocabulary Builder & Speech Pronunciation</p>
            </div>
          </div>
        </div>

        {/* 1. Shared Reading Passage / Dialogue Workspace */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Shared Reading Passage & Dialogue
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => speakWord(sharedText)}
              className="border-slate-700 text-slate-300 hover:text-white text-xs h-7 gap-1"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-400" /> Read Passage Aloud
            </Button>
          </div>

          <textarea
            value={sharedText}
            onChange={(e) => onUpdateText(e.target.value)}
            disabled={!isTeacher}
            rows={5}
            placeholder="Type or paste conversation script, reading passage, or grammar exercise here..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-slate-100 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-80 resize-none font-serif"
          />
        </div>

        {/* 2. Interactive Vocabulary Bank with Audio Playback */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Vocabulary Bank & Pronunciation Drills
          </h3>

          {/* Add Word Form */}
          {isTeacher && (
            <form onSubmit={handleCreateVocab} className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Word (e.g. Eloquent)"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-500"
              />
              <input
                type="text"
                placeholder="Definition / Meaning"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-500"
              />
              <select
                value={newPos}
                onChange={(e) => setNewPos(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
              >
                <option value="Noun">Noun</option>
                <option value="Verb">Verb</option>
                <option value="Adjective">Adjective</option>
                <option value="Adverb">Adverb</option>
                <option value="Idiom">Idiom / Phrase</option>
              </select>
              <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Term
              </Button>
            </form>
          )}

          {/* Word List Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {vocabulary.map((v) => (
              <div
                key={v.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-teal-500/40 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{v.word}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-400 font-medium">
                        {v.pos}
                      </span>
                    </div>

                    <button
                      onClick={() => speakWord(v.word)}
                      className={`p-1 rounded-md transition-colors ${
                        isSpeaking === v.word
                          ? "bg-teal-500 text-slate-950"
                          : "text-slate-400 hover:text-teal-400 hover:bg-slate-800"
                      }`}
                      title="Listen to pronunciation"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mb-2">{v.meaning}</p>

                  {v.example && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                      "{v.example}"
                    </p>
                  )}
                </div>

                {isTeacher && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => onDeleteVocab(v.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded text-xs"
                      title="Delete vocabulary term"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {vocabulary.length === 0 && (
            <p className="text-center text-xs text-slate-500 py-6">
              No vocabulary terms added yet. Add words to practice pronunciation and definitions.
            </p>
          )}
        </div>

        {/* 3. Conversation & Speaking Prompts */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Speaking & Dialogue Prompts
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {conversationPrompts.map((prompt, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-teal-400 mt-0.5">#{idx + 1}</span>
                  <p className="text-xs text-slate-200 leading-snug">{prompt}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Interactive Speaking Drill</span>
                  <button
                    onClick={() => speakWord(prompt)}
                    className="text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" /> Listen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
