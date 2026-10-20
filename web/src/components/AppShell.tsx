/* AppShell (pattern, components.md §5; ds/screens/_index.md §2; D51 item 6: sidebar like Gemini, R4).
 * Container `shell` on the root: ≥ 1024 full rail · 640–1023 / < 640 top bar (menu button, app name, a warning badge
 * only while the AI engine is not ready) with the same rail in a left Drawer (G5).
 * Rail, top to bottom: brand · primary nav (New practice, History) · the chats = recent sessions (one quiet line each,
 * the middle part scrolls) · at the bottom an "AI engine · Not ready" row (only when it is not ready: P6) and the
 * account row (person icon, "You", "Saved on this computer", a gear) that opens Settings. The rail is set off from the
 * content by its fill, no line. <main> is the scroll container and the `page` container for screens.
 * `AppShellView` is pure (every state by props: review frames, stories); `AppShell` is the live container. */
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type Ref } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge, Drawer, Icon, IconButton, NavRow, Skeleton, ToastProvider } from "../ds";
import type { LinkComponent } from "../ds";
import { t } from "../i18n";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { railSessions, type RailSession } from "./railItems";
import s from "./AppShell.module.css";

/** react-router adapter for DS rows (NavRow, ListRow): `href` → `to`. */
export const RouterLink: LinkComponent = ({ href, children, ...rest }) => <Link to={href} {...rest}>{children}</Link>;

export type NavKey = "practice" | "history" | "settings";
/** One chat row: title, track, a short time or date ("2:23 PM", "Oct 18"). */
export type RecentSession = RailSession;
export type RecentState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: RecentSession[] };
export type EngineStatus = "checking" | "ready" | "notReady";
export interface ShellEngine { name?: string; status: EngineStatus }

/** Chat rows in the rail (D51: the middle of the rail is the chat list and scrolls; 🟡 12, History has the rest). */
export const RECENT_MAX = 12;
/** Shell width from which the full rail shows (a container width, docs/frontend.md): the drawer closes above it. */
const SHELL_FULL_MIN = 1024;

/* Primary nav (top of the rail). Settings lives in the account row at the bottom (Gemini, R4). */
const NAV: { key: NavKey; href: string; icon: "edit" | "history"; label: () => string }[] = [
  { key: "practice", href: "/", icon: "edit", label: () => t("nav.newPractice") },
  { key: "history", href: "/history", icon: "history", label: () => t("nav.history") },
];

/** Engine status badge (Badge success / warning / neutral + icon). Pure. */
export function EngineBadge({ status }: { status: EngineStatus }) {
  if (status === "checking") return <Badge>{t("rail.checking")}</Badge>;
  return status === "ready"
    ? <Badge tone="success" icon="check">{t("rail.ready")}</Badge>
    : <Badge tone="warning" icon="alert">{t("rail.notReady")}</Badge>;
}

function useEngine(): ShellEngine {
  const { selectedEngine, enginesLoading, engines } = useApp();
  if (!engines && enginesLoading) return { name: selectedEngine?.name, status: "checking" };
  if (!selectedEngine) return { status: "notReady" };
  return { name: selectedEngine.name, status: selectedEngine.status.ready ? "ready" : "notReady" };
}

/** Live badge for screens that show the engine state outside the shell (kept for existing imports). */
export function EngineStatusBadge() {
  return <EngineBadge status={useEngine().status} />;
}

export interface AppShellViewProps {
  /** The nav row of the page being shown (null: none, e.g. a debrief listed in Recent). */
  current: NavKey | null;
  /** The session being shown, highlighted in Recent. */
  currentSessionId?: string;
  recent: RecentState;
  engine: ShellEngine;
  /** Rail drawer below 1024 (controlled; uncontrolled when omitted). */
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  mainRef?: Ref<HTMLElement>;
  rootRef?: Ref<HTMLDivElement>;
  /** Enter motion for Recent rows (first load only). */
  animateRecent?: boolean;
  children: ReactNode;
}

export function AppShellView({
  current, currentSessionId, recent, engine, drawerOpen, onDrawerOpenChange, mainRef, rootRef, animateRecent, children,
}: AppShellViewProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = drawerOpen ?? ownOpen;
  const setOpen = useCallback((next: boolean) => {
    if (drawerOpen === undefined) setOwnOpen(next);
    onDrawerOpenChange?.(next);
  }, [drawerOpen, onDrawerOpenChange]);
  const drawerId = useId();
  // Any link chosen in the drawer closes it (the route changes under it).
  const closeOnLink = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("a")) setOpen(false);
  };

  return (
    <div ref={rootRef} className={s.shell} data-review-id="AppShell">
      <a href="#main" className={s.skip}>{t("app.skipToContent")}</a>
      <div className={s.frame}>
        <aside className={s.rail} data-review-id="AppShell/rail">
          <Brand />
          <RailContent current={current} currentSessionId={currentSessionId} recent={recent} engine={engine} animateRecent={animateRecent} />
        </aside>

        <header className={s.topbar} data-review-id="AppShell/topbar">
          <IconButton
            icon="menu"
            label={t("rail.openMenu")}
            aria-expanded={open}
            aria-controls={open ? drawerId : undefined}
            onClick={() => setOpen(true)}
          />
          <Link to="/" className={s.topbarName}>{t("app.name")}</Link>
          {engine.status === "notReady" ? (
            <Link to="/settings/engine" className={s.topbarEngine} aria-label={`${t("rail.engineWarning")}: ${t("rail.notReady")}`}>
              <EngineBadge status="notReady" />
            </Link>
          ) : null}
        </header>

        <main id="main" ref={mainRef} className={s.main} tabIndex={-1}>
          <div className={s.page}>{children}</div>
        </main>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} side="left" label={t("rail.menu")} title={t("app.name")}>
        <div id={drawerId} className={s.drawerRail} onClick={closeOnLink}>
          <RailContent current={current} currentSessionId={currentSessionId} recent={recent} engine={engine} />
        </div>
      </Drawer>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className={s.brand} data-review-id="AppShell/brand">
      <span className={s.mark}><Icon name="mic" size="sm" /></span>
      <span>{t("app.name")}</span>
    </Link>
  );
}

