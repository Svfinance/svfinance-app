// src/services/api.js
// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA DE FALLBACK AUTOMÁTICO
// Primary:  Railway  (api.svfinance.com.br)
// Backup:   Render   (sv-finance-backup.onrender.com)
//
// Se o Railway não responder em 6 segundos → tenta o Render automaticamente.
// O usuário não percebe a troca — tudo continua funcionando.
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY_URL = "https://api.svfinance.com.br/api";
const BACKUP_URL  = "https://sv-finance-backup.onrender.com/api";
const TIMEOUT_MS  = 6000; // 6 segundos para considerar o Railway fora do ar

// Controla qual servidor está sendo usado para evitar tentativas desnecessárias
let _usingBackup    = false;
let _backupUntil    = 0; // timestamp — após 5 min tenta o Railway de novo

function getApiUrl() {
  // Se está em modo backup e ainda não passou 5 minutos, continua no Render
  if (_usingBackup && Date.now() < _backupUntil) return BACKUP_URL;
  // Reseta o modo backup após 5 minutos (tenta Railway de novo)
  _usingBackup = false;
  return PRIMARY_URL;
}

function activateBackup() {
  if (!_usingBackup) {
    console.warn("⚠️ Railway indisponível — usando servidor backup (Render)");
    _usingBackup = true;
    _backupUntil = Date.now() + 5 * 60 * 1000; // 5 minutos
  }
}

// Fetch com timeout — evita esperar para sempre se o servidor estiver fora
function fetchWithTimeout(url, options, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// Fetch com fallback automático Railway → Render
async function apiFetch(endpoint, options = {}) {
  const primaryUrl = getApiUrl();

  try {
    const res = await fetchWithTimeout(`${primaryUrl}${endpoint}`, options);
    // Se chegou aqui, o servidor respondeu — desativa modo backup se estava ativo
    if (_usingBackup && primaryUrl === PRIMARY_URL) _usingBackup = false;
    return res;
  } catch (err) {
    // Railway não respondeu (timeout ou rede) — tenta o Render
    if (primaryUrl === PRIMARY_URL) {
      console.warn(`Railway falhou (${err.message}) — tentando Render...`);
      activateBackup();
      try {
        return await fetchWithTimeout(`${BACKUP_URL}${endpoint}`, options, 10000);
      } catch (backupErr) {
        // Ambos falharam — lança erro claro
        throw new Error("Serviço temporariamente indisponível. Tente novamente em instantes.");
      }
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  const response = await apiFetch("/login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (response.ok && data.token) {
    localStorage.setItem("token",        data.token);
    localStorage.setItem("user_id",      String(data.user_id      || ""));
    localStorage.setItem("name",         data.name                || "");
    localStorage.setItem("role",         data.role                || "");
    localStorage.setItem("account_type", data.account_type        || "business");
    localStorage.setItem("company_id",   String(data.company_id   || ""));
    localStorage.setItem("company_name", data.company_name        || "");
    localStorage.setItem("sv_plan",      data.plan                || "free");
    localStorage.setItem("sv_nicho",     data.nicho               || "generic");
  }
  return { ok: response.ok, data };
}

export async function registerUser(email, password, name, company_name, nicho = "generic") {
  return await apiFetch("/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, name, company_name, nicho }),
  });
}

export async function registerPersonalUser(email, password, name) {
  return await apiFetch("/register/personal", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, name, nicho: "generic" }),
  });
}

export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("name");
  localStorage.removeItem("role");
  localStorage.removeItem("account_type");
  localStorage.removeItem("company_id");
  localStorage.removeItem("company_name");
  localStorage.removeItem("sv_plan");
  localStorage.removeItem("sv_nicho");
}

export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization:  `Bearer ${token}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSAÇÕES
// ─────────────────────────────────────────────────────────────────────────────

export async function getTransactions() {
  return await apiFetch("/transactions", { headers: getAuthHeaders() });
}

export async function createTransaction(data) {
  return await apiFetch("/transactions", {
    method:  "POST",
    headers: getAuthHeaders(),
    body:    JSON.stringify(data),
  });
}

export async function updateTransaction(id, data) {
  return await apiFetch(`/transactions/${id}`, {
    method:  "PUT",
    headers: getAuthHeaders(),
    body:    JSON.stringify(data),
  });
}

export async function deleteTransaction(id) {
  return await apiFetch(`/transactions/${id}`, {
    method:  "DELETE",
    headers: getAuthHeaders(),
  });
}