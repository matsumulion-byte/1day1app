// /api/cover.js — v7 square-only (1024x1024) + URL/b64 併用
const VERSION = "v7-square-1024-url+b64";

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
      "Square composition with ample negative space for typography overlay, rich lighting and texture."
    ].join(" ");

    const endpoint = "https://api.openai.com/v1/images/generations";

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024", // ← 正方形に固定
        n: 1
      }),
    });

    const raw = await r.text();
    if (!r.ok) {
      return res.status(502).json({
        error: "image generation failed",
        status: r.status,
        version: VERSION,
        detail: raw?.slice(0, 1200),
      });
    }

    let json;
    try { json = JSON.parse(raw); }
    catch { return res.status(502).json({ error: "bad json from provider", version: VERSION, sample: raw?.slice(0, 300) }); }

    const url = json?.data?.[0]?.url;
    if (!url) return res.status(502).json({ error: "no image url returned", version: VERSION });

    // URL画像をサーバ側で取得→b64化（CORS汚染回避）
    let b64 = null;
    try {
      const imgRes = await fetch(url);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      b64 = buf.toString("base64");
    } catch (_) { /* b64生成に失敗したらURLだけ返す */ }

    return res.status(200).json({ url, b64, version: VERSION });
  } catch (e) {
    return res.status(500).json({ error: "server error", version: VERSION, message: String(e?.message || e) });
  }
}
