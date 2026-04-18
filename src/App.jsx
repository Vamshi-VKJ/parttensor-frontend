import { useState, useRef, useEffect, useCallback } from "react";

const BACKEND_URL = "https://parttensor-backend.onrender.com";
const SUPABASE_URL = "https://pchmgfmrdsnuhijbdgys.supabase.co"; // UPDATE THIS
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaG1nZm1yZHNudWhpamJkZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzUwMDUsImV4cCI6MjA5MjAxMTAwNX0.Rta2rut_nxF0nUqwfGYuCm3GwYHUQCY-54KnwgF9rZw"; // UPDATE THIS

// =============================================
// SUPABASE CLIENT
// =============================================
async function supaFetch(path, method, body, token) {
  var headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + (token || SUPABASE_KEY),
  };
  if (method !== "GET") headers["Prefer"] = "return=representation";
  var res = await fetch(SUPABASE_URL + path, {
    method: method || "GET",
    headers: headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  var text = await res.text();
  try { return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null }; }
  catch (e) { return { ok: res.ok, status: res.status, data: text }; }
}

// Auth functions
async function signInWithOTP(email) {
  return await supaFetch("/auth/v1/otp", "POST", { email, create_user: true });
}

async function verifyOTP(email, token) {
  return await supaFetch("/auth/v1/verify", "POST", { email, token, type: "email" });
}

async function signOut(accessToken) {
  return await supaFetch("/auth/v1/logout", "POST", null, accessToken);
}

async function getUser(accessToken) {
  return await supaFetch("/auth/v1/user", "GET", null, accessToken);
}

// Chat session functions
async function createSession(userId, title, accessToken) {
  return await supaFetch("/rest/v1/chat_sessions", "POST", { user_id: userId, title: title || "New Chat", updated_at: new Date().toISOString() }, accessToken);
}

async function getSessions(accessToken) {
  return await supaFetch("/rest/v1/chat_sessions?select=*&order=updated_at.desc&limit=50", "GET", null, accessToken);
}

async function updateSessionTitle(sessionId, title, accessToken) {
  return await supaFetch("/rest/v1/chat_sessions?id=eq." + sessionId, "PATCH", { title: title, updated_at: new Date().toISOString() }, accessToken);
}

async function deleteSession(sessionId, accessToken) {
  return await supaFetch("/rest/v1/chat_sessions?id=eq." + sessionId, "DELETE", null, accessToken);
}

async function saveMessage(sessionId, userId, role, content, data, accessToken) {
  return await supaFetch("/rest/v1/chat_messages", "POST", {
    session_id: sessionId,
    user_id: userId,
    role: role,
    content: content || "",
    data: data || null,
  }, accessToken);
}

async function getMessages(sessionId, accessToken) {
  return await supaFetch("/rest/v1/chat_messages?session_id=eq." + sessionId + "&order=created_at.asc", "GET", null, accessToken);
}

// Session ID for tracking
var SESSION_ID = "session_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

function trackClick(action, partNumber, manufacturer, query, position, componentType, requiredVoltage, requiredCurrent) {
  fetch(BACKEND_URL + "/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION_ID, action: action, partNumber: partNumber || "", manufacturer: manufacturer || "", query: query || "", position: position || null, componentType: componentType || "", requiredVoltage: requiredVoltage || null, requiredCurrent: requiredCurrent || null }),
  }).catch(function() {});
}

// =============================================
// LOGO
// =============================================
function PTLogo({ size }) {
  size = size || 32;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#ptg)"/>
      <defs><linearGradient id="ptg" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stopColor="#1d4ed8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
      <rect x="8" y="9" width="3" height="20" rx="1.5" fill="white"/>
      <rect x="8" y="9" width="10" height="3" rx="1.5" fill="white"/>
      <rect x="8" y="18" width="10" height="3" rx="1.5" fill="white"/>
      <rect x="15" y="9" width="3" height="12" rx="1.5" fill="white"/>
      <rect x="22" y="9" width="10" height="3" rx="1.5" fill="white" opacity="0.9"/>
      <rect x="25.5" y="9" width="3" height="20" rx="1.5" fill="white" opacity="0.9"/>
    </svg>
  );
}

