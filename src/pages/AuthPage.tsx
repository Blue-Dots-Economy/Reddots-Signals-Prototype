import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { lookupUser, saveProfile, loadProfile } from "@/lib/phoneAuth";

const RED = "#DC143C";

const AuthPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const existing = loadProfile();
  if (existing) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setNotFound(false);

    try {
      const profile = await lookupUser(phone);
      if (!profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      saveProfile(profile);
      navigate("/home", { replace: true });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setNotFound(false);
    setPhone("");
  };

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden safe-px">
      <div className="flex items-center justify-center w-full px-4 sm:px-6 relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${RED} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="w-full max-w-sm space-y-6 animate-fade-in relative z-10">
          {/* Logo */}
          <div className="text-center space-y-3">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: RED, boxShadow: `0 8px 32px rgba(220, 20, 60, 0.35)` }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Red Dots</h1>
            <p className="text-sm font-semibold text-foreground">
              Trouble on the road? Find help nearby
            </p>
            <p className="text-xs text-muted-foreground">
              Find nearest hospitals, mechanics, and first responders — or report road hazards
            </p>
          </div>

          {notFound ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-sm text-foreground font-medium">We couldn't find your number.</p>
              <p className="text-sm text-muted-foreground">Please check with your Red Dots coordinator.</p>
              <button
                onClick={handleTryAgain}
                className="mt-4 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${RED}, #9F0E2E)` }}
              >
                Try again
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-input bg-muted text-sm text-muted-foreground font-medium">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={15}
                    className="w-full px-4 py-3 rounded-r-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none input-focus-ring transition-all duration-200"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${RED}, #9F0E2E)`,
                  boxShadow: loading ? "none" : `0 4px 14px rgba(220, 20, 60, 0.35)`,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Looking you up...
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          )}

          <p className="text-center text-[11px] text-muted-foreground/60 pt-2">
            Powered by Red Dots · EkStep Foundation
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
