import { useState, useEffect, useRef } from "react";
import { MessageCircle, ArrowRight, RotateCcw } from "lucide-react";
import type { PersonaType } from "@/lib/phoneAuth";

const BLUE = "#2563EB";

export interface ChatFilters {
  sector?: string[];
  distance?: number;
}

interface ChatMessage {
  from: "bot" | "user";
  text: string;
  options?: { label: string; value: string }[];
  multiSelect?: boolean;
}

interface Props {
  persona: PersonaType;
  userName: string;
  onComplete: (filters: ChatFilters) => void;
}

const PERSONA_CONFIG: Record<PersonaType, {
  questions: { text: string; options: { label: string; value: string }[]; key: string; multi?: boolean }[];
}> = {
  school_student: {
    questions: [
      {
        text: "What kind of internship interests you?",
        key: "sector",
        multi: false,
        options: [
          { label: "🍳 Food & Hospitality", value: "Food & Hospitality" },
          { label: "👗 Retail & Fashion", value: "Retail & Fashion" },
          { label: "⚡ Electrical & Hardware", value: "Electrical & Hardware" },
          { label: "🚗 Automobile", value: "Automobile" },
          { label: "🏥 Healthcare", value: "Healthcare" },
          { label: "🏭 Manufacturing", value: "Manufacturing" },
          { label: "📦 Other", value: "Other" },
        ],
      },
      {
        text: "How far can you travel?",
        key: "distance",
        options: [
          { label: "📍 Within 2 km", value: "2" },
          { label: "📍 Within 5 km", value: "5" },
          { label: "📍 Within 10 km", value: "10" },
        ],
      },
    ],
  },
  msme_hiring_interns: {
    questions: [
      {
        text: "How far from your shop should we look for students?",
        key: "distance",
        options: [
          { label: "📍 Within 2 km", value: "2" },
          { label: "📍 Within 5 km", value: "5" },
          { label: "📍 Within 10 km", value: "10" },
        ],
      },
    ],
  },
  iti_student: {
    questions: [
      {
        text: "What kind of work are you looking for?",
        key: "sector",
        multi: false,
        options: [
          { label: "⚡ Electrical", value: "Electrical" },
          { label: "🚗 Automobile", value: "Automobile" },
          { label: "🔧 Tool Room & CNC", value: "Tool Room & CNC" },
          { label: "🏭 Manufacturing", value: "Manufacturing" },
          { label: "🛠️ Maintenance & Repair", value: "Maintenance & Repair" },
          { label: "🛒 Retail & Sales", value: "Retail & Sales" },
          { label: "🍳 Food & Hospitality", value: "Food & Hospitality" },
        ],
      },
      {
        text: "How far can you travel for work?",
        key: "distance",
        options: [
          { label: "📍 Within 3 km", value: "3" },
          { label: "📍 Within 5 km", value: "5" },
          { label: "📍 Within 10 km", value: "10" },
        ],
      },
    ],
  },
  msme_hiring_iti: {
    questions: [
      {
        text: "What kind of candidate are you looking for?",
        key: "sector",
        multi: false,
        options: [
          { label: "🛒 Retail & Sales", value: "Retail & Sales" },
          { label: "🍳 Food & Hospitality", value: "Food & Hospitality" },
          { label: "🔧 Tool Room & CNC", value: "Tool Room & CNC" },
          { label: "🚗 Automobile", value: "Automobile" },
          { label: "🛠️ Maintenance & Repair", value: "Maintenance & Repair" },
          { label: "⚡ Electrical", value: "Electrical" },
          { label: "🏭 Manufacturing", value: "Manufacturing" },
          { label: "✅ Any", value: "Any" },
        ],
      },
      {
        text: "How far from your location should we search?",
        key: "distance",
        options: [
          { label: "📍 Within 3 km", value: "3" },
          { label: "📍 Within 5 km", value: "5" },
          { label: "📍 Within 10 km", value: "10" },
        ],
      },
    ],
  },
};

