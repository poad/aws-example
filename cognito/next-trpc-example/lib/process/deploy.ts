import * as childProcess from 'child_process';
import * as fs from 'fs';

export const nextJsExport = (apiUrl: string) => {
  [`${process.cwd()}/front/.next`, `${process.cwd()}/front/out`].forEach(
    (dir) => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, {
          recursive: true,
        });
      }
    },
  );
  ['pnpm install'].forEach((cmd) => {
    childProcess.execSync(cmd, {
      cwd: `${process.cwd()}/front`,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env },
      shell: 'bash',
    });
  });

  ['pnpm build'].forEach((cmd) => {
    childProcess.execSync(cmd, {
      cwd: `${process.cwd()}/front`,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, 'NEXT_PUBLIC_API_URL': apiUrl },
      shell: 'bash',
    });
  });
};
