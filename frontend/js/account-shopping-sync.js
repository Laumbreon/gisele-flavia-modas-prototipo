(() => {
  "use strict";

  const CART_KEY = "gisele-flavia-cart";
  const FAVORITES_KEY = "gisele-flavia-favorites";
  const TOKEN_KEY = "gisele-flavia-customer-token";
  const ENDPOINT = "/api/clientes-auth/me/compras-salvas";
  const originalSetItem = Storage.prototype.setItem;
  const originalGetItem = Storage.prototype.getItem;
  let restoring = false;
  let loginSync = false;
  let saveTimer = null;
  let loginTimer = null;

  function localGet(key) {
    return originalGetItem.call(window.localStorage, key);
  }

  function localSet(key, value) {
    originalSetItem.call(window.localStorage, key, value);
  }

  function readArray(key) {
    try {
      const value = JSON.parse(localGet(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function favoriteKey(item) {
    return String(item?.id ?? item?.product?.id ?? "");
  }

  function cartKey(item) {
    return [item?.product?.id, item?.variationId, item?.size, item?.color]
      .filter(value => value !== undefined && value !== null)
      .join("|");
  }

  function mergeFavorites(saved, device) {
    const result = new Map();
    [...saved, ...device].forEach(item => {
      const key = favoriteKey(item);
      if (key) result.set(key, item);
    });
    return [...result.values()].slice(0, 120);
  }

  function mergeCart(saved, device) {
    const result = new Map();
    saved.forEach(item => {
      const key = cartKey(item);
      if (key) result.set(key, item);
    });
    device.forEach(item => {
      const key = cartKey(item);
      if (!key) return;
      const current = result.get(key);
      if (!current) result.set(key, item);
      else result.set(key, {
        ...current,
        ...item,
        quantity: Math.min(99, Number(current.quantity || 0) + Number(item.quantity || 0)),
      });
    });
    return [...result.values()].slice(0, 120);
  }

  async function api(options = {}) {
    const token = localGet(TOKEN_KEY);
    if (!token) return null;
    const response = await fetch(ENDPOINT, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error("Não foi possível sincronizar carrinho e favoritos.");
    return response.json();
  }

  async function saveNow() {
    if (!localGet(TOKEN_KEY)) return;
    await api({
      method: "PUT",
      body: JSON.stringify({
        carrinho: readArray(CART_KEY),
        favoritos: readArray(FAVORITES_KEY),
      }),
    });
  }

  function scheduleSave() {
    if (restoring || loginSync || !localGet(TOKEN_KEY)) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow().catch(() => {}), 450);
  }

  async function restore(mergeDevice) {
    const data = await api();
    if (!data) return;
    const shouldMerge = mergeDevice || data.existe === false;
    const deviceCart = readArray(CART_KEY);
    const deviceFavorites = readArray(FAVORITES_KEY);
    const cart = shouldMerge ? mergeCart(data.carrinho || [], deviceCart) : (data.carrinho || []);
    const favorites = shouldMerge ? mergeFavorites(data.favoritos || [], deviceFavorites) : (data.favoritos || []);
    restoring = true;
    localSet(CART_KEY, JSON.stringify(cart));
    localSet(FAVORITES_KEY, JSON.stringify(favorites));
    restoring = false;
    if (shouldMerge) await saveNow();
  }

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const previous = this === window.localStorage ? originalGetItem.call(this, key) : null;
    originalSetItem.call(this, key, value);
    if (this !== window.localStorage) return;
    if (key === CART_KEY || key === FAVORITES_KEY) scheduleSave();
    if (key === TOKEN_KEY && value && !previous) {
      loginSync = true;
      clearTimeout(loginTimer);
      loginTimer = setTimeout(async () => {
        try { await restore(true); } catch { /* Mantém os dados deste dispositivo. */ }
        loginSync = false;
        window.location.reload();
      }, 300);
    }
  };

  window.GiseleShoppingReady = localGet(TOKEN_KEY)
    ? restore(false).catch(() => {})
    : Promise.resolve();
})();
