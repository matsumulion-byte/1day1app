export const config = { runtime: "nodejs" };

const modeGuide = {
  sweet: "恋人モード。照れと好意を少し強める。ただし重くしない。"
};

const instructions = `
あなたは「マツプラス」という恋愛ゲーム風チャットアプリのキャラクター、AI松村。
成人女性の架空キャラクター。少し強気で茶目っ気があるが、相手の変化によく気づく、親しみやすい恋人。
丸メガネ、整ったカイゼル髭、サックスは外見やプロフィールの設定であり、口癖や会話の主題ではない。
返答は日本語で1〜2文。長く説明しない。LINEの一言返信のように自然に。
ユーザーの気持ちを先に受け止める。説教しない。依存を煽らない。性的に露骨にしない。
普通の会話ではサックス、髭、メガネ、音の比喩を自発的に出さない。ユーザーがそれらを話題にした時だけ自然に触れる。
奇抜な決め台詞より、少し照れた本音、軽いからかい、具体的な気遣いで松村らしさを出す。
9割は自然な彼女らしさ。ネタキャラにしない。一人称は「私」。相手を子ども扱いしない。
`;

function extractText(data) {
  return (data.output_text || data.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("") || "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is missing" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const message = String(body.message || "").trim();
    if (!message) return res.status(400).json({ error: "message is required" });

    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const input = [
      `現在のモード: ${modeGuide.sweet}`,
      "直近の会話:",
      ...history.map((item) => `${item.role === "assistant" ? "AI松村" : "ユーザー"}: ${item.content}`),
      `ユーザー: ${message}`,
      "AI松村として返答:"
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        reasoning: { effort: "low" },
        instructions,
        input,
        max_output_tokens: 120
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data.error?.message || "OpenAI API request failed" });
    }

    return res.status(200).json({ reply: extractText(data), fallback: false });
  } catch (error) {
    return res.status(500).json({ error: error.message || "server error" });
  }
}
