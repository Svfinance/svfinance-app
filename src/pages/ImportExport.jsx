import { useState, useRef } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { useTheme } from '../contexts/ThemeContext';

const MODULES = [
  {
    key: 'transactions',
    label: 'Transações',
    icon: '💰',
    description: 'Receitas e despesas',
    hasTemplate: true,
    exportEndpoint: '/import-export/export/transactions',
    supportsDateFilter: true,
  },
  {
    key: 'bills',
    label: 'Contas',
    icon: '📄',
    description: 'Contas a pagar e receber',
    hasTemplate: true,
    exportEndpoint: '/import-export/export/bills',
    supportsDateFilter: true,
  },
  {
    key: 'clients',
    label: 'Clientes',
    icon: '👥',
    description: 'Base de clientes',
    hasTemplate: true,
    exportEndpoint: '/import-export/export/clients',
    supportsDateFilter: true,
  },
  {
    key: 'products',
    label: 'Produtos',
    icon: '📦',
    description: 'Produtos e serviços',
    hasTemplate: true,
    exportEndpoint: '/import-export/export/products',
    supportsDateFilter: false,
  },
  {
    key: 'quotes',
    label: 'Orçamentos',
    icon: '🧾',
    description: 'Orçamentos emitidos',
    hasTemplate: false,
    exportEndpoint: '/import-export/export/quotes',
    supportsDateFilter: true,
  },
  {
    key: 'sales',
    label: 'Vendas',
    icon: '🛒',
    description: 'Pedidos e OS',
    hasTemplate: false,
    exportEndpoint: '/import-export/export/sales',
    supportsDateFilter: true,
  },
];

const SYSTEMS = [
  { key: 'generico',   label: 'CSV Genérico',  icon: '📋', color: '#6b7280', status: 'disponível' },
  { key: 'conta_azul', label: 'Conta Azul',    icon: '🔵', color: '#2563eb', status: 'em breve' },
  { key: 'nibo',       label: 'Nibo',          icon: '🟢', color: '#16a34a', status: 'em breve' },
  { key: 'app_barber', label: 'App Barber',    icon: '✂️', color: '#9333ea', status: 'em breve' },
  { key: 'omni',       label: 'ERPs Genéricos',icon: '⚙️', color: '#ea580c', status: 'em breve' },
];

