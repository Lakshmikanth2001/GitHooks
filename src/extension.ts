// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GitHooksProvider } from './hooks_data';
import { annotateFirstLine } from './text_decorators';
import * as process from 'process';

function getHooksDir(): string {
	// get all files in current workspace
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workspaceFolder = workspaceFolders?.[0];

	// get all files in .git folder
	return path.join(workspaceFolder?.uri.fsPath ?? '', '.git', 'hooks');
}

function setEditorLaunguage(editor: vscode.TextEditor, language: string) {
	vscode.languages.setTextDocumentLanguage(editor.document, language);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "git-hooks" is now active!');

	vscode.window.onDidChangeTextEditorSelection(annotateFirstLine, null, context.subscriptions);

	const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
	if (workingDir) {
		vscode.window.registerTreeDataProvider('git_hooks_view', new GitHooksProvider(workingDir.uri.fsPath));
	}
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let openHooks = vscode.commands.registerCommand('git-hooks.openHook', (hook) => {
		const gitHookDir = getHooksDir();
		vscode.workspace.openTextDocument(path.join(gitHookDir, hook.label)).then((doc) => {
			vscode.window.showTextDocument(doc).then((editor) => {
				// create a vscode snippet
				// set a vscode decorator
				let hookLaunguage = editor.document.getText(
					new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 0)),
				);
				vscode.window.showInformationMessage(`Hook ${hook.label} is now open in ${hookLaunguage}`);
			});
		});
	});

	let runHook = vscode.commands.registerCommand('git-hooks.runHook', (hook) => {
		let terminal: vscode.Terminal;

		if (process.platform === 'win32') {
			terminal = vscode.window.createTerminal('git-hooks', 'C:\\Program Files\\Git\\bin\\bash.exe');
		} else if (process.platform === 'darwin') {
			terminal = vscode.window.createTerminal('git-hooks', '/usr/local/bin/bash');
		} else {
			terminal = vscode.window.createTerminal('git-hooks', '/bin/bash');
		}
		vscode.window.showInformationMessage('Running ' + hook.label);

		terminal.sendText(`cd .git && cd hooks`);
		terminal.sendText(`cat ${hook.label} > ${hook.label}.sh`);
		terminal.sendText(`chmod +x ${hook.label}.sh`);
		terminal.sendText(`bash ${hook.label}.sh`);
		terminal.sendText(`rm ${hook.label}.sh`);

		vscode.window.terminals.forEach((terminal) => {
			if (terminal.name === 'git-hooks') {
				terminal.show();
			} else {
				terminal.hide();
			}
		});
	});

	let toggleHook = vscode.commands.registerCommand('git-hooks.toggleHook', (hook) => {
		if (workingDir) {
			const rootDir = workingDir.uri.fsPath;
			const hooksDir = rootDir + '/.git/hooks';

			let oldPath = '';
			let newPath = '';

			if (hook.label.indexOf('.sample') !== -1) {
				oldPath = path.join(hooksDir, hook.label);
				newPath = path.join(hooksDir, hook.label.replace('.sample', ''));
			} else {
				oldPath = path.join(hooksDir, hook.label);
				newPath = path.join(hooksDir, hook.label + '.sample');
			}

			fs.rename(oldPath, newPath, (err) => {
				if (err) {
					throw err;
				}
				vscode.window.registerTreeDataProvider('git_hooks_view', new GitHooksProvider(workingDir.uri.fsPath));
			});
		}
	});

	let reloadHooks = vscode.commands.registerCommand('git-hooks.reloadHooks', () => {
		if (workingDir) {
			vscode.window.registerTreeDataProvider('git_hooks_view', new GitHooksProvider(workingDir.uri.fsPath));
		}
	});

	let hookDescription = vscode.commands.registerCommand('git-hooks.hookDescription', (hook) => {
		vscode.window.showInformationMessage(hook.label);
	});

	context.subscriptions.push(openHooks, runHook, toggleHook, reloadHooks, hookDescription);
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('git hooks are deactivate');
}