// =============================================
// AUTH SCREEN
// =============================================
function AuthScreen({ onAuth }) {
  var [email, setEmail] = useState("");
  var [otp, setOtp] = useState("");
  var [step, setStep] = useState("email");
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [sent, setSent] = useState(false);

  async function handleSendOTP(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) { setError("Please enter a valid email address"); return; }
    setLoading(true); setError("");
    var res = await signInWithOTP(email);
    setLoading(false);
    if (res.ok || res.status === 200 || res.status === 201) {
      setStep("otp"); setSent(true);
    } else {
      setError("Could not send OTP. Please try again.");
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    if (!otp || otp.length < 4) { setError("Please enter the OTP from your email"); return; }
    setLoading(true); setError("");
    var res = await verifyOTP(email, otp);
    setLoading(false);
    if (res.ok && res.data && res.data.access_token) {
      onAuth(res.data);
    } else {
      setError("Invalid or expired OTP. Please try again.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <PTLogo size={48} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: -0.8 }}>Part<span style={{ color: "#2563eb" }}>Tensor</span></div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 1.5 }}>HARDWARE AI</div>
            </div>
          </div>
          <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6 }}>
            {step === "email" ? "Sign in to access your hardware AI assistant and chat history." : "Enter the 6-digit code sent to " + email}
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 4px 32px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
          {step === "email" ? (
            <form onSubmit={handleSendOTP}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Work Email</label>
                <input
                  type="email" value={email} onChange={function(e) { setEmail(e.target.value); setError(""); }}
                  placeholder="you@company.com" autoFocus
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + (error ? "#ef4444" : "#e2e8f0"), fontSize: 15, outline: "none", color: "#0f172a", background: "#f8fafc" }}
                />
              </div>
              {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 10, background: loading ? "#94a3b8" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
              <div style={{ marginTop: 20, padding: "12px 16px", background: "#f0f9ff", borderRadius: 10, fontSize: 13, color: "#0369a1" }}>
                No password needed. We send a one-time code to your email.
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Enter OTP Code</label>
                <input
                  type="text" value={otp} onChange={function(e) { setOtp(e.target.value.replace(/[^0-9]/g, "")); setError(""); }}
                  placeholder="123456" maxLength={6} autoFocus
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + (error ? "#ef4444" : "#e2e8f0"), fontSize: 24, fontWeight: 700, letterSpacing: 8, outline: "none", color: "#0f172a", textAlign: "center", fontFamily: "'DM Mono', monospace", background: "#f8fafc" }}
                />
              </div>
              {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 10, background: loading ? "#94a3b8" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
              <button type="button" onClick={function() { setStep("email"); setOtp(""); setError(""); }} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "none", color: "#64748b", border: "none", fontSize: 14, cursor: "pointer", marginTop: 8 }}>
                Change email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// PART CARD
// =============================================
function RiskBadge({ stock }) {
  if (!stock) return null;
  var total = stock.totalStock || 0;
  var r = total === 0 ? { s: "OUT", c: "#dc2626", bg: "#fef2f2" } : total < 100 ? { s: "HIGH RISK", c: "#dc2626", bg: "#fef2f2" } : total < 500 ? { s: "MED RISK", c: "#d97706", bg: "#fffbeb" } : total < 2000 ? { s: "LOW RISK", c: "#16a34a", bg: "#f0fdf4" } : { s: "SAFE", c: "#16a34a", bg: "#f0fdf4" };
  return <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, background: r.bg, color: r.c, border: "1px solid " + r.c + "33", whiteSpace: "nowrap" }}>{r.s}</span>;
}

