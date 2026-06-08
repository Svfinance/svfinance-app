// src/components/CheckoutModal.jsx
// ─────────────────────────────────────────────────────────────
// Modal de checkout para assinar plano Pro ou Business.
// Coleta dados do titular e método de pagamento (Pix ou Cartão).
// Chama POST /api/billing/subscribe e atualiza PlanContext.
// ─────────────────────────────────────────────────────────────

import { useState } from "react"
import { apiFetch, getAuthHeaders } from "../services/api"
import { usePlan } from "../contexts/PlanContext"

const PLAN_LABEL = { pro: "Pro Fundador", business: "Business Fundador" }
const PLAN_COLOR = { pro: "#4f8ef7",       business: "#7c3aed" }

export default function CheckoutModal({ plano, preco, intervalo, onClose }) {
  const { updatePlan }    = usePlan()
  const cor               = PLAN_COLOR[plano] || "#4f8ef7"
  const label             = PLAN_LABEL[plano]  || plano
  const labelIntervalo    = intervalo === "yearly" ? "Anual" : "Mensal"

  // Etapas: "metodo" → "dados" → "cartao" (se CC) → "sucesso"
  const [etapa, setEtapa]         = useState("metodo")
  const [metodo, setMetodo]       = useState("PIX")
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState("")

  // Dados do titular
  const [form, setForm] = useState({
    name:          "",
    cpfCnpj:       "",
    email:         localStorage.getItem("sv_email") || "",
    phone:         "",
    postalCode:    "",
    addressNumber: "",
  })

  // Dados do cartão (só se metodo === "CREDIT_CARD")
  const [cartao, setCartao] = useState({
    holderName:  "",
    number:      "",
    expiryMonth: "",
    expiryYear:  "",
    ccv:         "",
  })

  function onForm(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }
  function onCartao(e) {
    setCartao(c => ({ ...c, [e.target.name]: e.target.value }))
  }

  // Máscara CPF/CNPJ
  function maskDoc(v) {
    v = v.replace(/\D/g, "")
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2")
           .replace(/(\d{3})(\d)/, "$1.$2")
           .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    } else {
      v = v.replace(/(\d{2})(\d)/, "$1.$2")
           .replace(/(\d{3})(\d)/, "$1.$2")
           .replace(/(\d{3})(\d)/, "$1/$2")
           .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    }
    return v
  }

  // Máscara número do cartão
  function maskCartaoNum(v) {
    return v.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19)
  }

  async function confirmar() {
    setErro("")
    setLoading(true)
    try {
      const body = {
        plan:         plano,
        interval:     intervalo === "yearly" ? "yearly" : "monthly",
        billing_type: metodo,
        titular: {
          name:          form.name,
          cpfCnpj:       form.cpfCnpj.replace(/\D/g, ""),
          email:         form.email,
          phone:         form.phone.replace(/\D/g, ""),
          postalCode:    form.postalCode.replace(/\D/g, ""),
          addressNumber: form.addressNumber,
        },
      }
      if (metodo === "CREDIT_CARD") {
        body.credit_card = {
          holderName:  cartao.holderName,
          number:      cartao.number.replace(/\s/g, ""),
          expiryMonth: cartao.expiryMonth,
          expiryYear:  cartao.expiryYear,
          ccv:         cartao.ccv,
        }
      }

      const res  = await apiFetch("/billing/subscribe", {
        method:  "POST",
        headers: getAuthHeaders(),
        body:    JSON.stringify(body),
      })
      const data = await res.json()

      if (!data.ok) {
        setErro(data.msg || "Erro ao processar pagamento. Tente novamente.")
        setLoading(false)
        return
      }

      // Atualiza plano no contexto e localStorage
      updatePlan(plano)
      setEtapa("sucesso")
    } catch (e) {
      setErro("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, borderColor: `${cor}44` }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ ...s.planTag, color: cor, background: `${cor}18`, border: `1px solid ${cor}33` }}>
              {label}
            </div>
            <div style={s.headerTitle}>
              {etapa === "sucesso" ? "Assinatura confirmada! 🎉" : "Finalizar assinatura"}
            </div>
            {etapa !== "sucesso" && (
              <div style={s.headerSub}>
                R${preco}/mês · {labelIntervalo} · Preço de Fundador travado
              </div>
            )}
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── ETAPA: SUCESSO ── */}
        {etapa === "sucesso" && (
          <div style={s.sucesso}>
            <div style={s.sucessoEmoji}>🎉</div>
            <h2 style={s.sucessoTitulo}>Bem-vindo ao {label}!</h2>
            <p style={s.sucessoDesc}>
              Seu plano foi ativado. O preço de R${preco}/mês está travado para sempre
              — independente de qualquer reajuste futuro.
            </p>
            <button style={{ ...s.btnPrimary, background: `linear-gradient(135deg,${cor},${cor}99)` }}
              onClick={onClose}>
              Explorar o sistema →
            </button>
          </div>
        )}

        {/* ── ETAPA: MÉTODO ── */}
        {etapa === "metodo" && (
          <div>
            <p style={s.etapaLabel}>Como você prefere pagar?</p>
            <div style={s.metodosGrid}>
              <div
                style={{ ...s.metodoCard, ...(metodo === "PIX" ? { ...s.metodoAtivo, borderColor: cor } : {}) }}
                onClick={() => setMetodo("PIX")}
              >
                <div style={s.metodoIcon}>⚡</div>
                <div style={s.metodoNome}>Pix</div>
                <div style={s.metodoDesc}>Aprovação instantânea</div>
              </div>
              <div
                style={{ ...s.metodoCard, ...(metodo === "CREDIT_CARD" ? { ...s.metodoAtivo, borderColor: cor } : {}) }}
                onClick={() => setMetodo("CREDIT_CARD")}
              >
                <div style={s.metodoIcon}>💳</div>
                <div style={s.metodoNome}>Cartão de crédito</div>
                <div style={s.metodoDesc}>Visa, Master, Elo, Amex</div>
              </div>
            </div>
            <button style={{ ...s.btnPrimary, background: `linear-gradient(135deg,${cor},${cor}99)` }}
              onClick={() => setEtapa("dados")}>
              Continuar →
            </button>
          </div>
        )}

        {/* ── ETAPA: DADOS DO TITULAR ── */}
        {etapa === "dados" && (
          <div>
            <p style={s.etapaLabel}>Dados do titular da conta</p>
            <div style={s.formGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Nome completo</label>
                <input style={s.input} name="name" placeholder="João Silva"
                  value={form.name} onChange={onForm}/>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>CPF ou CNPJ</label>
                <input style={s.input} name="cpfCnpj" placeholder="000.000.000-00"
                  value={form.cpfCnpj}
                  onChange={e => setForm(f => ({ ...f, cpfCnpj: maskDoc(e.target.value) }))}
                  maxLength={18}/>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>E-mail</label>
                <input style={s.input} name="email" type="email" placeholder="joao@email.com"
                  value={form.email} onChange={onForm}/>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Telefone / WhatsApp</label>
                <input style={s.input} name="phone" placeholder="(44) 99999-9999"
                  value={form.phone} onChange={onForm}/>
              </div>
              <div style={{ ...s.formGroup, flex: "1 1 120px" }}>
                <label style={s.label}>CEP</label>
                <input style={s.input} name="postalCode" placeholder="87000-000"
                  value={form.postalCode} onChange={onForm} maxLength={9}/>
              </div>
              <div style={{ ...s.formGroup, flex: "1 1 80px" }}>
                <label style={s.label}>Número</label>
                <input style={s.input} name="addressNumber" placeholder="123"
                  value={form.addressNumber} onChange={onForm}/>
              </div>
            </div>

            {erro && <div style={s.erro}>{erro}</div>}

            <div style={s.botoesRow}>
              <button style={s.btnGhost} onClick={() => { setEtapa("metodo"); setErro("") }}>
                ← Voltar
              </button>
              <button
                style={{ ...s.btnPrimary, flex: 1, background: `linear-gradient(135deg,${cor},${cor}99)`, opacity: loading ? 0.7 : 1 }}
                onClick={() => metodo === "CREDIT_CARD" ? setEtapa("cartao") : confirmar()}
                disabled={loading}
              >
                {loading ? "Processando..." : metodo === "CREDIT_CARD" ? "Dados do cartão →" : "Confirmar e pagar →"}
              </button>
            </div>
          </div>
        )}

        {/* ── ETAPA: CARTÃO ── */}
        {etapa === "cartao" && (
          <div>
            <p style={s.etapaLabel}>Dados do cartão de crédito</p>
            <div style={s.formGrid}>
              <div style={{ ...s.formGroup, flexBasis: "100%" }}>
                <label style={s.label}>Nome no cartão</label>
                <input style={s.input} name="holderName" placeholder="JOAO SILVA"
                  value={cartao.holderName} onChange={onCartao}/>
              </div>
              <div style={{ ...s.formGroup, flexBasis: "100%" }}>
                <label style={s.label}>Número do cartão</label>
                <input style={s.input} name="number" placeholder="0000 0000 0000 0000"
                  value={cartao.number}
                  onChange={e => setCartao(c => ({ ...c, number: maskCartaoNum(e.target.value) }))}
                  maxLength={19}/>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Mês de validade</label>
                <input style={s.input} name="expiryMonth" placeholder="MM" maxLength={2}
                  value={cartao.expiryMonth} onChange={onCartao}/>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Ano de validade</label>
                <input style={s.input} name="expiryYear" placeholder="AAAA" maxLength={4}
                  value={cartao.expiryYear} onChange={onCartao}/>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>CVV</label>
                <input style={s.input} name="ccv" placeholder="123" maxLength={4}
                  value={cartao.ccv} onChange={onCartao}/>
              </div>
            </div>

            <div style={s.segurancaNote}>
              🔒 Pagamento processado com segurança pelo Asaas. Seus dados não são armazenados.
            </div>

            {erro && <div style={s.erro}>{erro}</div>}

            <div style={s.botoesRow}>
              <button style={s.btnGhost} onClick={() => { setEtapa("dados"); setErro("") }}>
                ← Voltar
              </button>
              <button
                style={{ ...s.btnPrimary, flex: 1, background: `linear-gradient(135deg,${cor},${cor}99)`, opacity: loading ? 0.7 : 1 }}
                onClick={confirmar}
                disabled={loading}
              >
                {loading ? "Processando..." : "Confirmar pagamento →"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────
const s = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
  },
  modal: {
    background: "linear-gradient(135deg,#0d1424,#080c14)",
    border: "1px solid",
    borderRadius: 24, padding: "36px 32px",
    width: "100%", maxWidth: 520,
    maxHeight: "90vh", overflowY: "auto",
    position: "relative",
    boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 28,
  },
  planTag: {
    display: "inline-block", fontSize: 11, fontWeight: 700,
    letterSpacing: "1px", textTransform: "uppercase",
    borderRadius: 20, padding: "3px 10px", marginBottom: 8,
  },
  headerTitle: {
    fontSize: "1.3rem", fontWeight: 800,
    color: "#f0f4ff", fontFamily: "'DM Sans', sans-serif",
  },
  headerSub: {
    fontSize: 13, color: "#6b7fa3", marginTop: 4,
  },
  closeBtn: {
    background: "none", border: "none",
    color: "#6b7fa3", fontSize: 18, cursor: "pointer",
    padding: "4px 8px", flexShrink: 0,
  },
  etapaLabel: {
    fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)",
    marginBottom: 16,
  },
  metodosGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 12, marginBottom: 24,
  },
  metodoCard: {
    padding: "20px 16px", borderRadius: 16, textAlign: "center",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer", transition: "all 0.2s",
  },
  metodoAtivo: {
    background: "rgba(79,142,247,0.08)",
  },
  metodoIcon: { fontSize: "1.8rem", marginBottom: 8 },
  metodoNome: { fontSize: 14, fontWeight: 700, color: "#f0f4ff", marginBottom: 4 },
  metodoDesc: { fontSize: 12, color: "#6b7fa3" },
  formGrid: {
    display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20,
  },
  formGroup: {
    display: "flex", flexDirection: "column", gap: 6,
    flex: "1 1 200px",
  },
  label: {
    fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)",
  },
  input: {
    padding: "11px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#f0f4ff", fontSize: 14, outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  },
  segurancaNote: {
    fontSize: 12, color: "#6b7fa3",
    background: "rgba(6,214,160,0.06)",
    border: "1px solid rgba(6,214,160,0.15)",
    borderRadius: 10, padding: "10px 14px",
    marginBottom: 20, lineHeight: 1.5,
  },
  erro: {
    fontSize: 13, color: "#f87171",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10, padding: "10px 14px",
    marginBottom: 16,
  },
  botoesRow: {
    display: "flex", gap: 12,
  },
  btnPrimary: {
    padding: "13px", color: "#fff",
    fontWeight: 700, fontSize: 14,
    border: "none", borderRadius: 12, cursor: "pointer",
    fontFamily: "inherit", transition: "opacity 0.2s",
  },
  btnGhost: {
    padding: "13px 20px",
    background: "transparent", color: "#f0f4ff",
    fontWeight: 600, fontSize: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 12, cursor: "pointer",
    fontFamily: "inherit",
  },
  sucesso: {
    textAlign: "center", padding: "20px 0",
  },
  sucessoEmoji: { fontSize: "3.5rem", marginBottom: 16 },
  sucessoTitulo: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "1.5rem", fontWeight: 800,
    color: "#f0f4ff", marginBottom: 12,
  },
  sucessoDesc: {
    fontSize: 14, color: "#6b7fa3",
    lineHeight: 1.7, marginBottom: 28,
    maxWidth: 380, margin: "0 auto 28px",
  },
}
