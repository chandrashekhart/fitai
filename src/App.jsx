import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE CONFIG — Replace with your own from Firebase Console
// console.firebase.google.com → Project Settings → Your Apps → SDK setup
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBFPy3jE2RuXEbl9K5uQjQ49q8tcgDM88o",
  authDomain:        "fitai-444ab.firebaseapp.com",
  projectId:         "fitai-444ab",
  storageBucket:     "fitai-444ab.firebasestorage.app",
  messagingSenderId: "988675214775",
  appId:             "1:988675214775:web:af617927ac7dc04a7eac32",
  measurementId:     "G-HC6QPSE57H",
};
// ─────────────────────────────────────────────────────────────────────────────

const callClaude = async (messages, system = "") => {
  const body = { model: "claude-sonnet-4-5", max_tokens: 4000, messages };
  if (system) body.system = system;
  const headers = { "Content-Type": "application/json" };

  try {
    const auth  = await loadFirebase();
    const token = await auth.currentUser?.getIdToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch(e) {
    console.warn("Token fetch failed:", e.message);
  }

  console.log("Calling /api/claude...");
  const res = await fetch("/api/claude", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Response data:", JSON.stringify(data).slice(0, 500));
  return data.content?.[0]?.text || "";
};

// ── Firebase loader (dynamic CDN) ────────────────────────────────────────────
const loadFirebase = () =>
  new Promise((resolve, reject) => {
    if (window.__firebaseAuth) { resolve(window.__firebaseAuth); return; }
    const load = (src) => new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    Promise.all([
      load("https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-app-compat.min.js"),
      load("https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-auth-compat.min.js"),
    ]).then(() => {
      if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
      const auth = window.firebase.auth();
      auth.useDeviceLanguage();
      window.__firebaseAuth = auth;
      resolve(auth);
    }).catch(reject);
  });

const GOALS   = ["Muscle Gain", "Fat Loss", "Endurance", "Maintenance"];
const LEVELS  = ["Beginner", "Intermediate", "Advanced"];
const GENDERS = ["Male", "Female", "Other"];
const DAYS    = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = {
  app:   { minHeight:"100vh", background:"#0f0f0f", color:"#f0f0f0", fontFamily:"'Segoe UI',system-ui,sans-serif" },
  header:{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", padding:"14px 20px", display:"flex", alignItems:"center", gap:"12px", borderBottom:"1px solid #222", flexWrap:"wrap" },
  logo:  { fontSize:"22px", fontWeight:"800", background:"linear-gradient(135deg,#00d4ff,#7b2ff7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  tag:   { fontSize:"11px", background:"#7b2ff722", color:"#a78bfa", border:"1px solid #7b2ff744", borderRadius:"4px", padding:"2px 8px" },
  main:  { maxWidth:"800px", margin:"0 auto", padding:"24px 16px" },
  card:  { background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"16px", padding:"24px", marginBottom:"20px" },
  h2:    { fontSize:"20px", fontWeight:"700", marginBottom:"16px", color:"#fff" },
  label: { display:"block", fontSize:"13px", color:"#aaa", marginBottom:"6px", fontWeight:"500" },
  input: { width:"100%", background:"#111", border:"1px solid #333", borderRadius:"8px", padding:"10px 14px", color:"#fff", fontSize:"14px", outline:"none", boxSizing:"border-box" },
  select:{ width:"100%", background:"#111", border:"1px solid #333", borderRadius:"8px", padding:"10px 14px", color:"#fff", fontSize:"14px", outline:"none", boxSizing:"border-box" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" },
  grid3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px" },
  btn:   { background:"linear-gradient(135deg,#7b2ff7,#00d4ff)", border:"none", borderRadius:"10px", padding:"14px 28px", color:"#fff", fontSize:"15px", fontWeight:"700", cursor:"pointer", width:"100%" },
  btnSm: { background:"#2a2a3a", border:"1px solid #444", borderRadius:"8px", padding:"8px 16px", color:"#ddd", fontSize:"13px", cursor:"pointer" },
  btnGreen: { background:"linear-gradient(135deg,#00c853,#00e676)", border:"none", borderRadius:"10px", padding:"12px 24px", color:"#000", fontSize:"14px", fontWeight:"700", cursor:"pointer" },
  pill:  (a) => ({ background: a ? "linear-gradient(135deg,#7b2ff7,#00d4ff)" : "#222", border: a ? "none" : "1px solid #333", borderRadius:"20px", padding:"8px 16px", color: a ? "#fff" : "#aaa", fontSize:"13px", cursor:"pointer", fontWeight: a ? "600" : "400" }),
  dayCard:(a,d) => ({ background: d ? "#0d2b1a" : a ? "#1a1a3e" : "#1a1a1a", border:`1px solid ${d?"#00c853":a?"#7b2ff7":"#2a2a2a"}`, borderRadius:"12px", padding:"12px", cursor:"pointer", textAlign:"center", transition:"all 0.2s" }),
  badge: (c) => ({ display:"inline-block", background:`${c}22`, color:c, border:`1px solid ${c}44`, borderRadius:"6px", padding:"2px 8px", fontSize:"11px", fontWeight:"600", marginRight:"6px" }),
  progressBar:(p) => ({ height:"6px", background:"#222", borderRadius:"3px", overflow:"hidden", marginBottom:"12px" }),
  progressFill:(p) => ({ height:"100%", width:`${p}%`, background:"linear-gradient(90deg,#7b2ff7,#00d4ff)", borderRadius:"3px", transition:"width 0.4s" }),
  macro: (c) => ({ background:`${c}11`, border:`1px solid ${c}33`, borderRadius:"12px", padding:"16px", textAlign:"center" }),
};

// ── Google Login Screen ───────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  const handleGoogle = async () => {
    setLoading(true); setErr("");
    try {
      const auth     = await loadFirebase();
      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      const result   = await auth.signInWithPopup(provider);
      const u        = result.user;
      onLogin({ uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL });
    } catch (e) {
      if (e.code === "auth/configuration-not-found" || e.code === "auth/invalid-api-key") {
        setErr("⚠️ Firebase not configured yet — replace FIREBASE_CONFIG at the top of the code with your own credentials.");
      } else {
        setErr(e.message || "Sign-in failed. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0f0f0f", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ width:"100%", maxWidth:"420px" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ fontSize:"56px", marginBottom:"12px" }}>🏋️</div>
          <div style={{ fontSize:"36px", fontWeight:"900", background:"linear-gradient(135deg,#00d4ff,#7b2ff7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"8px" }}>FitAI</div>
          <div style={{ fontSize:"15px", color:"#888", lineHeight:"1.5" }}>Your AI-powered personal trainer.<br/>Build strength, track progress, eat smart.</div>
        </div>

        {/* Feature pills */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", justifyContent:"center", marginBottom:"32px" }}>
          {["🤖 AI Workout Plans","📅 Weekly Scheduler","⏱ Rest Timer","🥗 Macro Advisor"].map(f=>(
            <span key={f} style={{ background:"#1a1a2e", border:"1px solid #333", borderRadius:"20px", padding:"6px 14px", fontSize:"12px", color:"#aaa" }}>{f}</span>
          ))}
        </div>

        {/* Sign-in card */}
        <div style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"20px", padding:"32px" }}>
          <div style={{ fontSize:"16px", fontWeight:"700", color:"#fff", marginBottom:"6px", textAlign:"center" }}>Get Started Free</div>
          <div style={{ fontSize:"13px", color:"#666", textAlign:"center", marginBottom:"24px" }}>No passwords. Just sign in with Google.</div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px",
              background: loading ? "#222" : "#fff", border:"none", borderRadius:"12px",
              padding:"14px 20px", cursor: loading ? "not-allowed" : "pointer",
              fontSize:"15px", fontWeight:"600", color:"#111", transition:"all 0.2s",
            }}
          >
            {loading ? (
              <span style={{ color:"#888" }}>Signing in…</span>
            ) : (
              <>
                {/* Google "G" logo */}
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5l-6.3-5.3C29.4 35.3 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.5 5C9.7 39.7 16.4 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.6-2.6 4.8-4.9 6.3l6.3 5.3C40.5 36.2 44 30.6 44 24c0-1.3-.1-2.7-.4-4z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {err && (
            <div style={{ marginTop:"16px", background:"#2a1a1a", border:"1px solid #ff444433", borderRadius:"10px", padding:"12px", fontSize:"13px", color:"#ff8080", lineHeight:"1.5" }}>
              {err}
            </div>
          )}

          <div style={{ marginTop:"20px", fontSize:"11px", color:"#555", textAlign:"center", lineHeight:"1.6" }}>
            By continuing you agree to our Terms of Service.<br/>We never store your passwords.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function Onboarding({ user, onDone }) {
  const [form, setForm] = useState({ goal:"Muscle Gain", level:"Beginner", gender:"Male", age:"", height:"", weight:"", injuries:"" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const generate = async () => {
    if (!form.age || !form.height || !form.weight) { setErr("Please fill age, height and weight."); return; }
    setErr(""); setLoading(true);
    const prompt = `You are a professional strength & conditioning coach. Generate a 7-day progressive overload workout plan in JSON.
User profile: Goal:${form.goal}, Level:${form.level}, Gender:${form.gender}, Age:${form.age}, Height:${form.height}cm, Weight:${form.weight}kg, Injuries:${form.injuries||"None"}
Return ONLY valid JSON, no markdown. Schema:
{"weekSummary":"...","days":[{"day":"Monday","focus":"...","isRest":false,"exercises":[{"name":"...","targetMuscles":["..."],"sets":4,"reps":"8-10","restSeconds":90,"weightGuidance":"...","description":"...","howTo":"..."}]}]}
For rest days: isRest:true, exercises:[].`;
   try {
      const txt  = await callClaude([{role:"user",content:prompt}]);
      console.log("Raw txt:", txt);
      const plan = JSON.parse(txt.replace(/```json|```/g,"").trim());
      onDone(form, plan);
    } catch(e) { 
      console.error("Generate error:", e.message);
      setErr("Failed to generate plan. Please try again."); 
    }
    setLoading(false);
  };

  return (
    <div style={s.main}>
      <div style={s.card}>
        <div style={{ textAlign:"center", marginBottom:"24px" }}>
          <div style={{ fontSize:"36px", marginBottom:"8px" }}>👋</div>
          <div style={{ fontSize:"20px", fontWeight:"800", color:"#fff", marginBottom:"4px" }}>Hi, {user.name.split(" ")[0]}!</div>
          <div style={{ fontSize:"13px", color:"#888" }}>Tell us about yourself to generate your personalized plan</div>
        </div>

        <div style={{ marginBottom:"20px" }}>
          <div style={s.label}>Your Goal</div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {GOALS.map(g=><button key={g} style={s.pill(form.goal===g)} onClick={()=>set("goal",g)}>{g}</button>)}
          </div>
        </div>
        <div style={{ marginBottom:"20px" }}>
          <div style={s.label}>Fitness Level</div>
          <div style={{ display:"flex", gap:"8px" }}>
            {LEVELS.map(l=><button key={l} style={s.pill(form.level===l)} onClick={()=>set("level",l)}>{l}</button>)}
          </div>
        </div>
        <div style={s.grid3}>
          <div><div style={s.label}>Gender</div>
            <select style={s.select} value={form.gender} onChange={e=>set("gender",e.target.value)}>
              {GENDERS.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div><div style={s.label}>Age</div><input style={s.input} type="number" placeholder="e.g. 28" value={form.age} onChange={e=>set("age",e.target.value)}/></div>
          <div><div style={s.label}>Height (cm)</div><input style={s.input} type="number" placeholder="e.g. 175" value={form.height} onChange={e=>set("height",e.target.value)}/></div>
        </div>
        <div style={{...s.grid2, marginTop:"16px"}}>
          <div><div style={s.label}>Weight (kg)</div><input style={s.input} type="number" placeholder="e.g. 75" value={form.weight} onChange={e=>set("weight",e.target.value)}/></div>
          <div><div style={s.label}>Injuries / Limitations</div><input style={s.input} placeholder="e.g. Bad knees" value={form.injuries} onChange={e=>set("injuries",e.target.value)}/></div>
        </div>
        {err && <div style={{color:"#ff4081",fontSize:"13px",marginTop:"12px"}}>{err}</div>}
        <button style={{...s.btn,marginTop:"24px",opacity:loading?0.7:1}} onClick={generate} disabled={loading}>
          {loading ? "🤖 Generating your plan…" : "✨ Generate My AI Plan"}
        </button>
      </div>
    </div>
  );
}

// ── Weekly Plan ───────────────────────────────────────────────────────────────
function WeeklyPlan({ plan, profile, completedDays, onStartDay, onReset }) {
  const [sel, setSel] = useState(null);
  return (
    <div style={s.main}>
      <div style={s.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
          <div style={s.h2}>📅 Weekly Plan</div>
          <button style={s.btnSm} onClick={onReset}>↩ New Plan</button>
        </div>
        <div style={{ fontSize:"13px", color:"#aaa", marginBottom:"20px" }}>{plan.weekSummary}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"8px", marginBottom:"20px" }}>
          {plan.days.map((d,i)=>(
            <div key={i} style={s.dayCard(sel===i,completedDays.includes(i))} onClick={()=>setSel(sel===i?null:i)}>
              <div style={{fontSize:"11px",color:"#888",marginBottom:"4px"}}>{DAYS[i]}</div>
              <div style={{fontSize:"18px",marginBottom:"4px"}}>{completedDays.includes(i)?"✅":d.isRest?"😴":"💪"}</div>
              <div style={{fontSize:"10px",color:"#ccc",lineHeight:"1.3"}}>{d.isRest?"Rest":d.focus.split("/")[0].trim()}</div>
            </div>
          ))}
        </div>
        {sel!==null&&(
          <div style={{background:"#111",borderRadius:"12px",padding:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
              <div>
                <div style={{fontSize:"17px",fontWeight:"700",color:"#fff"}}>{plan.days[sel].day}</div>
                <div style={{fontSize:"13px",color:"#a78bfa"}}>{plan.days[sel].focus}</div>
              </div>
              {!plan.days[sel].isRest&&(
                <button style={s.btnGreen} onClick={()=>onStartDay(sel)}>
                  {completedDays.includes(sel)?"🔁 Redo":"▶ Start"}
                </button>
              )}
            </div>
            {plan.days[sel].isRest
              ? <div style={{color:"#888",fontSize:"14px"}}>Rest day — recover, hydrate, sleep 😴</div>
              : plan.days[sel].exercises.map((ex,j)=>(
                <div key={j} style={{borderBottom:"1px solid #222",paddingBottom:"12px",marginBottom:"12px"}}>
                  <div style={{fontWeight:"600",color:"#fff",marginBottom:"4px"}}>{ex.name}</div>
                  <div style={{marginBottom:"4px"}}>{ex.targetMuscles.map(m=><span key={m} style={s.badge("#a78bfa")}>{m}</span>)}</div>
                  <div style={{fontSize:"13px",color:"#ccc"}}>{ex.sets} sets × {ex.reps} reps · Rest {ex.restSeconds}s · {ex.weightGuidance}</div>
                  <div style={{fontSize:"12px",color:"#888",marginTop:"4px"}}>{ex.description}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rest Timer ────────────────────────────────────────────────────────────────
function RestTimer({ seconds, onDone }) {
  const [rem, setRem]         = useState(seconds);
  const [running, setRunning] = useState(true);
  const ref = useRef();
  useEffect(()=>{
    if (running && rem>0) ref.current = setTimeout(()=>setRem(r=>r-1),1000);
    else if (rem===0) onDone();
    return ()=>clearTimeout(ref.current);
  },[rem,running]);
  const r=60,cx=70,cy=70,circ=2*Math.PI*r;
  const dash = circ*((seconds-rem)/seconds);
  return (
    <div style={{textAlign:"center",padding:"16px 0"}}>
      <div style={{fontSize:"13px",color:"#888",marginBottom:"12px"}}>⏱ Rest Timer</div>
      <svg width="140" height="140" style={{display:"block",margin:"0 auto 12px"}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222" strokeWidth="8"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#7b2ff7" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ-dash}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{transition:"stroke-dashoffset 1s linear"}}/>
        <text x={cx} y={cy+6}  textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold">{rem}</text>
        <text x={cx} y={cy+22} textAnchor="middle" fill="#888" fontSize="11">seconds</text>
      </svg>
      <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
        <button style={s.btnSm} onClick={()=>setRunning(r=>!r)}>{running?"⏸ Pause":"▶ Resume"}</button>
        <button style={s.btnGreen} onClick={onDone}>Skip →</button>
      </div>
    </div>
  );
}

// ── Workout Session ───────────────────────────────────────────────────────────
function WorkoutSession({ day, profile, onComplete }) {
  const exercises = day.exercises;
  const [exIdx,  setExIdx]  = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [phase,  setPhase]  = useState("work");
  const [log,    setLog]    = useState([]);
  const ex       = exercises[exIdx];
  const totalSets= exercises.reduce((a,e)=>a+e.sets,0);
  const pct      = Math.round((log.length/totalSets)*100);

  const finishSet = () => {
    const entry = {exName:ex.name,setNum:setIdx+1};
    const newLog = [...log, entry];
    setLog(newLog);
    if (setIdx+1 < ex.sets || exIdx+1 < exercises.length) setPhase("rest");
    else onComplete(newLog);
  };
  const afterRest = () => {
    if (setIdx+1 < ex.sets) { setSetIdx(s=>s+1); }
    else { setExIdx(i=>i+1); setSetIdx(0); }
    setPhase("work");
  };

  return (
    <div style={s.main}>
      <div style={s.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
          <div style={{fontSize:"13px",color:"#888"}}>Exercise {exIdx+1}/{exercises.length}</div>
          <div style={{fontSize:"13px",color:"#a78bfa"}}>{pct}% done</div>
        </div>
        <div style={s.progressBar(pct)}><div style={s.progressFill(pct)}/></div>
        <div style={{fontSize:"20px",fontWeight:"800",color:"#fff",marginBottom:"4px"}}>{ex.name}</div>
        <div style={{marginBottom:"8px"}}>{ex.targetMuscles.map(m=><span key={m} style={s.badge("#00d4ff")}>{m}</span>)}</div>
        <div style={{fontSize:"13px",color:"#ccc",marginBottom:"12px"}}>{ex.description}</div>
        <div style={{background:"#111",borderRadius:"10px",padding:"14px",marginBottom:"16px"}}>
          <div style={{fontSize:"12px",color:"#888",marginBottom:"6px"}}>📋 How to perform:</div>
          <div style={{fontSize:"13px",color:"#ddd",lineHeight:"1.6"}}>{ex.howTo}</div>
        </div>
        <div style={{display:"flex",gap:"12px",marginBottom:"20px"}}>
          {[["Set",`${setIdx+1}/${ex.sets}`,"#a78bfa"],["Reps",ex.reps,"#00d4ff"],["Load",ex.weightGuidance,"#ffd600"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{flex:1,background:"#111",borderRadius:"10px",padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#888"}}>{lbl}</div>
              <div style={{fontSize:lbl==="Load"?"13px":"22px",fontWeight:"800",color:col}}>{val}</div>
            </div>
          ))}
        </div>
        {phase==="work"
          ? <button style={s.btnGreen} onClick={finishSet}>✅ Set Done</button>
          : <RestTimer seconds={ex.restSeconds} onDone={afterRest}/>
        }
      </div>
    </div>
  );
}

// ── Post-Workout ──────────────────────────────────────────────────────────────
function PostWorkout({ day, profile, log, onBack }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    (async()=>{
      const exList = day.exercises.map(e=>`${e.name}(${e.sets}x${e.reps})`).join(", ");
      const prompt = `Fitness nutritionist. User just finished a workout.
User: ${profile.gender},${profile.age}y,${profile.weight}kg,${profile.height}cm,Goal:${profile.goal}
Workout: ${day.focus} — ${exList}, sets done:${log.length}
Return ONLY valid JSON (no markdown):
{"caloriesBurned":<n>,"durationMinutes":<n>,"intensity":"Low/Medium/High","proteinG":<n>,"carbsG":<n>,"fatG":<n>,"totalCalories":<n>,"advise":"2-3 sentences","recoveryTip":"1 sentence"}`;
      try {
        const txt = await callClaude([{role:"user",content:prompt}]);
        setSummary(JSON.parse(txt.replace(/```json|```/g,"").trim()));
      } catch { setSummary(null); }
      setLoading(false);
    })();
  },[]);

  if (loading) return <div style={{...s.main,textAlign:"center",paddingTop:"60px"}}><div style={{fontSize:"40px",marginBottom:"16px"}}>🤖</div><div style={{color:"#888"}}>Calculating results…</div></div>;

  return (
    <div style={s.main}>
      <div style={s.card}>
        <div style={{textAlign:"center",marginBottom:"24px"}}>
          <div style={{fontSize:"48px",marginBottom:"8px"}}>🎉</div>
          <div style={{fontSize:"22px",fontWeight:"800",color:"#fff"}}>Workout Complete!</div>
          <div style={{fontSize:"14px",color:"#888"}}>{day.focus}</div>
        </div>
        {summary&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"20px"}}>
            {[["🔥 Calories",summary.caloriesBurned,"kcal","#ff6b35"],["⏱ Duration",summary.durationMinutes,"min","#00d4ff"],["⚡ Intensity",summary.intensity,"","#a78bfa"]].map(([lbl,val,sub,col])=>(
              <div key={lbl} style={{background:"#1a1a2e",border:"1px solid #333",borderRadius:"12px",padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:"11px",color:"#888",marginBottom:"4px"}}>{lbl}</div>
                <div style={{fontSize:"22px",fontWeight:"800",color:col}}>{val}</div>
                {sub&&<div style={{fontSize:"11px",color:"#666"}}>{sub}</div>}
              </div>
            ))}
          </div>
          <div style={{...s.card,background:"#111",marginBottom:"16px"}}>
            <div style={{fontSize:"14px",fontWeight:"700",color:"#fff",marginBottom:"14px"}}>🥗 Today's Macro Targets</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"10px"}}>
              {[["Protein",`${summary.proteinG}g`,"#00c853"],["Carbs",`${summary.carbsG}g`,"#00d4ff"],["Fat",`${summary.fatG}g`,"#ffd600"],["Total",`${summary.totalCalories}`,"#ff6b35"]].map(([lbl,val,col])=>(
                <div key={lbl} style={s.macro(col)}>
                  <div style={{fontSize:"11px",color:"#888",marginBottom:"4px"}}>{lbl}</div>
                  <div style={{fontSize:"18px",fontWeight:"800",color:col}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:"#0d2b1a",border:"1px solid #00c85333",borderRadius:"12px",padding:"14px",marginBottom:"12px"}}>
            <div style={{fontSize:"12px",color:"#00c853",fontWeight:"600",marginBottom:"6px"}}>🥩 Nutrition Advice</div>
            <div style={{fontSize:"13px",color:"#ccc",lineHeight:"1.6"}}>{summary.advise}</div>
          </div>
          <div style={{background:"#1a1a2e",border:"1px solid #7b2ff733",borderRadius:"12px",padding:"14px",marginBottom:"20px"}}>
            <div style={{fontSize:"12px",color:"#a78bfa",fontWeight:"600",marginBottom:"6px"}}>💤 Recovery Tip</div>
            <div style={{fontSize:"13px",color:"#ccc"}}>{summary.recoveryTip}</div>
          </div>
        </>}
        <button style={s.btn} onClick={onBack}>← Back to Weekly Plan</button>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,          setUser]          = useState(null);   // null = not logged in
  const [authChecked,   setAuthChecked]   = useState(false);
  const [screen,        setScreen]        = useState("onboard");
  const [profile,       setProfile]       = useState(null);
  const [plan,          setPlan]          = useState(null);
  const [activeDayIdx,  setActiveDayIdx]  = useState(null);
  const [completedDays, setCompletedDays] = useState([]);
  const [workoutLog,    setWorkoutLog]    = useState([]);

  // Listen for Firebase auth state changes
  useEffect(()=>{
    loadFirebase().then(auth=>{
      auth.onAuthStateChanged(u=>{
        if (u) setUser({ uid:u.uid, name:u.displayName, email:u.email, photo:u.photoURL });
        else   setUser(null);
        setAuthChecked(true);
      });
    }).catch(()=>setAuthChecked(true));
  },[]);

  const handleSignOut = async () => {
    try { const auth = await loadFirebase(); await auth.signOut(); } catch{}
    setUser(null); setProfile(null); setPlan(null);
    setCompletedDays([]); setScreen("onboard");
  };

  if (!authChecked) return (
    <div style={{minHeight:"100vh",background:"#0f0f0f",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#888",fontSize:"14px"}}>Loading…</div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser}/>;

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>FitAI</div>
        <div style={s.tag}>AI-Powered</div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"12px"}}>
          {user.photo && <img src={user.photo} alt="avatar" style={{width:"30px",height:"30px",borderRadius:"50%",border:"2px solid #7b2ff7"}}/>}
          <div style={{fontSize:"13px",color:"#ccc"}}>{user.name?.split(" ")[0]}</div>
          <button style={{...s.btnSm,fontSize:"12px",padding:"6px 12px"}} onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>

      {screen==="onboard" && <Onboarding user={user} onDone={(prof,p)=>{setProfile(prof);setPlan(p);setScreen("plan");}}/>}
      {screen==="plan"    && plan && <WeeklyPlan plan={plan} profile={profile} completedDays={completedDays}
        onStartDay={i=>{setActiveDayIdx(i);setScreen("session");}}
        onReset={()=>{setPlan(null);setProfile(null);setCompletedDays([]);setScreen("onboard");}}/>}
      {screen==="session" && plan && <WorkoutSession day={plan.days[activeDayIdx]} profile={profile}
        onComplete={log=>{setWorkoutLog(log);setCompletedDays(d=>[...new Set([...d,activeDayIdx])]);setScreen("post");}}/>}
      {screen==="post"    && plan && <PostWorkout day={plan.days[activeDayIdx]} profile={profile} log={workoutLog} onBack={()=>setScreen("plan")}/>}
    </div>
  );
}