function RailContent({ current, currentSessionId, recent, engine, animateRecent }: {
  current: NavKey | null; currentSessionId?: string; recent: RecentState; engine: ShellEngine; animateRecent?: boolean;
}) {
  const recentId = useId();
  return (
    <>
      <nav aria-label={t("nav.main")} className={s.nav} data-review-id="AppShell/nav">
        {NAV.map((n) => (
          <NavRow key={n.key} href={n.href} label={n.label()} icon={n.icon} current={current === n.key} linkAs={RouterLink} />
        ))}
      </nav>

      {recent.status === "error" ? <div className={s.recent} /> : (
        <section className={s.recent} aria-labelledby={recentId} data-review-id="AppShell/recent">
          <h2 id={recentId} className={s.recentLabel}>{t("rail.recent")}</h2>
          {recent.status === "loading" ? (
            <Skeleton variant="lines" lines={3} className={s.recentSkeleton} />
          ) : recent.items.length === 0 ? (
            <p className={s.recentEmpty}>{t("rail.noSessions")}</p>
          ) : (
            <ul className={s.chats}>
              {recent.items.slice(0, RECENT_MAX).map((item, i) => (
                <li
                  key={item.id}
                  className={animateRecent ? "motion-row" : undefined}
                  style={animateRecent ? ({ animationDelay: `calc(var(--duration-stagger) / 2 * ${i})` } as CSSProperties) : undefined}
                >
                  <NavRow
                    href={`/sessions/${encodeURIComponent(item.id)}`}
                    label={item.title}
                    end={item.when}
                    current={item.id === currentSessionId}
                    linkAs={RouterLink}
                    className={s.chat}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className={s.foot} data-review-id="AppShell/account">
        {engine.status === "notReady" ? (
          <NavRow
            href="/settings/engine"
            icon="cpu"
            label={t("rail.engineWarning")}
            end={<EngineBadge status="notReady" />}
            current={false}
            linkAs={RouterLink}
            className={s.engineWarn}
          />
        ) : null}
        <Link to="/settings" className={s.account} aria-current={current === "settings" ? "page" : undefined} aria-label={t("rail.account")}>
          <span className={s.avatar}><Icon name="user" size="sm" /></span>
          <span className={s.accountText}>
            <span className={s.accountName}>{t("rail.you")}</span>
            <span className={s.accountSub}>{t("rail.storage")}</span>
          </span>
          <Icon name="settings" size="sm" className={s.accountGear} />
        </Link>
      </div>
    </>
  );
}

/* ---------- live container ---------- */

function navFor(pathname: string, sessionId: string | undefined, recent: RecentState): NavKey | null {
  if (pathname === "/") return "practice";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/history")) return "history";
  if (sessionId) {
    const listed = recent.status === "ready" && recent.items.slice(0, RECENT_MAX).some((r) => r.id === sessionId);
    return listed ? null : "history";
  }
  return null;
}

/** Page identity for scroll reset: Settings sections are one page (same rule as the route transition in App.tsx). */
function pageKey(pathname: string) {
  return pathname.startsWith("/settings") ? "/settings" : pathname;
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const engine = useEngine();
  const [recent, setRecent] = useState<RecentState>({ status: "loading" });
  const [animateRecent, setAnimateRecent] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Recent sessions: refetched on every navigation (a session may have been added, renamed or trashed).
  useEffect(() => {
    let alive = true;
    api.sessions().then(
      ({ sessions }) => {
        if (!alive) return;
        setRecent({ status: "ready", items: railSessions(sessions, RECENT_MAX, t("rail.untitled")) });
      },
      () => { if (alive) setRecent((prev) => (prev.status === "ready" ? prev : { status: "error" })); },
    );
    return () => { alive = false; };
  }, [location.pathname]);

  // Row enter motion only on the first load (docs/motion.md 3.7): switched off once the rows have played.
  useEffect(() => {
    if (recent.status !== "ready" || !animateRecent) return;
    const id = window.setTimeout(() => setAnimateRecent(false), 1000);
    return () => window.clearTimeout(id);
  }, [recent.status, animateRecent]);

  // A new page starts at the top (<main> is the scroll container).
  const page = pageKey(location.pathname);
  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [page]);

  // The drawer belongs to the narrow shell: close it once the full rail is back.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !drawerOpen) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width >= SHELL_FULL_MIN) setDrawerOpen(false);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawerOpen]);

  const sessionId = location.pathname.startsWith("/sessions/") ? decodeURIComponent(location.pathname.slice("/sessions/".length)) : undefined;

  return (
    <ToastProvider>
      <AppShellView
        current={navFor(location.pathname, sessionId, recent)}
        currentSessionId={sessionId}
        recent={recent}
        engine={engine}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        mainRef={mainRef}
        rootRef={rootRef}
        animateRecent={animateRecent}
      >
        {children}
      </AppShellView>
    </ToastProvider>
  );
}
