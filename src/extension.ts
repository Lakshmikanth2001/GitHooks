// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { registerHookTreeDataProvider, registerMultiHookTreeDataProvider } from './hooks_data';
import { annotateFirstLine, clearLineAnnotation, initialAnnotation } from './text_decorators';
import { openHook, runHook, toggleHook, reloadHooks, hookDescription, runCurrentHook } from './hook_actions';
import { shellComand } from './launguages';
import { logger } from './logger';
import cacheInstance from './cacheContainer';

function validatePath(path: string): boolean {
	// Regular expression to match characters typically used in shell commands
	const shellCommandCharacters = /[;&|<>]/;

	// Check if the path contains any spaces or shell command characters
	if (path.includes(' ') || shellCommandCharacters.test(path)) {
		return false;
	}

	return true;
}

function annotateFirstLineOfActiveEditor(context: vscode.ExtensionContext, hooksDir: string) {
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (!editor) {
			return;
		}

		const fileLocation = editor.document.uri.fsPath;

		vscode.window.onDidChangeTextEditorSelection(
			() => {
				clearLineAnnotation(editor);
			},
			null,
			context.subscriptions,
		);

		// if file is not in hooks directory then return

		if(fileLocation && !fileLocation.startsWith(hooksDir)){
			vscode.window.onDidChangeTextEditorSelection(annotateFirstLine, null, context.subscriptions);
			return ;
		}
	});
}

/**
 * Handles configuration changes for GitHooks extension.
 * @param {vscode.ConfigurationChangeEvent} configChange - The configuration change event.
 * @param {vscode.WorkspaceFolder | undefined} workspaceFolder - The workspace folder.
 * @param {boolean} intialHooksDirectorySet - A boolean indicating whether the hooks directory has been set initially.
 * @returns {void}
 */
