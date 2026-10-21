/* Typed REST client for app/server (all routes under /api). Errors become ApiError with the server's code. */
import type {
  Debrief, EngineId, EngineStatus, EnginesResponse, EngineConnectResult, EngineTestResult, Health, MemorySummary, OllamaModelsResponse,
  Profile, Question, SessionRecord, SessionSummary, Settings, SettingsPatch, SttInfo, StrongerVersion, TelemetryInfo, VoiceCheckResult,
  TrashItem, Vacancy, VacancySummary, VoicesResponse, LanguageItem, LanguageLayer,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public hint?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
  } catch {
    throw new ApiError(0, "server_unreachable", "The app server is not answering.");
  }
  if (!res.ok) {
    let code = "http_" + res.status;
    let message = res.statusText;
    let hint: string | undefined;
    try {
      const body = (await res.json()) as { detail?: { code?: string; message?: string; hint?: string } | string };
      if (body.detail && typeof body.detail === "object") {
        code = body.detail.code ?? code;
        message = body.detail.message ?? message;
        hint = body.detail.hint;
      } else if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, code, message, hint);
  }
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

/** Read a File as base64 (no data: prefix) for the upload endpoints. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export const api = {
  health: () => request<Health>("/health"),
  engines: () => request<EnginesResponse>("/engines"),
  engineStatus: (id: EngineId) => request<EngineStatus>(`/engines/${id}/status`),
  ollamaModels: () => request<OllamaModelsResponse>("/engines/ollama/models"),
  testEngine: (id: EngineId) => post<EngineTestResult>(`/engines/${id}/test`),
  connectEngine: (id: EngineId) => post<EngineConnectResult>(`/engines/${id}/connect`),
  settings: () => request<Settings>("/settings"),
  saveSettings: (patch: SettingsPatch) => post<Settings>("/settings", patch),
  voices: () => request<VoicesResponse>("/voices"),
  voiceSampleUrl: (voice: string) => `/api/voices/sample?voice=${encodeURIComponent(voice)}`,
  stt: () => request<SttInfo>("/stt"),
  /** Setup check (D81): what you said (recorded PCM or the browser's text) → what was heard → Mike's reply. */
  voiceCheck: (body: { audio?: string; text?: string; voice?: string }) => post<VoiceCheckResult>("/check/voice", body),
  profile: () => request<Profile>("/profile"),
  saveProfile: (text: string, source = "pasted") =>
    request<Profile>("/profile", { method: "PUT", body: JSON.stringify({ text, source }) }),
  /** Adds a CV file (D79: up to 10); `replace` swaps the file with that id. */
  uploadProfile: async (file: File, replace?: string) =>
    post<Profile>("/profile/upload", { name: file.name, data: await fileToBase64(file), ...(replace ? { replace } : {}) }),
  deleteProfileFile: (id: string) => request<Profile>(`/profile/files/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteProfile: () => request<{ ok: boolean }>("/profile", { method: "DELETE" }),
  vacancies: () => request<{ vacancies: VacancySummary[] }>("/vacancies"),
  vacancy: (id: string) => request<Vacancy>(`/vacancies/${encodeURIComponent(id)}`),
  createVacancy: (body: { title?: string; text?: string; url?: string; file?: { name: string; data: string } }) =>
    post<Vacancy>("/vacancies", body),
  deleteVacancy: (id: string) => request<{ id: string; trash_id: string }>(`/vacancies/${encodeURIComponent(id)}`, { method: "DELETE" }),
  vacancyQuestions: (id: string) => post<{ questions: Question[] }>(`/vacancies/${encodeURIComponent(id)}/questions`),
  sessions: () => request<{ sessions: SessionSummary[] }>("/sessions"),
  session: (id: string) => request<SessionRecord>(`/sessions/${encodeURIComponent(id)}`),
  sessionMarkdownUrl: (id: string) => `/api/sessions/${encodeURIComponent(id)}/markdown`,
  /** D80: rename, or move to the Archive and back. */
  patchSession: (id: string, patch: { title?: string; archived?: boolean }) =>
    request<{ id: string; title: string; archived: boolean }>(`/sessions/${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }),
  deleteSession: (id: string) => request<{ id: string; trash_id: string }>(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  trash: () => request<{ items: TrashItem[] }>("/sessions/trash"),
  restoreSession: (trashId: string) => post<{ ok: boolean; id: string }>(`/sessions/trash/${encodeURIComponent(trashId)}/restore`),
  rerunDebrief: (id: string) => post<Debrief>(`/sessions/${encodeURIComponent(id)}/debrief`),
  sessionFlag: (id: string, flagId: string, feedbackId: string, action: "confirm" | "dismiss" | "restore") =>
    post<{ flag: LanguageItem; language: LanguageLayer }>(
      `/sessions/${encodeURIComponent(id)}/flags/${encodeURIComponent(flagId)}`, { feedback_id: feedbackId, action }),
  sessionStronger: (id: string, feedbackId: string) =>
    post<StrongerVersion>(`/sessions/${encodeURIComponent(id)}/stronger`, { feedback_id: feedbackId }),
  memory: () => request<MemorySummary>("/memory"),
  telemetry: () => request<TelemetryInfo>("/telemetry"),
  setTelemetry: (optIn: boolean, clear = false) => post<TelemetryInfo>("/telemetry", { opt_in: optIn, clear }),
};
