import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ds";
import { openComment } from "./comments";
import s from "./review.module.css";

/** One floating "comment" pill over the block under the pointer or focus ([data-review-section]). */
export function CommentButton() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const pick = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t || btn.current?.contains(t)) return;
      const sec = t.closest<HTMLElement>("[data-review-section]");
      if (sec) setTarget(sec);
    };
    document.addEventListener("pointerover", pick);
    document.addEventListener("focusin", pick);
    return () => { document.removeEventListener("pointerover", pick); document.removeEventListener("focusin", pick); };
  }, []);

  useEffect(() => {
    if (!target) return;
    const place = () => {
      const r = target.getBoundingClientRect();
      setPos({ top: r.top + window.scrollY, left: r.right + window.scrollX });
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place); window.removeEventListener("resize", place); };
  }, [target]);

  if (!target) return null;
  const name = target.dataset.reviewSection ?? "block";
  return createPortal(
    <button
      ref={btn}
      type="button"
      className={s.commentBtn}
      style={{ top: pos.top, left: pos.left }}
      aria-label={`Comment on ${name}`}
      title={`Comment on ${name}`}
      onClick={() => void openComment(target.closest("[data-comment-target]") ?? target)}
    >
      <Icon name="chat" size="sm" />
      <span className={s.commentLabel}>{name}</span>
    </button>,
    document.body,
  );
}
