import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(v || 0);
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

const ICONS = ["🎯","🏠","🚗","✈️","📚","💊","💍","🎮","💰","🏋️","🐾","🎸","💻","👶","🌍","🏖️"];
const CATS  = ["Viagem","Moradia","Veículo","Educação","Emergência","Aposentadoria","Casamento","Lazer","Saúde","Investimento","Outros"];
const EMPTY   = { name:"", description:"", target:"", current:"0", category:"", icon:"🎯", deadline:"" };
const DEPOSIT = { amount:"", note:"" };

export default function Goals() {
  const { theme, themeId } = useTheme();
  const isGlass  = themeId === "glass";
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const colorScheme = isGlass ? "light" : "dark";

  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [goals, setGoals]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingGoal, setEditingGoal]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [depositGoal, setDepositGoal]     = useState(null);
  const [form, setForm]                   = useState(EMPTY);
  const [depForm, setDepForm]             = useState(DEPOSIT);
  const [filterStatus, setFilterStatus]   = useState("active");
  const [search, setSearch]               = useState("");      // ← BUSCA
  const [toast, setToast]                 = useState(null);

  async function fetchGoals() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/goals`, { headers:{ Authorization:`Bearer ${token()}` } });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      setGoals(Array.isArray(data) ? data : []);
    } catch { showToast("Erro ao carregar metas.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchGoals(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() { setEditingGoal(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(g) {
    setEditingGoal(g);
    setForm({ name:g.name, description:g.description||"", target:g.target, current:g.current, category:g.category||"", icon:g.icon||"🎯", deadline:g.deadline||"" });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditingGoal(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.target) { showToast("Nome e valor alvo são obrigatórios.", "error"); return; }
    const payload = { ...form, target:parseFloat(form.target), current:parseFloat(form.current||0) };
    const url    = editingGoal ? `${API}/goals/${editingGoal.id}` : `${API}/goals`;
    const method = editingGoal ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` }, body:JSON.stringify(payload) });
      if (res.ok) { showToast(editingGoal?"Meta atualizada!":"Meta criada! 🎯"); closeModal(); fetchGoals(); }
      else { const err = await res.json(); showToast(err.msg||"Erro ao salvar.","error"); }
    } catch { showToast("Erro de conexão.","error"); }
  }

  async function handleDeposit(e) {
    e.preventDefault();
    const amount = parseFloat(depForm.amount);
    if (!amount || amount <= 0) { showToast("Valor inválido.", "error"); return; }
    try {
      const res = await fetch(`${API}/goals/${depositGoal.id}/deposit`, {
        method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const updated = await res.json();
        showToast(updated.status==="completed" ? "🎉 Meta concluída! Parabéns!" : `+${fmt(amount)} adicionado!`);
        setDepositGoal(null); setDepForm(DEPOSIT); fetchGoals();
      } else { const err = await res.json(); showToast(err.msg||"Erro.","error"); }
    } catch { showToast("Erro de conexão.","error"); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/goals/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
      if (res.ok) { showToast("Meta removida."); setDeleteConfirm(null); fetchGoals(); }
      else showToast("Erro ao remover.","error");
    } catch { showToast("Erro de conexão.","error"); }
  }

  async function handleToggleStatus(g) {
    const newStatus = g.status === "active" ? "cancelled" : "active";
    try {
      const res = await fetch(`${API}/goals/${g.id}`, {
        method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
        body: JSON.stringify({ ...g, status:newStatus }),
      });
      if (res.ok) { showToast(newStatus==="cancelled"?"Meta pausada.":"Meta reativada!"); fetchGoals(); }
    } catch { showToast("Erro de conexão.","error"); }
  }

  // ── FILTRAGEM COM BUSCA ─────────────────────────────────
  const filtered = goals.filter(g => {
    const statusOk = filterStatus === "all" || g.status === filterStatus;
    const searchOk = !search ||
      (g.name     ||"").toLowerCase().includes(search.toLowerCase()) ||
      (g.category ||"").toLowerCase().includes(search.toLowerCase()) ||
      (g.description||"").toLowerCase().includes(search.toLowerCase());
    return statusOk && searchOk;
  });

  const totalMetas      = goals.filter(g => g.status==="active").length;
  const totalConcluidas = goals.filter(g => g.status==="completed").length;
  const totalGuardado   = goals.filter(g => g.status!=="cancelled").reduce((s,g) => s+g.current, 0);
  const totalAlvo       = goals.filter(g => g.status!=="cancelled").reduce((s,g) => s+g.target, 0);

  const modalBg = isGlass
    ? { backdropFilter:"blur(18px) saturate(180%)", WebkitBackdropFilter:"blur(18px) saturate(180%)", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.6)" }
    : { background:theme.bgModal, border:`1px solid ${theme.borderCard}` };

  const filterBtn = (active) => ({
    background: active ? `${theme.primary}33` : (isGlass?"rgba(255,255,255,0.2)":theme.bgCard),
    color: active ? theme.textActive : theme.textMuted,
    border: active ? `1px solid ${theme.primary}66` : `1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`,
    borderRadius:8, padding:"6px 14px", fontSize:"0.82rem", cursor:"pointer",
    ...(isGlass && { backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }),
  });

  const inputStyle = {
    background:theme.bgInput, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderInput}`,
    borderRadius:10, padding:"10px 14px", color:theme.textPrimary,
    fontSize:"0.9rem", outline:"none", width:"100%",
    boxSizing:"border-box", transition:"border-color 0.2s", colorScheme,
    ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}),
  };

  function progressColor(pct) {
    if (pct >= 100) return "#22c55e";
    if (pct >= 60)  return theme.primary;
    if (pct >= 30)  return "#f59e0b";
    return theme.expense;
  }

  function daysLeft(deadline) {
    if (!deadline) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(deadline + "T00:00:00");
    return Math.round((due - today) / (1000*60*60*24));
  }

  return (
    <PageLayout>
      <style>{`
        .goal-card { background:${isGlass?"rgba(255,255,255,0.22)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:18px; padding:22px; transition:transform 0.3s ease, box-shadow 0.3s ease; transform:perspective(800px) rotateX(2deg); box-shadow:${isGlass?"0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)":"0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)"}; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%);":""} position:relative; overflow:hidden; }
        .goal-card:hover { transform:perspective(800px) rotateX(0deg) translateY(-6px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 24px 56px rgba(0,0,0,0.5)"}; }
        .card3d-g { background:${isGlass?"rgba(255,255,255,0.22)":theme.bgCard}; border:1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}; border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(6px)"}; transition:transform 0.3s ease; transform:perspective(700px) rotateX(4deg) rotateY(-2deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07)":"0 12px 32px rgba(0,0,0,0.35)"}; position:relative; overflow:hidden; }
        .card3d-g:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateY(-6px); }
        @media (max-width:768px) { .goal-card,.card3d-g { transform:none !important; } .goal-card:hover,.card3d-g:hover { transform:translateY(-4px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:70, height:isMobile?44:70, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>🎯 Metas Financeiras</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.9rem" }}>Defina objetivos e acompanhe seu progresso</p>
            </div>
          </div>
          <button style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}44` }} onClick={openCreate}>
            + Nova Meta
          </button>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"🎯", label:"Metas Ativas",  value:totalMetas,         color:theme.primary },
            { icon:"✅", label:"Concluídas",     value:totalConcluidas,    color:"#22c55e"     },
            { icon:"💰", label:"Total Guardado", value:fmt(totalGuardado), color:theme.income  },
            { icon:"🏆", label:"Total Alvo",     value:fmt(totalAlvo),     color:theme.warning },
          ].map((c,i) => (
            <div key={i} className="card3d-g">
              <div style={{ fontSize:"1.6rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.75rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize:isMobile?"0.95rem":"1.05rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── BUSCA + FILTROS ── */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24, alignItems:"center" }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nome ou categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: isMobile?"100%":"280px" }}
          />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { v:"active",    label:"🎯 Ativas"    },
              { v:"completed", label:"✅ Concluídas" },
              { v:"cancelled", label:"⏸️ Pausadas"  },
              { v:"all",       label:"Todas"         },
            ].map(f => (
              <button key={f.v} style={filterBtn(filterStatus===f.v)} onClick={() => setFilterStatus(f.v)}>
                {f.label}
              </button>
            ))}
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:13 }}
            >
              ✕ Limpar busca
            </button>
          )}
        </div>

        {/* GRID DE METAS */}
        {loading ? (
          <div style={{ textAlign:"center", color:theme.textMuted, padding:"60px 0" }}>Carregando metas...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", color:theme.textMuted, padding:"60px 0" }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>🎯</div>
            <p style={{ fontSize:"1rem", marginBottom:8 }}>{search ? "Nenhuma meta encontrada" : "Nenhuma meta cadastrada"}</p>
            {!search && <p style={{ fontSize:"0.85rem" }}>Crie sua primeira meta financeira!</p>}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":filtered.length===1?"1fr":"repeat(auto-fill,minmax(340px,1fr))", gap:20 }}>
            {filtered.map(g => {
              const pct      = g.progress;
              const pColor   = progressColor(pct);
              const days     = daysLeft(g.deadline);
              const isDone   = g.status === "completed";
              const isPaused = g.status === "cancelled";

              return (
                <div key={g.id} className="goal-card" style={{ opacity:isPaused?0.65:1 }}>
                  {isDone && (
                    <div style={{ position:"absolute", top:16, right:16, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"4px 12px", fontSize:"0.72rem", fontWeight:700, color:"#22c55e" }}>
                      ✅ Concluída
                    </div>
                  )}
                  {isPaused && (
                    <div style={{ position:"absolute", top:16, right:16, background:"rgba(100,116,139,0.15)", border:"1px solid rgba(100,116,139,0.3)", borderRadius:20, padding:"4px 12px", fontSize:"0.72rem", fontWeight:700, color:theme.textMuted }}>
                      ⏸️ Pausada
                    </div>
                  )}

                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                    <div style={{ fontSize:"2rem", lineHeight:1 }}>{g.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:"1rem", color:theme.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{g.name}</div>
                      {g.category && <div style={{ fontSize:"0.75rem", color:theme.textMuted }}>{g.category}</div>}
                    </div>
                  </div>

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:"0.75rem", color:theme.textMuted, marginBottom:2 }}>Guardado</div>
                      <div style={{ fontSize:"1.3rem", fontWeight:700, color:pColor }}>{fmt(g.current)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"0.75rem", color:theme.textMuted, marginBottom:2 }}>Meta</div>
                      <div style={{ fontSize:"1rem", fontWeight:600, color:theme.textPrimary }}>{fmt(g.target)}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:"0.78rem", color:theme.textMuted }}>Progresso</span>
                      <span style={{ fontSize:"0.78rem", fontWeight:700, color:pColor }}>{pct}%</span>
                    </div>
                    <div style={{ height:10, borderRadius:8, background:isGlass?"rgba(255,255,255,0.2)":theme.border, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:8, width:`${pct}%`, background:`linear-gradient(90deg, ${pColor}, ${pColor}cc)`, transition:"width 0.6s ease", boxShadow:`0 0 8px ${pColor}66` }} />
                    </div>
                    {g.remaining > 0 && !isDone && (
                      <div style={{ fontSize:"0.75rem", color:theme.textMuted, marginTop:4 }}>
                        Faltam <strong style={{ color:theme.textPrimary }}>{fmt(g.remaining)}</strong>
                      </div>
                    )}
                  </div>

                  {g.deadline && (
                    <div style={{ marginBottom:14, padding:"8px 12px", background:isGlass?"rgba(255,255,255,0.15)":theme.bgPrimary, borderRadius:8, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.border}`, fontSize:"0.78rem", color:theme.textMuted, display:"flex", justifyContent:"space-between" }}>
                      <span>📅 Prazo: {g.deadline.split("-").reverse().join("/")}</span>
                      {days !== null && !isDone && (
                        <span style={{ color:days<0?"#ef4444":days<=30?"#f59e0b":theme.textMuted, fontWeight:600 }}>
                          {days<0?`${Math.abs(days)}d atrasado`:days===0?"Hoje!":`${days}d restantes`}
                        </span>
                      )}
                    </div>
                  )}

                  {g.description && (
                    <div style={{ fontSize:"0.82rem", color:theme.textMuted, marginBottom:14, fontStyle:"italic" }}>{g.description}</div>
                  )}

                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {!isDone && !isPaused && (
                      <button onClick={() => { setDepositGoal(g); setDepForm(DEPOSIT); }}
                        style={{ flex:1, background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", cursor:"pointer", fontSize:"0.82rem", fontWeight:600, boxShadow:`0 3px 10px ${theme.primary}33` }}>
                        💰 Depositar
                      </button>
                    )}
                    <button onClick={() => openEdit(g)}
                      style={{ background:isGlass?"rgba(255,255,255,0.25)":`${theme.primary}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":`${theme.primary}44`}`, borderRadius:8, padding:"8px 10px", cursor:"pointer", fontSize:"0.9rem" }}>
                      ✏️
                    </button>
                    <button onClick={() => handleToggleStatus(g)}
                      style={{ background:isPaused?`${theme.income}22`:"rgba(100,116,139,0.12)", border:`1px solid ${isPaused?theme.income:"rgba(100,116,139,0.3)"}`, borderRadius:8, padding:"8px 10px", cursor:"pointer", fontSize:"0.9rem" }}
                      title={isPaused?"Reativar":"Pausar"}>
                      {isPaused?"▶️":"⏸️"}
                    </button>
                    <button onClick={() => setDeleteConfirm(g)}
                      style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"8px 10px", cursor:"pointer", fontSize:"0.9rem" }}>
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contador */}
        {search && filtered.length > 0 && (
          <div style={{ marginTop:16, fontSize:12, color:theme.textMuted, textAlign:"right" }}>
            {filtered.length} meta(s) encontrada(s)
          </div>
        )}
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={closeModal}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:580, maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{editingGoal?"✏️ Editar Meta":"🎯 Nova Meta"}</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={closeModal}>✕</button>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Ícone</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm({...form,icon:ic})}
                    style={{ fontSize:"1.4rem", padding:"6px 10px", borderRadius:10, border:`2px solid ${form.icon===ic?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:form.icon===ic?`${theme.primary}22`:"transparent", cursor:"pointer", transition:"all 0.15s" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:24 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={lbl}>Nome da Meta *</label>
                  <input style={inp(theme,isGlass,colorScheme)} type="text" required placeholder="Ex: Viagem para Europa..." value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Valor Alvo (R$) *</label>
                  <input style={inp(theme,isGlass,colorScheme)} type="number" step="0.01" min="0" required placeholder="0,00" value={form.target} onChange={e=>setForm({...form,target:e.target.value})} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Valor Atual (R$)</label>
                  <input style={inp(theme,isGlass,colorScheme)} type="number" step="0.01" min="0" placeholder="0,00" value={form.current} onChange={e=>setForm({...form,current:e.target.value})} />
                  <span style={{ fontSize:"0.72rem", color:theme.textMuted }}>Quanto já guardou para essa meta</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Categoria</label>
                  <select style={sel(theme,isGlass,colorScheme)} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option value="">— Selecione —</option>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Prazo</label>
                  <input style={inp(theme,isGlass,colorScheme)} type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={lbl}>Descrição</label>
                  <textarea style={{ ...inp(theme,isGlass,colorScheme), resize:"vertical", minHeight:70 }} placeholder="Por que esta meta é importante para você?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                </div>
                {form.target > 0 && (
                  <div style={{ gridColumn:"1 / -1", padding:"12px 16px", background:isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`, borderRadius:10, border:`1px solid ${theme.primary}22` }}>
                    <div style={{ fontSize:"0.82rem", color:theme.textMuted, marginBottom:8 }}>📋 Preview</div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:"0.85rem", color:theme.textPrimary }}>{form.icon} {form.name||"Sua meta"}</span>
                      <span style={{ fontSize:"0.85rem", fontWeight:700, color:theme.primary }}>
                        {form.current>0?`${(Math.min(parseFloat(form.current)/parseFloat(form.target)*100,100)).toFixed(0)}%`:"0%"}
                      </span>
                    </div>
                    <div style={{ height:8, borderRadius:6, background:isGlass?"rgba(255,255,255,0.2)":theme.border, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:6, width:`${form.current>0?Math.min(parseFloat(form.current)/parseFloat(form.target)*100,100):0}%`, background:theme.primaryGrad, transition:"width 0.3s" }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
                <button type="button" style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={closeModal}>Cancelar</button>
                <button type="submit" style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", boxShadow:`0 4px 15px ${theme.primary}44`, width:isMobile?"100%":"auto" }}>
                  {editingGoal?"Salvar Alterações":"Criar Meta 🎯"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEPOSITAR */}
      {depositGoal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDepositGoal(null)}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:420, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:theme.textPrimary }}>💰 Depositar na Meta</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={() => setDepositGoal(null)}>✕</button>
            </div>
            <div style={{ padding:"12px 16px", background:isGlass?"rgba(255,255,255,0.2)":theme.bgPrimary, borderRadius:12, marginBottom:20, border:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.border}` }}>
              <div style={{ fontWeight:600, color:theme.textPrimary, marginBottom:4 }}>{depositGoal.icon} {depositGoal.name}</div>
              <div style={{ fontSize:"0.82rem", color:theme.textMuted, marginBottom:8 }}>{fmt(depositGoal.current)} de {fmt(depositGoal.target)} ({depositGoal.progress}%)</div>
              <div style={{ height:6, borderRadius:4, background:isGlass?"rgba(255,255,255,0.2)":theme.border, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:4, width:`${depositGoal.progress}%`, background:theme.primaryGrad }} />
              </div>
              <div style={{ fontSize:"0.78rem", color:theme.textMuted, marginTop:6 }}>
                Faltam <strong style={{ color:theme.primary }}>{fmt(depositGoal.remaining)}</strong>
              </div>
            </div>
            <form onSubmit={handleDeposit}>
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:20 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Valor a depositar (R$) *</label>
                  <input style={inp(theme,isGlass,colorScheme)} type="number" step="0.01" min="0.01" required placeholder="0,00" value={depForm.amount} onChange={e=>setDepForm({...depForm,amount:e.target.value})} autoFocus />
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[50,100,200,500].map(v => (
                    <button key={v} type="button" onClick={() => setDepForm({...depForm,amount:String(v)})}
                      style={{ background:isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":`${theme.primary}33`}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:"0.82rem", color:theme.primary, fontWeight:600 }}>
                      +{fmt(v)}
                    </button>
                  ))}
                  {depositGoal.remaining > 0 && (
                    <button type="button" onClick={() => setDepForm({...depForm,amount:String(depositGoal.remaining.toFixed(2))})}
                      style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:"0.82rem", color:"#22c55e", fontWeight:600 }}>
                      💯 Completar ({fmt(depositGoal.remaining)})
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", gap:12, flexDirection:isMobile?"column":"row" }}>
                <button type="button" style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={() => setDepositGoal(null)}>Cancelar</button>
                <button type="submit" style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", flex:1, boxShadow:`0 4px 15px ${theme.primary}44` }}>
                  💰 Depositar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border:"1px solid rgba(239,68,68,0.3)", borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:400, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Meta</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>Excluir <strong style={{ color:theme.textPrimary }}>"{deleteConfirm.name}"</strong>? Esta ação não pode ser desfeita.</p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
              <button style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={() => handleDelete(deleteConfirm.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:isMobile?16:28, right:isMobile?16:28, left:isMobile?16:"auto", color:"#fff", padding:"12px 22px", borderRadius:12, fontWeight:600, fontSize:"0.9rem", zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", background:toast.type==="error"?"#ef4444":theme.primaryGrad, textAlign:isMobile?"center":"left" }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}

const lbl = { color:"#94a3b8", fontSize:"0.8rem", fontWeight:600 };
function inp(theme, isGlass, colorScheme) {
  return { background:theme.bgInput, border:`1px solid ${theme.borderInput}`, borderRadius:10, padding:"10px 14px", color:theme.textPrimary, fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s", colorScheme, ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) };
}
function sel(theme, isGlass, colorScheme) {
  return { ...inp(theme, isGlass, colorScheme), cursor:"pointer", appearance:"auto" };
}
