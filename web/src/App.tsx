import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Spinner } from "./ds";
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

  if (health === "checking") return <div className={s.center}><Spinner label={t("common.loading")} /></div>;
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

function Shell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupWizard />} />
      <Route path="/session" element={<SessionScreen />} />
      <Route path="/" element={<FirstRunGate><Shell><HomeScreen /></Shell></FirstRunGate>} />
      <Route path="/history" element={<Shell><HistoryScreen /></Shell>} />
      <Route path="/history/trash" element={<Shell><TrashScreen /></Shell>} />
      <Route path="/sessions/:id" element={<Shell><DebriefScreen /></Shell>} />
      <Route path="/settings" element={<Navigate to="/settings/engine" replace />} />
      <Route path="/settings/:section" element={<Shell><SettingsScreen /></Shell>} />
      <Route path="*" element={<Shell><NotFound /></Shell>} />
    </Routes>
  );
}
