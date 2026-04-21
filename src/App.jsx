import { useState, useRef, useEffect } from "react";

const BACKEND_URL = "https://parttensor-backend.onrender.com";

const SUGGESTIONS = [
  "I need a 100V 30A MOSFET for a motor driver",
  "Find alternatives for IRF540N",
  "Design a 24V 10A BLDC motor controller BOM",
  "What's the difference between GaN and SiC MOSFETs?",
  "Best topology for a 400W PFC stage?",
  "CONMMCX002 alternatives in stock",
  "How do I calculate gate resistor for MOSFET switching?",
  "48V 500W solar MPPT charger BOM",
];

function PTLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#ptg)"/>
      <defs>
        <linearGradient id="ptg" x1="0" y1="0" x2="40" y2="40">
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

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 0" }}>
      {[0, 1, 2].map(function(i) {
        return (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%", background: "#2563eb",
            animation: "bounce 1.2s ease " + (i * 0.2) + "s infinite",
          }} />
        );
      })}
    </div>
  );
}

function RiskBadge({ stock }) {
  if (!stock) return null;
  const total = stock.totalStock || 0;
  const r = total === 0 ? { s: "OUT", c: "#dc2626", bg: "#fef2f2" }
    : total < 100 ? { s: "HIGH RISK", c: "#dc2626", bg: "#fef2f2" }
    : total < 500 ? { s: "MED RISK", c: "#d97706", bg: "#fffbeb" }
    : total < 2000 ? { s: "LOW RISK", c: "#16a34a", bg: "#f0fdf4" }
    : { s: "SAFE", c: "#16a34a", bg: "#f0fdf4" };
  return (
    <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, background: r.bg, color: r.c, border: "1px solid " + r.c + "33", whiteSpace: "nowrap" }}>
      {r.s}
    </span>
  );
}

