const base = "/apps/2026-09-30/";
const grid = document.querySelector("#grid");
let records = [];
const node = (tag, text) => {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  return n;
};
function render() {
  grid.replaceChildren();
  const query = document.querySelector("#query").value.toLowerCase();
  const mode = document.querySelector("#filter").value;
  for (const r of records) {
    if (!`${r.date} ${r.title}`.toLowerCase().includes(query)) continue;
    if (mode === "warning" && !r.warnings?.length) continue;
    if (["captured", "failed"].includes(mode) && r.status !== mode) continue;
    const card = node("article");
    if (r.status === "captured") {
      const a = node("a");
      a.href = r.image;
      a.target = "_blank";
      a.rel = "noopener";
      const image = node("img");
      image.src = r.image;
      image.alt = r.title;
      image.loading = "lazy";
      image.decoding = "async";
      a.append(image);
      card.append(a);
    } else {
      const box = node("div", "取得できませんでした");
      box.className = "failed";
      card.append(box);
    }
    card.append(node("small", r.date));
    const h = node("h2");
    const a = node("a", r.title || r.date);
    a.href = r.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    h.append(a);
    card.append(h);
    if (r.error) card.append(node("p", r.error));
    if (r.warnings?.length) {
      const d = node("details");
      d.append(
        node("summary", `確認メモ ${r.warnings.length}件`),
        node("p", r.warnings.join("\n")),
      );
      card.append(d);
    }
    grid.append(card);
  }
}
fetch(base + "capture-report.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    records = data.results;
    const count = records.filter((r) => r.status === "captured").length;
    document.querySelector("#summary").textContent =
      `撮影済み ${count}件 / 記録 ${records.length}件・1440 × 960 → WebP 768 × 512`;
    render();
  })
  .catch(
    () =>
      (document.querySelector("#summary").textContent =
        "撮影記録をまだ読み込めません。撮影開始後に再読み込みしてください。"),
  );
document.querySelector("#query").addEventListener("input", render);
document.querySelector("#filter").addEventListener("change", render);
