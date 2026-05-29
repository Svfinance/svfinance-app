// src/offline/offlineDB.js
// Banco offline (IndexedDB) do SV Finance PWA.
// Guarda: fila de check-ins, fila genérica de criações, overlay de status e snapshots.

const DB_NAME    = "sv_offline";
const DB_VERSION = 2;

const STORE_CHECKINS  = "checkins";
const STORE_MUTATIONS = "mutations";
const STORE_OVERLAY   = "overlay";
const STORE_SNAPSHOTS = "snapshots";

// ── UUID simples (idempotência) ────────────────────────────────────────────
export function uuid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// Gera um ID temporário para entidades criadas offline (cliente/quote/order)
export function tmpId(prefix = "tmp") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isTmpId(id) {
  return typeof id === "string" && id.includes("_") && id.startsWith("tmp");
}

// ── Abertura do banco ───────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_CHECKINS)) {
        db.createObjectStore(STORE_CHECKINS, { keyPath: "local_id" });
      }
      if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
        const s = db.createObjectStore(STORE_MUTATIONS, { keyPath: "local_id" });
        s.createIndex("entity", "entity", { unique: false });
        s.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_OVERLAY)) {
        // chave = order id (real ou tmp); valor = { status, ts }
        db.createObjectStore(STORE_OVERLAY, { keyPath: "order_key" });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function tx(db, store, mode = "readonly") {
  return db.transaction(store, mode).objectStore(store);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK-INS (fila) — mantido compatível com a versão anterior
// ════════════════════════════════════════════════════════════════════════════

export async function enqueueCheckin(body) {
  const db = await openDB();
  const record = {
    ...body,
    local_id:   body.local_id || uuid(),
    created_at: Date.now(),
  };
  await reqToPromise(tx(db, STORE_CHECKINS, "readwrite").put(record));
  db.close();
  return record;
}

export async function getCheckins() {
  const db = await openDB();
  const all = await reqToPromise(tx(db, STORE_CHECKINS).getAll());
  db.close();
  return all || [];
}

export async function removeCheckin(localId) {
  const db = await openDB();
  await reqToPromise(tx(db, STORE_CHECKINS, "readwrite").delete(localId));
  db.close();
}

export async function countCheckins() {
  const all = await getCheckins();
  return all.length;
}

// ════════════════════════════════════════════════════════════════════════════
// MUTATIONS (fila genérica de criações offline)
// entity: "client" | "quote" | "order"
// ════════════════════════════════════════════════════════════════════════════

export async function enqueueMutation(entity, payload, extra = {}) {
  const db = await openDB();
  const record = {
    local_id:   uuid(),
    entity,                       // "client" | "quote" | "order"
    payload,                      // dados a enviar (pode conter tmp ids)
    tmp_ref:    extra.tmp_ref || null,   // id temporário desta entidade (para remapear)
    created_at: Date.now(),
    status:     "pending",        // pending | error
    last_error: null,
  };
  await reqToPromise(tx(db, STORE_MUTATIONS, "readwrite").put(record));
  db.close();
  return record;
}

export async function getMutations() {
  const db = await openDB();
  const all = await reqToPromise(tx(db, STORE_MUTATIONS).getAll());
  db.close();
  // ordena por criação (cliente criado antes da OS, etc.)
  return (all || []).sort((a, b) => a.created_at - b.created_at);
}

export async function getMutationsByEntity(entity) {
  const all = await getMutations();
  return all.filter(m => m.entity === entity);
}

export async function updateMutation(localId, patch) {
  const db = await openDB();
  const store = tx(db, STORE_MUTATIONS, "readwrite");
  const rec = await reqToPromise(store.get(localId));
  if (rec) {
    await reqToPromise(store.put({ ...rec, ...patch }));
  }
  db.close();
}

export async function removeMutation(localId) {
  const db = await openDB();
  await reqToPromise(tx(db, STORE_MUTATIONS, "readwrite").delete(localId));
  db.close();
}

export async function countMutations() {
  const all = await getMutations();
  return all.length;
}

// ════════════════════════════════════════════════════════════════════════════
// OVERLAY de status de O.S. (status otimista do check-in offline)
// ════════════════════════════════════════════════════════════════════════════

export async function setOrderStatusOverlay(orderKey, status) {
  const db = await openDB();
  await reqToPromise(tx(db, STORE_OVERLAY, "readwrite").put({
    order_key: String(orderKey),
    status,
    ts: Date.now(),
  }));
  db.close();
}

export async function getOrderOverlays() {
  const db = await openDB();
  const all = await reqToPromise(tx(db, STORE_OVERLAY).getAll());
  db.close();
  // retorna um mapa { orderKey: status }
  const map = {};
  (all || []).forEach(o => { map[o.order_key] = o.status; });
  return map;
}

export async function clearOrderOverlay(orderKey) {
  const db = await openDB();
  await reqToPromise(tx(db, STORE_OVERLAY, "readwrite").delete(String(orderKey)));
  db.close();
}

export async function clearAllOverlays() {
  const db = await openDB();
  await reqToPromise(tx(db, STORE_OVERLAY, "readwrite").clear());
  db.close();
}

// ════════════════════════════════════════════════════════════════════════════
// SNAPSHOTS (cache de listas para abrir offline)
// ════════════════════════════════════════════════════════════════════════════

export async function saveSnapshot(key, data) {
  const db = await openDB();
  await reqToPromise(tx(db, STORE_SNAPSHOTS, "readwrite").put({
    key, data, ts: Date.now(),
  }));
  db.close();
}

export async function getSnapshot(key) {
  const db = await openDB();
  const rec = await reqToPromise(tx(db, STORE_SNAPSHOTS).get(key));
  db.close();
  return rec ? rec.data : null;
}

// ── Total de pendências (check-ins + mutations) para o badge ────────────────
export async function countAllPending() {
  const [c, m] = await Promise.all([countCheckins(), countMutations()]);
  return c + m;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPATIBILIDADE LEGADA (não remover)
// Mantém compatibilidade com syncEngine.js / useOffline.js
// ════════════════════════════════════════════════════════════════════════════

// Fila genérica antiga → usa mutations internamente
export async function getQueue() {
  return await getMutations();
}

// Remove item da fila antiga → remove mutation
export async function removeFromQueue(localId) {
  return await removeMutation(localId);
}

// Contador antigo da fila → mutations pendentes
export async function queueCount() {
  return await countMutations();
}
