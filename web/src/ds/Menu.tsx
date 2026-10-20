/* Menu / popover (G4, components.md §4). One component, two kinds (ds/screens/home.md §3.2, debrief.md §3.1):
 * - kind "menu" (default): an action menu — job ⋯ (Edit job, Delete job), Debrief ⋯ (Export, Download, Move to
 *   Trash), History row ⋯ at narrow width; radio items (`checked`) for the Strictness menu. WAI-ARIA menu button:
 *   Enter / Space / ↓ open on the first item, ↑ on the last; ↑ ↓ Home End move, a letter jumps, Enter / Space
 *   activate, Esc and Tab close and return focus to the trigger.
 * - kind "listbox": a selection popover — the Saved jobs picker. The listbox (or the search field, as a combobox)
 *   keeps focus and moves an active option with aria-activedescendant; Enter selects, Esc returns focus.
 * Renders into the OverlayRoot layer (review frames) or document.body / the open dialog around the trigger (app),
 * anchored to the trigger; below 640px of container width it becomes a full-width sheet under the trigger.
 * Motion (docs/motion.md 3.6 T2, 3.7): `.motion-menu` in (`base`), `.motion-soft-out` out (`exit`), never blocks. */
import {
  useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, type RefObject,
} from "react";
import { t } from "../i18n";
import { Input } from "./Field";
import { Icon, type IconName } from "./icons";
import { Kbd } from "./Kbd";
import { usePresence } from "./motion";
import { OverlayPortal, useOverlayRoot } from "./OverlayRoot";
import { dialogHost, useAnchoredPosition, useOutsidePress, type Placement } from "./overlay";
import s from "./Menu.module.css";

export interface MenuItem {
  id: string;
  label: string;
  icon?: IconName;
  /** Second line (the Strictness menu explains each level). */
  description?: string;
  /** Radio item (role="menuitemradio"): a check marks the current one. Leave undefined for plain actions. */
  checked?: boolean;
  /** Checkbox item (role="menuitemcheckbox", v2): `checked` is the on / off state; selecting it keeps the menu open. */
  checkbox?: boolean;
  /** Keyboard shortcut hint at the end of the row ("?", "F"): a Kbd, also announced via aria-keyshortcuts. */
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}
export interface MenuSeparator { id: string; separator: true }
export type MenuEntry = MenuItem | MenuSeparator;

export interface ListboxOption {
  id: string;
  label: string;
  description?: string;
  /** Third line, e.g. "Preparing questions…" (may be a ShimmerText). */
  meta?: ReactNode;
  icon?: IconName;
  disabled?: boolean;
}

export interface MenuTriggerProps {
  ref: (el: HTMLElement | null) => void;
  id: string;
  "aria-haspopup": "menu" | "listbox";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

interface CommonProps {
  /** Accessible name of the menu / listbox, e.g. "Kestrel Pay options". */
  label: string;
  /** Renders the trigger; spread the props onto a Button / IconButton. */
  trigger: (props: MenuTriggerProps) => ReactElement;
  /** Anchor to another element than the trigger (the picker matches the composer's width). */
  anchor?: RefObject<HTMLElement | null>;
  placement?: Placement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Render the open popup in the flow under the trigger (no portal): stories and the review gallery. */
  inline?: boolean;
  className?: string;
}

export interface ActionMenuProps extends CommonProps {
  kind?: "menu";
  items: MenuEntry[];
  /** Static block above the items (Session More menu: title + round · strictness). Not focusable, labels nothing. */
  header?: ReactNode;
}

export interface ListboxMenuProps extends CommonProps {
  kind: "listbox";
  options: ListboxOption[];
  value: string | null;
  onChange: (id: string) => void;
  /** Search field on top (home.md: shown when there are more than 5 jobs). */
  search?: { label: string; placeholder?: string };
  /** Under the list, e.g. Button ghost sm "Add a job". */
  footer?: ReactNode;
  /** Popup as wide as the anchor (default true for a listbox). */
  matchWidth?: boolean;
  /** Shown when the search matches nothing. */
  emptyText?: string;
}

export type MenuProps = ActionMenuProps | ListboxMenuProps;

type FocusIntent = "first" | "last" | "current" | null;

export function Menu(props: MenuProps) {
  const { label, trigger, anchor, placement = "bottom-start", open: openProp, defaultOpen = false, onOpenChange, inline, className } = props;
  const kind = props.kind ?? "menu";
  const [openState, setOpenState] = useState(defaultOpen);
  const isOpen = openProp ?? openState;
  const { mounted, leaving } = usePresence(isOpen);
  const { container } = useOverlayRoot();
  const triggerRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const focusIntent = useRef<FocusIntent>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const baseId = useId();
  const popupId = `${baseId}-popup`;

  const setOpen = useCallback((next: boolean, intent: FocusIntent = null) => {
    focusIntent.current = next ? intent : null;
    if (next && triggerRef.current) setHost(dialogHost(triggerRef.current));
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  }, [openProp, onOpenChange]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  }, [setOpen]);

