import * as childProcess from 'child_process';
import * as fs from 'fs';

export const nextJsExport = () => {
    [`${process.cwd()}/pages/.next`, `${process.cwd()}/pages/out`].forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmdirSync(dir, {
                recursive: true,
            });
        }
    });

    ['yarn build', 'yarn export'].forEach((cmd => {
        childProcess.execSync(cmd, {
            cwd: `${process.cwd()}/pages`,
            stdio: ['ignore', 'inherit', 'inherit'],
            env: { ...process.env },
            shell: 'bash'
        });
    }));
};
