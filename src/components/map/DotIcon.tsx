import {
  BookOpen,
  Briefcase,
  Compass,
  GraduationCap,
  Wrench,
  ClipboardList,
} from "lucide-react";
import type { DotIcon as DotIconType } from "@/lib/mapData";

const iconMap: Record<DotIconType, React.ElementType> = {
  book: BookOpen,
  briefcase: Briefcase,
  compass: Compass,
  graduationCap: GraduationCap,
  wrench: Wrench,
  clipboard: ClipboardList,
};

interface Props {
  icon: DotIconType;
  size?: number;
}

const DotIconComponent = ({ icon, size = 20 }: Props) => {
  const Icon = iconMap[icon];
  return <Icon size={size} strokeWidth={2.2} />;
};

export default DotIconComponent;
