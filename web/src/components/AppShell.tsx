import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Badge, Icon } from "../ds";
import { t } from "../i18n";
import { useApp } from "../lib/store";
import s from "./AppShell.module.css";

export function EngineStatusBadge() {
  const { selectedEngine, enginesLoading, engines } = useApp();
  if (!engines && enginesLoading) return <Badge>{t("rail.checking")}</Badge>;
  if (!selectedEngine) return <Badge tone="warning" icon="alert">{t("rail.notReady")}</Badge>;
  return selectedEngine.status.ready
    ? <Badge tone="success" icon="check">{t("rail.ready")}</Badge>
    : <Badge tone="warning" icon="alert">{t("rail.notReady")}</Badge>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { selectedEngine } = useApp();
  const links = [
    { to: "/", label: t("nav.practice"), icon: "practice" as const, end: true },
    { to: "/history", label: t("nav.history"), icon: "history" as const, end: false },
    { to: "/settings", label: t("nav.settings"), icon: "settings" as const, end: false },
  ];
  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>{t("app.skipToContent")}</a>
      <header className={s.rail}>
        <Link to="/" className={s.brand}>
          <span className={s.mark}><Icon name="mic" size="sm" /></span>
          <span className={s.brandText}>{t("app.name")}</span>
        </Link>
        <nav aria-label={t("nav.main")} className={s.nav}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={s.navLink} title={l.label}>
              <Icon name={l.icon} />
              <span className={s.navText}>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={s.status}>
          <Link to="/settings/engine" className={s.statusLink}>
            <span className={s.statusLabel}>{t("rail.engineLabel")}</span>
            <span className={s.statusName}>
              <span>{selectedEngine?.name ?? t("rail.unknownEngine")}</span>
              <EngineStatusBadge />
            </span>
          </Link>
          <span className={s.storage}><Icon name="lock" size="sm" />{t("rail.storage")}</span>
        </div>
      </header>
      <main id="main" className={s.main} tabIndex={-1}>{children}</main>
    </div>
  );
}
