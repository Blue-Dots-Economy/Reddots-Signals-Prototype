import type { MapDot } from "@/lib/mapData";
import { PILLAR_LABELS } from "@/lib/mapData";
import DotIconComponent from "./DotIcon";

const YELLOW = "#DC143C";

interface Props {
  dot: MapDot;
}

const DetailRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <tr>
      <td className="text-muted-foreground pr-3 py-0.5 align-top whitespace-nowrap text-xs font-medium">
        {label}
      </td>
      <td className="text-foreground py-0.5 text-xs">{value}</td>
    </tr>
  );
};

const HoverCard = ({ dot }: Props) => {
  const hasDetails = dot.education || dot.skills || dot.availability || dot.distance;

  return (
    <div className="hover-card-map animate-scale-in">
      {/* Header row: icon + pillar */}
      <div className="flex items-center mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${YELLOW}, #9F0E2E)`, boxShadow: `0 2px 8px rgba(220,20,60,0.25)` }}
          >
            <span className="text-white">
              <DotIconComponent icon={dot.icon} size={14} />
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ background: ({
            subject_tutoring: "#DC143C",
            career_counselling: "#9F0E2E",
            college_admissions: "#1E40AF",
            skill_workshop: "#2554C7",
            exam_prep: "#1E3A8A",
          } as Record<string, string>)[dot.pillar] || "#DC143C" }}>
            {PILLAR_LABELS[dot.pillar]}
          </span>
        </div>
      </div>

      {/* Name */}
      <p className="font-bold text-foreground text-[17px] leading-tight tracking-tight">{dot.name}</p>

      {/* Area */}
      <p className="text-xs text-muted-foreground mt-1">{dot.area}</p>

      {/* Detail table or description */}
      {hasDetails ? (
        <div className="border-t border-border mt-3 pt-2.5">
          <table className="w-full">
            <tbody>
              <DetailRow label="Grade" value={dot.education} />
              <DetailRow label="Needs" value={dot.skills} />
              <DetailRow label="Format" value={dot.availability} />
              <DetailRow label="Distance" value={dot.distance} />
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
          {dot.description}
        </p>
      )}

      {/* Relevance */}
      <div className="border-t border-border mt-3 pt-2.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Why relevant</span>{" "}
          <span className="italic opacity-80">{dot.relevance}</span>
        </p>
      </div>
    </div>
  );
};

export default HoverCard;
