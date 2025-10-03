# 松村のネタ：Wikipedia参照版

Wikipedia の "On This Day" API を使用して、指定した日付の誕生日、命日、記念日/出来事をランダムに表示するReactアプリケーションです。

## 機能

- 日付を選択して「その日のネタを引く」ボタンをクリック
- Wikipedia API から以下の情報を取得：
  - 誕生日：その日に生まれた有名人
  - 命日：その日に亡くなった有名人  
  - 記念日/出来事：その日に起こった歴史的出来事
- 日本語と英語の切り替え対応
- Wikipedia API が利用できない場合はローカルのフォールバックデータを使用

## 技術スタック

- React 18
- Vite（ビルドツール）
- Tailwind CSS（スタイリング）
- Wikipedia REST API

## セットアップ

1. 依存関係のインストール：
```bash
npm install
```

2. 開発サーバーの起動：
```bash
npm run dev
```

3. ブラウザで `http://localhost:5173` にアクセス

## ビルド

本番用のビルドを作成する場合：
```bash
npm run build
```

ビルドされたファイルは `dist/` フォルダに出力されます。

## API について

このアプリケーションは Wikipedia の REST API "On this day" を使用しています：
- エンドポイント: `https://{lang}.wikipedia.org/api/rest_v1/feed/onthisday/{type}/{MM}/{DD}`
- 例: `https://ja.wikipedia.org/api/rest_v1/feed/onthisday/births/10/02`

商用利用や高頻度での利用の場合は、Wikipedia の公式ドキュメントでレート制限やポリシーを確認してください。 