export default function ImportExport() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'

  // Export state
  const [exportDates, setExportDates] = useState({ from: '', to: '' });
  const [exportLoading, setExportLoading] = useState({});
  const [exportSuccess, setExportSuccess] = useState({});

  // Import state
  const [selectedSystem, setSelectedSystem] = useState('generico');
  const [uploadFile, setUploadFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importModule, setImportModule] = useState('transactions');
  const fileRef = useRef();

  // ── EXPORT ──────────────────────────────────────────────

  const handleExport = async (mod) => {
    setExportLoading(p => ({ ...p, [mod.key]: true }));
    try {
      const params = new URLSearchParams();
      if (mod.supportsDateFilter && exportDates.from) params.append('date_from', exportDates.from);
      if (mod.supportsDateFilter && exportDates.to)   params.append('date_to', exportDates.to);

      const token = localStorage.getItem('token');
      const url = `${import.meta.env.VITE_API_URL || 'http://192.168.0.6:5000/api'}${mod.exportEndpoint}?${params}`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) throw new Error('Falha na exportação');

      const blob = await resp.blob();
      const disposition = resp.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="(.+?)"/);
      const filename = nameMatch ? nameMatch[1] : `${mod.key}_export.csv`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      setExportSuccess(p => ({ ...p, [mod.key]: true }));
      setTimeout(() => setExportSuccess(p => ({ ...p, [mod.key]: false })), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar: ' + err.message);
    } finally {
      setExportLoading(p => ({ ...p, [mod.key]: false }));
    }
  };

  const handleDownloadTemplate = async (modKey) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://192.168.0.6:5000/api';
    const url = `${baseUrl}/import-export/export/template/${modKey}`;

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_${modKey}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ── IMPORT PREVIEW ───────────────────────────────────────

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

      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://192.168.0.6:5000/api';
      const resp = await fetch(`${baseUrl}/import-export/import/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await resp.json();
      setImportPreview(data);
    } catch (err) {
      alert('Erro ao processar arquivo: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // ── STYLES ───────────────────────────────────────────────

  const card = {
    background: theme.cardBg || 'rgba(255,255,255,0.05)',
    border: `1px solid ${theme.border || 'rgba(255,255,255,0.1)'}`,
    borderRadius: '14px',
    padding: '20px',
  };

  const tabBtn = (active) => ({
    padding: '10px 28px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s',
    background: active ? theme.primaryGrad : 'transparent',
    color: active ? '#fff' : theme.textSecondary,
    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
  });

  return (
    <PageLayout title="Importação & Exportação">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 700, margin: 0 }}>
            📂 Importação & Exportação
          </h1>
          <p style={{ color: theme.textSecondary, marginTop: 6, fontSize: 14 }}>
            Exporte seus dados em CSV ou importe de outros sistemas
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          background: theme.cardBg || 'rgba(0,0,0,0.2)',
          padding: 6,
          borderRadius: 14,
          marginBottom: 28,
          width: 'fit-content',
          border: `1px solid ${theme.border || 'rgba(255,255,255,0.08)'}`,
        }}>
          <button style={tabBtn(activeTab === 'export')} onClick={() => setActiveTab('export')}>
            ⬇️ Exportar
          </button>
          <button style={tabBtn(activeTab === 'import')} onClick={() => setActiveTab('import')}>
            ⬆️ Importar
          </button>
        </div>

        {/* ═══════════════════════════════════════
            EXPORTAÇÃO
        ════════════════════════════════════════ */}
        {activeTab === 'export' && (
          <div>
            {/* Filtro de período */}
            <div style={{ ...card, marginBottom: 24 }}>
              <h3 style={{ color: theme.textPrimary, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
                📅 Filtro de Período (opcional)
              </h3>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: theme.textSecondary, fontSize: 12, fontWeight: 500 }}>Data inicial</label>
                  <input
                    type="date"
                    value={exportDates.from}
                    onChange={e => setExportDates(p => ({ ...p, from: e.target.value }))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border || 'rgba(255,255,255,0.15)'}`,
                      background: theme.inputBg || 'rgba(255,255,255,0.05)',
                      color: theme.textPrimary,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: theme.textSecondary, fontSize: 12, fontWeight: 500 }}>Data final</label>
                  <input
                    type="date"
                    value={exportDates.to}
                    onChange={e => setExportDates(p => ({ ...p, to: e.target.value }))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border || 'rgba(255,255,255,0.15)'}`,
                      background: theme.inputBg || 'rgba(255,255,255,0.05)',
                      color: theme.textPrimary,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                {(exportDates.from || exportDates.to) && (
                  <button
                    onClick={() => setExportDates({ from: '', to: '' })}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border || 'rgba(255,255,255,0.15)'}`,
                      background: 'transparent',
                      color: theme.textSecondary,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    ✕ Limpar
                  </button>
                )}
              </div>
              {(!exportDates.from && !exportDates.to) && (
                <p style={{ color: theme.textSecondary, fontSize: 12, margin: '12px 0 0', opacity: 0.7 }}>
                  Sem filtro selecionado — exportará todos os registros do módulo.
                </p>
              )}
            </div>

            {/* Grid de módulos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {MODULES.map(mod => (
                <div key={mod.key} style={{
                  ...card,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{mod.icon}</span>
                    <div>
                      <div style={{ color: theme.textPrimary, fontWeight: 600, fontSize: 15 }}>{mod.label}</div>
                      <div style={{ color: theme.textSecondary, fontSize: 12 }}>{mod.description}</div>
                    </div>
                  </div>

                  {mod.supportsDateFilter && (exportDates.from || exportDates.to) && (
                    <div style={{
                      fontSize: 11,
                      color: theme.textSecondary,
                      background: 'rgba(99,102,241,0.1)',
                      borderRadius: 6,
                      padding: '4px 8px',
                    }}>
                      📅 {exportDates.from || '...'} → {exportDates.to || '...'}
                    </div>
                  )}

                  {!mod.supportsDateFilter && (
                    <div style={{
                      fontSize: 11,
                      color: theme.textSecondary,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: '4px 8px',
                    }}>
                      Exporta todos os registros
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => handleExport(mod)}
                      disabled={exportLoading[mod.key]}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 8,
                        border: 'none',
                        cursor: exportLoading[mod.key] ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        background: exportSuccess[mod.key]
                          ? 'linear-gradient(135deg, #16a34a, #15803d)'
                          : theme.primaryGrad,
                        color: '#fff',
                        transition: 'all 0.2s',
                        opacity: exportLoading[mod.key] ? 0.7 : 1,
                      }}
                    >
                      {exportLoading[mod.key]
                        ? '⏳ Exportando...'
                        : exportSuccess[mod.key]
                        ? '✅ Baixado!'
                        : '⬇️ Exportar CSV'}
                    </button>

                    {mod.hasTemplate && (
                      <button
                        onClick={() => handleDownloadTemplate(mod.key)}
                        title="Baixar template para importação"
                        style={{
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: `1px solid ${theme.border || 'rgba(255,255,255,0.15)'}`,
                          background: 'transparent',
                          color: theme.textSecondary,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
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

        {/* ═══════════════════════════════════════
            IMPORTAÇÃO
        ════════════════════════════════════════ */}
        {activeTab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Sistemas suportados */}
            <div style={card}>
              <h3 style={{ color: theme.textPrimary, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
                🔌 Sistemas Suportados
              </h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {SYSTEMS.map(sys => (
                  <div
                    key={sys.key}
                    onClick={() => sys.status === 'disponível' && setSelectedSystem(sys.key)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 20,
                      border: `2px solid ${selectedSystem === sys.key ? sys.color : theme.border || 'rgba(255,255,255,0.1)'}`,
                      background: selectedSystem === sys.key ? `${sys.color}20` : 'transparent',
                      color: sys.status === 'disponível' ? theme.textPrimary : theme.textSecondary,
                      cursor: sys.status === 'disponível' ? 'pointer' : 'default',
                      fontSize: 13,
                      fontWeight: selectedSystem === sys.key ? 600 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s',
                      opacity: sys.status === 'em breve' ? 0.5 : 1,
                    }}
                  >
                    <span>{sys.icon}</span>
                    <span>{sys.label}</span>
                    {sys.status === 'em breve' && (
                      <span style={{
                        fontSize: 10,
                        background: 'rgba(255,165,0,0.2)',
                        color: 'orange',
                        padding: '2px 6px',
                        borderRadius: 8,
                        marginLeft: 4,
                      }}>
                        em breve
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Módulo destino + Upload */}
            <div style={card}>
              <h3 style={{ color: theme.textPrimary, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
                ⬆️ Enviar Arquivo CSV
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Módulo destino */}
                <div>
                  <label style={{ color: theme.textSecondary, fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    Módulo de destino
                  </label>
                  <select
                    value={importModule}
                    onChange={e => setImportModule(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border || 'rgba(255,255,255,0.15)'}`,
                      background: theme.inputBg || 'rgba(255,255,255,0.05)',
                      color: theme.textPrimary,
                      fontSize: 14,
                      outline: 'none',
                      minWidth: 200,
                    }}
                  >
                    {MODULES.filter(m => m.hasTemplate).map(m => (
                      <option key={m.key} value={m.key}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Área de drop/upload */}
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${uploadFile ? '#16a34a' : theme.border || 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 12,
                    padding: '32px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: uploadFile ? 'rgba(22,163,74,0.05)' : 'transparent',
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) { setUploadFile(f); setImportPreview(null); }
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  {uploadFile ? (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                      <div style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>{uploadFile.name}</div>
                      <div style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                        {(uploadFile.size / 1024).toFixed(1)} KB — clique para trocar
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                      <div style={{ color: theme.textPrimary, fontWeight: 600, fontSize: 14 }}>
                        Arraste um arquivo CSV aqui
                      </div>
                      <div style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                        ou clique para selecionar
                      </div>
                    </>
                  )}
                </div>

                {/* Template hint */}
                {MODULES.find(m => m.key === importModule)?.hasTemplate && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: theme.textSecondary,
                  }}>
                    <span>💡</span>
                    <span>Não tem o arquivo no formato correto?</span>
                    <button
                      onClick={() => handleDownloadTemplate(importModule)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      Baixe o template aqui
                    </button>
                  </div>
                )}

                <button
                  onClick={handlePreview}
                  disabled={!uploadFile || importLoading}
                  style={{
                    padding: '11px 0',
                    borderRadius: 10,
                    border: 'none',
                    cursor: !uploadFile || importLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    background: !uploadFile ? 'rgba(255,255,255,0.1)' : theme.primaryGrad,
                    color: !uploadFile ? theme.textSecondary : '#fff',
                    transition: 'all 0.2s',
                    opacity: importLoading ? 0.7 : 1,
                  }}
                >
                  {importLoading ? '⏳ Analisando arquivo...' : '🔍 Analisar arquivo'}
                </button>
              </div>
            </div>

            {/* Preview do arquivo */}
            {importPreview && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ color: theme.textPrimary, margin: 0, fontSize: 15, fontWeight: 600 }}>
                    🔍 Preview do Arquivo
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {importPreview.total_columns} colunas detectadas
                    </span>
                    <span style={{
                      background: 'rgba(22,163,74,0.15)',
                      color: '#4ade80',
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      Sistema: {SYSTEMS.find(s => s.key === importPreview.detected_system)?.label || 'Genérico'}
                    </span>
                  </div>
                </div>

                {/* Colunas detectadas */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: 500 }}>
                    Colunas encontradas:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {importPreview.columns.map(col => (
                      <span key={col} style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: theme.textPrimary,
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        border: `1px solid ${theme.border || 'rgba(255,255,255,0.1)'}`,
                      }}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tabela de preview */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {importPreview.columns.map(col => (
                          <th key={col} style={{
                            padding: '8px 10px',
                            background: 'rgba(255,255,255,0.05)',
                            color: theme.textSecondary,
                            fontWeight: 600,
                            textAlign: 'left',
                            borderBottom: `1px solid ${theme.border || 'rgba(255,255,255,0.08)'}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.preview_rows.map((row, i) => (
                        <tr key={i}>
                          {importPreview.columns.map(col => (
                            <td key={col} style={{
                              padding: '7px 10px',
                              color: theme.textPrimary,
                              borderBottom: `1px solid ${theme.border || 'rgba(255,255,255,0.05)'}`,
                              whiteSpace: 'nowrap',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {row[col] || <span style={{ opacity: 0.3 }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Aviso Fase 2 */}
                <div style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: 'rgba(251,191,36,0.1)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: 10,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: 13 }}>
                      Mapeamento de colunas em desenvolvimento
                    </div>
                    <div style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                      A próxima fase permitirá mapear cada coluna do seu arquivo para o campo correspondente no sistema, com suporte a Conta Azul, Nibo e outros.
                    </div>
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
