// /api/cover.js — Vercel Serverless Function
export default async function handler(req, res) {
  // ヘルスチェック: GETで状態確認できる
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

    const { title, author, style } = req.body || {};
    if (!title) return res.status(400).json({ error: "title is required" });

    const styleMap = {
      literary: "Japanese literary book cover BACKGROUND, minimal, calm colors, subtle paper texture, tasteful, NO TEXT, NO TYPOGRAPHY",
      vintage:  "vintage Japanese book cover BACKGROUND, worn paper/cloth texture, muted warm colors, film grain, NO TEXT, NO TYPOGRAPHY",
      photo:    "photo essay BACKGROUND, tasteful photography with negative space, documentary mood, NO TEXT, NO TYPOGRAPHY",
      modern:   "modern graphic BACKGROUND, bold geometric shapes, clean grid, strong contrast, minimalism, NO TEXT, NO TYPOGRAPHY",
    };
    const styleHint = styleMap[style] || styleMap.literary;

    const prompt = `
Book cover BACKGROUND ONLY (no text). Theme derived from:
Title: "${title}" Author: "${author}".
High-quality publishing style suitable for overlaying typography later.
${styleHint}
Portrait 2:3 aspect, safe margins, rich lighting and texture.`;

    const r = await fetch("https://api.openai.com/v1/images", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1536", // 2:3 縦
        n: 1
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("OpenAI images error:", text);
      return res.status(502).json({ error: "image generation failed", detail: text.slice(0,500) });
    }

    const json = await r.json();
    const url = json?.data?.[0]?.url;
    if (!url) return res.status(502).json({ error: "no image url returned" });

    return res.status(200).json({ url });
  } catch (e) {
    console.error("SERVER ERROR:", e);
    return res.status(500).json({ error: "server error", message: String(e?.message || e) });
  }
}