function PartCard({ part, stock, isAlt, rank, msg, idx }) {
  var dk = stock && stock.digikey;
  var mo = stock && stock.mouser;
  var total = stock ? stock.totalStock : null;
  var rankColors = { top: { bg: "linear-gradient(135deg,#1d4ed8,#4f46e5)", c: "#fff", label: "TOP PICK" }, good: { bg: "linear-gradient(135deg,#0891b2,#0ea5e9)", c: "#fff", label: "GOOD FIT" }, alternative: { bg: "#f1f5f9", c: "#64748b", label: "ALT" } };
  var rc = rankColors[rank || part.rank] || rankColors.alternative;
  var query = msg && msg.data && msg.data.query;
  var ct = msg && msg.data && msg.data.componentType;
  var rv = msg && msg.data && msg.data.requiredVoltage;
  var rc2 = msg && msg.data && msg.data.requiredCurrent;

  return (
    <div onClick={function() { trackClick("card_click", part.partNumber, part.manufacturer, query, (idx || 0) + 1, ct, rv, rc2); }}
      style={{ background: "#fff", borderRadius: 12, border: "1px solid " + (rank === "top" ? "#bfdbfe" : "#e2e8f0"), padding: "14px 16px", marginBottom: 8, cursor: "pointer", boxShadow: rank === "top" ? "0 4px 16px rgba(37,99,235,0.08)" : "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.18s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: rc.bg, color: rc.c }}>{rc.label}</span>
            <RiskBadge stock={stock} />
            {rank === "top" && <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>Best Match</span>}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3, fontFamily: "'DM Mono', monospace" }}>{part.partNumber}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{part.manufacturer} {part.package ? " -  " + part.package : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {(part.keySpecs || []).slice(0, 3).map(function(spec, j) {
            return (
              <div key={j} style={{ padding: "5px 9px", borderRadius: 8, textAlign: "center", background: j === 0 ? "#eff6ff" : "#f8fafc", border: "1px solid " + (j === 0 ? "#bfdbfe" : "#e2e8f0"), minWidth: 52 }}>
                <div style={{ fontSize: 8, color: j === 0 ? "#2563eb" : "#94a3b8", fontWeight: 700, letterSpacing: 0.5 }}>{spec.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: j === 0 ? "#1d4ed8" : "#334155", fontFamily: "'DM Mono', monospace" }}>{spec.value}<span style={{ fontSize: 8, color: "#94a3b8" }}>{spec.unit}</span></div>
              </div>
            );
          })}
        </div>
      </div>
      {part.aeComment && (
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, marginTop: 8, padding: "7px 10px", background: "#f8fafc", borderRadius: 7, borderLeft: "3px solid #2563eb" }}>{part.aeComment}</div>
      )}
      {part.caution && (
        <div style={{ fontSize: 11, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "5px 9px", marginTop: 6 }}>Caution: {part.caution}</div>
      )}
      <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {total !== null && <span style={{ fontSize: 11, fontWeight: 700, color: total > 0 ? "#16a34a" : "#dc2626" }}>{total > 0 ? total.toLocaleString() + " units" : "Out of Stock"}</span>}
        {stock && stock.bestPrice && <span style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, background: "#f0fdf4", padding: "2px 8px", borderRadius: 99, border: "1px solid #86efac" }}>{stock.bestPrice} @ {stock.bestPriceSource}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {dk && dk.stock > 0 && <a href={dk.url} target="_blank" rel="noreferrer" onClick={function(e) { e.stopPropagation(); trackClick("buy_dk", part.partNumber, part.manufacturer, query, (idx || 0) + 1, ct, rv, rc2); }} style={{ fontSize: 11, color: "#2563eb", textDecoration: "none", fontWeight: 600, background: "#eff6ff", padding: "3px 9px", borderRadius: 6 }}>Digi-Key</a>}
          {mo && mo.stock > 0 && <a href={mo.url} target="_blank" rel="noreferrer" onClick={function(e) { e.stopPropagation(); trackClick("buy_mouser", part.partNumber, part.manufacturer, query, (idx || 0) + 1, ct, rv, rc2); }} style={{ fontSize: 11, color: "#7c3aed", textDecoration: "none", fontWeight: 600, background: "#faf5ff", padding: "3px 9px", borderRadius: 6 }}>Mouser</a>}
          <a href={"https://www.google.com/search?q=" + encodeURIComponent((part.partNumber || "") + " " + (part.manufacturer || "") + " datasheet")} target="_blank" rel="noreferrer" onClick={function(e) { e.stopPropagation(); trackClick("datasheet", part.partNumber, part.manufacturer, query, (idx || 0) + 1, ct, rv, rc2); }} style={{ fontSize: 11, color: "#64748b", textDecoration: "none", background: "#f1f5f9", padding: "3px 9px", borderRadius: 6 }}>DS</a>
        </div>
      </div>
    </div>
  );
}

