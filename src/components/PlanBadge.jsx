// src/components/PlanBadge.jsx
// ─────────────────────────────────────────────────────────────
// Badge compacto que mostra o plano atual do usuário.
// Usado no Sidebar e em qualquer lugar que precise exibir o plano.
//
// Variantes:
//   <PlanBadge />              → badge padrão (sidebar)
//   <PlanBadge variant="pill" /> → pílula menor (header)
//   <PlanBadge variant="full" /> → card completo com CTA de upgrade
// ─────────────────────────────────────────────────────────────

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePlan } from "../contexts/PlanContext"

const PLAN_CONFIG = {
  free: {
    label:  "Free",
    emoji:  "🆓",
    color:  "#06d6a0",
    bg:     "rgba(6,214,160,0.1)",
    border: "rgba(6,214,160,0.25)",
    showUpgrade: true,
    upgradeMsg: "Upgrade para Pro",
  },
  trial: {
    label:  "Trial",
    emoji:  "⏳",
    color:  "#facc15",
    bg:     "rgba(250,204,21,0.1)",
    border: "rgba(250,204,21,0.25)",
    showUpgrade: true,
    upgradeMsg:  "Garantir plano",
  },
  pro: {
    label:  "Pro",
    emoji:  "⭐",
    color:  "#4f8ef7",
    bg:     "rgba(79,142,247,0.1)",
    border: "rgba(79,142,247,0.25)",
    showUpgrade: false,
    upgradeMsg:  "",
  },
  business: {
    label:  "Business",
    emoji:  "💼",
    color:  "#7c3aed",
    bg:     "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.25)",
    showUpgrade: false,
    upgradeMsg:  "",
  },
}

export default function PlanBadge({ variant = "default" }) {
  const { plan, BETA_MODE } = usePlan()
  const navigate            = useNavigate()
  const [hover, setHover]   = useState(false)

  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free
  const { label, emoji, color, bg, border, showUpgrade, upgradeMsg } = config

  // ── Variante: pill (header compacto) ────────────────────────
  if (variant === "pill") {
    return (
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 100,
          background: bg, border: `1px solid ${border}`,
          fontSize: 11, fontWeight: 700, color,
          cursor: showUpgrade ? "pointer" : "default",
          transition: "all 0.2s",
        }}
        onClick={() => showUpgrade && navigate("/plans")}
        title={showUpgrade ? `Fazer upgrade — ${upgradeMsg}` : `Plano ${label} ativo`}
      >
        <span>{emoji}</span>
        <span>{label}</span>
        {BETA_MODE && <span style={{ opacity: 0.5, fontSize: 9 }}>BETA</span>}
      </div>
    )
  }

  // ── Variante: full (card com CTA) ────────────────────────────
  if (variant === "full") {
    return (
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: 16, padding: "16px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: "1.4rem" }}>{emoji}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>Plano {label}</div>
            {BETA_MODE && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Beta · Acesso completo</div>
            )}
          </div>
        </div>
        {showUpgrade && (
          <button
            style={{
              width: "100%", padding: "9px",
              background: `linear-gradient(135deg,${color},${color}99)`,
              color: "#fff", fontWeight: 700, fontSize: 12,
              border: "none", borderRadius: 10, cursor: "pointer",
              fontFamily: "inherit",
            }}
            onClick={() => navigate("/plans")}
          >
            {upgradeMsg} →
          </button>
        )}
      </div>
    )
  }

  // ── Variante: default (sidebar) ──────────────────────────────
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 20,
        background: hover && showUpgrade ? `${color}22` : bg,
        border: `1px solid ${hover && showUpgrade ? color : border}`,
        fontSize: 12, fontWeight: 700, color,
        cursor: showUpgrade ? "pointer" : "default",
        transition: "all 0.2s",
        userSelect: "none",
      }}
      onClick={() => showUpgrade && navigate("/plans")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={showUpgrade ? `Clique para fazer upgrade` : `Plano ${label} ativo`}
    >
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span>{label}</span>
      {BETA_MODE && <span style={{ opacity: 0.4, fontSize: 9, fontWeight: 600 }}>BETA</span>}
      {showUpgrade && hover && (
        <span style={{ fontSize: 10, opacity: 0.8 }}>Upgrade →</span>
      )}
    </div>
  )
}
