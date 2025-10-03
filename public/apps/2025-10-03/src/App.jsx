import React, { useMemo, useState } from "react";

// ワンボタン版 + Wikipedia参照（REST API）
// その日の「誕生日／命日／記念日(=出来事)」を各1つずつランダム表示。
// Wikipediaの On This Day API を優先し、取れない場合はローカルSEEDをフォールバック。
// 参照: https://{lang}.wikipedia.org/api/rest_v1/feed/onthisday/{type}/{MM}/{DD}
// 例: https://ja.wikipedia.org/api/rest_v1/feed/onthisday/births/10/02

const tz = "Asia/Tokyo";
const toKey = (d) => `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmt = (d) => new Intl.DateTimeFormat("ja-JP", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random()*arr.length)] : null);



// HTMLタグを除去する関数
function stripHtml(html) {
  if (!html) return "";
  // 簡易的なHTMLタグ除去（ブラウザ環境なのでDOMParserを使用）
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

async function fetchOnThisDay(lang, type, mm, dd) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/${type}/${mm}/${dd}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatBirthOrDeath(item) {
  // item: { text, year, pages: [{titles:{normalized,display}}] ... }
  const year = item.year ? String(item.year) : "";
  const rawTitle = item?.pages?.[0]?.titles?.display || item?.pages?.[0]?.normalizedtitle || "";
  const title = stripHtml(rawTitle);
  const pageTitle = item?.pages?.[0]?.titles?.normalized || "";
  
  let displayText = "";
  if (title && year) displayText = `${title} (${year})`;
  else if (title) displayText = title;
  else displayText = stripHtml(item.text) || "(no title)";
  
  return {
    text: displayText,
    link: pageTitle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}` : null
  };
}

function formatEvent(item) {
  // 出来事（記念日っぽく使う）
  const year = item.year ? `${item.year}年` : "";
  const rawText = item.text || item?.pages?.[0]?.titles?.display || "出来事";
  const text = stripHtml(rawText);
  const pageTitle = item?.pages?.[0]?.titles?.normalized || "";
  
  const displayText = year ? `${year}: ${text}` : text;
  
  return {
    text: displayText,
    link: pageTitle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}` : null
  };
}

export default function App() {
  const [date, setDate] = useState(() => new Date());
  const key = useMemo(() => toKey(date), [date]);
  const [out, setOut] = useState({ 
    bday: { text: "", link: null }, 
    death: { text: "", link: null }, 
    anniv: { text: "", link: null } 
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function draw() {
    setLoading(true); setErr("");
    const [mm, dd] = key.split("-");
    try {
      // Wikipedia "On This Day" APIは英語版のみ対応のため、常に "en" を使用
      const apiLang = "en";
      const [births, deaths, events] = await Promise.allSettled([
        fetchOnThisDay(apiLang, "births", mm, dd),
        fetchOnThisDay(apiLang, "deaths", mm, dd),
        fetchOnThisDay(apiLang, "events", mm, dd),
      ]);



      // births - APIデータのみ
      let bday = { text: "", link: null };
      if (births.status === "fulfilled" && births.value?.births?.length) {
        const item = pick(births.value.births);
        bday = formatBirthOrDeath(item);
      } else {
        bday = { text: "（データなし）", link: null };
      }

      // deaths - APIデータのみ
      let death = { text: "", link: null };
      if (deaths.status === "fulfilled" && deaths.value?.deaths?.length) {
        const item = pick(deaths.value.deaths);
        death = formatBirthOrDeath(item);
      } else {
        death = { text: "（データなし）", link: null };
      }

      // events - APIデータのみ
      let anniv = { text: "", link: null };
      if (events.status === "fulfilled" && events.value?.events?.length) {
        const item = pick(events.value.events);
        anniv = formatEvent(item);
      } else {
        anniv = { text: "（データなし）", link: null };
      }

      setOut({ bday, death, anniv });
    } catch (e) {
      console.error(e);
      setErr("Wikipediaの取得に失敗しました");
      setOut({
        bday: { text: "（エラー）", link: null },
        death: { text: "（エラー）", link: null },
        anniv: { text: "（エラー）", link: null },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold">今日はなんの日？</h1>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-neutral-300">日付</span>
            <input
              type="date"
              value={new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
              onChange={(e) => setDate(new Date(e.target.value + "T00:00:00"))}
              className="bg-white/10 rounded-xl px-3 py-2 outline-none"
            />

          </label>



          <button onClick={draw} disabled={loading} className="py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50">
            {loading ? "読み込み中…" : "検索"}
          </button>
        </div>

        {err && <div className="mt-3 text-xs text-red-300">{err}</div>}

        <div className="mt-6 space-y-3">
                    <Item label="誕生日" data={out.bday} />
          <Item label="命日" data={out.death} />
          <Item label="記念日/出来事" data={out.anniv} />
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          ©matsumulion
        </p>

        
      </div>
    </div>
  );
}

function Item({ label, data }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-1 text-lg">
        {data?.text || "（ここに結果）"}
        {data?.link && (
          <a 
            href={data.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 text-blue-400 hover:text-blue-300 text-sm"
          >
            📖 Wikipedia
          </a>
        )}
      </div>
    </div>
  );
} 