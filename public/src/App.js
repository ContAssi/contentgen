import { useState, useRef } from "react";

const FREE_LIMIT = 3;

const TYPES = [
  { id: "caption", label: "Caption Instagram", icon: "📸", desc: "Légende + hashtags" },
  { id: "tiktok",  label: "Script TikTok",     icon: "🎬", desc: "Hook + accroche vidéo" },
  { id: "fiche",   label: "Fiche produit",      icon: "🛍️", desc: "Description e-commerce" },
  { id: "email",   label: "Email promo",        icon: "✉️", desc: "Email de vente" },
  { id: "pub",     label: "Texte publicitaire", icon: "🎯", desc: "Meta / TikTok Ads" },
];
const TONES = ["Élégant & luxueux","Décontracté & fun","Professionnel","Urgent & promotionnel","Authentique & humain"];
const LANGS = ["Français","Anglais","Espagnol"];
const USERS = {};

function buildPrompt(type, product, details, tone, lang) {
  const d = details || "aucun";
  return {
    caption: `Tu es expert marketing Instagram. Génère une caption percutante en ${lang} pour : "${product}". Détails : ${d}. Ton : ${tone}. Inclus 15 hashtags pertinents à la fin.`,
    tiktok:  `Tu es expert TikTok. Crée un script 30-45 sec en ${lang} pour : "${product}". Détails : ${d}. Ton : ${tone}. Format : Hook (1 phrase choc) + Corps (3 points) + CTA fort.`,
    fiche:   `Tu es copywriter e-commerce. Rédige une fiche produit complète en ${lang} pour : "${product}". Détails : ${d}. Ton : ${tone}. Inclus : titre accrocheur, description émotionnelle, 5 points forts, promesse client.`,
    email:   `Tu es expert email marketing. Rédige un email de vente en ${lang} pour : "${product}". Détails : ${d}. Ton : ${tone}. Structure : Objet + Accroche + Corps + CTA + Signature.`,
    pub:     `Tu es expert Meta/TikTok Ads. Rédige 3 variantes pub en ${lang} pour : "${product}". Détails : ${d}. Ton : ${tone}. Chaque variante : Titre (max 40 car.) + Texte (max 125 car.) + Description (max 30 car.).`,
  }[type];
}

function Spinner() {
  return (
    <div style={{display:"flex",gap:6,justifyContent:"center",padding:"28px 0"}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#9B8240",
          animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>
      ))}
    </div>
  );
}

function Tag({children, active, onClick}) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 13px",borderRadius:99,fontSize:12,fontFamily:"Jost,sans-serif",cursor:"pointer",
      border:active?"1.5px solid #9B8240":"1.5px solid #e8dfc8",
      background:active?"#9B824018":"transparent",
      color:active?"#7A1F1F":"#6a5a4a",fontWeight:active?600:400,transition:"all 0.15s"
    }}>{children}</button>
  );
}

