/* AppShell (pattern, components.md §5; ds/screens/_index.md §2; D57: the sidebar works like claude.ai's).
 * Container `shell` on the root: ≥ 1024 the rail (expanded 240px, or collapsed to a narrow icon rail, remembered in
 * localStorage `ic.railCollapsed`) · 640–1023 / < 640 top bar (menu button, app name, a warning badge only while the AI
 * engine is not ready) with the same sidebar, always expanded, in a left Drawer (G5).
 * Rail, top to bottom: app mark + name with the sidebar toggle · New practice (a round filled plus) · "Recents" = ALL sessions,
 * newest first (one line each, no dates, a quiet EN marker for English; the middle part scrolls; a "…" menu on hover or focus:
 * Open, Move to Trash) · an "AI engine · Not ready" row (only when it is not ready: P6) · the account row (avatar, "You",
 * "Saved on this computer") which opens a menu upward (Settings, Appearance, Privacy and data, Help & what's free). Collapsed: toggle, round plus,
 * a warning icon (only when not ready) and the avatar, each with a Tooltip. The rail is set off from the content by its fill, no line.
 * <main> is the scroll container and the `page` container for screens.
 * `AppShellView` is pure (every state by props: review frames, stories); `AppShell` is the live container. */
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode, type Ref } from "react";
import { Link, useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { Badge, Drawer, Icon, IconButton, Menu, NavRow, Skeleton, Tooltip, ToastProvider, useToast } from "../ds";
import type { LinkComponent, MenuEntry, ToastOptions } from "../ds";
import { t } from "../i18n";
import { api } from "../lib/api";
import { pendingSave } from "../lib/pendingSave";
import { prefs } from "../lib/prefs";
import { errorMessage, useApp } from "../lib/store";
import { railSessions, type RailSession } from "./railItems";
import { Wordmark } from "./Wordmark";
import s from "./AppShell.module.css";

/** react-router adapter for DS rows (NavRow, ListRow): `href` → `to`. */
export const RouterLink: LinkComponent = ({ href, children, ...rest }) => <Link to={href} {...rest}>{children}</Link>;

export type NavKey = "practice" | "history" | "settings";
/** One chat row: title and track (no date or time: D57). */
export type RecentSession = RailSession;
export type RecentState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: RecentSession[] };
export type EngineStatus = "checking" | "ready" | "notReady";
export interface ShellEngine { name?: string; status: EngineStatus }

/** Shell width from which the full rail shows (a container width, docs/frontend.md): the drawer closes above it. */
const SHELL_FULL_MIN = 1024;


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

export type InitialMenu = "account" | "row";

export interface AppShellViewProps {
  /** The nav row of the page being shown (null: none, e.g. a debrief listed in Recents). */
  current: NavKey | null;
  /** The session being shown, highlighted in Recents. */
  currentSessionId?: string;
  recent: RecentState;
  engine: ShellEngine;
  /** Rail drawer below 1024 (controlled; uncontrolled when omitted). */
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  /** Rail collapsed to the icon rail (≥ 1024). Controlled when `onCollapsedChange` is given, else it is the initial value. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Open one of the sidebar menus at first render (stories, review): the account menu or the first chat's "…" menu. */
  initialMenu?: InitialMenu;
  /** "Move to Trash" in a chat's "…" menu; without it the menu only has Open. */
  onTrashSession?: (id: string) => void;
  mainRef?: Ref<HTMLElement>;
  rootRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export function AppShellView({
  current, currentSessionId, recent, engine, drawerOpen, onDrawerOpenChange, collapsed, onCollapsedChange, initialMenu,
  onTrashSession, mainRef, rootRef, children,
}: AppShellViewProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = drawerOpen ?? ownOpen;
  const setOpen = useCallback((next: boolean) => {
    if (drawerOpen === undefined) setOwnOpen(next);
    onDrawerOpenChange?.(next);
  }, [drawerOpen, onDrawerOpenChange]);
  const [ownCollapsed, setOwnCollapsed] = useState(collapsed ?? false);
  const isCollapsed = onCollapsedChange ? (collapsed ?? false) : ownCollapsed;
  const setCollapsed = (next: boolean) => {
    setOwnCollapsed(next);
    onCollapsedChange?.(next);
  };
  const drawerId = useId();
  // Any link chosen in the drawer closes it (the route changes under it).
  const closeOnLink = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("a")) setOpen(false);
  };
  // The menus are portalled out of the drawer, so they close it themselves (see `onNavigate`).
  const common = { current, currentSessionId, recent, engine, onTrashSession };

  return (
    <div ref={rootRef} className={s.shell} data-review-id="AppShell">
      <a href="#main" className={s.skip}>{t("app.skipToContent")}</a>
      <div className={s.frame} data-collapsed={isCollapsed || undefined}>
        <aside className={s.rail} data-review-id="AppShell/rail" aria-label={t("rail.menu")}>
          <Rail
            {...common}
            collapsed={isCollapsed}
            onToggle={() => setCollapsed(!isCollapsed)}
            initialMenu={initialMenu}
          />
        </aside>

        <header className={s.topbar} data-review-id="AppShell/topbar">
          <IconButton
            icon="menu"
            label={t("rail.openMenu")}
            aria-expanded={open}
            aria-controls={open ? drawerId : undefined}
            onClick={() => setOpen(true)}
          />
          <Link to="/" className={s.topbarName}><Wordmark /></Link>
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

      <Drawer open={open} onClose={() => setOpen(false)} side="left" label={t("rail.menu")}>
        <div id={drawerId} className={s.drawerRail} onClick={closeOnLink}>
          <Rail {...common} collapsed={false} drawer onToggle={() => setOpen(false)} onNavigate={() => setOpen(false)} />
        </div>
      </Drawer>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className={s.brand} data-review-id="AppShell/brand">
      <Wordmark />
    </Link>
  );
}

