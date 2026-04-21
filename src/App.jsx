import { useState, useRef, useEffect } from "react";

const BACKEND_URL = "https://parttensor-backend.onrender.com";
const SUPABASE_URL = "https://pchmgfmrdsnuhijbdgys.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaG1nZm1yZHNudWhpamJkZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5NzM0NjQsImV4cCI6MjA2MDU0OTQ2NH0";
const RAZORPAY_KEY_ID = "rzp_test_REPLACE_WITH_YOUR_KEY";

var GUEST_LIMIT = 5;
var FREE_LIMIT = 20;

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
  } catch (e) { return { ok: false, status: 0, data: null }; }
}

// Auth functions
async function signUpWithPassword(email, password) {
  return await supaFetch("/auth/v1/signup", "POST", {
    email: email,
    password: password,
    gotrue_meta_security: {}
  });
}

async function signInWithPassword(email, password) {
  return await supaFetch("/auth/v1/token?grant_type=password", "POST", {
    email: email,
    password: password,
    gotrue_meta_security: {}
  });
}

async function sendOTP(email) {
  return await supaFetch("/auth/v1/otp", "POST", {
    email: email,
    create_user: false,
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

async function refreshSession(refreshToken) {
  return await supaFetch("/auth/v1/token?grant_type=refresh_token", "POST", {
    refresh_token: refreshToken
  });
}

async function checkUserExists(email) {
  // Try signing in with a wrong password - if error is "Invalid credentials" user exists
  // If error is "Email not confirmed" user exists but not verified
  // We use OTP send - if user exists it sends, if not it creates
  return await supaFetch("/auth/v1/otp", "POST", {
    email: email,
    create_user: false,
    gotrue_meta_security: {}
  });
}

function getGoogleAuthURL() {
  return SUPABASE_URL + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent("https://www.parttensor.com");
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

var SESSION_ID = "s_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();

function trackClick(action, partNumber, manufacturer, query, position, componentType, rv, rc) {
  fetch(BACKEND_URL + "/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION_ID, action: action, partNumber: partNumber || "", manufacturer: manufacturer || "", query: query || "", position: position || null, componentType: componentType || "", requiredVoltage: rv || null, requiredCurrent: rc || null }),
  }).catch(function() {});
}

function submitFeedback(partNumber, manufacturer, query, feedback, componentType) {
  return fetch(BACKEND_URL + "/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partNumber: partNumber, manufacturer: manufacturer || "", query: query || "", feedback: feedback, sessionId: SESSION_ID, componentType: componentType || "" }),
  }).catch(function() {});
}

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

async function openRazorpayCheckout(plan, userId, email, onSuccess) {
  var loaded = await loadRazorpay();
  if (!loaded) { alert("Payment gateway failed to load. Please try again."); return; }
  try {
    var res = await fetch(BACKEND_URL + "/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey: planKey, userId: userId, email: email }),
    });
    var orderData = await res.json();
    if (orderData.error) { alert("Could not create order: " + orderData.error); return; }
    var options = {
      key: RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: "INR",
      name: "PartTensor",
      description: plan === "yearly" ? "Pro Annual - Unlimited" : "Pro Monthly - Unlimited",
      order_id: orderData.orderId,
      prefill: { email: email || "" },
      theme: { color: "#2563eb" },
      handler: async function(response) {
        var verifyRes = await fetch(BACKEND_URL + "/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, userId: userId, planKey: planKey }),
        });
        var verifyData = await verifyRes.json();
        if (verifyData.success) { onSuccess && onSuccess(plan); }
        else { alert("Payment verification failed. Please contact support."); }
      },
    };
    var rzp = new window.Razorpay(options);
    rzp.open();
  } catch (e) { alert("Payment error: " + e.message); }
}

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
// Sign In: Email + Password (returning users)
// Sign Up: Email + Password + OTP verification
// Google: One click
// =============================================
function AuthModal({ mode, onAuth, onClose }) {
  var [tab, setTab] = useState("signin");
  var [email, setEmail] = useState("");
  var [password, setPassword] = useState("");
  var [confirmPassword, setConfirmPassword] = useState("");
  var [otp, setOtp] = useState("");
  var [step, setStep] = useState("form"); // form | otp
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [showPassword, setShowPassword] = useState(false);

  function resetForm() {
    setEmail(""); setPassword(""); setConfirmPassword(""); setOtp("");
    setStep("form"); setError(""); setLoading(false);
  }

  function switchTab(t) {
    setTab(t); resetForm();
  }

  // SIGN IN with password
  async function handleSignIn(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) { setError("Please enter a valid email"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    var res = await signInWithPassword(email, password);
    setLoading(false);
    console.log("Sign in response:", res.status, JSON.stringify(res.data));
    if (res.ok && res.data && res.data.access_token) {
      onAuth(res.data);
    } else {
      var errMsg = "Invalid email or password";
      if (res.data && res.data.error_description) errMsg = res.data.error_description;
      else if (res.data && res.data.msg) errMsg = res.data.msg;
      else if (res.data && res.data.message) errMsg = res.data.message;
      setError(errMsg);
    }
  }

  // SIGN UP - step 1: create account
  async function handleSignUp(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) { setError("Please enter a valid email"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    var res = await signUpWithPassword(email, password);
    console.log("Sign up response:", res.status, JSON.stringify(res.data));
    if (res.ok && res.data) {
      // Send OTP for email verification
      var otpRes = await sendOTP(email);
      setLoading(false);
      console.log("OTP send response:", otpRes.status, JSON.stringify(otpRes.data));
      if (otpRes.ok || otpRes.status === 200 || otpRes.status === 201) {
        setStep("otp");
      } else {
        // Account created, OTP failed - try to sign in directly
        var signinRes = await signInWithPassword(email, password);
        if (signinRes.ok && signinRes.data && signinRes.data.access_token) {
          onAuth(signinRes.data);
        } else {
          setError("Account created! Please sign in.");
          setTab("signin"); setStep("form");
        }
      }
    } else {
      setLoading(false);
      var signUpErr = "Could not create account";
      if (res.data && res.data.msg) signUpErr = res.data.msg;
      else if (res.data && res.data.message) signUpErr = res.data.message;
      else if (res.data && res.data.error_description) signUpErr = res.data.error_description;
      // User already exists
      if (signUpErr.toLowerCase().includes("already") || signUpErr.toLowerCase().includes("registered") || res.status === 422) {
        setError("Email already registered. Please sign in instead.");
        setTab("signin"); setStep("form");
      } else {
        setError(signUpErr);
      }
    }
  }

  // VERIFY OTP after signup
  async function handleVerifyOTP(e) {
    e.preventDefault();
    if (!otp || otp.length < 4) { setError("Please enter the verification code"); return; }
    setLoading(true); setError("");
    var res = await verifyOTP(email, otp);
    setLoading(false);
    console.log("Verify OTP response:", res.status, JSON.stringify(res.data));
    if (res.ok && res.data && res.data.access_token) {
      onAuth(res.data);
    } else {
      // OTP verified but need to sign in with password
      var signinRes = await signInWithPassword(email, password);
      if (signinRes.ok && signinRes.data && signinRes.data.access_token) {
        onAuth(signinRes.data);
      } else {
        var errMsg = "Invalid or expired code. Please try again.";
        if (res.data && res.data.msg) errMsg = res.data.msg;
        setError(errMsg);
      }
    }
  }

  // FORGOT PASSWORD
  async function handleForgotPassword() {
    if (!email || !email.includes("@")) { setError("Enter your email first"); return; }
    setLoading(true);
    await supaFetch("/auth/v1/recover", "POST", { email: email });
    setLoading(false);
    setError("Password reset email sent! Check your inbox.");
  }

  function getGoogleAuthURL() {
  return SUPABASE_URL + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent("https://www.parttensor.com");
}


  var inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", color: "#0f172a", background: "#f8fafc", fontFamily: "inherit" };
  var btnStyle = { width: "100%", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  var labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PTLogo size={32} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Part<span style={{ color: "#2563eb" }}>Tensor</span></div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, letterSpacing: 1 }}>HARDWARE AI</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer" }}>x</button>
        </div>

        {/* Limit warning */}
        {mode === "limit" && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#92400e" }}>
            You have used your {GUEST_LIMIT} free messages today. Sign in for {FREE_LIMIT}/day free, or upgrade for unlimited.
          </div>
        )}

        {/* OTP verification step (after signup) */}
        {step === "otp" ? (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>Email</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Verify your email</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Code sent to <strong>{email}</strong></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Enter verification code</label>
              <input type="text" value={otp} onChange={function(e) { setOtp(e.target.value.replace(/[^0-9]/g, "")); setError(""); }} placeholder="00000000" maxLength={8} autoFocus style={Object.assign({}, inputStyle, { fontSize: 28, fontWeight: 800, letterSpacing: 8, textAlign: "center", fontFamily: "'DM Mono', monospace" })} />
            </div>
            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>{error}</div>}
            <button type="submit" disabled={loading} style={Object.assign({}, btnStyle, { opacity: loading ? 0.7 : 1 })}>
              {loading ? "Verifying..." : "Verify and Sign In"}
            </button>
            <button type="button" onClick={function() { setStep("form"); setOtp(""); setError(""); }} style={{ width: "100%", padding: "9px", borderRadius: 10, background: "none", color: "#64748b", border: "none", fontSize: 13, cursor: "pointer", marginTop: 6 }}>
              Back
            </button>
          </form>
        ) : (
          <div>
            {/* Google login */}
            <button onClick={handleGoogleLogin} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#fff", border: "1.5px solid #e2e8f0", color: "#0f172a", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, fontFamily: "inherit" }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>or use email</span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 20 }}>
              <button onClick={function() { switchTab("signin"); }} style={{ flex: 1, padding: "8px", borderRadius: 8, background: tab === "signin" ? "#fff" : "none", border: "none", fontWeight: tab === "signin" ? 700 : 500, color: tab === "signin" ? "#0f172a" : "#64748b", cursor: "pointer", fontSize: 14, fontFamily: "inherit", boxShadow: tab === "signin" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                Sign In
              </button>
              <button onClick={function() { switchTab("signup"); }} style={{ flex: 1, padding: "8px", borderRadius: 8, background: tab === "signup" ? "#fff" : "none", border: "none", fontWeight: tab === "signup" ? 700 : 500, color: tab === "signup" ? "#0f172a" : "#64748b", cursor: "pointer", fontSize: 14, fontFamily: "inherit", boxShadow: tab === "signup" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                Create Account
              </button>
            </div>

            {/* SIGN IN FORM */}
            {tab === "signin" && (
              <form onSubmit={handleSignIn}>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={email} onChange={function(e) { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" autoFocus style={inputStyle} />
                </div>
                <div style={{ marginBottom: 6 }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={function(e) { setPassword(e.target.value); setError(""); }} placeholder="Your password" style={Object.assign({}, inputStyle, { paddingRight: 44 })} />
                    <button type="button" onClick={function() { setShowPassword(!showPassword); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13 }}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: "right", marginBottom: 16 }}>
                  <button type="button" onClick={handleForgotPassword} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Forgot password?
                  </button>
                </div>
                {error && <div style={{ color: error.includes("sent") ? "#16a34a" : "#ef4444", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: error.includes("sent") ? "#f0fdf4" : "#fef2f2", borderRadius: 8 }}>{error}</div>}
                <button type="submit" disabled={loading} style={Object.assign({}, btnStyle, { opacity: loading ? 0.7 : 1 })}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
                <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#94a3b8" }}>
                  No account?
                  <button type="button" onClick={function() { switchTab("signup"); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, marginLeft: 4, fontSize: 13 }}>Create one</button>
                </div>
              </form>
            )}

            {/* SIGN UP FORM */}
            {tab === "signup" && (
              <form onSubmit={handleSignUp}>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={email} onChange={function(e) { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" autoFocus style={inputStyle} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={function(e) { setPassword(e.target.value); setError(""); }} placeholder="Min 6 characters" style={Object.assign({}, inputStyle, { paddingRight: 44 })} />
                    <button type="button" onClick={function() { setShowPassword(!showPassword); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13 }}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={function(e) { setConfirmPassword(e.target.value); setError(""); }} placeholder="Repeat password" style={inputStyle} />
                </div>
                {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>{error}</div>}
                <button type="submit" disabled={loading} style={Object.assign({}, btnStyle, { opacity: loading ? 0.7 : 1 })}>
                  {loading ? "Creating account..." : "Create Account"}
                </button>
                <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 1.5 }}>
                  A verification code will be sent to your email.
                </div>
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
                  Already have an account?
                  <button type="button" onClick={function() { switchTab("signin"); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, marginLeft: 4, fontSize: 13 }}>Sign in</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// UPGRADE MODAL
// =============================================
function UpgradeModal({ onClose, onSignIn, onPay }) {
  var [billing, setBilling] = useState("monthly");
  var prices = {
    pro:  { monthly: "Rs 199", yearly: "Rs 1,799", monthlyKey: "pro_monthly", yearlyKey: "pro_yearly", save: "Save 25%" },
    team: { monthly: "Rs 999", yearly: "Rs 8,999", monthlyKey: "team_monthly", yearlyKey: "team_yearly", save: "Save 25%" },
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Upgrade PartTensor</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer" }}>x</button>
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>You have reached your daily limit. Upgrade for unlimited access.</div>

        {/* Billing toggle */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content" }}>
          <button onClick={function() { setBilling("monthly"); }} style={{ padding: "7px 20px", borderRadius: 8, background: billing === "monthly" ? "#fff" : "none", border: "none", fontWeight: billing === "monthly" ? 700 : 500, color: billing === "monthly" ? "#0f172a" : "#64748b", cursor: "pointer", fontSize: 13 }}>Monthly</button>
          <button onClick={function() { setBilling("yearly"); }} style={{ padding: "7px 20px", borderRadius: 8, background: billing === "yearly" ? "#fff" : "none", border: "none", fontWeight: billing === "yearly" ? 700 : 500, color: billing === "yearly" ? "#0f172a" : "#64748b", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            Annual <span style={{ fontSize: 10, background: "#dcfce7", color: "#16a34a", padding: "2px 6px", borderRadius: 99, fontWeight: 700 }}>Save 25%</span>
          </button>
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>

          {/* Free */}
          <div style={{ padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Free</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Rs 0</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>forever</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
              <div>5 searches/day (guest)</div>
              <div>20 searches/day (account)</div>
              <div>Part search + stock</div>
              <div style={{ color: "#94a3b8" }}>No BOM generation</div>
              <div style={{ color: "#94a3b8" }}>No Excel upload</div>
            </div>
          </div>

          {/* Pro */}
          <div style={{ padding: "16px", borderRadius: 12, border: "2px solid #2563eb", background: "#eff6ff", position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#2563eb", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>MOST POPULAR</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>Pro Individual</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{billing === "monthly" ? prices.pro.monthly : prices.pro.yearly}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>per {billing === "monthly" ? "month" : "year"}</div>
            <div style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.7, marginBottom: 14 }}>
              <div>Unlimited searches</div>
              <div>BOM generation</div>
              <div>Excel BOM upload</div>
              <div>Chat history</div>
              <div>Priority support</div>
            </div>
            <button onClick={function() { onPay(billing === "monthly" ? prices.pro.monthlyKey : prices.pro.yearlyKey); }} style={{ width: "100%", padding: "9px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Get Pro
            </button>
          </div>

          {/* Team */}
          <div style={{ padding: "16px", borderRadius: 12, border: "2px solid #7c3aed", background: "#faf5ff", position: "relative" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>Pro Team</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{billing === "monthly" ? prices.team.monthly : prices.team.yearly}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>per {billing === "monthly" ? "month" : "year"}</div>
            <div style={{ fontSize: 12, color: "#581c87", lineHeight: 1.7, marginBottom: 14 }}>
              <div>Everything in Pro</div>
              <div>5 seats included</div>
              <div>Team BOM library</div>
              <div>Admin dashboard</div>
              <div>Priority support</div>
            </div>
            <button onClick={function() { onPay(billing === "monthly" ? prices.team.monthlyKey : prices.team.yearlyKey); }} style={{ width: "100%", padding: "9px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Get Team
            </button>
          </div>

          {/* Enterprise */}
          <div style={{ padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#0f172a" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>Enterprise</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Custom</div>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>contact us</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, marginBottom: 14 }}>
              <div>Unlimited seats</div>
              <div>REST API access</div>
              <div>Custom integrations</div>
              <div>Dedicated support</div>
              <div>SLA guarantee</div>
            </div>
            <button onClick={function() { window.open("mailto:hello@parttensor.com?subject=Enterprise Plan Inquiry", "_blank"); onClose(); }} style={{ width: "100%", padding: "9px", borderRadius: 8, background: "#1e293b", color: "#60a5fa", border: "1px solid #334155", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Contact Us
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
          Not ready?
          <button onClick={onSignIn} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, marginLeft: 4, fontSize: 13 }}>Sign in for 20 free/day</button>
        </div>
      </div>
    </div>
  );
}

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
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }} onClick={function(e) { e.stopPropagation(); }}>
      <span style={{ fontSize: 11, color: "#94a3b8" }}>Helpful?</span>
      <button onClick={function() { handleFeedback("good"); }} disabled={!!voted || submitting} style={{ padding: "2px 10px", borderRadius: 99, border: "1px solid " + (voted === "good" ? "#16a34a" : "#e2e8f0"), background: voted === "good" ? "#f0fdf4" : "#fff", color: voted === "good" ? "#16a34a" : "#64748b", fontSize: 12, cursor: voted ? "default" : "pointer", fontWeight: 600 }}>Yes</button>
      <button onClick={function() { handleFeedback("bad"); }} disabled={!!voted || submitting} style={{ padding: "2px 10px", borderRadius: 99, border: "1px solid " + (voted === "bad" ? "#dc2626" : "#e2e8f0"), background: voted === "bad" ? "#fef2f2" : "#fff", color: voted === "bad" ? "#dc2626" : "#64748b", fontSize: 12, cursor: voted ? "default" : "pointer", fontWeight: 600 }}>No</button>
      {voted && <span style={{ fontSize: 11, color: "#94a3b8" }}>Thanks!</span>}
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
      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
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
  var hasStock = Object.keys(stockData || {}).some(function(k) { return stockData[k] && stockData[k].totalStock !== undefined; });
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
        <div style={{ maxWidth: "75%", padding: "11px 16px", borderRadius: "18px 18px 4px 18px", background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", fontSize: 14, lineHeight: 1.6 }}>{msg.content}</div>
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
              if (line.startsWith("- ")) return <div key={i} style={{ paddingLeft: 12, marginBottom: 2, display: "flex", gap: 8 }}><span style={{ color: "#2563eb" }}>{">"}</span><span>{line.slice(2)}</span></div>;
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
  var [userPlan, setUserPlan] = useState("free");
  var bottomRef = useRef(null);
  var inputRef = useRef(null);
  var fileInputRef = useRef(null);
  var retryRef = useRef(0);

  // Handle Google OAuth callback
  useEffect(function() {
    var hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      var params = new URLSearchParams(hash.substring(1));
      var accessToken = params.get("access_token");
      var expiresAt = params.get("expires_at");
      if (accessToken) {
        var authData = {
          access_token: accessToken,
          refresh_token: params.get("refresh_token") || "",
          expires_at: parseInt(expiresAt) || Math.floor(Date.now() / 1000) + 604800,
        };
        supaFetch("/auth/v1/user", "GET", null, accessToken).then(function(res) {
          if (res.ok && res.data) {
            authData.user = res.data;
            localStorage.setItem("pt_auth", JSON.stringify(authData));
            setAuth(authData);
            window.history.replaceState({}, document.title, "/");
          }
        });
      }
    }
  }, []);

  // Load auth - with token refresh for remember me
  useEffect(function() {
    var saved = localStorage.getItem("pt_auth");
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        if (parsed && parsed.access_token) {
          if (parsed.expires_at && Date.now() < parsed.expires_at * 1000) {
            setAuth(parsed);
          } else if (parsed.refresh_token) {
            // Token expired - refresh it silently
            refreshSession(parsed.refresh_token).then(function(res) {
              if (res.ok && res.data && res.data.access_token) {
                var newAuth = Object.assign({}, parsed, res.data);
                // Set expires_at to 7 days from now
                newAuth.expires_at = Math.floor(Date.now() / 1000) + 604800;
                localStorage.setItem("pt_auth", JSON.stringify(newAuth));
                setAuth(newAuth);
              } else {
                localStorage.removeItem("pt_auth");
              }
            });
          } else {
            localStorage.removeItem("pt_auth");
          }
        }
      } catch (e) { localStorage.removeItem("pt_auth"); }
    }
    var usage = getGuestUsage();
    setGuestCount(usage.count || 0);
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
    // Set long expiry for remember me (7 days)
    if (authData.expires_in) {
      authData.expires_at = Math.floor(Date.now() / 1000) + 604800;
    }
    localStorage.setItem("pt_auth", JSON.stringify(authData));
    setAuth(authData);
    setShowAuth(false);
    setShowUpgrade(false);
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
    setUserPlan("free");
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

  function checkLimit() {
    if (userPlan === "paid") return true;
    if (auth) return true;
    var usage = getGuestUsage();
    if ((usage.count || 0) >= GUEST_LIMIT) {
      setAuthMode("limit");
      setShowAuth(true);
      return false;
    }
    return true;
  }

  async function handlePayment(planKey) {
    var user = auth ? (auth.user || auth) : null;
    if (!user) { setShowUpgrade(false); setShowAuth(true); return; }
    setShowUpgrade(false);
    var planName = planKey && planKey.startsWith("team") ? "team" : "pro";
    await openRazorpayCheckout(planKey, user.id, user.email, function() {
      setUserPlan(planName);
      localStorage.setItem("pt_plan", JSON.stringify({ plan: planName, userId: user.id, updatedAt: Date.now() }));
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
    if (!auth) {
      var newCount = incrementGuestUsage();
      setGuestCount(newCount);
    }
    var history = messages.map(function(m) { return { role: m.role, content: m.content || "" }; });
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
        if (data.limitReached) {
          setLoading(false);
          if (auth) { setShowUpgrade(true); } else { setAuthMode("limit"); setShowAuth(true); }
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
        addMessage({ role: "assistant", content: "Your BOM has been enriched with alternatives and live stock data. Download started.", id: Date.now() });
      } else {
        var d2 = await res.json();
        addMessage({ role: "assistant", content: d2.error ? "Error: " + d2.error : (d2.text || "Done!"), data: d2, id: Date.now() });
      }
    } catch (err) {
      addMessage({ role: "assistant", content: "Failed to process file. Please try again.", id: Date.now() });
    }
    setLoading(false);
    e.target.value = "";
  }

  var user = auth ? (auth.user || auth) : null;
  var isEmpty = messages.length === 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
      `}</style>

      {showAuth && <AuthModal mode={authMode} onAuth={handleAuth} onClose={function() { setShowAuth(false); setAuthMode("default"); }} />}
      {showUpgrade && <UpgradeModal onClose={function() { setShowUpgrade(false); }} onSignIn={function() { setShowUpgrade(false); setShowAuth(true); }} onPay={handlePayment} />}

      {auth && (
        <Sidebar sessions={sessions} currentSessionId={currentSessionId} onSelectSession={handleSelectSession} onNewChat={startNewChat}
          onDeleteSession={async function(id) {
            await deleteSession(id, auth.access_token);
            if (id === currentSessionId) { setMessages([]); setCurrentSessionId(null); }
            await loadSessions();
          }}
          user={user} onSignOut={handleSignOut} open={sidebarOpen} onClose={function() { setSidebarOpen(false); }}
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
          {!auth && guestCount > 0 && (
            <div style={{ fontSize: 11, color: guestCount >= GUEST_LIMIT - 2 ? "#dc2626" : "#64748b", background: guestCount >= GUEST_LIMIT - 2 ? "#fef2f2" : "#f8fafc", padding: "4px 10px", borderRadius: 99, border: "1px solid " + (guestCount >= GUEST_LIMIT - 2 ? "#fecaca" : "#e2e8f0") }}>
              {GUEST_LIMIT - guestCount} free left
            </div>
          )}
          {auth && <div style={{ fontSize: 11, color: "#64748b", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user && user.email}</div>}
          {(userPlan === "pro" || userPlan === "paid") && <div style={{ fontSize: 11, color: "#2563eb", background: "#eff6ff", padding: "3px 10px", borderRadius: 99, fontWeight: 700, border: "1px solid #bfdbfe" }}>PRO</div>}
          {userPlan === "team" && <div style={{ fontSize: 11, color: "#7c3aed", background: "#faf5ff", padding: "3px 10px", borderRadius: 99, fontWeight: 700, border: "1px solid #e9d5ff" }}>TEAM</div>}
          {userPlan === "enterprise" && <div style={{ fontSize: 11, color: "#fff", background: "#0f172a", padding: "3px 10px", borderRadius: 99, fontWeight: 700 }}>ENT</div>}
          {!auth ? (
            <button onClick={function() { setAuthMode("default"); setShowAuth(true); }} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Sign In</button>
          ) : (userPlan === "free" || userPlan === "guest" || !userPlan) ? (
            <button onClick={function() { setShowUpgrade(true); }} style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Upgrade</button>
          ) : null}
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
                {GUEST_LIMIT} free messages/day
                <button onClick={function() { setShowAuth(true); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, marginLeft: 6, fontSize: 12 }}>Sign in for {FREE_LIMIT}/day</button>
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
        {!auth && guestCount === GUEST_LIMIT - 2 && (
          <div style={{ textAlign: "center", padding: "12px 20px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#92400e" }}>
            2 free messages remaining today.
            <button onClick={function() { setShowAuth(true); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, marginLeft: 6, fontSize: 13 }}>Sign in for {FREE_LIMIT}/day free</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ textAlign: "center", padding: "4px 16px", fontSize: 10, color: "#94a3b8" }}>AI results may be inaccurate - Always verify against official datasheets before ordering</div>

      {/* Input */}
      <div style={{ padding: "12px 20px 16px", background: "#fff", borderTop: "1px solid #e2e8f0", maxWidth: 820, width: "100%", margin: "0 auto", boxSizing: "border-box", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: "none" }} />
          <button onClick={function() { fileInputRef.current && fileInputRef.current.click(); }} disabled={loading} title="Upload BOM" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>BOM</button>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", background: "#f8fafc", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "10px 14px", gap: 8 }}>
            <textarea ref={inputRef} value={input} onChange={function(e) { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ask about parts, circuits, calculations or upload a BOM..." rows={1} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#0f172a", fontSize: 14, lineHeight: 1.6, resize: "none", maxHeight: 120, overflowY: "auto", fontFamily: "inherit" }} />
            <button onClick={function() { sendMessage(); }} disabled={loading || !input.trim()} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: !input.trim() ? "#e2e8f0" : "linear-gradient(135deg,#1d4ed8,#4f46e5)", border: "none", cursor: !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8L14 2L8 14L7 9L2 8Z" fill={!input.trim() ? "#94a3b8" : "#fff"} /></svg>
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>Shift+Enter for new line - click BOM to upload</div>
      </div>
    </div>
  );
}
