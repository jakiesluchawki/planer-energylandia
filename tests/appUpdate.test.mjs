import test from "node:test";
import assert from "node:assert/strict";
import { checkForAppUpdate, normalizedRelease, withReleaseQuery } from "../src/appUpdate.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("wersja wydania ma krótki stabilny identyfikator", () => {
  assert.equal(normalizedRelease("ABCDEF1234567890"), "abcdef123456");
  assert.equal(normalizedRelease("dev"), null);
  assert.equal(withReleaseQuery("https://example.com/planer/?old=1#p/token", "abcdef123456"), "https://example.com/planer/?rabcdef123456#p/token");
});

test("nowsze release.json wymusza świeży HTML i zachowuje hash planu", async () => {
  let replacement = "";
  let request = null;
  const changed = await checkForAppUpdate({
    currentRelease: "111111111111",
    now: 123456,
    storage: memoryStorage(),
    location: {
      href: "https://example.com/planer/#p/AbCdEfGhIjKlMn_o",
      replace: (value) => { replacement = value; },
    },
    fetchImpl: async (input, init) => {
      request = { input: input.toString(), init };
      return { ok: true, json: async () => ({ release: "222222222222" }) };
    },
  });

  assert.equal(changed, true);
  assert.equal(request.input, "https://example.com/planer/release.json?check=123456");
  assert.equal(request.init.cache, "no-store");
  assert.equal(replacement, "https://example.com/planer/?r222222222222#p/AbCdEfGhIjKlMn_o");
});

test("ta sama wersja i chwilowa ochrona przed pętlą nie przeładowują strony", async () => {
  const storage = memoryStorage();
  let replacements = 0;
  const location = { href: "https://example.com/planer/", replace: () => { replacements += 1; } };
  const fetchImpl = async () => ({ ok: true, json: async () => ({ release: "222222222222" }) });

  assert.equal(await checkForAppUpdate({ currentRelease: "222222222222", location, storage, fetchImpl, now: 1000 }), false);
  assert.equal(await checkForAppUpdate({ currentRelease: "111111111111", location, storage, fetchImpl, now: 2000 }), true);
  assert.equal(await checkForAppUpdate({ currentRelease: "111111111111", location, storage, fetchImpl, now: 2500 }), false);
  assert.equal(replacements, 1);
});
