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

export function getHooksDir(workingDir: string): string {
	return path.join(workingDir, '.git', 'hooks');
}

export function validViewBadgeVersion() {
	const initialValidVersion = '1.72.0'; // version where `viewBadge` feature was introduced
	const baseRelease = initialValidVersion.split('.').map((e) => parseInt(e));
	const currentRelease = vscode.version.split('.').map((e) => parseInt(e));
	for (let index = 0; index < baseRelease.length; index++) {
		if (baseRelease[index] < currentRelease[index]) {
			return true;
		} else if (baseRelease[index] > currentRelease[index]) {
			return false;
		}
	}
}

export function regesterHookTreeDataProvider() {
	const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
	if (workingDir) {
		// vscode.window.registerTreeDataProvider('git_hooks_view', new GitHooksProvider(workingDir.uri.fsPath, false));
		// vscode.window.registerTreeDataProvider('git_hooks_scm', new GitHooksProvider(workingDir.uri.fsPath, true));
		let coreHooksProvider = new GitHooksProvider(workingDir.uri.fsPath, false);
		let coreHookView = vscode.window.createTreeView('git_hooks_view', {
			treeDataProvider: coreHooksProvider,
		});
		vscode.window.createTreeView('git_hooks_scm', {
			treeDataProvider: new GitHooksProvider(workingDir.uri.fsPath, true),
		});
		if (validViewBadgeVersion()) {
			let activeHookCount = coreHooksProvider.getActiveHooks();
			if (activeHookCount > 0) {
				let iconBadge: ViewBadge = {
					value: activeHookCount,
					tooltip: `${activeHookCount} ActiveHooks`,
				};
				coreHookView.badge = iconBadge;
			} else {
				coreHookView.badge = { value: 0, tooltip: '' };
			}
		}
	}
}
export class GitHooksProvider implements vscode.TreeDataProvider<Hook> {
	public activeHookCount: number = 0;
	constructor(private workspaceRoot: string, private isFromScm: boolean) {
		vscode.workspace.onDidChangeWorkspaceFolders((e) => this.onActivateWorkspaceChanged(e));
		this.onActivateWorkspaceChanged(undefined);
	}

	private onActivateWorkspaceChanged(e: vscode.WorkspaceFoldersChangeEvent | undefined): void {
		if (e) {
			console.log('onActivateWorkspaceChanged');
			vscode.commands.executeCommand('setContext', 'workSpaceHasGit', this.workSpaceHasGit(e.added[0].uri.fsPath));
		} else {
			const workingDir = vscode.workspace.workspaceFolders?.[0] ?? '';
			if (workingDir) {
				vscode.commands.executeCommand('setContext', 'workSpaceHasGit', this.workSpaceHasGit(workingDir.uri.fsPath));
			} else {
				vscode.commands.executeCommand('setContext', 'workSpaceHasGit', false);
			}
		}
	}

	getActiveHooks() {
		let activeHooks = 0;
		let hooksPath = getHooksDir(this.workspaceRoot);
		if (this.pathExists(hooksPath)) {
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
		} else {
			return -1;
		}
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

		const hooksPath = getHooksDir(this.workspaceRoot);

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

	private getSupportedLaunguages(): void {
		// type of list of strings
		const supportedLanguages: string[] = vscode.workspace.getConfiguration('GitHooks')?.['supportedLanguages'] ?? [];
	}

	private getHooks(hooksPath: string): Hook[] {
		if (this.pathExists(hooksPath)) {
			// read hooks path dir
			const hooks = fs.readdirSync(hooksPath);
			const hooksList: Hook[] = hooks.map((hook) => {
				let hookStatus: string;

				if (hook.indexOf('.sample') !== -1) {
					hookStatus = 'Inactive';
				} else {
					this.activeHookCount++;
					hookStatus = 'Active';
				}
				let hookData = new Hook(hook, hookStatus, vscode.TreeItemCollapsibleState.None);

				if (hook.indexOf('.sample') === -1) {
					// no .sample is found
					hookData.iconPath = new vscode.ThemeIcon('testing-passed-icon', new vscode.ThemeColor('#RRGGBBAA'));
				} else {
					hookData.iconPath = new vscode.ThemeIcon('circle-large-outline');
				}
				return hookData;
			});

			return hooksList;
		} else {
			vscode.window.showInformationMessage('No hooks in empty workspace');
			return [];
		}
	}
	private workSpaceHasGit(workingDir: string | undefined): Boolean {
		if (workingDir) {
			let gitDir = path.join(workingDir, '.git');
			// check whether git_dir exists or not
			return this.pathExists(gitDir);
		}
		return false;
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