  const positioned = useAnchoredPosition({
    active: mounted && !inline,
    anchor: anchor ?? triggerRef,
    floating: floatingRef,
    container,
    placement,
    matchWidth: kind === "listbox" ? (props as ListboxMenuProps).matchWidth ?? true : false,
    sheetWhenNarrow: true,
  });

  useOutsidePress(isOpen && !leaving, [triggerRef, floatingRef], () => close(false));

  const triggerProps: MenuTriggerProps = {
    ref: (el) => { triggerRef.current = el; },
    id: `${baseId}-trigger`,
    "aria-haspopup": kind === "listbox" ? "listbox" : "menu",
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? popupId : undefined,
    onClick: () => setOpen(!isOpen, isOpen ? null : "current"),
    onKeyDown: (e) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true, kind === "listbox" ? "current" : e.key === "ArrowDown" ? "first" : "current");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true, "last");
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close(true);
      }
    },
  };

  const popup = !mounted ? null : kind === "listbox" ? (
    <ListboxPopup
      {...(props as ListboxMenuProps)}
      popupId={popupId}
      floatingRef={floatingRef}
      focusIntent={focusIntent}
      onClose={close}
      side={positioned.side}
      style={inline ? undefined : positioned.style}
      ready={Boolean(inline) || positioned.placed !== null}
      leaving={leaving}
      inline={Boolean(inline)}
      label={label}
    />
  ) : (
    <MenuPopup
      items={(props as ActionMenuProps).items}
      header={(props as ActionMenuProps).header}
      popupId={popupId}
      triggerId={triggerProps.id}
      floatingRef={floatingRef}
      focusIntent={focusIntent}
      onClose={close}
      side={positioned.side}
      align={positioned.align}
      style={inline ? undefined : positioned.style}
      ready={Boolean(inline) || positioned.placed !== null}
      leaving={leaving}
      inline={Boolean(inline)}
      label={label}
    />
  );

  return (
    <span className={`${inline ? s.inlineWrap : s.wrap} ${className ?? ""}`}>
      {trigger(triggerProps)}
      {popup && (inline ? popup : <OverlayPortal host={host}>{popup}</OverlayPortal>)}
    </span>
  );
}

interface PopupBase {
  popupId: string;
  floatingRef: RefObject<HTMLDivElement | null>;
  focusIntent: RefObject<FocusIntent>;
  onClose: (returnFocus: boolean) => void;
  side: "top" | "bottom";
  style: React.CSSProperties | undefined;
  /** Positioned and visible: focus can move in. */
  ready: boolean;
  leaving: boolean;
  inline: boolean;
  label: string;
}

function popupClass(base: string | undefined, p: { side: "top" | "bottom"; leaving: boolean; inline: boolean }, align: "start" | "end" = "start") {
  return [
    s.popover, base, p.inline ? s.inline : s.floating,
    p.side === "top" ? s.top : s.bottom, align === "end" ? s.alignEnd : "",
    p.leaving ? "motion-soft-out" : "motion-menu",
  ].filter(Boolean).join(" ");
}

