import { Hook, GitHooksProvider } from './hooks_data';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

function getHooksDir(): string {
	// get all files in current workspace
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workspaceFolder = workspaceFolders?.[0];

	// get all files in .git folder
	return path.join(workspaceFolder?.uri.fsPath ?? '', '.git', 'hooks');
}

function openHook(hook: Hook) {
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
}

function runHook(hook: Hook) {
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
}

function toggleHook(hook: Hook) {
	const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';

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
}

function hookDescription(hook: Hook) {
	vscode.window.showInformationMessage(hook.label);
}

function reloadHooks() {
	const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
	if (workingDir) {
		vscode.window.registerTreeDataProvider('git_hooks_view', new GitHooksProvider(workingDir.uri.fsPath));
	}
}

export { openHook, runHook, toggleHook, reloadHooks, hookDescription };
