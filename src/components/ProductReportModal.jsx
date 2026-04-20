import { useState } from "react";
import { PRINT_THEMES, buildPrintCSS } from "../utils/printThemes";

const API = "https://finance-control-api-production.up.railway.app/api";
const token = () => localStorage.getItem("token");

function fmt(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtN(v, dec = 2) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtDate(d) {
  if (!d) return "—";
  if (d.includes("-")) { const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; }
  return d;
}

const MOV_TYPE = {
  in:     { label: "Entrada",  color: "#22c55e" },
  out:    { label: "Saída",    color: "#ef4444" },
  adjust: { label: "Ajuste",   color: "#f59e0b" },
  entrada:{ label: "Entrada",  color: "#22c55e" },
  saida:  { label: "Saída",    color: "#ef4444" },
  ajuste: { label: "Ajuste",   color: "#f59e0b" },
};

export default function ProductReportModal({ onClose, theme, isGlass }) {
  const [step, setStep]           = useState("filters"); // filters | preview | print
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState(null);
  const [printTheme, setPrintTheme] = useState("blue");
  const [activeTab, setActiveTab] = useState("produtos"); // produtos | movimentacoes

  // Filtros
  const [tipo,       setTipo]       = useState("all");
  const [categoria,  setCategoria]  = useState("");
  const [status,     setStatus]     = useState("all");
  const [estoque,    setEstoque]    = useState("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim,    setDataFim]    = useState("");

  const cardBg     = isGlass ? "rgba(255,255,255,0.22)" : theme.bgCard;
  const cardBorder = isGlass ? "rgba(255,255,255,0.4)"  : theme.borderCard;
  const inputBg    = isGlass ? "rgba(255,255,255,0.4)"  : theme.bgInput;
  const textMain   = theme.textPrimary;
  const textSub    = theme.textSecondary || theme.textMuted;

  const inputStyle = {
    background: inputBg, border: `1px solid ${cardBorder}`,
    borderRadius: 8, padding: "9px 12px",
    color: textMain, fontSize: 14, outline: "none",
    colorScheme: isGlass ? "light" : "dark",
  };
  const selectStyle = { ...inputStyle, cursor: "pointer" };
  const labelStyle  = { color: textSub, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tipo, categoria, status, estoque });
      if (dataInicio) params.append("data_inicio", dataInicio);
      if (dataFim)    params.append("data_fim",    dataFim);
      const res  = await fetch(`${API}/products/report?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setReport(data);
      setStep("preview");
    } catch (e) { alert("Erro ao gerar relatório: " + e.message); }
    finally { setLoading(false); }
  };

  // ── GERA HTML COMPLETO PARA IMPRESSÃO ──────────────────
  const buildHTML = () => {
    if (!report) return "";
    const T   = PRINT_THEMES[printTheme] || PRINT_THEMES.blue;
    const ind = report.indicadores;
    const fmtV = v => (v||0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
    const fmtDateStr = d => { if (!d||d==="—") return "—"; if (d.includes("-")) { const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y}`; } return d; };

    const logoHtml = report.company_logo
      ? `<img src="${report.company_logo}" alt="Logo"/>`
      : `<span class="logo-placeholder">📦<br/>LOGO</span>`;

    // Filtros ativos
    const filtrosAtivos = [
      tipo !== "all"     && `Tipo: ${tipo === "product" ? "Produtos" : "Serviços"}`,
      categoria          && `Categoria: ${categoria}`,
      status !== "all"   && `Status: ${status === "active" ? "Ativos" : "Inativos"}`,
      estoque !== "all"  && `Estoque: ${estoque}`,
      dataInicio         && `De: ${fmtDateStr(dataInicio)}`,
      dataFim            && `Até: ${fmtDateStr(dataFim)}`,
    ].filter(Boolean).join(" &nbsp;·&nbsp; ") || "Todos os registros";

    // Linhas da tabela de produtos
    const prodRows = report.produtos.map((p, i) => `
      <tr style="${i%2===0?`background:${T.rowEven}`:""}">
        <td>${p.name}</td>
        <td class="mono">${p.sku}</td>
        <td class="muted">${p.type === "product" ? "Produto" : "Serviço"}</td>
        <td class="muted">${p.category}</td>
        <td class="right">${fmtV(p.cost)}</td>
        <td class="right income">${fmtV(p.price)}</td>
        <td class="right" style="color:${p.margin >= 30 ? T.incomeColor : "#f59e0b"}">${fmtN(p.margin, 1)}%</td>
        <td class="right" style="color:${p.stock_alert?"#ef4444":T.incomeColor}">
          ${p.type === "product" ? `${fmtN(p.stock_qty, 0)} ${p.unit}${p.stock_alert?" ⚠️":""}` : `${p.services_count} realiz.`}
        </td>
        <td class="right">${p.type === "product" ? fmtV(p.stock_value) : "—"}</td>
        <td style="color:${p.active?T.incomeColor:"#ef4444"}">${p.active ? "Ativo" : "Inativo"}</td>
      </tr>
    `).join("");

    // Linhas da tabela de movimentações
    const movRows = report.movimentacoes.map((m, i) => {
      const mt = MOV_TYPE[m.type] || { label: m.type, color: "#94a3b8" };
      return `
        <tr style="${i%2===0?`background:${T.rowEven}`:""}">
          <td>${fmtDateStr(m.date)}</td>
          <td>${m.product_name}</td>
          <td class="mono">${m.product_sku}</td>
          <td style="color:${mt.color};font-weight:600">${mt.label}</td>
          <td class="right" style="color:${mt.color};font-weight:700">${fmtN(m.qty, 2)}</td>
          <td class="right">${m.cost > 0 ? fmtV(m.cost) : "—"}</td>
          <td class="muted">${m.reason}</td>
        </tr>
      `;
    }).join("");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório de Produtos — ${report.company_name}</title>
  <style>
    ${buildPrintCSS(T)}
    .page-break { page-break-before: always; margin-top: 32px; }
    .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }
    .badge-alert { background:rgba(239,68,68,0.15); color:#ef4444; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
    .kpi { background:${T.cardBg}; border:1px solid ${T.cardBorder}; border-radius:8px; padding:10px 14px; }
    .kpi-label { font-size:9px; text-transform:uppercase; letter-spacing:0.05em; color:${T.mutedColor}; margin-bottom:3px; }
    .kpi-value { font-size:16px; font-weight:800; }
    .kpi-value.pos { color:${T.incomeColor}; }
    .kpi-value.neg { color:${T.expenseColor}; }
    .kpi-value.neu { color:${T.accent}; }
  </style>
</head>
<body>
  <div class="doc-wrapper">
    <div class="accent-bar-top"></div>
    <div class="glow-a"></div>
    <div class="glow-b"></div>

    <!-- CABEÇALHO -->
    <div class="doc-header">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div class="logo-box">${logoHtml}</div>
        <div>
          <div class="company-name">${report.company_name}</div>
          <div class="company-meta">
            Relatório de Produtos &amp; Estoque<br/>
            Filtros: ${filtrosAtivos}
          </div>
        </div>
      </div>
      <div>
        <div class="doc-title">PRODUTOS</div>
        <div class="doc-subtitle">
          Emitido em: ${report.emitido_em}<br/>
          ${report.produtos.length} produto(s) &nbsp;·&nbsp; ${report.movimentacoes.length} movimentação(ões)
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- KPIs -->
    <div class="section-title">Indicadores</div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Produtos</div><div class="kpi-value neu">${ind.total_produtos}</div></div>
      <div class="kpi"><div class="kpi-label">Serviços</div><div class="kpi-value neu">${ind.total_servicos}</div></div>
      <div class="kpi"><div class="kpi-label">Alertas Estoque</div><div class="kpi-value ${ind.total_alertas>0?"neg":"pos"}">${ind.total_alertas}</div></div>
      <div class="kpi"><div class="kpi-label">Valor em Estoque</div><div class="kpi-value pos">${fmtV(ind.valor_estoque)}</div></div>
      <div class="kpi"><div class="kpi-label">Margem Média</div><div class="kpi-value ${ind.margem_media>=20?"pos":"neg"}">${fmtN(ind.margem_media,1)}%</div></div>
      <div class="kpi"><div class="kpi-label">Entradas (mov.)</div><div class="kpi-value pos">${fmtN(ind.total_mov_in,0)}</div></div>
      <div class="kpi"><div class="kpi-label">Saídas (mov.)</div><div class="kpi-value neg">${fmtN(ind.total_mov_out,0)}</div></div>
      <div class="kpi"><div class="kpi-label">Total Movim.</div><div class="kpi-value neu">${ind.total_mov}</div></div>
    </div>

    <div class="divider"></div>

    <!-- ABA 1: PRODUTOS -->
    <div class="section-title">Catálogo de Produtos &amp; Serviços</div>
    ${report.produtos.length === 0
      ? `<div style="text-align:center;padding:24px;color:${T.mutedColor}">Nenhum produto encontrado com os filtros selecionados.</div>`
      : `<table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>SKU</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th class="right">Custo</th>
              <th class="right">Preço</th>
              <th class="right">Margem</th>
              <th class="right">Estoque/Serv.</th>
              <th class="right">Valor Estq.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${prodRows}</tbody>
        </table>`
    }

    <!-- ABA 2: MOVIMENTAÇÕES (nova página) -->
    <div class="page-break">
      <div class="accent-bar-top" style="border-radius:0"></div>
    </div>

    <!-- Cabeçalho repetido na 2ª página -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:14px;font-weight:700;color:${T.titleColor}">${report.company_name}</div>
        <div style="font-size:10px;color:${T.mutedColor}">Relatório de Produtos — Movimentações de Estoque</div>
      </div>
      <div style="font-size:10px;color:${T.mutedColor};text-align:right">
        Emitido em: ${report.emitido_em}
      </div>
    </div>

    <div class="divider"></div>

    <div class="section-title">Movimentações de Estoque</div>
    ${report.movimentacoes.length === 0
      ? `<div style="text-align:center;padding:24px;color:${T.mutedColor}">Nenhuma movimentação no período selecionado.</div>`
      : `<table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>SKU</th>
              <th>Tipo</th>
              <th class="right">Qtd.</th>
              <th class="right">Custo Unit.</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>${movRows}</tbody>
        </table>`
    }

    <div class="doc-footer">
      SV Finance Control &nbsp;·&nbsp; ${report.company_name} &nbsp;·&nbsp; Gerado em ${report.emitido_em}
    </div>
    <div class="accent-bar-bottom"></div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = buildHTML();
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  // ── RENDER ────────────────────────────────────────────
  const card = { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20, backdropFilter: isGlass ? "blur(16px)" : undefined };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(4px)" }}
      onClick={onClose}>
      <div style={{ background: isGlass ? "rgba(255,255,255,0.18)" : "#0f172a", border: `1px solid ${cardBorder}`, borderRadius: 20, width: "95%", maxWidth: step === "preview" ? 1000 : 560, maxHeight: "92vh", overflowY: "auto", backdropFilter: isGlass ? "blur(24px)" : undefined }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: textMain, fontWeight: 700, fontSize: 16 }}>📦 Relatório de Produtos</div>
            <div style={{ color: textSub, fontSize: 12, marginTop: 2 }}>
              {step === "filters" ? "Configure os filtros antes de gerar" : `${report?.produtos?.length || 0} produtos · ${report?.movimentacoes?.length || 0} movimentações`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: textSub, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>

          {/* ── STEP: FILTROS ── */}
          {step === "filters" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                    <option value="all">Todos</option>
                    <option value="product">Produtos</option>
                    <option value="service">Serviços</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Situação Estoque</label>
                  <select value={estoque} onChange={e => setEstoque(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                    <option value="all">Todos</option>
                    <option value="ok">Em dia (acima do mínimo)</option>
                    <option value="alert">Em alerta (abaixo do mínimo)</option>
                    <option value="zero">Zerado</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Informática, Serviços..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ ...card, background: isGlass ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)" }}>
                <div style={{ color: textSub, fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  📅 Período para Movimentações (opcional)
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>De</label>
                    <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Até</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                  </div>
                </div>
                {!dataInicio && !dataFim && (
                  <div style={{ color: textSub, fontSize: 11, marginTop: 8, opacity: 0.7 }}>
                    Sem filtro de período — todas as movimentações serão incluídas.
                  </div>
                )}
              </div>

              {/* Tema PDF */}
              <div>
                <label style={labelStyle}>Tema do PDF</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.values(PRINT_THEMES).map(t => (
                    <button key={t.id} onClick={() => setPrintTheme(t.id)}
                      style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${printTheme === t.id ? theme.primary : cardBorder}`, background: printTheme === t.id ? `${theme.primary}22` : "transparent", color: printTheme === t.id ? theme.textActive : textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: "transparent", color: textSub, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  Cancelar
                </button>
                <button onClick={fetchReport} disabled={loading}
                  style={{ padding: "10px 28px", borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, background: theme.primaryGrad, color: "#fff", opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${theme.primary}44` }}>
                  {loading ? "⏳ Gerando..." : "📊 Gerar Relatório"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === "preview" && report && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { icon: "📦", label: "Produtos",       valor: report.indicadores.total_produtos,   color: theme.primary },
                  { icon: "⚙️", label: "Serviços",       valor: report.indicadores.total_servicos,   color: theme.primary },
                  { icon: "⚠️", label: "Alertas",        valor: report.indicadores.total_alertas,    color: report.indicadores.total_alertas > 0 ? "#ef4444" : theme.income },
                  { icon: "💰", label: "Valor Estoque",  valor: fmt(report.indicadores.valor_estoque), color: theme.income, isStr: true },
                  { icon: "📊", label: "Margem Média",   valor: `${fmtN(report.indicadores.margem_media, 1)}%`, color: theme.income, isStr: true },
                  { icon: "📥", label: "Entradas (mov)", valor: fmtN(report.indicadores.total_mov_in, 0), color: theme.income, isStr: true },
                  { icon: "📤", label: "Saídas (mov)",   valor: fmtN(report.indicadores.total_mov_out, 0), color: "#ef4444", isStr: true },
                  { icon: "🔄", label: "Movimentações",  valor: report.indicadores.total_mov,        color: textSub },
                ].map((k, i) => (
                  <div key={i} style={{ ...card, padding: "12px 14px" }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
                    <div style={{ fontSize: 10, color: textSub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{k.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: k.color }}>{k.isStr ? k.valor : k.valor}</div>
                  </div>
                ))}
              </div>

              {/* Abas */}
              <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${cardBorder}`, paddingBottom: 0 }}>
                {[
                  { key: "produtos",       label: `📦 Produtos (${report.produtos.length})` },
                  { key: "movimentacoes",  label: `🔄 Movimentações (${report.movimentacoes.length})` },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{ padding: "8px 16px", borderRadius: "8px 8px 0 0", border: `1px solid ${cardBorder}`, borderBottom: activeTab === tab.key ? "none" : `1px solid ${cardBorder}`, background: activeTab === tab.key ? (isGlass ? "rgba(255,255,255,0.2)" : theme.bgCard) : "transparent", color: activeTab === tab.key ? textMain : textSub, fontWeight: activeTab === tab.key ? 700 : 400, fontSize: 13, cursor: "pointer", marginBottom: -1 }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tabela Produtos */}
              {activeTab === "produtos" && (
                <div style={{ overflowX: "auto", border: `1px solid ${cardBorder}`, borderRadius: "0 8px 8px 8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Nome","SKU","Tipo","Categoria","Custo","Preço","Margem","Estoque","Vlr Estq.","Status"].map(h => (
                          <th key={h} style={{ padding: "9px 10px", background: isGlass ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", color: textSub, fontWeight: 600, fontSize: 10, textTransform: "uppercase", textAlign: "left", borderBottom: `1px solid ${cardBorder}`, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.produtos.length === 0 ? (
                        <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: textSub }}>Nenhum produto encontrado</td></tr>
                      ) : report.produtos.map((p, i) => (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? (isGlass ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)") : "transparent", borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}` }}>
                          <td style={{ padding: "8px 10px", color: textMain, fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: "8px 10px", color: textSub, fontFamily: "monospace", fontSize: 11 }}>{p.sku}</td>
                          <td style={{ padding: "8px 10px", color: textSub }}>{p.type === "product" ? "📦" : "⚙️"}</td>
                          <td style={{ padding: "8px 10px", color: textSub }}>{p.category}</td>
                          <td style={{ padding: "8px 10px", color: textSub, textAlign: "right" }}>{fmt(p.cost)}</td>
                          <td style={{ padding: "8px 10px", color: theme.income, fontWeight: 700, textAlign: "right" }}>{fmt(p.price)}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: p.margin >= 30 ? theme.income : "#f59e0b", fontWeight: 600 }}>{fmtN(p.margin, 1)}%</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: p.stock_alert ? "#ef4444" : theme.income, fontWeight: 600 }}>
                            {p.type === "product" ? `${fmtN(p.stock_qty, 0)} ${p.unit}${p.stock_alert ? " ⚠️" : ""}` : `${p.services_count} realiz.`}
                          </td>
                          <td style={{ padding: "8px 10px", color: textSub, textAlign: "right" }}>{p.type === "product" ? fmt(p.stock_value) : "—"}</td>
                          <td style={{ padding: "8px 10px", color: p.active ? theme.income : "#ef4444", fontWeight: 600, fontSize: 11 }}>{p.active ? "Ativo" : "Inativo"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabela Movimentações */}
              {activeTab === "movimentacoes" && (
                <div style={{ overflowX: "auto", border: `1px solid ${cardBorder}`, borderRadius: "0 8px 8px 8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Data","Produto","SKU","Tipo","Qtd.","Custo Unit.","Motivo"].map(h => (
                          <th key={h} style={{ padding: "9px 10px", background: isGlass ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", color: textSub, fontWeight: 600, fontSize: 10, textTransform: "uppercase", textAlign: "left", borderBottom: `1px solid ${cardBorder}`, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.movimentacoes.length === 0 ? (
                        <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: textSub }}>Nenhuma movimentação no período</td></tr>
                      ) : report.movimentacoes.map((m, i) => {
                        const mt = MOV_TYPE[m.type] || { label: m.type, color: "#94a3b8" };
                        return (
                          <tr key={m.id} style={{ background: i % 2 === 0 ? (isGlass ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)") : "transparent", borderBottom: `1px solid ${isGlass ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}` }}>
                            <td style={{ padding: "8px 10px", color: textSub }}>{fmtDate(m.date)}</td>
                            <td style={{ padding: "8px 10px", color: textMain, fontWeight: 600 }}>{m.product_name}</td>
                            <td style={{ padding: "8px 10px", color: textSub, fontFamily: "monospace", fontSize: 11 }}>{m.product_sku}</td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{ background: `${mt.color}22`, color: mt.color, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{mt.label}</span>
                            </td>
                            <td style={{ padding: "8px 10px", color: mt.color, fontWeight: 700, textAlign: "right" }}>{fmtN(m.qty, 2)}</td>
                            <td style={{ padding: "8px 10px", color: textSub, textAlign: "right" }}>{m.cost > 0 ? fmt(m.cost) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: textSub }}>{m.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ações */}
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <button onClick={() => { setStep("filters"); setReport(null); }}
                  style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: "transparent", color: textSub, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  ← Ajustar Filtros
                </button>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: textSub }}>Tema:</span>
                  {Object.values(PRINT_THEMES).map(t => (
                    <button key={t.id} onClick={() => setPrintTheme(t.id)}
                      style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${printTheme === t.id ? theme.primary : cardBorder}`, background: printTheme === t.id ? `${theme.primary}22` : "transparent", color: printTheme === t.id ? theme.textActive : textSub, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {t.label}
                    </button>
                  ))}
                  <button onClick={handlePrint}
                    style={{ padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#1e40af,#2563eb)", color: "#fff", boxShadow: "0 4px 16px rgba(37,99,235,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
                    🖨️ Imprimir / PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
