# AGENTS.md

このリポジトリでエージェントが守るべきルール・コマンド・スタイル規約まとめ。

## ビルド・Lint・テストコマンド

- パッケージ管理: pnpm (v10以上)
- 全体ビルド: `pnpm build`
- 全体Lint: `pnpm lint` / 修正: `pnpm lint-fix`
- 全体フォーマット: `pnpm format` / チェック: `pnpm format-check`
- サブプロジェクト例 (amplify_nextapp):
  - 開発: `pnpm dev`
  - ビルド: `pnpm build`
  - Lint: `pnpm lint` / 修正: `pnpm lint-fix`
  - フォーマット: `pnpm format` / チェック: `pnpm format-check`
- テストは各package.jsonのscriptsを参照

## コードスタイル・型・Lint規約

- インデント: スペース2、改行: LF、UTF-8、末尾改行必須
- oxfmt: セミコロン必須、シングルクォート、末尾カンマall、インポートソート有効
- oxlint: typescript、import、promise、vitestプラグイン (awscdkはoxlint-plugin-awscdkをjsPlugins経由)
- TypeScript: strictモード、any型禁止、unknown型は適切な型ガードと併用、クラスは原則禁止
- importパス: `~/*`や`@/*`エイリアス利用
- 命名: キャメルケース推奨
- エラー処理: Error拡張時のみクラスを使用しても良い
