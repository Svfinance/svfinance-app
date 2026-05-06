// src/pages/BrandStudio.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";
import PageLayout from "../components/layout/PageLayout";
import Sidebar from "../components/layout/Sidebar";

const API = "https://finance-control-api-production.up.railway.app/api";
const tkn = () => localStorage.getItem("token");

// ── Canvas presets ──────────────────────────────────────────
const PRESETS = [
  { id:"insta_post",      label:"Instagram Post",    w:1080, h:1080, dw:460, dh:460 },
  { id:"insta_story",     label:"Instagram Story",   w:1080, h:1920, dw:258, dh:460 },
  { id:"linkedin_post",   label:"LinkedIn Post",     w:1200, h:627,  dw:460, dh:240 },
  { id:"linkedin_banner", label:"LinkedIn Banner",   w:1584, h:396,  dw:460, dh:115 },
  { id:"landing_hero",    label:"Landing Hero",      w:1440, h:600,  dw:460, dh:192 },
];

// ── SV Finance palette ──────────────────────────────────────
const PALETTE = [
  "#0A0F1E","#0D1B2A","#1A2744","#0F3460",
  "#1565C0","#1976D2","#42A5F5","#00B4D8",
  "#00E5FF","#FFD700","#FFC107","#FF8F00",
  "#FFFFFF","#E0E0E0","#9E9E9E","#424242",
  "#00C853","#FF1744","#E040FB","#FF6D00",
];

const FONTS = [
  "Rajdhani","Exo 2","Orbitron","Bebas Neue",
  "Montserrat","Poppins","Space Grotesk","DM Sans",
];

const CLIP_SHAPES = [
  { id:"none",     label:"Nenhum",    clip:"none" },
  { id:"circle",   label:"Círculo",   clip:"circle(50%)" },
  { id:"ellipse",  label:"Elipse",    clip:"ellipse(60% 40%)" },
  { id:"star",     label:"Estrela",   clip:"polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" },
  { id:"diamond",  label:"Diamante",  clip:"polygon(50% 0%,100% 50%,50% 100%,0% 50%)" },
  { id:"triangle", label:"Triângulo", clip:"polygon(50% 0%,100% 100%,0% 100%)" },
  { id:"hexagon",  label:"Hexágono",  clip:"polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" },
  { id:"ribbon",   label:"Faixa",     clip:"polygon(0% 15%,100% 0%,100% 85%,0% 100%)" },
];

const BG_PRESETS = [
  { label:"Dark Blue",  val:"linear-gradient(135deg,#0A0F1E 0%,#0F3460 50%,#1565C0 100%)" },
  { label:"Midnight",   val:"linear-gradient(160deg,#0D1B2A 0%,#1A2744 60%,#0F3460 100%)" },
  { label:"Deep",       val:"linear-gradient(135deg,#0A0F1E 0%,#1A2744 100%)" },
  { label:"Cyan Fade",  val:"linear-gradient(135deg,#0F3460,#00B4D8)" },
  { label:"Gold",       val:"linear-gradient(135deg,#FFD700,#FF8F00)" },
  { label:"Pure Dark",  val:"#0A0F1E" },
  { label:"Navy",       val:"#0F3460" },
  { label:"Steel",      val:"#1565C0" },
];

let _id = 100;
const uid = () => `e${_id++}`;

const defText = () => ({
  fontFamily:"Rajdhani", fontSize:48, fontWeight:"700",
  color:"#FFFFFF", textAlign:"left", letterSpacing:2,
  lineHeight:1.2, opacity:1, shadow:false,
  shadowColor:"#000000", shadowBlur:8,
});

const TEMPLATES = [
  {
    id:"tpl_launch", label:"🚀 Lançamento",
    bg:"linear-gradient(135deg,#0A0F1E 0%,#0F3460 50%,#1565C0 100%)",
    elements:[
      { id:uid(),type:"rect",x:.05,y:.05,w:.9,h:.018,fill:"#FFD700",opacity:1,clip:"none" },
      { id:uid(),type:"text",x:.08,y:.15,w:.84,h:.15,text:"SV FINANCE",style:{...defText(),fontSize:72,letterSpacing:8,color:"#FFD700"} },
      { id:uid(),type:"text",x:.08,y:.32,w:.84,h:.1,text:"Controle total do seu negócio",style:{...defText(),fontSize:32,fontWeight:"400",color:"#00E5FF",letterSpacing:1} },
      { id:uid(),type:"text",x:.08,y:.72,w:.6,h:.1,text:"Experimente grátis →",style:{...defText(),fontSize:28,color:"#FFFFFF",letterSpacing:2} },
      { id:uid(),type:"rect",x:.05,y:.93,w:.9,h:.018,fill:"#FFD700",opacity:.4,clip:"none" },
    ],
  },
  {
    id:"tpl_feature", label:"✨ Feature",
    bg:"linear-gradient(160deg,#0D1B2A 0%,#1A2744 60%,#0F3460 100%)",
    elements:[
      { id:uid(),type:"rect",x:0,y:0,w:.006,h:1,fill:"#00E5FF",opacity:1,clip:"none" },
      { id:uid(),type:"text",x:.08,y:.1,w:.84,h:.12,text:"NOVA FUNCIONALIDADE",style:{...defText(),fontSize:22,color:"#00E5FF",letterSpacing:5} },
      { id:uid(),type:"text",x:.08,y:.28,w:.84,h:.2,text:"Integração NF-e",style:{...defText(),fontSize:64,color:"#FFFFFF"} },
      { id:uid(),type:"text",x:.08,y:.55,w:.84,h:.25,text:"Emita notas fiscais direto pelo sistema.",style:{...defText(),fontSize:26,fontWeight:"400",color:"#9E9E9E",letterSpacing:0,lineHeight:1.5} },
    ],
  },
  {
    id:"tpl_promo", label:"💰 Promoção",
    bg:"linear-gradient(135deg,#0A0F1E 0%,#1A2744 100%)",
    elements:[
      { id:uid(),type:"rect",x:.05,y:.08,w:.9,h:.84,fill:"#FFD700",opacity:.05,clip:"none" },
      { id:uid(),type:"text",x:.1,y:.12,w:.8,h:.15,text:"PLANO PRO",style:{...defText(),fontSize:52,color:"#FFD700",letterSpacing:6} },
      { id:uid(),type:"text",x:.1,y:.3,w:.8,h:.2,text:"R$ 49/mês",style:{...defText(),fontSize:72,color:"#FFFFFF"} },
      { id:uid(),type:"text",x:.1,y:.55,w:.8,h:.1,text:"Tudo que seu negócio precisa",style:{...defText(),fontSize:24,fontWeight:"400",color:"#00E5FF",letterSpacing:1} },
    ],
  },
  { id:"tpl_blank", label:"⬜ Em branco", bg:"#0A0F1E", elements:[] },
];

