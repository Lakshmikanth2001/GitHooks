import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ViewBadge } from 'vscode';

export class Hook extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		private status: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
	) {
		super(label, collapsibleState);
		this.tooltip = label + '\n' + status;
	}

	//vscode Theme color green
	iconPath: vscode.ThemeIcon = new vscode.ThemeIcon('circle-large-outline');
	contextValue?: string | undefined = 'hook';
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

export function registerHookTreeDataProvider() {
	const workingDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workingDir) {
		vscode.window.showInformationMessage('Empty workspace can not have git hooks');
		return;
	}

	const coreHooksProvider = new GitHooksProvider(workingDir, false);
	const coreHookView = vscode.window.createTreeView('git_hooks_view', {
		treeDataProvider: coreHooksProvider,
	});
	vscode.window.createTreeView('git_hooks_scm', {
		treeDataProvider: new GitHooksProvider(workingDir, true),
	});

	if (validViewBadgeVersion()) {
		const activeHookCount = coreHooksProvider.getActiveHooks();
		const iconBadge: ViewBadge = {
			value: activeHookCount,
			tooltip: `${activeHookCount} ActiveHooks`,
		};
		coreHookView.badge = activeHookCount > 0 ? iconBadge : { value: 0, tooltip: '' };
	}
}
export class GitHooksProvider implements vscode.TreeDataProvider<Hook> {
	public activeHookCount: number = 0;
	public gitHooksDir: string;
	// get extension context
	constructor(private workspaceRoot: string, private isFromScm: boolean) {
		vscode.workspace.onDidChangeWorkspaceFolders((e) => this.onActivateWorkspaceChanged(e));
		this.onActivateWorkspaceChanged(undefined);
		this.gitHooksDir = vscode.workspace.getConfiguration('GitHooks')?.get('hooksDirectory') ?? '';
	}

	private onActivateWorkspaceChanged(e: vscode.WorkspaceFoldersChangeEvent | undefined): void {
		if (e) {
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', this.workSpaceHasGit(e.added[0].uri.fsPath));
			return ;
		}
		const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
		if (workingDir) {
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', this.workSpaceHasGit(workingDir.uri.fsPath));
		} else {
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', false);
		}
	}

	getActiveHooks() {
		let activeHooks = 0;
		let hooksPath = this.gitHooksDir;
		if (!this.pathExists(hooksPath)) {
			return -1;
		}
		// read hooks path dir
		const hooks = fs.readdirSync(hooksPath);
		hooks.map((hook) => {
			if (hook.indexOf('.sample') === -1) {
				// no .sample is found
				activeHooks++;
			} else {
				//pass
			}
		});
		return activeHooks;
	}

	getTreeItem(element: Hook): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Hook): Thenable<Hook[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('Empty workspace can not have git hooks');
			return Promise.resolve([]);
		} else if (!this.pathExists(path.join(this.workspaceRoot, '.git'))) {
			vscode.window.showInformationMessage('No git repository in workspace');
			return Promise.resolve([]);
		}

		const hooksPath = this.gitHooksDir;

		if (this.isFromScm) {
			// no need of root node in scm view
			return Promise.resolve(this.getHooks(hooksPath));
		}

		if (!element) {
			// for the root element with label githooks on the top
			let hook = new Hook('Git Hooks', '', vscode.TreeItemCollapsibleState.Collapsed);
			hook.contextValue = 'root';
			fs.readdirSync(hooksPath).forEach((hookFile) => {
				if (hookFile.indexOf('.sample') === -1) {
					// if the hook is activated
					hook.iconPath = new vscode.ThemeIcon('testing-passed-icon', new vscode.ThemeColor('#RRGGBBAA'));
				}
			});
			return Promise.resolve([hook]);
		} else {
			return Promise.resolve(this.getHooks(hooksPath));
		}
	}

	private getHooks(hooksPath: string): Hook[] {
		const predefinedHooks: string[] = vscode.workspace.getConfiguration('GitHooks')?.['predefinedHooks'] ?? [];

		if (!this.pathExists(hooksPath)) {
			vscode.window.showInformationMessage('No hooks in empty workspace');
			return [];
		}

		const hooks = fs.readdirSync(hooksPath);
		if (!hooks.length) {
			return [];
		}

		return hooks.map((hook) => {
			const hookLabel = hook.replace('.sample', '');
			if (!predefinedHooks.includes(hookLabel)) {
				const hookData = new Hook(hook, 'Not a predefined hook', vscode.TreeItemCollapsibleState.None);
				hookData.iconPath = new vscode.ThemeIcon('testing-error-icon');
				hookData.contextValue = 'notPredefined';
				return hookData;
			}

			const isActive = hook.indexOf('.sample') === -1;
			const hookStatus = isActive ? 'Active' : 'Inactive';
			const hookData = new Hook(hook, hookStatus, vscode.TreeItemCollapsibleState.None);
			if (isActive) {
				this.activeHookCount++;
				hookData.iconPath = new vscode.ThemeIcon('testing-passed-icon', new vscode.ThemeColor('#RRGGBBAA'));
			} else {
				hookData.iconPath = new vscode.ThemeIcon('circle-large-outline');
			}
			return hookData;
		});
	}
	private workSpaceHasGit(workingDir: string | undefined): Boolean {
		if(!workingDir) {
			return false;
		}

		// check whether git_dir exists or not
		let gitDir = path.join(workingDir, '.git');
		return this.pathExists(gitDir);
	}
	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}
		return true;
	}
}
