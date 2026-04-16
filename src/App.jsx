import { useState, useRef } from "react";

const BACKEND_URL = "https://parttensor-backend.onrender.com";

const BOM_EXAMPLES = [
  { label: "BLDC Motor Controller 24V 10A", icon: "⚙" },
  { label: "48V 500W Solar MPPT Charger", icon: "☀" },
  { label: "GaN Half Bridge 400V 3kW", icon: "⚡" },
  { label: "Battery Management System 4S Li-ion", icon: "🔋" },
  { label: "Industrial 4-20mA Current Loop Sensor", icon: "📡" },
  { label: "Isolated DC-DC Converter 24V to 5V 10W", icon: "🔌" },
];

const SEARCH_EXAMPLES = [
  "100V 40A N-channel MOSFET for motor drive",
  "Low noise op-amp ±15V audio preamp",
  "3.3V 500mA LDO from 5V input",
  "IRF540N alternative in stock",
  "LM358 replacement same package",
  "CONMMCX002 alternative",
  "100uF 25V low ESR capacitor",
  "10uH 3A inductor for buck converter",
];

const priorityStyle = {
  critical: { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", label: "CRITICAL" },
  recommended: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", label: "RECOMMENDED" },
  optional: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", label: "OPTIONAL" },
};

const rankStyle = {
  top: { label: "TOP PICK", color: "#0f172a", bg: "linear-gradient(135deg,#38bdf8,#0ea5e9)" },
  good: { label: "GOOD FIT", color: "#0f172a", bg: "linear-gradient(135deg,#34d399,#10b981)" },
  alternative: { label: "ALT", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
};

function getRiskScore(stock) {
  if (!stock) return { score: "UNKNOWN", color: "#64748b", icon: "—" };
  const total = stock.totalStock || 0;
  if (total === 0) return { score: "HIGH RISK", color: "#f87171", icon: "🔴" };
  if (total < 100) return { score: "HIGH RISK", color: "#f87171", icon: "🔴" };
  if (total < 500) return { score: "MEDIUM RISK", color: "#fbbf24", icon: "🟡" };
  if (total < 2000) return { score: "LOW RISK", color: "#34d399", icon: "🟢" };
  return { score: "SAFE", color: "#34d399", icon: "✅" };
}

function RiskBadge({ stock }) {
  const risk = getRiskScore(stock);
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: "rgba(255,255,255,0.05)", color: risk.color, border: "1px solid " + risk.color + "44", letterSpacing: 0.5 }}>
      {risk.icon} {risk.score}
    </span>
  );
}

function DatasheetLink({ partNumber, manufacturer }) {
  const url = "https://www.google.com/search?q=" + encodeURIComponent((partNumber || "") + " " + (manufacturer || "") + " datasheet filetype:pdf");
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#38bdf8", textDecoration: "none", fontWeight: 600, letterSpacing: 0.3 }}>
      ↗ Datasheet
    </a>
  );
}

