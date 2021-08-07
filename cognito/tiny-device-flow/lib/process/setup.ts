import * as childProcess from 'child_process';

export const nextJsExport = (basePath: string) => {
    childProcess.execSync('yarn build', {
        cwd: `${process.cwd()}/pages`,
        stdio: ['ignore', 'inherit', 'inherit'],
        env: { ...process.env, BASE_PATH: basePath },
        shell: 'bash'
    });
};
