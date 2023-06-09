import * as childProcess from 'child_process';
import * as fs from 'fs';

// eslint-disable-next-line import/prefer-default-export
export const nextJsExport = () => {
  [`${process.cwd()}/pages/.next`, `${process.cwd()}/pages/out`].forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, {
        recursive: true,
      });
    }
  });

  ['pnpm build'].forEach(((cmd) => {
    childProcess.execSync(cmd, {
      cwd: `${process.cwd()}/pages`,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env },
      shell: 'bash',
    });
  }));
  fs.copyFileSync(`${process.cwd()}/pages/src/public/favicon.ico`, `${process.cwd()}/pages/out/favicon.ico`);
};
