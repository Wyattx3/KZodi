"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendIcon, ChevronDown } from "@/components/svg/ZodiacIcons";
import { LANGUAGES } from "@/lib/useTranslate";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  translated?: string;
}

interface ChatWidgetProps {
  zodiacSign: string;
  mbtiType: string;
  personName: string;
}

const suggestions = [
  "Best career paths?",
  "How do I handle stress?",
  "Hidden talents?",
  "Relationship advice?",
];

const ChatWidget: React.FC<ChatWidgetProps> = ({ zodiacSign, mbtiType }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState("en");
  const [showLang, setShowLang] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Batch translate multiple texts in 1 API call
  const batchTranslate = useCallback(async (texts: Record<string, string>, targetLang: string): Promise<Record<string, string>> => {
    if (targetLang === "en") return texts;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.translations || {};
      }
    } catch { /* fallback */ }
    return {};
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Send lang parameter so API responds directly in target language
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          zodiacSign,
          mbtiType,
          lang, // Direct language output - no separate translate call needed
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = res.ok ? await res.json() : null;
      const reply = data?.reply || "Could not generate a response. Please try again.";
      const directLang = data?.directLang || false;

      // If API responded directly in target language, use it as translated
      // Store English-intent content in content, target-language in translated
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        translated: directLang ? reply : undefined,
      }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Connection error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLangChange = async (code: string) => {
    setShowLang(false);
    setLang(code);

    if (code === "en") {
      // Clear translations - show original content
      setMessages((prev) => prev.map(m => ({ ...m, translated: undefined })));
      return;
    }

    // Batch translate all assistant messages in 1 API call (instead of N calls)
    const assistantMsgs = messages.filter(m => m.role === "assistant");
    if (assistantMsgs.length === 0) return;

    const textsToTranslate: Record<string, string> = {};
    assistantMsgs.forEach(m => {
      textsToTranslate[m.id] = m.content;
    });

    const translations = await batchTranslate(textsToTranslate, code);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.role === "assistant" && translations[m.id]) {
          return { ...m, translated: translations[m.id] };
        }
        return m;
      })
    );
  };

  return (
    <div className="px-6 pb-5">
      <div className="card-bordered overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-border-light flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[9px] bg-warm-black flex items-center justify-center">
            <span className="text-[10px] font-800 text-pastel-yellow">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-700 text-[13px] block leading-tight">KZodi Oracle</span>
            <span className="text-[11px] text-medium-gray font-500">Your personal astrologer</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setShowLang(!showLang)}
                className="h-7 px-2 rounded-[8px] bg-light-gray flex items-center gap-1 active:bg-border-soft transition-all"
              >
                <span className="text-[10px] font-700 text-warm-black uppercase">{lang}</span>
                <ChevronDown size={10} />
              </button>
              <AnimatePresence>
                {showLang && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-9 w-[130px] bg-white rounded-[12px] border border-border-soft shadow-lg z-50 py-1 max-h-[220px] overflow-y-auto no-scrollbar"
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => handleLangChange(l.code)}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-600 transition-colors ${
                          lang === l.code ? "bg-pastel-yellow-soft text-warm-black" : "text-warm-gray"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="max-h-[300px] overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="py-4">
              <p className="text-[12px] text-medium-gray mb-3 text-center font-500">Quick questions to get started</p>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)} className="px-3 py-2.5 rounded-[12px] bg-light-gray text-[12px] font-600 text-warm-gray active:bg-border-soft active:scale-[0.98] transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => {
              const displayText = msg.role === "assistant" && msg.translated ? msg.translated : msg.content;
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-4 py-3 text-[14px] leading-[1.65] ${
                    msg.role === "user" ? "bg-warm-black text-white rounded-[16px] rounded-br-[6px]" : "bg-light-gray text-warm-black rounded-[16px] rounded-bl-[6px]"
                  }`}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={displayText.slice(0, 40)}
                        initial={{ opacity: 0, filter: "blur(3px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(3px)" }}
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                        className={`block ${lang === "my" ? "translated-text" : ["zh","ja","ko"].includes(lang) ? "translated-cjk" : lang === "ar" ? "translated-rtl" : ""}`}
                      >
                        {displayText}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isLoading && (
            <div className="flex gap-1.5 px-4 py-3 bg-light-gray rounded-[16px] rounded-bl-[6px] w-fit">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} className="w-1.5 h-1.5 rounded-full bg-warm-gray" />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border-light flex gap-2.5">
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask about your sign..."
            className="flex-1 input-field !py-3 !rounded-[12px] text-[14px]"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-[12px] bg-warm-black text-white flex items-center justify-center disabled:opacity-20 active:opacity-80 active:scale-95 transition-all shrink-0"
          >
            <SendIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
