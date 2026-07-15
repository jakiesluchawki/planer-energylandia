# Product decisions

- Every planned attraction can be replaced when a child rejects its theme or appearance. A replacement changes only that itinerary slot, must remain eligible for the same riders, respects hard preferences and live closure/queue limits, and preserves meals, buffers, and the declared end of the day.
- Rejected attractions stay excluded from later whole-plan recalculation for the same visit/party on that device.
- The printable/PDF itinerary must include a schematic route map for every day, practical zone/distance/walking-time guidance for each reachable point, and a compact QR code that opens walking navigation to the exact curated coordinates.
- A typical full one-day itinerary must print as a deliberate two-page A4 document (cover plus complete day) rather than orphaning the final flex buffer on a mostly empty page.
- Treat iOS Home Screen resumption and GitHub Pages' cached `index.html` as release concerns. Every production build must expose a commit-based `release.json`, check it on initial load and whenever the web app returns to the foreground, and automatically reload through a versioned query while preserving the shared-plan hash. Newly generated share links and the installed-app manifest must carry the same release token so a recipient cannot remain on a stale application shell.
