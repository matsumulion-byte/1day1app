// /api/cover.js — Vercel Serverless Function
export default async function handler(req, res) {
// GETの部分だけ一時的にこうしてOK（デプロイしたら /api/cover を開いて確認）
if (req.method === "GET") {
  const k = process.env.OPENAI_API_KEY;
  return res.status(200).json({
    ok: true,
    hasKey: !!k,
    // 環境変数が読めているか、先頭だけマスク表示
    keyPreview: k ? (k.slice(0,3) + "…") : null,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV // "production" になってるか確認
  });
}

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "OPENAI_API_KEY is missing" });

    // Next/Vercel環境だと req.body が文字列のこともあるのでケア
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

    const prompt = `
Book cover BACKGROUND ONLY (no text). Theme derived from:
Title: "${title}" Author: "${author}".
High-quality publishing style suitable for overlaying typography later.
${styleHint}
Portrait 2:3 aspect, safe margins, rich lighting and texture.
`.trim();

    // ここがポイント：response_format:"url" を明示
    const r = await fetch("https://api.openai.com/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1536",  // 2:3 縦
        n: 1,
        response_format: "url"
      }),
    });

    const textIfError = !r.ok ? await r.text() : null;
    if (!r.ok) {
      console.error("OpenAI images error:", textIfError);
      return res.status(502).json({ error: "image generation failed", detail: textIfError?.slice(0, 800) });
    }

    const json = await r.json();
    let url = json?.data?.[0]?.url;

    // 万一URLが無い場合（b64_jsonしか来ない環境差）を救う
    if (!url) {
      const b64 = json?.data?.[0]?.b64_json;
      if (b64) {
        url = `data:image/png;base64,${b64}`;
      }
    }
    if (!url) return res.status(502).json({ error: "no image data returned" });

    return res.status(200).json({ url });
  } catch (e) {
    console.error("SERVER ERROR:", e);
    return res.status(500).json({ error: "server error", message: String(e?.message || e) });
  }
}
