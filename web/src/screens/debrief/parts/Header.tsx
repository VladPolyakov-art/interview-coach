/* Debrief header (debrief.md §3.1): back link, H1 with rename + "more" menu, structured meta row.
 * Rename swaps the H1 for InlineRename (Swap, `fast`). The menu: Export to Obsidian (only when a folder is set),
 * Download as Markdown, Move to Trash (neutral: reversible, CONTRACT §2.4). The example has no rename or menu. */
import { Link } from "react-router-dom";
import { Badge, Icon, IconButton, InlineRename, Menu, Swap, Tooltip, type MenuEntry } from "../../../ds";
import { t } from "../../../i18n";
import type { MetaItem } from "../types";
import s from "./header.module.css";

export interface HeaderProps {
  title: string;
  meta: MetaItem[];
  example?: boolean;
  obsidian?: boolean;
  renaming: boolean;
  /** Focus the field when renaming starts (false for a state that starts in rename: review, stories). */
  focusRename: boolean;
  onRenameStart?: () => void;
  onRenameSave: (title: string) => void;
  onRenameCancel: () => void;
  onExport?: () => void;
  onDownload?: () => void;
  onTrash?: () => void;
}

export function BackLink() {
  return (
    <Link to="/history" className={s.back}>
      <Icon name="chevronLeft" size="sm" />
      {t("debrief.back")}
    </Link>
  );
}

export function Header(p: HeaderProps) {
  const items: MenuEntry[] = [
    ...(p.obsidian ? [{ id: "export", label: t("debrief.menu.export"), icon: "folder" as const, onSelect: p.onExport }] : []),
    { id: "download", label: t("debrief.menu.download"), icon: "download" as const, onSelect: p.onDownload },
    { id: "sep", separator: true as const },
    { id: "trash", label: t("debrief.menu.trash"), icon: "trash" as const, onSelect: p.onTrash },
  ];
  const showMenu = !p.example && (p.onDownload || p.onTrash || p.onExport);
  return (
    <header className={s.header} data-review-id="Debrief/Header" data-review-section="Debrief · Header" data-comment-target="">
      <BackLink />
      <Swap swapKey={p.renaming ? "rename" : "title"}>
        {p.renaming ? (
          <InlineRename size="lg" value={p.title} autoFocus={p.focusRename} onSave={p.onRenameSave} onCancel={p.onRenameCancel} />
        ) : (
          <div className={s.titleRow}>
            <Tooltip content={p.title} onlyWhenTruncated block placement="bottom-start" className={s.titleTip}>
              <h1 className={s.title} data-truncate="">{p.title}</h1>
            </Tooltip>
            {p.example ? <Badge>{t("debrief.exampleBadge")}</Badge> : null}
            {!p.example && p.onRenameStart ? (
              <IconButton icon="edit" size="sm" label={t("debrief.rename")} onClick={p.onRenameStart} />
            ) : null}
            {showMenu ? (
              <Menu
                label={t("debrief.moreActions")}
                items={items}
                placement="bottom-end"
                trigger={(props) => <IconButton icon="more" size="sm" label={t("debrief.moreActions")} {...props} />}
              />
            ) : null}
          </div>
        )}
      </Swap>
      <ul className={s.meta} aria-label={t("debrief.meta.label")}>
        {p.meta.map((m, i) => (
          <li key={i} className={`${s.metaItem} ${m.tone === "warning" ? s.warning : ""}`}>
            <Icon name={m.icon} size="sm" />
            {m.href ? <Link to={m.href} className={s.metaLink}>{m.text}</Link> : <span>{m.text}</span>}
          </li>
        ))}
      </ul>
    </header>
  );
}
