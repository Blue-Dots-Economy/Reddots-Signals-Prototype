import { BookOpen } from "lucide-react";

const YELLOW = "#2563EB";

const Legend = () => (
  <div className="glass rounded-xl shadow-lg p-3 flex gap-4 items-center animate-fade-in">
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${YELLOW}, #1D4ED8)`, boxShadow: `0 2px 8px rgba(37,99,235,0.3)` }}
      >
        <BookOpen size={14} className="text-white" />
      </div>
      <span className="text-xs text-foreground font-semibold tracking-tight">Blue Dots — Students</span>
    </div>
  </div>
);

export default Legend;
