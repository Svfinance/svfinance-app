// src/pages/Checkin/CheckinScanner.jsx
// Scanner com BarcodeDetector nativo (Chrome Android) + fallback jsQR
// Fluxo: seleciona OS → escaneia QR → check-in/checkout registrado

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"

const API = "https://api.svfinance.com.br/api"

export default function CheckinScanner() {
  const { clientId }   = useParams()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [step, setStep]         = useState("loading")
  // loading | select_os | select_action | scanning | confirming | success | error
  const [client, setClient]     = useState(null)
  const [orders, setOrders]     = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [openCheckin, setOpen]  = useState(null)
  const [action, setAction]     = useState(null) // "start" | "finish"
  const [location, setLocation] = useState(null)
  const [notes, setNotes]       = useState("")
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState("")
  const [sending, setSending]   = useState(false)
  const [scanStatus, setScanStatus] = useState("Iniciando câmera...")

  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const animRef    = useRef(null)
  const detectorRef = useRef(null)

  const token     = localStorage.getItem("token")
  const companyId = searchParams.get("c") || localStorage.getItem("company_id")

  // ── Auth ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      localStorage.setItem("sv_redirect_after_login", window.location.pathname + window.location.search)
      navigate("/")
      return
    }
    init()
    requestLocation()
    return () => stopCamera()
  }, [])

  async function init() {
    try {
      // Carrega cliente
      const resC = await fetch(`${API}/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (resC.status === 401) { navigate("/"); return }
      const dataC = await resC.json()
      setClient(dataC)

      // Carrega OS abertas/em andamento do cliente
      const resO = await fetch(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const dataO = await resO.json()
      const clientOrders = (Array.isArray(dataO) ? dataO : []).filter(o =>
        String(o.client_id) === String(clientId) &&
        (o.status === "open" || o.status === "in_progress")
      )
      setOrders(clientOrders)

      // Verifica check-in em aberto
      const resOpen = await fetch(`${API}/checkin/open`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const dataOpen = await resOpen.json()
      if (dataOpen.open) setOpen(dataOpen)

      setStep("select_os")
    } catch {
      setError("Erro ao carregar dados.")
      setStep("error")
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

  // ── Câmera + Scanner ─────────────────────────────────────
  async function startCamera() {
    setScanStatus("Iniciando câmera...")
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Tenta BarcodeDetector nativo (Chrome Android 9+)
      if ("BarcodeDetector" in window) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] })
        setScanStatus("Aponte para o QR Code")
        scanWithBarcodeDetector()
      } else {
        // Fallback: carrega jsQR
        setScanStatus("Carregando scanner...")
        await loadJsQR()
        setScanStatus("Aponte para o QR Code")
        scanWithJsQR()
      }
    } catch (e) {
      setError("Câmera não autorizada. Permita o acesso nas configurações do navegador.")
      setScanStatus("")
    }
  }

  function stopCamera() {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }

  // Método 1: BarcodeDetector nativo
  async function scanWithBarcodeDetector() {
    const video = videoRef.current
    if (!video || !detectorRef.current) return

    try {
      const barcodes = await detectorRef.current.detect(video)
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue
        if (code) { stopCamera(); onQRDetected(code); return }
      }
    } catch {}

    animRef.current = requestAnimationFrame(scanWithBarcodeDetector)
  }

  // Método 2: jsQR canvas
  function scanWithJsQR() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !window.jsQR) return
    if (video.readyState < 2) { animRef.current = requestAnimationFrame(scanWithJsQR); return }

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    ctx.drawImage(video, 0, 0)

    // Processa várias escalas para melhorar a leitura
    for (const scale of [1, 0.75, 0.5]) {
      const w = Math.floor(canvas.width  * scale)
      const h = Math.floor(canvas.height * scale)
      const imgData = ctx.getImageData(0, 0, w, h)
      const code = window.jsQR(imgData.data, w, h, {
        inversionAttempts: "dontInvert"
      })
      if (code?.data) {
        stopCamera()
        onQRDetected(code.data)
        return
      }
    }
    animRef.current = requestAnimationFrame(scanWithJsQR)
  }

  async function loadJsQR() {
    if (window.jsQR) return
    return new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"
      s.onload  = resolve
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  useEffect(() => {
    if (step === "scanning") startCamera()
    else stopCamera()
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

  // ── Confirma check-in ou check-out ───────────────────────
  async function handleConfirm() {
    setSending(true)
    setError("")
    try {
      let res, data

      if (action === "start") {
        res = await fetch(`${API}/checkin/${clientId}/start`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            order_id: selectedOrder?.id || null,
            lat:   location?.lat,
            lon:   location?.lon,
            notes: notes || null,
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
      setError("Erro de conexão.")
    } finally {
      setSending(false)
    }
  }

  // ── Formatação ───────────────────────────────────────────
  const now     = new Date()
  const horaFmt = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const dataFmt = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })

  // ── Estilos ──────────────────────────────────────────────
  const S = {
    page:   { minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "'DM Sans',sans-serif" },
    card:   { width: "100%", maxWidth: 420, background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
    brand:  { textAlign: "center", marginBottom: 20 },
    brandT: { fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: "#4f8ef7", textTransform: "uppercase" },
    brandS: { fontSize: 11, color: "#6b7fa3", marginTop: 2 },
    clientB:{ background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 18, textAlign: "center" },
    clientN:{ color: "#f0f4ff", fontSize: "1.1rem", fontWeight: 700 },
    btnP:   { width: "100%", padding: 15, background: "linear-gradient(135deg,#4f8ef7,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10, boxShadow: "0 4px 20px rgba(79,142,247,0.35)" },
    btnG:   { width: "100%", padding: 15, background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
    btnS:   { width: "100%", padding: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#6b7fa3", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
    err:    { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 },
    input:  { width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#f0f4ff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 14, resize: "none" },
    badge:  (c) => ({ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${c}20`, color: c, marginBottom: 12, letterSpacing: "1px", textTransform: "uppercase" }),
    footer: { textAlign: "center", marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" },
    osBadge:(s) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: s === "in_progress" ? "rgba(245,158,11,0.2)" : "rgba(59,130,246,0.2)", color: s === "in_progress" ? "#f59e0b" : "#3b82f6" }),
  }

  function Brand() {
    return <div style={S.brand}><div style={S.brandT}>SV Finance</div><div style={S.brandS}>Registro de Serviço</div></div>
  }

  function ClientCard() {
    return client ? (
      <div style={S.clientB}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>🏪</div>
        <div style={S.clientN}>{client.name}</div>
        {client.address && <div style={{ color: "#6b7fa3", fontSize: 11, marginTop: 3 }}>{client.address}</div>}
      </div>
    ) : null
  }

  // ══════════════════════════════════════════════════════════
  // STEP: loading
  if (step === "loading") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <div style={{ textAlign: "center", color: "#6b7fa3", padding: "40px 0" }}>⏳ Carregando...</div>
    </div></div>
  )

  // STEP: error
  if (step === "error") return (
    <div style={S.page}><div style={S.card}>
      <Brand />
      <div style={{ textAlign: "center", padding: "30px 0" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
        <div style={{ color: "#f87171" }}>{error}</div>
      </div>
    </div></div>
  )

  // STEP: select_os — escolhe a OS
  if (step === "select_os") return (
    <div style={S.page}><div style={S.card}>
      <Brand /><ClientCard />

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#6b7fa3", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
          Selecione a O.S do dia
        </div>

        {orders.length === 0 ? (
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "16px", textAlign: "center", color: "#f59e0b", fontSize: 13 }}>
            ⚠️ Nenhuma O.S aberta para este cliente.<br/>
            <span style={{ color: "#6b7fa3", fontSize: 12 }}>Peça ao administrador para criar uma O.S.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {orders.map(o => (
              <div
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                style={{
                  background: selectedOrder?.id === o.id ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedOrder?.id === o.id ? "rgba(79,142,247,0.5)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#4f8ef7", fontWeight: 700, fontSize: 14 }}>{o.number}</div>
                    <div style={{ color: "#6b7fa3", fontSize: 12, marginTop: 2 }}>
                      {o.items?.length || 0} {o.items?.length === 1 ? "item" : "itens"} · R$ {(o.total || 0).toFixed(2)}
                    </div>
                  </div>
                  <span style={S.osBadge(o.status)}>
                    {o.status === "in_progress" ? "Em andamento" : "Aberta"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={S.err}>⚠️ {error}</div>}

      <button
        style={{ ...S.btnP, opacity: (!selectedOrder && orders.length > 0) ? 0.5 : 1 }}
        onClick={() => {
          if (orders.length === 0) {
            setStep("select_action")
          } else if (selectedOrder) {
            setStep("select_action")
          }
        }}
        disabled={orders.length > 0 && !selectedOrder}
      >
        Continuar →
      </button>

      <div style={S.footer}>
        <a href="https://svfinance.com.br" style={{ fontSize: 11, color: "#6b7fa3", textDecoration: "none" }}>
          Powered by <strong style={{ color: "#4f8ef7" }}>svfinance.com.br</strong>
        </a>
      </div>
    </div></div>
  )

  // STEP: select_action — entrada ou saída
  if (step === "select_action") return (
    <div style={S.page}><div style={S.card}>
      <Brand /><ClientCard />

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f0f4ff" }}>{horaFmt}</div>
        <div style={{ fontSize: 12, color: "#6b7fa3", textTransform: "capitalize" }}>{dataFmt}</div>
        {selectedOrder && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#4f8ef7", fontWeight: 600 }}>
            O.S: {selectedOrder.number}
          </div>
        )}
      </div>

      {error && <div style={S.err}>⚠️ {error}</div>}

      {openCheckin ? (
        <>
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px", marginBottom: 16, textAlign: "center" }}>
            <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⏱️ Serviço em andamento</div>
            <div style={{ color: "#6b7fa3", fontSize: 12 }}>
              Entrada: {openCheckin.checkin_at?.slice(11, 16)}
              {openCheckin.order_number && ` · ${openCheckin.order_number}`}
            </div>
          </div>
          <button style={S.btnG} onClick={() => { setAction("finish"); setStep("scanning") }}>
            ✅ Finalizar serviço — Escanear QR Code
          </button>
        </>
      ) : (
        <button style={S.btnP} onClick={() => { setAction("start"); setStep("scanning") }}>
          📍 Iniciar serviço — Escanear QR Code
        </button>
      )}

      <button style={S.btnS} onClick={() => setStep("select_os")}>← Voltar</button>
    </div></div>
  )

  // STEP: scanning — câmera
  if (step === "scanning") return (
    <div style={S.page}><div style={{ ...S.card, padding: "20px 16px" }}>
      <Brand />

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={S.badge(action === "start" ? "#4f8ef7" : "#22c55e")}>
          {action === "start" ? "📍 CHECK-IN · ENTRADA" : "✅ CHECK-OUT · SAÍDA"}
        </div>
        <div style={{ color: "#6b7fa3", fontSize: 12 }}>{scanStatus}</div>
      </div>

      {/* Viewfinder */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 14, background: "#000", aspectRatio: "4/3", maxHeight: 320 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Moldura */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ position: "relative", width: 180, height: 180 }}>
            {/* Sombra ao redor */}
            <div style={{ position: "absolute", inset: -2000, boxShadow: "inset 0 0 0 2000px rgba(0,0,0,0.45)" }} />
            {/* Borda */}
            <div style={{ position: "absolute", inset: 0, border: "2.5px solid #4f8ef7", borderRadius: 12 }} />
            {/* Cantos */}
            {[
              { top: 0, left: 0, borderTop: "3px solid #4f8ef7", borderLeft: "3px solid #4f8ef7" },
              { top: 0, right: 0, borderTop: "3px solid #4f8ef7", borderRight: "3px solid #4f8ef7" },
              { bottom: 0, left: 0, borderBottom: "3px solid #4f8ef7", borderLeft: "3px solid #4f8ef7" },
              { bottom: 0, right: 0, borderBottom: "3px solid #4f8ef7", borderRight: "3px solid #4f8ef7" },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
            ))}
            {/* Linha de scan animada */}
            <div style={{
              position: "absolute", left: 4, right: 4, height: 2,
              background: "linear-gradient(90deg, transparent, #4f8ef7, transparent)",
              animation: "scanLine 1.8s ease-in-out infinite",
            }} />
          </div>
        </div>
      </div>

      <style>{`@keyframes scanLine { 0%{top:10%} 50%{top:85%} 100%{top:10%} }`}</style>

      {error && <div style={S.err}>⚠️ {error}</div>}

      <button style={S.btnS} onClick={() => { stopCamera(); setStep("select_action") }}>← Cancelar</button>
    </div></div>
  )

  // STEP: confirming
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
          Entrada registrada às {openCheckin.checkin_at?.slice(11, 16)}
        </div>
      )}

      <textarea
        style={S.input}
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

  // STEP: success
  if (step === "success") return (
    <div style={S.page}><div style={S.card}>
      <Brand />

      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>
          {result?.action === "start" ? "📍" : "✅"}
        </div>
        <div style={{ color: result?.action === "start" ? "#4f8ef7" : "#22c55e", fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>
          {result?.action === "start" ? "Check-in registrado!" : "Serviço concluído!"}
        </div>

        {result?.action === "finish" && result?.duration_str && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "12px 16px", margin: "14px 0", display: "inline-block" }}>
            <div style={{ color: "#6b7fa3", fontSize: 11, marginBottom: 4 }}>Duração do serviço</div>
            <div style={{ color: "#22c55e", fontSize: "1.6rem", fontWeight: 700 }}>{result.duration_str}</div>
          </div>
        )}

        <div style={{ color: "#6b7fa3", fontSize: 12, marginTop: 6 }}>{dataFmt} às {horaFmt}</div>
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
        <a href="https://svfinance.com.br" style={{ fontSize: 11, color: "#6b7fa3", textDecoration: "none" }}>
          Powered by <strong style={{ color: "#4f8ef7" }}>svfinance.com.br</strong>
        </a>
      </div>
    </div></div>
  )

  return null
}