export default function App() {
  const [screen, setScreen]       = useState("login");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [authError, setAuthError] = useState("");
  const [authMsg, setAuthMsg]     = useState("");
  const [session, setSession]     = useState(null);
  const [type, setType]           = useState("caption");
  const [tone, setTone]           = useState("Élégant & luxueux");
  const [lang, setLang]           = useState("Français");
  const [product, setProduct]     = useState("");
  const [details, setDetails]     = useState("");
  const [result, setResult]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const resultRef = useRef(null);

  function handleSignup() {
    setAuthError("");
    if (!email || !password) { setAuthError("Remplis tous les champs."); return; }
    if (password.length < 6) { setAuthError("Mot de passe : 6 caractères minimum."); return; }
    if (password !== confirm) { setAuthError("Les mots de passe ne correspondent pas."); return; }
    if (USERS[email]) { setAuthError("Ce compte existe déjà. Connecte-toi."); return; }
    USERS[email] = { password, isPro: false, used: 0, history: [] };
    setAuthMsg("✅ Compte créé ! Tu peux te connecter.");
    setScreen("login");
  }

  function handleLogin() {
    setAuthError("");
    if (!email || !password) { setAuthError("Remplis tous les champs."); return; }
    const user = USERS[email];
    if (!user) { setAuthError("Compte introuvable. Inscris-toi d'abord."); return; }
    if (user.password !== password) { setAuthError("Mot de passe incorrect."); return; }
    setSession({ email });
    setScreen("app");
  }

  function logout() {
    setSession(null); setScreen("login"); setResult("");
    setEmail(""); setPassword(""); setConfirm(""); setAuthError(""); setAuthMsg("");
  }

  async function generate() {
    if (!product.trim()) return;
    const user = USERS[session.email];
    if (!user.isPro && user.used >= FREE_LIMIT) { setShowPaywall(true); return; }
    setLoading(true); setResult("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: buildPrompt(type,product,details,tone,lang) }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b=>b.text||"").join("") || "Erreur.";
      setResult(text);
      user.used += 1;
      user.history.unshift({ type: TYPES.find(t=>t.id===type)?.label, product, result: text, date: new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) });
      if (user.history.length > 5) user.history.pop();
      setTimeout(()=>resultRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),100);
    } catch { setResult("❌ Erreur. Réessaie."); }
    setLoading(false);
  }

  function activatePro() {
    USERS[session.email].isPro = true;
    setShowPaywall(false);
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  const user = session ? USERS[session.email] : null;

  return (
    <div style={{minHeight:"100vh",background:"#fffdf7",fontFamily:"Jost,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        textarea,input{outline:none;}
        button{cursor:pointer;border:none;}
        ::placeholder{color:#b8a898;}
      `}</style>

      {/* HEADER */}
      <header style={{borderBottom:"1px solid #e8dfc8",background:"#fffdf7",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#7A1F1F,#9B8240)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14}}>✦</div>
            <span style={{fontFamily:"Cormorant Garamond,serif",fontWeight:700,fontSize:20,color:"#7A1F1F"}}>ContentGen</span>
            <span style={{fontSize:10,color:"#9B8240",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em"}}>IA</span>
          </div>
          {user && (
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {!user.isPro && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#f9f5ec",borderRadius:99}}>
                  <div style={{width:70,height:3,background:"#e8dfc8",borderRadius:99,overflow:"hidden"}}>
                    <div style={{width:`${Math.min((user.used/FREE_LIMIT)*100,100)}%`,height:"100%",background:user.used>=FREE_LIMIT?"#c0392b":"#9B8240",borderRadius:99,transition:"width 0.4s"}}/>
                  </div>
                  <span style={{fontSize:11,color:user.used>=FREE_LIMIT?"#c0392b":"#9B8240",fontWeight:600}}>{user.used}/{FREE_LIMIT}</span>
                </div>
              )}
              {user.isPro
                ? <span style={{fontSize:12,color:"#9B8240",fontWeight:600,padding:"6px 14px",background:"#9B824018",borderRadius:99}}>✦ Pro actif</span>
                : <button onClick={()=>setShowPaywall(true)} style={{padding:"8px 18px",background:"linear-gradient(135deg,#7A1F1F,#9B8240)",color:"#fff",borderRadius:99,fontSize:13,fontWeight:600,fontFamily:"Jost,sans-serif"}}>Passer Pro →</button>
              }
              <button onClick={logout} style={{fontSize:12,color:"#9a8a7a",background:"transparent",padding:"6px 12px",borderRadius:8,fontFamily:"Jost,sans-serif"}}>Déconnexion</button>
            </div>
          )}
        </div>
      </header>

      {/* AUTH */}
      {screen !== "app" && (
        <div style={{maxWidth:420,margin:"70px auto",padding:"0 20px"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{width:56,height:56,background:"linear-gradient(135deg,#7A1F1F,#9B8240)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px"}}>✦</div>
            <h1 style={{fontFamily:"Cormorant Garamond,serif",fontSize:30,color:"#2C1810",marginBottom:6}}>ContentGen IA</h1>
            <p style={{color:"#7a6a5a",fontSize:14}}>Génère ton contenu e-commerce en secondes</p>
          </div>
          <div style={{background:"#fff",border:"1px solid #e8dfc8",borderRadius:20,padding:28,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",background:"#f9f5ec",borderRadius:12,padding:4}}>
              {[["login","Connexion"],["signup","Inscription"]].map(([m,l])=>(
                <button key={m} onClick={()=>{setScreen(m);setAuthError("");setAuthMsg("");}} style={{
                  flex:1,padding:"8px",borderRadius:9,fontSize:13,fontFamily:"Jost,sans-serif",fontWeight:600,
                  background:screen===m?"#fff":"transparent",color:screen===m?"#7A1F1F":"#9a8a7a",
                  boxShadow:screen===m?"0 1px 4px #00000010":"none",transition:"all 0.2s"
                }}>{l}</button>
              ))}
            </div>
            {authMsg && <p style={{color:"#27ae60",fontSize:13,textAlign:"center",background:"#27ae6010",padding:"10px",borderRadius:8}}>{authMsg}</p>}
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email"
              style={{padding:"11px 14px",border:"1.5px solid #e8dfc8",borderRadius:10,fontSize:14,fontFamily:"Jost,sans-serif",color:"#2C1810",background:"#fafaf8"}}/>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Mot de passe (min. 6 caractères)"
              onKeyDown={e=>e.key==="Enter"&&(screen==="login"?handleLogin():handleSignup())}
              style={{padding:"11px 14px",border:"1.5px solid #e8dfc8",borderRadius:10,fontSize:14,fontFamily:"Jost,sans-serif",color:"#2C1810",background:"#fafaf8"}}/>
            {screen==="signup" && (
              <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" placeholder="Confirmer le mot de passe"
                onKeyDown={e=>e.key==="Enter"&&handleSignup()}
                style={{padding:"11px 14px",border:`1.5px solid ${confirm && confirm!==password?"#c0392b":"#e8dfc8"}`,borderRadius:10,fontSize:14,fontFamily:"Jost,sans-serif",color:"#2C1810",background:"#fafaf8"}}/>
            )}
            {authError && <p style={{color:"#c0392b",fontSize:12,textAlign:"center",background:"#c0392b10",padding:"8px",borderRadius:8}}>{authError}</p>}
            <button onClick={screen==="login"?handleLogin:handleSignup} style={{
              padding:"13px",background:"linear-gradient(135deg,#7A1F1F,#9B8240)",
              color:"#fff",borderRadius:12,fontSize:15,fontWeight:600,fontFamily:"Jost,sans-serif"
            }}>
              {screen==="login"?"Se connecter":"Créer mon compte"}
            </button>
            {screen==="signup" && <p style={{fontSize:11,color:"#b8a898",textAlign:"center"}}>3 générations gratuites · Sans carte bancaire</p>}
          </div>
        </div>
      )}

      {/* APP */}
      {screen==="app" && user && (
        <main style={{maxWidth:960,margin:"0 auto",padding:"28px 20px"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <h1 style={{fontFamily:"Cormorant Garamond,serif",fontSize:"clamp(24px,4vw,40px)",fontWeight:700,color:"#2C1810",lineHeight:1.15,marginBottom:8}}>
              Génère ton contenu<br/><span style={{color:"#7A1F1F"}}>e-commerce en secondes</span>
            </h1>
            <p style={{color:"#9a8a7a",fontSize:13}}>Connecté : <strong>{session.email}</strong></p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div style={{background:"#fff",border:"1px solid #e8dfc8",borderRadius:16,padding:18}}>
                <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9B8240",fontWeight:600,display:"block",marginBottom:10}}>Type de contenu</label>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {TYPES.map(t=>(
                    <button key={t.id} onClick={()=>setType(t.id)} style={{
                      display:"flex",alignItems:"center",gap:11,padding:"9px 12px",borderRadius:10,
                      border:type===t.id?"2px solid #9B8240":"2px solid transparent",
                      background:type===t.id?"#f9f5ec":"#fafaf8",textAlign:"left",fontFamily:"Jost,sans-serif"
                    }}>
                      <span style={{fontSize:16}}>{t.icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#2C1810"}}>{t.label}</div>
                        <div style={{fontSize:11,color:"#9a8a7a"}}>{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{background:"#fff",border:"1px solid #e8dfc8",borderRadius:16,padding:18,display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9B8240",fontWeight:600,display:"block",marginBottom:8}}>Ton</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{TONES.map(t=><Tag key={t} active={tone===t} onClick={()=>setTone(t)}>{t}</Tag>)}</div>
                </div>
                <div>
                  <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9B8240",fontWeight:600,display:"block",marginBottom:8}}>Langue</label>
                  <div style={{display:"flex",gap:5}}>{LANGS.map(l=><Tag key={l} active={lang===l} onClick={()=>setLang(l)}>{l}</Tag>)}</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div style={{background:"#fff",border:"1px solid #e8dfc8",borderRadius:16,padding:18,display:"flex",flexDirection:"column",gap:13}}>
                <div>
                  <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9B8240",fontWeight:600,display:"block",marginBottom:7}}>Nom du produit *</label>
                  <input value={product} onChange={e=>setProduct(e.target.value)} placeholder="ex: Sac en raphia tressé, Robe wax..."
                    style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e8dfc8",borderRadius:10,fontSize:14,fontFamily:"Jost,sans-serif",color:"#2C1810",background:"#fafaf8"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9B8240",fontWeight:600,display:"block",marginBottom:7}}>Détails</label>
                  <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Matière, couleurs, cible, prix, points forts..." rows={3}
                    style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e8dfc8",borderRadius:10,fontSize:13,fontFamily:"Jost,sans-serif",color:"#2C1810",background:"#fafaf8",resize:"vertical",lineHeight:1.6}}/>
                </div>
                <button onClick={generate} disabled={loading||!product.trim()} style={{
                  padding:"13px",background:product.trim()&&!loading?"linear-gradient(135deg,#7A1F1F,#9B8240)":"#d4cdc0",
                  color:"#fff",borderRadius:12,fontSize:15,fontWeight:600,fontFamily:"Jost,sans-serif"
                }}>
                  {loading?"Génération en cours...":"✦ Générer le contenu"}
                </button>
              </div>
              <div ref={resultRef} style={{background:"#fff",border:"1px solid #e8dfc8",borderRadius:16,padding:18,minHeight:150}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9B8240",fontWeight:600}}>Résultat</label>
                  {result&&<button onClick={copy} style={{fontSize:12,color:"#9B8240",background:"#9B824012",border:"1px solid #9B824030",borderRadius:8,padding:"4px 11px",fontFamily:"Jost,sans-serif",fontWeight:500}}>{copied?"✓ Copié !":"Copier"}</button>}
                </div>
                {loading?<Spinner/>:result
                  ?<div style={{fontSize:13,color:"#2C1810",lineHeight:1.75,whiteSpace:"pre-wrap",animation:"fadeUp 0.4s ease"}}>{result}</div>
                  :<div style={{textAlign:"center",color:"#b8a898",fontSize:13,paddingTop:28}}>
                    <div style={{fontSize:26,marginBottom:6}}>✦</div>Ton contenu apparaîtra ici
                  </div>
                }
              </div>
            </div>
          </div>
          {user.history.length>0&&(
            <div style={{marginTop:28}}>
              <h2 style={{fontFamily:"Cormorant Garamond,serif",fontSize:19,color:"#7A1F1F",marginBottom:12}}>Historique</h2>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {user.history.map((h,i)=>(
                  <div key={i} onClick={()=>setResult(h.result)} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px",background:"#fff",border:"1px solid #e8dfc8",borderRadius:11,cursor:"pointer"}}>
                    <span style={{fontSize:12,fontWeight:600,color:"#7A1F1F"}}>{h.type}</span>
                    <span style={{fontSize:12,color:"#9a8a7a",flex:1}}>— {h.product}</span>
                    <span style={{fontSize:11,color:"#b8a898"}}>{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* PAYWALL */}
      {showPaywall&&(
        <div onClick={()=>setShowPaywall(false)} style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fffdf7",borderRadius:24,padding:36,maxWidth:390,width:"100%",textAlign:"center",border:"1px solid #e8dfc8"}}>
            <div style={{fontSize:34,marginBottom:10}}>✦</div>
            <h2 style={{fontFamily:"Cormorant Garamond,serif",fontSize:25,color:"#7A1F1F",marginBottom:8}}>Passe à Pro</h2>
            <p style={{color:"#7a6a5a",fontSize:14,marginBottom:22,lineHeight:1.6}}>
              Tu as utilisé tes {FREE_LIMIT} générations gratuites.<br/>Débloques un accès illimité pour <strong>29€/mois</strong>.
            </p>
            <div style={{background:"#f9f5ec",borderRadius:14,padding:16,marginBottom:22,textAlign:"left"}}>
              {["Générations illimitées","Tous les types de contenu","Historique complet","Support prioritaire"].map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:14,color:"#2C1810"}}>
                  <span style={{color:"#9B8240",fontWeight:700}}>✓</span>{f}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowPaywall(false)} style={{flex:1,padding:"11px",background:"transparent",border:"1.5px solid #e8dfc8",borderRadius:12,fontSize:13,fontFamily:"Jost,sans-serif",color:"#6a5a4a"}}>Plus tard</button>
              <button onClick={activatePro} style={{flex:2,padding:"11px",background:"linear-gradient(135deg,#7A1F1F,#9B8240)",color:"#fff",borderRadius:12,fontSize:14,fontWeight:600,fontFamily:"Jost,sans-serif"}}>
                Activer Pro — 29€/mois
              </button>
            </div>
            <p style={{fontSize:11,color:"#b8a898",marginTop:10}}>Sans engagement · Résiliable à tout moment</p>
          </div>
        </div>
      )}
    </div>
  );
}
