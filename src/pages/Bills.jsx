import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";

const API = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

function fmt(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}
function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
function isOverdue(due_date, status) {
  if (status === "paid") return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(due_date + "T00:00:00") < today;
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

const PERSONAL_CATS = {
  payable:    ["🏠 Moradia","💡 Energia","💧 Água","📱 Telefone/Internet","🍔 Alimentação","🚗 Transporte","💊 Saúde","🎬 Lazer","👗 Vestuário","📚 Educação","🐾 Pet","💳 Cartão de Crédito","✈️ Viagem","🎁 Presentes","Outros"],
  receivable: ["💼 Salário","🔄 Freelance","💹 Investimentos","🏠 Aluguel Recebido","💰 Reembolso","🎁 Presente","Outros"],
};
const BUSINESS_CATS = {
  payable:    ["Fornecedores","Aluguel","Salários","Marketing","Equipamentos","Serviços","Impostos","Logística","Outros"],
  receivable: ["Vendas","Serviços Prestados","Consultoria","Comissões","Outros"],
};

// ✅ helpers de data para recorrência
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}
function addWeeks(dateStr, n) {
  const dt = new Date(dateStr + "T00:00:00");
  dt.setDate(dt.getDate() + n * 7);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}
function addYears(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y + n}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

export default function Bills() {
  const { theme, themeId } = useTheme();
  const isGlass  = themeId === "glass";
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const accountType = localStorage.getItem("account_type") || "business";
  const isPersonal  = accountType === "personal";
  const CATS        = isPersonal ? PERSONAL_CATS : BUSINESS_CATS;

  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [bills, setBills]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("all");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [searchText, setSearchText]       = useState("");
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingBill, setEditingBill]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast]                 = useState(null);
  const [form, setForm] = useState({
    description:"", amount:"", type:"payable",
    status:"pending", due_date:"", paid_date:"",
    category:"", notes:"",
  });

  // ✅ estados de recorrência
  const [recurring, setRecurring]             = useState(false);
  const [recurringFreq, setRecurringFreq]     = useState("monthly");
  const [recurringQty, setRecurringQty]       = useState(3);
  const [savingRecurring, setSavingRecurring] = useState(false);

  async function fetchBills() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/bills`, { headers:{ Authorization:`Bearer ${token()}` } });
      if (res.status === 401) { localStorage.removeItem("token"); navigate("/"); return; }
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch { showToast("Erro ao carregar contas.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchBills(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditingBill(null);
    setRecurring(false); setRecurringQty(3); setRecurringFreq("monthly");
    setForm({ description:"", amount:"", type:"payable", status:"pending", due_date:"", paid_date:"", category:"", notes:"" });
    setModalOpen(true);
  }

  function openEdit(bill) {
    setEditingBill(bill);
    setRecurring(false);
    setForm({
      description: bill.description||"", amount: bill.amount||"",
      type: bill.type||"payable", status: bill.status||"pending",
      due_date: bill.due_date||"", paid_date: bill.paid_date||"",
      category: bill.category||"", notes: bill.notes||"",
    });
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingBill(null); setRecurring(false); }

  // ✅ submit com suporte a recorrência
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description || !form.amount || !form.due_date) {
      showToast("Preencha todos os campos obrigatórios.", "error"); return;
    }

    setSavingRecurring(true);
    try {
      if (editingBill) {
        // edição simples — sem recorrência
        const res = await fetch(`${API}/bills/${editingBill.id}`, {
          method: "PUT",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
          body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
        });
        if (res.ok) { showToast("Conta atualizada!"); closeModal(); fetchBills(); }
        else { const err = await res.json(); showToast(err.msg||"Erro ao salvar.","error"); }

      } else if (!recurring) {
        // nova conta simples
        const res = await fetch(`${API}/bills`, {
          method: "POST",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
          body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
        });
        if (res.ok) { showToast("Conta criada!"); closeModal(); fetchBills(); }
        else { const err = await res.json(); showToast(err.msg||"Erro ao salvar.","error"); }

      } else {
        // ✅ recorrente: cria N contas com datas incrementadas
        const qty   = parseInt(recurringQty) || 2;
        const dates = [form.due_date];
        for (let i = 1; i < qty; i++) {
          if (recurringFreq === "monthly") dates.push(addMonths(form.due_date, i));
          if (recurringFreq === "weekly")  dates.push(addWeeks(form.due_date, i));
          if (recurringFreq === "yearly")  dates.push(addYears(form.due_date, i));
        }
        const freqLabel = { monthly:"Mensal", weekly:"Semanal", yearly:"Anual" }[recurringFreq];

        const results = await Promise.all(
          dates.map((dt, i) =>
            fetch(`${API}/bills`, {
              method: "POST",
              headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
              body: JSON.stringify({
                ...form,
                amount: parseFloat(form.amount),
                description: `${form.description} (${freqLabel} ${i+1}/${qty})`,
                due_date: dt,
                status: "pending",
              }),
            })
          )
        );

        if (results.every(r => r.ok)) {
          showToast(`✅ ${qty} contas recorrentes criadas!`);
          closeModal(); fetchBills();
        } else { showToast("Erro ao criar algumas contas.", "error"); }
      }
    } catch { showToast("Erro de conexão.","error"); }
    finally { setSavingRecurring(false); }
  }

  async function handlePay(bill) {
    try {
      const res = await fetch(`${API}/bills/${bill.id}/pay`, {
        method:"PATCH", headers:{ Authorization:`Bearer ${token()}` },
      });
      if (res.ok) { showToast("Conta marcada como paga! ✅"); fetchBills(); }
      else showToast("Erro ao marcar como paga.","error");
    } catch { showToast("Erro de conexão.","error"); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/bills/${id}`, {
        method:"DELETE", headers:{ Authorization:`Bearer ${token()}` },
      });
      if (res.ok) { showToast("Conta removida."); setDeleteConfirm(null); fetchBills(); }
      else showToast("Erro ao remover.","error");
    } catch { showToast("Erro de conexão.","error"); }
  }

  async function handleDuplicate(bill) {
    try {
      const res = await fetch(`${API}/bills`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token()}` },
        body: JSON.stringify({ description:`${bill.description} (cópia)`, amount:bill.amount, type:bill.type, status:"pending", due_date:bill.due_date, category:bill.category, notes:bill.notes }),
      });
      if (res.ok) { showToast("Conta duplicada!"); fetchBills(); }
      else showToast("Erro ao duplicar.","error");
    } catch { showToast("Erro de conexão.","error"); }
  }

  const filtered = bills.filter(b => {
    const typeOk   = filter==="all" || b.type===filter;
    const realSt   = b.status!=="paid" && isOverdue(b.due_date, b.status) ? "overdue" : b.status;
    const statusOk = statusFilter==="all" || realSt===statusFilter;
    const searchOk = !searchText || b.description?.toLowerCase().includes(searchText.toLowerCase()) || (b.category||"").toLowerCase().includes(searchText.toLowerCase());
    return typeOk && statusOk && searchOk;
  });

  const totalPayable    = bills.filter(b=>b.type==="payable"&&b.status!=="paid").reduce((s,b)=>s+b.amount,0);
  const totalPaid       = bills.filter(b=>b.type==="payable"&&b.status==="paid").reduce((s,b)=>s+b.amount,0);
  const totalReceivable = bills.filter(b=>b.type==="receivable"&&b.status!=="paid").reduce((s,b)=>s+b.amount,0);
  const totalReceived   = bills.filter(b=>b.type==="receivable"&&b.status==="paid").reduce((s,b)=>s+b.amount,0);
  const totalOverdue    = bills.filter(b=>isOverdue(b.due_date,b.status)).reduce((s,b)=>s+b.amount,0);

  const today   = new Date(); today.setHours(0,0,0,0);
  const in7days = new Date(today); in7days.setDate(today.getDate() + 7);
  const upcoming = bills.filter(b => {
    if (b.status==="paid") return false;
    const due = new Date(b.due_date+"T00:00:00");
    return due >= today && due <= in7days;
  });

  const colorScheme = isGlass ? "light" : "dark";
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

  const formCats = CATS[form.type] || [];

  return (
    <PageLayout>
      <style>{`
        .card3d-b { border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(10px)"}; -webkit-backdrop-filter:${isGlass?"blur(18px) saturate(180%)":"blur(10px)"}; transition:transform 0.35s ease, box-shadow 0.35s ease; transform:perspective(700px) rotateX(5deg) rotateY(-3deg); box-shadow:${isGlass?"0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)":"0 20px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"}; position:relative; overflow:hidden; cursor:default; }
        .card3d-b::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,${isGlass?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.1)"},transparent); }
        .card3d-b:hover { transform:perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(20px) translateY(-8px); box-shadow:${isGlass?"0 20px 48px rgba(0,0,0,0.1)":"0 36px 72px rgba(0,0,0,0.6)"}; }
        .table-bills { background:${theme.bgCard}; border:1px solid ${theme.borderCard}; border-radius:16px; overflow-x:auto; -webkit-overflow-scrolling:touch; ${isGlass?"backdrop-filter:blur(18px) saturate(180%); -webkit-backdrop-filter:blur(18px) saturate(180%); box-shadow:0 4px 24px rgba(0,0,0,0.07);":""} }
        .bill-row:hover { background:${isGlass?"rgba(255,255,255,0.15)":`${theme.primary}0d`} !important; }
        @media (max-width:768px) { .card3d-b { transform:none !important; } .card3d-b:hover { transform:translateY(-6px) !important; } }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, padding:isMobile?"72px 16px 40px":"32px 36px", overflowY:"auto", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:70, height:isMobile?44:70, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>Contas</h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.9rem" }}>
                {isPersonal ? "Controle de contas a pagar e a receber" : "Gerencie suas contas a pagar e a receber"}
              </p>
            </div>
          </div>
          <button style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:"0.9rem", boxShadow:`0 4px 15px ${theme.primary}44` }} onClick={openCreate}>
            + Nova Conta
          </button>
        </div>

        {/* ALERTA VENCIMENTO PRÓXIMO */}
        {upcoming.length > 0 && (
          <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:14, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:"1.3rem" }}>⏰</span>
              <div>
                <div style={{ color:"#f59e0b", fontWeight:700, fontSize:14 }}>{upcoming.length} conta{upcoming.length>1?"s":""} vencendo nos próximos 7 dias</div>
                <div style={{ color:theme.textMuted, fontSize:12, marginTop:2 }}>Total: {fmt(upcoming.reduce((s,b)=>s+b.amount,0))}</div>
              </div>
            </div>
            <button onClick={() => setStatusFilter("pending")} style={{ background:"rgba(245,158,11,0.15)", color:"#f59e0b", border:"1px solid rgba(245,158,11,0.3)", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>Ver pendentes</button>
          </div>
        )}

        {/* CARDS A PAGAR */}
        <p style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 12px 0" }}>
          {isPersonal ? "💸 A Pagar" : "📤 Contas a Pagar"}
        </p>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:16, marginBottom:24 }}>
          {[
            { icon:"📤", label:"A Pagar",  value:fmt(totalPayable),  color:"#ef4444" },
            { icon:"✅", label:"Pagas",    value:fmt(totalPaid),     color:theme.income  },
            { icon:"⚠️", label:"Vencidas", value:fmt(totalOverdue),  color:"#f59e0b" },
          ].map((c,i) => (
            <div key={i} className="card3d-b" style={{ background:isGlass?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.03)", border:isGlass?"1px solid rgba(255,255,255,0.5)":`1px solid ${c.color}33` }}>
              <div style={{ fontSize:"1.6rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.78rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize:isMobile?"0.95rem":"1.1rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CARDS A RECEBER */}
        <p style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 12px 0" }}>
          {isPersonal ? "💚 A Receber" : "📥 Contas a Receber"}
        </p>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(2,1fr)", gap:16, marginBottom:28 }}>
          {[
            { icon:"📥", label:"A Receber", value:fmt(totalReceivable), color:theme.primary },
            { icon:"💰", label:"Recebidas", value:fmt(totalReceived),   color:theme.income  },
          ].map((c,i) => (
            <div key={i} className="card3d-b" style={{ background:isGlass?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.03)", border:isGlass?"1px solid rgba(255,255,255,0.5)":`1px solid ${c.color}33` }}>
              <div style={{ fontSize:"1.6rem" }}>{c.icon}</div>
              <div>
                <div style={{ color:theme.textMuted, fontSize:"0.78rem", marginBottom:2 }}>{c.label}</div>
                <div style={{ color:c.color, fontWeight:700, fontSize:isMobile?"0.95rem":"1.1rem" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
          <input type="text" placeholder="🔍 Buscar..." value={searchText} onChange={e=>setSearchText(e.target.value)}
            style={{ background:theme.bgInput, color:theme.textPrimary, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderInput}`, padding:"8px 14px", borderRadius:8, fontSize:13, outline:"none", width:isMobile?"100%":"180px", colorScheme, ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) }} />
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600 }}>Tipo:</span>
            {["all","payable","receivable"].map(f => (
              <button key={f} style={filterBtn(filter===f)} onClick={() => setFilter(f)}>
                {f==="all"?"Todos":f==="payable"?(isPersonal?"💸 Pagar":"A Pagar"):(isPersonal?"💚 Receber":"A Receber")}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:theme.textMuted, fontSize:"0.82rem", fontWeight:600 }}>Status:</span>
            {["all","pending","paid","overdue"].map(s => (
              <button key={s} style={filterBtn(statusFilter===s)} onClick={() => setStatusFilter(s)}>
                {s==="all"?"Todos":s==="pending"?"⏳ Pendente":s==="paid"?"✅ Pago":"🔴 Vencido"}
              </button>
            ))}
          </div>
          {(searchText||filter!=="all"||statusFilter!=="all") && (
            <button onClick={() => { setSearchText(""); setFilter("all"); setStatusFilter("all"); }}
              style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:13 }}>
              ✕ Limpar
            </button>
          )}
        </div>

        {/* TABELA */}
        <div className="table-bills">
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", color:theme.textMuted }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12, color:theme.textMuted }}>
              <span style={{ fontSize:"2rem" }}>📭</span><p>Nenhuma conta encontrada</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem", minWidth:isMobile?"580px":"unset" }}>
              <thead>
                <tr>
                  {["Descrição","Tipo","Valor","Vencimento","Status","Categoria","Ações"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"14px 18px", color:theme.textMuted, fontWeight:600, fontSize:"0.78rem", textTransform:"uppercase", letterSpacing:"0.05em", background:isGlass?"rgba(255,255,255,0.1)":theme.bgCard, borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.3)":theme.borderCard}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(bill => {
                  const overdue  = isOverdue(bill.due_date, bill.status);
                  const realSt   = bill.status!=="paid" && overdue ? "overdue" : bill.status;
                  const daysLeft = Math.round((new Date(bill.due_date+"T00:00:00") - today) / (1000*60*60*24));
                  return (
                    <tr key={bill.id} className="bill-row" style={{ borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}`, transition:"background 0.15s", background:"transparent" }}>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <span style={{ fontWeight:500, color:theme.textPrimary }}>{bill.description}</span>
                          {bill.notes && <span style={{ fontSize:"0.75rem", color:theme.textMuted }}>{bill.notes}</span>}
                          {isPersonal && bill.status!=="paid" && !overdue && daysLeft <= 7 && daysLeft >= 0 && (
                            <span style={{ fontSize:"0.7rem", color:"#f59e0b", fontWeight:600 }}>
                              ⏰ {daysLeft===0?"Vence hoje":`Vence em ${daysLeft} dia${daysLeft>1?"s":""}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}>
                        <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, background:bill.type==="payable"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", color:bill.type==="payable"?"#ef4444":theme.income }}>
                          {bill.type==="payable"?"📤 Pagar":"📥 Receber"}
                        </span>
                      </td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle", fontWeight:600, color:theme.textPrimary }}>{fmt(bill.amount)}</td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle", color:overdue?"#f59e0b":theme.textSecondary }}>
                        {fmtDate(bill.due_date)}{overdue&&<span style={{ marginLeft:4, fontSize:"0.7rem" }}>⚠️</span>}
                      </td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}><StatusBadge status={realSt} /></td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle", color:theme.textMuted }}>{bill.category||"—"}</td>
                      <td style={{ padding:"14px 18px", verticalAlign:"middle" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          {bill.status!=="paid" && (
                            <button style={{ background:`${theme.income}22`, border:`1px solid ${theme.income}44`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => handlePay(bill)} title="Marcar como pago">✅</button>
                          )}
                          <button style={{ background:isGlass?"rgba(255,255,255,0.25)":theme.bgCardHover, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":theme.borderCard}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => openEdit(bill)} title="Editar">✏️</button>
                          <button style={{ background:isGlass?"rgba(255,255,255,0.25)":`${theme.accent}22`, border:`1px solid ${isGlass?"rgba(255,255,255,0.4)":`${theme.accent}44`}`, borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => handleDuplicate(bill)} title="Duplicar">📋</button>
                          <button style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:"0.9rem" }} onClick={() => setDeleteConfirm(bill)} title="Excluir">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={closeModal}>
          <div style={{ ...modalBg, borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ margin:0, fontSize:"1.2rem", fontWeight:700, color:theme.textPrimary }}>{editingBill?"✏️ Editar Conta":"➕ Nova Conta"}</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14 }} onClick={closeModal}>✕</button>
            </div>

            {/* seletor visual tipo PF */}
            {isPersonal && (
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                {[{ v:"payable", label:"💸 A Pagar", color:"#ef4444" }, { v:"receivable", label:"💚 A Receber", color:theme.income }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setForm({...form, type:opt.v, category:""})}
                    style={{ flex:1, padding:"12px", borderRadius:10, border:`2px solid ${form.type===opt.v?opt.color:theme.borderCard}`, background:form.type===opt.v?`${opt.color}22`:"transparent", color:form.type===opt.v?opt.color:theme.textMuted, fontWeight:700, fontSize:15, cursor:"pointer", transition:"all 0.2s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16, marginBottom:20 }}>

                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={lbl}>Descrição *</label>
                  <input style={inp(theme, isGlass)} type="text" required placeholder={isPersonal?"Ex: Conta de luz, Salário...":"Ex: Fornecedor, Aluguel..."} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Valor *</label>
                  <input style={inp(theme, isGlass)} type="number" step="0.01" min="0" required placeholder="0,00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
                </div>

                {!isPersonal && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <label style={lbl}>Tipo *</label>
                    <select style={sel(theme, isGlass)} value={form.type} onChange={e=>setForm({...form,type:e.target.value,category:""})}>
                      <option value="payable">A Pagar</option>
                      <option value="receivable">A Receber</option>
                    </select>
                  </div>
                )}

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Status</label>
                  <select style={sel(theme, isGlass)} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Vencimento *</label>
                  <input style={inp(theme, isGlass)} type="date" required value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} />
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={lbl}>Data Pagamento</label>
                  <input style={inp(theme, isGlass)} type="date" value={form.paid_date} onChange={e=>setForm({...form,paid_date:e.target.value})} />
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={lbl}>Categoria</label>
                  <select style={sel(theme, isGlass)} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option value="">— Selecione —</option>
                    {formCats.map(c => <option key={c} value={c.replace(/^.* /,"")}>{c}</option>)}
                  </select>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:6, gridColumn:"1 / -1" }}>
                  <label style={lbl}>Observações</label>
                  <textarea style={{ ...inp(theme, isGlass), resize:"vertical", minHeight:70 }} placeholder="Informações adicionais..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
                </div>
              </div>

              {/* ✅ BLOCO RECORRÊNCIA — só para criação */}
              {!editingBill && (
                <div style={{ marginBottom:20, padding:"16px 20px", background:isGlass?"rgba(255,255,255,0.15)":theme.bgPrimary, borderRadius:12, border:`1px solid ${recurring?`${theme.primary}44`:isGlass?"rgba(255,255,255,0.3)":theme.border}`, transition:"border-color 0.2s" }}>

                  {/* toggle */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }} onClick={() => setRecurring(!recurring)}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:"1.1rem" }}>🔁</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:recurring?theme.primary:theme.textPrimary }}>Conta Recorrente</div>
                        <div style={{ fontSize:12, color:theme.textMuted }}>Aluguel, energia, assinaturas...</div>
                      </div>
                    </div>
                    <div style={{ width:44, height:24, borderRadius:12, background:recurring?theme.primary:"rgba(100,116,139,0.3)", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:3, left:recurring?22:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>

                  {/* opções */}
                  {recurring && (
                    <div style={{ marginTop:16, display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1, minWidth:140 }}>
                        <label style={lbl}>Frequência</label>
                        <select value={recurringFreq} onChange={e=>setRecurringFreq(e.target.value)} style={sel(theme, isGlass)}>
                          <option value="weekly">📅 Semanal</option>
                          <option value="monthly">📆 Mensal</option>
                          <option value="yearly">🗓️ Anual</option>
                        </select>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1, minWidth:140 }}>
                        <label style={lbl}>Repetições</label>
                        <select value={recurringQty} onChange={e=>setRecurringQty(e.target.value)} style={sel(theme, isGlass)}>
                          {recurringFreq === "weekly"  && [2,3,4,6,8,12,16,24,52].map(n => <option key={n} value={n}>{n}x ({n} semanas)</option>)}
                          {recurringFreq === "monthly" && [2,3,6,9,12,18,24].map(n => <option key={n} value={n}>{n}x ({n} meses)</option>)}
                          {recurringFreq === "yearly"  && [2,3,4,5].map(n => <option key={n} value={n}>{n}x ({n} anos)</option>)}
                        </select>
                      </div>
                      {/* preview datas */}
                      {form.due_date && (
                        <div style={{ padding:"10px 14px", background:isGlass?"rgba(255,255,255,0.2)":`${theme.primary}11`, borderRadius:10, border:`1px solid ${theme.primary}33`, fontSize:12, color:theme.textMuted, flex:1, minWidth:180 }}>
                          <div style={{ fontWeight:600, color:theme.primary, marginBottom:6 }}>📋 Preview das datas:</div>
                          {Array.from({ length: Math.min(parseInt(recurringQty)||2, 4) }).map((_, i) => {
                            let dt = form.due_date;
                            if (recurringFreq === "monthly") dt = addMonths(form.due_date, i);
                            if (recurringFreq === "weekly")  dt = addWeeks(form.due_date, i);
                            if (recurringFreq === "yearly")  dt = addYears(form.due_date, i);
                            const [y,m,d] = dt.split("-");
                            return <div key={i} style={{ marginBottom:2 }}>• {d}/{m}/{y}</div>;
                          })}
                          {parseInt(recurringQty) > 4 && <div style={{ color:theme.textMuted }}>+ {parseInt(recurringQty)-4} mais...</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
                <button type="button" style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={closeModal}>Cancelar</button>
                <button type="submit" disabled={savingRecurring}
                  style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:savingRecurring?"not-allowed":"pointer", opacity:savingRecurring?0.6:1, boxShadow:`0 4px 15px ${theme.primary}44`, width:isMobile?"100%":"auto" }}>
                  {savingRecurring
                    ? "Criando..."
                    : editingBill
                      ? "Salvar Alterações"
                      : recurring
                        ? `🔁 Criar ${recurringQty}x ${{ weekly:"Semanal", monthly:"Mensal", yearly:"Anual" }[recurringFreq]}`
                        : "Criar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, backdropFilter:"blur(4px)" }} onClick={()=>setDeleteConfirm(null)}>
          <div style={{ ...modalBg, border:"1px solid rgba(239,68,68,0.3)", borderRadius:18, padding:isMobile?"24px 20px":32, width:isMobile?"92%":"100%", maxWidth:400, boxShadow:isGlass?"0 20px 60px rgba(0,0,0,0.15)":"0 25px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:700, color:"#ef4444" }}>Excluir Conta</h2>
              <button style={{ background:isGlass?"rgba(255,255,255,0.4)":theme.bgCard, border:"none", color:theme.textPrimary, width:32, height:32, borderRadius:8, cursor:"pointer" }} onClick={()=>setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color:theme.textSecondary, marginBottom:24 }}>Excluir <strong style={{ color:theme.textPrimary }}>"{deleteConfirm.description}"</strong>? Esta ação não pode ser desfeita.</p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexDirection:isMobile?"column":"row" }}>
              <button style={{ background:isGlass?"rgba(255,255,255,0.3)":theme.bgCard, color:theme.textSecondary, border:`1px solid ${theme.borderCard}`, borderRadius:10, padding:"10px 20px", fontWeight:600, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={()=>setDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", width:isMobile?"100%":"auto" }} onClick={()=>handleDelete(deleteConfirm.id)}>Excluir</button>
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

function StatusBadge({ status }) {
  const map = {
    pending: { label:"⏳ Pendente", color:"#f59e0b", bg:"rgba(245,158,11,0.12)" },
    paid:    { label:"✅ Pago",     color:"#22c55e", bg:"rgba(34,197,94,0.12)"  },
    overdue: { label:"🔴 Vencido",  color:"#ef4444", bg:"rgba(239,68,68,0.12)" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, color:s.color, background:s.bg, border:`1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
}

const lbl = { color:"#94a3b8", fontSize:"0.8rem", fontWeight:600 };
function inp(theme, isGlass) {
  return { background:theme.bgInput, border:`1px solid ${theme.borderInput}`, borderRadius:10, padding:"10px 14px", color:theme.textPrimary, fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s", colorScheme:isGlass?"light":"dark", ...(isGlass&&{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}) };
}
function sel(theme, isGlass) {
  return { ...inp(theme, isGlass), cursor:"pointer", appearance:"auto" };
}
