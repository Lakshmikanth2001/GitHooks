import { exec, ExecException, ExecOptions } from 'child_process';

export function shellComand(command : string, shellOptions: ExecOptions | undefined | null = {}): Promise<string>{
    return new Promise((resolve, reject) => {
        const callback = (e: ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => {
            if (e && e !== null) {
                reject(e);
            }else {
                resolve(stdout.toString());
            }
        };
        exec(command, shellOptions, callback);
    });
}