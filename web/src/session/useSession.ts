/* Wires the session socket (/ws/session) to the reducer, the mic (VoiceCapture or BrowserStt) and Mike's audio.
 * Turn ids, echo guard and barge-in follow the prototype (studio.js): starting to speak stops Mike's audio at once,
 * drops any frames still arriving for his cut-off line, and sends activity_start so the server records the cut. */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { MAX_BUFFERED_BYTES } from "../audio/framing";
import { BrowserStt, browserSttSupported } from "../audio/browserStt";
import { captureErrorCode, VoiceCapture, type CaptureError } from "../audio/capture";
import { Playback } from "../audio/playback";
import type { ClientMessage, ServerMessage, StartMessage } from "../lib/types";
import { t } from "../i18n";
import { initialState, sessionReducer } from "./reducer";

export interface SessionConfig {
  start: StartMessage;
  /** Voice input recognised by the browser (Web Speech) instead of the server's local STT. */
  browserStt: boolean;
  /** Seconds of quiet that end a voice answer; 0 = manual (Send now). */
  pauseSec: number;
}

export function socketUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/session`;
}

export function useSession(config: SessionConfig) {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => initialState(config.start.input, config.start.mode));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState<CaptureError | "stt_unsupported" | "stt_denied" | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const playback = useRef<Playback | null>(null);
  const capture = useRef<VoiceCapture | null>(null);
  const stt = useRef<BrowserStt | null>(null);
  const turnId = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const configRef = useRef(config);

  const send = useCallback((msg: ClientMessage) => {
    const socket = ws.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
  }, []);

  const endRef = useRef<() => void>(() => {});

  const sendPcm = useCallback((buffer: ArrayBuffer) => {
    const socket = ws.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
      dispatch({ type: "local/client_error", code: "socket_backlog", message: t("session.errors.backlog") });
      endRef.current();
      return;
    }
    socket.send(buffer);
  }, []);

  const stopMic = useCallback(() => {
    capture.current?.stop();
    capture.current = null;
    stt.current?.stop();
    stt.current = null;
  }, []);

  /** Start the microphone for voice input. Falls back to text input (with a reason) when it fails. */
  const startMic = useCallback(async () => {
    const context = ctx.current;
    if (!context || capture.current) return;
    const useBrowser = configRef.current.browserStt;
    if (useBrowser && !browserSttSupported()) {
      setMicError("stt_unsupported");
      dispatch({ type: "local/input_changed", input: "text" });
      return;
    }
    const cap = new VoiceCapture(context, {
      onTurnStart: (preRoll) => {
        const pb = playback.current;
        if (pb) {
          pb.suppressed = true;
          pb.stop();
        }
        turnId.current += 1;
        send({ type: "activity_start", turn_id: turnId.current });
        if (!useBrowser) preRoll.forEach(sendPcm);
        dispatch({ type: "local/voice_turn_started", turnId: turnId.current });
      },
      onFrame: (buffer) => {
        if (!useBrowser) sendPcm(buffer);
      },
      onTurnEnd: () => {
        if (!useBrowser) {
          send({ type: "audio_stream_end" });
          dispatch({ type: "local/voice_turn_sent" });
          return;
        }
        // Give the browser a moment to finalise the last words, then send the recognised text.
        window.setTimeout(() => {
          const recogniser = stt.current;
          const text = recogniser?.text() ?? "";
          recogniser?.consume();
          if (text) {
            send({ type: "user_turn", text, turn_id: turnId.current, source: "browser_stt" });
            dispatch({ type: "local/user_turn", turnId: turnId.current, text });
          } else {
            dispatch({ type: "local/voice_turn_dropped" });
            dispatch({ type: "notice", code: "not_heard", message: t("session.notice.notHeard") });
          }
        }, configRef.current.pauseSec ? 250 : 700);
      },
      onMutedSpeech: () => dispatch({ type: "notice", code: "muted_speech", message: t("session.notice.mutedSpeech") }),
      echoRisk: () => playback.current?.echoRisk ?? false,
    }, configRef.current.pauseSec * 1000);
    try {
      await cap.start();
    } catch (error) {
      cap.stop();
      setMicError(captureErrorCode(error));
      dispatch({ type: "local/input_changed", input: "text" });
      return;
    }
    capture.current = cap;
    cap.setEnabled(stateRef.current.phase === "live" && !stateRef.current.closing);
    if (useBrowser) {
      const rec = new BrowserStt();
      rec.isEcho = () => !(capture.current?.recording ?? false) && (playback.current?.playing ?? false);
      rec.onText = (text) => {
        if (capture.current?.recording) dispatch({ type: "speech_preview", turn_id: turnId.current, text });
      };
      rec.onDenied = () => {
        setMicError("stt_denied");
        stopMic();
        dispatch({ type: "local/input_changed", input: "text" });
      };
      rec.start();
      stt.current = rec;
    }
  }, [send, sendPcm, stopMic]);

  /* ---------- socket lifecycle ---------- */
  useEffect(() => {
    const start = configRef.current.start;
    const needsAudio = start.speak || start.input !== "text";
    if (needsAudio) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        const context = new Ctor();
        void context.resume().catch(() => {});
        ctx.current = context;
        const pb = new Playback(context);
        pb.onChange = setPlaying;
        playback.current = pb;
      }
    }
    const socket = new WebSocket(socketUrl());
    socket.binaryType = "arraybuffer";
    ws.current = socket;
    socket.onopen = () => socket.send(JSON.stringify(start));
    socket.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
      if (ws.current !== socket) return;
      if (event.data instanceof ArrayBuffer) {
        if (!stateRef.current.recording) playback.current?.enqueue(event.data);
        return;
      }
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === "turn_start" && playback.current) playback.current.suppressed = false;
      if (msg.type === "interrupted") playback.current?.stop();
      dispatch(msg);
    };
    socket.onclose = () => {
      if (ws.current !== socket) return;
      dispatch({ type: "local/socket_closed" });
    };
    return () => {
      ws.current = null;
      socket.onmessage = null;
      socket.onclose = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
      stopMic();
      playback.current?.stop();
      playback.current = null;
      const context = ctx.current;
      ctx.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, [stopMic]);

  /* Start the mic once the session is live (voice input only). */
  useEffect(() => {
    if (state.phase === "live" && state.input !== "text" && !capture.current) void startMic();
  }, [state.phase, state.input, startMic]);

  /* Voice turns are allowed only while the session is live and before Mike's closing line. */
  useEffect(() => {
    capture.current?.setEnabled(state.phase === "live" && !state.closing);
    if (state.phase !== "live" && state.phase !== "connecting") stopMic();
  }, [state.phase, state.closing, stopMic]);

  /* Close the socket once the session is over. */
  useEffect(() => {
    if (state.phase === "done") ws.current?.close();
  }, [state.phase]);

  /* ---------- actions ---------- */
  const end = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "live" && s.phase !== "connecting") return;
    capture.current?.cancel();
    playback.current?.stop();
    dispatch({ type: "local/end_requested" });
    if (ws.current?.readyState === WebSocket.OPEN) send({ type: "end_session" });
    else ws.current?.close();
  }, [send]);
  endRef.current = end;

  const actions = useMemo(() => ({
    sendText(text: string) {
      const clean = text.trim();
      if (!clean || stateRef.current.phase !== "live") return false;
      playback.current?.stop();
      turnId.current += 1;
      send({ type: "user_turn", text: clean, turn_id: turnId.current, source: "text" });
      dispatch({ type: "local/user_turn", turnId: turnId.current, text: clean });
      return true;
    },
    toggleMute() {
      setMuted((m) => {
        const next = !m;
        capture.current?.setMuted(next);
        return next;
      });
    },
    /** Interrupt Mike / talk now. */
    interrupt() {
      if (stateRef.current.input !== "text" && capture.current && !muted) capture.current.beginManual();
      else playback.current?.stop();
    },
    sendNow() {
      capture.current?.commit();
    },
    redo() {
      capture.current?.cancel();
      dispatch({ type: "local/voice_turn_dropped" });
      send({ type: "redo_answer" });
    },
    flag(feedbackId: string, flagId: string, action: "confirm" | "dismiss" | "restore") {
      send({ type: "flag_action", feedback_id: feedbackId, flag_id: flagId, action });
    },
    stronger(feedbackId: string) {
      dispatch({ type: "local/stronger_requested", feedbackId });
      send({ type: "request_stronger", feedback_id: feedbackId });
    },
    setSuggest(on: boolean) {
      dispatch({ type: "local/suggest", on });
      send({ type: "suggest", on });
    },
    switchToText() {
      stopMic();
      dispatch({ type: "local/input_changed", input: "text" });
    },
    dismissNotice() {
      dispatch({ type: "local/dismiss_notice" });
    },
    dismissError() {
      dispatch({ type: "local/dismiss_error" });
    },
    end,
  }), [send, stopMic, end, muted]);

  return { state, playing, muted, micError, actions };
}