function PartCard({ part, stock, isAlt, rank }) {
  const [expanded, setExpanded] = useState(false);
  const dk = stock && stock.digikey;
  const mo = stock && stock.mouser;
  const total = stock ? stock.totalStock : null;

  const rankColors = {
    top: { bg: "linear-gradient(135deg,#1d4ed8,#4f46e5)", c: "#fff", label: "TOP PICK" },
    good: { bg: "linear-gradient(135deg,#0891b2,#0ea5e9)", c: "#fff", label: "GOOD FIT" },
    alternative: { bg: "#f1f5f9", c: "#64748b", label: "ALT" },
  };
  const rc = rankColors[rank || part.rank] || rankColors.alternative;

  const compatColors = {
    "drop-in": { bg: "#f0fdf4", c: "#16a34a", border: "#86efac", label: "DROP-IN" },
    "pin-compatible": { bg: "#eff6ff", c: "#2563eb", border: "#bfdbfe", label: "PIN-COMPATIBLE" },
  };
  const cc = isAlt && part.compatibility ? (compatColors[part.compatibility] || { bg: "#fff7ed", c: "#d97706", border: "#fde68a", label: "FUNCTIONAL" }) : null;

  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid " + (rank === "top" || (isAlt && part.compatibility === "drop-in") ? "#bfdbfe" : "#e2e8f0"),
      padding: "14px 16px", marginBottom: 8,
      boxShadow: rank === "top" ? "0 4px 16px rgba(37,99,235,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
      transition: "all 0.18s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: rc.bg, color: rc.c }}>{rc.label}</span>
            {cc && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: cc.bg, color: cc.c, border: "1px solid " + cc.border }}>{cc.label}</span>}
            <RiskBadge stock={stock} />
            {rank === "top" && <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>⭐ Best Match</span>}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3, fontFamily: "'DM Mono', monospace" }}>{part.partNumber}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{part.manufacturer} · {part.type} · {part.package}</div>
        </div>

        {/* Key specs */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {(part.keySpecs || []).slice(0, 3).map(function(spec, j) {
            return (
              <div key={j} style={{ padding: "5px 9px", borderRadius: 8, textAlign: "center", background: j === 0 ? "#eff6ff" : "#f8fafc", border: "1px solid " + (j === 0 ? "#bfdbfe" : "#e2e8f0"), minWidth: 52 }}>
                <div style={{ fontSize: 8, color: j === 0 ? "#2563eb" : "#94a3b8", fontWeight: 700, letterSpacing: 0.5 }}>{spec.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: j === 0 ? "#1d4ed8" : "#334155", fontFamily: "'DM Mono', monospace" }}>
                  {spec.value}<span style={{ fontSize: 8, color: "#94a3b8" }}>{spec.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comment or why alternative */}
      {(part.aeComment || part.whyAlternative) && (
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, marginTop: 8, padding: "7px 10px", background: "#f8fafc", borderRadius: 7, borderLeft: "3px solid #2563eb" }}>
          {part.aeComment || part.whyAlternative}
        </div>
      )}

      {part.differences && (
        <div style={{ fontSize: 11, color: "#7c3aed", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 6, padding: "5px 9px", marginTop: 6 }}>
          📌 {part.differences}
        </div>
      )}

      {/* Stock row */}
      <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {total !== null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: total > 0 ? "#16a34a" : "#dc2626" }}>
            {total > 0 ? "✓ " + total.toLocaleString() + " units" : "✗ Out of Stock"}
          </span>
        )}
        {stock && stock.bestPrice && (
          <span style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, background: "#f0fdf4", padding: "2px 8px", borderRadius: 99, border: "1px solid #86efac" }}>
            {stock.bestPrice} @ {stock.bestPriceSource}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {dk && dk.stock > 0 && <a href={dk.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2563eb", textDecoration: "none", fontWeight: 600, background: "#eff6ff", padding: "3px 9px", borderRadius: 6 }}>Digi-Key →</a>}
          {mo && mo.stock > 0 && <a href={mo.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#7c3aed", textDecoration: "none", fontWeight: 600, background: "#faf5ff", padding: "3px 9px", borderRadius: 6 }}>Mouser →</a>}
          <a href={"https://www.google.com/search?q=" + encodeURIComponent((part.partNumber || "") + " " + (part.manufacturer || "") + " datasheet")} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: "#64748b", textDecoration: "none", background: "#f1f5f9", padding: "3px 9px", borderRadius: 6 }}>📄 DS</a>
        </div>
      </div>
    </div>
  );
}

