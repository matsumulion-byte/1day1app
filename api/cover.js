// /api/cover.js
export default async function handler(req, res) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const { title, author, style } = req.body || {};
      if (!title) return res.status(400).json({ error: "title is required" });
  
      const styleMap = {
        literary: "Japanese literary book cover background, minimal, calm color palette, subtle paper texture, soft vignette, generous margins, NO TEXT, NO TYPOGRAPHY, high quality, elegant composition, photography or abstract art suitable for literature",
        vintage:  "vintage Japanese book cover background, worn paper and cloth texture, muted warm colors, classic texture, film grain, slight imperfections, NO TEXT, NO TYPOGRAPHY",
        photo:    "photo essay book cover background, tasteful photography backdrop with negative space, shallow depth of field, documentary mood, NO TEXT, NO TYPOGRAPHY",
        modern:   "modern graphic cover background, bold geometric shapes, clean grids, strong contrast, minimalism, NO TEXT, NO TYPOGRAPHY"
      };
      const styleHint = styleMap[style] || styleMap.literary;
  
      const prompt = `
  Book cover BACKGROUND ONLY (no text). Theme from the title:
  Title: "${title}" Author: "${author}".
  Create a cohesive, publishing-quality cover background suitable for overlaying typography later.
  Style: ${styleHint}
  Aspect ratio 2:3 (portrait), center composition with safe margins, printable quality, rich lighting.
  `;
  
      // OpenAI Images API
      const r = await fetch("https://api.openai.com/v1/images", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size: "1024x1536",
          // background: "transparent" // 使いたければ
          n: 1,
        }),
      });
  
      if (!r.ok) {
        const err = await r.text();
        console.error("OpenAI images error:", err);
        return res.status(500).json({ error: "image generation failed" });
      }
      const json = await r.json();
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) return res.status(500).json({ error: "no image data" });
  
      res.status(200).json({ b64 });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server error" });
    }
  }
  