// /api/cover.js — Vercel Serverless Function (Node.js Runtime)
export const config = { runtime: "nodejs" }; // ← ここだけ修正

export default async function handler(req, res) {
  // ヘルスチェック（GET）
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      hasKey: !!process.env.OPENAI_API_KEY,
      hint: "POST {title, author, style} to generate",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "OPENAI_API_KEY is missing" });

    // Vercelでは req.body が string のことがあるので両対応
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { title, author, style } = body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const styleMap = {
      literary: "Japanese literary book cover BACKGROUND, minimal, calm colors, subtle paper texture, tasteful, NO TEXT, NO TYPOGRAPHY",
      vintage:  "vintage Japanese book cover BACKGROUND, worn paper/cloth texture, muted warm colors, film grain, NO TEXT, NO TYPOGRAPHY",
      photo:    "photo essay BACKGROUND, tasteful photography with negative space, documentary mood, NO TEXT, NO TYPOGRAPHY",
      modern:   "modern graphic BACKGROUND, bold geometric shapes, clean grid, strong contrast, minimalism, NO TEXT, NO TYPOGRAPHY",
    };
    const styleHint = styleMap[style] || styleMap.literary;

    const prompt =
`Book cover BACKGROUND ONLY (no text).
Theme derived from: Title: "${title}" Author: "${author}".
High-quality publishing style suitable for overlaying typography later.
${styleHint}
Portrait 2:3 aspect, safe margins, rich lighting and texture.`;

    // 公式 Images API。b64_json で受け取り（CORS問題回避）
    const endpoint = "https://api.openai.com/v1/images";
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1536",
        n: 1,
        response_format: "b64_json",
      }),
    });

    const raw = await r.text(); // まずテキストで受ける（失敗時の詳細を返せるように）
    if (!r.ok) {
      return res.status(502).json({
        error: "image generation failed",
        status: r.status,
        provider: endpoint,
        detail: raw.slice(0, 1200),
      });
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "bad json from provider", sample: raw.slice(0, 300) });
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: "no image data returned" });

    return res.status(200).json({ b64 });
  } catch (e) {
    return res.status(500).json({ error: "server error", message: String(e?.message || e) });
  }
}
