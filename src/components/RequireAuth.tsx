import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Where to redirect if not authenticated */
  loginPath?: string;
}

const YELLOW = "#2563EB";

const RequireAuth = ({ children, loginPath = "/" }: RequireAuthProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center animate-float"
          style={{ background: YELLOW, boxShadow: `0 8px 24px rgba(37, 99, 235, 0.3)` }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 1-4 4v14a3 3 0 0 0 3-3h7z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: YELLOW }} />
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: YELLOW, animationDelay: '0.2s' }} />
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: YELLOW, animationDelay: '0.4s' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