// ── Helpers ─────────────────────────────────────────────────
function deepClone(els) {
  return els.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }));
}

export default function BrandStudio() {
  const { theme, themeId } = useTheme();
  const isGlass = themeId === "glass" || themeId === "gray";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preset, setPreset]           = useState(PRESETS[0]);
  const [bg, setBg]                   = useState(TEMPLATES[0].bg);
  const [elements, setElements]       = useState(deepClone(TEMPLATES[0].elements));
  const [selected, setSelected]       = useState(null);
  const [activeTab, setActiveTab]     = useState("templates");
  const [showGrid, setShowGrid]       = useState(true);
  const [zoom, setZoom]               = useState(1);
  const [dragging, setDragging]       = useState(null);
  const [dragOffset, setDragOffset]   = useState({ x:0, y:0 });
  const [aiPrompt, setAiPrompt]       = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const [rembgLoading, setRembgLoading] = useState(false);
  const [toast, setToast]             = useState(null);
  const [projects, setProjects]       = useState([]);
  const [assets, setAssets]           = useState([]);
  const [projectName, setProjectName] = useState("Meu Post");
  const [history, setHistory]         = useState([]);
  const [histIdx, setHistIdx]         = useState(-1);
  const [eraserMode, setEraserMode]   = useState(false);
  const [lassoMode, setLassoMode]     = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [isLassoing, setIsLassoing]   = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const canvasRef   = useRef(null);
  const fileRef     = useRef(null);
  const assetRef    = useRef(null);

  const cw = preset.dw;
  const ch = preset.dh;
  const selectedEl = elements.find(e => e.id === selected);

  // ── History ──────────────────────────────────────────────
  const pushHistory = useCallback((els) => {
    setHistory(h => {
      const trimmed = h.slice(0, histIdx + 1);
      return [...trimmed, deepClone(els)].slice(-30);
    });
    setHistIdx(i => Math.min(i + 1, 29));
  }, [histIdx]);

  const undo = () => {
    if (histIdx <= 0) return;
    const newIdx = histIdx - 1;
    setElements(deepClone(history[newIdx]));
    setHistIdx(newIdx);
  };

  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const newIdx = histIdx + 1;
    setElements(deepClone(history[newIdx]));
    setHistIdx(newIdx);
  };

  useEffect(() => {
    // Init history
    pushHistory(elements);
    loadProjects();
    loadAssets();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
          deleteSelected();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [histIdx, history, selected]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Element ops ──────────────────────────────────────────
  const updateEl = (id, patch) => {
    setElements(els => {
      const next = els.map(e => e.id === id ? { ...e, ...patch } : e);
      pushHistory(next);
      return next;
    });
  };

  const updateStyle = (id, patch) => {
    setElements(els => {
      const next = els.map(e => e.id === id ? { ...e, style:{ ...e.style, ...patch } } : e);
      pushHistory(next);
      return next;
    });
  };

  const addText = () => {
    const el = { id:uid(), type:"text", x:.1, y:.1, w:.8, h:.12, text:"Novo Texto", style:defText(), clip:"none" };
    setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
    setSelected(el.id);
  };

  const addRect = () => {
    const el = { id:uid(), type:"rect", x:.2, y:.2, w:.6, h:.1, fill:"#1565C0", opacity:1, clip:"none" };
    setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
    setSelected(el.id);
  };

  const duplicateEl = () => {
    if (!selectedEl) return;
    const clone = { ...selectedEl, id:uid(), x:selectedEl.x+.03, y:selectedEl.y+.03, style:selectedEl.style?{...selectedEl.style}:undefined };
    setElements(els => { const n=[...els,clone]; pushHistory(n); return n; });
    setSelected(clone.id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setElements(els => { const n=els.filter(e=>e.id!==selected); pushHistory(n); return n; });
    setSelected(null);
  };

  const moveLayer = (id, dir) => {
    setElements(els => {
      const idx = els.findIndex(e => e.id === id);
      if (idx < 0) return els;
      const next = [...els];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return els;
      [next[idx], next[t]] = [next[t], next[idx]];
      pushHistory(next);
      return next;
    });
  };

  const applyTemplate = (tpl) => {
    setBg(tpl.bg);
    const els = deepClone(tpl.elements).map(e => ({ ...e, id:uid(), clip: e.clip||"none" }));
    setElements(els);
    pushHistory(els);
    setSelected(null);
  };

  // ── Upload imagem comum ──────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const el = { id:uid(), type:"image", x:.1, y:.1, w:.4, h:.4, src:ev.target.result, opacity:1, clip:"none" };
      setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
      setSelected(el.id);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Remoção de fundo via Flask ───────────────────────────
  const handleRemoveBg = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRembgLoading(true);
    showToast("Removendo fundo... pode levar alguns segundos.", "info");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API}/brand-studio/remove-bg`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${tkn()}` },
        body: formData,
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.msg||"Erro"); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const el = { id:uid(), type:"image", x:.1, y:.1, w:.4, h:.4, src:url, opacity:1, clip:"none" };
      setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
      setSelected(el.id);
      showToast("Fundo removido com sucesso!");
    } catch(err) {
      showToast(err.message || "Erro ao remover fundo.", "error");
    }
    setRembgLoading(false);
    e.target.value = "";
  };

  // ── Upload asset (biblioteca) ────────────────────────────
  const handleAssetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res  = await fetch(`${API}/brand-studio/assets`, {
        method:"POST", headers:{ Authorization:`Bearer ${tkn()}` }, body:formData,
      });
      const data = await res.json();
      if (res.ok) { showToast("Asset salvo!"); loadAssets(); }
      else showToast(data.msg||"Erro.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
    e.target.value = "";
  };

  const loadAssets = async () => {
    try {
      const res  = await fetch(`${API}/brand-studio/assets`, { headers:{ Authorization:`Bearer ${tkn()}` } });
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {}
  };

  const useAsset = (url) => {
    const el = { id:uid(), type:"image", x:.1, y:.1, w:.4, h:.4, src:url, opacity:1, clip:"none" };
    setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
    setSelected(el.id);
  };

  // ── IA Copy ──────────────────────────────────────────────
  const generateAICopy = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res  = await fetch(`${API}/brand-studio/ai-copy`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${tkn()}` },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      const { title, subtitle, cta } = data;
      const els = [
        { id:uid(), type:"text", x:.08, y:.2,  w:.84, h:.15, text:title,    style:{...defText(),fontSize:52},                             clip:"none" },
        { id:uid(), type:"text", x:.08, y:.4,  w:.84, h:.1,  text:subtitle, style:{...defText(),fontSize:28,fontWeight:"400",color:"#00E5FF"}, clip:"none" },
        { id:uid(), type:"text", x:.08, y:.72, w:.6,  h:.1,  text:cta,      style:{...defText(),fontSize:26,color:"#FFD700"},               clip:"none" },
      ];
      setElements(prev => { const n=[...prev,...els]; pushHistory(n); return n; });
      setAiPrompt("");
      showToast("Textos gerados!");
    } catch(err) {
      showToast(err.message||"Erro ao gerar.", "error");
    }
    setAiLoading(false);
  };

  // ── Projetos ─────────────────────────────────────────────
  const loadProjects = async () => {
    try {
      const res  = await fetch(`${API}/brand-studio/projects`, { headers:{ Authorization:`Bearer ${tkn()}` } });
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {}
  };

  const saveProject = async () => {
    const payload = { name:projectName, canvas_data:JSON.stringify({ bg, elements }), format:preset.id };
    try {
      const res  = await fetch(`${API}/brand-studio/projects`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${tkn()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) { showToast("Projeto salvo!"); loadProjects(); }
      else showToast(data.msg||"Erro.", "error");
    } catch { showToast("Erro de conexão.", "error"); }
  };

  const loadProject = (proj) => {
    try {
      const { bg: b, elements: els } = JSON.parse(proj.canvas_data);
      setBg(b);
      const loaded = deepClone(els).map(e => ({ ...e, clip: e.clip||"none" }));
      setElements(loaded);
      pushHistory(loaded);
      setSelected(null);
      const p = PRESETS.find(p => p.id === proj.format) || PRESETS[0];
      setPreset(p);
      setProjectName(proj.name);
      showToast("Projeto carregado!");
    } catch { showToast("Erro ao carregar projeto.", "error"); }
  };

  const deleteProject = async (id) => {
    try {
      await fetch(`${API}/brand-studio/projects/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${tkn()}` } });
      loadProjects();
      showToast("Projeto removido.");
    } catch {}
  };

  // ── Export PNG ───────────────────────────────────────────
  const exportCanvas = () => {
    setExportLoading(true);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => {
      window.html2canvas(canvasRef.current, {
        useCORS:true, allowTaint:true,
        scale: preset.w / cw,
        backgroundColor: null,
      }).then(canvas => {
        const link = document.createElement("a");
        link.download = `sv-finance-${preset.id}-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setExportLoading(false);
        showToast("PNG exportado!");
      });
    };
    document.head.appendChild(script);
  };

  // ── Drag ─────────────────────────────────────────────────
  const onMouseDown = (e, id) => {
    e.stopPropagation();
    setSelected(id);
    if (lassoMode || eraserMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const el   = elements.find(x => x.id === id);
    setDragging(id);
    setDragOffset({ x: e.clientX - rect.left - el.x * cw, y: e.clientY - rect.top - el.y * ch });
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const nx   = (e.clientX - rect.left - dragOffset.x) / cw;
    const ny   = (e.clientY - rect.top  - dragOffset.y) / ch;
    setElements(els => els.map(el => el.id === dragging
      ? { ...el, x:Math.max(0,Math.min(nx,.97)), y:Math.max(0,Math.min(ny,.97)) }
      : el
    ));
  }, [dragging, dragOffset, cw, ch]);

  const onMouseUp = useCallback(() => {
    if (dragging) pushHistory(elements);
    setDragging(null);
  }, [dragging, elements]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  // ── Lasso erase ──────────────────────────────────────────
  const startLasso = (e) => {
    if (!lassoMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setIsLassoing(true);
    setLassoPoints([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const moveLasso = (e) => {
    if (!isLassoing || !lassoMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setLassoPoints(pts => [...pts, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const endLasso = () => {
    if (!isLassoing || !lassoMode || !selectedEl || selectedEl.type !== "image") {
      setIsLassoing(false); setLassoPoints([]); return;
    }
    // Apply lasso as clip-path polygon on the image
    const pts = lassoPoints;
    if (pts.length < 3) { setIsLassoing(false); setLassoPoints([]); return; }
    const el = selectedEl;
    const elLeft = el.x * cw, elTop = el.y * ch;
    const elW = el.w * cw, elH = el.h * ch;
    const poly = pts.map(p => {
      const px = Math.max(0, Math.min(100, ((p.x - elLeft) / elW) * 100));
      const py = Math.max(0, Math.min(100, ((p.y - elTop)  / elH) * 100));
      return `${px.toFixed(1)}% ${py.toFixed(1)}%`;
    }).join(",");
    updateEl(selectedEl.id, { clip:`polygon(${poly})` });
    setIsLassoing(false);
    setLassoPoints([]);
    showToast("Recorte lasso aplicado!");
  };

  // ── Render element ────────────────────────────────────────
  const renderEl = (el) => {
    const isSel = el.id === selected;
    const clipShape = CLIP_SHAPES.find(c => c.id === el.clip) || CLIP_SHAPES[0];
    const clipVal = el.clip?.startsWith("polygon(") ? el.clip : (clipShape?.clip || "none");

    const base = {
      position:"absolute",
      left:   el.x * cw, top:   el.y * ch,
      width:  el.w * cw, height:el.h * ch,
      opacity: el.opacity ?? 1,
      cursor:  dragging === el.id ? "grabbing" : "grab",
      boxSizing:"border-box",
      outline: isSel ? "2px solid #00E5FF" : "none",
      outlineOffset:"1px",
      clipPath: clipVal !== "none" ? clipVal : undefined,
    };

    if (el.type === "rect") return (
      <div key={el.id} style={{ ...base, background:el.fill }}
        onMouseDown={e => onMouseDown(e, el.id)} />
    );

    if (el.type === "text") {
      const s = el.style || {};
      return (
        <div key={el.id} style={{
          ...base,
          fontFamily:`'${s.fontFamily}',sans-serif`,
          fontSize:   s.fontSize * (cw / 480),
          fontWeight: s.fontWeight,
          color:      s.color,
          textAlign:  s.textAlign,
          letterSpacing: s.letterSpacing,
          lineHeight: s.lineHeight,
          userSelect:"none",
          display:"flex", alignItems:"center",
          textShadow: s.shadow ? `0 2px ${s.shadowBlur}px ${s.shadowColor}` : "none",
          whiteSpace:"pre-wrap", wordBreak:"break-word",
          padding:"2px 4px",
        }} onMouseDown={e => onMouseDown(e, el.id)}>
          {el.text}
        </div>
      );
    }

    if (el.type === "image") return (
      <img key={el.id} src={el.src} alt="" draggable={false}
        style={{ ...base, objectFit:"contain" }}
        onMouseDown={e => onMouseDown(e, el.id)} />
    );

    return null;
  };

  // ── Styles ────────────────────────────────────────────────
  const panelBg  = "#0D1221";
  const border   = "#1A2744";
  const accent   = "#00E5FF";
  const gold     = "#FFD700";
  const muted    = "#9E9E9E";
  const subtle   = "#555";

  const panelSec = { fontSize:9, color:subtle, letterSpacing:2, marginBottom:8, textTransform:"uppercase" };
  const miniBtn  = (active) => ({
    flex:1, padding:"7px 6px", background:active?"#0F3460":"#1A2744",
    border:`1px solid ${active?accent:border}`, borderRadius:4,
    color:active?accent:muted, cursor:"pointer", fontSize:10,
    fontFamily:"inherit", transition:"all .15s",
  });
  const propLabel = { fontSize:9, color:subtle, letterSpacing:2, marginBottom:4, marginTop:10 };
  const propInput = {
    width:"100%", background:"#1A2744", border:`1px solid ${border}`,
    borderRadius:4, color:"#E0E0E0", padding:"4px 6px", fontSize:11,
    fontFamily:"inherit", boxSizing:"border-box",
  };
  const propSelect = { ...propInput, cursor:"pointer" };

  return (
    <div style={{ display:"flex", height:"100vh", background:"#0A0F1E", fontFamily:"'Rajdhani',sans-serif", color:"#E0E0E0", overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;600;700&family=Orbitron:wght@400;700&family=Bebas+Neue&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600&family=Space+Grotesk:wght@400;600&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet" />

      {/* ══ LEFT PANEL ══ */}
      <div style={{ width:220, background:panelBg, borderRight:`1px solid ${border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>

        {/* Logo */}
        <div style={{ padding:"12px 14px", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", gap:8 }}>
          <svg viewBox="0 0 28 28" style={{ width:28, height:28, flexShrink:0 }}>
            <polygon points="14,2 26,24 2,24" fill="none" stroke="url(#g1)" strokeWidth="2"/>
            <polygon points="14,8 22,22 6,22" fill="none" stroke="url(#g2)" strokeWidth="1.5"/>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFD700"/><stop offset="100%" stopColor="#FF8F00"/></linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00E5FF"/><stop offset="100%" stopColor="#1565C0"/></linearGradient>
            </defs>
          </svg>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:gold, letterSpacing:2 }}>SV FINANCE</div>
            <div style={{ fontSize:8, color:accent, letterSpacing:1.5 }}>BRAND STUDIO</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${border}` }}>
          {[["templates","📋"],["layers","🗂"],["projects","💾"],["assets","🖼"],["ai","✨"]].map(([id,icon])=>(
            <button key={id} onClick={()=>setActiveTab(id)} style={{
              flex:1, padding:"7px 0", background:activeTab===id?"#1A2744":"transparent",
              border:"none", color:activeTab===id?accent:"#555", cursor:"pointer", fontSize:13,
              borderBottom:activeTab===id?`2px solid ${accent}`:"2px solid transparent",
            }}>{icon}</button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:10 }}>

          {/* ── TEMPLATES ── */}
          {activeTab==="templates" && (
            <div>
              <div style={panelSec}>Templates</div>
              {TEMPLATES.map(tpl=>(
                <button key={tpl.id} onClick={()=>applyTemplate(tpl)} style={{
                  width:"100%", marginBottom:5, padding:"8px 10px", background:"#1A2744",
                  border:`1px solid ${border}`, borderRadius:4, color:"#E0E0E0",
                  cursor:"pointer", textAlign:"left", fontSize:12, fontFamily:"inherit",
                }}>
                  {tpl.label}
                </button>
              ))}

              <div style={{ ...panelSec, marginTop:16 }}>Adicionar</div>
              {[
                ["📝 Texto",       addText],
                ["⬛ Forma",        addRect],
              ].map(([lbl,fn])=>(
                <button key={lbl} onClick={fn} style={{ width:"100%", marginBottom:4, padding:"7px 10px", background:"#1A2744", border:`1px solid ${border}`, borderRadius:4, color:muted, cursor:"pointer", textAlign:"left", fontSize:11, fontFamily:"inherit" }}>{lbl}</button>
              ))}
              <button onClick={()=>fileRef.current.click()} style={{ width:"100%", marginBottom:4, padding:"7px 10px", background:"#1A2744", border:`1px solid ${border}`, borderRadius:4, color:muted, cursor:"pointer", textAlign:"left", fontSize:11, fontFamily:"inherit" }}>🖼 Upload imagem</button>

              {/* Remover fundo */}
              <button onClick={()=>{ const i=document.createElement("input"); i.type="file"; i.accept="image/*"; i.onchange=handleRemoveBg; i.click(); }}
                disabled={rembgLoading}
                style={{ width:"100%", marginBottom:4, padding:"7px 10px", background:rembgLoading?"#1A2744":"rgba(0,229,255,0.08)", border:`1px solid ${rembgLoading?"#1A2744":accent+"44"}`, borderRadius:4, color:rembgLoading?subtle:accent, cursor:rembgLoading?"wait":"pointer", textAlign:"left", fontSize:11, fontFamily:"inherit" }}>
                {rembgLoading?"⏳ Removendo...":"✂️ Remover fundo (IA)"}
              </button>

              <div style={{ ...panelSec, marginTop:16 }}>Formato do Canvas</div>
              {PRESETS.map(p=>(
                <button key={p.id} onClick={()=>{ setPreset(p); setSelected(null); }} style={{
                  width:"100%", marginBottom:4, padding:"6px 10px",
                  background:preset.id===p.id?"#0F3460":"#1A2744",
                  border:`1px solid ${preset.id===p.id?accent:border}`,
                  borderRadius:4, color:preset.id===p.id?accent:muted,
                  cursor:"pointer", textAlign:"left", fontSize:10, fontFamily:"inherit",
                }}>{p.label}</button>
              ))}

              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleImageUpload}/>
            </div>
          )}

          {/* ── LAYERS ── */}
          {activeTab==="layers" && (
            <div>
              <div style={panelSec}>Layers ({elements.length})</div>
              {[...elements].reverse().map(el=>(
                <div key={el.id} onClick={()=>setSelected(el.id)} style={{
                  padding:"6px 8px", marginBottom:3, borderRadius:4, cursor:"pointer",
                  background:el.id===selected?"#0F3460":"#1A2744",
                  border:`1px solid ${el.id===selected?accent:border}`,
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  fontSize:11, color:el.id===selected?accent:muted,
                }}>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:110 }}>
                    {el.type==="text"?`📝 ${el.text?.slice(0,12)}`:el.type==="image"?"🖼 Imagem":"⬛ Forma"}
                  </span>
                  <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                    <button onClick={e=>{e.stopPropagation();moveLayer(el.id,1);}} style={{ width:18,height:18,background:"#0A0F1E",border:"none",borderRadius:3,color:muted,cursor:"pointer",fontSize:10,padding:0 }}>↓</button>
                    <button onClick={e=>{e.stopPropagation();moveLayer(el.id,-1);}} style={{ width:18,height:18,background:"#0A0F1E",border:"none",borderRadius:3,color:muted,cursor:"pointer",fontSize:10,padding:0 }}>↑</button>
                  </div>
                </div>
              ))}
              {elements.length === 0 && <div style={{ fontSize:11, color:subtle, textAlign:"center", paddingTop:20 }}>Nenhum elemento</div>}
            </div>
          )}

          {/* ── PROJECTS ── */}
          {activeTab==="projects" && (
            <div>
              <div style={panelSec}>Salvar Projeto</div>
              <input value={projectName} onChange={e=>setProjectName(e.target.value)}
                style={{ ...propInput, marginBottom:6 }} placeholder="Nome do projeto"/>
              <button onClick={saveProject} style={{ width:"100%", padding:"8px", background:`linear-gradient(90deg,#1565C0,#00B4D8)`, border:"none", borderRadius:4, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12, marginBottom:16 }}>
                💾 Salvar
              </button>

              <div style={panelSec}>Meus Projetos</div>
              {projects.length===0 && <div style={{ fontSize:11, color:subtle, textAlign:"center", padding:"12px 0" }}>Nenhum projeto salvo</div>}
              {projects.map(p=>(
                <div key={p.id} style={{ background:"#1A2744", border:`1px solid ${border}`, borderRadius:4, padding:"8px 10px", marginBottom:5 }}>
                  <div style={{ fontSize:11, color:"#E0E0E0", marginBottom:4, fontWeight:600 }}>{p.name}</div>
                  <div style={{ fontSize:9, color:subtle, marginBottom:6 }}>{p.format} · {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>loadProject(p)} style={{ flex:1, padding:"4px", background:"#0F3460", border:`1px solid ${accent}44`, borderRadius:3, color:accent, cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>Abrir</button>
                    <button onClick={()=>deleteProject(p.id)} style={{ padding:"4px 8px", background:"rgba(255,23,68,0.1)", border:"1px solid rgba(255,23,68,0.3)", borderRadius:3, color:"#FF1744", cursor:"pointer", fontSize:10 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ASSETS ── */}
          {activeTab==="assets" && (
            <div>
              <div style={panelSec}>Biblioteca de Assets</div>
              <button onClick={()=>assetRef.current.click()} style={{ width:"100%", marginBottom:10, padding:"7px", background:"rgba(255,215,0,0.08)", border:`1px solid ${gold}44`, borderRadius:4, color:gold, cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
                ➕ Upload Asset
              </button>
              <input ref={assetRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAssetUpload}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {assets.map(a=>(
                  <div key={a.id} onClick={()=>useAsset(a.url)} style={{ background:"#1A2744", border:`1px solid ${border}`, borderRadius:4, overflow:"hidden", cursor:"pointer", aspectRatio:"1", position:"relative" }}>
                    <img src={a.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", transition:"background .2s", display:"flex", alignItems:"center", justifyContent:"center" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,229,255,0.2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"}>
                    </div>
                  </div>
                ))}
                {assets.length===0 && <div style={{ gridColumn:"1/-1", fontSize:11, color:subtle, textAlign:"center", padding:"12px 0" }}>Nenhum asset</div>}
              </div>
            </div>
          )}

          {/* ── AI ── */}
          {activeTab==="ai" && (
            <div>
              <div style={panelSec}>Gerar Copy com IA</div>
              <div style={{ fontSize:11, color:muted, marginBottom:8, lineHeight:1.5 }}>Descreva o que quer comunicar:</div>
              <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
                placeholder="Ex: post promovendo o plano gratuito para MEIs"
                style={{ width:"100%", height:80, background:"#1A2744", border:`1px solid ${border}`, borderRadius:4, color:"#E0E0E0", fontSize:11, padding:8, resize:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
              <button onClick={generateAICopy} disabled={aiLoading} style={{
                width:"100%", marginTop:6, padding:"8px",
                background:aiLoading?"#1A2744":"linear-gradient(90deg,#1565C0,#00B4D8)",
                border:"none", borderRadius:4, color:"#FFF",
                cursor:aiLoading?"wait":"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12, letterSpacing:1,
              }}>
                {aiLoading?"⏳ Gerando...":"✨ Gerar Textos"}
              </button>
              <div style={{ fontSize:10, color:subtle, marginTop:8, lineHeight:1.5 }}>Os textos são adicionados ao canvas automaticamente.</div>
            </div>
          )}
        </div>
      </div>

      {/* ══ CENTER — Canvas Area ══ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#111827", minWidth:0 }}>

        {/* Toolbar */}
        <div style={{ height:44, background:panelBg, borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", padding:"0 10px", gap:6, flexWrap:"nowrap" }}>
          {/* Undo / Redo */}
          <button title="Desfazer (Ctrl+Z)" onClick={undo} disabled={histIdx<=0} style={{ width:30,height:30,background:"#1A2744",border:`1px solid ${border}`,borderRadius:4,color:histIdx<=0?subtle:muted,cursor:histIdx<=0?"default":"pointer",fontSize:12 }}>↩</button>
          <button title="Refazer (Ctrl+Y)"  onClick={redo} disabled={histIdx>=history.length-1} style={{ width:30,height:30,background:"#1A2744",border:`1px solid ${border}`,borderRadius:4,color:histIdx>=history.length-1?subtle:muted,cursor:histIdx>=history.length-1?"default":"pointer",fontSize:12 }}>↪</button>

          <div style={{ width:1, height:24, background:border, margin:"0 2px" }}/>

          {/* Lasso */}
          <button title="Recorte Lasso" onClick={()=>{ setLassoMode(v=>!v); setEraserMode(false); }} style={{
            width:30, height:30, background:lassoMode?"#1565C0":"#1A2744",
            border:`1px solid ${lassoMode?accent:border}`, borderRadius:4,
            color:lassoMode?"#fff":muted, cursor:"pointer", fontSize:12,
          }}>🔲</button>

          {/* Duplicate */}
          {selectedEl && (
            <button title="Duplicar" onClick={duplicateEl} style={{ width:30,height:30,background:"#1A2744",border:`1px solid ${border}`,borderRadius:4,color:muted,cursor:"pointer",fontSize:13 }}>⿻</button>
          )}
          {/* Delete */}
          {selectedEl && (
            <button title="Deletar (Del)" onClick={deleteSelected} style={{ padding:"4px 10px",background:"rgba(255,23,68,0.15)",border:"1px solid rgba(255,23,68,0.3)",borderRadius:4,color:"#FF1744",cursor:"pointer",fontSize:11,fontFamily:"inherit" }}>🗑 Del</button>
          )}

          <div style={{ flex:1 }}/>

          {/* Grid + Zoom */}
          <label style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,color:subtle,cursor:"pointer" }}>
            <input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)} style={{ accentColor:accent }}/>
            Grid
          </label>
          <span style={{ fontSize:10, color:subtle }}>Zoom</span>
          <input type="range" min=".3" max="2.5" step=".1" value={zoom} onChange={e=>setZoom(Number(e.target.value))} style={{ width:70, accentColor:accent }}/>
          <span style={{ fontSize:10, color:accent, fontWeight:700, minWidth:30 }}>{Math.round(zoom*100)}%</span>

          {/* Export */}
          <button onClick={exportCanvas} disabled={exportLoading} style={{
            padding:"6px 14px", background:`linear-gradient(90deg,${gold},#FF8F00)`,
            border:"none", borderRadius:4, color:"#0A0F1E",
            cursor:exportLoading?"wait":"pointer", fontFamily:"inherit", fontWeight:700, fontSize:11, letterSpacing:1, marginLeft:6,
          }}>
            {exportLoading?"⏳":"⬇"} PNG
          </button>
        </div>

        {/* Canvas workspace */}
        <div style={{ flex:1, overflow:"auto", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
          onMouseDown={e=>{ setSelected(null); startLasso(e); }}
          onMouseMove={moveLasso}
          onMouseUp={endLasso}>
          <div style={{ transform:`scale(${zoom})`, transformOrigin:"center center" }}>
            <div style={{ textAlign:"center", marginBottom:6, fontSize:9, color:subtle, letterSpacing:2 }}>
              {preset.label.toUpperCase()} — {preset.w}×{preset.h}px
            </div>
            <div ref={canvasRef} style={{
              width:cw, height:ch, background:bg, position:"relative", overflow:"hidden",
              boxShadow:"0 8px 40px rgba(0,0,0,0.6),0 0 0 1px #1A2744",
              backgroundImage: showGrid
                ? `${bg.startsWith("linear")?bg:`url('data:image/png;base64,')`},repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.03) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.03) 40px)`
                : bg,
            }}>
              {elements.map(renderEl)}

              {/* Lasso overlay */}
              {isLassoing && lassoPoints.length > 1 && (
                <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }}>
                  <polyline
                    points={lassoPoints.map(p=>`${p.x},${p.y}`).join(" ")}
                    fill="rgba(0,229,255,0.1)"
                    stroke="#00E5FF"
                    strokeWidth="1.5"
                    strokeDasharray="5,3"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — Properties ══ */}
      <div style={{ width:230, background:panelBg, borderLeft:`1px solid ${border}`, display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${border}`, fontSize:9, color:subtle, letterSpacing:2 }}>PROPRIEDADES</div>

        {/* Fundo */}
        {!selectedEl && (
          <div style={{ padding:14 }}>
            <div style={propLabel}>Plano de Fundo</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
              {BG_PRESETS.map((b,i)=>(
                <div key={i} onClick={()=>setBg(b.val)} title={b.label} style={{
                  width:28, height:28, background:b.val, borderRadius:4, cursor:"pointer",
                  border:bg===b.val?`2px solid ${accent}`:"2px solid transparent",
                }}/>
              ))}
            </div>
            <div style={propLabel}>Cor personalizada</div>
            <input type="color" defaultValue="#0A0F1E" onChange={e=>setBg(e.target.value)}
              style={{ width:"100%", height:32, border:"none", borderRadius:4, cursor:"pointer", background:"none" }}/>
            <div style={{ marginTop:16, fontSize:10, color:subtle, textAlign:"center", lineHeight:1.6 }}>
              Selecione um elemento para editar suas propriedades.<br/>
              {lassoMode && <span style={{ color:accent }}>🔲 Modo lasso ativo — desenhe sobre a imagem selecionada.</span>}
            </div>
          </div>
        )}

        {/* Texto */}
        {selectedEl?.type === "text" && (
          <div style={{ padding:14 }}>
            <div style={propLabel}>Texto</div>
            <textarea value={selectedEl.text} onChange={e=>updateEl(selected,{text:e.target.value})}
              style={{ width:"100%", height:60, background:"#1A2744", border:`1px solid ${border}`, borderRadius:4, color:"#E0E0E0", fontSize:12, padding:6, resize:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>

            <div style={propLabel}>Fonte</div>
            <select value={selectedEl.style.fontFamily} onChange={e=>updateStyle(selected,{fontFamily:e.target.value})} style={propSelect}>
              {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
            </select>

            <div style={propLabel}>Tamanho — {selectedEl.style.fontSize}px</div>
            <input type="range" min="8" max="150" value={selectedEl.style.fontSize}
              onChange={e=>updateStyle(selected,{fontSize:Number(e.target.value)})}
              style={{ width:"100%", accentColor:accent }}/>

            <div style={propLabel}>Peso</div>
            <select value={selectedEl.style.fontWeight} onChange={e=>updateStyle(selected,{fontWeight:e.target.value})} style={propSelect}>
              {["300","400","500","600","700","800"].map(w=><option key={w} value={w}>{w}</option>)}
            </select>

            <div style={propLabel}>Alinhamento</div>
            <div style={{ display:"flex", gap:4 }}>
              {[["left","⬅"],["center","↔"],["right","➡"]].map(([a,ic])=>(
                <button key={a} onClick={()=>updateStyle(selected,{textAlign:a})} style={{
                  flex:1, padding:4, background:selectedEl.style.textAlign===a?"#1565C0":"#1A2744",
                  border:"none", borderRadius:4, color:"#FFF", cursor:"pointer", fontSize:12,
                }}>{ic}</button>
              ))}
            </div>

            <div style={propLabel}>Espaçamento — {selectedEl.style.letterSpacing}px</div>
            <input type="range" min="0" max="20" value={selectedEl.style.letterSpacing}
              onChange={e=>updateStyle(selected,{letterSpacing:Number(e.target.value)})}
              style={{ width:"100%", accentColor:accent }}/>

            <div style={propLabel}>Cor do texto</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:5 }}>
              {PALETTE.map(c=>(
                <div key={c} onClick={()=>updateStyle(selected,{color:c})} style={{
                  width:20, height:20, background:c, borderRadius:3, cursor:"pointer",
                  border:selectedEl.style.color===c?`2px solid ${accent}`:"2px solid transparent",
                }}/>
              ))}
            </div>
            <input type="color" value={selectedEl.style.color}
              onChange={e=>updateStyle(selected,{color:e.target.value})}
              style={{ width:"100%", height:26, border:"none", borderRadius:4, cursor:"pointer" }}/>

            <div style={propLabel}>Sombra</div>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, cursor:"pointer" }}>
              <input type="checkbox" checked={selectedEl.style.shadow||false}
                onChange={e=>updateStyle(selected,{shadow:e.target.checked})} style={{ accentColor:accent }}/>
              Ativar sombra
            </label>

            <div style={propLabel}>Opacidade — {Math.round((selectedEl.opacity??1)*100)}%</div>
            <input type="range" min="0" max="1" step=".05" value={selectedEl.opacity??1}
              onChange={e=>updateEl(selected,{opacity:Number(e.target.value)})}
              style={{ width:"100%", accentColor:accent }}/>
          </div>
        )}

        {/* Forma */}
        {selectedEl?.type === "rect" && (
          <div style={{ padding:14 }}>
            <div style={propLabel}>Cor da forma</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:5 }}>
              {PALETTE.map(c=>(
                <div key={c} onClick={()=>updateEl(selected,{fill:c})} style={{
                  width:20, height:20, background:c, borderRadius:3, cursor:"pointer",
                  border:selectedEl.fill===c?`2px solid ${accent}`:"2px solid transparent",
                }}/>
              ))}
            </div>
            <input type="color" value={selectedEl.fill} onChange={e=>updateEl(selected,{fill:e.target.value})}
              style={{ width:"100%", height:26, border:"none", borderRadius:4, cursor:"pointer" }}/>
            <div style={propLabel}>Opacidade — {Math.round((selectedEl.opacity??1)*100)}%</div>
            <input type="range" min="0" max="1" step=".05" value={selectedEl.opacity??1}
              onChange={e=>updateEl(selected,{opacity:Number(e.target.value)})}
              style={{ width:"100%", accentColor:accent }}/>
            <div style={propLabel}>Recorte por Forma</div>
            <select value={selectedEl.clip||"none"} onChange={e=>updateEl(selected,{clip:e.target.value})} style={propSelect}>
              {CLIP_SHAPES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}

        {/* Imagem */}
        {selectedEl?.type === "image" && (
          <div style={{ padding:14 }}>
            <div style={propLabel}>Opacidade — {Math.round((selectedEl.opacity??1)*100)}%</div>
            <input type="range" min="0" max="1" step=".05" value={selectedEl.opacity??1}
              onChange={e=>updateEl(selected,{opacity:Number(e.target.value)})}
              style={{ width:"100%", accentColor:accent }}/>

            <div style={propLabel}>Largura — {Math.round(selectedEl.w*100)}%</div>
            <input type="range" min=".05" max="1" step=".01" value={selectedEl.w}
              onChange={e=>updateEl(selected,{w:Number(e.target.value)})}
              style={{ width:"100%", accentColor:accent }}/>

            <div style={propLabel}>Altura — {Math.round(selectedEl.h*100)}%</div>
            <input type="range" min=".05" max="1" step=".01" value={selectedEl.h}
              onChange={e=>updateEl(selected,{h:Number(e.target.value)})}
              style={{ width:"100%", accentColor:accent }}/>

            <div style={propLabel}>Recorte por Forma</div>
            <select value={CLIP_SHAPES.find(s=>s.clip===selectedEl.clip)?.id||"none"}
              onChange={e=>{
                const shape = CLIP_SHAPES.find(s=>s.id===e.target.value);
                updateEl(selected,{ clip: shape?.clip||"none" });
              }} style={propSelect}>
              {CLIP_SHAPES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <div style={{ marginTop:10, padding:"10px", background:"rgba(0,229,255,0.06)", border:`1px solid ${accent}22`, borderRadius:6 }}>
              <div style={{ fontSize:9, color:accent, letterSpacing:1.5, marginBottom:6 }}>RECORTE LASSO</div>
              <div style={{ fontSize:10, color:muted, lineHeight:1.5 }}>
                Ative o 🔲 Lasso na toolbar, selecione esta imagem e desenhe no canvas para recortar livremente.
              </div>
            </div>
          </div>
        )}

        {/* Posição numérica para qualquer elemento */}
        {selectedEl && (
          <div style={{ padding:"0 14px 14px" }}>
            <div style={{ borderTop:`1px solid ${border}`, paddingTop:12 }}>
              <div style={propLabel}>Posição (X% / Y%)</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                {[["X",el=>el.x,"x"],["Y",el=>el.y,"y"]].map(([lbl,getter,key])=>(
                  <div key={key}>
                    <div style={{ fontSize:9, color:subtle, marginBottom:2 }}>{lbl}%</div>
                    <input type="number" value={Math.round(getter(selectedEl)*100)} min="0" max="97"
                      onChange={e=>updateEl(selected,{[key]:Number(e.target.value)/100})}
                      style={{ ...propInput, width:"100%" }}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          padding:"12px 20px", borderRadius:10, fontWeight:600, fontSize:13,
          background:toast.type==="error"?"#FF1744":toast.type==="info"?"#1565C0":"#00C853",
          color:"#fff", boxShadow:"0 8px 30px rgba(0,0,0,0.5)",
          animation:"fadeIn .2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-track { background:#0A0F1E }
        ::-webkit-scrollbar-thumb { background:#1A2744; border-radius:4px }
      `}</style>
    </div>
  );
}