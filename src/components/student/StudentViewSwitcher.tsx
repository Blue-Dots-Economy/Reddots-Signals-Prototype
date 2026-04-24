import { Building2, GraduationCap } from "lucide-react";
import type { StudentView } from "@/pages/StudentIndex";

const YELLOW = "#2563EB";

interface Props {
  activeView: StudentView;
  onSwitchView: (view: StudentView) => void;
}

const StudentViewSwitcher = ({ activeView, onSwitchView }: Props) => (
  <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[1100] floating-nav">
    <button
      onClick={() => onSwitchView("clcentre")}
      className="relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2"
      style={activeView === "clcentre"
        ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }
        : { background: "transparent", color: "hsl(var(--muted-foreground))" }
      }
    >
      <Building2 size={14} className="sm:w-4 sm:h-4" /> Provider
    </button>
    <button
      onClick={() => onSwitchView("tutor")}
      className="relative rounded-full px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2"
      style={activeView === "tutor"
        ? { background: YELLOW, color: "white", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }
        : { background: "transparent", color: "hsl(var(--muted-foreground))" }
      }
    >
      <GraduationCap size={14} className="sm:w-4 sm:h-4" /> Tutor
    </button>
  </div>
);

export default StudentViewSwitcher;
