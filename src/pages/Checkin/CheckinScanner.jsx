// src/pages/Checkin/CheckinScanner.jsx
// ─────────────────────────────────────────────────────────────
// Tela PWA para o colaborador escanear o QR Code mestre
// e registrar a execução do serviço.
//
// FLUXO:
// 1. Colaborador abre o link do QR Code no celular
//    → /checkin/:clientId?c=companyId
// 2. Sistema verifica se está logado
// 3. Se não → redireciona para login, volta depois
// 4. Se sim → mostra tela de confirmação com botão "Registrar serviço"
// 5. Captura GPS do celular (se autorizado)
// 6. Envia para POST /api/checkin/:clientId
// 7. Mostra confirmação de sucesso
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { useTheme } from "../../contexts/ThemeContext"

const API = "https://api.svfinance.com.br/api"

export default function CheckinScanner() {
  const { clientId }    = useParams()
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const { theme }       = useTheme()

  const [client,   setClient]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState("")
  const [notes,    setNotes]    = useState("")
  const [location, setLocation] = useState(null)
  const [locError, setLocError] = useState("")

  const token = localStorage.getItem("token")

  // ── Redireciona para login se não autenticado ─────────────
  useEffect(() => {
    if (!token) {
      // Salva a URL atual para voltar depois do login
      localStorage.setItem("sv_redirect_after_login", window.location.pathname + window.location.search)
      navigate("/")
      return
    }
    loadClient()
    requestLocation()
  }, [])

  // ── Carrega dados do cliente ──────────────────────────────
  async function loadClient() {
    try {
      const res  = await fetch(`${API}/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { navigate("/"); return }
      if (!res.ok) { setError("Cliente não encontrado."); setLoading(false); return }
      const data = await res.json()
      setClient(data)
    } catch {
      setError("Erro ao carregar dados do cliente.")
    } finally {
      setLoading(false)
    }
  }

  // ── Solicita GPS do celular ───────────────────────────────
  function requestLocation() {
    if (!navigator.geolocation) {
      setLocError("GPS não disponível neste dispositivo.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        })
      },
      () => {
        setLocError("GPS não autorizado — checkin será registrado sem localização.")
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  // ── Registra o checkin ────────────────────────────────────
  async function handleCheckin() {
    setSending(true)
    setError("")
    try {
      const body = { notes: notes || null }
      if (location) { body.lat = location.lat; body.lon = location.lon }

      const res = await fetch(`${API}/checkin/${clientId}`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.msg || "Erro ao registrar."); return }

      setSuccess(true)
    } catch {
      setError("Erro de conexão. Verifique sua internet.")
    } finally {
      setSending(false)
    }
  }

  // ── Formatação de hora ────────────────────────────────────
  const now = new Date()
  const horaFormatada = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const dataFormatada = now.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" })

  // ── ESTADOS DA TELA ───────────────────────────────────────

  if (loading) return (
    <div style={styles.container(theme)}>
      <div style={styles.card(theme)}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <p style={{ color: theme.textMuted }}>Carregando...</p>
      </div>
    </div>
  )

  if (error && !client) return (
    <div style={styles.container(theme)}>
      <div style={styles.card(theme)}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
        <h2 style={{ color: theme.textPrimary, marginBottom: 8 }}>Erro</h2>
        <p style={{ color: theme.textMuted }}>{error}</p>
      </div>
    </div>
  )

  if (success) return (
    <div style={styles.container(theme)}>
      <div style={styles.card(theme)}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <h2 style={{ color: "#22c55e", marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>
          Serviço registrado!
        </h2>
        <p style={{ color: theme.textMuted, marginBottom: 8 }}>
          {client?.name}
        </p>
        <p style={{ color: theme.textMuted, fontSize: 14 }}>
          {dataFormatada} às {horaFormatada}
        </p>
        {location && (
          <p style={{ color: theme.textMuted, fontSize: 12, marginTop: 8, opacity: 0.6 }}>
            📍 Localização registrada
          </p>
        )}
        <button
          onClick={() => { setSuccess(false); setNotes(""); requestLocation(); }}
          style={styles.btnGhost(theme)}
        >
          Registrar outro serviço
        </button>
      </div>
    </div>
  )

  return (
    <div style={styles.container(theme)}>
      <div style={styles.card(theme)}>

        {/* Header SV Finance */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "3px",
            color: theme.primary, textTransform: "uppercase", marginBottom: 4,
          }}>
            SV Finance
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>
            Registro de execução de serviço
          </div>
        </div>

        {/* Dados do cliente */}
        <div style={{
          background: `${theme.primary}12`,
          border: `1px solid ${theme.primary}30`,
          borderRadius: 16, padding: "20px 18px", marginBottom: 20,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏪</div>
          <h2 style={{
            color: theme.textPrimary, fontSize: "1.3rem",
            fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 6,
          }}>
            {client?.name}
          </h2>
          {client?.address && (
            <p style={{ color: theme.textMuted, fontSize: 13 }}>{client.address}</p>
          )}
        </div>

        {/* Data e hora */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: theme.textPrimary }}>
            {horaFormatada}
          </div>
          <div style={{ fontSize: 13, color: theme.textMuted, textTransform: "capitalize" }}>
            {dataFormatada}
          </div>
        </div>

        {/* Status GPS */}
        <div style={{
          padding: "8px 14px", borderRadius: 8, marginBottom: 16,
          background: location ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${location ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
          fontSize: 12, textAlign: "center",
          color: location ? "#22c55e" : "#f59e0b",
        }}>
          {location
            ? "📍 Localização capturada"
            : locError || "📍 Aguardando GPS..."}
        </div>

        {/* Campo de observação */}
        <textarea
          placeholder="Observação (opcional) — ex: vidro lateral danificado"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${theme.borderInput}`,
            color: theme.textPrimary, fontSize: 14, resize: "none",
            fontFamily: "inherit", outline: "none",
            boxSizing: "border-box", marginBottom: 16,
          }}
        />

        {/* Erro */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", padding: "10px 14px", borderRadius: 8,
            fontSize: 13, marginBottom: 16,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Botão principal */}
        <button
          onClick={handleCheckin}
          disabled={sending}
          style={styles.btnPrimary(theme, sending)}
        >
          {sending ? "Registrando..." : "✓ Confirmar execução do serviço"}
        </button>

        {/* Rodapé com branding */}
        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
          <a
            href="https://svfinance.com.br"
            style={{ fontSize: 11, color: theme.textMuted, textDecoration: "none" }}
          >
            Powered by <strong style={{ color: theme.primary }}>svfinance.com.br</strong>
          </a>
        </div>

      </div>
    </div>
  )
}

// ── Estilos inline ────────────────────────────────────────────
const styles = {
  container: (theme) => ({
    minHeight: "100vh",
    background: theme.bgPrimary,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px 16px",
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  }),
  card: (theme) => ({
    width: "100%", maxWidth: 420,
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderCard}`,
    borderRadius: 24, padding: "32px 28px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  }),
  btnPrimary: (theme, disabled) => ({
    width: "100%", padding: "16px",
    background: disabled
      ? "rgba(255,255,255,0.1)"
      : `linear-gradient(135deg, ${theme.primary}, ${theme.accent || "#6366f1"})`,
    border: "none", borderRadius: 12,
    color: "#fff", fontSize: 15, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s", fontFamily: "inherit",
    opacity: disabled ? 0.6 : 1,
    boxShadow: disabled ? "none" : `0 4px 20px ${theme.primary}40`,
  }),
  btnGhost: (theme) => ({
    width: "100%", padding: "12px", marginTop: 16,
    background: "transparent",
    border: `1px solid ${theme.borderCard}`,
    borderRadius: 12, color: theme.textMuted,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  }),
}
