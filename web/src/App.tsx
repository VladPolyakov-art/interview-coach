import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Swap } from "./ds";
import { t } from "./i18n";
import { AppShell } from "./components/AppShell";
import { api } from "./lib/api";
import { prefs } from "./lib/prefs";
import { AppProvider } from "./lib/store";
import { DebriefScreen } from "./screens/Debrief";
import { ArchiveScreen, TrashScreen } from "./screens/History";
import { HomeScreen } from "./screens/Home";
import { NotFound } from "./screens/NotFound";
import { ServerUnavailable } from "./screens/ServerUnavailable";
import { SessionScreen } from "./screens/Session";
import { useSettingsRoute } from "./screens/Settings";
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

function FirstRunGate({ children, off }: { children: React.ReactNode; off?: boolean }) {
  const location = useLocation();
  if (!off && !prefs.setupDone() && location.pathname === "/") return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

/** Route change (docs/motion.md 3.1, New): the outgoing page fades out (`exit`), the incoming page content rises in
 * (`slow`, `--ease-enter`). The rail stays put: AppShell is shared by every shell route, only <main>'s content swaps.
 * Query changes (Home track) are not page changes. Focus left inside the old page moves to <main>.
 * Settings (D76) is a popup over the page you came from (Home on a direct visit), so it never swaps the page. */
function ShellRoutes() {
  const settings = useSettingsRoute();
  const location = settings.pageLocation;
  return (
    <AppShell>
      <Swap
        swapKey={location.pathname}
        enterClass="motion-page-in"
        exitClass="motion-fade-out"
        className={s.routeSwap}
        focusTarget={() => document.getElementById("main")}
      >
        <Routes location={location}>
          <Route path="/" element={<FirstRunGate off={settings.open}><HomeScreen /></FirstRunGate>} />
          <Route path="/archive" element={<ArchiveScreen />} />
          <Route path="/archive/trash" element={<TrashScreen />} />
          {/* D80: History became Archive; old links still land. */}
          <Route path="/history" element={<Navigate to="/archive" replace />} />
          <Route path="/history/trash" element={<Navigate to="/archive/trash" replace />} />
          <Route path="/sessions/:id" element={<DebriefScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Swap>
      {settings.dialog}
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
