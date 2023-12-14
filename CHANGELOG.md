# Change Log

All notable changes to the "git-hooks" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [2.0.1] -- 2023-12-13
- CacheContainer class added to cache git hooks directory reads
- Single Hook Directory read correction

## [2.0.0] -- 2023-12-05
- Added support for vscode workspaces
- Improve performance by caching git hooks directory reads
- Decreased command execution time to find out git hooks directory
- removed date time snippet and python snippet (which are not used by many users)
- Added `path` and `directoryPath` attributes to `Hook` class

## [1.3.4] -- 2023-09-27
- looger improvement (detecting `GitHooks.logLevel` configuration)
- folder selection for `GitHooks.hooksDirectory` configuration
- adding git local assets to REAME.md
- restrict text snippet scope to hooks only

### [1.3.3] -- 2023-08-09
- Added `GitHooks.logLevel` configuration to set the log level of the extension.
- Render `shebang` snippet only on the first line of the file.
- Removed a bug that caused badge rendering issues when toggling the view from SCM to Core View.
- Cached the hookProvider.
- Removed an unnecessary activeHooks increment in the getHooks private method.

### [1.3.2] -- 2023-08-04
- `visibility` of SCM and ActivityBar is now expanded by default
- Added context to Activity bar and title to SCM View

### [1.3.1] -- 2023-08-03
- Added support for relative path for `GitHooks.hooksDirectory` configuration
- security fix for `GitHooks.hooksDirectory` configuration to prevent shell injection

### [1.3.0] -- 2023-07-29
- Introduced `GitHooks` output channel to display the output logs of the extension
- avoid await inside `activate` function of `extension.ts` to improve startup time

### [1.2.1] -- 2023-07-28
- Bug fix for `git_hooks_scm` icon display in `ActivityBar`(SCM view badge was removed because of this bug)

### [1.2.0] -- 2023-07-27
- Improve startup performance by caching git hooks directory reads
- conditionally render `git_hooks_scm` and `git_hooks_view` based on configuration
- Bug fix for `ViewBadge` count when non-predefined hooks are present
- Computing `ActiveHooksCount` in `GitHooksProvider` class constructor
- tooltip correction while changing from `git_hooks_scm` to `git_hooks_view`(buggy for now)

### [1.1.1] -- 2023-07-18
- Designed a new logo with new banner color
- Improved README.md by including description and context of the extension
- Line decoration for light theme color correction and code refactoring

### [1.1.0] -- 2023-07-18
- Added configuration to set git.core.hooksPath only (at workspace level)
- CHANGELOG.md format correction
- Supporting various launguge binaries for shell and shebang suggetions
- Making `core.hooksPath` update to workspace scope
- hookDirectory path correction in windows operating system
- first step for including test cases

### [1.0.0] -- 2023-07-16
- Added configuration to give hook path (just to run and toggle the hooks)
- Improved `runHook` performace by caching git results
- Bug fix for conventional hook run
- Added and option for predefinedHooks(all default hooks supplied by git)
- editor/title regex correction
- galleryBanner color change

### [0.0.14] -- 2023-04-02
- regex correction for including `.git/hooks` for all Operating Systems

### [0.0.13] -- 2023-03-22
- regex correction for including `.git/hooks` path in windows OS

### [0.0.12] -- 2023-03-22
- `Promise.all` to `Promise.allSelected` for detecting launguage shell
- Regex improvement to detect `.git/hook` folder
- change `python.json` snippet scope to `bash` and `shellscript`

### [0.0.11] -- 2023-03-18
- Added Run Button to `editor/title` for every hook present under .git directory
- Removed `PyMySQL` snippent
- Added shebang snippets
- Improved `hook_descriptions` on lineAnnotation

### [0.0.10] -- 2022-11-28
- Include `Webpack` to minify the extension and improving extension load time

### [0.0.9] -- 2022-10-13
- Added `ViewBadge` Feature which can be viewed for `code` version > `1.72.0`

### [0.0.8] -- 2022-07-29
- resolved bash shell detection issue for both `MAC` and `Linux` operating systems

### [0.0.7] - 2022-06-23
- new feature to run `git hook run` command ( new feature in `git` version `2.36.1`)
- new snippets for detecting `shell` paths for launguages like [`python`, `bash`, `node`, `java`, `cpp`]
- new snippet for `dateTime` for `TypeScript`

### [0.0.6] - 2022-05-05
- Bug fix for runing hook using `terminal.sendText`

### [0.0.5] - 2022-05-04
- Included Context of Tree Elements
- Added SCM display to the extension
- Added Configuration to toggle the display between `SCM` and `ActivityBar`

### [0.0.4] - 2022-03-03
- Improved Search KeyWords
- Added `PyMySQL` & `PreCommit hook` Python Snippets
- Added `Hook Description` for each git hook
- Using user defined shell to run git hooks