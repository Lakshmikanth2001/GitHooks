import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import * as path from 'path';
import { ViewBadge } from 'vscode';
import { logger } from './logger';

let gitHookScmTreeViewRendered = false;
let gitHookContainerTreeViewRendered = false;
let gitHooksProviderCache: GitHooksProvider | null = null;

export class Hook extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		status: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		directoryPath: string,
	) {
		super(label, collapsibleState);
		this.tooltip = label + '\n' + status;
		this.directoryPath = directoryPath;
		this.path = path.join(directoryPath, label);
	}

	//vscode Theme color green
	iconPath: vscode.ThemeIcon = new vscode.ThemeIcon('circle-large-outline');
	directoryPath: string;
	path: string;
	contextValue?: string | undefined = 'hook';
}

function getMultiHookDirectories(): string[] {
	const hookDirectories =  vscode.workspace.workspaceFolders?.map((workspaceFolder) => {
		let currentHooksDir = vscode.workspace.getConfiguration('GitHooks', workspaceFolder)?.['hooksDirectory'];

		currentHooksDir = currentHooksDir.replace(/^~/, os.homedir());

		if (!path.isAbsolute(currentHooksDir)) {
			currentHooksDir = path.resolve(workspaceFolder?.uri.fsPath ?? '', currentHooksDir);
		}
		return currentHooksDir;
	})??[];

	if(hookDirectories.length === 0){
		logger.error("No valid git hook directories found");
		return [];
	}
	return hookDirectories;
}

export function validViewBadgeVersion(): boolean {
	const initialValidVersion = '1.72.0'; // version where `viewBadge` feature was introduced
	const baseRelease = initialValidVersion.split('.').map(Number);
	const currentRelease = vscode.version.split('.').map(Number);
	for (let index = 0; index < baseRelease.length; index++) {
		if (baseRelease[index] < currentRelease[index]) {
			return true;
		} else if (baseRelease[index] > currentRelease[index]) {
			return false;
		}
	}
	return true;
}

function getHook(gitHooksDirectoryFiles: string[], predefinedHooksMap: Map<String, boolean>, hookDirectory: string): Hook[] {

	return gitHooksDirectoryFiles.map((hookName) => {
		if (!predefinedHooksMap.get(hookName.replace('.sample', ''))) {
			const hookData = new Hook(hookName, 'Not a predefined hook', vscode.TreeItemCollapsibleState.None, hookDirectory);
			hookData.iconPath = new vscode.ThemeIcon('testing-error-icon');
			hookData.contextValue = 'notPredefined';
			return hookData;
		}


		const isActive = hookName.indexOf('.sample') === -1;
		const hookStatus = isActive ? 'Active' : 'Inactive';
		const hookData = new Hook(hookName, hookStatus, vscode.TreeItemCollapsibleState.None, hookDirectory);
		if (isActive) {
			hookData.iconPath = new vscode.ThemeIcon('testing-passed-icon', new vscode.ThemeColor('#RRGGBBAA'));
		} else {
			hookData.iconPath = new vscode.ThemeIcon('circle-large-outline');
		}
		return hookData;
	});
}

export function registerMultiHookTreeDataProvider(hookDirectories: string[]) {
	const workingDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workingDir) {
		vscode.window.showInformationMessage('Empty workspace can not have git hooks');
		return;
	}

	// for reload action
	if(hookDirectories.length === 0){
		hookDirectories = getMultiHookDirectories();
	}

	const viewContainerDisplay = vscode.workspace.getConfiguration('GitHooks')?.['viewContainerDisplay'] ?? true;

	let coreHooksProvider: MultiGitHooksProvider = new MultiGitHooksProvider(hookDirectories);
	if(!viewContainerDisplay){
		const scmHookTreeView =  vscode.window.createTreeView('git_hooks_scm', {
			treeDataProvider: coreHooksProvider,
		});

		scmHookTreeView.title  = `GitHooks (${coreHooksProvider.totalActiveHookCount})`;
		scmHookTreeView.description = hookDirectories.join(', ');

		scmHookTreeView.badge = undefined;
	}
	const coreHookTreeView = vscode.window.createTreeView('git_hooks_view', {
		treeDataProvider: coreHooksProvider,
	});

	if (validViewBadgeVersion()) {
		const activeHookCount = coreHooksProvider.totalActiveHookCount;
		const iconBadge: ViewBadge = {
			value: activeHookCount,
			tooltip: `${activeHookCount} ActiveHook${activeHookCount === 1 ? '' : 's'}`,
		};
		coreHookTreeView.badge = activeHookCount > 0 ? iconBadge : { value: 0, tooltip: '' };
	}
}

