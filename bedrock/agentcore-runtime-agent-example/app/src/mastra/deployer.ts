import { mkdir, stat, copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path'; import { join } from 'node:path';
import { Deployer } from '@mastra/deployer';
import { FileService } from '@mastra/deployer/build';
import type { Config } from '@mastra/core/mastra';
import { IS_DEFAULT } from '@mastra/deployer/bundler';

export class CustomDeployer extends Deployer {

  constructor() {
    super({ name: 'CustomBuild' });
    this.platform = process.versions?.bun ? 'neutral' : 'node';
  }

  async deploy(_outputDirectory: string): Promise<void> { }

  protected override async getUserBundlerOptions(
    mastraEntryFile: string,
    outputDirectory: string,
  ): Promise<NonNullable<Config['bundler']>> {
    const opts = await super.getUserBundlerOptions(mastraEntryFile, outputDirectory);
    if (!opts?.[IS_DEFAULT]) return opts;
    return { ...opts, externals: true };
  }

  override getEnvFiles(): Promise<string[]> {
    const possibleFiles = ['.env.production', '.env.local', '.env'];
    try {
      const fileService = new FileService();
      return Promise.resolve([fileService.getFirstExistingFile(possibleFiles)]);
    } catch {
      return Promise.resolve([]);
    }
  }

  protected override async installDependencies(
    outputDirectory: string,
    rootDir = process.cwd(),
  ) {
    try {
      await super.installDependencies(outputDirectory, rootDir);
    } catch (err) {
      // pnpm approve-builds を実行した状態を再現して、再インストール
      this.logger.warn('pnpm approve-builds required, running automatically...');

      await this.copyPnpmWorkspaceYaml({ outputDirectory, rootDir: resolve(rootDir, '../../..') });

      await this.syncAllowBuilds({ outputDirectory, rootDir: resolve(rootDir, '../../..') });

      this.logger.info('pnpm approve-builds completed, retrying install...');
      // await super.installDependencies(outputDirectory, rootDir);
    }
  }

  private async copyPnpmWorkspaceYaml({
    rootDir,
    outputDirectory,
  }: {
    rootDir: string;
    outputDirectory: string;
  }) {
    const src = join(rootDir, 'pnpm-workspace.yaml');
    const dest = join(outputDirectory, 'output', 'pnpm-workspace.yaml');
    try {
      await stat(src);
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(src, dest);
      this.logger.info('Copied pnpm-workspace.yaml');
    } catch {
      // ファイルが存在しない場合はスキップ
    }
  }

  private async syncAllowBuilds({
    rootDir,
    outputDirectory,
  }: {
    rootDir: string;
    outputDirectory: string;
  }) {
    const src = resolve(rootDir, 'node_modules', '.modules.yaml');

    this.logger.info(src);

    const dest = resolve(outputDirectory, 'output', 'node_modules', '.modules.yaml');

    try {
      await stat(src);
      // 拡張子は YAML だが中身はJSONなので JSON としてパーする
      const srcContent = (await readFile(src)).toString();
      const srcJson = JSON.parse(srcContent);

      const destContent = (await readFile(dest)).toString();
      const destJson = JSON.parse(destContent);
      destJson.allowBuilds = srcJson.allowBuilds;
      destJson.ignoredBuilds = srcJson.ignoredBuilds;

      await writeFile(dest, JSON.stringify(destJson, null, 2));
    } catch (err) {
      // ファイルが存在しない場合はスキップ
      this.logger.warn('', err);
    }
  }

  protected getEntry(): string {
    return `
      import { scoreTracesWorkflow } from '@mastra/core/evals/scoreTraces';
      import { mastra } from '#mastra';
      import { createNodeServer, getToolExports } from '#server';
      import { tools } from '#tools';
      // @ts-expect-error
      await createNodeServer(mastra, { tools: getToolExports(tools) });
      const storage = mastra.getStorage();
      if (storage) {
        if (!storage.disableInit) { storage.init(); }
        mastra.__registerInternalWorkflow(scoreTracesWorkflow);
      }
    `;
  }

  override async bundle(
    entryFile: string,
    outputDirectory: string,
    { toolsPaths, projectRoot }: { toolsPaths: (string | string[])[]; projectRoot: string },
  ): Promise<void> {
    await this.copyPnpmWorkspaceYaml({
      rootDir: '../../..',
      outputDirectory,
    });
    return this._bundle(this.getEntry(), entryFile, { outputDirectory, projectRoot }, toolsPaths);
  }

  override async lint(
    entryFile: string,
    outputDirectory: string,
    toolsPaths: (string | string[])[],
  ): Promise<void> {
    await super.lint(entryFile, outputDirectory, toolsPaths);
  }
}