function isItem(e: MenuEntry): e is MenuItem {
  return !("separator" in e);
}

function MenuPopup({ items, header, popupId, floatingRef, focusIntent, onClose, side, align, style, ready, leaving, inline, label }: PopupBase & {
  items: MenuEntry[]; header?: ReactNode; triggerId: string; align: "start" | "end";
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.map((e, i) => (isItem(e) && !e.disabled ? i : -1)).filter((i) => i >= 0);

  useLayoutEffect(() => {
    const intent = focusIntent.current;
    if (!intent || leaving || !ready) return;
    focusIntent.current = null;
    const checked = items.findIndex((e) => isItem(e) && e.checked && !e.disabled);
    const index = intent === "last" ? enabled[enabled.length - 1] : intent === "current" && checked >= 0 ? checked : enabled[0];
    if (index !== undefined) itemRefs.current[index]?.focus({ preventScroll: true });
  });

  const move = (from: number, delta: number) => {
    if (!enabled.length) return;
    const pos = enabled.indexOf(from);
    const next = enabled[(pos + delta + enabled.length) % enabled.length];
    if (next !== undefined) itemRefs.current[next]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); move(current < 0 ? enabled[enabled.length - 1] ?? 0 : current, 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(current < 0 ? enabled[0] ?? 0 : current, -1); }
    else if (e.key === "Home") { e.preventDefault(); itemRefs.current[enabled[0] ?? 0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); itemRefs.current[enabled[enabled.length - 1] ?? 0]?.focus(); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); onClose(true); }
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const ch = e.key.toLowerCase();
      const order = [...enabled.filter((i) => i > current), ...enabled.filter((i) => i <= current)];
      const hit = order.find((i) => {
        const entry = items[i];
        return entry && isItem(entry) && entry.label.toLowerCase().startsWith(ch);
      });
      if (hit !== undefined) itemRefs.current[hit]?.focus();
    }
  };

  const hasChecks = items.some((e) => isItem(e) && (e.checked !== undefined || e.checkbox));
  return (
    <div
      ref={floatingRef}
      id={popupId}
      role="menu"
      aria-label={label}
      className={popupClass(s.menu, { side, leaving, inline }, align)}
      style={style}
      onKeyDown={onKey}
    >
      {header ? <div className={s.header}>{header}</div> : null}
      {header ? <div role="separator" className={s.separator} /> : null}
      {items.map((entry, i) => {
        if (!isItem(entry)) return <div key={entry.id} role="separator" className={s.separator} />;
        const checkable = entry.checked !== undefined || entry.checkbox;
        return (
          <button
            key={entry.id}
            ref={(el) => { itemRefs.current[i] = el; }}
            type="button"
            role={entry.checkbox ? "menuitemcheckbox" : checkable ? "menuitemradio" : "menuitem"}
            aria-checked={checkable ? Boolean(entry.checked) : undefined}
            aria-keyshortcuts={entry.shortcut}
            disabled={entry.disabled}
            tabIndex={-1}
            className={s.item}
            onClick={() => {
              // A checkbox toggles in place (the menu stays open, focus stays on the item); everything else closes.
              if (!entry.checkbox) onClose(true);
              entry.onSelect?.();
            }}
          >
            {hasChecks ? (
              <span className={`${s.check} ${entry.checkbox ? s.box : ""}`} aria-hidden="true">
                {entry.checked ? <Icon name="check" size="sm" /> : null}
              </span>
            ) : null}
            {entry.icon ? <span className={s.itemIcon}><Icon name={entry.icon} size="sm" /></span> : null}
            <span className={s.itemText}>
              <span className={s.itemLabel}>{entry.label}</span>
              {entry.description ? <span className={s.itemDescription}>{entry.description}</span> : null}
            </span>
            {entry.shortcut ? <span className={s.shortcut} aria-hidden="true"><Kbd>{entry.shortcut}</Kbd></span> : null}
          </button>
        );
      })}
    </div>
  );
}

