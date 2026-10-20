/* Add a job posting: paste the text, give a link, or upload a file (POST /api/vacancies). */
import { useState } from "react";
import { Button, Callout, Dialog, Input, Segmented, Textarea } from "../ds";
import { t } from "../i18n";
import { api, fileToBase64 } from "../lib/api";
import { errorMessage } from "../lib/store";
import type { Vacancy } from "../lib/types";
import s from "./VacancyEditor.module.css";

type Source = "paste" | "link" | "file";
const MIN_CHARS = 80;

export function VacancyEditor({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (v: Vacancy) => void }) {
  const [source, setSource] = useState<Source>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const reset = () => {
    setText(""); setUrl(""); setFile(null); setTitle(""); setError(""); setTouched(false); setSource("paste");
  };
  const close = () => { reset(); onClose(); };
  const tooShort = source === "paste" && text.trim().length < MIN_CHARS;
  const canSave = source === "paste" ? !tooShort : source === "link" ? Boolean(url.trim()) : Boolean(file);

  const save = async () => {
    setTouched(true);
    if (!canSave) return;
    setBusy(true);
    setError("");
    try {
      const body: Parameters<typeof api.createVacancy>[0] = { title: title.trim() };
      if (source === "paste") body.text = text.trim();
      else if (source === "link") body.url = url.trim();
      else if (file) body.file = { name: file.name, data: await fileToBase64(file) };
      const vacancy = await api.createVacancy(body);
      reset();
      onSaved(vacancy);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("vacancy.title")}
      actions={(
        <>
          <Button variant="ghost" onClick={close}>{t("common.cancel")}</Button>
          <Button variant="primary" loading={busy} onClick={() => void save()}>{busy ? t("vacancy.saving") : t("vacancy.save")}</Button>
        </>
      )}
    >
      <form className={s.form} onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Segmented
          label={t("vacancy.tabs")}
          hideLabel
          value={source}
          onChange={setSource}
          options={[
            { value: "paste", label: t("vacancy.paste"), icon: "file" },
            { value: "link", label: t("vacancy.link"), icon: "link" },
            { value: "file", label: t("vacancy.file"), icon: "upload" },
          ]}
        />
        {source === "paste" ? (
          <Textarea
            label={t("vacancy.text")}
            placeholder={t("vacancy.textPlaceholder")}
            value={text}
            rows={8}
            onChange={(e) => setText(e.target.value)}
            error={touched && tooShort ? t("vacancy.textShort", { n: text.trim().length }) : undefined}
          />
        ) : null}
        {source === "link" ? (
          <Input label={t("vacancy.url")} hint={t("vacancy.urlHint")} type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        ) : null}
        {source === "file" ? (
          <Input
            label={t("vacancy.fileLabel")}
            hint={t("vacancy.fileHint")}
            type="file"
            className={s.file}
            accept=".pdf,.docx,.txt,.md,.html,.htm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        ) : null}
        <Input label={t("vacancy.jobTitle")} hint={t("vacancy.jobTitleHint")} optionalText={t("common.optional")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        {error ? <Callout tone="error" live="alert" title={t("vacancy.error")}>{error}</Callout> : null}
      </form>
    </Dialog>
  );
}
