// /api/cover.js — Vercel Serverless Function (Node.js)
// ★ この文字列が /api/cover の GET で見えたら最新が反映できてます
const VERSION = "v5-no-response-format-1792>1024 fallback";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      version: VERSION,
      hasKey: !!process.env.OPENAI_API_KEY,
      hint: "POST {title, author, style} to generate",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", version: VERSION });
  }

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "OPENAI_API_KEY is missing", version: VERSION });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { title, author, style } = body;
    if (!title) return res.status(400).json({ error: "title is required", version: VERSION });

    const styleMap = {
      literary: "Japanese literary book cover BACKGROUND, minimal, calm colors, subtle paper texture, tasteful, NO TEXT, NO TYPOGRAPHY",
      vintage:  "vintage Japanese book cover BACKGROUND, worn paper/cloth texture, muted warm colors, film grain, NO TEXT, NO TYPOGRAPHY",
      photo:    "photo essay BACKGROUND, tasteful photography with negative space, documentary mood, NO TEXT, NO TYPOGRAPHY",
      modern:   "modern graphic BACKGROUND, bold geometric shapes, clean grid, strong contrast, minimalism, NO TEXT, NO TYPOGRAPHY",
    };
    const styleHint = styleMap[style] || styleMap.literary;

    const prompt = [
      "Book cover BACKGROUND ONLY (no text).",
      `Theme derived from: Title: "${title}" Author: "${author}".`,
      "High-quality publishing style suitable for overlaying typography later.",
      styleHint,
      "Portrait composition with safe margins, rich lighting and texture."
    ].join(" ");

    const endpoint = "https://api.openai.com/v1/images/generations";

    async function gen(size) {
      const payload = {
        model: "gpt-image-1",
        prompt,
        size,        // ← response_format は付けない！
        n: 1
      };
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await r.text();
      return { ok: r.ok, status: r.status, raw, payload };
    }

    // まず縦長（サポートサイズ）の 1024x1792 を試す → ダメなら 1024x1024
    let resp = await gen("1024x1792");
    if (!resp.ok) {
      const fallback = await gen("1024x1024");
      if (fallback.ok) resp = fallback;
    }

    if (!resp.ok) {
      return res.status(502).json({
        error: "image generation failed",
        status: resp.status,
        version: VERSION,
        provider: endpoint,
        // 送ったパラメータを確認（response_format が入ってないことの確認用）
        sent: { ...resp.payload },
        detail: resp.raw?.slice(0, 1200),
      });
    }

    let json;
    try { json = JSON.parse(resp.raw); }
    catch { return res.status(502).json({ error: "bad json from provider", version: VERSION, sample: resp.raw?.slice(0, 300) }); }

    // gpt-image-1 はデフォルト URL 返却
    const url = json?.data?.[0]?.url;
    if (!url) return res.status(502).json({ error: "no image url returned", version: VERSION, sample: JSON.stringify(json).slice(0, 300) });

    return res.status(200).json({ url, version: VERSION });
  } catch (e) {
    return res.status(500).json({ error: "server error", version: VERSION, message: String(e?.message || e) });
  }
}
