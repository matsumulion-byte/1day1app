# 難読苗字クイズ — 2026-09-19

依存パッケージ・外部API・Webフォントなしの静的アプリです。

## 起動

正規リポジトリの public をドキュメントルートにします。

```sh
python3 -m http.server 8919 --bind 127.0.0.1 --directory /Users/matsumurahironori/1day1app/public
```

http://127.0.0.1:8919/apps/2026-09-19/ を開いてください。

## ファイルと追加方法

- `data.js`: 30件の難読苗字と松村。`surname`, `readings`（先頭が代表読み）, `description` を追加できます。参照URLは苗字から生成します。
- `logic.js`: 正規化・複数読み判定・重複なしの抽選。松村以外を9件抽選し、松村を加えて全体をシャッフルします。
- `script.js`: 画面とIME制御。変換中・変換確定直後の送信を防ぎ、回答済み問題はロックします。
- `style.css`: 共通の苗字スタイル。松村専用の表示分岐はありません。

カタカナ・半角カナ・分離した濁点・空白を正規化します。長音や小書き文字を無差別に置換せず、別の実在読みはデータに明記します。由来の言い伝えは確定した史実として扱いません。

## 参考資料（2026-09-19確認）

各苗字の実在・読み・由来確認：[名字由来net](https://myoji-yurai.net/)（個別URLは data.js の source）。回答後にも参照リンクを表示します。

読みの照合：[漢読検定・難読苗字学習用文字一覧](https://www.joho-gakushu.or.jp/kanji/kanji-gakusyu/nandokumyouji/nandokumyouji_1q_2q.html)。

小鳥遊・月見里・四月一日・七五三掛の読みの背景：[CLASSY. 難読名字の解説](https://classy-online.jp/career/321306/)。

栗花落の季節に関する読みの説明：[メガネのセンリ「難読名字」](https://meganenosenri.com/promotion/1/blog_detail.html?key=entry&value=2855)。

日付の根拠：[国立公文書館・9月19日 苗字の日](https://www.archives.go.jp/naj_news/11/anohi.html)。

一・九・十など、今回採用しなかった候補はゲームデータに含めていません。候補調査で別読みが特に多かった苗字も入れ替えています。

## 検証

```sh
node --test public/apps/2026-09-19/logic.test.mjs
npm run check:app -- 2026-09-19
npm run build
```

Chromeのモバイルエミュレーションで全10問→結果→再挑戦、空欄、正誤、カタカナ、回答ロック、合成compositionイベント、320px/390px幅、長押し・ダブルクリックを確認。日本語IMEの確認は合成イベントによるもので、実機キーボードの検証ではありません。全ローカルCSS/JSとHTMLのHTTP 200を確認。
