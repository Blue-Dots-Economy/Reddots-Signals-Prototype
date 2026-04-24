import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import CentreMapView from "@/components/student/CentreMapView";
import StudentMapView from "@/components/map/StudentMapView";

const YELLOW = "#DC143C";

export type StudentView = "clcentre" | "tutor";

const StudentIndex = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<StudentView>("clcentre");

  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 rounded-full border-t-transparent" style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col relative">
      {activeView === "clcentre"
        ? <CentreMapView activeView={activeView} onSwitchView={setActiveView} />
        : <StudentMapView activeView={activeView} onSwitchView={setActiveView} />
      }
    </div>
  );
};

export default StudentIndex;
