# Git Hooks in VS-Code
## This extension provides simple UI to view and activate git hook in your current workspace

# Features

* View Git Hooks in current workspace
* Activate git hooks in current workspace
* Edit git hook in current workspace
* Configure git hooks path in current workspace (Doesn't set the git config core.hooksPath)

## Run Git Hooks
![](https://githooks.s3.ap-south-1.amazonaws.com/run_hook.png)

## Git Hooks Configuration
- GitHooks.hooksDirectory
    - change GitHooks.hooksDirectory to confgiure you local git hooks to the required path
- GitHooks.viewContainerDisplay
    - to toggle between `SCM` and `Activity Bar` view
- GitHooks.predefinedHooks
    - list of hooks which are defined by git. If a file not in this list is present in `hooksDirecotry` a vscode 'testing-error-icon' will be displayed beside it
- GitHooks.languageBinaries
    - this configuration is used to suggest various shell path and shebang text input various launguage binary like (python, python3, node ) etc
    their path is computed via a bash command `which python`

## Various Shell path suggetions
![](https://githooks.s3.ap-south-1.amazonaws.com/shell-suggetion.png)

## Git Hooks in VS-Code Source Control
* Toggle Git Hooks view between activity bar and SCM view using git icon on top right
![](https://githooks.s3.ap-south-1.amazonaws.com/2022-04-30.png)

## Git Hooks Layout
![](https://githooks.s3.ap-south-1.amazonaws.com/hook_options.png)

## Git Hooks Description
![](https://githooks.s3.ap-south-1.amazonaws.com/hook_hints.png)

# Contributors

A big thanks to the people that have contributed to this project 🙏🏽🙏🏽🙏🏽👨🏽‍💻🧑🏽‍💻:

### By Reporting Issues and bugs

Paul-Joseph de Werk ([@DraakUSA](https://github.com/DraakUSA)) &mdash; [Bug](https://github.com/Lakshmikanth2001/GitHooks/issues/9)

Ahmad M ([@9AMTech](https://github.com/9AMTech)) &mdash; [Bug](https://github.com/Lakshmikanth2001/GitHooks/issues/5)