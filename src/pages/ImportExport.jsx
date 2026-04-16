import { useState, useRef } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Sidebar from '../components/layout/Sidebar';
import { useTheme } from '../contexts/ThemeContext';

const BASE_URL = 'https://finance-control-api-production.up.railway.app/api';

const MODULES = [
  { key: 'transactions', label: 'Transações',  icon: '💰', description: 'Receitas e despesas',      hasTemplate: true,  supportsDateFilter: true  },
  { key: 'bills',        label: 'Contas',       icon: '📄', description: 'Contas a pagar/receber',   hasTemplate: true,  supportsDateFilter: true  },
  { key: 'clients',      label: 'Clientes',     icon: '👥', description: 'Base de clientes',         hasTemplate: true,  supportsDateFilter: true  },
  { key: 'products',     label: 'Produtos',     icon: '📦', description: 'Produtos e serviços',      hasTemplate: true,  supportsDateFilter: false },
  { key: 'quotes',       label: 'Orçamentos',   icon: '🧾', description: 'Orçamentos emitidos',      hasTemplate: false, supportsDateFilter: true  },
  { key: 'sales',        label: 'Vendas',       icon: '🛒', description: 'Pedidos e OS',             hasTemplate: false, supportsDateFilter: true  },
];

const SYSTEMS = [
  { key: 'generico',   label: 'CSV Genérico',  icon: '📋', color: '#6366f1' },
  { key: 'excel',      label: 'Excel (.xlsx)', icon: '📊', color: '#16a34a' },
  { key: 'conta_azul', label: 'Conta Azul',    icon: '🔵', color: '#2563eb' },
  { key: 'nibo',       label: 'Nibo',          icon: '🟢', color: '#15803d' },
  { key: 'app_barber', label: 'App Barber',    icon: '✂️', color: '#9333ea' },
  { key: 'omni',       label: 'ERPs Genéricos',icon: '⚙️', color: '#ea580c' },
];