export function registerHookTreeDataProvider(reloadFlag: boolean = false) {
	const workSpaceFolder = vscode.workspace.workspaceFolders;

	if(workSpaceFolder?.length??0 > 0){
		return registerMultiHookTreeDataProvider([]);
	}

	const workingDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workingDir) {
		vscode.window.showInformationMessage('Empty workspace can not have git hooks');
		return;
	}

	const viewContainerDisplay = vscode.workspace.getConfiguration('GitHooks')?.['viewContainerDisplay'] ?? true;

	if (!reloadFlag && gitHookScmTreeViewRendered && gitHookContainerTreeViewRendered) {
		if (gitHooksProviderCache === null) {
			return;
		}

		if (viewContainerDisplay) {
			const hookView = vscode.window.createTreeView('git_hooks_view', {
				treeDataProvider: gitHooksProviderCache,
			});
			hookView.badge = { value: gitHooksProviderCache.activeHookCount, tooltip: '' };
		} else {
			vscode.window.createTreeView('git_hooks_view', {
				treeDataProvider: gitHooksProviderCache,
			}).badge = undefined;
		}
		return;
	}

	// if scm view
	if (!viewContainerDisplay) {
		let scmHookProvider = new GitHooksProvider(workingDir, true);
		const gitHooksSCMView = vscode.window.createTreeView('git_hooks_scm', {
			treeDataProvider: scmHookProvider,
		});
		gitHooksSCMView.title = `GitHooks (${scmHookProvider.activeHookCount})`;
		gitHooksSCMView.description = getMultiHookDirectories()[0];
		// clear the badge for scm
		// scmHookProvider.badge = { value: 0, tooltip: '' };
		gitHookScmTreeViewRendered = true;

		if (gitHooksProviderCache) {
			vscode.window.createTreeView('git_hooks_view', {
				treeDataProvider: gitHooksProviderCache,
			}).badge = undefined;
		} else {
			const emptyTreeDataProvider = {
				getChildren(element?: Hook): Hook[] | Thenable<Hook[]> {
					return [];
				},
				getTreeItem(element: Hook): vscode.TreeItem | Thenable<vscode.TreeItem> {
					return element;
				},
			};
			vscode.window.createTreeView('git_hooks_view', {
				treeDataProvider: emptyTreeDataProvider,
			}).badge = undefined;
		}

		return;
	}

	const coreHooksProvider = new GitHooksProvider(workingDir, false);
	const coreHookTreeView = vscode.window.createTreeView('git_hooks_view', {
		treeDataProvider: coreHooksProvider,
	});

	if (validViewBadgeVersion()) {
		const activeHookCount = coreHooksProvider.activeHookCount;
		const iconBadge: ViewBadge = {
			value: activeHookCount,
			tooltip: `${activeHookCount} ActiveHook${activeHookCount === 1 ? '' : 's'}`,
		};
		coreHookTreeView.badge = activeHookCount > 0 ? iconBadge : { value: 0, tooltip: '' };
	}
	gitHooksProviderCache = coreHooksProvider;
}

export class GitHooksProvider implements vscode.TreeDataProvider<Hook> {
	public activeHookCount: number = 0;
	private gitHooksDir: string;
	private gitHooksDirectoryFiles: string[] | undefined;
	private predefinedHooksMap: Map<String, boolean>;

	// get extension context
	constructor(private workspaceRoot: string, private isFromScm: boolean) {
		vscode.workspace.onDidChangeWorkspaceFolders((e) => this.onActivateWorkspaceChanged(e));
		this.onActivateWorkspaceChanged(undefined);
		this.gitHooksDir = getMultiHookDirectories()[0];

		const predefinedHooks: string[] = vscode.workspace.getConfiguration('GitHooks')?.['predefinedHooks'] ?? [];

		this.predefinedHooksMap = new Map(predefinedHooks.map((hook) => [hook, true]));

		if (!fs.existsSync(this.gitHooksDir)) {
			logger.error('Unable to read hooks directory : ' + this.gitHooksDir);
			return;
		}

		this.gitHooksDirectoryFiles = fs.readdirSync(this.gitHooksDir).map((hook) => {
			if (hook.indexOf('.sample') === -1 && this.predefinedHooksMap.get(hook.replace('.sample', ''))) {
				this.activeHookCount++;
			}
			return hook;
		});
		logger.debug('Active Hooks Count : ' + this.activeHookCount.toString());
	}

	private onActivateWorkspaceChanged(e: vscode.WorkspaceFoldersChangeEvent | undefined): void {
		if (e) {
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', this.workSpaceHasGit(e.added[0].uri.fsPath));
			return;
		}
		const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
		if (workingDir) {
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', this.workSpaceHasGit(workingDir.uri.fsPath));
		} else {
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', false);
		}
	}

