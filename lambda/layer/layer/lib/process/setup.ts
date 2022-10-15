import * as childProcess from 'child_process';
import * as fs from 'fs';

// eslint-disable-next-line import/prefer-default-export
export const compileBundles = () => {
  ['src/nodejs/']
    .forEach((f) => {
      fs.readdirSync(`${process.cwd()}/${f}`, {
        withFileTypes: true,
      }).filter((path) => path.isFile() && (path.name.endsWith('.js') || path.name.endsWith('.d.ts')))
        .map(() => `${process.cwd()}/${f}/path.name`)
        .forEach((file) => {
          if (fs.existsSync(file)) {
            fs.rmSync(file, {
              recursive: true,
            });
          }
        });
      ['yarn install'].forEach(((cmd) => {
        childProcess.execSync(cmd, {
          cwd: `${process.cwd()}/${f}/`,
          stdio: ['ignore', 'inherit', 'inherit'],
          env: { ...process.env },
          shell: 'bash',
        });
      }));
    });
  childProcess.execSync('yarn build', {
    cwd: `${process.cwd()}`,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env },
    shell: 'bash',
  });
};