const PersonaChat = ({ persona, userName, onComplete }: Props) => {
  const config = PERSONA_CONFIG[persona];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [collectedFilters, setCollectedFilters] = useState<ChatFilters>({});
  const [selectedMulti, setSelectedMulti] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Start conversation
  useEffect(() => {
    const q = config.questions[0];
    setMessages([
      {
        from: "bot",
        text: `Hi ${userName}! ${q.text}`,
        options: q.options,
        multiSelect: q.multi,
      },
    ]);
  }, []);

  const removeLastOptions = () => {
    setMessages((prev) =>
      prev.map((m, i) => (i === prev.length - 1 ? { ...m, options: undefined, multiSelect: undefined } : m))
    );
  };

  const handleSingleChoice = (value: string, label: string) => {
    removeLastOptions();
    setMessages((prev) => [...prev, { from: "user", text: label }]);

    const q = config.questions[currentQ];
    const newFilters = { ...collectedFilters };

    if (q.key === "distance") {
      newFilters.distance = parseInt(value);
    } else if (q.key === "sector") {
      newFilters.sector = [value];
    }

    const nextQ = currentQ + 1;
    if (nextQ < config.questions.length) {
      setCollectedFilters(newFilters);
      setCurrentQ(nextQ);
      const next = config.questions[nextQ];
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: next.text, options: next.options, multiSelect: next.multi },
        ]);
      }, 400);
    } else {
      // Done
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: "Let me show you what's nearby! 🗺️" },
        ]);
        setTimeout(() => onComplete(newFilters), 600);
      }, 300);
    }
  };

  const handleMultiToggle = (value: string) => {
    if (value === "Any") {
      setSelectedMulti(new Set(["Any"]));
      return;
    }
    setSelectedMulti((prev) => {
      const next = new Set(prev);
      next.delete("Any");
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleMultiConfirm = () => {
    if (selectedMulti.size === 0) return;
    const labels = [...selectedMulti];
    removeLastOptions();
    setMessages((prev) => [...prev, { from: "user", text: labels.join(", ") }]);

    const q = config.questions[currentQ];
    const newFilters = { ...collectedFilters };
    if (q.key === "sector") {
      newFilters.sector = labels.includes("Any") ? undefined : labels;
    }

    const nextQ = currentQ + 1;
    if (nextQ < config.questions.length) {
      setCollectedFilters(newFilters);
      setCurrentQ(nextQ);
      setSelectedMulti(new Set());
      const next = config.questions[nextQ];
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: next.text, options: next.options, multiSelect: next.multi },
        ]);
      }, 400);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: "Let me show you what's nearby! 🗺️" },
        ]);
        setTimeout(() => onComplete(newFilters), 600);
      }, 300);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background safe-px">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border safe-pt">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BLUE}, #1D4ED8)` }}
          >
            <MessageCircle size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground tracking-tight">LAHI BlueDot</p>
            <p className="text-[11px] text-muted-foreground">Let's find what you need</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[90%] sm:max-w-[85%] space-y-2.5">
              <div
                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-sm leading-relaxed ${
                  msg.from === "user"
                    ? "rounded-2xl rounded-br-md text-white"
                    : "rounded-2xl rounded-bl-md bg-muted text-foreground"
                }`}
                style={msg.from === "user" ? {
                  background: `linear-gradient(135deg, ${BLUE}, #1D4ED8)`,
                } : {}}
              >
                {msg.text}
              </div>
              {msg.options && !msg.multiSelect && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-1.5">
                  {msg.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSingleChoice(opt.value, opt.label)}
                      className="text-[13px] sm:text-sm font-medium px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-all duration-200 flex items-center gap-1.5 text-foreground hover:shadow-md hover:-translate-y-0.5 active:scale-95 min-h-[44px]"
                    >
                      {opt.label}
                      <ArrowRight size={12} className="opacity-30" />
                    </button>
                  ))}
                </div>
              )}
              {msg.options && msg.multiSelect && (
                <div className="space-y-2 mt-1.5">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                    {msg.options.map((opt) => {
                      const selected = selectedMulti.has(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleMultiToggle(opt.value)}
                          className={`text-[13px] sm:text-sm font-medium px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-200 flex items-center gap-1.5 min-h-[44px] ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-foreground hover:bg-accent"
                          }`}
                        >
                          {selected && <span>✓</span>}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedMulti.size > 0 && (
                    <button
                      onClick={handleMultiConfirm}
                      className="text-sm font-bold px-6 py-2.5 rounded-xl text-white transition-all hover:shadow-lg active:scale-95"
                      style={{ background: `linear-gradient(135deg, ${BLUE}, #1D4ED8)` }}
                    >
                      Continue →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonaChat;
