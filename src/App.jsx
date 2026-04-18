import { useState, useRef, useEffect } from "react";

const BACKEND_URL = "https://parttensor-backend.onrender.com";
const RAZORPAY_KEY_ID = "rzp_test_REPLACE_WITH_YOUR_KEY"; // Replace with your Razorpay Key ID
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "";

// =============================================
// LIMITS
// =============================================
var GUEST_LIMIT = 10;
var FREE_LIMIT = 50;

// =============================================
// SUPABASE CLIENT
// =============================================
async function supaFetch(path, method, body, token) {
  try {
    var headers = {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + (token || SUPABASE_KEY),
      "x-client-info": "parttensor/1.0",
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
  } catch (e) { return { ok: false, data: null }; }
}

async function signInWithOTP(email) {
  return await supaFetch("/auth/v1/otp", "POST", {
    email: email,
    create_user: true,
    gotrue_meta_security: {}
  });
}
async function verifyOTP(email, token) {
  return await supaFetch("/auth/v1/verify", "POST", {
    email: email,
    token: token,
    type: "email",
    gotrue_meta_security: {}
  });
}
async function signOut(accessToken) {
  return await supaFetch("/auth/v1/logout", "POST", null, accessToken);
}

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
  return await supaFetch("/rest/v1/chat_messages", "POST", { session_id: sessionId, user_id: userId, role: role, content: content || "", data: data || null }, accessToken);
}
async function getMessages(sessionId, accessToken) {
  return await supaFetch("/rest/v1/chat_messages?session_id=eq." + sessionId + "&order=created_at.asc", "GET", null, accessToken);
}

// =============================================
// TRACKING
// =============================================
var SESSION_ID = "s_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();

function trackClick(action, partNumber, manufacturer, query, position, componentType, rv, rc) {
  fetch(BACKEND_URL + "/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION_ID, action: action, partNumber: partNumber || "", manufacturer: manufacturer || "", query: query || "", position: position || null, componentType: componentType || "", requiredVoltage: rv || null, requiredCurrent: rc || null }),
  }).catch(function() {});
}

// Submit part feedback (good/bad)
function submitFeedback(partNumber, manufacturer, query, feedback, componentType) {
  return fetch(BACKEND_URL + "/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partNumber: partNumber,
      manufacturer: manufacturer || "",
      query: query || "",
      feedback: feedback,
      sessionId: SESSION_ID,
      componentType: componentType || "",
    }),
  }).catch(function() {});
}

// Load Razorpay script
function loadRazorpay() {
  return new Promise(function(resolve) {
    if (window.Razorpay) { resolve(true); return; }
    var script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = function() { resolve(true); };
    script.onerror = function() { resolve(false); };
    document.body.appendChild(script);
  });
}