function SpecGrid({ keySpecs, accent }) {
  if (!keySpecs || !Array.isArray(keySpecs) || keySpecs.length === 0) return null;
  const color = accent || "#38bdf8";
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {keySpecs.slice(0, 5).map(function(spec, j) {
        return (
          <div key={j} style={{
            padding: "6px 10px", borderRadius: 6, textAlign: "center", minWidth: 58,
            background: j === 0 ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.03)",
            border: "1px solid " + (j === 0 ? color + "44" : "rgba(255,255,255,0.08)"),
          }}>
            <div style={{ fontSize: 8, color: j === 0 ? color : "#64748b", fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>{spec.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: j === 0 ? color : "#e2e8f0" }}>
              {spec.value}<span style={{ fontSize: 8, fontWeight: 500, color: j === 0 ? color + "99" : "#64748b" }}>{spec.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StockPanel({ stock, loading, partNumber }) {
  if (loading && !stock) return (
    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "#64748b" }}>
      Checking Digi-Key and Mouser...
    </div>
  );
  if (!stock) return (
    <div style={{ marginTop: 10 }}>
      <a href={"https://octopart.com/search?q=" + encodeURIComponent(partNumber)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>
        ↗ Search on Octopart
      </a>
    </div>
  );

  const dk = stock.digikey;
  const mouser = stock.mouser;
  const total = stock.totalStock || 0;

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: total > 1000 ? "#34d399" : total > 100 ? "#fbbf24" : total > 0 ? "#fb923c" : "#f87171" }}>
          {total > 0 ? "✓ " + total.toLocaleString() + " units" : "✗ Out of Stock"}
        </span>
        {stock.bestPrice && (
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600, background: "rgba(52,211,153,0.08)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(52,211,153,0.2)" }}>
            {stock.bestPrice} @ {stock.bestPriceSource}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[{ label: "Digi-Key", data: dk, color: "#38bdf8" }, { label: "Mouser", data: mouser, color: "#a78bfa" }].map(function(dist) {
          return (
            <div key={dist.label} style={{ flex: 1, minWidth: 140, padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid " + (dist.data && dist.data.stock > 0 ? dist.color + "33" : "rgba(255,255,255,0.07)") }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: dist.color, marginBottom: 4 }}>{dist.label}</div>
              {dist.data ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: dist.data.stock > 0 ? "#e2e8f0" : "#f87171" }}>{dist.data.stock > 0 ? dist.data.stock.toLocaleString() + " units" : "Out of Stock"}</div>
                  {dist.data.price && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{dist.data.price} / unit</div>}
                  {dist.data.stock > 0 && <a href={dist.data.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: dist.color, textDecoration: "none", fontWeight: 600, display: "block", marginTop: 4 }}>Buy →</a>}
                </>
              ) : <div style={{ fontSize: 11, color: "#475569" }}>Not found</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8 }}>
        <a href={stock.octopartUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#475569", textDecoration: "none" }}>↗ All distributors on Octopart</a>
      </div>
    </div>
  );
}

function StockCell({ stock, loading, partNumber }) {
  if (loading && !stock) return <div style={{ fontSize: 10, color: "#64748b" }}>...</div>;
  if (!stock) return <a href={"https://octopart.com/search?q=" + encodeURIComponent(partNumber)} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#38bdf8", textDecoration: "none" }}>Check</a>;
  const total = stock.totalStock || 0;
  const color = total > 1000 ? "#34d399" : total > 100 ? "#fbbf24" : total > 0 ? "#fb923c" : "#f87171";
  const dk = stock.digikey;
  const mouser = stock.mouser;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: color, marginBottom: 2 }}>{total > 0 ? total.toLocaleString() : "Out"}</div>
      {stock.bestPrice && <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{stock.bestPrice}</div>}
      <div style={{ display: "flex", gap: 4 }}>
        {dk && dk.stock > 0 && <a href={dk.url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#38bdf8", textDecoration: "none", background: "rgba(56,189,248,0.1)", padding: "1px 5px", borderRadius: 3 }}>DK</a>}
        {mouser && mouser.stock > 0 && <a href={mouser.url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#a78bfa", textDecoration: "none", background: "rgba(167,139,250,0.1)", padding: "1px 5px", borderRadius: 3 }}>MO</a>}
        {total === 0 && <a href={stock.octopartUrl} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#38bdf8", textDecoration: "none" }}>↗</a>}
      </div>
    </div>
  );
}

function exportToCSV(bom, projectName) {
  const headers = ["#", "Function", "Part Number", "Manufacturer", "Description", "Category", "Qty", "Key Specs", "Package", "Priority", "Unit Price", "Notes"];
  const rows = bom.map(function(item) { return [item.id, item.function, item.partNumber, item.manufacturer, item.description, item.category, item.quantity, item.keySpecs, item.package, item.priority, item.unitPrice, item.notes || ""]; });
  const csv = [headers].concat(rows).map(function(r) { return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = String(projectName).replace(/\s+/g, "_") + "_BOM_PartTensor.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// PartTensor Logo Mark
function PTLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#ptgrad)"/>
      <defs>
        <linearGradient id="ptgrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#0ea5e9"/>
          <stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
      </defs>
      {/* P shape */}
      <rect x="7" y="8" width="2.5" height="16" rx="1" fill="white"/>
      <rect x="7" y="8" width="8" height="2.5" rx="1" fill="white"/>
      <rect x="7" y="15" width="8" height="2.5" rx="1" fill="white"/>
      <rect x="13" y="8" width="2.5" height="9.5" rx="1" fill="white"/>
      {/* T shape */}
      <rect x="18" y="8" width="7" height="2.5" rx="1" fill="white" opacity="0.9"/>
      <rect x="20.75" y="8" width="2.5" height="16" rx="1" fill="white" opacity="0.9"/>
    </svg>
  );
}

export default function App() {
  const [tool, setTool] = useState("bom");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stockData, setStockData] = useState({});
  const [error, setError] = useState("");
  const [subTab, setSubTab] = useState("results");
  const inputRef = useRef(null);
  const retryCount = useRef(0);

  function switchTool(newTool) {
    setTool(newTool);
    setResult(null);
    setQuery("");
    setError("");
    setStockData({});
    setSubTab("results");
    retryCount.current = 0;
    setTimeout(function() { inputRef.current && inputRef.current.focus(); }, 100);
  }

  async function run(q) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setStockData({});
    setSubTab("results");

    const msgs = {
      bom: ["Analyzing application...", "Selecting critical components...", "Verifying on Digi-Key...", "Almost ready..."],
      search: ["Understanding query...", "Finding components...", "Verifying on Digi-Key...", "Almost ready..."],
    };
    const msgList = msgs[tool] || msgs.search;
    let msgIdx = 0;
    setLoadingMsg(msgList[0]);
    const msgTimer = setInterval(function() {
      msgIdx = Math.min(msgIdx + 1, msgList.length - 1);
      setLoadingMsg(msgList[msgIdx]);
    }, 3000);

    try {
      const res = await fetch(BACKEND_URL + "/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, mode: tool }),
      });
      const data = await res.json();
      clearInterval(msgTimer);

      if (data.error) {
        if ((data.error.includes("busy") || data.error.includes("overload")) && retryCount.current < 2) {
          retryCount.current++;
          setLoadingMsg("High demand — retrying (" + retryCount.current + "/2)...");
          setTimeout(function() { run(searchQuery); }, 4000);
          return;
        }
        retryCount.current = 0;
        setError(data.error);
        setLoading(false);
        return;
      }

      retryCount.current = 0;
      setResult(data);
      setLoading(false);

      if (data.mode === "passive_connector_alt") return;

      const parts = tool === "bom"
        ? (data.bomItems || []).map(function(p) { return p.partNumber; })
        : data.mode === "alt"
          ? (data.alternatives || []).map(function(p) { return p.partNumber; })
          : (data.results || []).map(function(p) { return p.partNumber; });

      if (parts.length > 0) {
        setStockLoading(true);
        try {
          const stockRes = await fetch(BACKEND_URL + "/api/stock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partNumbers: parts }),
          });
          const sd = await stockRes.json();
          setStockData(sd);
          setResult(function(prev) {
            if (!prev) return prev;
            const updated = Object.assign({}, prev);
            const sortFn = function(a, b) {
              return (sd[b.partNumber] ? sd[b.partNumber].totalStock : 0) - (sd[a.partNumber] ? sd[a.partNumber].totalStock : 0);
            };
            if (updated.mode === "search" && updated.results) updated.results = updated.results.slice().sort(sortFn);
            if (updated.mode === "alt" && updated.alternatives) updated.alternatives = updated.alternatives.slice().sort(sortFn);
            if (updated.bomItems) updated.bomItems = updated.bomItems.slice().sort(sortFn);
            return updated;
          });
        } catch (e) { console.error("Stock fetch failed", e); }
        setStockLoading(false);
      }
    } catch (e) {
      clearInterval(msgTimer);
      setError("Cannot connect to backend. Make sure server.js is running on port 3001.");
      setLoading(false);
    }
  }

  const TOOLS = [
    { id: "bom", label: "BOM Generator" },
    { id: "search", label: "Smart Search" },
  ];

  // ---- STYLES ----
  const S = {
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 },
    cardHover: "rgba(255,255,255,0.05)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'DM Mono', 'IBM Plex Mono', 'Courier New', monospace", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c14; }
        textarea, button, input { font-family: inherit; outline: none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(56,189,248,0.1)} 50%{box-shadow:0 0 40px rgba(56,189,248,0.25)} }
        .spin { animation: spin 0.9s linear infinite; display:inline-block; }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .tool-btn:hover { background: rgba(255,255,255,0.07) !important; }
        .part-card { transition: all 0.2s; }
        .part-card:hover { background: rgba(255,255,255,0.05) !important; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important; }
        .ex-card:hover { border-color: rgba(56,189,248,0.4) !important; background: rgba(56,189,248,0.05) !important; transform: translateY(-2px); }
        .ex-chip:hover { background: rgba(56,189,248,0.08) !important; border-color: rgba(56,189,248,0.3) !important; color: #38bdf8 !important; }
        .bom-row:hover { background: rgba(255,255,255,0.03) !important; }
        .search-link-card:hover { border-color: rgba(56,189,248,0.4) !important; background: rgba(56,189,248,0.05) !important; transform: translateY(-2px); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0f172a; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      {/* Grid background */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />

      {/* Navbar */}
      <div style={{ background: "rgba(8,12,20,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PTLogo size={34} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.5, lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>
              Part<span style={{ color: "#38bdf8" }}>Tensor</span>
            </div>
            <div style={{ fontSize: 8, color: "#475569", fontWeight: 600, letterSpacing: 2 }}>HARDWARE INTELLIGENCE</div>
          </div>
        </div>

        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3, gap: 2, border: "1px solid rgba(255,255,255,0.07)" }}>
          {TOOLS.map(function(t) {
            return (
              <button key={t.id} className="tool-btn" onClick={function() { switchTool(t.id); }}
                style={{ padding: "6px 18px", borderRadius: 6, border: "none", background: tool === t.id ? "rgba(56,189,248,0.12)" : "transparent", color: tool === t.id ? "#38bdf8" : "#64748b", fontSize: 12, fontWeight: tool === t.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s", letterSpacing: 0.3, fontFamily: "'DM Sans', sans-serif" }}>
                {t.label}
              </button>
            );
          })}
        </div>

        <button style={{ padding: "6px 18px", borderRadius: 6, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
          Sign In
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px", position: "relative", zIndex: 1 }}>

        {/* Disclaimer */}
        <div style={{ display: "flex", gap: 8, padding: "8px 14px", borderRadius: 6, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 11, color: "#92400e", marginBottom: 20, color: "#fbbf24" }}>
          <span>⚠</span>
          <span style={{ color: "#fbbf24", opacity: 0.8 }}><strong>AI results require verification.</strong> Always confirm specs against datasheets before ordering.</span>
        </div>

        {/* Hero */}
        {!result && !loading && (
          <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeUp 0.5s ease" }}>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 99, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", fontSize: 11, color: "#38bdf8", fontWeight: 600, letterSpacing: 1.5, marginBottom: 16 }}>
              AI-POWERED COMPONENT INTELLIGENCE
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f8fafc", marginBottom: 12, letterSpacing: -1.5, lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>
              {tool === "bom" ? (<>From concept to<br /><span style={{ color: "#38bdf8" }}>sourcing-ready BOM</span></>) : (<>Find any component.<br /><span style={{ color: "#38bdf8" }}>Verified. In stock.</span></>)}
            </h1>
            <p style={{ fontSize: 15, color: "#64748b", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
              {tool === "bom"
                ? "Describe your application. PartTensor generates a smart BOM with only critical components — every part verified on Digi-Key."
                : "Search any component or paste a part number to find alternatives. Semiconductors get spec-matched AI results. Connectors and passives get direct DigiKey links."}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {[{ label: "✓ DigiKey Verified", color: "#34d399" }, { label: "● Digi-Key Live", color: "#38bdf8" }, { label: "● Mouser Live", color: "#a78bfa" }].map(function(d) {
                return <span key={d.label} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: d.color, border: "1px solid " + d.color + "33", fontWeight: 600, letterSpacing: 0.5 }}>{d.label}</span>;
              })}
            </div>
          </div>
        )}

        {/* Search Box */}
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 20, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.4)", animation: "glow 3s ease infinite" }}>
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ padding: "0 16px", display: "flex", alignItems: "center", color: "#38bdf8", fontSize: 16, flexShrink: 0 }}>
              {tool === "bom" ? "◈" : "⌕"}
            </div>
            <textarea ref={inputRef} value={query}
              onChange={function(e) { setQuery(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
              placeholder={tool === "bom"
                ? "Describe your application… e.g. 24V 10A BLDC motor controller with current sensing"
                : "Search or find alternatives… e.g. 100V 40A MOSFET, IRF540N alternative, CONMMCX002 alternative"}
              rows={2}
              style={{ flex: 1, background: "transparent", border: "none", color: "#e2e8f0", fontSize: 14, padding: "16px 8px", resize: "none", lineHeight: 1.7, caretColor: "#38bdf8" }}
            />
            <div style={{ padding: "12px", display: "flex", alignItems: "center", flexShrink: 0 }}>
              <button onClick={function() { run(); }} disabled={loading || !query.trim()}
                style={{ background: !query.trim() ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#0ea5e9,#6366f1)", color: !query.trim() ? "#475569" : "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: !query.trim() ? "not-allowed" : "pointer", transition: "all 0.2s", letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? <span className="spin">◌</span> : tool === "bom" ? "Generate →" : "Search →"}
              </button>
            </div>
          </div>
          <div style={{ padding: "5px 16px 8px", fontSize: 10, color: "#334155", borderTop: "1px solid rgba(255,255,255,0.05)", letterSpacing: 0.5 }}>
            {tool === "search" ? "SEMICONDUCTORS: AI spec-matched  ·  CONNECTORS & PASSIVES: DigiKey parametric  ·  ENTER to search" : "SMART BOM · CRITICAL PARTS ONLY · DIGIKEY VERIFIED · ENTER TO GENERATE"}
          </div>
        </div>

        {/* Examples */}
        {!result && !loading && (
          tool === "bom" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 32 }}>
              {BOM_EXAMPLES.map(function(ex, i) {
                return (
                  <button key={i} className="ex-card" onClick={function() { setQuery(ex.label); run(ex.label); }}
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "12px 14px", cursor: "pointer", transition: "all 0.2s", textAlign: "left", animation: "fadeUp 0.3s ease " + (i * 0.07) + "s both" }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{ex.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{ex.label}</div>
                    <div style={{ fontSize: 10, color: "#38bdf8", marginTop: 4, letterSpacing: 0.5 }}>GENERATE BOM →</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 32, justifyContent: "center" }}>
              {SEARCH_EXAMPLES.map(function(ex, i) {
                return (
                  <button key={i} className="ex-chip" onClick={function() { setQuery(ex); run(ex); }}
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 11, padding: "6px 14px", borderRadius: 4, cursor: "pointer", transition: "all 0.15s", fontWeight: 500, letterSpacing: 0.3 }}>
                    {ex}
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 13, marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
            <span>⚠</span><span style={{ flex: 1 }}>{error}</span>
            <button onClick={function() { setError(""); run(); }} style={{ padding: "4px 12px", borderRadius: 5, background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 0 40px rgba(56,189,248,0.3)" }}>
              <span className="spin" style={{ color: "#fff" }}>◌</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{loadingMsg}</div>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 28, letterSpacing: 1 }}>SPECS VERIFIED · DIGIKEY CHECKED · SORTED BY STOCK</div>
            {[1,2,3,4].map(function(i) {
              return <div key={i} style={{ height: 44, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", maxWidth: 680, margin: "0 auto 8px", animation: "pulse 1.5s ease " + (i * 0.12) + "s infinite" }} />;
            })}
          </div>
        )}

        {/* PASSIVE/CONNECTOR ALT RESULTS */}
        {result && !loading && result.mode === "passive_connector_alt" && (
          <div className="fade-up">
            <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#34d399", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>PARAMETRIC SEARCH REQUIRED</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Alternatives for: <span style={{ color: "#34d399" }}>{result.originalPart}</span></div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>{result.originalDescription} · {result.originalManufacturer}</div>
            </div>

            <div style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.12)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
                <strong style={{ color: "#38bdf8" }}>Why parametric search?</strong> For {result.categoryName}, exact specs like impedance, frequency range, mounting style, and gender need to be matched precisely. Parametric search gives far more accurate results than AI guessing part numbers.
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>SEARCH IN-STOCK ALTERNATIVES:</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {(result.searchLinks || []).map(function(link, i) {
                  const colors = ["#38bdf8", "#a78bfa", "#34d399"];
                  const c = colors[i] || colors[0];
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="search-link-card"
                      style={{ display: "block", padding: "16px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{link.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{link.description}</div>
                      <div style={{ fontSize: 11, color: c, marginTop: 8, fontWeight: 600 }}>Open →</div>
                    </a>
                  );
                })}
              </div>
            </div>

            {(result.tips || []).length > 0 && (
              <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", letterSpacing: 1.5, marginBottom: 8 }}>FILTER BY:</div>
                {result.tips.map(function(tip, i) {
                  return <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 3, display: "flex", gap: 8 }}><span style={{ color: "#fbbf24" }}>›</span><span>{tip}</span></div>;
                })}
              </div>
            )}

            <button onClick={function() { setResult(null); setQuery(""); }} style={{ padding: "8px 18px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← New Search</button>
          </div>
        )}

        {/* BOM RESULTS */}
        {result && !loading && tool === "bom" && result.bomItems && (
          <div className="fade-up">
            <div style={{ background: "linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.12))", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>PARTTENSOR BOM REPORT</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{result.projectName}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{result.description}</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[{ label: "PARTS", value: result.bomItems.length }, { label: "CRITICAL", value: result.bomItems.filter(function(i) { return i.priority === "critical"; }).length }, { label: "IN STOCK", value: stockLoading ? "…" : Object.values(stockData).filter(function(s) { return s.totalStock > 0; }).length }, { label: "AT RISK", value: stockLoading ? "…" : Object.values(stockData).filter(function(s) { return s.totalStock < 100; }).length }].map(function(s, i) {
                    return (
                      <div key={i} style={{ textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 14px", minWidth: 64, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1 }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[{ id: "results", label: "BOM (" + result.bomItems.length + ")" }, { id: "notes", label: "Notes" }].map(function(t) {
                  return (
                    <button key={t.id} onClick={function() { setSubTab(t.id); }}
                      style={{ padding: "6px 14px", borderRadius: 5, border: "none", background: subTab === t.id ? "rgba(56,189,248,0.1)" : "transparent", color: subTab === t.id ? "#38bdf8" : "#64748b", fontSize: 12, fontWeight: subTab === t.id ? 700 : 500, cursor: "pointer", letterSpacing: 0.5 }}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {stockLoading && <span style={{ fontSize: 11, color: "#38bdf8" }}><span className="spin">◌</span> Checking stock...</span>}
                <button onClick={function() { exportToCSV(result.bomItems, result.projectName); }} style={{ padding: "6px 14px", borderRadius: 6, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 0.5 }}>⬇ CSV</button>
                <button onClick={function() { setResult(null); setQuery(""); }} style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>New BOM</button>
              </div>
            </div>

            {subTab === "results" && (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "28px 100px 140px 1fr 60px 40px 80px 80px 110px", padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: 1.5 }}>
                  <div>#</div><div>FUNCTION</div><div>PART NO.</div><div>DESCRIPTION</div><div>PKG</div><div>QTY</div><div>PRIORITY</div><div>RISK</div><div>STOCK</div>
                </div>
                {result.bomItems.map(function(item, i) {
                  const ps = priorityStyle[item.priority] || priorityStyle.optional;
                  const stock = stockData[item.partNumber];
                  return (
                    <div key={i} className="bom-row" style={{ display: "grid", gridTemplateColumns: "28px 100px 140px 1fr 60px 40px 80px 80px 110px", padding: "11px 14px", borderBottom: i < result.bomItems.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center", transition: "background 0.15s" }}>
                      <div style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>{item.id}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>{item.function}</div>
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(56,189,248,0.08)", color: "#38bdf8", fontWeight: 600, letterSpacing: 0.5 }}>{item.category}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", marginBottom: 2 }}>{item.partNumber}</div>
                        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>{item.manufacturer}</div>
                        <DatasheetLink partNumber={item.partNumber} manufacturer={item.manufacturer} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4, marginBottom: 1, fontFamily: "'DM Sans', sans-serif" }}>{item.description}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{item.keySpecs}</div>
                        {item.notes && <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 2 }}>⚠ {item.notes}</div>}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{item.package}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{item.quantity}</div>
                      <div><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, background: ps.bg, color: ps.color, border: "1px solid " + ps.border, letterSpacing: 0.5 }}>{ps.label}</span></div>
                      <div><RiskBadge stock={stock} /></div>
                      <div><StockCell stock={stock} loading={stockLoading} partNumber={item.partNumber} /></div>
                    </div>
                  );
                })}
              </div>
            )}

            {subTab === "notes" && (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", padding: "22px 26px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>Design Considerations</div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, marginBottom: 18, fontFamily: "'DM Sans', sans-serif" }}>{result.designNotes}</div>
                <div style={{ display: "flex", gap: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap" }}>
                  {[["Supply Voltage", result.voltage], ["Est. Power", result.power], ["BOM Cost", result.totalEstimate]].filter(function(x) { return x[1]; }).map(function(item) {
                    return (
                      <div key={item[0]}>
                        <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>{item[0].toUpperCase()}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#38bdf8", fontFamily: "'DM Sans', sans-serif" }}>{item[1]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH RESULTS */}
        {result && !loading && tool === "search" && result.mode === "search" && result.results && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(56,189,248,0.08)", color: "#38bdf8", fontWeight: 700, border: "1px solid rgba(56,189,248,0.15)", letterSpacing: 1 }}>{result.category}</span>
              <span style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{result.interpretation}</span>
              <span style={{ fontSize: 10, color: "#34d399", background: "rgba(52,211,153,0.08)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(52,211,153,0.2)", fontWeight: 600, letterSpacing: 0.5 }}>✓ DIGIKEY VERIFIED</span>
              {stockLoading && <span style={{ fontSize: 11, color: "#38bdf8" }}><span className="spin">◌</span> Checking stock...</span>}
              <button onClick={function() { setResult(null); setQuery(""); }} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b", fontSize: 11, cursor: "pointer" }}>← Back</button>
            </div>

            {result.results.map(function(part, i) {
              const rs = rankStyle[part.rank] || rankStyle.alternative;
              const stock = stockData[part.partNumber];
              return (
                <div key={i} className="part-card" style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid " + (i === 0 ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.07)"), padding: "18px 22px", marginBottom: 10, animation: "fadeUp 0.25s ease " + (i * 0.07) + "s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, fontWeight: 700, background: rs.bg, color: rs.color, letterSpacing: 1 }}>{rs.label}</span>
                        {i === 0 && <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600 }}>★ BEST MATCH</span>}
                        <RiskBadge stock={stock} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.5, fontFamily: "'DM Sans', sans-serif" }}>{part.partNumber}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 5 }}>{part.manufacturer} · {part.type} · {part.package}</div>
                      <DatasheetLink partNumber={part.partNumber} manufacturer={part.manufacturer} />
                    </div>
                    <SpecGrid keySpecs={part.keySpecs} accent="#38bdf8" />
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                    {(part.applications || []).map(function(app, j) { return <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)", letterSpacing: 0.3 }}>{app}</span>; })}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{part.aeComment}</div>
                  {part.caution && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 12, color: "#fbbf24", display: "flex", gap: 8 }}><span>⚠</span><span>{part.caution}</span></div>}
                  <StockPanel stock={stock} loading={stockLoading} partNumber={part.partNumber} />
                </div>
              );
            })}

            {result.designTip && (
              <div style={{ display: "flex", gap: 12, padding: "14px 18px", borderRadius: 8, background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.1)", marginBottom: 16 }}>
                <span>💡</span>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#38bdf8", letterSpacing: 1.5, marginBottom: 4 }}>DESIGN TIP</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{result.designTip}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ALTERNATIVE RESULTS */}
        {result && !loading && tool === "search" && result.mode === "alt" && result.alternatives && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: "rgba(167,139,250,0.1)", color: "#a78bfa", fontWeight: 700, border: "1px solid rgba(167,139,250,0.2)", letterSpacing: 1 }}>ALTERNATIVES</span>
                  <span style={{ fontSize: 9, color: "#34d399", background: "rgba(52,211,153,0.08)", padding: "2px 8px", borderRadius: 3, border: "1px solid rgba(52,211,153,0.15)", fontWeight: 600, letterSpacing: 0.5 }}>✓ VERIFIED · SPEC MATCHED</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>Alternatives for: <span style={{ color: "#a78bfa" }}>{result.originalPart}</span></div>
                {result.originalSpecs && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{result.originalSpecs.substring(0, 120)}</div>}
              </div>
              {stockLoading && <span style={{ fontSize: 11, color: "#38bdf8" }}><span className="spin">◌</span> Checking stock...</span>}
              <button onClick={function() { setResult(null); setQuery(""); }} style={{ padding: "5px 12px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b", fontSize: 11, cursor: "pointer" }}>← Back</button>
            </div>

            {result.alternatives.map(function(part, i) {
              const stock = stockData[part.partNumber];
              const compatColor = part.compatibility === "drop-in" ? { color: "#34d399", label: "DROP-IN" } : part.compatibility === "pin-compatible" ? { color: "#38bdf8", label: "PIN-COMPATIBLE" } : { color: "#fbbf24", label: "FUNCTIONAL ALT" };
              return (
                <div key={i} className="part-card" style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid " + (i === 0 ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"), padding: "18px 22px", marginBottom: 10, animation: "fadeUp 0.25s ease " + (i * 0.07) + "s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, fontWeight: 700, background: compatColor.color + "11", color: compatColor.color, border: "1px solid " + compatColor.color + "33", letterSpacing: 1 }}>{compatColor.label}</span>
                        <RiskBadge stock={stock} />
                        {i === 0 && <span style={{ fontSize: 10, color: "#34d399", fontWeight: 600 }}>★ BEST ALTERNATIVE</span>}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.5, fontFamily: "'DM Sans', sans-serif" }}>{part.partNumber}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 5 }}>{part.manufacturer} · {part.type} · {part.package}</div>
                      <DatasheetLink partNumber={part.partNumber} manufacturer={part.manufacturer} />
                    </div>
                    <SpecGrid keySpecs={part.keySpecs} accent="#34d399" />
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>{part.whyAlternative}</div>
                  {part.differences && <div style={{ fontSize: 12, color: "#a78bfa", background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 5, padding: "6px 10px", marginBottom: 8 }}>› {part.differences}</div>}
                  <StockPanel stock={stock} loading={stockLoading} partNumber={part.partNumber} />
                </div>
              );
            })}

            {result.importantNote && (
              <div style={{ padding: "10px 14px", borderRadius: 7, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", fontSize: 12, color: "#fbbf24", display: "flex", gap: 8 }}>
                <span>ℹ</span><span>{result.importantNote}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PTLogo size={22} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", fontFamily: "'DM Sans', sans-serif" }}>PartTensor</span>
            <span style={{ fontSize: 11, color: "#1e293b" }}>· v1.0</span>
          </div>
          <div style={{ fontSize: 10, color: "#1e293b", letterSpacing: 0.5 }}>CLAUDE AI · DIGI-KEY · MOUSER · parttensor.com</div>
        </div>

      </div>
    </div>
  );
}