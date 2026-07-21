# Wunderkammer

curihara philoki の個人陳列室。GitHub Pages でそのまま公開できるビルド不要の静的サイトです。

## 公開方法(初回のみ)

1. GitHub のこのリポジトリで **Settings → Pages** を開く
2. "Build and deployment" の Source を **Deploy from a branch** にする
3. Branch を **main / (root)** にして Save
4. 数分後に `https://curihara-philoki.github.io/Wunderkammer/` で公開されます

## コンテンツの足し引き

- **ギャラリー**: `data/gallery.json` に `{ "title": "...", "image": "assets/gallery/xxx.jpg", "caption": "..." }` を追加。画像ファイルは `assets/gallery/` に置く。配列を空にすれば非表示(空の棚の表示になります)。
- **モックアップ**: `data/mockups.json` も同じ形式。
- **Bandcamp / プレイリスト埋め込み**: `index.html` 内の `#bandcampEmbed` / `#playlistEmbed` の中に、Bandcamp や Spotify などの「埋め込みコードを取得」からコピーした `<iframe>` をそのまま貼り付ける。
- **ことば遊び(回文集)**: `index.html` の `#wordplay` セクションのリンク先を書き換える。
- **Wunderkammer(種箱)**: このリポジトリの **Issues** がそのまま種箱になります。「種を蒔く」ボタンから新しい Issue を作ると、自動でトップページの種箱一覧に表示されます。消したい時は Issue を Close するだけ。
- **連絡先**: `index.html` の `#contact` セクションを編集。Bluesky / Mastodon はアカウント確定後にリストへ1行追加するだけです。

## ローカルで確認

ビルド不要なので、`index.html` をブラウザで直接開くか、リポジトリ直下で以下のような簡易サーバーを立てて確認できます。

```
python3 -m http.server 8000
```
