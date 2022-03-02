// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { regesterHookTreeDataProvider } from './hooks_data';
import { annotateFirstLine, clearLineAnnotation, initialAnnotation } from './text_decorators';
import { openHook, runHook, toggleHook, reloadHooks, hookDescription } from './hook_actions';

function setEditorLaunguage(editor: vscode.TextEditor, language: string) {
	vscode.languages.setTextDocumentLanguage(editor.document, language);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "git-hooks" is now active!');
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
	
	regesterHookTreeDataProvider();

	vscode.workspace.onDidOpenTextDocument((e) => {
		initialAnnotation();
	});
	
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.runHook', runHook));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.openHook', openHook));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.toggleHook', toggleHook));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.reloadHooks', reloadHooks));
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.hookDescription', hookDescription));
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('git hooks are deactivate');
}
