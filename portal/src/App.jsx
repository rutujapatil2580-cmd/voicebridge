import { useState, useEffect } from "react";

const API = "https://ook5dsr71i.execute-api.ap-southeast-2.amazonaws.com";
const USER = "demo";

const box = { border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 10 };
const input = { padding: 8, marginRight: 8, marginBottom: 8 };
const btn = { padding: "8px 14px", cursor: "pointer", marginRight: 8 };

async function get(path) {
  const r = await fetch(API + path);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const asList = (x) => (Array.isArray(x) ? x : []);

export default function App() {
  const [tab, setTab] = useState("talk");
  const [commands, setCommands] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState("");

  const loadAll = async () => {
    try {
      const [c, s, v, l, d] = await Promise.all([
        get("/commands"),
        get("/shortcuts"),
        get("/variants"),
        get("/logs"),
        get("/devices"),
      ]);
      setCommands(asList(c));
      setShortcuts(asList(s));
      setVariants(asList(v));
      setLogs(asList(l));
      setDevices(asList(d));
      setError("");
    } catch (e) {
      setError("Could not reach the server. Check the API link or CORS.");
    }
  };

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 2000);
    return () => clearInterval(t);
  }, []);

  // ---------- Add command ----------
  const [cName, setCName] = useState("");
  const [cDevice, setCDevice] = useState("light");
  const [cAction, setCAction] = useState("on");

  const addCommand = async () => {
    if (!cName) return;
    const commandId = cDevice + "_" + cAction;
    await post("/commands", { commandId, name: cName, device: cDevice, action: cAction });
    setCName("");
    loadAll();
  };

  // ---------- Add shortcut ----------
  const [sName, setSName] = useState("");
  const [sSteps, setSSteps] = useState("");

  const addShortcut = async () => {
    if (!sName) return;
    const steps = sSteps.split(",").map((s) => s.trim()).filter(Boolean);
    await post("/shortcuts", { shortcutName: sName.toLowerCase(), steps });
    setSName("");
    setSSteps("");
    loadAll();
  };

  const runShortcut = async (name) => {
    await post("/runshortcut", { userId: USER, shortcutName: name });
    loadAll();
  };

  // ---------- Talk to VoiceBridge ----------
  const [talkText, setTalkText] = useState("");
  const [reply, setReply] = useState("Type a command, for example: light off");
  const [pending, setPending] = useState(null);

  const findMatch = (text) => {
    const t = text.trim().toLowerCase();
    if (!t) return null;
    const sc = shortcuts.find((s) => s.shortcutName.toLowerCase() === t);
    if (sc) return { type: "shortcut", item: sc, heard: t };
    const v = variants.find((x) => x.heardText.toLowerCase() === t);
    if (v) {
      const c = commands.find((x) => x.commandId === v.commandId);
      if (c) return { type: "command", item: c, heard: t };
    }
    const c = commands.find((x) => x.name.toLowerCase() === t);
    if (c) return { type: "command", item: c, heard: t };
    return null;
  };

  const sendTalk = () => {
    const m = findMatch(talkText);
    if (!m) {
      setPending(null);
      setReply("Sorry, I did not understand. Please say it again.");
      return;
    }
    setPending(m);
    if (m.type === "shortcut") {
      setReply('Run the shortcut "' + m.item.shortcutName + '"?');
    } else {
      setReply('Do you want me to do "' + m.item.name + '"?');
    }
  };

  const answerYes = async () => {
    if (!pending) return;
    if (pending.type === "shortcut") {
      await post("/runshortcut", { userId: USER, shortcutName: pending.item.shortcutName });
      setReply('Done. Ran the shortcut "' + pending.item.shortcutName + '".');
    } else {
      const res = await post("/perform", {
        userId: USER,
        deviceName: pending.item.device,
        action: pending.item.action,
        heard: pending.heard,
      });
      setReply("Done. " + (res.deviceName || pending.item.device) + " is now " + (res.state || pending.item.action) + ".");
    }
    setPending(null);
    setTalkText("");
    loadAll();
  };

  const answerNo = () => {
    setPending(null);
    setReply("Okay, cancelled.");
  };

  const tabs = [
    ["talk", "Talk to VoiceBridge"],
    ["commands", "Commands"],
    ["shortcuts", "Shortcuts"],
    ["learned", "Learned"],
    ["logs", "Logs"],
    ["home", "Virtual Home"],
  ];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1>VoiceBridge Caregiver Portal</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ marginBottom: 16 }}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ ...btn, marginBottom: 6, background: tab === key ? "#2563eb" : "#eee", color: tab === key ? "white" : "black", border: "none", borderRadius: 6 }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "talk" && (
        <div>
          <h2>Talk to VoiceBridge</h2>
          <input
            style={{ ...input, width: 320 }}
            placeholder="Type what you would say, e.g. light off"
            value={talkText}
            onChange={(e) => setTalkText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendTalk()}
          />
          <button style={btn} onClick={sendTalk}>Send</button>
          <div style={{ ...box, background: "#f3f6ff", marginTop: 10 }}>
            <b>VoiceBridge:</b> {reply}
            {pending && (
              <div style={{ marginTop: 10 }}>
                <button style={btn} onClick={answerYes}>Yes</button>
                <button style={btn} onClick={answerNo}>No</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "commands" && (
        <div>
          <h2>Add a command</h2>
          <input style={input} placeholder="Name (e.g. tv on)" value={cName} onChange={(e) => setCName(e.target.value)} />
          <select style={input} value={cDevice} onChange={(e) => setCDevice(e.target.value)}>
            <option>light</option><option>fan</option><option>door</option><option>tv</option>
          </select>
          <select style={input} value={cAction} onChange={(e) => setCAction(e.target.value)}>
            <option>on</option><option>off</option><option>lock</option><option>unlock</option>
          </select>
          <button style={btn} onClick={addCommand}>Add</button>
          <h3>Saved commands</h3>
          {commands.length === 0 && <p>No commands yet.</p>}
          {commands.map((c) => (
            <div key={c.commandId} style={box}>
              <b>{c.name}</b>: {c.device} → {c.action} <small>(id: {c.commandId})</small>
            </div>
          ))}
        </div>
      )}

      {tab === "shortcuts" && (
        <div>
          <h2>Create a shortcut</h2>
          <input style={input} placeholder="Name (e.g. movie)" value={sName} onChange={(e) => setSName(e.target.value)} />
          <input style={{ ...input, width: 300 }} placeholder="Command IDs, comma separated (light_off, tv_on)" value={sSteps} onChange={(e) => setSSteps(e.target.value)} />
          <button style={btn} onClick={addShortcut}>Add</button>
          <h3>Saved shortcuts</h3>
          {shortcuts.length === 0 && <p>No shortcuts yet.</p>}
          {shortcuts.map((s) => (
            <div key={s.shortcutName} style={box}>
              <b>{s.shortcutName}</b><br />
              Steps: {(s.steps || []).join(", ")}<br />
              <button style={{ ...btn, marginTop: 8 }} onClick={() => runShortcut(s.shortcutName)}>Run now</button>
            </div>
          ))}
        </div>
      )}

      {tab === "learned" && (
        <div>
          <h2>What VoiceBridge has learned</h2>
          {variants.length === 0 && <p>Nothing learned yet.</p>}
          {variants.map((v, i) => (
            <div key={i} style={box}>
              "{v.heardText}" → <b>{v.commandId}</b> ({v.count} times)
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div>
          <h2>Logs</h2>
          {logs.length === 0 && <p>No logs yet.</p>}
          {logs.map((l, i) => (
            <div key={i} style={box}>
              {new Date(Number(l.time)).toLocaleString()} | heard: "{l.heard}" | matched: {l.matched} | confirmed: {String(l.confirmed)}
            </div>
          ))}
        </div>
      )}

      {tab === "home" && (
        <div>
          <h2>Virtual Home</h2>
          <p>Refreshes every 2 seconds.</p>
          {devices.map((d) => (
            <div key={d.deviceName} style={{ ...box, display: "flex", justifyContent: "space-between" }}>
              <b>{d.deviceName.toUpperCase()}</b>
              <span>{d.state}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}