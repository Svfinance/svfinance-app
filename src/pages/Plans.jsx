// src/pages/Plans.jsx
// ─────────────────────────────────────────────────────────────
// Página de planos e assinatura SaaS.
// Mostra os 3 planos (Free Trial / Pro Fundador / Business Fundador)
// com toggle mensal/anual. Abre CheckoutModal ao clicar em assinar.
// Usa PlanContext para saber o plano atual e atualizar após checkout.
// ─────────────────────────────────────────────────────────────

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePlan } from "../contexts/PlanContext"
import CheckoutModal from "../components/CheckoutModal"
import PlanBadge from "../components/PlanBadge"

// ── Dados dos planos ─────────────────────────────────────────
const PLAN_DATA = [
  {
    id:       "free",
    name:     "Free Trial",
    desc:     "Para experimentar sem compromisso",
    badge:    null,
    featured: false,
    monthly:  { preco: null, label: "7 dias grátis", sub: "Acesso completo ao Pro · Sem cartão" },
    yearly:   { preco: null, label: "7 dias grátis", sub: "Acesso completo ao Pro · Sem cartão" },
    features: [
      { text: "Acesso completo ao plano Pro por 7 dias", ok: true },
      { text: "Sem cartão no cadastro",                  ok: true },
      { text: "Todos os módulos desbloqueados",           ok: true },
      { text: "Suporte por chat",                         ok: true },
      { text: "Após o trial: plano gratuito limitado",    ok: false },
    ],
    ctaLabel: "Você já está no trial",
    ctaPlan:  null,
  },
  {
    id:       "pro",
    name:     "Pro Fundador",
    desc:     "Para empresas sem limites",
    badge:    "⭐ Mais popular",
    featured: true,
    monthly:  { preco: 49,   label: "R$49",  sub: "/mês",  economia: null },
    yearly:   { preco: 39,   label: "R$39",  sub: "/mês",  economia: "R$468/ano · 2 meses grátis" },
    founderNote: "Você entra agora por R$49. Quando o preço subir para R$79, você não paga a diferença.",
    features: [
      { text: "Até 5 usuários",                           ok: true },
      { text: "Clientes, produtos e transações ilimitados", ok: true },
      { text: "NF-e eletrônica",                          ok: true },
      { text: "Brand Studio com IA",                      ok: true },
      { text: "Equipe com permissões",                    ok: true },
      { text: "Comissões por vendedor",                   ok: true },
      { text: "Export CSV/Excel/PDF",                     ok: true },
      { text: "Metas financeiras",                        ok: true },
      { text: "Alertas automáticos avançados",            ok: true },
    ],
    ctaLabel: "Garantir preço de fundador",
    ctaPlan:  "pro",
  },
  {
    id:       "business",
    name:     "Business Fundador",
    desc:     "Para times e redes maiores",
    badge:    null,
    featured: false,
    monthly:  { preco: 99,  label: "R$99",  sub: "/mês",  economia: null },
    yearly:   { preco: 79,  label: "R$79",  sub: "/mês",  economia: "R$948/ano · 2 meses grátis" },
    founderNote: "Para contadores e quem gerencia mais de um CNPJ. Preço sobe para R$149 na fase 2.",
    features: [
      { text: "Usuários ilimitados",                      ok: true },
      { text: "Tudo do plano Pro",                        ok: true },
      { text: "Multi-empresa (vários CNPJs)",              ok: true },
      { text: "Suporte prioritário",                      ok: true },
      { text: "Relatórios personalizados",                ok: true },
      { text: "API de integração",                        ok: true },
      { text: "Implementações sob consulta",              ok: true },
    ],
    ctaLabel: "Garantir preço de fundador",
    ctaPlan:  "business",
  },
]