function ListboxPopup({
  options, value, onChange, search, footer, emptyText, popupId, floatingRef, focusIntent, onClose, side, style, ready, leaving, inline, label,
}: PopupBase & ListboxMenuProps) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);
  const enabled = shown.filter((o) => !o.disabled);
  const selectedIndex = enabled.findIndex((o) => o.id === value);
  const [activeId, setActiveId] = useState<string | null>(value);
  const active = enabled.find((o) => o.id === activeId) ?? enabled[Math.max(0, selectedIndex)] ?? null;
  const optionId = (id: string) => `${popupId}-opt-${id}`;

  useLayoutEffect(() => {
    const intent = focusIntent.current;
    if (!intent || leaving || !ready) return;
    focusIntent.current = null;
    if (intent === "last") setActiveId(enabled[enabled.length - 1]?.id ?? null);
    (searchRef.current ?? listRef.current)?.focus({ preventScroll: true });
  }, [focusIntent, leaving, ready, enabled]);

  useEffect(() => {
    if (!active) return;
    // Scroll the list only (scrollIntoView would also scroll every ancestor: the page, the review frame).
    const list = listRef.current;
    const el = document.getElementById(optionId(active.id));
    if (!list || !el) return;
    const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + el.offsetHeight - list.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const choose = (id: string) => {
    onChange(id);
    onClose(true);
  };

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    const pos = active ? enabled.indexOf(active) : -1;
    const go = (i: number) => {
      const o = enabled[(i + enabled.length) % enabled.length];
      if (o) setActiveId(o.id);
    };
    if (e.key === "ArrowDown") { e.preventDefault(); go(pos + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); go(pos - 1); }
    else if (e.key === "Home" && !search) { e.preventDefault(); go(0); }
    else if (e.key === "End" && !search) { e.preventDefault(); go(enabled.length - 1); }
    else if (e.key === "Enter" || (e.key === " " && !search)) {
      if (active) { e.preventDefault(); choose(active.id); }
    } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(true); }
  };

  const listboxId = `${popupId}-list`;
  return (
    <div
      ref={floatingRef}
      id={popupId}
      className={popupClass(s.picker, { side, leaving, inline })}
      style={style}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onClose(true); } }}
    >
      {search ? (
        <div className={s.search}>
          <Input
            ref={searchRef}
            label={search.label}
            hideLabel
            placeholder={search.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(active.id) : undefined}
            adornment={<span className={s.searchIcon}><Icon name="search" size="sm" /></span>}
            onKeyDown={onKey}
          />
        </div>
      ) : null}
      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        tabIndex={search ? -1 : 0}
        aria-activedescendant={!search && active ? optionId(active.id) : undefined}
        className={s.list}
        onKeyDown={search ? undefined : onKey}
      >
        {shown.map((o) => {
          const selected = o.id === value;
          return (
            <div
              key={o.id}
              id={optionId(o.id)}
              role="option"
              aria-selected={selected}
              aria-disabled={o.disabled || undefined}
              className={`${s.option} ${active?.id === o.id ? s.active : ""}`}
              onPointerMove={() => { if (!o.disabled) setActiveId(o.id); }}
              onClick={() => { if (!o.disabled) choose(o.id); }}
            >
              <span className={s.check} aria-hidden="true">{selected ? <Icon name="check" size="sm" /> : null}</span>
              {o.icon ? <span className={s.itemIcon}><Icon name={o.icon} size="sm" /></span> : null}
              <span className={s.itemText}>
                <span className={s.optionLabel}>{o.label}</span>
                {o.description ? <span className={s.itemDescription}>{o.description}</span> : null}
                {o.meta ? <span className={s.optionMeta}>{o.meta}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
      {!shown.length ? <p className={s.empty} role="status">{emptyText ?? t("overlay.noMatches")}</p> : null}
      {footer ? <div className={s.footer}>{footer}</div> : null}
    </div>
  );
}
