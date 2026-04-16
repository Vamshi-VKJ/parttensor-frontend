import { useState, useRef } from "react";

const BACKEND_URL = "https://parttensor-backend.onrender.com";

const BOM_EXAMPLES = [
  { label: "BLDC Motor Controller 24V 10A", icon: "⚙️" },
  { label: "48V 500W Solar MPPT Charger", icon: "☀️" },
  { label: "GaN Half Bridge 400V 3kW", icon: "⚡" },
  { label: "Battery Management System 4S Li-ion", icon: "🔋" },
  { label: "Industrial 4-20mA Current Loop Sensor", icon: "📡" },
  { label: "Isolated DC-DC Converter 24V to 5V 10W", icon: "🔌" },
];

const SEARCH_EXAMPLES = [
  "100V 40A MOSFET for motor drive",
  "Low noise op-amp ±15V audio",
  "3.3V 500mA LDO from 5V",
  "IRF540N alternative in stock",
  "LM358 replacement same package",
  "CONMMCX002 alternative",
  "100uF 25V low ESR cap",
  "10uH 3A inductor buck converter",
];

const priorityStyle = {
  critical: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "CRITICAL" },
  recommended: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "RECOMMENDED" },
  optional: { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", label: "OPTIONAL" },
};

const rankStyle = {
  top: { label: "TOP PICK", color: "#fff", bg: "linear-gradient(135deg,#2563eb,#4f46e5)" },
  good: { label: "GOOD FIT", color: "#fff", bg: "linear-gradient(135deg,#0891b2,#0ea5e9)" },
  alternative: { label: "ALT", color: "#6b7280", bg: "#f3f4f6" },
};

function getRiskScore(stock) {
  if (!stock) return { score: "UNKNOWN", color: "#9ca3af", bg: "#f9fafb", icon: "—" };
  const total = stock.totalStock || 0;
  if (total === 0) return { score: "HIGH RISK", color: "#dc2626", bg: "#fef2f2", icon: "🔴" };
  if (total < 100) return { score: "HIGH RISK", color: "#dc2626", bg: "#fef2f2", icon: "🔴" };
  if (total < 500) return { score: "MED RISK", color: "#d97706", bg: "#fffbeb", icon: "🟡" };
  if (total < 2000) return { score: "LOW RISK", color: "#16a34a", bg: "#f0fdf4", icon: "🟢" };
  return { score: "SAFE", color: "#16a34a", bg: "#f0fdf4", icon: "✅" };
}

function RiskBadge({ stock }) {
  const r = getRiskScore(stock);
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: r.bg, color: r.color, border: "1px solid " + r.color + "30", letterSpacing: 0.3 }}>
      {r.icon} {r.score}
    </span>
  );
}

