# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

このリポジトリは AWS 関係の自作サンプルコード集です。複数の AWS サービス（Lambda、CodePipeline、CodeBuild、Amplify、ECS、EC2など）の実装例を含む pnpm ワークスペースのモノレポです。

## Package Manager

- **必須**: pnpm >= 10.0.0
- **禁止**: npm, yarn は使用しないでください
- Node.js >= 22.0.0 が必要です

## Common Commands

### ビルド
```bash
pnpm -r build              # 全プロジェクトをビルド
pnpm -r --parallel build   # 全プロジェクトを並列ビルド
```

### Lint
```bash
pnpm -r --parallel lint           # 全プロジェクトで lint 実行
pnpm -r --parallel lint-fix       # 全プロジェクトで lint 自動修正
```

### CDK 操作 (各プロジェクト内で実行)
```bash
cd <project-directory>
pnpm cdk deploy    # スタックをデプロイ
pnpm cdk synth     # CloudFormation テンプレートを生成
pnpm cdk diff      # 変更点を確認
pnpm cdk destroy   # スタックを削除
```

### テスト (Jest を含むプロジェクトの場合)
```bash
cd <project-directory>
pnpm test          # テストを実行
```

## Architecture

### プロジェクト構造

このリポジトリは機能別に分類された複数の独立したプロジェクトで構成されています：

- **amplify/**: AWS Amplify 関連のプロジェクト
  - CDK インフラストラクチャと Next.js アプリケーション

- **codebuild/**: AWS CodeBuild 関連のプロジェクト
  - カスタムイメージ、Webhook プロジェクトの例

- **codepipeline/**: AWS CodePipeline 関連のプロジェクト
  - Docker ビルド、脆弱性スキャン、GitHub タグ連携など

- **lambda/**: AWS Lambda 関連のプロジェクト
  - Apollo Server (GraphQL)
  - EventBridge 連携
  - Lambda Layer の実装例

- **infra/**: 共通インフラストラクチャ
  - S3、ECS、VPC、ACM など

- **ec2-bluegreen/**: EC2 Blue-Green デプロイメントの例
  - CloudFront との連携

- **codeconections/**: AWS CodeConnections の実装例

### CDK プロジェクト構造

各 CDK プロジェクトは一般的に以下の構造を持ちます：

```
<project-name>/
├── bin/           # CDK アプリケーションのエントリーポイント
├── lib/           # スタック定義 (Constructs)
├── test/          # Jest テスト (一部のプロジェクト)
├── cdk.json       # CDK 設定
├── tsconfig.json  # TypeScript 設定
└── package.json   # 依存関係とスクリプト
```

### pnpm Workspace 設定

- `pnpm-workspace.yaml` で全サブプロジェクトを管理
- `.next` と `cdk.out` は workspace から除外
- `enablePrePostScripts: true` で pre/post スクリプトが有効

## ESLint Configuration

- ルートに `eslint.config.js` (Flat Config 形式)
- TypeScript、React Hooks、jsx-a11y、import プラグインを使用
- プロジェクト全体で統一された lint ルール

## Testing

Jest を使用するプロジェクトの場合：
- テストファイルは `test/**/*.test.ts` に配置
- `ts-jest` トランスフォーマーを使用
- `pnpm test` でテストを実行

## CI/CD

GitHub Actions を使用：
- `.github/workflows/ci.yml` でビルドとテストを実行
- pnpm を使用して依存関係をインストール
- 全プロジェクトを並列ビルド
