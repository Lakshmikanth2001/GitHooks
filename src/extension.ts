// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { registerHookTreeDataProvider } from './hooks_data';
import { annotateFirstLine, clearLineAnnotation, initialAnnotation } from './text_decorators';
import { openHook, runHook, toggleHook, reloadHooks, hookDescription, runCurrentHook } from './hook_actions';
import { shellComand } from './launguages';

function setEditorLaunguage(editor: vscode.TextEditor, language: string) {
	vscode.languages.setTextDocumentLanguage(editor.document, language);
}

async function executeShellCommandSync(command: string) {
	let shell;
	switch (process.platform) {
		case 'win32':
			shell = 'C:\\Program Files\\Git\\bin\\bash';
			break;
		case 'darwin':
			shell = '/bin/bash';
			break;
		case 'linux':
			shell = '/usr/bin/bash';
			break;
		default:
			vscode.window.showErrorMessage('Unknown OS cannot detect bash shell');
			return Promise.reject('Unknown OS cannot detect bash shell');
	}
	return await shellComand(command, { shell });
}

async function getHooksDir(globalFlag?: boolean): Promise<string> {
	// get all files in current workspace
	// get coreHooksPath by executing this command git config --get core.hooksPath

	// pipe error to null
	let hooksPath = await executeShellCommandSync(`git config --get core.hooksPath ${globalFlag ? '--global' : ''} &2>/dev/null`);

	if (hooksPath && hooksPath !== '') {
		// store this in vscode setContext
		return hooksPath;
	}

	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workspaceFolder = workspaceFolders?.[0];

	hooksPath = path.join(workspaceFolder?.uri.fsPath ?? '', '.git', 'hooks');
	return hooksPath;
}

async function setHooksDir(hooksDirectory : string): Promise<String>{
	// set git config core.hooksPath
	const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
	if(!workingDir){
		return Promise.reject("unable to get current user workspace");
	}

	if(process.platform === 'win32'){
		hooksDirectory = hooksDirectory?.split(path.sep).join(path.posix.sep)
	}

	return await executeShellCommandSync(`cd ${workingDir.uri.fsPath} && git config core.hooksPath ${hooksDirectory} &2>/dev/null`)
}

function createCustomCompletionItem(
	snippetName: string,
	completionKind: vscode.CompletionItemKind,
	insertText: string | undefined,
	detail: string,
	documentation: vscode.MarkdownString,
) {
	const customCompletionItem = new vscode.CompletionItem(snippetName, completionKind);

	// provide details about the inserted snippet
	customCompletionItem.insertText = insertText;
	customCompletionItem.detail = detail;
	customCompletionItem.documentation = documentation;

	return customCompletionItem;
}

