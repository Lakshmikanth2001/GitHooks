import {OutputChannel, window} from 'vscode';


export const logger = new (class Logger{
    private level: string|undefined;
    private outputChannel: OutputChannel | undefined;

    get timestamp(): string {
		return `[${new Date().toISOString().replace(/T/, ' ').slice(0, -1)}]`;
	}

    changeLevel(level: string){
        // check vaiid level
        if(level !== 'debug' && level !== 'info' && level !== 'warn' && level !== 'error'){
            window.showErrorMessage(`GitHooks: Invalid log level ${level}`);
            return;
        }
        window.showInformationMessage(`GitHooks: Log level changed to ${level}`);
        this.level = level;
    }

    configure(level: string, outputChannel: OutputChannel){
        this.level = level;
        this.outputChannel = outputChannel;
    }

    debug(message: string){

        if(!this.outputChannel) return;

        if(this.level === 'debug'){
            this.outputChannel.appendLine(`${this.timestamp} [DEBUG]: ${message}`);
        }
    }

    info(message: string){
        if(!this.outputChannel) return;

        if(this.level === 'debug' || this.level === 'info'){
            this.outputChannel.appendLine(`${this.timestamp} [INFO]: ${message}`);
        }
    }

    warn(message: string){
        if(!this.outputChannel) return;

        if(this.level === 'debug' || this.level === 'info' || this.level === 'warn'){
            this.outputChannel.appendLine(`${this.timestamp} [WARN]: ${message}`);
        }
    }

    error(message: string){
        if(!this.outputChannel) return;

        if(this.level === 'debug' || this.level === 'info' || this.level === 'error'){
            this.outputChannel.appendLine(`${this.timestamp} [ERROR]: ${message}`);
        }
    }
})();