function configurationChangeHandler(
	configChange: vscode.ConfigurationChangeEvent,
	workspaceFolder: vscode.WorkspaceFolder | undefined,
	intialHooksDirectorySet: boolean,
): void {
	// get viewContainerDisplay for configChange
	if (configChange.affectsConfiguration('GitHooks.viewContainerDisplay')) {
		const viewContainerDisplay = vscode.workspace.getConfiguration('GitHooks')?.['viewContainerDisplay'] ?? true;
		if (viewContainerDisplay) {
			vscode.window.showInformationMessage('GitHooks are now moved to activity bar of vscode');
		} else {
			vscode.window.showInformationMessage('GitHooks are now moved to Source Control view of vscode');
		}
		const hookDir = cacheInstance.get<Array<string>>('hooksDirectoryList');

		if(hookDir && hookDir.length > 1){
			registerMultiHookTreeDataProvider(hookDir);
		}
		else if (hookDir && hookDir.length === 1) {
			registerHookTreeDataProvider(false, hookDir[0]);
		}
		else{
			vscode.window.showErrorMessage('hooksDirectory is not valid for this workspace');
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
		let hooksDir: string = vscode.workspace.getConfiguration('GitHooks', workspaceFolder)?.hooksDirectory ?? '';

		if (process.platform === 'win32') {
			hooksDir = hooksDir.replace(/^([A-Z]):\\/, (_, drive: string) => `${drive.toLowerCase()}:\\`);
		}

		if (!hooksDir) {
			vscode.window.showErrorMessage('hooksDirectory is not valid for this workspace');
			return;
		}

		// if path containes ~ then replace it with user home directory
		if (process.platform !== 'win32' && hooksDir.startsWith('~')) {
			hooksDir = hooksDir.replace(/^~/, os.homedir());
		}

		// if hooksDirectory is relative path then make it absolute path
		if (!path.isAbsolute(hooksDir)) {
			hooksDir = path.resolve(workspaceFolder.uri.fsPath, hooksDir);
		}
		logger.info(`core.hooksPath is set to ${hooksDir}`);

		vscode.commands.executeCommand('setContext', 'GitHooks.hooksDirectory', hooksDir);
		vscode.commands.executeCommand('setContext', 'GitHooks.hooksDirectoryList', [hooksDir]);

		// update hooks directory
		if (intialHooksDirectorySet) {
			return;
		}

		setHooksDir(hooksDir)
			.then(() => {
				cacheInstance.set('hooksDirectoryList', [hooksDir]);
				reloadHooks();
				vscode.window.showInformationMessage(`GitHooks directory is now set to ${hooksDir}`);
			})
			.catch((err) => {
				logger.error(`Unable to set core.hooksPath git configuration to ${hooksDir}`);
				logger.error(`${err}`);
			});
	}
	if (configChange.affectsConfiguration('GitHooks.logLevel')) {
		let changedLevel = vscode.workspace.getConfiguration('GitHooks')?.['logLevel'] ?? 'debug';
		logger.changeLevel(changedLevel);
	}
}

/**
 * Executes a shell command synchronously.
 * @param {string} command - The shell command to execute.
 * @returns {Promise<string>} - A promise that resolves to the output of the shell command.
 */
async function executeShellCommandSync(command: string): Promise<string> {
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
	try {
		return await shellComand(command, { shell });
	} catch (error) {
		logger.error(`Failed to execute shell command: ${command}. Error: ${error}`);
		throw error;
	}
}

/**
 * Gets the hooks directory.
 * @param {boolean} globalFlag - A boolean indicating whether the hooks directory is global.
 * @returns {Promise<string>} - A promise that resolves to the hooks directory.
 **/
async function getHooksDir(globalFlag?: boolean, currentWorkspaceFolder?: string): Promise<string> {
	// get all files in current workspace
	// get coreHooksPath by executing this command git config --get core.hooksPath

	// pipe error to null go to that dir and execute the git command
	let hooksPath = await executeShellCommandSync(
		`cd ${currentWorkspaceFolder} && git config --get core.hooksPath ${globalFlag ? '--global' : ''} &2>/dev/null`,
	);

	if (hooksPath && hooksPath !== '') {
		// store this in vscode setContext
		return hooksPath.replace(/\n$/, '');;
	}

	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workspaceFolder = workspaceFolders?.[0];

	hooksPath = path.join(workspaceFolder?.uri.fsPath ?? '', '.git', 'hooks');

	// in windows is path contains C:\ then replace it with c:\
	if (process.platform === 'win32') {
		hooksPath = hooksPath.replace(/^([A-Z]):\\/, (_, drive: string) => `${drive.toLowerCase()}:\\`);
	}

	return hooksPath;
}

async function getMultipleHooksDir() {
	// iterator over all workspace folders
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const hooksPathArray: Array<Promise<string>> = [];
	if (!workspaceFolders) {
		return Promise.reject('no workspace folder found');
	}

	for (const workspaceFolder of workspaceFolders) {
		if (!validatePath(workspaceFolder.uri.fsPath)) {
			logger.error(`workspace folder path ${workspaceFolder.uri.fsPath} contains invalid characters`);
			return Promise.reject(`${workspaceFolder.uri.fsPath} contains invalid characters`);
		}

		let hooksPath = executeShellCommandSync(
			`cd ${workspaceFolder.uri.fsPath} && git config --get core.hooksPath &2>/dev/null`,
		);

		hooksPathArray.push(hooksPath);
	}

	logger.info(`hooksPathArray ${hooksPathArray}`);

	return Promise.all(hooksPathArray);
}

/**
 * Sets the Git hooks directory path by configuring the `core.hooksPath` property.
 * @param hooksDirectory - The path to the Git hooks directory.
 * @returns A Promise that resolves to the path of the Git hooks directory if successful, or rejects with an error message if unsuccessful.
 */
async function setHooksDir(hooksDirectory: string): Promise<String> {
	// set git config core.hooksPath
	const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
	if (!workingDir) {
		return Promise.reject('unable to get current user workspace');
	}

	if (process.platform === 'win32') {
		hooksDirectory = hooksDirectory?.split(path.sep).join(path.posix.sep);
	}

	// check if hooks directory exists
	if (!fs.existsSync(hooksDirectory)) {
		return Promise.reject(`hooks directory ${hooksDirectory} does not exists`);
	}

	if (!fs.statSync(hooksDirectory).isDirectory()) {
		return Promise.reject(`${hooksDirectory} is not a directory`);
	}

	return await executeShellCommandSync(
		`cd ${workingDir.uri.fsPath} && git config core.hooksPath ${hooksDirectory} &2>/dev/null`,
	);
}

/**
 * Prompts the user to select a directory and returns the path of the selected directory.
 * @returns A Promise that resolves to the path of the selected directory.
 * @throws If no directory is selected.
 */
function selectHooksDir(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		vscode.window
			.showOpenDialog({
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
				openLabel: 'Select GitHooks Directory',
			})
			.then((uri) => {
				if (!uri) {
					// user can cancel the dialog without selecting any directory
					return resolve();
				}
				setHooksDir(uri[0].fsPath)
					.then(() => {
						cacheInstance.set('hooksDirectoryList', [uri[0].fsPath]);
						vscode.window.showInformationMessage(`GitHooks directory is now set to ${uri[0].fsPath}`);
						reloadHooks();
						resolve();
					})
					.catch((err) => {
						logger.error(`Unable to set core.hooksPath git configuration to ${uri[0].fsPath}`);
						logger.error(`${err}`);
						reject(err);
					});
			})
			.then(undefined, (err) => {
				reject(err);
			});
	});
}

