// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { regesterHookTreeDataProvider } from './hooks_data';
import { annotateFirstLine, clearLineAnnotation, initialAnnotation } from './text_decorators';
import { openHook, runHook, toggleHook, reloadHooks, hookDescription, runCurrentHook } from './hook_actions';
import { shellComand } from './launguages';

function setEditorLaunguage(editor: vscode.TextEditor, language: string) {
	vscode.languages.setTextDocumentLanguage(editor.document, language);
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
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activate
	console.log('Congratulations, your extension "git-hooks" is now active!');

	const launguages = ['python', 'java', 'node', 'cpp', 'bash'];

	let codePathsPromise = Promise.all(
		launguages.map((launguage) => {
			if (process.platform === 'win32') {
				return shellComand(`which ${launguage}`, {
					shell: 'C:\\Program Files\\Git\\bin\\bash',
				});
			} else if (process.platform === 'darwin') {
				return shellComand(`which ${launguage}`, {
					shell: '/bin/bash',
				});
			} else if (process.platform === 'linux') {
				return shellComand(`which ${launguage}`, {
					shell: '/usr/bin/bash',
				});
			} else {
				vscode.window.showErrorMessage('Unknow OS cannot detect bash shell');
			}
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

	codePathsPromise
		.then((codePath) => {
			codePath.map((codePath, index) => {
				// insert a user snippet with prefix ${launguage[index]} and body ${codePath}

				//universal for all the files
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
								new vscode.MarkdownString(
									`This is a Text Snippet for getting system path of ${launguages[index]}`,
								)
							);

							const shebangCompletionItem = createCustomCompletionItem(
								`shebang-${launguages[index]}`,
								vscode.CompletionItemKind.Constant,
								'#!' + codePath,
								`${launguages[index]} shebang text`,
								new vscode.MarkdownString(
									`This is a Text Snippet for getting shebang text of ${launguages[index]}
									which can be instered at the first line`,
								)
							);
							return [shellCompletionItem, shebangCompletionItem];
						},
					},
					`shell`, `shebang`,
				);
				context.subscriptions.push(launguageSnippetProvider);
			});
		})
		.catch(() => {
			console.error('unable to detect bash shell to detect launguage shells');
		});

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor) {
			const fileLocation = editor?.document.uri.fsPath;
			if (fileLocation && fileLocation.indexOf('hooks') !== -1) {
				vscode.window.onDidChangeTextEditorSelection(annotateFirstLine, null, context.subscriptions);
			} else {
				vscode.window.onDidChangeTextEditorSelection(
					(e) => {
						clearLineAnnotation(editor);
					},
					null,
					context.subscriptions,
				);
			}
		}
	});
	vscode.workspace.onDidChangeConfiguration((configChange) => {
		// get viewContainerDisplay fro configChange
		if (configChange.affectsConfiguration('GitHooks.viewContainerDisplay')) {
			const viewContainerDisplay = vscode.workspace.getConfiguration('GitHooks')?.['viewContainerDisplay'] ?? true;
			if (viewContainerDisplay) {
				vscode.window.showInformationMessage('GitHooks are now moved to activity bar of vscode');
			} else {
				vscode.window.showInformationMessage('GitHooks are now moved to Source Control view of vscode');
			}
			vscode.commands.executeCommand('setContext', 'GitHooks.viewContainerDisplay', viewContainerDisplay);
		}
	});
	regesterHookTreeDataProvider();

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
