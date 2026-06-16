# svfinance-app

> Frontend React do **SV Finance** — ERP self-service para MEIs e pequenas empresas brasileiras.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

## Sobre

Interface principal do SaaS SV Finance. Consome a API REST em `api.svfinance.com.br`.
Multi-tenant por `company_id`. Sistema de temas, controle de planos e feature gating integrados.

**URL de produção:** `https://app.svfinance.com.br`

---

## Stack

| Tecnologia | Uso |
|---|---|
| React 19 + Vite | Framework e bundler |
| React Router DOM | Roteamento SPA |
| Recharts | Gráficos e analytics |
| @zxing/browser | Leitura de QR Code (check-in) |
| Estilos inline JS | Sem Tailwind, sem CSS modules |

---

## Estrutura

```
src/
├── App.jsx                  # Rotas React Router
├── services/
│   └── api.js               # HTTP client + auth headers
├── contexts/
│   ├── ThemeContext.jsx      # Tema global (blue/gray/glass/aurora)
│   ├── NichoContext.jsx      # Nicho da empresa
│   └── PlanContext.jsx       # Plano + feature gating
├── themes/
│   └── themes.js             # Definição visual dos temas
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   └── PageLayout.jsx
│   ├── PlanBadge.jsx
│   └── CheckoutModal.jsx
└── pages/
    ├── Dashboard.jsx
    ├── Plans.jsx
    ├── Orders.jsx
    ├── Clients.jsx
    └── ...
```

---

## Configuração local

```bash
git clone git@github.com:Svfinance/svfinance-app.git
cd svfinance-app
npm install
npm run dev
```

Disponível em `http://localhost:5173`. Backend necessário em `http://localhost:5000`.

---

## Módulos disponíveis

Dashboard · Clientes · Produtos · Vendas (PED/OS) · Orçamentos · Financeiro · Contas · DRE · Fluxo de Caixa · Relatórios · Estoque · Comissões · Metas · Equipe · NF-e · Importação CSV · Brand Studio · Planos e Billing

---

## Padrões obrigatórios

```javascript
// Autenticação — sempre via getAuthHeaders()
import { getAuthHeaders } from '../services/api';

// Estilos — sempre inline JS (nunca classes CSS externas)
const style = { backgroundColor: theme.bg, color: theme.text };

// Multi-tenancy — company_id sempre vem do localStorage após login
const companyId = localStorage.getItem('company_id');
```

**Este repo nunca deve conter:** `isRG()`, tema `clean` hardcoded, `components/restaura/`, VitePWA ou features específicas de clientes de implementação.

---

## Deploy

Push na `main` → Vercel detecta → build e deploy automático.
