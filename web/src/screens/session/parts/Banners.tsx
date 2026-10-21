/* BrowserBanner / StorageNotWritable (US-06 AC1, AC4; US-23 AC4) and the live app's notices: Callouts never inserted
 * while the user is speaking (the container withholds them). D61: they sit in the dock right above the island (not
 * over the top of the stage, D60): the dock is measured, so the transcript keeps its room and the glow is never cut. */
import { useState } from "react";
import { Button, Callout, IconButton } from "../../../ds";
import { t } from "../../../i18n";
import type { SessionData, SessionHandlers, SessionOverlay } from "../types";
import s from "./parts.module.css";

export function Banners({ overlay, notices, handlers }: {
  overlay: SessionOverlay; notices: SessionData["notices"]; handlers?: SessionHandlers;
}) {
  const [dismissed, setDismissed] = useState(false);
  const showBrowser = overlay === "browser" && !dismissed;
  const showStorage = overlay === "storage";
  if (!showBrowser && !showStorage && !notices?.length) return null;
  return (
    <div className={s.banners} data-review-id="Session/Banner" data-review-section="Session · Banners" data-comment-target>
      {showBrowser ? (
        <Callout
          tone="warning"
          icon="globe"
          title={t("session.banner.browserTitle")}
          actions={
            <>
              <Button variant="secondary" size="sm" icon="keyboard" onClick={handlers?.onUseText}>{t("session.banner.useText")}</Button>
              <IconButton icon="x" size="sm" label={t("session.banner.dismiss")} onClick={() => { setDismissed(true); handlers?.onDismissBanner?.(); }} />
            </>
          }
        >
          {t("session.banner.browserBody")}
        </Callout>
      ) : null}
      {showStorage ? (
        <Callout
          tone="warning"
          icon="folder"
          title={t("session.banner.storageTitle")}
          actions={<Button variant="secondary" size="sm" onClick={handlers?.onFixSettings}>{t("session.banner.fixSettings")}</Button>}
        >
          {t("session.banner.storageBody")}
        </Callout>
      ) : null}
      {notices?.map((n) => (
        <Callout
          key={n.id}
          tone={n.tone}
          title={n.title}
          live={n.tone === "error" ? "alert" : "status"}
          actions={
            n.action ? <Button variant="primary" size="sm" iconRight="arrowRight" onClick={n.action.onClick}>{n.action.label}</Button>
              : n.onDismiss ? <Button variant="ghost" size="sm" onClick={n.onDismiss}>{t("session.errors.dismiss")}</Button> : undefined
          }
        >
          {n.text}
        </Callout>
      ))}
    </div>
  );
}
