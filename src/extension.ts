// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path'
import { GitHooksProvider } from './hooks_data';
import * as process from 'process';

function getHooksDir(): string {
	// get all files in current workspace
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workspaceFolder = workspaceFolders?.[0];

	// get all files in .git folder
	return path.join(workspaceFolder?.uri.fsPath ?? "", '.git', 'hooks');
}

function isActiveHook(hook: string) {
	return hook.indexOf('.sample') === -1;
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {



	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "git-hooks" is now active!');

	const working_dir = vscode.workspace.workspaceFolders?.[0] ?? '';

	if (working_dir) {
		vscode.window.registerTreeDataProvider(
			'git_hooks_view',
			new GitHooksProvider(working_dir.uri.fsPath)
		)
	}



	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let open_hooks = vscode.commands.registerCommand('git-hooks.open_hook', (hook) => {

		const gitHookDir = getHooksDir();
		const git_hooks: string[] = fs.readdirSync(gitHookDir);

		git_hooks.forEach(git_hook => {
			if (git_hook.indexOf('.sample')) {
				// inactive hooks
			}
			else {
				// active hooks
				console.log(git_hook);
			}
		});

		vscode.workspace.openTextDocument(path.join(gitHookDir, hook.label)).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	})

	let run_hook = vscode.commands.registerCommand('git-hooks.run_hook', (hook) => {

		let terminal: vscode.Terminal;

		if (process.platform === 'win32') {
			terminal = vscode.window.createTerminal('git-hooks', 'C:\\Program Files\\Git\\bin\\bash.exe');
		}
		else if (process.platform === 'darwin') {
			terminal = vscode.window.createTerminal('git-hooks', '/usr/local/bin/bash');
		}
		else {
			terminal = vscode.window.createTerminal('git-hooks', '/bin/bash');
		}
		vscode.window.showInformationMessage('Running ' + hook.label);

		terminal.sendText(`cd .git && cd hooks`);
		terminal.sendText(`cat ${hook.label} > ${hook.label}.sh`);
		terminal.sendText(`chmod +x ${hook.label}.sh`);
		terminal.sendText(`bash ${hook.label}.sh`);
		terminal.sendText(`rm ${hook.label}.sh`);

		vscode.window.terminals.forEach(terminal => {
			if (terminal.name === 'git-hooks') {
				terminal.show();
			}
			else {
				terminal.hide();
			}
		});

	});

	let toggle_hook = vscode.commands.registerCommand('git-hooks.toggle_hook', (hook) => {

		if (working_dir) {
			const root_dir = working_dir.uri.fsPath;
			const git_hooks_dir = root_dir + '/.git/hooks';

			let old_path = ""
			let new_path = ""

			if (hook.label.indexOf('.sample') !== -1) {
				old_path = path.join(git_hooks_dir, hook.label);
				new_path = path.join(git_hooks_dir, hook.label.replace('.sample', ''));
			}
			else {
				old_path = path.join(git_hooks_dir, hook.label);
				new_path = path.join(git_hooks_dir, hook.label + '.sample');
			}

			fs.rename(old_path, new_path, (err) => {
				if (err) throw err;
				vscode.window.registerTreeDataProvider(
					'git_hooks_view',
					new GitHooksProvider(working_dir.uri.fsPath)
				)
			})
		}


	})

	let reload_hooks = vscode.commands.registerCommand('git-hooks.reload_hooks', () => {4
		if(working_dir) {
			vscode.window.registerTreeDataProvider(
				'git_hooks_view',
				new GitHooksProvider(working_dir.uri.fsPath)
			)
		}
	})

	context.subscriptions.push(open_hooks, run_hook, toggle_hook, reload_hooks);
}



// this method is called when your extension is deactivated
export function deactivate() {
	console.log('git hooks are deactivate');
}
