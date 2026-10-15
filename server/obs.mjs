// The OBS connection: an obs-websocket (protocol 5, OBS 28+) client that keeps whether OBS is
// streaming or recording, for the island's "on air" dot (server/extras.mjs). The password stays
// here; kiosks get only the state. It reconnects with a growing delay while OBS is closed.
//
// Node built-ins only (the global WebSocket, Node 22+). `obsAuth` and `obsStep` are pure.

import crypto from "node:crypto";

const RECONNECT_MIN_MS = 5_000;
const RECONNECT_MAX_MS = 60_000;
/** Identify's event subscription: the Outputs category (stream and record state). */
const SUBSCRIBE_OUTPUTS = 1 << 6;

export const emptyObs = (configured = false) => ({ configured, connected: false, streaming: false, recording: false });

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("base64");

/** The Identify authentication string for a Hello's `challenge` and `salt`. */
export const obsAuth = (password, salt, challenge) => sha256(sha256(password + salt) + challenge);

/**
 * One message from OBS: the next state and the messages to send back.
 * Hello → Identify; Identified → ask the stream and record status; their replies and the
 * Stream/RecordStateChanged events → the state.
 */
export function obsStep(state, message, password) {
  const d = message?.d ?? {};
  switch (message?.op) {
    case 0: {
      const auth = d.authentication ? { authentication: obsAuth(password, d.authentication.salt, d.authentication.challenge) } : {};
      return { state, send: [{ op: 1, d: { rpcVersion: 1, eventSubscriptions: SUBSCRIBE_OUTPUTS, ...auth } }] };
    }
    case 2:
      return {
        state: { ...state, connected: true },
        send: [
          { op: 6, d: { requestType: "GetStreamStatus", requestId: "stream" } },
          { op: 6, d: { requestType: "GetRecordStatus", requestId: "record" } },
        ],
      };
    case 5: {
      const active = d.eventData?.outputActive === true;
      if (d.eventType === "StreamStateChanged") return { state: { ...state, streaming: active }, send: [] };
      if (d.eventType === "RecordStateChanged") return { state: { ...state, recording: active }, send: [] };
      return { state, send: [] };
    }
    case 7: {
      if (d.requestStatus?.result !== true) return { state, send: [] };
      const active = d.responseData?.outputActive === true;
      if (d.requestId === "stream") return { state: { ...state, streaming: active }, send: [] };
      if (d.requestId === "record") return { state: { ...state, recording: active }, send: [] };
      return { state, send: [] };
    }
  }
  return { state, send: [] };
}

const same = (a, b) => a.configured === b.configured && a.connected === b.connected && a.streaming === b.streaming && a.recording === b.recording;

/**
 * The live connection. `settings()` returns { host, port, password } (host "" = not set up);
 * `onChange(state)` runs on every change. Call `reconfigure()` after the settings change.
 */
export function createObs({ settings, onChange, WebSocketImpl = globalThis.WebSocket, log = () => {} }) {
  let state = emptyObs();
  let socket = null;
  let timer = null;
  let delay = RECONNECT_MIN_MS;
  let generation = 0;

  const set = (next) => {
    if (same(state, next)) return;
    state = next;
    onChange(state);
  };

  const close = () => {
    generation++;
    clearTimeout(timer);
    timer = null;
    if (socket) {
      try {
        socket.close();
      } catch {
        // Already closed.
      }
      socket = null;
    }
  };

  const connect = () => {
    const { host, port, password } = settings();
    if (!host || !WebSocketImpl) {
      set(emptyObs(false));
      return;
    }
    const mine = ++generation;
    set({ ...emptyObs(true), connected: false });
    let ws;
    try {
      ws = new WebSocketImpl(`ws://${host}:${port}`, "obswebsocket.json");
    } catch (err) {
      log(`OBS: ${err.message}`);
      return retry(mine);
    }
    socket = ws;
    ws.onmessage = (e) => {
      if (mine !== generation) return;
      let message;
      try {
        message = JSON.parse(String(e.data));
      } catch {
        return;
      }
      const step = obsStep(state, message, password);
      for (const m of step.send) ws.send(JSON.stringify(m));
      if (step.state.connected && !state.connected) delay = RECONNECT_MIN_MS;
      set(step.state);
    };
    ws.onclose = () => {
      if (mine !== generation) return;
      socket = null;
      set(emptyObs(true));
      retry(mine);
    };
    ws.onerror = () => {
      // onclose follows and retries.
    };
  };

  const retry = (mine) => {
    if (mine !== generation) return;
    clearTimeout(timer);
    timer = setTimeout(connect, delay);
    delay = Math.min(RECONNECT_MAX_MS, delay * 2);
  };

  return {
    state: () => state,
    reconfigure() {
      close();
      delay = RECONNECT_MIN_MS;
      connect();
    },
    stop: close,
  };
}
