import { Hook,  registerHookTreeDataProvider, registerMultiHookTreeDataProvider} from './hooks_data';
import { shellComand } from './launguages';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from './logger';
import cacheInstance from './cacheContainer';

const POST_HOOKS = ['pre-receive', 'update', 'proc-receive', 'post-receive', 'post-update'];

async function checkGitVersion(): Promise<boolean> {
	let gitVersion: string = await shellComand('git --version');
	logger.info(`${gitVersion}`);
	const [, , version]: string[] = gitVersion.split(' ');

	const [majorRelease, subRelease, releaseFix]: string[] = version.split('.');

	let isGitHooksRunCompatabile = parseInt(majorRelease) >= 2 && (parseInt(subRelease) > 36 || (subRelease === '36' && releaseFix === '1'));

	cacheInstance.set('isGitHooksRunCompatabile', isGitHooksRunCompatabile);

	return isGitHooksRunCompatabile;
}

async function openHook(hook: Hook) {
	// for multiple workspace support
	vscode.workspace.openTextDocument(hook.path).then(doc => {
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

	let hooksDir = hook.directoryPath;

	let workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	let currentTestHookPath = path.join(hooksDir, `test_${hook.label}`);

	switch (process.platform) {
		case 'win32':
			terminal = vscode.window.createTerminal(hook.label + ' hook', 'C:\\Program Files\\Git\\bin\\bash.exe');

			// convert windows path to posix path
			hooksDir = hooksDir.split(path.sep).join(path.posix.sep);
			workspaceFolder = workspaceFolder?.split(path.sep).join(path.posix.sep);
			currentTestHookPath = currentTestHookPath.split(path.sep).join(path.posix.sep);
			break;
		case 'darwin':
			terminal = vscode.window.createTerminal(hook.label + ' hook', '/usr/local/bin/bash');
			break;
		case 'linux':
			terminal = vscode.window.createTerminal(hook.label + ' hook', '/bin/bash');
			break;
		default:
			vscode.window.showErrorMessage('Unsupported OS platform');
			return;
	}

	vscode.window.showInformationMessage('Running ' + hook.label);
	let command = 'sh';
	var data = fs.readFileSync(hook.path, 'utf8');
	const lines = data.split('\n');
	for (let line of lines) {
		if (line.startsWith('#!')) {
			if (line.startsWith('#!/usr/bin/env')) {
				command = line.substring(15);
			}
			break;
		}
	}
	//access workspace root directory
	terminal.sendText(`cd ${hooksDir}`); // cd to hooks dir
	terminal.sendText(`cat ${hook.label} > test_${hook.label}`);
	terminal.sendText(`chmod +x test_${hook.label}`);
	terminal.sendText(`cd ${workspaceFolder}`);
	terminal.sendText(`${command} ${currentTestHookPath}`);
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

	let isGitHooksRunCompatabile: boolean | undefined = cacheInstance.get<boolean>('isGitHooksRunCompatabile');

	// check if cache is empty
	if(isGitHooksRunCompatabile === undefined){
		isGitHooksRunCompatabile = await checkGitVersion();
	}

	if (!isGitHooksRunCompatabile) {
		conventionalHookRun(hook);
		return;
	}

	// git hook run command exist
	let terminal: vscode.Terminal = vscode.window.createTerminal(hook.label + ' hook');
	if(hook.directoryPath){
		terminal.sendText(`cd ${hook.directoryPath}`);
	}
	terminal.sendText(`git hook run ${hook.label}`);
	vscode.window.terminals.forEach((terminal) => {
		if (terminal.name === hook.label + ' hook') {
			terminal.show();
		} else {
			terminal.hide();
		}
	});
}

async function runCurrentHook(){
	let currentActiveFile = vscode.window.activeTextEditor?.document;
	if(!currentActiveFile) return;

	let currentHookFilePath = currentActiveFile.fileName;
	let currentHookFileName = path.basename(currentHookFilePath);

	let currentHook: Hook; // dummy hook object with empty hook path and directory path
	if (currentHookFileName.indexOf('.sample') !== -1) {
		currentHook = new Hook(currentHookFileName, 'Inactive', vscode.TreeItemCollapsibleState.None, "");
	} else {
		currentHook = new Hook(currentHookFileName, 'Active', vscode.TreeItemCollapsibleState.None, "");
	}
	currentHook.directoryPath = path.dirname(currentHookFilePath);
	runHook(currentHook);
}

function toggleHook(hook: Hook) {
	// get hooksDir from vscode context
	const hooksDir = hook.directoryPath;

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
			logger.error('Error renaming file hook file');
			logger.error(err.message);
			throw err;
		}
		// rebuild the TreeDataProvider

		// vscode.workspace.getConfiguration('GitHooks')?.update('GitHooks.hooksDirectory', hooksDir, vscode.ConfigurationTarget.Workspace);
		reloadHooks();
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

	const workSpaceFolders = vscode.workspace.workspaceFolders;

	const hookPaths = cacheInstance.get<Array<string>>('hooksDirectoryList');

	if(!hookPaths){
		vscode.window.showErrorMessage("hookPath is not cached and can not be accessed on reload action")
		return ;
	}

	if (workSpaceFolders?.length === 1) {
		// rebuild the TreeDataProvider
		registerHookTreeDataProvider(true, hookPaths[0]);
		return;
	}

	registerMultiHookTreeDataProvider(hookPaths);
}

export { openHook, runHook, toggleHook, reloadHooks, hookDescription, runCurrentHook };