	getTreeItem(element: Hook): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Hook): Thenable<Hook[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('Empty workspace can not have git hooks');
			return Promise.resolve([]);
		} else if (!fs.existsSync(path.join(this.workspaceRoot, '.git'))) {
			vscode.window.showInformationMessage('No git repository in workspace');
			return Promise.resolve([]);
		}

		const hooksPath = this.gitHooksDir;

		if (this.isFromScm || element) {
			// no need of root node in scm view or if element is present
			return Promise.resolve(this.getHooks(hooksPath));
		}

		// for the root element with label githooks on the top
		let hook = new Hook('Hooks', '', vscode.TreeItemCollapsibleState.Expanded, "");
		hook.contextValue = 'root';
		const currentHookDirectories = getMultiHookDirectories();
		hook.description = currentHookDirectories[0];
		hook.tooltip = 'Hooks Directory \n' + currentHookDirectories[0];

		if (this.activeHookCount > 0) {
			hook.iconPath = new vscode.ThemeIcon('testing-passed-icon', new vscode.ThemeColor('#RRGGBBAA'));
		}

		return Promise.resolve([hook]);
	}

	private getHooks(hooksPath: string): Hook[] {
		if (!fs.existsSync(hooksPath) || this.gitHooksDirectoryFiles === undefined) {
			vscode.window.showInformationMessage('No hooks in empty workspace');
			return [];
		}

		if (!this.gitHooksDirectoryFiles.length) {
			return [];
		}

		return getHook(this.gitHooksDirectoryFiles, this.predefinedHooksMap, this.gitHooksDir);
	}
	private workSpaceHasGit(workingDir: string | undefined): Boolean {
		if (!workingDir) {
			return false;
		}

		// check whether git_dir exists or not
		let gitDir = path.join(workingDir, '.git');
		return fs.existsSync(gitDir);
	}
}


export class MultiGitHooksProvider implements vscode.TreeDataProvider<Hook> {
	private predefinedHooksMap: Map<String, boolean>;
	private activeHookCountMap: Map<string, number> = new Map<string, number>();
	public totalActiveHookCount: number = 0;
	private hookDirectoryMap: Map<string, string[]> = new Map<string, string[]>();
	constructor(private hookDirectories: string[]) {
		this.hookDirectories = hookDirectories;

		this.hookDirectories = this.hookDirectories.filter(hookDir => fs.existsSync(hookDir));

		if(this.hookDirectories.length === 0){
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', false);
			throw new Error("No valid git hook directories found");
		}

		vscode.commands.executeCommand('setContext', 'workSpaceHasGit', true);

		const predefinedHooks: string[] = vscode.workspace.getConfiguration('GitHooks')?.['predefinedHooks'] ?? [];

		this.predefinedHooksMap = new Map(predefinedHooks.map((hook) => [hook, true]));

		if(this.hookDirectories.length === 0){
			vscode.window.showInformationMessage('Empty workspace can not have git hooks');
			return;
		}

		for(let hookDir of hookDirectories){
			if (!fs.existsSync(hookDir)) {
				logger.error('Unable to read hooks directory : ' + hookDir);
				return;
			}
			let currentActiveCount = 0;

			let gitHooksDirectoryFiles = fs.readdirSync(hookDir).map((hook) => {
				if (hook.indexOf('.sample') === -1 && this.predefinedHooksMap.get(hook.replace('.sample', ''))) {
					currentActiveCount++;
				}
				return hook;
			});

			this.hookDirectoryMap.set(hookDir, gitHooksDirectoryFiles);

			this.activeHookCountMap.set(hookDir, currentActiveCount);

			this.totalActiveHookCount += currentActiveCount;
		}
		logger.debug('Active Hooks Count : ' + this.totalActiveHookCount.toString());
	}

	getTreeItem(element: Hook): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Hook | undefined): vscode.ProviderResult<Hook[]> {
		if (element) {
			return Promise.resolve(this.getHooks(element.directoryPath??''));
		}
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;

		// for the root element with label githooks on the top

		let rootHooks = this.hookDirectories.map((hookDir, index) => {

			let rootDir = currentWorkspaceFolders?.[index]?.uri.fsPath??'';
			let dirName = rootDir.split(path.sep)?.pop()??'DIR_NOT_FOUND';

			let hook = new Hook(dirName, '', vscode.TreeItemCollapsibleState.Expanded, '');
			hook.contextValue = 'multiRoot';

			// extract the directory name from the path

			hook.description = dirName;
			hook.directoryPath = hookDir;
			hook.tooltip = `${dirName} \n` + hookDir;
			return hook;
		});


		return Promise.resolve(rootHooks);
	}

	private getHooks(hooksDirectory: string): Hook[] {

		if (!this.hookDirectoryMap.has(hooksDirectory)) {
			return [];
		}

		const gitHooksDirectoryFiles = this.hookDirectoryMap.get(hooksDirectory) || [];

		return getHook(gitHooksDirectoryFiles, this.predefinedHooksMap, hooksDirectory);
	}
}