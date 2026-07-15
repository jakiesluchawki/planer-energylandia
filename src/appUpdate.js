const RELEASE_PATTERN = /^[a-f0-9]{7,40}$/i;
const RELOAD_GUARD_KEY = "pogodapark:last-release-reload";
const RELOAD_GUARD_MS = 15_000;

export const APP_RELEASE = typeof __APP_RELEASE__ !== "undefined" ? __APP_RELEASE__ : "dev";

export function normalizedRelease(value) {
  const release = String(value || "").trim().toLowerCase();
  return RELEASE_PATTERN.test(release) ? release.slice(0, 12) : null;
}

export function withReleaseQuery(href, release = APP_RELEASE) {
  const normalized = normalizedRelease(release);
  if (!normalized) return new URL(href).toString();
  const url = new URL(href);
  url.search = `?r${normalized}`;
  return url.toString();
}

function guardedRecently(storage, release, now) {
  try {
    const [storedRelease, storedAt] = String(storage?.getItem(RELOAD_GUARD_KEY) || "").split(":");
    return storedRelease === release && now - Number(storedAt) < RELOAD_GUARD_MS;
  } catch {
    return false;
  }
}

function rememberReload(storage, release, now) {
  try { storage?.setItem(RELOAD_GUARD_KEY, `${release}:${now}`); } catch { /* Private mode may block storage. */ }
}

export async function checkForAppUpdate({
  currentRelease = APP_RELEASE,
  fetchImpl = globalThis.fetch,
  location = globalThis.location,
  storage = globalThis.sessionStorage,
  now = Date.now(),
} = {}) {
  const current = normalizedRelease(currentRelease);
  if (!current || typeof fetchImpl !== "function" || !location?.href || typeof location.replace !== "function") return false;
  const endpoint = new URL(`./release.json?check=${now}`, location.href);
  let response;
  try {
    response = await fetchImpl(endpoint, { cache: "no-store", headers: { accept: "application/json" } });
  } catch {
    return false;
  }
  if (!response?.ok) return false;
  let body;
  try { body = await response.json(); } catch { return false; }
  const remote = normalizedRelease(body?.release);
  if (!remote || remote === current || guardedRecently(storage, remote, now)) return false;
  rememberReload(storage, remote, now);
  location.replace(withReleaseQuery(location.href, remote));
  return true;
}

export function startAppUpdateChecks() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  let checking = false;
  const check = async () => {
    if (checking || document.visibilityState === "hidden") return;
    checking = true;
    try { await checkForAppUpdate(); } finally { checking = false; }
  };
  const onVisibility = () => { if (document.visibilityState === "visible") void check(); };
  window.addEventListener("pageshow", check);
  document.addEventListener("visibilitychange", onVisibility);
  void check();
  return () => {
    window.removeEventListener("pageshow", check);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
