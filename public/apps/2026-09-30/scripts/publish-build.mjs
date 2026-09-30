import { cp, rm } from "node:fs/promises";
// Only replace generated assets; source, screenshots and data are preserved.
await rm("assets", { recursive: true, force: true });
await cp(".build", ".", { recursive: true });
