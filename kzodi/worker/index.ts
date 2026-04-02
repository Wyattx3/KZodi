/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

async function notifyClients(message: Record<string, unknown>) {
    const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
    });

    for (const client of clients) {
        client.postMessage(message);
    }
}

self.addEventListener("activate", (event) => {
    event.waitUntil(
        notifyClients({
            type: "KAKOEI_SW_ACTIVATED",
            activatedAt: Date.now(),
        }),
    );
});
