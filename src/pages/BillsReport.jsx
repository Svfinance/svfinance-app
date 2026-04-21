import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";
import logoGif from "../assets/video.gif";
import { PRINT_THEMES, buildPrintCSS } from "../utils/printThemes";

const API = "https://finance-control-api-production.up.railway.app/api";
const token = () => localStorage.getItem("token");

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmt(v) {
  return (Math.abs(v||0)).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function fmtDate(d) {
  if (!d || d === "—") return "—";
  try { const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; } catch { return d; }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

const URGENCY = {
  vencidas:    { label:"🔴 Vencidas",              color:"#ef4444", bg:"rgba(239,68,68,0.08)",  border:"rgba(239,68,68,0.25)"  },
  a_vencer_7:  { label:"⚠️ Vence em até 7 dias",  color:"#f59e0b", bg:"rgba(245,158,11,0.08)", border:"rgba(245,158,11,0.25)" },
  a_vencer_15: { label:"🟡 Vence em 8 a 15 dias", color:"#eab308", bg:"rgba(234,179,8,0.07)",  border:"rgba(234,179,8,0.25)"  },
  a_vencer_30: { label:"🔵 Vence em 16 a 30 dias",color:"#3b82f6", bg:"rgba(59,130,246,0.07)", border:"rgba(59,130,246,0.25)" },
  a_vencer_30_plus:{ label:"⏳ Vence em +30 dias", color:"#6366f1", bg:"rgba(99,102,241,0.07)", border:"rgba(99,102,241,0.25)" },
  pagas:       { label:"✅ Pagas no Período",      color:"#22c55e", bg:"rgba(34,197,94,0.07)",  border:"rgba(34,197,94,0.25)"  },
};

export default function BillsReport() {
  const { theme, themeId } = useTheme();
  const isGlass  = themeId === "glass" || themeId === "gray";
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData]               = useState(null);
  const [anos, setAnos]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [printTheme, setPrintTheme]   = useState(themeId || "blue");
  const [expanded, setExpanded]       = useState({ vencidas:true, a_vencer_7:true, a_vencer_15:true, a_vencer_30:false, a_vencer_30_plus:false, pagas:false });

  // Filtros
  const [periodo,    setPeriodo]    = useState("mes");
  const [ano,        setAno]        = useState(new Date().getFullYear().toString());
  const [mes,        setMes]        = useState((new Date().getMonth() + 1).toString());
  const [trimestre,  setTrimestre]  = useState("1");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim,    setDataFim]    = useState("");
  const [tipo,       setTipo]       = useState("all");

  useEffect(() => {
    fetch(`${API}/bills/report/anos`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setAnos(d.anos || [])).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ periodo, ano, tipo });
      if (periodo === "mes")           params.append("mes", mes);
      if (periodo === "trimestre")     params.append("trimestre", trimestre);
      if (periodo === "personalizado") {
        params.append("data_inicio", dataInicio);
        params.append("data_fim",    dataFim);
      }
      const res  = await fetch(`${API}/bills/report?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.status === 401) { navigate("/"); return; }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── IMPRESSÃO ─────────────────────────────────────────
  const handlePrint = () => {
    if (!data) return;
    const T  = PRINT_THEMES[printTheme] || PRINT_THEMES.blue;
    const s  = data.secoes;
    const tt = data.totais;

    const logoHtml = data.company_logo
      ? `<img src="${data.company_logo}" alt="Logo"/>`
      : `<span class="logo-placeholder">📄<br/>LOGO</span>`;

    const buildSection = (bills, urgKey, showDays = false, showPaid = false) => {
      if (!bills.length) return "";
      const u = URGENCY[urgKey];
      const rows = bills.map((b, i) => `
        <tr style="${i%2===0?`background:${T.rowEven}`:""}">
          <td>${b.description}</td>
          <td class="muted">${b.category}</td>
          <td style="color:${b.type==="payable"?T.expenseColor:T.incomeColor};font-weight:600">
            ${b.type==="payable"?"📤 Pagar":"📥 Receber"}
          </td>
          <td class="right" style="font-weight:700;color:${b.type==="payable"?T.expenseColor:T.incomeColor}">${fmt(b.amount)}</td>
          <td class="muted">${fmtDate(b.due_date)}</td>
          ${showPaid ? `<td class="muted">${fmtDate(b.paid_date)}</td>` : ""}
          ${showDays && b.days_late  !== undefined ? `<td style="color:${T.expenseColor};font-weight:600">${b.days_late}d atrasado</td>` : ""}
          ${showDays && b.days_until !== undefined ? `<td style="color:${u.color};font-weight:600">em ${b.days_until}d</td>` : ""}
        </tr>
      `).join("");
      const totalAmt = bills.reduce((s,b) => s+b.amount, 0);
      const cols = showPaid ? 6 : showDays ? 6 : 5;
      return `
        <div style="margin-bottom:20px">
          <div style="background:${u.color}22;border-left:4px solid ${u.color};padding:8px 14px;border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;color:${u.color};font-size:12px">${u.label}</span>
            <span style="font-weight:800;color:${u.color};font-size:13px">${fmt(totalAmt)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th class="right">Valor</th>
                <th>Vencimento</th>
                ${showPaid ? "<th>Pago em</th>" : ""}
                ${showDays ? "<th>Prazo</th>" : ""}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    };

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Contas a Pagar/Receber — ${data.company_name}</title>
  <style>
    ${buildPrintCSS(T)}
    .section-header { background:${T.accentLight}; border-left:4px solid ${T.accent}; padding:8px 14px; border-radius:4px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; }
    .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
    .kpi { background:${T.cardBg}; border:1px solid ${T.cardBorder}; border-radius:8px; padding:10px 14px; }
    .kpi-label { font-size:9px; text-transform:uppercase; letter-spacing:0.05em; color:${T.mutedColor}; margin-bottom:3px; }
    .kpi-value { font-size:14px; font-weight:800; }
    .kpi-value.pos { color:${T.incomeColor}; }
    .kpi-value.neg { color:${T.expenseColor}; }
    .kpi-value.warn { color:#f59e0b; }
  </style>
</head>
<body>
  <div class="doc-wrapper">
    <div class="accent-bar-top"></div>
    <div class="glow-a"></div>
    <div class="glow-b"></div>

    <div class="doc-header">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div class="logo-box">${logoHtml}</div>
        <div>
          <div class="company-name">${data.company_name}</div>
          <div class="company-meta">
            Relatório de Contas a Pagar e Receber<br/>
            Período: <strong>${data.periodo}</strong>
            ${tipo !== "all" ? ` · Filtro: ${tipo === "payable" ? "A Pagar" : "A Receber"}` : ""}
          </div>
        </div>
      </div>
      <div>
        <div class="doc-title">CONTAS</div>
        <div class="doc-subtitle">
          Emitido em: ${data.emitido_em}<br/>
          ${tt.total_contas} conta(s) no total
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section-title">Resumo Geral</div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">🔴 Total Vencido (Pagar)</div><div class="kpi-value neg">${fmt(tt.vencidas_payable)}</div></div>
      <div class="kpi"><div class="kpi-label">🔴 Total Vencido (Receber)</div><div class="kpi-value pos">${fmt(tt.vencidas_receivable)}</div></div>
      <div class="kpi"><div class="kpi-label">⚠️ A Vencer (Pagar)</div><div class="kpi-value warn">${fmt(tt.a_vencer_payable)}</div></div>
      <div class="kpi"><div class="kpi-label">⚠️ A Vencer (Receber)</div><div class="kpi-value pos">${fmt(tt.a_vencer_receivable)}</div></div>
      <div class="kpi"><div class="kpi-label">✅ Pagas no Período</div><div class="kpi-value neg">${fmt(tt.pagas_payable)}</div></div>
      <div class="kpi"><div class="kpi-label">✅ Recebidas no Período</div><div class="kpi-value pos">${fmt(tt.pagas_receivable)}</div></div>
    </div>

    <div class="divider"></div>

    ${buildSection(s.vencidas,        "vencidas",        true,  false)}
    ${buildSection(s.a_vencer_7,      "a_vencer_7",      true,  false)}
    ${buildSection(s.a_vencer_15,     "a_vencer_15",     true,  false)}
    ${buildSection(s.a_vencer_30,     "a_vencer_30",     true,  false)}
    ${buildSection(s.a_vencer_30_plus,"a_vencer_30_plus",true,  false)}
    ${buildSection(s.pagas,           "pagas",           false, true )}

    <div class="doc-footer">
      SV Finance Control &nbsp;·&nbsp; ${data.company_name} &nbsp;·&nbsp; Gerado em ${data.emitido_em}
    </div>
    <div class="accent-bar-bottom"></div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  // ── estilos ──
  const card = {
    background:     isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard,
    border:         `1px solid ${isGlass ? "rgba(255,255,255,0.4)" : theme.borderCard}`,
    borderRadius:   16,
    backdropFilter: isGlass ? "blur(16px)" : undefined,
  };
  const inputStyle = {
    background:   isGlass ? "rgba(255,255,255,0.4)" : theme.bgInput,
    border:       `1px solid ${isGlass ? "rgba(255,255,255,0.5)" : theme.borderInput}`,
    borderRadius: 8, padding: "9px 12px",
    color: theme.textPrimary, fontSize: 14, outline: "none",
    colorScheme: isGlass ? "light" : "dark",
  };
  const filterBtn = (active) => ({
    padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
    border:`1px solid ${active?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`,
    background: active ? `${theme.primary}22` : "transparent",
    color: active ? theme.textActive : theme.textMuted,
  });

  const tt = data?.totais || {};
  const s  = data?.secoes || {};

  // Seções a renderizar com metadados
  const SECOES = [
    { key:"vencidas",         bills: s.vencidas,         showDays:true,  showPaid:false, dayField:"days_late"  },
    { key:"a_vencer_7",       bills: s.a_vencer_7,       showDays:true,  showPaid:false, dayField:"days_until" },
    { key:"a_vencer_15",      bills: s.a_vencer_15,      showDays:true,  showPaid:false, dayField:"days_until" },
    { key:"a_vencer_30",      bills: s.a_vencer_30,      showDays:true,  showPaid:false, dayField:"days_until" },
    { key:"a_vencer_30_plus", bills: s.a_vencer_30_plus, showDays:true,  showPaid:false, dayField:"days_until" },
    { key:"pagas",            bills: s.pagas,            showDays:false, showPaid:true,  dayField:null         },
  ];

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .br-anim { animation:fadeUp 0.4s ease forwards; }
        .br-row:hover { filter:brightness(1.06); cursor:default; }
      `}</style>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex:1, overflowY:"auto", padding: isMobile?"72px 16px 40px":"32px 36px", position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src={logoGif} alt="logo" style={{ width:isMobile?44:60, height:isMobile?44:60, objectFit:"contain", filter:"drop-shadow(0 0 10px rgba(255,255,255,0.3))" }} />
            <div>
              <h1 style={{ fontSize:isMobile?"20px":"1.75rem", fontWeight:700, margin:0, color:theme.textPrimary }}>
                Contas a Pagar / Receber
              </h1>
              <p style={{ color:theme.textMuted, margin:"4px 0 0", fontSize:"0.85rem" }}>
                Vencidas, a vencer e pagas no período
              </p>
            </div>
          </div>
          {data && (
            <button onClick={handlePrint}
              style={{ background:"linear-gradient(135deg,#1e40af,#2563eb)", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(37,99,235,0.4)", whiteSpace:"nowrap" }}>
              🖨️ Imprimir / PDF
            </button>
          )}
        </div>

        {/* FILTROS */}
        <div style={{ ...card, padding:"20px 24px", marginBottom:24 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:14, alignItems:"flex-end" }}>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ ...inputStyle, minWidth:160 }}>
                <option value="mes">Mês</option>
                <option value="trimestre">Trimestre</option>
                <option value="ano">Ano Completo</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {periodo !== "personalizado" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Ano</label>
                <select value={ano} onChange={e => setAno(e.target.value)} style={inputStyle}>
                  {(anos.length ? anos : [new Date().getFullYear().toString()]).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}

            {periodo === "mes" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)} style={inputStyle}>
                  {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}

            {periodo === "trimestre" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Trimestre</label>
                <select value={trimestre} onChange={e => setTrimestre(e.target.value)} style={inputStyle}>
                  <option value="1">1º Tri (Jan-Mar)</option>
                  <option value="2">2º Tri (Abr-Jun)</option>
                  <option value="3">3º Tri (Jul-Set)</option>
                  <option value="4">4º Tri (Out-Dez)</option>
                </select>
              </div>
            )}

            {periodo === "personalizado" && (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>De</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Até</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} />
                </div>
              </>
            )}

            {/* Tipo */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Tipo</label>
              <div style={{ display:"flex", gap:6 }}>
                {[
                  { v:"all",        label:"Todos"      },
                  { v:"payable",    label:"📤 A Pagar" },
                  { v:"receivable", label:"📥 A Receber"},
                ].map(t => (
                  <button key={t.v} style={filterBtn(tipo===t.v)} onClick={() => setTipo(t.v)}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Tema PDF */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ color:theme.textMuted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Tema PDF</label>
              <div style={{ display:"flex", gap:6 }}>
                {Object.values(PRINT_THEMES).map(t => (
                  <button key={t.id} onClick={() => setPrintTheme(t.id)}
                    style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${printTheme===t.id?theme.primary:isGlass?"rgba(255,255,255,0.3)":theme.borderCard}`, background:printTheme===t.id?`${theme.primary}22`:"transparent", color:printTheme===t.id?theme.textActive:theme.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={fetchData} disabled={loading}
              style={{ background:theme.primaryGrad, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, cursor:loading?"not-allowed":"pointer", fontSize:"0.9rem", opacity:loading?0.7:1, alignSelf:"flex-end", boxShadow:`0 4px 15px ${theme.primary}44`, whiteSpace:"nowrap" }}>
              {loading ? "⏳ Gerando..." : "📊 Gerar Relatório"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#ef4444", fontSize:14 }}>
            ❌ {error}
          </div>
        )}

        {!data && !loading && (
          <div style={{ ...card, padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>📄</div>
            <div style={{ color:theme.textPrimary, fontWeight:600, fontSize:16, marginBottom:8 }}>Configure o período e clique em "Gerar Relatório"</div>
            <div style={{ color:theme.textMuted, fontSize:13 }}>O relatório mostrará contas vencidas, a vencer e pagas no período selecionado</div>
          </div>
        )}

        {data && (
          <div className="br-anim">

            {/* CARDS RESUMO */}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)", gap:14, marginBottom:24 }}>
              {[
                { icon:"🔴", label:"Total Vencido",    valor:fmt(tt.vencidas_total),  color:"#ef4444",    count: s.vencidas?.length        },
                { icon:"⚠️", label:"A Vencer",         valor:fmt(tt.a_vencer_total),  color:"#f59e0b",    count: (s.a_vencer_7?.length||0)+(s.a_vencer_15?.length||0)+(s.a_vencer_30?.length||0)+(s.a_vencer_30_plus?.length||0) },
                { icon:"✅", label:"Pagas no Período", valor:fmt(tt.pagas_total),     color:theme.income, count: s.pagas?.length            },
              ].map((c,i) => (
                <div key={i} style={{ ...card, padding:"18px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:"1.4rem", marginBottom:6 }}>{c.icon}</div>
                      <div style={{ fontSize:"0.72rem", color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{c.label}</div>
                      <div style={{ fontSize:isMobile?"1rem":"1.2rem", fontWeight:800, color:c.color }}>{c.valor}</div>
                    </div>
                    <div style={{ background:`${c.color}22`, border:`1px solid ${c.color}44`, borderRadius:20, padding:"4px 10px", fontSize:12, fontWeight:700, color:c.color }}>
                      {c.count} conta{c.count!==1?"s":""}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DETALHAMENTO a pagar vs a receber */}
            {tipo === "all" && (
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14, marginBottom:24 }}>
                <div style={{ ...card, padding:"16px 20px" }}>
                  <div style={{ fontSize:12, color:theme.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>📤 Total a Pagar</div>
                  {[
                    { label:"Vencido",  valor:tt.vencidas_payable,   color:"#ef4444" },
                    { label:"A vencer", valor:tt.a_vencer_payable,   color:"#f59e0b" },
                    { label:"Pago",     valor:tt.pagas_payable,      color:theme.income },
                  ].map((r,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.1)":theme.border}` }}>
                      <span style={{ fontSize:13, color:theme.textSecondary }}>{r.label}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:r.color }}>{fmt(r.valor)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...card, padding:"16px 20px" }}>
                  <div style={{ fontSize:12, color:theme.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>📥 Total a Receber</div>
                  {[
                    { label:"Vencido",   valor:tt.vencidas_receivable,  color:"#ef4444" },
                    { label:"A vencer",  valor:tt.a_vencer_receivable,  color:"#f59e0b" },
                    { label:"Recebido",  valor:tt.pagas_receivable,     color:theme.income },
                  ].map((r,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.1)":theme.border}` }}>
                      <span style={{ fontSize:13, color:theme.textSecondary }}>{r.label}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:r.color }}>{fmt(r.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÕES EXPANSÍVEIS */}
            {SECOES.map(({ key, bills, showDays, showPaid, dayField }) => {
              if (!bills || bills.length === 0) return null;
              const u       = URGENCY[key];
              const isOpen  = expanded[key];
              const totalSec = bills.reduce((s,b) => s+b.amount, 0);

              return (
                <div key={key} style={{ marginBottom:16 }}>
                  {/* Header da seção */}
                  <div
                    onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:u.bg, border:`1px solid ${u.border}`, borderRadius: isOpen ? "12px 12px 0 0" : 12, cursor:"pointer", transition:"border-radius 0.2s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:9, color:u.color, transform: isOpen?"rotate(90deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>▶</span>
                      <span style={{ fontWeight:700, color:u.color, fontSize:14 }}>{u.label}</span>
                      <span style={{ background:`${u.color}22`, color:u.color, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{bills.length}</span>
                    </div>
                    <span style={{ fontWeight:800, color:u.color, fontSize:15 }}>{fmt(totalSec)}</span>
                  </div>

                  {/* Tabela da seção */}
                  {isOpen && (
                    <div style={{ border:`1px solid ${u.border}`, borderTop:"none", borderRadius:"0 0 12px 12px", overflow:"hidden" }}>
                      {/* Header tabela */}
                      <div style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr", gap:0, padding:"9px 16px", background:isGlass?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.03)", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.15)":theme.border}` }}>
                        {["Descrição","Tipo","Valor","Vencimento", showPaid?"Pago em":showDays?"Prazo":""].filter(Boolean).map((h,i) => (
                          <div key={i} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:theme.textMuted, textAlign:i>=2?"right":"left" }}>{h}</div>
                        ))}
                      </div>

                      {/* Linhas */}
                      {bills.map((b, i) => {
                        const isPayable = b.type === "payable";
                        return (
                          <div key={b.id} className="br-row"
                            style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr", gap:0, padding:"11px 16px", borderBottom:`1px solid ${isGlass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`, background: i%2===0?(isGlass?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.015)"):"transparent", transition:"filter 0.15s" }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:500, color:theme.textPrimary }}>{b.description}</div>
                              {b.category !== "—" && <div style={{ fontSize:11, color:theme.textMuted }}>{b.category}</div>}
                            </div>
                            <div style={{ display:"flex", alignItems:"center" }}>
                              <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:isPayable?"rgba(239,68,68,0.12)":"rgba(34,197,94,0.12)", color:isPayable?"#ef4444":theme.income }}>
                                {isPayable?"Pagar":"Receber"}
                              </span>
                            </div>
                            <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:isPayable?theme.expense:theme.income, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
                              {fmt(b.amount)}
                            </div>
                            <div style={{ textAlign:"right", fontSize:12, color:theme.textSecondary, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
                              {fmtDate(b.due_date)}
                            </div>
                            <div style={{ textAlign:"right", fontSize:12, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
                              {showPaid && <span style={{ color:theme.income, fontWeight:600 }}>{fmtDate(b.paid_date)}</span>}
                              {showDays && dayField === "days_late"  && <span style={{ color:"#ef4444", fontWeight:700 }}>{b.days_late}d atrasado</span>}
                              {showDays && dayField === "days_until" && <span style={{ color:u.color, fontWeight:700 }}>em {b.days_until}d</span>}
                            </div>
                          </div>
                        );
                      })}

                      {/* Total da seção */}
                      <div style={{ display:"grid", gridTemplateColumns:isMobile?"2fr 1fr 1fr":"3fr 1fr 1fr 1fr 1fr", gap:0, padding:"11px 16px", background:`${u.color}11` }}>
                        <div style={{ fontSize:13, fontWeight:700, color:u.color }}>Total da seção</div>
                        <div></div>
                        <div style={{ textAlign:"right", fontSize:14, fontWeight:800, color:u.color }}>{fmt(totalSec)}</div>
                        <div></div>
                        <div></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}