function toggleView() {
	// moving the extension from activity bar to Source Control view or vice versa
	const viewContainerDisplay = vscode.workspace.getConfiguration('GitHooks')?.['viewContainerDisplay'];
	// change configuration of vscode
	vscode.workspace
		.getConfiguration('GitHooks')
		?.update('viewContainerDisplay', !viewContainerDisplay, vscode.ConfigurationTarget.Global);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activate
	console.log('Congratulations, your extension "git-hooks" is now active!');

	const launguages: Array<String> = vscode.workspace.getConfiguration('GitHooks')?.['languageBinaries'] ?? [];
	// take the first workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

	let intialHooksDirectorySet = true;

	let codePathsPromise = Promise.allSettled(
		launguages.map((launguage) => {
			let shell;
			switch (process.platform) {
				case 'win32':
					shell = 'C:\\Program Files\\Git\\bin\\bash';
					break;
				case 'darwin':
					shell = '/bin/bash';
					break;
				case 'linux':
					shell = '/usr/bin/bash';
					break;
				default:
					vscode.window.showErrorMessage('Unknown OS cannot detect bash shell');
					return;
			}
			return shellComand(`which ${launguage}`, { shell });
		}),
	);

	const datetimeSnippetProvider = vscode.languages.registerCompletionItemProvider(
		{
			scheme: 'file',
			language: 'typescript',
		},
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const completionItem = new vscode.CompletionItem('datetime ⌚', vscode.CompletionItemKind.Text);

				// provide details about the inserted snippet
				completionItem.insertText = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
					.toISOString()
					.split('.')[0];
				completionItem.detail = 'dateTime by GitHook';
				completionItem.documentation = new vscode.MarkdownString(
					'This is a typescript snippet for getting current date',
				);
				return [completionItem];
			},
		},
		'dateTime',
	);

	codePathsPromise.then((codePromiseResults) => {
		codePromiseResults.forEach((promiseResult, index) => {
			if (promiseResult.status !== 'fulfilled') {
				console.error(`unable to detect ${launguages[index]} launguage path`);
				return;
			}

			let codePath = promiseResult.value;
			let launguageSnippetProvider = vscode.languages.registerCompletionItemProvider(
				{
					scheme: 'file',
				},
				{
					provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
						const shellCompletionItem = createCustomCompletionItem(
							`shell-${launguages[index]} 🐚`,
							vscode.CompletionItemKind.Text,
							codePath,
							`${launguages[index]} shell path`,
							new vscode.MarkdownString(`This is a Text Snippet for getting system path of ${launguages[index]}`),
						);

						const shebangCompletionItem = createCustomCompletionItem(
							`shebang-${launguages[index]}`,
							vscode.CompletionItemKind.Constant,
							`#!${codePath}`,
							`${launguages[index]} shebang text`,
							new vscode.MarkdownString(
								`This is a Text Snippet for getting shebang text of ${launguages[index]}
											which can be instered at the first line`,
							),
						);
						return [shellCompletionItem, shebangCompletionItem];
					},
				},
				`shell`,
				`shebang`,
			);
			context.subscriptions.push(launguageSnippetProvider);
		});
	});

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (!editor) {
			return;
		}

		const fileLocation = editor.document.uri.fsPath;
		if (!fileLocation || fileLocation.indexOf('hooks') === -1) {
			vscode.window.onDidChangeTextEditorSelection(
				() => {
					clearLineAnnotation(editor);
				},
				null,
				context.subscriptions,
			);
			return;
		}
		vscode.window.onDidChangeTextEditorSelection(annotateFirstLine, null, context.subscriptions);
	});
	vscode.workspace.onDidChangeConfiguration((configChange) => {
		// get viewContainerDisplay for configChange
		if (configChange.affectsConfiguration('GitHooks.viewContainerDisplay')) {
			const viewContainerDisplay = vscode.workspace.getConfiguration('GitHooks')?.['viewContainerDisplay'] ?? true;
			if (viewContainerDisplay) {
				vscode.window.showInformationMessage('GitHooks are now moved to activity bar of vscode');
			} else {
				vscode.window.showInformationMessage('GitHooks are now moved to Source Control view of vscode');
			}
			vscode.commands.executeCommand('setContext', 'GitHooks.viewContainerDisplay', viewContainerDisplay);
		}
		if (configChange.affectsConfiguration('GitHooks.hooksDirectory', workspaceFolder)) {

			// get current workspace folder
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('hooksDirectory is not valid for this workspace');
				return;
			}

			// get configuration for workspace scope
			const hooksDir = vscode.workspace.getConfiguration('GitHooks', workspaceFolder)?.hooksDirectory;

			if(!hooksDir) {
				vscode.window.showErrorMessage('hooksDirectory is not valid for this workspace');
				return;
			}

			vscode.commands.executeCommand('setContext', 'GitHooks.hooksDirectory', hooksDir);
			vscode.commands.executeCommand('setContext', 'GitHooks.hooksDirectoryList', [hooksDir]);

			// update hooks directory
			if (!intialHooksDirectorySet) {
				// refresh the Hooks Tree provider after setting the hooks directory

				setHooksDir(hooksDir).then(() => {
					registerHookTreeDataProvider();
					vscode.window.showInformationMessage(
						`GitHooks directory is now set to ${hooksDir}`,
					);
				});
			}
		}
	});

	// get local hooks path
	const hooksDir = await getHooksDir();

	vscode.workspace
	.getConfiguration('GitHooks', workspaceFolder)
	?.update('hooksDirectory', hooksDir, vscode.ConfigurationTarget.Workspace);

	registerHookTreeDataProvider();
	intialHooksDirectorySet = false;

	vscode.workspace.onDidOpenTextDocument((e) => {
		initialAnnotation();
	});
	// get workspace Extension context
	const viewContainerDisplay = vscode.workspace.getConfiguration('GitHooks')?.['viewContainerDisplay'] ?? true;
	vscode.commands.executeCommand('setContext', 'GitHooks.viewContainerDisplay', viewContainerDisplay);
	// add githooks to vscode source control view
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.runHook', runHook));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.openHook', openHook));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.runCurrentHook', runCurrentHook));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.toggleHook', toggleHook));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.reloadHooks', reloadHooks));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.hookDescription', hookDescription));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.toggleView', toggleView));
	context.subscriptions.push(datetimeSnippetProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('git hooks are deactivate');
}