function BOMTable({ items, stockData, projectName }) {
  function exportCSV() {
    const headers = ["#", "Function", "Part Number", "Manufacturer", "Description", "Category", "Qty", "Key Specs", "Package", "Priority", "Price", "DK Stock", "Mouser Stock"];
    const rows = items.map(function(item) {
      const s = stockData[item.partNumber] || {};
      return [item.id, item.function, item.partNumber, item.manufacturer, item.description, item.category, item.quantity, item.keySpecs, item.package, item.priority, s.bestPrice || "", s.digikey ? s.digikey.stock : "", s.mouser ? s.mouser.stock : ""];
    });
    const csv = [headers].concat(rows).map(function(r) { return r.map(function(c) { return '"' + String(c || "").replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = String(projectName || "BOM").replace(/\s+/g, "_") + "_PartTensor.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const priorityStyle = {
    critical: { c: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    recommended: { c: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    optional: { c: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={exportCSV} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>⬇ Export CSV</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["#", "Function", "Part Number", "Description", "Qty", "Priority", "Stock", "Price"].map(function(h) {
                return <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#94a3b8", fontSize: 10, letterSpacing: 0.8, whiteSpace: "nowrap" }}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.map(function(item, i) {
              const ps = priorityStyle[item.priority] || priorityStyle.optional;
              const s = stockData[item.partNumber];
              const total = s ? s.totalStock : null;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>{item.id}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>{item.function}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 800, color: "#2563eb", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{item.partNumber}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{item.manufacturer}</div>
                  </td>
                  <td style={{ padding: "8px 10px", color: "#475569", maxWidth: 200 }}>
                    <div>{item.description}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{item.keySpecs}</div>
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, background: ps.bg, color: ps.c, border: "1px solid " + ps.border, whiteSpace: "nowrap" }}>
                      {(item.priority || "").toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {total !== null ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: total > 0 ? "#16a34a" : "#dc2626" }}>
                        {total > 0 ? total.toLocaleString() : "Out"}
                      </span>
                    ) : <span style={{ fontSize: 10, color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                    {s && s.bestPrice ? s.bestPrice : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchLinkCards({ links, tips, categoryName }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Parametric search gives the most accurate results for {categoryName}:
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {(links || []).map(function(link, i) {
          const colors = [{ bg: "#eff6ff", c: "#2563eb", border: "#bfdbfe" }, { bg: "#faf5ff", c: "#7c3aed", border: "#e9d5ff" }, { bg: "#f0f9ff", c: "#0369a1", border: "#bae6fd" }];
          const cl = colors[i % 3];
          return (
            <a key={i} href={link.url} target="_blank" rel="noreferrer"
              style={{ display: "block", padding: "10px 14px", borderRadius: 10, background: cl.bg, border: "1px solid " + cl.border, textDecoration: "none", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: cl.c }}>{link.name}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{link.description}</div>
            </a>
          );
        })}
      </div>
      {tips && tips.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#78350f" }}>
          <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 11 }}>FILTER BY:</div>
          {tips.map(function(tip, i) { return <div key={i} style={{ marginBottom: 2 }}>› {tip}</div>; })}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, isLast }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
        <div style={{
          maxWidth: "75%", padding: "11px 16px", borderRadius: "18px 18px 4px 18px",
          background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff",
          fontSize: 14, lineHeight: 1.6, boxShadow: "0 2px 12px rgba(29,78,216,0.25)",
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  // AI message
  const d = msg.data;
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, animation: "fadeUp 0.3s ease", alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PTLogo size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Text response */}
        {msg.content && (
          <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, marginBottom: d ? 14 : 0 }}>
            {msg.content.split("\n").map(function(line, i) {
              if (line.startsWith("**") && line.endsWith("**")) {
                return <div key={i} style={{ fontWeight: 700, color: "#0f172a", marginTop: 8, marginBottom: 2 }}>{line.slice(2, -2)}</div>;
              }
              if (line.startsWith("- ") || line.startsWith("• ")) {
                return <div key={i} style={{ paddingLeft: 12, marginBottom: 2, display: "flex", gap: 8 }}><span style={{ color: "#2563eb", flexShrink: 0 }}>›</span><span>{line.slice(2)}</span></div>;
              }
              if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
              return <div key={i}>{line}</div>;
            })}
          </div>
        )}

        {/* Part results */}
        {d && d.mode === "search" && d.results && d.results.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>
              {d.category} · {d.results.length} results · DigiKey verified
            </div>
            {d.results.map(function(part, i) {
              return <PartCard key={i} part={part} stock={d.stockData && d.stockData[part.partNumber]} rank={part.rank} />;
            })}
            {d.designTip && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 12, color: "#166534", display: "flex", gap: 8, marginTop: 8 }}>
                <span>💡</span><span><strong>Design tip:</strong> {d.designTip}</span>
              </div>
            )}
          </div>
        )}

        {/* Alternatives */}
        {d && d.mode === "alt" && d.alternatives && d.alternatives.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>
              ALTERNATIVES FOR {d.originalPart} · {d.alternatives.length} found · Spec matched
            </div>
            {d.alternatives.map(function(part, i) {
              return <PartCard key={i} part={part} stock={d.stockData && d.stockData[part.partNumber]} isAlt={true} rank={i === 0 ? "top" : i === 1 ? "good" : "alternative"} />;
            })}
            {d.importantNote && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, color: "#92400e", marginTop: 8 }}>
                ℹ️ {d.importantNote}
              </div>
            )}
          </div>
        )}

        {/* Passive/connector search links */}
        {d && d.mode === "passive_connector_alt" && (
          <SearchLinkCards links={d.searchLinks} tips={d.tips} categoryName={d.categoryName} />
        )}

        {/* BOM */}
        {d && d.bomItems && d.bomItems.length > 0 && (
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{d.projectName}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{d.description}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {d.voltage && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#eff6ff", color: "#2563eb", fontWeight: 600, border: "1px solid #bfdbfe" }}>{d.voltage}</span>}
                {d.power && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#f0fdf4", color: "#16a34a", fontWeight: 600, border: "1px solid #86efac" }}>{d.power}</span>}
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#f8fafc", color: "#64748b", fontWeight: 600, border: "1px solid #e2e8f0" }}>{d.bomItems.length} parts</span>
              </div>
            </div>
            <BOMTable items={d.bomItems} stockData={d.stockData || {}} projectName={d.projectName} />
            {d.designNotes && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                <strong style={{ color: "#1e293b" }}>Design notes:</strong> {d.designNotes}
              </div>
            )}
          </div>
        )}

        {/* Follow-up suggestions */}
        {msg.followUps && msg.followUps.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {msg.followUps.map(function(fu, i) {
              return (
                <button key={i} onClick={fu.onClick}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 99, background: "#fff", border: "1px solid #e2e8f0", color: "#475569", cursor: "pointer", fontWeight: 500, transition: "all 0.15s" }}>
                  {fu.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const retryRef = useRef(0);

  useEffect(function() {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  function addMessage(msg) {
    setMessages(function(prev) { return [...prev, msg]; });
  }

  function setLastAI(updater) {
    setMessages(function(prev) {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "assistant") {
          next[i] = typeof updater === "function" ? updater(next[i]) : updater;
          break;
        }
      }
      return next;
    });
  }

  async function sendMessage(text, isCorrection) {
    const q = (text || input).trim();
    if (!q) return;
    setInput("");

    const userMsg = { role: "user", content: q, id: Date.now() };
    addMessage(userMsg);
    setLoading(true);

    // Build conversation history for context
    const history = messages.map(function(m) {
      return { role: m.role, content: m.content || "" };
    });

    try {
      const res = await fetch(BACKEND_URL + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          history: history,
          isCorrection: isCorrection || false,
        }),
      });

      const data = await res.json();

      if (data.error) {
        if ((data.error.includes("busy") || data.error.includes("overload")) && retryRef.current < 2) {
          retryRef.current++;
          setTimeout(function() { sendMessage(text, isCorrection); }, 3500);
          return;
        }
        retryRef.current = 0;
        addMessage({
          role: "assistant",
          content: "Sorry, I ran into an error: " + data.error + ". Please try again.",
          id: Date.now(),
        });
        setLoading(false);
        return;
      }

      retryRef.current = 0;

      // Build follow-up suggestions based on intent
      const followUps = buildFollowUps(data, q);

      addMessage({
        role: "assistant",
        content: data.text || "",
        data: data,
        followUps: followUps,
        id: Date.now(),
      });
      setLoading(false);

    } catch (e) {
      addMessage({
        role: "assistant",
        content: "Cannot connect to the server. Please check your connection and try again.",
        id: Date.now(),
      });
      setLoading(false);
    }
  }

  function buildFollowUps(data, query) {
    const fus = [];
    if (data.mode === "search" && data.results && data.results.length > 0) {
      const top = data.results[0];
      fus.push({ label: "Find alternatives for " + top.partNumber, onClick: function() { sendMessage("Find alternatives for " + top.partNumber); } });
      fus.push({ label: "Calculate gate resistor for " + top.partNumber, onClick: function() { sendMessage("How do I calculate gate resistor for " + top.partNumber + " at 100kHz switching?"); } });
    }
    if (data.mode === "alt") {
      fus.push({ label: "Compare these alternatives", onClick: function() { sendMessage("Compare these alternatives — what are the key differences?"); } });
    }
    if (data.bomItems) {
      fus.push({ label: "Review design notes", onClick: function() { sendMessage("Any important design considerations for this circuit?"); } });
      fus.push({ label: "Find alternatives for any out-of-stock parts", onClick: function() { sendMessage("Which parts have low stock? Find alternatives."); } });
    }
    if (data.intent === "circuit_question") {
      fus.push({ label: "Suggest parts for this design", onClick: function() { sendMessage("Suggest specific parts for this design"); } });
    }
    return fus.slice(0, 3);
  }

  async function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingExcel(true);

    addMessage({ role: "user", content: "📎 Uploaded: " + file.name + " — Find alternatives and key specs for all parts", id: Date.now() });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(BACKEND_URL + "/api/excel-bom", { method: "POST", body: formData });

      if (res.headers.get("content-type") && res.headers.get("content-type").includes("application/json")) {
        const data = await res.json();
        addMessage({
          role: "assistant",
          content: data.error ? "Error processing Excel: " + data.error : (data.text || "Excel processed."),
          data: data,
          id: Date.now(),
        });
      } else {
        // File download response
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name.replace(".xlsx", "_PartTensor.xlsx").replace(".xls", "_PartTensor.xlsx").replace(".csv", "_PartTensor.csv");
        a.click();
        URL.revokeObjectURL(url);
        addMessage({
          role: "assistant",
          content: "✅ Done! Your BOM has been enriched with alternatives, key specs, and live stock data from Digi-Key and Mouser. The file has been downloaded.",
          id: Date.now(),
        });
      }
    } catch (err) {
      addMessage({
        role: "assistant",
        content: "Failed to process Excel file. Please make sure it has a column with part numbers.",
        id: Date.now(),
      });
    }

    setLoading(false);
    setUploadingExcel(false);
    e.target.value = "";
  }

  function startNew() {
    setMessages([]);
    setSidebarOpen(false);
    setTimeout(function() { inputRef.current && inputRef.current.focus(); }, 100);
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'DM Sans', 'Nunito', sans-serif", color: "#0f172a", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .spin { animation: spin 0.9s linear infinite; display:inline-block; }
        .suggestion-btn:hover { background: #eff6ff !important; border-color: #93c5fd !important; color: #1d4ed8 !important; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 16px rgba(29,78,216,0.4) !important; }
        .part-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,235,0.1) !important; }
        .followup-btn:hover { background: #eff6ff !important; border-color: #93c5fd !important; color: #1d4ed8 !important; }
        textarea { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        @media (max-width: 640px) {
          .desktop-only { display: none !important; }
          .chat-container { padding: 12px 12px !important; }
          .input-area { padding: 10px 12px !important; }
          .message-bubble-user { max-width: 88% !important; }
        }
      `}</style>

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {/* Mobile menu button */}
          <button onClick={function() { setSidebarOpen(!sidebarOpen); }} style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#64748b" }} className="mobile-menu">
            ☰
          </button>
          <PTLogo size={32} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5, lineHeight: 1 }}>
              Part<span style={{ color: "#2563eb" }}>Tensor</span>
            </div>
            <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 600, letterSpacing: 1.2 }}>HARDWARE AI</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 99, background: "#f0fdf4", border: "1px solid #86efac" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Live</span>
          </div>

          <button onClick={startNew}
            style={{ padding: "6px 14px", borderRadius: 8, background: "#f1f5f9", border: "none", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            className="desktop-only">
            + New Chat
          </button>

          <button style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}
            className="desktop-only">
            Sign In
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Messages */}
          <div className="chat-container" style={{ flex: 1, overflowY: "auto", padding: "24px 20px", maxWidth: 820, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

            {/* Empty state */}
            {isEmpty && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", animation: "fadeUp 0.4s ease" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 8px 32px rgba(29,78,216,0.25)" }}>
                  <PTLogo size={40} />
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: -0.8, textAlign: "center" }}>
                  How can I help?
                </h1>
                <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32, textAlign: "center", maxWidth: 420, lineHeight: 1.7 }}>
                  Ask me anything about electronic components — part selection, alternatives, BOMs, circuit design, calculations, or troubleshooting.
                </p>

                {/* Capability badges */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 32 }}>
                  {[
                    { icon: "🔍", label: "Find Parts" },
                    { icon: "🔄", label: "Alternatives" },
                    { icon: "📋", label: "Generate BOM" },
                    { icon: "⚡", label: "Circuit Design" },
                    { icon: "🧮", label: "Calculations" },
                    { icon: "📎", label: "Excel BOM Upload" },
                  ].map(function(cap) {
                    return (
                      <div key={cap.label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, background: "#fff", border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                        <span>{cap.icon}</span><span>{cap.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Suggestions */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, width: "100%", maxWidth: 600 }}>
                  {SUGGESTIONS.slice(0, 6).map(function(s, i) {
                    return (
                      <button key={i} className="suggestion-btn"
                        onClick={function() { sendMessage(s); }}
                        style={{ padding: "11px 14px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s", lineHeight: 1.4, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeUp 0.3s ease " + (i * 0.05) + "s both" }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(function(msg) {
              return <MessageBubble key={msg.id} msg={msg} />;
            })}

            {/* Loading */}
            {loading && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start", animation: "fadeUp 0.2s ease" }}>
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PTLogo size={20} />
                </div>
                <TypingDots />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Disclaimer */}
          <div style={{ textAlign: "center", padding: "4px 16px", fontSize: 10, color: "#94a3b8" }}>
            AI results may be inaccurate · Always verify against official datasheets before ordering
          </div>

          {/* Input area */}
          <div className="input-area" style={{ padding: "12px 20px 16px", background: "#fff", borderTop: "1px solid #e2e8f0", maxWidth: 820, width: "100%", margin: "0 auto", boxSizing: "border-box", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>

              {/* Excel upload */}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: "none" }} />
              <button onClick={function() { fileInputRef.current && fileInputRef.current.click(); }}
                disabled={loading || uploadingExcel}
                title="Upload Excel BOM"
                style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#64748b", transition: "all 0.15s" }}>
                {uploadingExcel ? <span className="spin" style={{ fontSize: 14 }}>⟳</span> : "📎"}
              </button>

              {/* Input box */}
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", background: "#f8fafc", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "10px 14px", gap: 8, transition: "border-color 0.2s" }}
                onFocus={function(e) { e.currentTarget.style.borderColor = "#93c5fd"; }}
                onBlur={function(e) { e.currentTarget.style.borderColor = "#e2e8f0"; }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={function(e) { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask about parts, circuits, calculations, or upload a BOM…"
                  rows={1}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#0f172a", fontSize: 14, lineHeight: 1.6, resize: "none", maxHeight: 120, overflowY: "auto", paddingTop: 1 }}
                />
                <button onClick={function() { sendMessage(); }} disabled={loading || !input.trim()} className="send-btn"
                  style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: !input.trim() ? "#e2e8f0" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", border: "none", cursor: !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: !input.trim() ? "none" : "0 2px 10px rgba(29,78,216,0.35)" }}>
                  {loading ? <span className="spin" style={{ color: "#fff", fontSize: 14 }}>⟳</span> :
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8L14 2L8 14L7 9L2 8Z" fill={!input.trim() ? "#94a3b8" : "#fff"} />
                    </svg>
                  }
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                Shift+Enter for new line · 📎 to upload Excel BOM
              </div>
              {messages.length > 0 && (
                <button onClick={startNew} style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  + New chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
