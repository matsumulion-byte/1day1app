import { SRGBColorSpace, Texture, TextureLoader, LinearFilter } from "three";
import { useEffect, useState } from "react";
type Entry = {
  refs: number;
  texture?: Texture;
  failed?: boolean;
  listeners: Set<() => void>;
  last: number;
  queued: boolean;
};
const entries = new Map<string, Entry>();
const loader = new TextureLoader();
let active = 0;
const queue: string[] = [];
let maxEntries = 32;
export function setTextureBudget(mobile: boolean) {
  maxEntries = mobile ? 24 : 48;
}
function evict() {
  const unused = [...entries]
    .filter(([, e]) => !e.refs && !e.queued)
    .sort((a, b) => a[1].last - b[1].last);
  while (entries.size > maxEntries && unused.length) {
    const [url, e] = unused.shift()!;
    e.texture?.dispose();
    entries.delete(url);
  }
}
function pump() {
  while (active < 3 && queue.length) {
    const url = queue.shift()!;
    const e = entries.get(url);
    if (!e) continue;
    if (!e.refs) {
      e.queued = false;
      evict();
      continue;
    }
    active++;
    loader.load(
      url,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        t.minFilter = LinearFilter;
        t.generateMipmaps = false;
        t.anisotropy = 1;
        e.texture = t;
        finish();
      },
      undefined,
      () => {
        e.failed = true;
        finish();
      },
    );
    function finish() {
      active--;
      e!.queued = false;
      e!.listeners.forEach((fn) => fn());
      evict();
      pump();
    }
  }
}
export function useManagedTexture(url: string) {
  const [, update] = useState(0);
  useEffect(() => {
    let e = entries.get(url);
    if (!e) {
      e = {
        refs: 0,
        listeners: new Set(),
        last: performance.now(),
        queued: false,
      };
      entries.set(url, e);
    }
    e.refs++;
    const notify = () => update((v) => v + 1);
    e.listeners.add(notify);
    if (!e.texture && !e.failed && !e.queued) {
      e.queued = true;
      queue.push(url);
    }
    pump();
    notify();
    return () => {
      e!.refs--;
      e!.last = performance.now();
      e!.listeners.delete(notify);
      evict();
    };
  }, [url]);
  return entries.get(url)?.texture;
}