// Open Razorpay checkout
async function openRazorpayCheckout(plan, userId, email, onSuccess) {
  var loaded = await loadRazorpay();
  if (!loaded) { alert("Payment gateway failed to load. Please try again."); return; }

  try {
    var res = await fetch(BACKEND_URL + "/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan, userId: userId, email: email }),
    });
    var orderData = await res.json();
    if (orderData.error) { alert("Could not create order: " + orderData.error); return; }

    var options = {
      key: RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: "INR",
      name: "PartTensor",
      description: plan === "yearly" ? "Pro Annual - Unlimited messages" : "Pro Monthly - Unlimited messages",
      order_id: orderData.orderId,
      prefill: { email: email || "" },
      theme: { color: "#2563eb" },
      handler: async function(response) {
        // Verify payment on backend
        var verifyRes = await fetch(BACKEND_URL + "/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId: userId,
            plan: plan,
          }),
        });
        var verifyData = await verifyRes.json();
        if (verifyData.success) {
          onSuccess && onSuccess(plan);
        } else {
          alert("Payment verification failed. Please contact support.");
        }
      },
    };
    var rzp = new window.Razorpay(options);
    rzp.open();
  } catch (e) {
    alert("Payment error: " + e.message);
  }
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
// AUTH MODAL
// =============================================
function AuthModal({ mode, onAuth, onClose }) {
  var [email, setEmail] = useState("");
  var [otp, setOtp] = useState("");
  var [step, setStep] = useState("email");
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");

  async function handleSendOTP(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) { setError("Please enter a valid email"); return; }
    setLoading(true); setError("");
    var res = await signInWithOTP(email);
    setLoading(false);
    console.log("OTP response:", res.status, JSON.stringify(res.data));
    if (res.ok || res.status === 200 || res.status === 201) {
      setStep("otp");
    } else {
      var errMsg = "Could not send OTP (status " + res.status + ")";
      if (res.data) {
        if (res.data.msg) errMsg = res.data.msg;
        else if (res.data.message) errMsg = res.data.message;
        else if (res.data.error_description) errMsg = res.data.error_description;
        else if (res.data.error) errMsg = res.data.error;
        else errMsg = JSON.stringify(res.data).substring(0, 100);
      }
      setError(errMsg);
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PTLogo size={32} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Part<span style={{ color: "#2563eb" }}>Tensor</span></div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, letterSpacing: 1 }}>HARDWARE AI</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>x</button>
        </div>

        {mode === "limit" && step === "email" && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#92400e" }}>
            You have used your 10 free messages today. Sign in for 50 messages/day free, or upgrade for unlimited.
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Email address</label>
              <input type="email" value={email} onChange={function(e) { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" autoFocus style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + (error ? "#ef4444" : "#e2e8f0"), fontSize: 14, outline: "none", color: "#0f172a" }} />
            </div>
            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 10, background: loading ? "#94a3b8" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Sending..." : "Send OTP Code"}
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>No password needed. We email you a one-time code.</div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Enter OTP sent to {email}</label>
              <input type="text" value={otp} onChange={function(e) { setOtp(e.target.value.replace(/[^0-9]/g, "")); setError(""); }} placeholder="123456" maxLength={6} autoFocus style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid " + (error ? "#ef4444" : "#e2e8f0"), fontSize: 24, fontWeight: 700, letterSpacing: 8, outline: "none", color: "#0f172a", textAlign: "center", fontFamily: "'DM Mono', monospace" }} />
            </div>
            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 10, background: loading ? "#94a3b8" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Verifying..." : "Verify and Sign In"}
            </button>
            <button type="button" onClick={function() { setStep("email"); setOtp(""); setError(""); }} style={{ width: "100%", padding: "9px", borderRadius: 10, background: "none", color: "#64748b", border: "none", fontSize: 13, cursor: "pointer", marginTop: 6 }}>
              Change email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// =============================================
// UPGRADE MODAL
// =============================================
function UpgradeModal({ onClose, onSignIn, onPay }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <button onClick={onClose} style={{ float: "right", background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>x</button>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>Pro</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>You have reached your daily limit</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>Upgrade for unlimited access to PartTensor</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div style={{ padding: "16px 20px", borderRadius: 12, border: "2px solid #2563eb", background: "#eff6ff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: "#1d4ed8", fontSize: 16 }}>Pro</div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 20 }}>$29<span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>/month</span></div>
            </div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              - Unlimited messages<br/>
              - Full BOM generation<br/>
              - Excel BOM upload<br/>
              - Chat history<br/>
              - Priority support
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={function() { onPay("monthly"); }} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Monthly - Rs 99
              </button>
              <button onClick={function() { onPay("yearly"); }} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Annual - Rs 799
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>Annual saves Rs 389/year</div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
          Not ready? <button onClick={onSignIn} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Sign in for 50 free messages/day</button>
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


// =============================================
// PART FEEDBACK COMPONENT
// =============================================
function PartFeedback({ partNumber, manufacturer, query, componentType }) {
  var [voted, setVoted] = useState(null);
  var [submitting, setSubmitting] = useState(false);

  async function handleFeedback(feedback) {
    if (voted || submitting) return;
    setSubmitting(true);
    await submitFeedback(partNumber, manufacturer, query, feedback, componentType);
    setVoted(feedback);
    setSubmitting(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      <span style={{ fontSize: 11, color: "#94a3b8" }}>Was this helpful?</span>
      <button
        onClick={function(e) { e.stopPropagation(); handleFeedback("good"); }}
        disabled={!!voted || submitting}
        style={{
          padding: "3px 10px", borderRadius: 99, border: "1px solid " + (voted === "good" ? "#16a34a" : "#e2e8f0"),
          background: voted === "good" ? "#f0fdf4" : "#fff",
          color: voted === "good" ? "#16a34a" : "#64748b",
          fontSize: 12, cursor: voted ? "default" : "pointer", fontWeight: 600,
          transition: "all 0.15s",
        }}>
        {voted === "good" ? "Helpful" : "Yes"}
      </button>
      <button
        onClick={function(e) { e.stopPropagation(); handleFeedback("bad"); }}
        disabled={!!voted || submitting}
        style={{
          padding: "3px 10px", borderRadius: 99, border: "1px solid " + (voted === "bad" ? "#dc2626" : "#e2e8f0"),
          background: voted === "bad" ? "#fef2f2" : "#fff",
          color: voted === "bad" ? "#dc2626" : "#64748b",
          fontSize: 12, cursor: voted ? "default" : "pointer", fontWeight: 600,
          transition: "all 0.15s",
        }}>
        {voted === "bad" ? "Not helpful" : "No"}
      </button>
      {voted && <span style={{ fontSize: 11, color: "#94a3b8" }}>Thanks!</span>}
    </div>
  );
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
    <div onClick={function() { trackClick("card_click", part.partNumber, part.manufacturer, query, (idx || 0) + 1, ct, rv, rc2); }} style={{ background: "#fff", borderRadius: 12, border: "1px solid " + (rank === "top" ? "#bfdbfe" : "#e2e8f0"), padding: "14px 16px", marginBottom: 8, cursor: "pointer", boxShadow: rank === "top" ? "0 4px 16px rgba(37,99,235,0.08)" : "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.18s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700, background: rc.bg, color: rc.c }}>{rc.label}</span>
            <RiskBadge stock={stock} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3, fontFamily: "'DM Mono', monospace" }}>{part.partNumber}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{part.manufacturer}{part.package ? " - " + part.package : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {(part.keySpecs || []).slice(0, 3).map(function(spec, j) {
            return (
              <div key={j} style={{ padding: "5px 9px", borderRadius: 8, textAlign: "center", background: j === 0 ? "#eff6ff" : "#f8fafc", border: "1px solid " + (j === 0 ? "#bfdbfe" : "#e2e8f0"), minWidth: 52 }}>
                <div style={{ fontSize: 8, color: j === 0 ? "#2563eb" : "#94a3b8", fontWeight: 700 }}>{spec.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: j === 0 ? "#1d4ed8" : "#334155", fontFamily: "'DM Mono', monospace" }}>{spec.value}<span style={{ fontSize: 8, color: "#94a3b8" }}>{spec.unit}</span></div>
              </div>
            );
          })}
        </div>
      </div>
      {part.aeComment && <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, marginTop: 8, padding: "7px 10px", background: "#f8fafc", borderRadius: 7, borderLeft: "3px solid #2563eb" }}>{part.aeComment}</div>}
      {part.caution && <div style={{ fontSize: 11, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "5px 9px", marginTop: 6 }}>Caution: {part.caution}</div>}
      <PartFeedback partNumber={part.partNumber} manufacturer={part.manufacturer} query={query} componentType={ct} />
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
    var headers = ["#", "Function", "Part Number", "Manufacturer", "Qty", "Key Specs", "Package", "Priority", "Price", "DK Stock", "Mouser Stock"];
    var rows = items.map(function(item) {
      var s = stockData[item.partNumber] || {};
      return [item.id, item.function, item.partNumber, item.manufacturer, item.quantity, item.keySpecs, item.package, item.priority, s.bestPrice || "", s.digikey ? s.digikey.stock : "", s.mouser ? s.mouser.stock : ""];
    });
    var csv = [headers].concat(rows).map(function(r) { return r.map(function(c) { return '"' + String(c || "").replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var blob = new Blob([csv], { type: "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = String(projectName || "BOM").replace(/\s+/g, "_") + "_PartTensor.csv"; a.click();
    URL.revokeObjectURL(url);
  }
  var hasStock = Object.keys(stockData || {}).length > 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        {!hasStock && <span style={{ fontSize: 12, color: "#94a3b8" }}>Loading stock...</span>}
        <button onClick={exportCSV} style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Download CSV</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["#", "Function", "Part Number", "Qty", "Priority", "Stock", "Price"].map(function(h) {
                return <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#94a3b8", fontSize: 10 }}>{h}</th>;
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
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, background: ps.bg, color: ps.c }}>{(item.priority || "").toUpperCase()}</span></td>
                  <td style={{ padding: "8px 10px" }}>{total !== null ? <span style={{ fontSize: 11, fontWeight: 700, color: total > 0 ? "#16a34a" : "#dc2626" }}>{total > 0 ? total.toLocaleString() : "Out"}</span> : <span style={{ color: "#94a3b8" }}>...</span>}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600 }}>{s && s.bestPrice ? s.bestPrice : "--"}</td>
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, animation: "fadeUp 0.25s ease" }}>
        <div style={{ maxWidth: "75%", padding: "11px 16px", borderRadius: "18px 18px 4px 18px", background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", fontSize: 14, lineHeight: 1.6 }}>
          {msg.content}
        </div>
      </div>
    );
  }
  var d = msg.data;
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, animation: "fadeUp 0.3s ease", alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}><PTLogo size={20} /></div>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>{d.category} - {d.results.length} results</div>
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
          <button onClick={function() { onNewChat(); onClose(); }} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
            + New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {sessions.length === 0 && <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "20px 0" }}>No chats yet</div>}
          {sessions.map(function(session) {
            var isActive = session.id === currentSessionId;
            return (
              <div key={session.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <button onClick={function() { onSelectSession(session); onClose(); }} style={{ flex: 1, padding: "8px 10px", borderRadius: 7, background: isActive ? "#1e293b" : "none", border: "none", color: isActive ? "#e2e8f0" : "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.title || "New Chat"}
                </button>
                <button onClick={function() { onDeleteSession(session.id); }} style={{ padding: "4px 6px", borderRadius: 5, background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}>x</button>
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
// USAGE COUNTER
// =============================================
function getGuestUsage() {
  try {
    var data = JSON.parse(localStorage.getItem("pt_usage") || "{}");
    var today = new Date().toDateString();
    if (data.date !== today) return { count: 0, date: today };
    return data;
  } catch (e) { return { count: 0, date: new Date().toDateString() }; }
}

function incrementGuestUsage() {
  var usage = getGuestUsage();
  usage.count = (usage.count || 0) + 1;
  usage.date = new Date().toDateString();
  localStorage.setItem("pt_usage", JSON.stringify(usage));
  return usage.count;
}

// =============================================
// MAIN APP
// =============================================
var SUGGESTIONS = [
  "I need a 100V 30A MOSFET for a motor driver",
  "Find alternatives for IRF540N",
  "Design a 24V 10A BLDC motor controller BOM",
  "What is the difference between GaN and SiC MOSFETs?",
  "Best topology for 400W PFC stage?",
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
  var [showAuth, setShowAuth] = useState(false);
  var [showUpgrade, setShowUpgrade] = useState(false);
  var [authMode, setAuthMode] = useState("default");
  var [guestCount, setGuestCount] = useState(0);
  var [dailyCount, setDailyCount] = useState(0);
  var [userPlan, setUserPlan] = useState("free");
  var bottomRef = useRef(null);
  var inputRef = useRef(null);
  var fileInputRef = useRef(null);
  var retryRef = useRef(0);

  // Load auth on mount
  useEffect(function() {
    var saved = localStorage.getItem("pt_auth");
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        if (parsed && parsed.access_token && parsed.expires_at && Date.now() < parsed.expires_at * 1000) {
          setAuth(parsed);
        } else {
          localStorage.removeItem("pt_auth");
        }
      } catch (e) { localStorage.removeItem("pt_auth"); }
    }
    var usage = getGuestUsage();
    setGuestCount(usage.count || 0);
    // Load plan from localStorage
    try {
      var savedPlan = JSON.parse(localStorage.getItem("pt_plan") || "{}");
      if (savedPlan.plan === "paid") setUserPlan("paid");
    } catch (e) {}
  }, []);

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
    setShowAuth(false);
    setShowUpgrade(false);
    // Reset guest counter after login
    localStorage.removeItem("pt_usage");
    setGuestCount(0);
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
    var res = await getMessages(session.id, auth.access_token);
    if (res.ok && res.data) {
      setMessages(res.data.map(function(m) { return { role: m.role, content: m.content, data: m.data, id: m.id }; }));
    }
  }

  function startNewChat() {
    setMessages([]);
    setCurrentSessionId(null);
    setSidebarOpen(false);
    setTimeout(function() { inputRef.current && inputRef.current.focus(); }, 100);
  }

  function addMessage(msg) {
    setMessages(function(prev) { return [...prev, msg]; });
  }

  // Check if user can send message
  function checkLimit() {
    if (auth) {
      // Logged in - check server-side limit (tracked by backend)
      return true; // backend enforces 50/day for free users
    }
    var usage = getGuestUsage();
    var count = usage.count || 0;
    if (count >= GUEST_LIMIT) {
      setAuthMode("limit");
      setShowAuth(true);
      return false;
    }
    return true;
  }

  // Handle Razorpay payment
  async function handlePayment(plan) {
    var user = auth ? (auth.user || auth) : null;
    if (!user) { setShowUpgrade(false); setShowAuth(true); return; }
    setShowUpgrade(false);
    await openRazorpayCheckout(plan, user.id, user.email, async function(paidPlan) {
      setUserPlan("paid");
      // Store plan in localStorage
      localStorage.setItem("pt_plan", JSON.stringify({ plan: "paid", userId: user.id, updatedAt: Date.now() }));
      alert("Payment successful! You now have unlimited access to PartTensor.");
    });
  }

  async function sendMessage(text) {
    var q = (text || input).trim();
    if (!q) return;
    if (!checkLimit()) return;
    setInput("");

    var userMsg = { role: "user", content: q, id: Date.now() };
    addMessage(userMsg);
    setLoading(true);

    // Increment guest counter
    if (!auth) {
      var newCount = incrementGuestUsage();
      setGuestCount(newCount);
    }

    var history = messages.map(function(m) { return { role: m.role, content: m.content || "" }; });

    // Create session if logged in and first message
    var sessionId = currentSessionId;
    if (!sessionId && auth) {
      var title = q.length > 40 ? q.substring(0, 40) + "..." : q;
      var user = auth.user || auth;
      var sessionRes = await createSession(user.id, title, auth.access_token);
      if (sessionRes.ok && sessionRes.data && sessionRes.data[0]) {
        sessionId = sessionRes.data[0].id;
        setCurrentSessionId(sessionId);
        await loadSessions();
      }
    }

    // Save user message
    if (sessionId && auth) {
      var user2 = auth.user || auth;
      await saveMessage(sessionId, user2.id, "user", q, null, auth.access_token);
    }

    try {
      var res = await fetch(BACKEND_URL + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          history: history,
          sessionId: SESSION_ID,
          userId: auth ? (auth.user && auth.user.id || auth.id) : null,
          plan: userPlan === "paid" ? "paid" : auth ? "free" : "guest",
        }),
      });

      var data = await res.json();

      if (data.error) {
        // Check if limit error from backend
        if (data.limitReached) {
          setLoading(false);
          if (auth) {
            setShowUpgrade(true);
          } else {
            setAuthMode("limit");
            setShowAuth(true);
          }
          return;
        }
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

      // Save AI message if logged in
      if (sessionId && auth) {
        var user3 = auth.user || auth;
        await saveMessage(sessionId, user3.id, "assistant", data.text || "", data, auth.access_token);
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
    if (!checkLimit()) return;
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

  var user = auth ? (auth.user || auth) : null;
  var isEmpty = messages.length === 0;
  var limit = auth ? FREE_LIMIT : GUEST_LIMIT;
  var used = guestCount;
  var remaining = Math.max(0, limit - used);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
      `}</style>

      {showAuth && <AuthModal mode={authMode} onAuth={handleAuth} onClose={function() { setShowAuth(false); setAuthMode("default"); }} />}
      {showUpgrade && <UpgradeModal onClose={function() { setShowUpgrade(false); }} onSignIn={function() { setShowUpgrade(false); setShowAuth(true); }} onPay={handlePayment} />}

      {auth && (
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
      )}

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {auth && <button onClick={function() { setSidebarOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#64748b", fontSize: 20 }}>x</button>}
          <PTLogo size={28} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>Part<span style={{ color: "#2563eb" }}>Tensor</span></div>
            <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 600, letterSpacing: 1.2 }}>HARDWARE AI</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Usage indicator */}
          {!auth && guestCount > 0 && (
            <div style={{ fontSize: 11, color: guestCount >= GUEST_LIMIT - 2 ? "#dc2626" : "#64748b", background: guestCount >= GUEST_LIMIT - 2 ? "#fef2f2" : "#f8fafc", padding: "4px 10px", borderRadius: 99, border: "1px solid " + (guestCount >= GUEST_LIMIT - 2 ? "#fecaca" : "#e2e8f0") }}>
              {GUEST_LIMIT - guestCount} free left
            </div>
          )}
          {auth && (
            <div style={{ fontSize: 11, color: "#64748b", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user && user.email}</div>
          )}
          {!auth ? (
            <button onClick={function() { setAuthMode("default"); setShowAuth(true); }} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Sign In
            </button>
          ) : (
            <button onClick={function() { setShowUpgrade(true); }} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", maxWidth: 820, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", animation: "fadeUp 0.4s ease" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 8px 32px rgba(29,78,216,0.25)" }}>
              <PTLogo size={40} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: -0.8, textAlign: "center" }}>Hardware AI for Engineers</h1>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 12, textAlign: "center", maxWidth: 400, lineHeight: 1.7 }}>Find components, check live stock, generate BOMs, and get circuit design help.</p>
            {!auth && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 28, background: "#f8fafc", padding: "8px 16px", borderRadius: 99, border: "1px solid #e2e8f0" }}>
                {GUEST_LIMIT} free messages/day - <button onClick={function() { setShowAuth(true); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>Sign in for {FREE_LIMIT}/day</button>
              </div>
            )}
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

        {/* Soft nudge when approaching limit */}
        {!auth && guestCount === GUEST_LIMIT - 2 && (
          <div style={{ textAlign: "center", padding: "12px 20px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#92400e" }}>
            2 free messages remaining today.
            <button onClick={function() { setShowAuth(true); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, marginLeft: 6, fontSize: 13 }}>
              Sign in for {FREE_LIMIT}/day free
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ textAlign: "center", padding: "4px 16px", fontSize: 10, color: "#94a3b8" }}>
        AI results may be inaccurate - Always verify against official datasheets before ordering
      </div>

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
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>Shift+Enter for new line - upload BOM with DS</div>
      </div>
    </div>
  );
}
