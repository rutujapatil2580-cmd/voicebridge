import { useState, useEffect } from "react";

// Baad mein Anuma ki API ka link yahan daalna, abhi mock data chal raha hai
const API = "";

const box = { border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 10 };
const input = { padding: 8, marginRight: 8, marginBottom: 8 };
const btn = { padding: "8px 14px", cursor: "pointer", marginRight: 8 };

export default function App() {
  const [tab, setTab] = useState("commands");

  const [commands, setCommands] = useState([
    { naam: "Light off", device: "light", action: "off", variants: ["lye awf", "lait of"] },
    { naam: "Fan on", device: "fan", action: "on", variants: ["fan aan"] },
  ]);
  const [shortcuts, setShortcuts] = useState([
    { naam: "Bedtime", steps: "light off, fan on, door lock" },
  ]);
  const learned = [
    { heard: "lye awf", matched: "Light off", count: 3 },
    { heard: "fan aan", matched: "Fan on", count: 1 },
  ];
  const logs = [
    { time: "10:01", heard: "lye awf", matched: "Light off", confirmed: "haan" },
    { time: "10:05", heard: "bedtime", matched: "Bedtime", confirmed: "haan" },
  ];
  const [devices, setDevices] = useState({ light: "on", fan: "off", door: "unlocked", tv: "off" });

  // Har 2 second mein refresh. Baad mein yahan API se data aayega.
  useEffect(() => {
    const t = setInterval(() => {
      if (API) {
        fetch(API + "/devices").then((r) => r.json()).then(setDevices).catch(() => {});
      }
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Command add karne ka form
  const [naam, setNaam] = useState("");
  const [device, setDevice] = useState("light");
  const [action, setAction] = useState("on");
  const [variants, setVariants] = useState("");

  const addCommand = () => {
    if (!naam) return;
    setCommands([...commands, { naam, device, action, variants: variants.split(",").map((v) => v.trim()).filter(Boolean) }]);
    setNaam(""); setVariants("");
  };

  // Shortcut banane ka form
  const [sNaam, setSNaam] = useState("");
  const [sSteps, setSSteps] = useState("");
  const addShortcut = () => {
    if (!sNaam) return;
    setShortcuts([...shortcuts, { naam: sNaam, steps: sSteps }]);
    setSNaam(""); setSSteps("");
  };

  const tabs = [
    ["commands", "Commands"],
    ["shortcuts", "Shortcuts"],
    ["learned", "Seekha hua"],
    ["logs", "Logs"],
    ["home", "Virtual Home"],
  ];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1>VoiceBridge Caregiver Portal</h1>
      <div style={{ marginBottom: 16 }}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ ...btn, background: tab === key ? "#2563eb" : "#eee", color: tab === key ? "white" : "black", border: "none", borderRadius: 6 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "commands" && (
        <div>
          <h2>Command add karo</h2>
          <input style={input} placeholder="Naam (jaise Light off)" value={naam} onChange={(e) => setNaam(e.target.value)} />
          <select style={input} value={device} onChange={(e) => setDevice(e.target.value)}>
            <option>light</option><option>fan</option><option>door</option><option>tv</option>
          </select>
          <select style={input} value={action} onChange={(e) => setAction(e.target.value)}>
            <option>on</option><option>off</option><option>lock</option><option>unlock</option>
          </select>
          <br />
          <input style={{ ...input, width: 360 }} placeholder="Bigade roop, comma se alag (lye awf, lait of)" value={variants} onChange={(e) => setVariants(e.target.value)} />
          <button style={btn} onClick={addCommand}>Add</button>
          <h3>Saved commands</h3>
          {commands.map((c, i) => (
            <div key={i} style={box}>
              <b>{c.naam}</b>: {c.device} → {c.action}<br />
              Bigade roop: {c.variants.join(", ") || "koi nahi"}
            </div>
          ))}
        </div>
      )}

      {tab === "shortcuts" && (
        <div>
          <h2>Shortcut banao</h2>
          <input style={input} placeholder="Naam (jaise Bedtime)" value={sNaam} onChange={(e) => setSNaam(e.target.value)} />
          <input style={{ ...input, width: 320 }} placeholder="Steps, comma se alag" value={sSteps} onChange={(e) => setSSteps(e.target.value)} />
          <button style={btn} onClick={addShortcut}>Add</button>
          <h3>Saved shortcuts</h3>
          {shortcuts.map((s, i) => (
            <div key={i} style={box}><b>{s.naam}</b><br />Steps: {s.steps}</div>
          ))}
        </div>
      )}

      {tab === "learned" && (
        <div>
          <h2>Alexa ne kya seekha</h2>
          {learned.map((l, i) => (
            <div key={i} style={box}>"{l.heard}" → <b>{l.matched}</b> ({l.count} baar)</div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div>
          <h2>Logs</h2>
          {logs.map((l, i) => (
            <div key={i} style={box}>{l.time} | suna: "{l.heard}" | match: {l.matched} | confirm: {l.confirmed}</div>
          ))}
        </div>
      )}

      {tab === "home" && (
        <div>
          <h2>Virtual Home</h2>
          <p>Har 2 second mein refresh hota hai.</p>
          {Object.entries(devices).map(([name, state]) => (
            <div key={name} style={{ ...box, display: "flex", justifyContent: "space-between" }}>
              <b>{name.toUpperCase()}</b>
              <span>{state}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}