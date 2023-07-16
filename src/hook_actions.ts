import { Hook,  regesterHookTreeDataProvider} from './hooks_data';
import { shellComand } from './launguages';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

const POST_HOOKS = ['pre-receive', 'update', 'proc-receive', 'post-receive', 'post-update'];

let isGitHooksRunCompatabile: boolean | null = null;

async function checkGitVersion(): Promise<boolean> {
	let gitVersion: string = await shellComand('git --version');
	const [, , version]: string[] = gitVersion.split(' ');

	const [majorRelease, subRelease, releaseFix]: string[] = version.split('.');

	isGitHooksRunCompatabile = parseInt(majorRelease) >= 2 && (parseInt(subRelease) > 36 || (subRelease === '36' && releaseFix === '1'));

	return isGitHooksRunCompatabile;
}

async function openHook(hook: Hook) {
	const gitHookDir = vscode.workspace.getConfiguration('GitHooks')?.['hooksDirectory'];
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

function conventionalHookRun(hook: Hook) {
	let terminal: vscode.Terminal;

	// get vscode context
	let hooksPath = vscode.workspace.getConfiguration('GitHooks')?.['hooksDirectory'] ?? "";
	let workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	let currentTestHookPath = path.join(hooksPath, `test_${hook.label}`);

	if (process.platform === 'win32') {
		terminal = vscode.window.createTerminal(hook.label + ' hook', 'C:\\Program Files\\Git\\bin\\bash.exe');

		// convert windows path to posix path
		hooksPath = hooksPath.split(path.sep).join(path.posix.sep);
		workspaceFolder = workspaceFolder?.split(path.sep).join(path.posix.sep);
		currentTestHookPath = currentTestHookPath.split(path.sep).join(path.posix.sep);
	} else if (process.platform === 'darwin') {
		terminal = vscode.window.createTerminal(hook.label + ' hook', '/usr/local/bin/bash');
	} else {
		terminal = vscode.window.createTerminal(hook.label + ' hook', '/bin/bash');
	}
	vscode.window.showInformationMessage('Running ' + hook.label);

	//access workspace root directory
	terminal.sendText(`cd ${hooksPath}`); // cd to hooks dir
	terminal.sendText(`cat ${hook.label} > test_${hook.label}`);
	terminal.sendText(`chmod +x test_${hook.label}`);
	terminal.sendText(`cd ${workspaceFolder}`);
	terminal.sendText(`sh ${currentTestHookPath}`);
	terminal.sendText(`rm ${currentTestHookPath}`);

	vscode.window.terminals.forEach((terminal) => {
		if (terminal.name === hook.label + ' hook') {
			terminal.show();
		} else {
			terminal.hide();
		}
	});
}

async function runHook(hook: Hook) {
	let terminal: vscode.Terminal;

	if(isGitHooksRunCompatabile === null){
		isGitHooksRunCompatabile = await checkGitVersion();
	}

	if (isGitHooksRunCompatabile) {
		// git hook run command exist
		terminal = vscode.window.createTerminal(hook.label + ' hook');
		terminal.sendText(`git hook run ${hook.label}`);
		vscode.window.terminals.forEach((terminal) => {
			if (terminal.name === hook.label + ' hook') {
				terminal.show();
			} else {
				terminal.hide();
			}
		});
	} else {
		conventionalHookRun(hook);
	}
}

async function runCurrentHook(){
	let currentActiveFile = vscode.window.activeTextEditor?.document??null;
	let hookStatus = null;
	if(currentActiveFile){
		let currentHookFilePath = currentActiveFile.fileName;
		let currentHookFileName = path.basename(currentHookFilePath);

		if (currentHookFileName.indexOf('.sample') !== -1) {
			hookStatus = 'Inactive';
		} else {
			hookStatus = 'Active';
		}
		let currentHook = new Hook(currentHookFileName, hookStatus, vscode.TreeItemCollapsibleState.None);
		runHook(currentHook);
	}
}

function toggleHook(hook: Hook) {
	// get hooksDir from vscode context
	const hooksDir = vscode.workspace.getConfiguration('GitHooks')?.['hooksDirectory'] ?? "";

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
		// rebuild the TreeDataProvider

		vscode.workspace.getConfiguration('GitHooks')?.update('GitHooks.hooksDirectory', hooksDir, vscode.ConfigurationTarget.Workspace);

		regesterHookTreeDataProvider();
		// vscode.window.registerTreeDataProvider('git_hooks_view', new GitHooksProvider(workingDir.uri.fsPath, false));
		// vscode.window.registerTreeDataProvider('git_hooks_scm', new GitHooksProvider(workingDir.uri.fsPath, true));
	});

	// close a particular file from window
	vscode.window.visibleTextEditors.forEach(async (editor) => {
		if (editor.document.uri.fsPath === oldPath) {
			// close the current
			// select an editor
			await vscode.window.showTextDocument(editor.document);
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		}
	});
}

function hookDescription(hook: Hook) {
	let hookLabel = hook.label.replace('.sample', '');

	if (POST_HOOKS.indexOf(hookLabel) !== -1) {
		vscode.env.openExternal(vscode.Uri.parse(`https://git-scm.com/docs/githooks#${hookLabel}`));
	} else {
		hookLabel = hookLabel.replace(/-/g, '_');
		vscode.env.openExternal(vscode.Uri.parse(`https://git-scm.com/docs/githooks#_${hookLabel}`));
	}
}

function reloadHooks() {
	const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
	if (workingDir) {
		// rebuild the TreeDataProvider
		regesterHookTreeDataProvider();
	}
}

export { openHook, runHook, toggleHook, reloadHooks, hookDescription, runCurrentHook };