// ─────────────────────────────────────────────────────────────
export default function Plans() {
  const { plan: planAtual } = usePlan()
  const navigate            = useNavigate()
  const [anual, setAnual]   = useState(false)
  const [checkout, setCheckout] = useState(null) // { plan, preco, interval }

  function abrirCheckout(planData) {
    const intervalo = anual ? "yearly" : "monthly"
    const preco     = planData[intervalo].preco
    setCheckout({ plan: planData.id, preco, interval: intervalo })
  }

  return (
    <div style={s.page}>

      {/* Cabeçalho */}
      <div style={s.header}>
        <div style={s.tag}>Planos</div>
        <h1 style={s.titulo}>Preço de quem acreditou primeiro</h1>
        <p style={s.subtitulo}>
          Quem assinar agora trava esse preço para sempre. Quando subirmos, você não sente.
        </p>

        {/* Plano atual */}
        <div style={s.planAtualWrap}>
          <span style={s.planAtualLabel}>Seu plano atual:</span>
          <PlanBadge />
        </div>

        {/* Toggle mensal/anual */}
        <div style={s.toggleWrap}>
          <span style={{ ...s.toggleLabel, color: !anual ? "#f0f4ff" : "#6b7fa3" }}>Mensal</span>
          <div style={s.toggleTrack} onClick={() => setAnual(a => !a)}>
            <div style={{ ...s.toggleKnob, transform: anual ? "translateX(24px)" : "translateX(0)" }}/>
          </div>
          <span style={{ ...s.toggleLabel, color: anual ? "#f0f4ff" : "#6b7fa3" }}>Anual</span>
          <span style={s.economiaTag}>Economize até 20%</span>
        </div>
      </div>

      {/* Grid de planos */}
      <div style={s.grid}>
        {PLAN_DATA.map(p => {
          const intervalo   = anual ? "yearly" : "monthly"
          const priceData   = p[intervalo]
          const isAtual     = planAtual === p.id
          const isUpgrade   = !isAtual && p.ctaPlan !== null

          return (
            <div
              key={p.id}
              style={{
                ...s.card,
                ...(p.featured ? s.cardFeatured : {}),
                ...(isAtual    ? s.cardAtual    : {}),
              }}
            >
              {/* Badge topo */}
              {p.badge && <div style={s.cardBadge}>{p.badge}</div>}
              {isAtual  && <div style={{ ...s.cardBadge, background: "linear-gradient(135deg,#06d6a0,#0a9e77)" }}>✓ Plano atual</div>}

              <div style={s.planNome}>{p.name}</div>

              {/* Preço */}
              <div style={s.precoBloco}>
                {priceData.preco ? (
                  <>
                    <div style={s.precoMain}>
                      <span style={s.precoCurrency}>R$</span>
                      <span style={{ ...s.precoValor, color: p.featured ? "#4f8ef7" : "#f0f4ff" }}>
                        {priceData.preco}
                      </span>
                      <span style={s.precoPeriodo}>{priceData.sub}</span>
                    </div>
                    {priceData.economia && (
                      <div style={s.precoEconomia}>{priceData.economia}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ ...s.precoValor, fontSize: "1.8rem", color: "#06d6a0" }}>
                      {priceData.label}
                    </div>
                    <div style={s.precoSub}>{priceData.sub}</div>
                  </>
                )}
              </div>

              {/* Tag fundador */}
              {p.founderNote && (
                <>
                  <div style={s.founderTag}>🔒 Preço travado para sempre</div>
                  <p style={s.founderNote}>{p.founderNote}</p>
                </>
              )}

              <p style={s.planDesc}>{p.desc}</p>

              {/* Features */}
              <ul style={s.featureList}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ ...s.featureItem, color: f.ok ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)" }}>
                    <span style={{ color: f.ok ? "#06d6a0" : "rgba(255,255,255,0.2)", flexShrink: 0 }}>
                      {f.ok ? "✓" : "✕"}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isAtual ? (
                <div style={s.btnAtual}>✓ Plano ativo</div>
              ) : p.ctaPlan === null ? (
                <button style={s.btnGhost} onClick={() => navigate("/dashboard")}>
                  Continuar no trial
                </button>
              ) : (
                <button
                  style={p.featured ? s.btnPrimary : s.btnGhost}
                  onClick={() => abrirCheckout(p)}
                >
                  {p.ctaLabel} →
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Nota de urgência */}
      <div style={s.urgencia}>
        <strong style={{ color: "#d4af37" }}>Oferta de Fundador</strong>
        {" — "}Estes são os preços do lançamento.{" "}
        <span style={{ color: "#f0f4ff", fontWeight: 600 }}>A partir de 50 clientes pagantes</span>
        , o Pro passa para R$79/mês e o Business para R$149/mês.{" "}
        Quem assinar agora <strong style={{ color: "#d4af37" }}>trava o preço para sempre.</strong>
      </div>

      {/* Modal de checkout */}
      {checkout && (
        <CheckoutModal
          plano={checkout.plan}
          preco={checkout.preco}
          intervalo={checkout.interval}
          onClose={() => setCheckout(null)}
        />
      )}
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    padding: "40px 24px 80px",
    maxWidth: 1100,
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: 48,
  },
  tag: {
    display: "inline-block",
    fontSize: 11, fontWeight: 700, letterSpacing: "2px",
    textTransform: "uppercase", color: "#4f8ef7",
    marginBottom: 12,
  },
  titulo: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
    fontWeight: 800, letterSpacing: "-1px",
    color: "#f0f4ff", marginBottom: 12,
  },
  subtitulo: {
    fontSize: "1rem", color: "#6b7fa3",
    maxWidth: 500, margin: "0 auto 20px",
    lineHeight: 1.6,
  },
  planAtualWrap: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 10, marginBottom: 24,
  },
  planAtualLabel: {
    fontSize: 13, color: "#6b7fa3", fontWeight: 500,
  },
  toggleWrap: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 12,
  },
  toggleLabel: {
    fontSize: 14, fontWeight: 600, transition: "color 0.2s",
  },
  toggleTrack: {
    position: "relative", width: 52, height: 28,
    background: "linear-gradient(135deg,#4f8ef7,#7c3aed)",
    borderRadius: 100, cursor: "pointer",
    transition: "background 0.3s",
  },
  toggleKnob: {
    position: "absolute", top: 4, left: 4,
    width: 20, height: 20, borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
  },
  economiaTag: {
    fontSize: 11, fontWeight: 700, color: "#06d6a0",
    background: "rgba(6,214,160,0.12)",
    border: "1px solid rgba(6,214,160,0.25)",
    borderRadius: 20, padding: "3px 10px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24, alignItems: "start",
    marginBottom: 32,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24, padding: "32px 28px",
    position: "relative",
    transition: "transform 0.3s, box-shadow 0.3s",
  },
  cardFeatured: {
    background: "linear-gradient(145deg,rgba(79,142,247,0.1),rgba(124,58,237,0.08),rgba(8,12,20,0.8))",
    border: "1px solid rgba(79,142,247,0.4)",
    boxShadow: "0 20px 60px rgba(79,142,247,0.2)",
  },
  cardAtual: {
    border: "1px solid rgba(6,214,160,0.4)",
    boxShadow: "0 20px 60px rgba(6,214,160,0.1)",
  },
  cardBadge: {
    position: "absolute", top: -14, left: "50%",
    transform: "translateX(-50%)",
    background: "linear-gradient(135deg,#4f8ef7,#7c3aed)",
    color: "#fff", fontSize: 11, fontWeight: 700,
    padding: "5px 20px", borderRadius: 100,
    whiteSpace: "nowrap",
    boxShadow: "0 4px 16px rgba(79,142,247,0.4)",
  },
  planNome: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "1.1rem", fontWeight: 700,
    color: "#f0f4ff", marginBottom: 4,
  },
  precoBloco: {
    margin: "20px 0 8px",
    minHeight: 68,
  },
  precoMain: {
    display: "flex", alignItems: "baseline", gap: 4,
  },
  precoCurrency: {
    fontSize: "1.2rem", color: "#6b7fa3", marginTop: 4,
  },
  precoValor: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "3rem", fontWeight: 800, lineHeight: 1,
  },
  precoPeriodo: {
    fontSize: "0.9rem", color: "#6b7fa3",
    fontWeight: 400, marginLeft: 4,
  },
  precoEconomia: {
    fontSize: 12, color: "#06d6a0", marginTop: 4, fontWeight: 600,
  },
  precoSub: {
    fontSize: 12, color: "#6b7fa3", marginTop: 6,
  },
  founderTag: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 11, fontWeight: 700, color: "#d4af37",
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.3)",
    borderRadius: 20, padding: "3px 10px",
    marginBottom: 8,
  },
  founderNote: {
    fontSize: 12, color: "#6b7fa3",
    lineHeight: 1.5, marginBottom: 12,
  },
  planDesc: {
    fontSize: 13, color: "#6b7fa3",
    marginBottom: 20,
  },
  featureList: {
    listStyle: "none", padding: 0,
    marginBottom: 28,
  },
  featureItem: {
    display: "flex", alignItems: "flex-start", gap: 10,
    fontSize: 14, padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    lineHeight: 1.4,
  },
  btnPrimary: {
    width: "100%", padding: "13px",
    background: "linear-gradient(135deg,#4f8ef7,#7c3aed)",
    color: "#fff", fontWeight: 700, fontSize: 14,
    border: "none", borderRadius: 12, cursor: "pointer",
    boxShadow: "0 4px 20px rgba(79,142,247,0.35)",
    transition: "transform 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  },
  btnGhost: {
    width: "100%", padding: "13px",
    background: "transparent",
    color: "#f0f4ff", fontWeight: 700, fontSize: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 12, cursor: "pointer",
    transition: "background 0.2s",
    fontFamily: "inherit",
  },
  btnAtual: {
    width: "100%", padding: "13px",
    background: "rgba(6,214,160,0.08)",
    color: "#06d6a0", fontWeight: 700, fontSize: 14,
    border: "1px solid rgba(6,214,160,0.25)",
    borderRadius: 12, textAlign: "center",
  },
  urgencia: {
    padding: "20px 28px",
    background: "linear-gradient(135deg,rgba(212,175,55,0.07),rgba(79,142,247,0.07))",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 16, textAlign: "center",
    fontSize: 14, color: "#6b7fa3", lineHeight: 1.8,
  },
}