function DatasheetLink({ partNumber, manufacturer }) {
  return (
    <a href={"https://www.google.com/search?q=" + encodeURIComponent((partNumber || "") + " " + (manufacturer || "") + " datasheet filetype:pdf")} target="_blank" rel="noreferrer"
      style={{ fontSize: 11, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
      📄 Datasheet
    </a>
  );
}

function SpecGrid({ keySpecs, accent }) {
  if (!keySpecs || !Array.isArray(keySpecs) || keySpecs.length === 0) return null;
  const c = accent || "#2563eb";
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {keySpecs.slice(0, 5).map(function(spec, j) {
        return (
          <div key={j} style={{ padding: "7px 11px", borderRadius: 10, textAlign: "center", minWidth: 60, background: j === 0 ? c + "0d" : "#f8fafc", border: "1px solid " + (j === 0 ? c + "33" : "#e2e8f0") }}>
            <div style={{ fontSize: 8, color: j === 0 ? c : "#94a3b8", fontWeight: 700, letterSpacing: 0.8, marginBottom: 2 }}>{spec.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: j === 0 ? c : "#0f172a" }}>
              {spec.value}<span style={{ fontSize: 9, fontWeight: 500, color: j === 0 ? c + "99" : "#94a3b8" }}>{spec.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StockPanel({ stock, loading, partNumber }) {
  if (loading && !stock) return (
    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8" }}>
      Checking Digi-Key and Mouser...
    </div>
  );
  if (!stock) return (
    <div style={{ marginTop: 8 }}>
      <a href={"https://octopart.com/search?q=" + encodeURIComponent(partNumber)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>🔍 Search Octopart →</a>
    </div>
  );
  const dk = stock.digikey, mouser = stock.mouser, total = stock.totalStock || 0;
  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: total > 1000 ? "#16a34a" : total > 0 ? "#d97706" : "#dc2626" }}>
          {total > 0 ? "✓ " + total.toLocaleString() + " units" : "✗ Out of Stock"}
        </span>
        {stock.bestPrice && <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 600, background: "#f0fdf4", padding: "2px 8px", borderRadius: 99, border: "1px solid #86efac" }}>{stock.bestPrice} @ {stock.bestPriceSource}</span>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[{ label: "Digi-Key", data: dk, c: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" }, { label: "Mouser", data: mouser, c: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" }].map(function(d) {
          return (
            <div key={d.label} style={{ flex: 1, minWidth: 140, padding: "8px 12px", borderRadius: 8, background: d.data && d.data.stock > 0 ? d.bg : "#f9fafb", border: "1px solid " + (d.data && d.data.stock > 0 ? d.border : "#e5e7eb") }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: d.c, marginBottom: 4 }}>{d.label}</div>
              {d.data ? (<>
                <div style={{ fontSize: 13, fontWeight: 700, color: d.data.stock > 0 ? d.c : "#dc2626" }}>{d.data.stock > 0 ? d.data.stock.toLocaleString() + " units" : "Out of Stock"}</div>
                {d.data.price && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{d.data.price}/unit</div>}
                {d.data.stock > 0 && <a href={d.data.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: d.c, textDecoration: "none", fontWeight: 600, display: "block", marginTop: 4 }}>Buy →</a>}
              </>) : <div style={{ fontSize: 11, color: "#9ca3af" }}>Not found</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 6 }}><a href={stock.octopartUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#94a3b8", textDecoration: "none" }}>🔍 All distributors on Octopart →</a></div>
    </div>
  );
}

function StockCell({ stock, loading, partNumber }) {
  if (loading && !stock) return <div style={{ fontSize: 10, color: "#9ca3af" }}>...</div>;
  if (!stock) return <a href={"https://octopart.com/search?q=" + encodeURIComponent(partNumber)} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#2563eb", textDecoration: "none" }}>Check</a>;
  const total = stock.totalStock || 0, color = total > 1000 ? "#16a34a" : total > 100 ? "#d97706" : total > 0 ? "#ea580c" : "#dc2626";
  const dk = stock.digikey, mouser = stock.mouser;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>{total > 0 ? total.toLocaleString() : "Out"}</div>
      {stock.bestPrice && <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{stock.bestPrice}</div>}
      <div style={{ display: "flex", gap: 3 }}>
        {dk && dk.stock > 0 && <a href={dk.url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#2563eb", textDecoration: "none", background: "#eff6ff", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>DK</a>}
        {mouser && mouser.stock > 0 && <a href={mouser.url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#7c3aed", textDecoration: "none", background: "#faf5ff", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>MO</a>}
        {total === 0 && <a href={stock.octopartUrl} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "#2563eb", textDecoration: "none" }}>↗</a>}
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
  a.href = url; a.download = String(projectName).replace(/\s+/g, "_") + "_BOM_PartTensor.csv"; a.click();
  URL.revokeObjectURL(url);
}

function PTLogo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#g1)"/>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#1d4ed8"/>
          <stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
      </defs>
      <rect x="8" y="9" width="3" height="20" rx="1.5" fill="white"/>
      <rect x="8" y="9" width="10" height="3" rx="1.5" fill="white"/>
      <rect x="8" y="18" width="10" height="3" rx="1.5" fill="white"/>
      <rect x="15" y="9" width="3" height="12" rx="1.5" fill="white"/>
      <rect x="22" y="9" width="10" height="3" rx="1.5" fill="white" opacity="0.9"/>
      <rect x="25.5" y="9" width="3" height="20" rx="1.5" fill="white" opacity="0.9"/>
    </svg>
  );
}

export default function App() {
  const [tool, setTool] = useState("search"); // DEFAULT = Smart Search
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

  function switchTool(t) {
    setTool(t); setResult(null); setQuery(""); setError(""); setStockData({}); setSubTab("results");
    retryCount.current = 0;
    setTimeout(function() { inputRef.current && inputRef.current.focus(); }, 100);
  }

  async function run(q) {
    const sq = q || query;
    if (!sq.trim()) return;
    setLoading(true); setError(""); setResult(null); setStockData({}); setSubTab("results");
    const msgs = {
      bom: ["Analyzing application...", "Selecting components...", "Verifying on Digi-Key...", "Almost ready..."],
      search: ["First load may take ~30s...", "Finding components...", "Verifying on Digi-Key...", "Almost ready..."],
    };
    const ml = msgs[tool] || msgs.search;
    let mi = 0; setLoadingMsg(ml[0]);
    const mt = setInterval(function() { mi = Math.min(mi + 1, ml.length - 1); setLoadingMsg(ml[mi]); }, 3500);
    try {
      const res = await fetch(BACKEND_URL + "/api/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sq, mode: tool }),
      });
      const data = await res.json();
      clearInterval(mt);
      if (data.error) {
        if ((data.error.includes("busy") || data.error.includes("overload")) && retryCount.current < 2) {
          retryCount.current++;
          setLoadingMsg("High demand — retrying (" + retryCount.current + "/2)...");
          setTimeout(function() { run(sq); }, 4000); return;
        }
        retryCount.current = 0; setError(data.error); setLoading(false); return;
      }
      retryCount.current = 0; setResult(data); setLoading(false);
      if (data.mode === "passive_connector_alt") return;
      const parts = tool === "bom"
        ? (data.bomItems || []).map(function(p) { return p.partNumber; })
        : data.mode === "alt" ? (data.alternatives || []).map(function(p) { return p.partNumber; })
        : (data.results || []).map(function(p) { return p.partNumber; });
      if (parts.length > 0) {
        setStockLoading(true);
        try {
          const sr = await fetch(BACKEND_URL + "/api/stock", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partNumbers: parts }),
          });
          const sd = await sr.json();
          setStockData(sd);
          setResult(function(prev) {
            if (!prev) return prev;
            const u = Object.assign({}, prev);
            const sf = function(a, b) { return (sd[b.partNumber] ? sd[b.partNumber].totalStock : 0) - (sd[a.partNumber] ? sd[a.partNumber].totalStock : 0); };
            if (u.mode === "search" && u.results) u.results = u.results.slice().sort(sf);
            if (u.mode === "alt" && u.alternatives) u.alternatives = u.alternatives.slice().sort(sf);
            if (u.bomItems) u.bomItems = u.bomItems.slice().sort(sf);
            return u;
          });
        } catch (e) { console.error(e); }
        setStockLoading(false);
      }
    } catch (e) {
      clearInterval(mt);
      setError("Cannot connect. Make sure backend is running.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Plus Jakarta Sans', 'Nunito', sans-serif", color: "#0f172a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .spin { animation: spin 0.9s linear infinite; display:inline-block; }
        .fade-up { animation: fadeUp 0.35s ease forwards; }
        .part-card { transition: all 0.18s; }
        .part-card:hover { box-shadow: 0 8px 32px rgba(37,99,235,0.10) !important; transform: translateY(-2px); }
        .ex-chip:hover { background: #eff6ff !important; color: #2563eb !important; border-color: #bfdbfe !important; }
        .ex-card:hover { border-color: #93c5fd !important; box-shadow: 0 4px 16px rgba(37,99,235,0.08) !important; transform: translateY(-2px); }
        .tool-btn { transition: all 0.15s; }
        .tool-btn:hover { background: #f1f5f9 !important; }
        .bom-row:hover { background: #f8faff !important; }
        .search-link-card:hover { border-color: #93c5fd !important; box-shadow: 0 4px 16px rgba(37,99,235,0.08) !important; transform: translateY(-2px); }
        textarea:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #f1f5f9; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* Top accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg,#1d4ed8,#4f46e5,#0ea5e9,#10b981)", backgroundSize: "200% 100%", animation: "shimmer 3s ease infinite" }} />

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PTLogo size={36} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5, lineHeight: 1 }}>
              Part<span style={{ color: "#2563eb" }}>Tensor</span>
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, letterSpacing: 1.5 }}>HARDWARE INTELLIGENCE</div>
          </div>
        </div>

        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, gap: 2 }}>
          {[{ id: "search", label: "🔍 Smart Search" }, { id: "bom", label: "📋 BOM Generator" }].map(function(t) {
            return (
              <button key={t.id} className="tool-btn" onClick={function() { switchTool(t.id); }}
                style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: tool === t.id ? "#fff" : "transparent", color: tool === t.id ? "#2563eb" : "#64748b", fontSize: 13, fontWeight: tool === t.id ? 700 : 500, cursor: "pointer", boxShadow: tool === t.id ? "0 1px 6px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            );
          })}
        </div>

        <button style={{ padding: "7px 18px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}>
          Sign In
        </button>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px" }}>

        {/* Disclaimer */}
        <div style={{ display: "flex", gap: 8, padding: "9px 14px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 11, color: "#92400e", marginBottom: 20 }}>
          <span>⚠️</span>
          <span><strong>Always verify AI results</strong> against official datasheets before ordering. Do not share confidential designs.</span>
        </div>

        {/* Hero */}
        {!result && !loading && (
          <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeUp 0.4s ease" }}>
            {/* Decorative blobs */}
            <div style={{ position: "absolute", left: "10%", top: 120, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(37,99,235,0.06),transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: "10%", top: 180, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle,rgba(79,70,229,0.05),transparent 70%)", pointerEvents: "none" }} />

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 12, color: "#2563eb", fontWeight: 600, marginBottom: 18, letterSpacing: 0.3 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "float 2s ease infinite" }} />
              Live stock from Digi-Key & Mouser
            </div>

            <h1 style={{ fontSize: 44, fontWeight: 800, color: "#0f172a", marginBottom: 14, letterSpacing: -1.5, lineHeight: 1.1 }}>
              {tool === "search" ? (<>Find any component.<br /><span style={{ background: "linear-gradient(135deg,#1d4ed8,#4f46e5,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Verified & in stock.</span></>) : (<>Describe your circuit.<br /><span style={{ background: "linear-gradient(135deg,#1d4ed8,#4f46e5,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Get a sourcing-ready BOM.</span></>)}
            </h1>

            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto 22px", lineHeight: 1.7 }}>
              {tool === "search"
                ? "Search any component or find alternatives. Semiconductors get AI spec-matched results. Connectors and passives get DigiKey parametric search links."
                : "Describe your application and get a smart BOM with only critical components — every part verified on Digi-Key with live stock."}
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "✅ DigiKey Verified", bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
                { label: "🔵 Digi-Key Live", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
                { label: "🟣 Mouser Live", bg: "#faf5ff", color: "#7c3aed", border: "#e9d5ff" },
                { label: "🤖 AI Powered", bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" },
              ].map(function(d) {
                return <span key={d.label} style={{ fontSize: 12, padding: "5px 13px", borderRadius: 99, background: d.bg, color: d.color, border: "1px solid " + d.border, fontWeight: 600 }}>{d.label}</span>;
              })}
            </div>
          </div>
        )}

        {/* Search Box */}
        <div style={{ background: "#fff", borderRadius: 16, border: "2px solid #e2e8f0", marginBottom: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(37,99,235,0.06)", transition: "border-color 0.2s" }}
          onFocus={function(e) { e.currentTarget.style.borderColor = "#93c5fd"; }}
          onBlur={function(e) { e.currentTarget.style.borderColor = "#e2e8f0"; }}>
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ padding: "0 16px", display: "flex", alignItems: "center", color: "#2563eb", fontSize: 20, flexShrink: 0 }}>
              {tool === "bom" ? "📋" : "🔍"}
            </div>
            <textarea ref={inputRef} value={query}
              onChange={function(e) { setQuery(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
              placeholder={tool === "bom"
                ? "Describe your application… e.g. 24V 10A BLDC motor controller with current sensing"
                : "Search or find alternatives… e.g. 100V 40A MOSFET, IRF540N alternative, CONMMCX002 alternative"}
              rows={2}
              style={{ flex: 1, background: "transparent", border: "none", color: "#0f172a", fontSize: 15, padding: "16px 8px", resize: "none", lineHeight: 1.65, outline: "none" }}
            />
            <div style={{ padding: "12px", display: "flex", alignItems: "center", flexShrink: 0 }}>
              <button onClick={function() { run(); }} disabled={loading || !query.trim()}
                style={{ background: !query.trim() ? "#e2e8f0" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: !query.trim() ? "#9ca3af" : "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: !query.trim() ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: !query.trim() ? "none" : "0 4px 14px rgba(79,70,229,0.35)", whiteSpace: "nowrap" }}>
                {loading ? <span className="spin">⟳</span> : tool === "bom" ? "Generate BOM →" : "Search →"}
              </button>
            </div>
          </div>
          <div style={{ padding: "5px 16px 9px", fontSize: 11, color: "#94a3b8", borderTop: "1px solid #f8fafc", display: "flex", gap: 16 }}>
            {tool === "search"
              ? <><span>💡 Try: <em>"IRF540N alternative"</em> or <em>"100V 40A MOSFET motor"</em></span><span style={{ marginLeft: "auto" }}>Press Enter ↵</span></>
              : <><span>💡 Try: <em>"48V 500W solar charger"</em> or <em>"GaN 400V gate driver"</em></span><span style={{ marginLeft: "auto" }}>Press Enter ↵</span></>}
          </div>
        </div>

        {/* Examples */}
        {!result && !loading && (
          tool === "bom" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 32 }}>
              {BOM_EXAMPLES.map(function(ex, i) {
                return (
                  <button key={i} className="ex-card" onClick={function() { setQuery(ex.label); run(ex.label); }}
                    style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animation: "fadeUp 0.3s ease " + (i * 0.06) + "s both" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{ex.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.45 }}>{ex.label}</div>
                    <div style={{ fontSize: 11, color: "#2563eb", marginTop: 5, fontWeight: 600 }}>Generate BOM →</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32, justifyContent: "center" }}>
              {SEARCH_EXAMPLES.map(function(ex, i) {
                return (
                  <button key={i} className="ex-chip" onClick={function() { setQuery(ex); run(ex); }}
                    style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, padding: "7px 15px", borderRadius: 99, cursor: "pointer", transition: "all 0.15s", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    {ex}
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
            <span>⚠️</span><span style={{ flex: 1 }}>{error}</span>
            <button onClick={function() { setError(""); run(); }} style={{ padding: "4px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "52px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px", background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 8px 28px rgba(79,70,229,0.3)" }}>
              <span className="spin" style={{ color: "#fff" }}>⟳</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{loadingMsg}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 28 }}>Specs validated · DigiKey verified · Sorted by stock</div>
            {[1,2,3,4].map(function(i) { return <div key={i} style={{ height: 52, background: "#f1f5f9", borderRadius: 10, maxWidth: 720, margin: "0 auto 8px", animation: "shimmer 1.5s ease " + (i * 0.1) + "s infinite" }} />; })}
          </div>
        )}

        {/* PASSIVE/CONNECTOR ALT */}
        {result && !loading && result.mode === "passive_connector_alt" && (
          <div className="fade-up">
            <div style={{ background: "linear-gradient(135deg,#f0fdf4,#eff6ff)", border: "1px solid #86efac", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>PARAMETRIC SEARCH</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Alternatives for <span style={{ color: "#16a34a" }}>{result.originalPart}</span></div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{result.originalDescription} · {result.originalManufacturer}</div>
            </div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12 }}>
              <span style={{ fontSize: 20 }}>💡</span>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                <strong style={{ color: "#2563eb" }}>Why parametric search for {result.categoryName}?</strong> Connectors and passives need exact spec matching — impedance, frequency, mounting, gender. These links open pre-filtered searches so you find real in-stock alternatives instantly.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {(result.searchLinks || []).map(function(link, i) {
                const colors = [{ bg: "#eff6ff", border: "#bfdbfe", c: "#2563eb" }, { bg: "#faf5ff", border: "#e9d5ff", c: "#7c3aed" }, { bg: "#f0f9ff", border: "#bae6fd", c: "#0369a1" }];
                const cl = colors[i] || colors[0];
                return (
                  <a key={i} href={link.url} target="_blank" rel="noreferrer" className="search-link-card"
                    style={{ display: "block", padding: "16px", borderRadius: 10, background: cl.bg, border: "1px solid " + cl.border, textDecoration: "none", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: cl.c, marginBottom: 5 }}>{link.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{link.description}</div>
                    <div style={{ fontSize: 11, color: cl.c, marginTop: 8, fontWeight: 600 }}>Open →</div>
                  </a>
                );
              })}
            </div>
            {(result.tips || []).length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 8, letterSpacing: 0.5 }}>FILTER BY THESE SPECS:</div>
                {result.tips.map(function(tip, i) { return <div key={i} style={{ fontSize: 12, color: "#78350f", marginBottom: 3, display: "flex", gap: 8 }}><span style={{ color: "#f59e0b" }}>›</span><span>{tip}</span></div>; })}
              </div>
            )}
            <button onClick={function() { setResult(null); setQuery(""); }} style={{ padding: "8px 18px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 13, cursor: "pointer" }}>← New Search</button>
          </div>
        )}

        {/* BOM RESULTS */}
        {result && !loading && tool === "bom" && result.bomItems && (
          <div className="fade-up">
            <div style={{ background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", borderRadius: 16, padding: "22px 26px", marginBottom: 16, color: "#fff", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", right: 40, bottom: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, position: "relative" }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>PARTTENSOR BOM REPORT</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{result.projectName}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", maxWidth: 480 }}>{result.description}</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[{ l: "Parts", v: result.bomItems.length }, { l: "Critical", v: result.bomItems.filter(function(i) { return i.priority === "critical"; }).length }, { l: "In Stock", v: stockLoading ? "…" : Object.values(stockData).filter(function(s) { return s.totalStock > 0; }).length }, { l: "At Risk", v: stockLoading ? "…" : Object.values(stockData).filter(function(s) { return s.totalStock < 100; }).length }].map(function(s, i) {
                    return (
                      <div key={i} style={{ textAlign: "center", background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 16px", minWidth: 68 }}>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{s.v}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: 0.8 }}>{s.l}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {[{ id: "results", label: "📋 BOM (" + result.bomItems.length + ")" }, { id: "notes", label: "📝 Notes" }].map(function(t) {
                  return <button key={t.id} onClick={function() { setSubTab(t.id); }} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: subTab === t.id ? "#eff6ff" : "transparent", color: subTab === t.id ? "#2563eb" : "#64748b", fontSize: 13, fontWeight: subTab === t.id ? 700 : 500, cursor: "pointer" }}>{t.label}</button>;
                })}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {stockLoading && <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}><span className="spin">⟳</span> Checking stock...</span>}
                <button onClick={function() { exportToCSV(result.bomItems, result.projectName); }} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}>⬇ Export CSV</button>
                <button onClick={function() { setResult(null); setQuery(""); }} style={{ padding: "7px 14px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 13, cursor: "pointer" }}>New BOM</button>
              </div>
            </div>

            {subTab === "results" && (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "28px 100px 135px 1fr 60px 40px 80px 75px 115px", padding: "9px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.2 }}>
                  <div>#</div><div>FUNCTION</div><div>PART NO.</div><div>DESCRIPTION</div><div>PKG</div><div>QTY</div><div>PRIORITY</div><div>RISK</div><div>STOCK</div>
                </div>
                {result.bomItems.map(function(item, i) {
                  const ps = priorityStyle[item.priority] || priorityStyle.optional, stock = stockData[item.partNumber];
                  return (
                    <div key={i} className="bom-row" style={{ display: "grid", gridTemplateColumns: "28px 100px 135px 1fr 60px 40px 80px 75px 115px", padding: "11px 14px", borderBottom: i < result.bomItems.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", transition: "background 0.15s" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{item.id}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#1e293b", marginBottom: 3 }}>{item.function}</div>
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#eff6ff", color: "#2563eb", fontWeight: 600, letterSpacing: 0.3 }}>{item.category}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", marginBottom: 2 }}>{item.partNumber}</div>
                        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>{item.manufacturer}</div>
                        <DatasheetLink partNumber={item.partNumber} manufacturer={item.manufacturer} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.45, marginBottom: 1 }}>{item.description}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{item.keySpecs}</div>
                        {item.notes && <div style={{ fontSize: 10, color: "#d97706", marginTop: 2 }}>⚠ {item.notes}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{item.package}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.quantity}</div>
                      <div><span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, background: ps.bg, color: ps.color, border: "1px solid " + ps.border }}>{ps.label}</span></div>
                      <div><RiskBadge stock={stock} /></div>
                      <div><StockCell stock={stock} loading={stockLoading} partNumber={item.partNumber} /></div>
                    </div>
                  );
                })}
              </div>
            )}
            {subTab === "notes" && (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "22px 26px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>Design Considerations</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, marginBottom: 18 }}>{result.designNotes}</div>
                <div style={{ display: "flex", gap: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                  {[["Supply Voltage", result.voltage], ["Est. Power", result.power], ["BOM Cost", result.totalEstimate]].filter(function(x) { return x[1]; }).map(function(item) {
                    return <div key={item[0]}><div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>{item[0].toUpperCase()}</div><div style={{ fontSize: 16, fontWeight: 700, color: "#2563eb" }}>{item[1]}</div></div>;
                  })}
                </div>
              </div>
            )}
            <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 11, color: "#92400e", display: "flex", gap: 8 }}>
              <span>ℹ️</span><span>AI-generated BOM for reference only. Verify all part numbers against datasheets before ordering.</span>
            </div>
          </div>
        )}

        {/* SEARCH RESULTS */}
        {result && !loading && tool === "search" && result.mode === "search" && result.results && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>{result.category}</span>
              <span style={{ fontSize: 14, color: "#64748b" }}>{result.interpretation}</span>
              <span style={{ fontSize: 11, color: "#16a34a", background: "#f0fdf4", padding: "2px 10px", borderRadius: 99, border: "1px solid #86efac", fontWeight: 600 }}>✅ DigiKey Verified</span>
              {stockLoading && <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}><span className="spin">⟳</span> Checking stock...</span>}
              <button onClick={function() { setResult(null); setQuery(""); }} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, cursor: "pointer" }}>← Back</button>
            </div>
            {result.results.map(function(part, i) {
              const rs = rankStyle[part.rank] || rankStyle.alternative, stock = stockData[part.partNumber];
              return (
                <div key={i} className="part-card" style={{ background: "#fff", borderRadius: 12, border: "1px solid " + (i === 0 ? "#bfdbfe" : "#e2e8f0"), padding: "18px 22px", marginBottom: 10, boxShadow: i === 0 ? "0 4px 16px rgba(37,99,235,0.07)" : "0 1px 4px rgba(0,0,0,0.04)", animation: "fadeUp 0.25s ease " + (i * 0.07) + "s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, fontWeight: 700, background: rs.bg, color: rs.color }}>{rs.label}</span>
                        {i === 0 && <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⭐ Best Match</span>}
                        <RiskBadge stock={stock} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>{part.partNumber}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 5 }}>{part.manufacturer} · {part.type} · {part.package}</div>
                      <DatasheetLink partNumber={part.partNumber} manufacturer={part.manufacturer} />
                    </div>
                    <SpecGrid keySpecs={part.keySpecs} accent="#2563eb" />
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                    {(part.applications || []).map(function(app, j) { return <span key={j} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }}>{app}</span>; })}
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>{part.aeComment}</div>
                  {part.caution && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, color: "#92400e", display: "flex", gap: 8 }}><span>⚠️</span><span>{part.caution}</span></div>}
                  <StockPanel stock={stock} loading={stockLoading} partNumber={part.partNumber} />
                </div>
              );
            })}
            {result.designTip && (
              <div style={{ display: "flex", gap: 12, padding: "14px 18px", borderRadius: 10, background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", border: "1px solid #bfdbfe", marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <div><div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", letterSpacing: 0.8, marginBottom: 4 }}>DESIGN TIP</div><div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7 }}>{result.designTip}</div></div>
              </div>
            )}
          </div>
        )}

        {/* ALTERNATIVE RESULTS */}
        {result && !loading && tool === "search" && result.mode === "alt" && result.alternatives && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#faf5ff", color: "#7c3aed", fontWeight: 700, border: "1px solid #e9d5ff" }}>🔄 ALTERNATIVES</span>
                  <span style={{ fontSize: 11, color: "#16a34a", background: "#f0fdf4", padding: "2px 10px", borderRadius: 99, border: "1px solid #86efac", fontWeight: 600 }}>✅ Verified · Spec Matched</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Alternatives for: <span style={{ color: "#7c3aed" }}>{result.originalPart}</span></div>
                {result.originalSpecs && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{result.originalSpecs.substring(0, 120)}</div>}
              </div>
              {stockLoading && <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}><span className="spin">⟳</span> Checking stock...</span>}
              <button onClick={function() { setResult(null); setQuery(""); }} style={{ padding: "6px 14px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, cursor: "pointer" }}>← Back</button>
            </div>
            {result.alternatives.map(function(part, i) {
              const stock = stockData[part.partNumber];
              const cc = part.compatibility === "drop-in" ? { bg: "#f0fdf4", c: "#16a34a", border: "#86efac", label: "DROP-IN" } : part.compatibility === "pin-compatible" ? { bg: "#eff6ff", c: "#2563eb", border: "#bfdbfe", label: "PIN-COMPATIBLE" } : { bg: "#fffbeb", c: "#d97706", border: "#fde68a", label: "FUNCTIONAL ALT" };
              return (
                <div key={i} className="part-card" style={{ background: "#fff", borderRadius: 12, border: "1px solid " + (i === 0 ? "#86efac" : "#e2e8f0"), padding: "18px 22px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animation: "fadeUp 0.25s ease " + (i * 0.07) + "s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, fontWeight: 700, background: cc.bg, color: cc.c, border: "1px solid " + cc.border }}>{cc.label}</span>
                        <RiskBadge stock={stock} />
                        {i === 0 && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>⭐ Best Alternative</span>}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>{part.partNumber}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, marginBottom: 5 }}>{part.manufacturer} · {part.type} · {part.package}</div>
                      <DatasheetLink partNumber={part.partNumber} manufacturer={part.manufacturer} />
                    </div>
                    <SpecGrid keySpecs={part.keySpecs} accent="#16a34a" />
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>{part.whyAlternative}</div>
                  {part.differences && <div style={{ fontSize: 12, color: "#7c3aed", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 7, padding: "6px 10px", marginBottom: 8 }}>📌 {part.differences}</div>}
                  <StockPanel stock={stock} loading={stockLoading} partNumber={part.partNumber} />
                </div>
              );
            })}
            {result.importantNote && <div style={{ padding: "10px 16px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, color: "#92400e", display: "flex", gap: 8 }}><span>ℹ️</span><span>{result.importantNote}</span></div>}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 18, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PTLogo size={24} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>PartTensor</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>· Hardware Intelligence · v1.0</span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Claude AI · Digi-Key · Mouser · parttensor.com</div>
        </div>

      </div>
    </div>
  );
}
