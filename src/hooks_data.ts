import * as vscode from 'vscode';
import * as path from 'path'
import * as fs from 'fs';

class Hook extends vscode.TreeItem {
    constructor(public readonly label: string,
        private status: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.tooltip = label + '\n' + status;
    }

    //vscode Theme color green

    iconPath = new vscode.ThemeIcon('testing-passed-icon', new vscode.ThemeColor('testing.iconPassed'));
    contextValue?: string | undefined = 'label'
}

export function getHooksDir(working_dir: string): string {
    return path.join(working_dir, '.git', 'hooks');
}

export class GitHooksProvider implements vscode.TreeDataProvider<Hook>{
    constructor(private workspaceRoot: string) { 
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        this.onActiveEditorChanged();
    }

    private onActiveEditorChanged(): void {
        const working_dir = vscode.workspace.workspaceFolders?.[0] ?? '';
        if(working_dir){
            vscode.commands.executeCommand('setContext', 'workSpaceHasGit', this.workSpaceHasGit(working_dir.uri.fsPath));
        }
        else{
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
        }
        else if (!this.pathExists(path.join(this.workspaceRoot, '.git'))) {
            vscode.window.showInformationMessage('No git repository in workspace');
            return Promise.resolve([]);
        }

        if (!element) {
            let hook = new Hook('Git Hooks', '', vscode.TreeItemCollapsibleState.Collapsed)
            hook.contextValue = 'root'
            return Promise.resolve([
                hook,
            ])
        }
        else {
            return Promise.resolve(
                this.getHooks(
                    path.join(this.workspaceRoot, '.git', 'hooks')
                )
            );
        }
    }

    private getHooks(hooksPath: string): Hook[] {

        if (this.pathExists(hooksPath)) {
            // read hooks path dir
            const hooks = fs.readdirSync(hooksPath);
            const hooks_list: Hook[] = hooks.map((hook) => {

                let hook_status: string;

                if (hook.indexOf('.sample') !== -1) {
                    hook_status = 'Inactive';
                }
                else {
                    hook_status = "Active"
                }
                let hook_data = new Hook(hook, hook_status, vscode.TreeItemCollapsibleState.None);

                if (hook.indexOf('.sample') !== -1) {
                    hook_data.iconPath = new vscode.ThemeIcon('circle-large-outline');
                }
                else {
                    hook_data.iconPath = new vscode.ThemeIcon('testing-passed-icon', new vscode.ThemeColor('#RRGGBBAA'));
                }
                return hook_data;
            });

            return hooks_list
        }
        else {
            vscode.window.showInformationMessage('No hooks in empty workspace');
            return [];
        }

    }
    private workSpaceHasGit(working_dir: string | undefined): Boolean {
        if (working_dir) {
            let git_dir = path.join(working_dir, '.git');
            // check whether git_dir exists or not
            return this.pathExists(git_dir);
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