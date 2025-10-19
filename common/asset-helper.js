// /common/asset-helper.js
// どのアプリ（/YYYY-MM-DD/）からでも assets を安全に参照する共通ヘルパー

/** 現在のディレクトリ（/2025-10-19/ のように末尾 / 付き）を返す */
function currentDir() {
    const p = window.location.pathname;
    return p.endsWith("/") ? p : p + "/";
  }
  
  /** /YYYY-MM-DD/assets/<file> を返す（dir は "assets" などに変更可） */
  export function asset(file, { dir = "assets" } = {}) {
    const base = currentDir();               // 例: /2025-10-19/
    return `${base}${dir}/${file}`;          // 例: /2025-10-19/assets/matsumura_photo.jpg
  }
  
  /** 別の日付フォルダのアセットを取りたいとき用（任意） */
  export function assetFrom(dateFolder, file, { dir = "assets" } = {}) {
    // dateFolder は "2025-10-18" のように指定
    const df = dateFolder.replace(/^\/+|\/+$/g, ""); // 両端のスラッシュ除去
    return `/${df}/${dir}/${file}`;
  }
  
  // UMD風のグローバル公開（非モジュール環境でも使いたい時用・任意）
  if (typeof window !== "undefined") {
    window.__assetHelper = { asset, assetFrom };
  }
  