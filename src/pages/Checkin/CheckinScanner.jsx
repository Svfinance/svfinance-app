// src/pages/Checkin/CheckinScanner.jsx
// Scanner usando html5-qrcode (biblioteca mais robusta do mercado)
// + modo offline com confirmação manual
// + fallback: digitar código manualmente se câmera falhar

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { Html5Qrcode } from "html5-qrcode"

const API = "https://api.svfinance.com.br/api"
const SCANNER_ID = "sv-qr-reader"

export default function CheckinScanner() {
  const { clientId }   = useParams()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [step, setStep]             = useState("loading")
  const [client, setClient]         = useState(null)
  const [orders, setOrders]         = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [openCheckin, setOpen]      = useState(null)
  const [action, setAction]         = useState(null)
  const [location, setLocation]     = useState(null)
  const [notes, setNotes]           = useState("")
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState("")
  const [sending, setSending]       = useState(false)
  const [isOffline, setIsOffline]   = useState(!navigator.onLine)
  const [showManual, setShowManual] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)

  const scannerRef = useRef(null)
  const token      = localStorage.getItem("token")

  // ── Detecta modo offline ──────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener("online",  onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online",  onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  // ── Auth + carrega dados ──────────────────────────────────
  useEffect(() => {
    if (!token) {
      localStorage.setItem("sv_redirect_after_login", window.location.pathname + window.location.search)
      navigate("/")
      return
    }
    init()
    requestLocation()
    return () => stopScanner()
  }, [])

  async function init() {
    try {
      const [resC, resO, resOpen] = await Promise.all([
        fetch(`${API}/clients/${clientId}`,  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/orders`,               { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/checkin/open`,         { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (resC.status === 401) { navigate("/"); return }

      const [dataC, dataO, dataOpen] = await Promise.all([resC.json(), resO.json(), resOpen.json()])

      setClient(dataC)

      const clientOrders = (Array.isArray(dataO) ? dataO : []).filter(o =>
        String(o.client_id) === String(clientId) &&
        (o.status === "open" || o.status === "in_progress")
      )
      setOrders(clientOrders)

      if (dataOpen.open) setOpen(dataOpen)

      setStep("select_os")
    } catch {
      if (isOffline) {
        // Modo offline — permite continuar sem dados do servidor
        setStep("offline_mode")
      } else {
        setError("Erro ao carregar dados.")
        setStep("error")
      }
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  // ── Scanner html5-qrcode ──────────────────────────────────
  async function startScanner() {
    setScannerReady(false)
    setError("")
    setShowManual(false)

    // Aguarda o elemento existir no DOM
    await new Promise(r => setTimeout(r, 300))

    try {
      const scanner = new Html5Qrcode(SCANNER_ID)
      scannerRef.current = scanner

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      }

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // QR detectado!
          stopScanner()
          onQRDetected(decodedText)
        },
        () => {} // erro silencioso durante scan (frame sem QR)
      )

      setScannerReady(true)

      // Se não ler em 30 segundos, mostra opção manual
      setTimeout(() => {
        if (step === "scanning") setShowManual(true)
      }, 30000)

    } catch (e) {
      setError("Câmera não disponível. Use a entrada manual abaixo.")
      setShowManual(true)
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
  }

  useEffect(() => {
    if (step === "scanning") startScanner()
    else stopScanner()
  }, [step])

  // ── QR detectado ─────────────────────────────────────────
  function onQRDetected(url) {
    const pattern = `/checkin/${clientId}`
    if (!url.includes(pattern)) {
      setError("QR Code incorreto. Escaneie o adesivo deste cliente.")
      setStep("select_action")
      return
    }
    setStep("confirming")
  }

  // ── Entrada manual (fallback) ─────────────────────────────
  function handleManualConfirm() {
    // Se câmera falhar, permite confirmar diretamente sem QR
    stopScanner()
    setStep("confirming")
  }

  // ── Confirma check-in/out ─────────────────────────────────
  async function handleConfirm() {
    setSending(true)
    setError("")

    // Modo offline — salva localmente
    if (isOffline) {
      const offlineData = {
        type:       action,
        clientId,
        clientName: client?.name || "Cliente",
        orderId:    selectedOrder?.id,
        orderNum:   selectedOrder?.number,
        timestamp:  new Date().toISOString(),
        notes,
        location,
        synced:     false,
      }
      const existing = JSON.parse(localStorage.getItem("sv_offline_checkins") || "[]")
      existing.push(offlineData)
      localStorage.setItem("sv_offline_checkins", JSON.stringify(existing))
      setResult({ action, offline: true, timestamp: offlineData.timestamp })
      setStep("success")
      setSending(false)
      return
    }

    try {
      let res, data

      if (action === "start") {
        res = await fetch(`${API}/checkin/${clientId}/start`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            order_id: selectedOrder?.id || null,
            lat:      location?.lat,
            lon:      location?.lon,
            notes:    notes || null,
          }),
        })
        data = await res.json()
        if (!res.ok) { setError(data.msg || "Erro."); setSending(false); return }
        setResult({ ...data, action: "start" })

      } else {
        res = await fetch(`${API}/checkin/${openCheckin.checkin_id}/finish`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: location?.lat, lon: location?.lon, notes: notes || null }),
        })
        data = await res.json()
        if (!res.ok) { setError(data.msg || "Erro."); setSending(false); return }
        setResult({ ...data, action: "finish" })
      }

      setStep("success")
    } catch {
      // Sem internet → salva offline
      if (!navigator.onLine) {
        setIsOffline(true)
        handleConfirm()
      } else {
        setError("Erro de conexão. Tente novamente.")
      }
    } finally {
      setSending(false)
    }
  }

  // ── Sincroniza registros offline ──────────────────────────
  async function syncOfflineCheckins() {
    const pending = JSON.parse(localStorage.getItem("sv_offline_checkins") || "[]")
    if (pending.length === 0) return

    const synced = []
    for (const item of pending) {
      try {
        if (item.type === "start") {
          await fetch(`${API}/checkin/${item.clientId}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ order_id: item.orderId, notes: item.notes, lat: item.location?.lat, lon: item.location?.lon }),
          })
        }
        synced.push({ ...item, synced: true })
      } catch {
        synced.push(item)
      }
    }
    localStorage.setItem("sv_offline_checkins", JSON.stringify(synced.filter(i => !i.synced)))
  }

  useEffect(() => {
    if (!isOffline) syncOfflineCheckins()
  }, [isOffline])

  // ── Hora ─────────────────────────────────────────────────
  const now     = new Date()
  const horaFmt = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const dataFmt = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })

  // ── Estilos ───────────────────────────────────────────────
  const S = {
    page:   { minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "'DM Sans',sans-serif" },
    card:   { width: "100%", maxWidth: 420, background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
    brand:  { textAlign: "center", marginBottom: 18 },
    brandT: { fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: "#4f8ef7", textTransform: "uppercase" },
    brandS: { fontSize: 11, color: "#6b7fa3", marginTop: 2 },
    clientB:{ background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, textAlign: "center" },
    clientN:{ color: "#f0f4ff", fontSize: "1rem", fontWeight: 700 },
    btnP:   { width: "100%", padding: 15, background: "linear-gradient(135deg,#4f8ef7,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10, boxShadow: "0 4px 20px rgba(79,142,247,0.35)" },
    btnG:   { width: "100%", padding: 15, background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
    btnS:   { width: "100%", padding: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#6b7fa3", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
    btnY:   { width: "100%", padding: 13, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, color: "#f59e0b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
    err:    { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 },
    offline:{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14, textAlign: "center" },
    badge:  (c) => ({ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${c}20`, color: c, marginBottom: 12, letterSpacing: "1px", textTransform: "uppercase" }),
    footer: { textAlign: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" },
  }

  function Brand() {
    return (
      <div style={S.brand}>
        <div style={S.brandT}>SV Finance</div>
        <div style={S.brandS}>Registro de Serviço</div>
        {isOffline && <div style={{ marginTop: 6, fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>📵 MODO OFFLINE</div>}
      </div>
    )
  }

  function ClientCard() {
    return client ? (
      <div style={S.clientB}>
        <div style={S.clientN}>{client.name}</div>
        {client.address && <div style={{ color: "#6b7fa3", fontSize: 11, marginTop: 2 }}>{client.address}</div>}
      </div>
    ) : null
  }

  // ══════════════════════════════════════════════════════════

  if (step === "loading") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <div style={{ textAlign: "center", color: "#6b7fa3", padding: "40px 0" }}>⏳ Carregando...</div>
    </div></div>
  )

  if (step === "error") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <div style={{ textAlign: "center", padding: "30px 0" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
        <div style={{ color: "#f87171", marginBottom: 20 }}>{error}</div>
        <button style={S.btnS} onClick={init}>Tentar novamente</button>
      </div>
    </div></div>
  )

  if (step === "offline_mode") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <div style={S.offline}>📵 Sem conexão — modo offline ativo</div>
      <div style={{ textAlign: "center", marginBottom: 20, color: "#6b7fa3", fontSize: 13 }}>
        O registro será salvo localmente e sincronizado quando houver internet.
      </div>
      <button style={S.btnP} onClick={() => { setAction("start"); setStep("scanning") }}>
        📍 Registrar entrada (offline)
      </button>
      <button style={S.btnS} onClick={init}>Tentar reconectar</button>
    </div></div>
  )

  if (step === "select_os") return (
    <div style={S.page}><div style={S.card}>
      <Brand /><ClientCard />

      {isOffline && <div style={S.offline}>📵 Modo offline — dados podem estar desatualizados</div>}

      <div style={{ color: "#6b7fa3", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
        Selecione a O.S do dia
      </div>

      {orders.length === 0 ? (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 16, textAlign: "center", color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
          ⚠️ Nenhuma O.S aberta para este cliente.
          <div style={{ color: "#6b7fa3", fontSize: 11, marginTop: 4 }}>Peça ao ADM para criar uma O.S.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {orders.map(o => (
            <div key={o.id} onClick={() => setSelectedOrder(o)} style={{
              background: selectedOrder?.id === o.id ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.04)",
              border: `2px solid ${selectedOrder?.id === o.id ? "#4f8ef7" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#4f8ef7", fontWeight: 700, fontSize: 14 }}>{o.number}</div>
                  <div style={{ color: "#6b7fa3", fontSize: 11, marginTop: 2 }}>
                    {o.items?.length || 0} {o.items?.length === 1 ? "item" : "itens"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: o.status === "in_progress" ? "rgba(245,158,11,0.2)" : "rgba(59,130,246,0.2)", color: o.status === "in_progress" ? "#f59e0b" : "#3b82f6" }}>
                    {o.status === "in_progress" ? "Em andamento" : "Aberta"}
                  </div>
                  {selectedOrder?.id === o.id && <div style={{ fontSize: 14 }}>✓</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div style={S.err}>⚠️ {error}</div>}

      <button
        style={{ ...S.btnP, opacity: (orders.length > 0 && !selectedOrder) ? 0.5 : 1 }}
        onClick={() => (orders.length === 0 || selectedOrder) && setStep("select_action")}
        disabled={orders.length > 0 && !selectedOrder}
      >
        Continuar →
      </button>

      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={{ fontSize: 10, color: "#6b7fa3", textDecoration: "none" }}>
          svfinance.com.br
        </a>
      </div>
    </div></div>
  )

  if (step === "select_action") return (
    <div style={S.page}><div style={S.card}>
      <Brand /><ClientCard />

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f0f4ff" }}>{horaFmt}</div>
        <div style={{ fontSize: 12, color: "#6b7fa3", textTransform: "capitalize" }}>{dataFmt}</div>
        {selectedOrder && <div style={{ marginTop: 6, fontSize: 12, color: "#4f8ef7", fontWeight: 600 }}>O.S: {selectedOrder.number}</div>}
      </div>

      {isOffline && <div style={S.offline}>📵 Offline — será sincronizado depois</div>}
      {error && <div style={S.err}>⚠️ {error}</div>}

      {openCheckin ? (
        <>
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center" }}>
            <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>⏱️ Serviço em andamento</div>
            <div style={{ color: "#6b7fa3", fontSize: 12, marginTop: 4 }}>
              Entrada: {openCheckin.checkin_at?.slice(11, 16)}
              {openCheckin.order_number && ` · ${openCheckin.order_number}`}
            </div>
          </div>
          <button style={S.btnG} onClick={() => { setAction("finish"); setStep("scanning") }}>
            ✅ Finalizar — Escanear QR Code
          </button>
        </>
      ) : (
        <button style={S.btnP} onClick={() => { setAction("start"); setStep("scanning") }}>
          📍 Iniciar — Escanear QR Code
        </button>
      )}

      <button style={S.btnS} onClick={() => setStep("select_os")}>← Voltar</button>
    </div></div>
  )

  if (step === "scanning") return (
    <div style={S.page}><div style={{ ...S.card, padding: "20px 16px" }}>
      <Brand />

      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={S.badge(action === "start" ? "#4f8ef7" : "#22c55e")}>
          {action === "start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
        </div>
        <div style={{ color: "#6b7fa3", fontSize: 12 }}>
          Aponte para o QR Code fixo na vitrine
        </div>
      </div>

      {error && <div style={S.err}>⚠️ {error}</div>}

      {/* Container do scanner html5-qrcode */}
      <div
        id={SCANNER_ID}
        style={{
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 14,
          background: "#000",
          minHeight: 260,
        }}
      />

      {/* Botão manual após 30s ou erro de câmera */}
      {showManual && (
        <button style={S.btnY} onClick={handleManualConfirm}>
          ⚡ Confirmar sem escanear
        </button>
      )}

      <button style={S.btnS} onClick={() => { stopScanner(); setStep("select_action") }}>
        ← Cancelar
      </button>
    </div></div>
  )

  if (step === "confirming") return (
    <div style={S.page}><div style={S.card}>
      <Brand /><ClientCard />

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={S.badge(action === "start" ? "#4f8ef7" : "#22c55e")}>
          {action === "start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
        </div>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f0f4ff" }}>{horaFmt}</div>
        <div style={{ fontSize: 12, color: "#6b7fa3", textTransform: "capitalize" }}>{dataFmt}</div>
        {selectedOrder && <div style={{ marginTop: 6, fontSize: 12, color: "#4f8ef7", fontWeight: 600 }}>O.S: {selectedOrder.number}</div>}
      </div>

      {action === "finish" && openCheckin && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#6b7fa3", textAlign: "center" }}>
          Entrada às {openCheckin.checkin_at?.slice(11, 16)}
        </div>
      )}

      {isOffline && <div style={S.offline}>📵 Será salvo offline e sincronizado depois</div>}

      <textarea
        style={{ width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#f0f4ff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 14, resize: "none" }}
        rows={2}
        placeholder={action === "start" ? "Observação de entrada (opcional)" : "Observação de saída (opcional)"}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <div style={{ fontSize: 11, color: location ? "#22c55e" : "#6b7fa3", marginBottom: 14 }}>
        {location ? "📍 Localização capturada" : "📍 Sem localização GPS"}
      </div>

      {error && <div style={S.err}>⚠️ {error}</div>}

      <button
        style={{ ...(action === "start" ? S.btnP : S.btnG), opacity: sending ? 0.6 : 1, cursor: sending ? "not-allowed" : "pointer" }}
        onClick={handleConfirm}
        disabled={sending}
      >
        {sending ? "Registrando..." : action === "start" ? "✓ Confirmar entrada" : "✓ Confirmar saída"}
      </button>

      <button style={S.btnS} onClick={() => setStep("scanning")} disabled={sending}>
        ← Escanear novamente
      </button>
    </div></div>
  )

  if (step === "success") return (
    <div style={S.page}><div style={S.card}>
      <Brand />

      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>
          {result?.action === "start" ? "📍" : "✅"}
        </div>
        <div style={{ color: result?.action === "start" ? "#4f8ef7" : "#22c55e", fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>
          {result?.offline ? "Salvo offline!" : result?.action === "start" ? "Check-in registrado!" : "Serviço concluído!"}
        </div>

        {result?.offline && (
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px", margin: "12px 0", fontSize: 12, color: "#f59e0b" }}>
            📵 Registrado offline. Será sincronizado automaticamente quando houver internet.
          </div>
        )}

        {result?.action === "finish" && result?.duration_str && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "12px", margin: "14px 0", display: "inline-block" }}>
            <div style={{ color: "#6b7fa3", fontSize: 11 }}>Duração do serviço</div>
            <div style={{ color: "#22c55e", fontSize: "1.6rem", fontWeight: 700 }}>{result.duration_str}</div>
          </div>
        )}

        <div style={{ color: "#6b7fa3", fontSize: 12, marginTop: 8 }}>{dataFmt} às {horaFmt}</div>
        {client && <div style={{ color: "#f0f4ff", fontWeight: 600, marginTop: 6 }}>{client.name}</div>}
        {selectedOrder && <div style={{ color: "#4f8ef7", fontSize: 12, marginTop: 4 }}>O.S: {selectedOrder.number}</div>}
      </div>

      <button style={S.btnS} onClick={() => {
        setStep("select_os"); setResult(null); setNotes("")
        setSelectedOrder(null); setOpen(null); init()
      }}>
        Registrar outro serviço
      </button>

      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={{ fontSize: 10, color: "#6b7fa3", textDecoration: "none" }}>svfinance.com.br</a>
      </div>
    </div></div>
  )

  return null
}