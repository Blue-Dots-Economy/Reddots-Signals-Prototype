import { Cross, AlertTriangle } from "lucide-react";
import type { RedDotsView } from "@/lib/phoneAuth";

const RED = "#DC143C";
const GREY = "#4A4A4A";

interface Props {
  userName: string;
  onChoose: (view: RedDotsView) => void;
}

const ChatRouting = ({ userName, onChoose }: Props) => (
  <div className="h-[100dvh] w-full flex items-center justify-center bg-background safe-px relative overflow-hidden">
    {/* Faint dot pattern background */}
    <div
      className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{ backgroundImage: `radial-gradient(${RED} 1px, transparent 1px)`, backgroundSize: "24px 24px" }}
    />

    <div className="relative z-10 w-full max-w-md px-4 sm:px-6 space-y-6 animate-fade-in pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Hi {userName.split(" ")[0]}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          What do you need?
        </h1>
        <p className="text-sm text-muted-foreground">What do you need right now?</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onChoose("services")}
          className="w-full text-left rounded-2xl p-5 border-2 transition-all hover:shadow-lg active:scale-[0.98] flex items-start gap-4"
          style={{ borderColor: RED, background: `${RED}08` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: RED, boxShadow: `0 6px 18px rgba(220,20,60,0.35)` }}
          >
            <Cross size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground leading-tight">Find help nearby</p>
            <p className="text-xs text-muted-foreground mt-1">
              Hospital, mechanic, ambulance, tow truck
            </p>
          </div>
        </button>

        <button
          onClick={() => onChoose("accidents")}
          className="w-full text-left rounded-2xl p-5 border-2 transition-all hover:shadow-lg active:scale-[0.98] flex items-start gap-4"
          style={{ borderColor: GREY, background: `${GREY}10` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: GREY, boxShadow: `0 6px 18px rgba(74,74,74,0.35)` }}
          >
            <AlertTriangle size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground leading-tight">Report a road problem</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pothole, accident hotspot, dangerous road
            </p>
          </div>
        </button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/60 pt-2">
        You can switch views anytime from the bottom bar
      </p>
    </div>
  </div>
);

export default ChatRouting;
