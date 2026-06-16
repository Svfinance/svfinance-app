# CLAUDE.md — svfinance-app
> Schema operacional sv-protocol v1.0. Regras transversais em `~/.claude/CLAUDE.md` global.
> Este arquivo cobre APENAS o frontend genérico (app.svfinance.com.br).

---

## Projeto

- **Nome:** svfinance-app
- **Descrição:** Frontend React do SaaS self-service SV Finance.
  Serve MEIs e pequenas empresas via `app.svfinance.com.br`.
  Consome `api.svfinance.com.br` (svfinance-api).
- **sv-protocol:** v1.0
- **Repo:** github.com/Svfinance/svfinance-app
- **Branch:** `main`

---

## Stack

- React 19 + Vite
- React Router DOM
- Recharts (gráficos)
- @zxing/browser (leitura QR Code)
- Estilos: **inline JS objects — sem Tailwind, sem CSS modules**
- VitePWA: **não configurado** (apenas no svfinance-rg)
- Deploy: Vercel (automático via push na main)

---

## Topologia

| Ambiente | URL |
|---|---|
| Produção | `https://app.svfinance.com.br` |
| Dev local | `http://localhost:5173` |
| Backend | `https://api.svfinance.com.br/api` |

Deploy: push na main → Vercel detecta → build automático.

---

## Estrutura

```
src/
  App.jsx               # rotas React Router
  services/
    api.js              # getAuthHeaders(), chamadas HTTP, logout, token
  contexts/
    ThemeContext.jsx    # tema global (blue/gray/glass/aurora)
    NichoContext.jsx    # nicho da empresa
    PlanContext.jsx     # plano (free/pro/business) + feature gating
  themes/
    themes.js           # definição visual dos temas
  components/
    layout/
      Sidebar.jsx       # sidebar genérico — SEM grupos RG, SEM isRG
      PageLayout.jsx
    PlanBadge.jsx       # badge do plano (pill/full/default)
    CheckoutModal.jsx   # modal checkout Asaas (Pix + cartão)
  pages/
    Plans.jsx           # página de planos com toggle mensal/anual
    Dashboard.jsx
    Transactions.jsx
    Bills.jsx
    Clients.jsx
    Products.jsx
    Orders.jsx          # modal padrão — sem cartão RG
    Quotes.jsx
    Team.jsx
    Goals.jsx
    Analytics.jsx
    Reports.jsx
    DRE.jsx
    CashFlow.jsx
    ImportHistory.jsx
    BrandStudio.jsx
    NfePanel.jsx
```

---

## Padrões obrigatórios

```javascript
// Autenticação — sempre getAuthHeaders()
import { getAuthHeaders } from '../services/api';
const res = await fetch(`${API}/endpoint`, { headers: getAuthHeaders() });

// Tema — sempre via ThemeContext
const { theme } = useTheme();

// Estilos — sempre inline JS
const style = { backgroundColor: theme.bg, color: theme.text };

// localStorage keys
// token, user_id, name, role, account_type
// company_id, company_name
// sv_plan, sv_nicho, sv_theme
// sv_sidebar_style, sv_sidebar_autohide, sv_mobile_style
// sv_dock_pos_conv, sv_dock_pos_conc
```

---

## O que NUNCA fazer neste repo

- `isRG()` ou detecção por hostname — isso é exclusivo do svfinance-rg
- Componentes em `components/restaura/` — não existem aqui
- Tema `clean` hardcoded — exclusivo do svfinance-rg
- VitePWA — não configurado aqui
- Features específicas de nicho (limpeza, restauração de vidros)
- Tailwind ou CSS modules — estilos inline apenas

---

## Ordem de leitura na retomada

1. `./scripts/health-check.sh` (no svfinance-api — este repo não tem backend)
2. `org-ia/05_estado.md` do svfinance-api
3. `org-ia/04_backlog.md` do svfinance-api
4. `git log --oneline -5` aqui
5. Verificar qual tarefa do backlog impacta este repo

---

## Clientes e ambientes

- **company_id=17:** SV Dev (conta de testes do Guilherme)
- **Banco:** Supabase via svfinance-api (este repo não acessa banco diretamente)
- **Asaas sandbox:** `4111 1111 1111 1111` para teste de cartão