// =============================================
// BOM TABLE
// =============================================
function BOMTable({ items, stockData, projectName }) {
  function exportCSV() {
    var headers = ["#", "Function", "Part Number", "Manufacturer", "Description", "Qty", "Key Specs", "Package", "Priority", "Price", "DK Stock", "Mouser Stock"];
    var rows = items.map(function(item) {
      var s = stockData[item.partNumber] || {};
      return [item.id, item.function, item.partNumber, item.manufacturer, item.description, item.quantity, item.keySpecs, item.package, item.priority, s.bestPrice || "", s.digikey ? s.digikey.stock : "", s.mouser ? s.mouser.stock : ""];
    });
    var csv = [headers].concat(rows).map(function(r) { return r.map(function(c) { return '"' + String(c || "").replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var blob = new Blob([csv], { type: "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = String(projectName || "BOM").replace(/\s+/g, "_") + "_PartTensor.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  var hasStock = Object.keys(stockData || {}).length > 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        {!hasStock && <span style={{ fontSize: 12, color: "#94a3b8" }}>Loading stock data...</span>}
        <button onClick={exportCSV} style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Download CSV</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["#", "Function", "Part Number", "Qty", "Priority", "Stock", "Price"].map(function(h) {
                return <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#94a3b8", fontSize: 10, letterSpacing: 0.8 }}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.map(function(item, i) {
              var s = stockData[item.partNumber];
              var total = s ? s.totalStock : null;
              var pStyle = { critical: { c: "#dc2626", bg: "#fef2f2" }, recommended: { c: "#d97706", bg: "#fffbeb" }, optional: { c: "#64748b", bg: "#f8fafc" } };
              var ps = pStyle[item.priority] || pStyle.optional;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{item.id}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b" }}>{item.function}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 800, color: "#2563eb", fontFamily: "'DM Mono', monospace" }}>{item.partNumber}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{item.manufacturer}</div>
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, background: ps.bg, color: ps.c }}>{(item.priority || "").toUpperCase()}</span></td>
                  <td style={{ padding: "8px 10px" }}>
                    {total !== null ? <span style={{ fontSize: 11, fontWeight: 700, color: total > 0 ? "#16a34a" : "#dc2626" }}>{total > 0 ? total.toLocaleString() : "Out"}</span> : <span style={{ fontSize: 10, color: "#94a3b8" }}>...</span>}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#0f172a" }}>{s && s.bestPrice ? s.bestPrice : "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================
// MESSAGE BUBBLE
// =============================================
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 0" }}>
      {[0, 1, 2].map(function(i) { return <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb", animation: "bounce 1.2s ease " + (i * 0.2) + "s infinite" }} />; })}
    </div>
  );
}

function MessageBubble({ msg }) {
  var isUser = msg.role === "user";
  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ maxWidth: "75%", padding: "11px 16px", borderRadius: "18px 18px 4px 18px", background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", fontSize: 14, lineHeight: 1.6, boxShadow: "0 2px 12px rgba(29,78,216,0.25)" }}>
          {msg.content}
        </div>
      </div>
    );
  }

  var d = msg.data;
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PTLogo size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {msg.content && (
          <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, marginBottom: d ? 14 : 0 }}>
            {msg.content.split("\n").map(function(line, i) {
              if (line.startsWith("**") && line.endsWith("**")) return <div key={i} style={{ fontWeight: 700, color: "#0f172a", marginTop: 8 }}>{line.slice(2, -2)}</div>;
              if (line.startsWith("- ")) return <div key={i} style={{ paddingLeft: 12, marginBottom: 2, display: "flex", gap: 8 }}><span style={{ color: "#2563eb" }}>></span><span>{line.slice(2)}</span></div>;
              if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
              return <div key={i}>{line}</div>;
            })}
          </div>
        )}
        {d && d.mode === "search" && d.results && d.results.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>{d.category}  -  {d.results.length} results</div>
            {d.results.map(function(part, i) { return <PartCard key={i} part={part} stock={d.stockData && d.stockData[part.partNumber]} rank={part.rank} msg={msg} idx={i} />; })}
            {d.designTip && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 12, color: "#166534", marginTop: 8 }}>Tip: {d.designTip}</div>}
          </div>
        )}
        {d && d.mode === "alt" && d.alternatives && d.alternatives.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>ALTERNATIVES FOR {d.originalPart}</div>
            {d.alternatives.map(function(part, i) { return <PartCard key={i} part={part} stock={d.stockData && d.stockData[part.partNumber]} isAlt={true} rank={i === 0 ? "top" : i === 1 ? "good" : "alternative"} msg={msg} idx={i} />; })}
          </div>
        )}
        {d && d.bomItems && d.bomItems.length > 0 && (
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{d.projectName}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{d.description}</div>
            </div>
            <BOMTable items={d.bomItems} stockData={d.stockData || {}} projectName={d.projectName} />
            {d.designNotes && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>{d.designNotes}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// SIDEBAR
// =============================================
function Sidebar({ sessions, currentSessionId, onSelectSession, onNewChat, onDeleteSession, user, onSignOut, open, onClose }) {
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }} />}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, background: "#0f172a", zIndex: 50, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 12px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <PTLogo size={28} />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Part<span style={{ color: "#60a5fa" }}>Tensor</span></span>
          </div>
          <button onClick={onNewChat} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>+</span> New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {sessions.length === 0 && <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "20px 0" }}>No chats yet</div>}
          {sessions.map(function(session) {
            var isActive = session.id === currentSessionId;
            return (
              <div key={session.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <button onClick={function() { onSelectSession(session); onClose(); }} style={{ flex: 1, padding: "8px 10px", borderRadius: 7, background: isActive ? "#1e293b" : "none", border: "none", color: isActive ? "#e2e8f0" : "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.title || "New Chat"}
                </button>
                <button onClick={function() { onDeleteSession(session.id); }} style={{ padding: "4px 6px", borderRadius: 5, background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>
                  x
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user && user.email}</div>
          <button onClick={onSignOut} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "#1e293b", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
    </>
  );
}

// =============================================
// MAIN APP
// =============================================
var SUGGESTIONS = [
  "I need a 100V 30A MOSFET for a motor driver",
  "Find alternatives for IRF540N",
  "Design a 24V 10A BLDC motor controller BOM",
  "What is the difference between GaN and SiC MOSFETs?",
  "Best topology for a 400W PFC stage?",
  "How do I calculate gate resistor for MOSFET switching?",
];

export default function App() {
  var [auth, setAuth] = useState(null);
  var [messages, setMessages] = useState([]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [sessions, setSessions] = useState([]);
  var [currentSessionId, setCurrentSessionId] = useState(null);
  var [sidebarOpen, setSidebarOpen] = useState(false);
  var [loadingHistory, setLoadingHistory] = useState(false);
  var bottomRef = useRef(null);
  var inputRef = useRef(null);
  var fileInputRef = useRef(null);
  var retryRef = useRef(0);

  // Load auth from localStorage on mount
  useEffect(function() {
    var saved = localStorage.getItem("pt_auth");
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        if (parsed && parsed.access_token && parsed.expires_at) {
          if (Date.now() < parsed.expires_at * 1000) {
            setAuth(parsed);
          } else {
            localStorage.removeItem("pt_auth");
          }
        }
      } catch (e) { localStorage.removeItem("pt_auth"); }
    }
  }, []);

  // Load sessions when auth changes
  useEffect(function() {
    if (auth) loadSessions();
  }, [auth]);

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadSessions() {
    if (!auth) return;
    var res = await getSessions(auth.access_token);
    if (res.ok && res.data) setSessions(res.data);
  }

  async function handleAuth(authData) {
    localStorage.setItem("pt_auth", JSON.stringify(authData));
    setAuth(authData);
  }

  async function handleSignOut() {
    if (auth) await signOut(auth.access_token);
    localStorage.removeItem("pt_auth");
    setAuth(null);
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
  }

  async function handleSelectSession(session) {
    setCurrentSessionId(session.id);
    setLoadingHistory(true);
    var res = await getMessages(session.id, auth.access_token);
    setLoadingHistory(false);
    if (res.ok && res.data) {
      var msgs = res.data.map(function(m) {
        return { role: m.role, content: m.content, data: m.data, id: m.id };
      });
      setMessages(msgs);
    }
  }

  async function startNewChat() {
    setMessages([]);
    setCurrentSessionId(null);
    setSidebarOpen(false);
    setTimeout(function() { inputRef.current && inputRef.current.focus(); }, 100);
  }

  function addMessage(msg) {
    setMessages(function(prev) { return [...prev, msg]; });
  }

  async function sendMessage(text) {
    var q = (text || input).trim();
    if (!q) return;
    setInput("");

    var userMsg = { role: "user", content: q, id: Date.now() };
    addMessage(userMsg);
    setLoading(true);

    var history = messages.map(function(m) { return { role: m.role, content: m.content || "" }; });

    // Create session if first message
    var sessionId = currentSessionId;
    if (!sessionId && auth) {
      var title = q.length > 40 ? q.substring(0, 40) + "..." : q;
      var sessionRes = await createSession(auth.user && auth.user.id || auth.id, title, auth.access_token);
      if (sessionRes.ok && sessionRes.data && sessionRes.data[0]) {
        sessionId = sessionRes.data[0].id;
        setCurrentSessionId(sessionId);
        await loadSessions();
      }
    }

    // Save user message
    if (sessionId && auth) {
      await saveMessage(sessionId, auth.user && auth.user.id || auth.id, "user", q, null, auth.access_token);
    }

    try {
      var res = await fetch(BACKEND_URL + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history: history, sessionId: SESSION_ID }),
      });

      var data = await res.json();

      if (data.error) {
        if ((data.error.includes("busy") || data.error.includes("overload")) && retryRef.current < 2) {
          retryRef.current++;
          setTimeout(function() { sendMessage(text); }, 3500);
          return;
        }
        retryRef.current = 0;
        addMessage({ role: "assistant", content: "Sorry, I ran into an error. Please try again.", id: Date.now() });
        setLoading(false);
        return;
      }

      retryRef.current = 0;

      // BOM stock background loading
      if (data.bomItems && data.bomItems.length > 0) {
        var bomPNs = data.bomItems.map(function(p) { return p.partNumber; });
        fetch(BACKEND_URL + "/api/stock-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partNumbers: bomPNs }),
        }).then(function(r) { return r.json(); }).then(function(stockData) {
          setMessages(function(prev) {
            return prev.map(function(m) {
              if (m.data && m.data.bomItems && m.data.projectName === data.projectName) {
                return Object.assign({}, m, { data: Object.assign({}, m.data, { stockData: stockData }) });
              }
              return m;
            });
          });
        }).catch(function(e) { console.error("BOM stock failed:", e); });
      }

      var aiMsg = { role: "assistant", content: data.text || "", data: data, id: Date.now() };
      addMessage(aiMsg);

      // Save AI message
      if (sessionId && auth) {
        await saveMessage(sessionId, auth.user && auth.user.id || auth.id, "assistant", data.text || "", data, auth.access_token);
        // Update session title if first AI response
        if (messages.length <= 1) {
          var aiTitle = data.category || data.interpretation || q;
          if (aiTitle.length > 50) aiTitle = aiTitle.substring(0, 50) + "...";
          await updateSessionTitle(sessionId, aiTitle, auth.access_token);
          await loadSessions();
        }
      }

      setLoading(false);
    } catch (e) {
      addMessage({ role: "assistant", content: "Cannot connect to the server. Please check your connection.", id: Date.now() });
      setLoading(false);
    }
  }

  async function handleExcelUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    addMessage({ role: "user", content: "Uploaded: " + file.name, id: Date.now() });
    setLoading(true);
    try {
      var formData = new FormData();
      formData.append("file", file);
      var res = await fetch(BACKEND_URL + "/api/excel-bom", { method: "POST", body: formData });
      if (res.headers.get("content-type") && res.headers.get("content-type").includes("text/csv")) {
        var blob = await res.blob();
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = file.name.replace(/\.[^.]+$/, "") + "_PartTensor.csv"; a.click();
        URL.revokeObjectURL(url);
        addMessage({ role: "assistant", content: "Your BOM has been enriched with alternatives and live stock data. The file has been downloaded.", id: Date.now() });
      } else {
        var data = await res.json();
        addMessage({ role: "assistant", content: data.error ? "Error: " + data.error : (data.text || "Done!"), data: data, id: Date.now() });
      }
    } catch (err) {
      addMessage({ role: "assistant", content: "Failed to process file. Please try again.", id: Date.now() });
    }
    setLoading(false);
    e.target.value = "";
  }

  // Show auth screen if not logged in
  if (!auth) return <AuthScreen onAuth={handleAuth} />;

  var isEmpty = messages.length === 0;
  var user = auth.user || auth;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
      `}</style>

      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={startNewChat}
        onDeleteSession={async function(id) {
          await deleteSession(id, auth.access_token);
          if (id === currentSessionId) { setMessages([]); setCurrentSessionId(null); }
          await loadSessions();
        }}
        user={user}
        onSignOut={handleSignOut}
        open={sidebarOpen}
        onClose={function() { setSidebarOpen(false); }}
      />

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={function() { setSidebarOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#64748b", fontSize: 20, lineHeight: 1 }}>x</button>
          <PTLogo size={28} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>Part<span style={{ color: "#2563eb" }}>Tensor</span></div>
            <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 600, letterSpacing: 1.2 }}>HARDWARE AI</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 99, background: "#f0fdf4", border: "1px solid #86efac" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Live</span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", maxWidth: 820, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {loadingHistory && <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: 20 }}>Loading chat history...</div>}

        {isEmpty && !loadingHistory && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", animation: "fadeUp 0.4s ease" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 8px 32px rgba(29,78,216,0.25)" }}>
              <PTLogo size={40} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: -0.8, textAlign: "center" }}>What can I help you with?</h1>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32, textAlign: "center", maxWidth: 400, lineHeight: 1.7 }}>Ask me about electronic components, circuit design, calculations, or upload a BOM for alternatives and stock.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, width: "100%", maxWidth: 580 }}>
              {SUGGESTIONS.map(function(s, i) {
                return (
                  <button key={i} onClick={function() { sendMessage(s); }} style={{ padding: "11px 14px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", lineHeight: 1.4, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeUp 0.3s ease " + (i * 0.05) + "s both" }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map(function(msg) { return <MessageBubble key={msg.id} msg={msg} />; })}
        {loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}><PTLogo size={20} /></div>
            <TypingDots />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <div style={{ textAlign: "center", padding: "4px 16px", fontSize: 10, color: "#94a3b8" }}>AI results may be inaccurate  -  Always verify against official datasheets before ordering</div>

      {/* Input area */}
      <div style={{ padding: "12px 20px 16px", background: "#fff", borderTop: "1px solid #e2e8f0", maxWidth: 820, width: "100%", margin: "0 auto", boxSizing: "border-box", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: "none" }} />
          <button onClick={function() { fileInputRef.current && fileInputRef.current.click(); }} disabled={loading} title="Upload BOM" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>DS</button>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", background: "#f8fafc", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "10px 14px", gap: 8 }}>
            <textarea ref={inputRef} value={input} onChange={function(e) { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ask about parts, circuits, calculations or upload a BOM..." rows={1} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#0f172a", fontSize: 14, lineHeight: 1.6, resize: "none", maxHeight: 120, overflowY: "auto", fontFamily: "inherit" }} />
            <button onClick={function() { sendMessage(); }} disabled={loading || !input.trim()} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: !input.trim() ? "#e2e8f0" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", border: "none", cursor: !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8L14 2L8 14L7 9L2 8Z" fill={!input.trim() ? "#94a3b8" : "#fff"} /></svg>
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>Shift+Enter for new line  -  DS to upload BOM</div>
      </div>
    </div>
  );
}
