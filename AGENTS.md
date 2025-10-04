# AGENTS.md

このリポジトリでエージェントが守るべきルール・コマンド・スタイル規約まとめ。

## ビルド・Lint・テストコマンド

- パッケージ管理: pnpm (v10以上)
- 全体ビルド: `pnpm build`
- 全体Lint: `pnpm lint` / 修正: `pnpm lint-fix`
- サブプロジェクト例 (amplify_nextapp):
  - 開発: `pnpm dev`
  - ビルド: `pnpm build`
  - Lint: `pnpm lint` / 修正: `pnpm lint-fix`
  - Prettier: `pnpm prettier-check` / `pnpm prettier-format`
  - ESLint: `pnpm eslint-check` / `pnpm eslint-fix`
- テストは各package.jsonのscriptsを参照

## コードスタイル・型・Lint規約

- インデント: スペース2、改行: LF、UTF-8、末尾改行必須
- Prettier: セミコロン必須、シングルクォート、末尾カンマes5
- ESLint: typescript-eslint, stylistic, import, react-hooks, jsx-a11y推奨
- TypeScript: strictモード、any型禁止、unknown型は適切な型ガードと併用、クラスは原則禁止
- importパス: `~/*`や`@/*`エイリアス利用
- 命名: キャメルケース推奨
- エラー処理: Error拡張時のみクラスを使用しても良い
