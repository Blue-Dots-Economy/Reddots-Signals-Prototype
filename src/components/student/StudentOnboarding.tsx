import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, ArrowRight, RotateCcw } from "lucide-react";

const YELLOW = "#DC143C";

export type StudentPath = "tutoring" | "counselling_online" | "counselling_centre" | "colleges";

interface Props {
  onComplete: (path: StudentPath, filters?: Record<string, string>) => void;
  onReset: () => void;
}

interface ChatMessage {
  from: "bot" | "user";
  text: string;
  options?: { label: string; value: string }[];
}

const StudentOnboarding = ({ onComplete, onReset }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState(0);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [programOptions, setProgramOptions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch dynamic options
  useEffect(() => {
    const fetchOptions = async () => {
      const { data: tutors } = await supabase.from("tutor_dots").select("subject");
      if (tutors) {
        const subjects = [...new Set(tutors.map((t) => t.subject))].sort();
        setSubjectOptions(subjects);
      }
      const { data: colleges } = await supabase.from("college_dots").select("programs");
      if (colleges) {
        const programs = [...new Set(colleges.filter((c) => c.programs).map((c) => c.programs!))].sort();
        setProgramOptions(programs);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Start conversation
  useEffect(() => {
    if (step === 0) {
      setMessages([
        {
          from: "bot",
          text: "Hey! 👋 Welcome to Blue Dots. What are you looking for today?",
          options: [
            { label: "📚 Tutoring", value: "tutoring" },
            { label: "🎯 Admissions Counselling", value: "counselling" },
            { label: "🏫 Connect with Colleges", value: "colleges" },
          ],
        },
      ]);
    }
  }, [step]);

  const addMessages = (...msgs: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...msgs]);
  };

  const handleChoice = (value: string, label: string) => {
    // Remove options from last message
    setMessages((prev) =>
      prev.map((m, i) => (i === prev.length - 1 ? { ...m, options: undefined } : m))
    );
    addMessages({ from: "user", text: label });

    if (step === 0) {
      if (value === "tutoring") {
        setStep(1);
        setTimeout(() => {
          const opts = subjectOptions.length > 0
            ? subjectOptions.map((s) => ({
                label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                value: s,
              }))
            : [{ label: "Show all tutors", value: "all" }];
          addMessages({
            from: "bot",
            text: "Great choice! What subject are you looking for help with?",
            options: [{ label: "All subjects", value: "all" }, ...opts],
          });
        }, 400);
      } else if (value === "counselling") {
        setStep(2);
        setTimeout(() => {
          addMessages({
            from: "bot",
            text: "Are you okay with online counselling, or would you prefer visiting a centre in person?",
            options: [
              { label: "🌐 Online is fine", value: "online" },
              { label: "📍 I want to go in person", value: "in_person" },
            ],
          });
        }, 400);
      } else if (value === "colleges") {
        setStep(3);
        setTimeout(() => {
          const opts = programOptions.length > 0
            ? programOptions.map((p) => ({ label: p, value: p }))
            : [{ label: "Show all colleges", value: "all" }];
          addMessages({
            from: "bot",
            text: "What kind of studies are you interested in pursuing?",
            options: [{ label: "All programs", value: "all" }, ...opts],
          });
        }, 400);
      }
    } else if (step === 1) {
      // Tutoring → subject chosen
      setTimeout(() => {
        addMessages({ from: "bot", text: `Perfect! Let me show you tutors${value !== "all" ? ` for ${label}` : ""} near you. 🗺️` });
        setTimeout(() => onComplete("tutoring", value !== "all" ? { subject: value } : undefined), 600);
      }, 300);
    } else if (step === 2) {
      // Counselling → online or in-person
      if (value === "online") {
        setTimeout(() => {
          addMessages({ from: "bot", text: "Here are the online counsellors available for you! 📋" });
          setTimeout(() => onComplete("counselling_online"), 600);
        }, 300);
      } else {
        setTimeout(() => {
          addMessages({ from: "bot", text: "Let me show you Career Launcher centres near you on the map! 📍" });
          setTimeout(() => onComplete("counselling_centre"), 600);
        }, 300);
      }
    } else if (step === 3) {
      // Colleges → program chosen
      setTimeout(() => {
        addMessages({ from: "bot", text: `Showing colleges${value !== "all" ? ` offering ${label}` : ""} near you! 🏫` });
        setTimeout(() => onComplete("colleges", value !== "all" ? { program: value } : undefined), 600);
      }, 300);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border glass">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${YELLOW}, #9F0E2E)`, boxShadow: `0 2px 10px rgba(220,20,60,0.3)` }}
          >
            <MessageCircle size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground tracking-tight">Blue Dots Assistant</p>
            <p className="text-[11px] text-muted-foreground">Let's find what you need</p>
          </div>
        </div>
        <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted">
          <RotateCcw size={12} /> Start over
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-slide-up`}>
            <div className="max-w-[90%] sm:max-w-[85%] space-y-2.5">
              <div
                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-sm leading-relaxed ${
                  msg.from === "user"
                    ? "rounded-2xl rounded-br-md text-white"
                    : "rounded-2xl rounded-bl-md bg-muted text-foreground"
                }`}
                style={msg.from === "user" ? {
                  background: `linear-gradient(135deg, ${YELLOW}, #9F0E2E)`,
                  boxShadow: '0 2px 8px rgba(220,20,60,0.2)',
                } : {
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {msg.text}
              </div>
              {msg.options && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-1.5">
                  {msg.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleChoice(opt.value, opt.label)}
                      className="text-[13px] sm:text-sm font-medium px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-all duration-200 flex items-center gap-1.5 text-foreground hover:shadow-md hover:-translate-y-0.5 active:scale-95 min-h-[44px]"
                    >
                      {opt.label}
                      <ArrowRight size={12} className="opacity-30" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentOnboarding;