export default function ImportExport() {
  const { theme, themeId } = useTheme();
  const isGlass = themeId === 'glass' || themeId === 'gray';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('export');

  // Export
  const [exportDates, setExportDates]     = useState({ from: '', to: '' });
  const [exportFormat, setExportFormat]   = useState('csv');
  const [exportLoading, setExportLoading] = useState({});
  const [exportSuccess, setExportSuccess] = useState({});

  // Exportar Tudo
  const [exportAllLoading, setExportAllLoading] = useState(false);
  const [exportAllSuccess, setExportAllSuccess] = useState(false);
  const [exportAllProgress, setExportAllProgress] = useState([]);

  // Import
  const [selectedSystem, setSelectedSystem] = useState('generico');
  const [uploadFile, setUploadFile]         = useState(null);
  const [importPreview, setImportPreview]   = useState(null);
  const [importLoading, setImportLoading]   = useState(false);
  const [importModule, setImportModule]     = useState('transactions');
  const fileRef = useRef();

  const token = () => localStorage.getItem('token');

  // ── cores ────────────────────────────────────────────────
  const cardBg     = isGlass ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.06)';
  const cardBorder = isGlass ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.1)';
  const inputBg    = isGlass ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.08)';
  const textMain   = theme.textPrimary;
  const textSub    = theme.textSecondary || theme.textMuted;

  const card = {
    background:           cardBg,
    border:               `1px solid ${cardBorder}`,
    borderRadius:         16,
    padding:              24,
    backdropFilter:       isGlass ? 'blur(16px)' : undefined,
    WebkitBackdropFilter: isGlass ? 'blur(16px)' : undefined,
  };

  // ── fetch auxiliar ───────────────────────────────────────
  const fetchExport = async (modKey, params) => {
    const url  = `${BASE_URL}/import-export/export/${modKey}?${params}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    if (!resp.ok) throw new Error(`${modKey}: servidor retornou ${resp.status}`);
    return resp;
  };

  // ── EXPORTAR UM MÓDULO ───────────────────────────────────
  const handleExport = async (mod) => {
    setExportLoading(p => ({ ...p, [mod.key]: true }));
    try {
      const params = new URLSearchParams();
      if (mod.supportsDateFilter && exportDates.from) params.append('date_from', exportDates.from);
      if (mod.supportsDateFilter && exportDates.to)   params.append('date_to',   exportDates.to);
      params.append('format', exportFormat);

      const resp = await fetchExport(mod.key, params);
      const blob = await resp.blob();
      const ext  = exportFormat === 'xlsx' ? 'xlsx' : 'csv';
      triggerDownload(blob, `${mod.key}_export.${ext}`);

      setExportSuccess(p => ({ ...p, [mod.key]: true }));
      setTimeout(() => setExportSuccess(p => ({ ...p, [mod.key]: false })), 3000);
    } catch (err) {
      alert('Erro ao exportar: ' + err.message);
    } finally {
      setExportLoading(p => ({ ...p, [mod.key]: false }));
    }
  };

  // ── EXPORTAR TUDO ────────────────────────────────────────
  const handleExportAll = async () => {
    setExportAllLoading(true);
    setExportAllSuccess(false);
    setExportAllProgress([]);

    const params = new URLSearchParams();
    if (exportDates.from) params.append('date_from', exportDates.from);
    if (exportDates.to)   params.append('date_to',   exportDates.to);
    params.append('format', exportFormat);

    // Tenta usar JSZip se disponível; caso contrário baixa arquivos separados
    let JSZip = null;
    try {
      const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      JSZip = window.JSZip;
    } catch (_) {}

    const blobs   = [];
    const failed  = [];
    const progress = [];

    for (const mod of MODULES) {
      const p = new URLSearchParams(params);
      if (!mod.supportsDateFilter) {
        p.delete('date_from');
        p.delete('date_to');
      }
      try {
        const resp = await fetchExport(mod.key, p);
        const blob = await resp.blob();
        const ext  = exportFormat === 'xlsx' ? 'xlsx' : 'csv';
        blobs.push({ name: `${mod.key}.${ext}`, blob, label: mod.label });
        progress.push({ key: mod.key, label: mod.label, ok: true });
      } catch (err) {
        failed.push(mod.label);
        progress.push({ key: mod.key, label: mod.label, ok: false });
      }
      setExportAllProgress([...progress]);
    }

    if (blobs.length === 0) {
      alert('Nenhum módulo exportado com sucesso.');
      setExportAllLoading(false);
      return;
    }

    // Tenta gerar ZIP
    if (JSZip && blobs.length > 1) {
      try {
        const zip  = new JSZip();
        const folder = zip.folder('sv_finance_export');
        for (const { name, blob } of blobs) {
          folder.file(name, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const stamp   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        triggerDownload(zipBlob, `sv_finance_completo_${stamp}.zip`);
        setExportAllSuccess(true);
        setTimeout(() => { setExportAllSuccess(false); setExportAllProgress([]); }, 5000);
        setExportAllLoading(false);
        return;
      } catch (_) {}
    }

    // Fallback: baixa arquivos um por um com delay
    for (const { name, blob } of blobs) {
      triggerDownload(blob, name);
      await new Promise(r => setTimeout(r, 400));
    }

    if (failed.length > 0) {
      alert(`Exportados com sucesso: ${blobs.length}/${MODULES.length}\nFalhou: ${failed.join(', ')}`);
    }

    setExportAllSuccess(true);
    setTimeout(() => { setExportAllSuccess(false); setExportAllProgress([]); }, 5000);
    setExportAllLoading(false);
  };

  // ── TEMPLATE ─────────────────────────────────────────────
  const handleDownloadTemplate = async (modKey) => {
    try {
      const resp = await fetch(`${BASE_URL}/import-export/export/template/${modKey}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!resp.ok) throw new Error('Falha ao baixar template');
      const blob = await resp.blob();
      triggerDownload(blob, `template_${modKey}.csv`);
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  // ── IMPORTAR PREVIEW ─────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setUploadFile(f);
    setImportPreview(null);
  };

  const handlePreview = async () => {
    if (!uploadFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const resp = await fetch(`${BASE_URL}/import-export/import/preview`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body:    formData,
      });
      if (!resp.ok) throw new Error(`Servidor retornou ${resp.status}`);
      const data = await resp.json();
      setImportPreview(data);
    } catch (err) {
      alert('Erro ao processar arquivo: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // ── helper download ──────────────────────────────────────
  const triggerDownload = (blob, filename) => {
    const link    = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ── estilos ──────────────────────────────────────────────
  const tabBtn = (active) => ({
    padding: '9px 26px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
    background: active ? theme.primaryGrad : 'transparent',
    color:      active ? '#fff' : textSub,
    boxShadow:  active ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
  });

  const formatBtn = (active) => ({
    padding: '7px 18px', borderRadius: 8, cursor: 'pointer',
    border:     `1px solid ${active ? '#6366f1' : cardBorder}`,
    background:  active ? 'rgba(99,102,241,0.18)' : 'transparent',
    color:       active ? '#818cf8' : textSub,
    fontWeight:  600, fontSize: 13, transition: 'all 0.2s',
  });

  // ── RENDER ────────────────────────────────────────────────
  return (
    <PageLayout>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px', minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: textMain, fontSize: 24, fontWeight: 700, margin: 0 }}>
            📂 Importação & Exportação
          </h1>
          <p style={{ color: textSub, marginTop: 6, fontSize: 14, margin: '6px 0 0' }}>
            Exporte seus dados em CSV / Excel ou importe de outros sistemas
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 6, padding: 6, borderRadius: 14,
          background: cardBg, border: `1px solid ${cardBorder}`,
          marginBottom: 28, width: 'fit-content',
          backdropFilter: isGlass ? 'blur(12px)' : undefined,
        }}>
          <button style={tabBtn(activeTab === 'export')} onClick={() => setActiveTab('export')}>⬇️ Exportar</button>
          <button style={tabBtn(activeTab === 'import')} onClick={() => setActiveTab('import')}>⬆️ Importar</button>
        </div>

        {/* ══════════════ EXPORTAÇÃO ══════════════ */}
        {activeTab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Config */}
            <div style={card}>
              <h3 style={{ color: textMain, margin: '0 0 18px', fontSize: 15, fontWeight: 600 }}>
                ⚙️ Configurações de Exportação
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-end' }}>

                {/* Período */}
                <div>
                  <div style={{ color: textSub, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    📅 Período (opcional)
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['from', 'to'].map(k => (
                      <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ color: textSub, fontSize: 11 }}>{k === 'from' ? 'De' : 'Até'}</label>
                        <input
                          type="date"
                          value={exportDates[k]}
                          onChange={e => setExportDates(p => ({ ...p, [k]: e.target.value }))}
                          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: inputBg, color: textMain, fontSize: 14, outline: 'none' }}
                        />
                      </div>
                    ))}
                    {(exportDates.from || exportDates.to) && (
                      <button
                        onClick={() => setExportDates({ from: '', to: '' })}
                        style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: 'transparent', color: textSub, cursor: 'pointer', fontSize: 13, alignSelf: 'flex-end' }}
                      >
                        ✕ Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Formato */}
                <div>
                  <div style={{ color: textSub, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    📁 Formato
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={formatBtn(exportFormat === 'csv')}  onClick={() => setExportFormat('csv')}>📋 CSV</button>
                    <button style={formatBtn(exportFormat === 'xlsx')} onClick={() => setExportFormat('xlsx')}>📊 Excel (.xlsx)</button>
                  </div>
                </div>
              </div>

              {!exportDates.from && !exportDates.to && (
                <p style={{ color: textSub, fontSize: 12, margin: '14px 0 0', opacity: 0.7 }}>
                  Sem filtro de período — exportará todos os registros do módulo.
                </p>
              )}
            </div>

            {/* ── EXPORTAR TUDO ── */}
            <div style={{
              ...card,
              background: isGlass ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.35)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ color: textMain, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📦</span> Exportar Tudo
                  </div>
                  <div style={{ color: textSub, fontSize: 13, marginTop: 4 }}>
                    Baixa todos os {MODULES.length} módulos de uma vez
                    {exportFormat === 'csv' ? ' em arquivos CSV separados' : ' em arquivos Excel separados'}
                    {(exportDates.from || exportDates.to) ? ` • período: ${exportDates.from || '...'} → ${exportDates.to || '...'}` : ''}
                  </div>
                </div>
                <button
                  onClick={handleExportAll}
                  disabled={exportAllLoading}
                  style={{
                    padding: '11px 28px', borderRadius: 10, border: 'none',
                    cursor: exportAllLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                    background: exportAllSuccess
                      ? 'linear-gradient(135deg,#16a34a,#15803d)'
                      : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    color: '#fff',
                    opacity: exportAllLoading ? 0.8 : 1,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  {exportAllLoading ? '⏳ Exportando...' : exportAllSuccess ? '✅ Concluído!' : '📦 Exportar Tudo'}
                </button>
              </div>

              {/* Progress dos módulos durante exportação */}
              {exportAllProgress.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {exportAllProgress.map(p => (
                    <span key={p.key} style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: p.ok ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)',
                      color:      p.ok ? '#4ade80' : '#f87171',
                      border:     `1px solid ${p.ok ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      {p.ok ? '✅' : '❌'} {p.label}
                    </span>
                  ))}
                  {exportAllLoading && exportAllProgress.length < MODULES.length && (
                    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, color: textSub, border: `1px solid ${cardBorder}` }}>
                      ⏳ {MODULES[exportAllProgress.length]?.label}...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Grid módulos individuais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {MODULES.map(mod => (
                <div key={mod.key} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{mod.icon}</span>
                    <div>
                      <div style={{ color: textMain, fontWeight: 700, fontSize: 15 }}>{mod.label}</div>
                      <div style={{ color: textSub, fontSize: 12 }}>{mod.description}</div>
                    </div>
                  </div>

                  {mod.supportsDateFilter && (exportDates.from || exportDates.to) ? (
                    <div style={{ fontSize: 11, color: '#818cf8', background: 'rgba(99,102,241,0.12)', borderRadius: 6, padding: '4px 8px' }}>
                      📅 {exportDates.from || '...'} → {exportDates.to || '...'}
                    </div>
                  ) : !mod.supportsDateFilter ? (
                    <div style={{ fontSize: 11, color: textSub, background: isGlass ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '4px 8px' }}>
                      Exporta todos os registros
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => handleExport(mod)}
                      disabled={exportLoading[mod.key]}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                        cursor: exportLoading[mod.key] ? 'not-allowed' : 'pointer',
                        fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                        background: exportSuccess[mod.key]
                          ? 'linear-gradient(135deg,#16a34a,#15803d)'
                          : theme.primaryGrad,
                        color: '#fff',
                        opacity: exportLoading[mod.key] ? 0.7 : 1,
                      }}
                    >
                      {exportLoading[mod.key] ? '⏳ Exportando...'
                        : exportSuccess[mod.key] ? '✅ Baixado!'
                        : exportFormat === 'xlsx' ? '📊 Exportar Excel'
                        : '📋 Exportar CSV'}
                    </button>
                    {mod.hasTemplate && (
                      <button
                        onClick={() => handleDownloadTemplate(mod.key)}
                        title="Baixar template CSV"
                        style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: 'transparent', color: textSub, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                      >
                        📋 Template
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ IMPORTAÇÃO ══════════════ */}
        {activeTab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Sistemas */}
            <div style={card}>
              <h3 style={{ color: textMain, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
                🔌 Sistemas Suportados
              </h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {SYSTEMS.map(sys => (
                  <div
                    key={sys.key}
                    onClick={() => setSelectedSystem(sys.key)}
                    style={{
                      padding: '8px 16px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
                      border:     `2px solid ${selectedSystem === sys.key ? sys.color : cardBorder}`,
                      background:  selectedSystem === sys.key ? `${sys.color}22` : 'transparent',
                      color:       selectedSystem === sys.key ? textMain : textSub,
                      fontWeight:  selectedSystem === sys.key ? 700 : 400,
                      fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <span>{sys.icon}</span>
                    <span>{sys.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ color: textSub, fontSize: 12, margin: '14px 0 0', lineHeight: 1.5 }}>
                💡 Selecione o sistema de origem para otimizar o mapeamento. Todos aceitam CSV ou Excel genérico — parsers específicos por sistema serão liberados nas próximas versões.
              </p>
            </div>

            {/* Upload */}
            <div style={card}>
              <h3 style={{ color: textMain, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
                ⬆️ Enviar Arquivo
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div>
                  <label style={{ color: textSub, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Módulo de destino
                  </label>
                  <select
                    value={importModule}
                    onChange={e => setImportModule(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: inputBg, color: textMain, fontSize: 14, outline: 'none', minWidth: 220 }}
                  >
                    {MODULES.filter(m => m.hasTemplate).map(m => (
                      <option key={m.key} value={m.key}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${uploadFile ? '#16a34a' : cardBorder}`,
                    borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: uploadFile ? 'rgba(22,163,74,0.06)' : isGlass ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) { setUploadFile(f); setImportPreview(null); }
                  }}
                >
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
                  {uploadFile ? (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                      <div style={{ color: '#16a34a', fontWeight: 700, fontSize: 14 }}>{uploadFile.name}</div>
                      <div style={{ color: textSub, fontSize: 12, marginTop: 4 }}>{(uploadFile.size / 1024).toFixed(1)} KB — clique para trocar</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 38, marginBottom: 8 }}>📂</div>
                      <div style={{ color: textMain, fontWeight: 600, fontSize: 14 }}>Arraste um arquivo CSV ou Excel aqui</div>
                      <div style={{ color: textSub, fontSize: 12, marginTop: 4 }}>ou clique para selecionar</div>
                    </>
                  )}
                </div>

                {MODULES.find(m => m.key === importModule)?.hasTemplate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: textSub }}>
                    <span>💡</span>
                    <span>Não tem o arquivo no formato correto?</span>
                    <button onClick={() => handleDownloadTemplate(importModule)} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0, textDecoration: 'underline' }}>
                      Baixe o template aqui
                    </button>
                  </div>
                )}

                <button
                  onClick={handlePreview}
                  disabled={!uploadFile || importLoading}
                  style={{
                    padding: '11px 0', borderRadius: 10, border: 'none',
                    cursor: !uploadFile || importLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                    background: !uploadFile ? (isGlass ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)') : theme.primaryGrad,
                    color: !uploadFile ? textSub : '#fff',
                    opacity: importLoading ? 0.7 : 1,
                  }}
                >
                  {importLoading ? '⏳ Analisando arquivo...' : '🔍 Analisar arquivo'}
                </button>
              </div>
            </div>

            {/* Preview */}
            {importPreview && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ color: textMain, margin: 0, fontSize: 15, fontWeight: 600 }}>🔍 Preview do Arquivo</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                      {importPreview.total_columns} colunas
                    </span>
                    <span style={{ background: 'rgba(22,163,74,0.15)', color: '#4ade80', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                      {SYSTEMS.find(s => s.key === importPreview.detected_system)?.label || 'CSV Genérico'}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: textSub, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Colunas encontradas:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {importPreview.columns.map(col => (
                      <span key={col} style={{ background: isGlass ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', color: textMain, padding: '3px 10px', borderRadius: 6, fontSize: 12, border: `1px solid ${cardBorder}` }}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {importPreview.columns.map(col => (
                          <th key={col} style={{ padding: '8px 10px', background: isGlass ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)', color: textSub, fontWeight: 600, textAlign: 'left', borderBottom: `1px solid ${cardBorder}`, whiteSpace: 'nowrap' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.preview_rows.map((row, i) => (
                        <tr key={i}>
                          {importPreview.columns.map(col => (
                            <td key={col} style={{ padding: '7px 10px', color: textMain, borderBottom: `1px solid ${isGlass ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'}`, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row[col] || <span style={{ opacity: 0.3 }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: 13 }}>Mapeamento de colunas em desenvolvimento</div>
                    <div style={{ color: textSub, fontSize: 12, marginTop: 2 }}>A próxima fase permitirá mapear cada coluna para o campo correto antes de importar.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}