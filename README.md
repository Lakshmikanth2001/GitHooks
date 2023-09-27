# Git Hooks in VS Code
If you're working on a team or collaborating with other developers, using Git hooks can be beneficial for enforcing code standards, running tests automatically, or preventing commits that don't meet certain criteria.They can help protect both your local git repo as well as hosted git repo from bad commits that could potentially break your code.

Git hooks are scripts that can be executed before or after certain Git events, such as committing changes or pushing to a remote repository. They allow you to automate tasks, enforce code quality, and perform various checks as part of your development workflow.

The GitHooks extension for Visual Studio Code provides a user interface (UI) to manage and configure Git hooks without needing to interact with the command line directly. This can make it more convenient and accessible for developers who prefer a visual interface for managing their Git hooks.

# Features
* View Git Hooks in the current workspace
* Activate git hooks in the current workspace
* Edit git hook in the current workspace
* Configures git hooks path (i.e., `git config core.hooksPath`) in the current workspace

## Run Git Hooks
get image from asset folder
![](/assets/hookRun.png)

## Git Hooks Configuration
- GitHooks.hooksDirectory
    - Change GitHooks.hooksDirectory to configure your local git hooks to the required path
- GitHooks.viewContainerDisplay
    - To toggle between `SCM` and `Activity Bar` view
- GitHooks.predefinedHooks
    - List of hooks which are defined by git. If a file not in this list is present in `hooksDirectory`, a vscode 'testing-error-icon' will be displayed beside it
- GitHooks.languageBinaries
    - This configuration is used to suggest various shell paths and shebang text input for various language binaries like (python, python3, node) etc.
    Their path is computed via a bash command `which python`

## Various Shell path suggetions
![](/assets/shell-suggetion.png)

## Git Hooks in VS Code Source Control
* Toggle Git Hooks view between activity bar and SCM view using git icon on the top right
![](/assets/hookSCMView.png)

## Git Hooks Layout
![](/assets/hookLayout.png)

## Git Hooks Description
![](/assets/hookDescription.png)

# Contributors

A big thanks to the people who have contributed to this project 🙏🏽🙏🏽🙏🏽👨🏽‍💻🧑🏽‍💻:

- ChatGPT ([@ChatGPT](https://chat.openai.com/)) for improving `README.md`
- GitHub Copilot ([@ChatGPT](https://chat.openai.com/)) for improving code quality and suggesting various code snippets

### By Reporting Issues and Bugs

AquilaSands and ionutz89 ([@AquilaSands](https://github.com/AquilaSands)) and ([@ionutz89](https://github.com/ionutz89)) &mdash; [Bug](https://github.com/Lakshmikanth2001/GitHooks/issues/12)

Paul-Joseph de Werk ([@DraakUSA](https://github.com/DraakUSA)) &mdash; [Bug](https://github.com/Lakshmikanth2001/GitHooks/issues/9)

Ahmad M ([@9AMTech](https://github.com/9AMTech)) &mdash; [Bug](https://github.com/Lakshmikanth2001/GitHooks/issues/5)