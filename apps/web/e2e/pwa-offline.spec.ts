import { expect, test } from "@playwright/test";

async function waitForServiceWorker(page: import("@playwright/test").Page) {
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;

    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
}

async function readPersistedSeed(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const deviceId = window.localStorage.getItem("vcell.deviceId");
    if (!deviceId) return null;

    const openRequest = window.indexedDB.open("vcell", 66);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () =>
        reject(openRequest.error ?? new Error("Failed to open IndexedDB"));
    });

    return new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction("inProgressGames", "readonly");
      const store = tx.objectStore("inProgressGames");
      const req = store.get(deviceId);

      req.onsuccess = () => {
        const result = req.result as { seed?: string } | undefined;
        resolve(typeof result?.seed === "string" ? result.seed : null);
      };
      req.onerror = () =>
        reject(req.error ?? new Error("Failed to read in-progress game"));
    });
  });
}

test.describe("offline phone PWA", () => {
  test("loads the gameplay shell offline after an online visit and preserves the local session", async ({
    page,
    context,
    browserName
  }) => {
    test.skip(
      browserName === "webkit",
      "Playwright WebKit currently throws an internal error on offline reload; Chromium covers the service worker flow."
    );

    await page.goto("/game");
    await expect(page.getByLabel("Game board")).toBeVisible();
    await expect(page.getByText("Current seed:")).toBeVisible();

    await page.waitForFunction(async () => {
      const seed = await (async () => {
        const deviceId = window.localStorage.getItem("vcell.deviceId");
        if (!deviceId) return null;

        const openRequest = window.indexedDB.open("vcell", 66);
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          openRequest.onsuccess = () => resolve(openRequest.result);
          openRequest.onerror = () =>
            reject(openRequest.error ?? new Error("Failed to open IndexedDB"));
        });

        return new Promise<string | null>((resolve, reject) => {
          const tx = db.transaction("inProgressGames", "readonly");
          const store = tx.objectStore("inProgressGames");
          const req = store.get(deviceId);

          req.onsuccess = () => {
            const result = req.result as { seed?: string } | undefined;
            resolve(typeof result?.seed === "string" ? result.seed : null);
          };
          req.onerror = () =>
            reject(req.error ?? new Error("Failed to read in-progress game"));
        });
      })();

      return typeof seed === "string" && seed.length > 0;
    });

    await page.reload();
    await waitForServiceWorker(page);

    const onlineSeed = await readPersistedSeed(page);
    expect(onlineSeed).not.toBeNull();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByLabel("Game board")).toBeVisible();
    await expect(page.getByText("Current seed:")).toBeVisible();
    await expect(page.getByText("Cloud sync is unavailable right now")).toBeVisible();

    const offlineSeed = await readPersistedSeed(page);
    expect(offlineSeed).toBe(onlineSeed);
  });

  test("serves supported cached routes offline and keeps uncached routes usable", async ({
    page,
    context,
    browserName
  }) => {
    test.skip(
      browserName === "webkit",
      "Playwright WebKit currently throws an internal error on offline reload; Chromium covers the service worker flow."
    );

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.reload();
    await waitForServiceWorker(page);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.goto("/login");
    const gameBoard = page.getByLabel("Game board");
    const guestFallback = page.getByText("continue as a guest");

    await expect(gameBoard.or(guestFallback)).toBeVisible();
  });

  test("exposes the manifest link and manifest metadata for installability", async ({
    page
  }) => {
    await page.goto("/game");

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBe("/manifest.webmanifest");

    const manifest = await page.request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBe(true);

    const json = await manifest.json();
    expect(json.name).toBe("V-Cell");
    expect(json.display).toBe("standalone");
    expect(json.start_url).toBe("/game");
  });
});