/**
 * Creates a custom completion item for a snippet.
 * @param {string} snippetName - The name of the snippet.
 * @param {vscode.CompletionItemKind} completionKind - The kind of completion item.
 * @param {string | undefined} insertText - The text to insert for the completion item.
 * @param {string} detail - The detail information for the completion item.
 * @param {vscode.MarkdownString} documentation - The documentation for the completion item.
 * @returns {vscode.CompletionItem} - The custom completion item.
 */
function createCustomCompletionItem(
	snippetName: string,
	completionKind: vscode.CompletionItemKind,
	insertText: string | undefined,
	detail: string,
	documentation: vscode.MarkdownString,
): vscode.CompletionItem {
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

	// because tool tip needs to be updated
	const currentConfiguration = vscode.workspace.getConfiguration('GitHooks');

	currentConfiguration?.update('viewContainerDisplay', !viewContainerDisplay, vscode.ConfigurationTarget.Global);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activate

	const logLevel = vscode.workspace.getConfiguration('GitHooks')?.['logLevel'] ?? 'debug';
	logger.configure(logLevel, vscode.window.createOutputChannel('GitHooks'));
	logger.info('GitHooks extension is now active!');

	const languages: Array<String> = vscode.workspace.getConfiguration('GitHooks')?.['languageBinaries'] ?? [];

	// check if vsode contains any workspace with multiple folders
	if (!vscode.workspace.workspaceFolders) {
		logger.debug('no workspace folder found');
		return;
	}

	// take the first workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

	let intialHooksDirectorySet = true;

	let codePathsPromise = Promise.allSettled(
		languages.map((launguage) => executeShellCommandSync(`which ${launguage}`)),
	);

	codePathsPromise.then((codePromiseResults) => {
		codePromiseResults.forEach((promiseResult, index) => {
			if (promiseResult.status !== 'fulfilled') {
				logger.warn(`unable to detect ${languages[index]} launguage path`);
				return;
			}

			let codePath = promiseResult.value;
			let languageSnippetProvider = vscode.languages.registerCompletionItemProvider(
				{
					scheme: 'file',
					pattern: `**/.git/hooks/**`,
				},
				{
					provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
						const shellCompletionItem = createCustomCompletionItem(
							`shell-${languages[index]} 🐚`,
							vscode.CompletionItemKind.Text,
							codePath,
							`${languages[index]} shell path`,
							new vscode.MarkdownString(`This is a Text Snippet for getting system path of ${languages[index]}`),
						);

						if (position.line === 0) {
							const shebangCompletionItem = createCustomCompletionItem(
								`shebang-${languages[index]}`,
								vscode.CompletionItemKind.Constant,
								`#!${codePath}`,
								`${languages[index]} shebang text`,
								new vscode.MarkdownString(
									`This is a Text Snippet for getting shebang text of ${languages[index]} which can be inserted at the first line`,
								),
							);
							return [shellCompletionItem, shebangCompletionItem];
						}
						return [shellCompletionItem];
					},
				},
				`shell`,
				`shebang`,
			);
			context.subscriptions.push(languageSnippetProvider);
		});
	});

	vscode.workspace.onDidChangeConfiguration((configChange) => {
		configurationChangeHandler(configChange, workspaceFolder, intialHooksDirectorySet);
	});

	vscode.workspace.onDidOpenTextDocument((e) => {
		initialAnnotation();
	});

	if (vscode.workspace.workspaceFolders.length > 1) {
		logger.debug('multiple workspace folder found');

		cacheInstance.set('multipleWorkspace', true);

		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;

		getMultipleHooksDir().then((workspaceHookPathsArray) => {
			for (let i = 0; i < workspaceHookPathsArray.length; i++) {
				if (workspaceHookPathsArray[i] === '') {
					workspaceHookPathsArray[i] = path.join(currentWorkspaceFolders[i].uri.fsPath, '.git', 'hooks');
				}

				// remove \n from the end of the string
				workspaceHookPathsArray[i] = workspaceHookPathsArray[i].replace(/\n$/, '');

				annotateFirstLineOfActiveEditor(context, workspaceHookPathsArray[i]);
			}
			logger.debug(`hooksPathArray ${workspaceHookPathsArray}`);

			cacheInstance.set('hooksDirectoryList', workspaceHookPathsArray);

			vscode.commands.executeCommand('setContext', 'GitHooks.hooksDirectoryList', workspaceHookPathsArray);

			registerMultiHookTreeDataProvider(workspaceHookPathsArray);

		}).catch((err) => {
			logger.error(`Unable to read or locate hooksDirectory failed with following error : \n ${err}`);
		});

	}
	else{

		const currentWorkspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
		// get local hooks path
		getHooksDir(false, currentWorkspaceFolder)
			.then((hooksDir) => {

				cacheInstance.set('multipleWorkspace', false);

				annotateFirstLineOfActiveEditor(context, hooksDir);

				const currentConfiguration = vscode.workspace.getConfiguration('GitHooks', workspaceFolder);

				let currentHooksDir: string| undefined = currentConfiguration?.inspect<string>('hooksDirectory')?.workspaceValue;

				if(!currentHooksDir){
					currentHooksDir = path.join(workspaceFolder?.uri.fsPath ?? '', '.git', 'hooks');
				}
				else if (!path.isAbsolute(currentHooksDir)) {
					currentHooksDir = path.resolve(workspaceFolder?.uri.fsPath ?? '', currentHooksDir);
				}
				else if (path.isAbsolute(currentHooksDir) && currentHooksDir !== hooksDir) {
					// mismatch in hooks directory configuration

					// update the configuration with git config core.hooksPath
					logger.warn(`GitHooks: hooksDirectory configuration mismatch with git config core.hooksPath`);
					vscode.window.showWarningMessage(
						`GitHooks: hooksDirectory configuration is not matching with git config core.hooksPath. Updating the configuration with (git config core.hooksPath <your_path>)  or update hooksDirectory configuration in vscode settings`,
					);

					currentConfiguration?.update('hooksDirectory', hooksDir, vscode.ConfigurationTarget.Workspace);
				}

				//adding initial context
				vscode.commands.executeCommand('setContext', 'GitHooks.hooksDirectory', hooksDir);
				vscode.commands.executeCommand('setContext', 'GitHooks.hooksDirectoryList', [hooksDir]);

				cacheInstance.set('hooksDirectoryList', [hooksDir]);

				registerHookTreeDataProvider(false, hooksDir);
				intialHooksDirectorySet = false;
			})
			.catch((err) => {
				logger.error(`Unable to read or locate hooksDirectory failed with following error : \n ${err}`);
			});
	}


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
	context.subscriptions.push(vscode.commands.registerCommand('git-hooks.configureHooksDirectory', selectHooksDir));
	// context.subscriptions.push(datetimeSnippetProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {
	logger.debug('git hooks are deactivate');
}
