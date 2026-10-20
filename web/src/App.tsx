import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Swap } from "./ds";
import { t } from "./i18n";
import { AppShell } from "./components/AppShell";
import { api } from "./lib/api";
import { prefs } from "./lib/prefs";
import { AppProvider } from "./lib/store";
import { DebriefScreen } from "./screens/Debrief";
import { HistoryScreen, TrashScreen } from "./screens/History";
import { HomeScreen } from "./screens/Home";
import { NotFound } from "./screens/NotFound";
import { ServerUnavailable } from "./screens/ServerUnavailable";
import { SessionScreen } from "./screens/Session";
import { SettingsScreen } from "./screens/Settings";
import { SetupWizard } from "./screens/Setup";
import s from "./App.module.css";

type Health = "checking" | "ok" | "down";

export function App() {
  const [health, setHealth] = useState<Health>("checking");
  const check = useCallback(async () => {
    setHealth("checking");
    try {
      await api.health();
      setHealth("ok");
    } catch {
      setHealth("down");
    }
  }, []);
  useEffect(() => { void check(); }, [check]);

  if (health === "checking") {
    return <div className={s.center} aria-busy="true"><p className="shimmer-text" role="status">{t("common.loading")}</p></div>;
  }
  if (health === "down") return <ServerUnavailable onRetry={() => void check()} />;
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

function FirstRunGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!prefs.setupDone() && location.pathname === "/") return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

/** Route change (docs/motion.md 3.1, New): the outgoing page fades out (`exit`), the incoming page content rises in
 * (`slow`, `--ease-enter`). The rail stays put: AppShell is shared by every shell route, only <main>'s content swaps.
 * Settings sections and query changes (Home track) are not page changes. Focus left inside the old page moves to <main>. */
function routeKey(pathname: string) {
  if (pathname.startsWith("/settings")) return "/settings";
  return pathname;
}

function ShellRoutes() {
  const location = useLocation();
  return (
    <AppShell>
      <Swap
        swapKey={routeKey(location.pathname)}
        enterClass="motion-page-in"
        exitClass="motion-fade-out"
        className={s.routeSwap}
        focusTarget={() => document.getElementById("main")}
      >
        <Routes location={location}>
          <Route path="/" element={<FirstRunGate><HomeScreen /></FirstRunGate>} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/history/trash" element={<TrashScreen />} />
          <Route path="/sessions/:id" element={<DebriefScreen />} />
          <Route path="/settings" element={<Navigate to="/settings/engine" replace />} />
          <Route path="/settings/:section" element={<SettingsScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Swap>
    </AppShell>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupWizard />} />
      <Route path="/session" element={<SessionScreen />} />
      <Route path="*" element={<ShellRoutes />} />
    </Routes>
  );
}