interface RailProps {
  current: NavKey | null;
  currentSessionId?: string;
  recent: RecentState;
  engine: ShellEngine;
  collapsed: boolean;
  /** In the drawer: the toggle closes it, and a menu choice closes it too. */
  drawer?: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  initialMenu?: InitialMenu;
  onTrashSession?: (id: string) => void;
}

/** The sidebar, expanded or collapsed. The body keeps a fixed width per state, so the rail's width animation only reveals it. */
function Rail({ current, currentSessionId, recent, engine, collapsed, drawer, onToggle, onNavigate, initialMenu, onTrashSession }: RailProps) {
  const toggleLabel = drawer || !collapsed ? t("rail.toggleClose") : t("rail.toggleOpen");
  const toggle = <IconButton icon="sidebar" size={collapsed ? "md" : "sm"} label={toggleLabel} onClick={onToggle} title={undefined} data-review-id="AppShell/toggle" />;
  return (
    <div className={s.railBody} data-collapsed={collapsed || undefined}>
      <div className={s.top}>
        {collapsed ? null : <Brand />}
        {drawer ? toggle : <Tooltip content={toggleLabel} placement={collapsed ? "bottom-start" : "bottom-end"}>{toggle}</Tooltip>}
      </div>

      <nav aria-label={t("nav.main")} className={s.nav} data-review-id="AppShell/nav">
        <NewPractice current={current === "practice"} collapsed={collapsed} />
      </nav>

      {collapsed ? <div className={s.recentSpacer} aria-hidden="true" /> : (
        <Recents
          recent={recent}
          currentSessionId={currentSessionId}
          openRowMenu={initialMenu === "row"}
          onTrashSession={onTrashSession}
          onNavigate={onNavigate}
        />
      )}

      <div className={s.foot} data-review-id="AppShell/account">
        {engine.status === "notReady" ? (collapsed ? (
          <Tooltip content={`${t("rail.engineWarning")}: ${t("rail.notReady")}`} placement="top-start">
            <Link to="/settings/engine" className={s.engineIcon} aria-label={`${t("rail.engineWarning")}: ${t("rail.notReady")}`} data-review-id="AppShell/engine">
              <Icon name="alert" />
            </Link>
          </Tooltip>
        ) : (
          <NavRow
            href="/settings/engine"
            icon="cpu"
            label={t("rail.engineWarning")}
            end={<EngineBadge status="notReady" />}
            current={false}
            linkAs={RouterLink}
            className={s.engineWarn}
          />
        )) : null}
        <Account collapsed={collapsed} defaultOpen={initialMenu === "account"} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/** "New practice": a grey circle with the plus, then the label, like Claude's "New chat" (D59: no white fill). Collapsed: the circle alone. */
function NewPractice({ current, collapsed }: { current: boolean; collapsed: boolean }) {
  const link = (
    <Link to="/" className={s.newRow} aria-current={current ? "page" : undefined} data-review-id="AppShell/new">
      <span className={s.plus}><Icon name="plus" size="sm" /></span>
      <span className={collapsed ? "visually-hidden" : s.newLabel}>{t("nav.newPractice")}</span>
    </Link>
  );
  return collapsed ? <Tooltip content={t("nav.newPractice")} placement="bottom-start">{link}</Tooltip> : link;
}

function Recents({ recent, currentSessionId, openRowMenu, onTrashSession, onNavigate }: {
  recent: RecentState; currentSessionId?: string; openRowMenu: boolean;
  onTrashSession?: (id: string) => void; onNavigate?: () => void;
}) {
  const recentId = useId();
  if (recent.status === "error") return <div className={s.recent} />;
  return (
    <section className={s.recent} aria-labelledby={recentId} data-review-id="AppShell/recent">
      <h2 id={recentId} className={s.recentLabel}>{t("rail.recents")}</h2>
      {recent.status === "loading" ? (
        <Skeleton variant="lines" lines={3} className={s.recentSkeleton} />
      ) : recent.items.length === 0 ? (
        <p className={s.recentEmpty}>{t("rail.noSessions")}</p>
      ) : (
        <ul className={s.chats}>
          {recent.items.map((item, i) => (
            <ChatRow
              key={item.id}
              item={item}
              current={item.id === currentSessionId}
              menuOpen={openRowMenu && i === 0}
              onTrash={onTrashSession}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** One chat: a link row (title, quiet EN) and, on hover or focus, a "…" menu with the actions the app already has. */
function ChatRow({ item, current, menuOpen, onTrash, onNavigate }: {
  item: RecentSession; current: boolean; menuOpen: boolean;
  onTrash?: (id: string) => void; onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const items: MenuEntry[] = [
    { id: "open", label: t("rail.rowOpen"), icon: "chat", onSelect: () => { navigate(`/sessions/${encodeURIComponent(item.id)}`); onNavigate?.(); } },
    ...(onTrash ? [{ id: "trash", label: t("history.row.menuTrash"), icon: "trash" as const, onSelect: () => onTrash(item.id) }] : []),
  ];
  const label = t("rail.rowActions", { title: item.title });
  return (
    <li
      className={s.chatItem}
    >
      <NavRow
        href={`/sessions/${encodeURIComponent(item.id)}`}
        label={item.title}
        end={item.track === "english" ? <span className={s.track} title={t("rail.english")}>EN</span> : undefined}
        current={current}
        linkAs={RouterLink}
        className={s.chat}
      />
      <Menu
        label={label}
        placement="bottom-end"
        defaultOpen={menuOpen}
        className={s.chatActions}
        items={items}
        trigger={(p) => <IconButton {...p} icon="more" size="sm" label={label} title={undefined} data-review-id="AppShell/rowMenu" />}
      />
    </li>
  );
}

/** The account row (avatar, "You" over "Local", a chevron; D59): one button that opens a menu upward, whose header still says
 * "Saved on this computer". Collapsed: the avatar alone. */
function Account({ collapsed, defaultOpen, onNavigate }: { collapsed: boolean; defaultOpen: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const go = (to: string) => () => { navigate(to); onNavigate?.(); };
  const items: MenuEntry[] = [
    { id: "settings", label: t("settings.title"), icon: "settings", onSelect: go("/settings") },
    { id: "appearance", label: t("settings.section.appearance"), icon: "sun", onSelect: go("/settings/appearance") },
    { id: "sep", separator: true },
    { id: "privacy", label: t("settings.section.privacy"), icon: "lock", onSelect: go("/settings/privacy") },
    { id: "help", label: t("rail.help"), icon: "info", onSelect: go("/settings/about#free") },
  ];
  return (
    <Menu
      label={t("rail.accountMenu")}
      placement="top-start"
      open={open}
      onOpenChange={setOpen}
      className={s.accountWrap}
      items={items}
      header={<><span className={s.menuName}>{t("rail.you")}</span><span className={s.menuSub}>{t("rail.storage")}</span></>}
      trigger={(p) => {
        const button = (
          <button {...p} type="button" className={s.account} aria-label={collapsed ? `${t("rail.you")}. ${t("rail.accountMenu")}` : undefined} data-review-id="AppShell/accountButton">
            <span className={s.avatar}><Icon name="user" size="sm" /></span>
            {collapsed ? null : (
              <>
                <span className={s.accountText}>
                  <span className={s.accountName}>{t("rail.you")}</span>
                  <span className={s.accountSub}>{t("rail.local")}</span>
                </span>
                {/* D59: the chevron says the row opens a menu (up while closed, since the menu opens upward). */}
                <span className={s.accountChevron} aria-hidden="true"><Icon name="chevronDown" size="sm" /></span>
              </>
            )}
          </button>
        );
        return collapsed ? <Tooltip content={t("rail.you")} placement="top-start" disabled={open}>{button}</Tooltip> : button;
      }}
    />
  );
}

/* ---------- live container ---------- */

function navFor(pathname: string): NavKey | null {
  if (pathname === "/") return "practice";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/history")) return "history";
  return null;
}


/** The collapsed state of the rail, remembered per browser (`ic.railCollapsed`, D57). */
function useRailCollapsed(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => prefs.railCollapsed());
  const set = useCallback((next: boolean) => {
    setCollapsed(next);
    prefs.setRailCollapsed(next);
  }, []);
  return [collapsed, set];
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <LiveShell>{children}</LiveShell>
    </ToastProvider>
  );
}

/** D73: how often the shell asks whether a session saved after End is ready, and how long it waits. Past the wait the
 * session is offered anyway (its page says "Writing your debrief…" until the debrief lands) or, if nothing was saved,
 * an error says so. Behaviour timers, not motion tokens. */
const SAVE_POLL_MS = 2000;
const SAVE_WAIT_MS = 3 * 60_000;

/** D73 toasts, shared with the review frames: "Saving…" stays (shimmer: real work is going on), "saved" offers the debrief. */
export const savingToast = (): ToastOptions => ({ message: <span className="shimmer-text">{t("session.afterEnd.saving")}</span>, duration: null });
export const savedToast = (onOpen: () => void): ToastOptions => ({
  message: t("session.afterEnd.ready"), action: { label: t("session.afterEnd.open"), onClick: onOpen }, duration: 12_000,
});

/** D73: the toast for a session being saved after End (lib/pendingSave). It stays while the server saves the session
 * and writes the debrief, then says it is ready, with the way in. Polled: the session's socket is gone by then. */
function useSaveWatch(toast: ReturnType<typeof useToast>, loadRecent: () => Promise<void>, navigate: NavigateFunction) {
  const pending = useSyncExternalStore(pendingSave.subscribe, pendingSave.get);
  useEffect(() => {
    if (!pending) return;
    const { id, at } = pending;
    let stopped = false;
    let listed = false;
    let timer = 0;
    const saving = toast.show(savingToast());
    const finish = (saved: boolean) => {
      stopped = true;
      toast.dismiss(saving);
      pendingSave.clear(id);
      void loadRecent();
      toast.show(saved ? savedToast(() => navigate(`/sessions/${encodeURIComponent(id)}`)) : { message: t("session.afterEnd.failed"), tone: "error" });
    };
    const poll = async () => {
      const late = Date.now() - at > SAVE_WAIT_MS;
      try {
        const record = await api.session(id);
        if (stopped) return;
        // Saved: it shows in Recents now; the toast waits for the debrief.
        if (!listed) { listed = true; void loadRecent(); }
        if (record.debrief || late) { finish(true); return; }
      } catch {
        if (stopped) return;
        if (late) { finish(false); return; }
      }
      timer = window.setTimeout(() => { void poll(); }, SAVE_POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      toast.dismiss(saving);
    };
  }, [pending, toast, loadRecent, navigate]);
}

function LiveShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const engine = useEngine();
  const [recent, setRecent] = useState<RecentState>({ status: "loading" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useRailCollapsed();
  const mainRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const loadRecent = useCallback(() => api.sessions().then(
    ({ sessions }) => {
      if (aliveRef.current) setRecent({ status: "ready", items: railSessions(sessions, t("rail.untitled")) });
    },
    () => { if (aliveRef.current) setRecent((prev) => (prev.status === "ready" ? prev : { status: "error" })); },
  ), []);

  useSaveWatch(toast, loadRecent, navigate);

  // Recents: refetched on every navigation (a session may have been added, renamed or trashed).
  useEffect(() => {
    void loadRecent();
  }, [location.pathname, loadRecent]);


  // A new page starts at the top (<main> is the scroll container). Settings is a popup over the page (D76): opening and
  // closing it keeps the page where it was.
  const [page, setPage] = useState(location.pathname);
  if (!location.pathname.startsWith("/settings") && page !== location.pathname) setPage(location.pathname);
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

  // "Move to Trash" from a chat's "…" menu: the same call History makes (soft delete) with the same Undo toast.
  const trashSession = useCallback(async (id: string) => {
    try {
      const { trash_id } = await api.deleteSession(id);
      setRecent((prev) => (prev.status === "ready" ? { ...prev, items: prev.items.filter((x) => x.id !== id) } : prev));
      if (sessionId === id) navigate("/");
      toast.show({
        message: t("history.toast.trashed"),
        action: trash_id ? { label: t("common.undo"), onClick: () => { void api.restoreSession(trash_id).then(loadRecent, (e) => toast.show({ message: errorMessage(e), tone: "error" })); } } : undefined,
      });
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: "error" });
    }
  }, [navigate, sessionId, toast, loadRecent]);

  return (
    <AppShellView
      current={navFor(location.pathname)}
      currentSessionId={sessionId}
      recent={recent}
      engine={engine}
      drawerOpen={drawerOpen}
      onDrawerOpenChange={setDrawerOpen}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      onTrashSession={(id) => { void trashSession(id); }}
      mainRef={mainRef}
      rootRef={rootRef}
    >
      {children}
    </AppShellView>
  );
}
