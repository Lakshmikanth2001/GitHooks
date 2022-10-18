const HOOK_DESCRIPTION = {
	'applypatch-msg': `This hook is invoked by git-am[1]. It takes a single parameter, the name of the file that holds the proposed commit log message. Exiting with a non-zero status causes git am to abort before applying the patch.

	The hook is allowed to edit the message file in place, and can be used to normalize the message into some project standard format. It can also be used to refuse the commit after inspecting the message file.

	The default applypatch-msg hook, when enabled, runs the commit-msg hook, if the latter is enabled`,

	'pre-applypatch': `This hook is invoked by git-am[1]. It takes no parameter, and is invoked after the patch is applied, but before a commit is made.

	If it exits with non-zero status, then the working tree will not be committed after applying the patch.

	It can be used to inspect the current working tree and refuse to make a commit if it does not pass certain test.

	The default pre-applypatch hook, when enabled, runs the pre-commit hook, if the latter is enabled.`,

	'post-applypatch': `This hook is invoked by git-am[1]. It takes no parameter, and is invoked after the patch is applied and a commit is made.

	This hook is meant primarily for notification, and cannot affect the outcome of git am.`,

	'pre-commit': `This hook is invoked by git-commit[1], and can be bypassed with the --no-verify option. It takes no parameters, and is invoked before obtaining the proposed commit log message and making a commit. Exiting with a non-zero status from this script causes the git commit command to abort before creating a commit.

	The default pre-commit hook, when enabled, catches introduction of lines with trailing whitespaces and aborts the commit when such a line is found.

	All the git commit hooks are invoked with the environment variable GIT_EDITOR=: if the command will not bring up an editor to modify the commit message.

	The default pre-commit hook, when enabled-and with the hooks.allownonascii config option unset or set to false--prevents the use of non-ASCII filenames.`,

	'pre-merge-commit': `This hook is invoked by git-merge[1], and can be bypassed with the --no-verify option. It takes no parameters, and is invoked after the merge has been carried out successfully and before obtaining the proposed commit log message to make a commit. Exiting with a non-zero status from this script causes the git merge command to abort before creating a commit.

	The default pre-merge-commit hook, when enabled, runs the pre-commit hook, if the latter is enabled.

	This hook is invoked with the environment variable GIT_EDITOR=: if the command will not bring up an editor to modify the commit message.

	If the merge cannot be carried out automatically, the conflicts need to be resolved and the result committed separately (see git-merge[1]). At that point, this hook will not be executed, but the pre-commit hook will, if it is enabled.`,

	'prepare-commit-msg': `This hook is invoked by git-commit[1] right after preparing the default log message, and before the editor is started.

	It takes one to three parameters. The first is the name of the file that contains the commit log message. The second is the source of the commit message, and can be: message (if a -m or -F option was given); template (if a -t option was given or the configuration option commit.template is set); merge (if the commit is a merge or a .git/MERGE_MSG file exists); squash (if a .git/SQUASH_MSG file exists); or commit, followed by a commit object name (if a -c, -C or --amend option was given).

	If the exit status is non-zero, git commit will abort.

	The purpose of the hook is to edit the message file in place, and it is not suppressed by the --no-verify option. A non-zero exit means a failure of the hook and aborts the commit. It should not be used as replacement for pre-commit hook.

	The sample prepare-commit-msg hook that comes with Git removes the help message found in the commented portion of the commit template.`,

	'commit-msg': `This hook is invoked by git-commit[1] and git-merge[1], and can be bypassed with the --no-verify option. It takes a single parameter, the name of the file that holds the proposed commit log message. Exiting with a non-zero status causes the command to abort.

	The hook is allowed to edit the message file in place, and can be used to normalize the message into some project standard format. It can also be used to refuse the commit after inspecting the message file.

	The default commit-msg hook, when enabled, detects duplicate Signed-off-by trailers, and aborts the commit if one is found.`,

	'post-commit': `This hook is invoked by git-commit[1]. It takes no parameters, and is invoked after a commit is made.

	This hook is meant primarily for notification, and cannot affect the outcome of git commit.`,

	'pre-rebase': `This hook is called by git-rebase[1] and can be used to prevent a branch from getting rebased. The hook may be called with one or two parameters. The first parameter is the upstream from which the series was forked. The second parameter is the branch being rebased, and is not set when rebasing the current branch.`,

	'post-checkout': `This hook is invoked when a git-checkout[1] or git-switch[1] is run after having updated the worktree. The hook is given three parameters: the ref of the previous HEAD, the ref of the new HEAD (which may or may not have changed), and a flag indicating whether the checkout was a branch checkout (changing branches, flag=1) or a file checkout (retrieving a file from the index, flag=0). This hook cannot affect the outcome of git switch or git checkout, other than that the hook’s exit status becomes the exit status of these two commands.

	It is also run after git-clone[1], unless the --no-checkout (-n) option is used. The first parameter given to the hook is the null-ref, the second the ref of the new HEAD and the flag is always 1. Likewise for git worktree add unless --no-checkout is used.

	This hook can be used to perform repository validity checks, auto-display differences from the previous HEAD if different, or set working dir metadata properties.`,

	'post-merge': `This hook is invoked by git-merge[1], which happens when a git pull is done on a local repository. The hook takes a single parameter, a status flag specifying whether or not the merge being done was a squash merge. This hook cannot affect the outcome of git merge and is not executed, if the merge failed due to conflicts.

	This hook can be used in conjunction with a corresponding pre-commit hook to save and restore any form of metadata associated with the working tree (e.g.: permissions/ownership, ACLS, etc). See contrib/hooks/setgitperms.perl for an example of how to do this.`,

	'pre-push': `This hook is called by git-push[1] and can be used to prevent a push from taking place. The hook is called with two parameters which provide the name and location of the destination remote, if a named remote is not being used both values will be the same.

	If this hook exits with a non-zero status, git push will abort without pushing anything. Information about why the push is rejected may be sent to the user by writing to standard error.`,

	'pre-receive': `This hook is invoked by git-receive-pack[1] when it reacts to git push and updates reference(s) in its repository. Just before starting to update refs on the remote repository, the pre-receive hook is invoked. Its exit status determines the success or failure of the update.`,

	'update': `This hook is invoked by git-receive-pack[1] when it reacts to git push and updates reference(s) in its repository. Just before updating the ref on the remote repository, the update hook is invoked. Its exit status determines the success or failure of the ref update.

	The hook executes once for each ref to be updated, and takes three parameters:

	1.the name of the ref being updated,

	2.the old object name stored in the ref,

	3.and the new object name to be stored in the ref.`,

	'post-receive': `This hook is invoked by git-receive-pack[1] when it reacts to git push and updates reference(s) in its repository. It executes on the remote repository once after all the refs have been updated.

	This hook executes once for the receive operation. It takes no arguments, but gets the same information as the pre-receive hook does on its standard input.

	This hook does not affect the outcome of git receive-pack, as it is called after the real work is done.`,

	'post-update': `This hook is invoked by git-receive-pack[1] when it reacts to git push and updates reference(s) in its repository. It executes on the remote repository once after all the refs have been updated.

	It takes a variable number of parameters, each of which is the name of ref that was actually updated.

	This hook is meant primarily for notification, and cannot affect the outcome of git receive-pack.`,

	'push-to-checkout': `This hook is invoked by git-receive-pack[1] when it reacts to git push and updates reference(s) in its repository, and when the push tries to update the branch that is currently checked out and the receive.denyCurrentBranch configuration variable is set to updateInstead. Such a push by default is refused if the working tree and the index of the remote repository has any difference from the currently checked out commit; when both the working tree and the index match the current commit, they are updated to match the newly pushed tip of the branch. This hook is to be used to override the default behaviour.`,

	'pre-auto-gc': `This hook is invoked by git gc --auto (see git-gc[1]). It takes no parameter, and exiting with non-zero status from this script causes the git gc --auto to abort.`,

	'post-rewrite': `This hook is invoked by commands that rewrite commits (git-commit[1] when called with --amend and git-rebase[1]; however, full-history (re)writing tools like git-fast-import[1] or git-filter-repo typically do not call it!). Its first argument denotes the command it was invoked by: currently one of amend or rebase. Further command-dependent arguments may be passed in the future.`,

	'sendemail-validate': `This hook is invoked by git-send-email[1]. It takes a single parameter, the name of the file that holds the e-mail to be sent. Exiting with a non-zero status causes git send-email to abort before sending any e-mails.`,
};

const HOOK_MAP = new Map(Object.entries(HOOK_DESCRIPTION));
export {HOOK_MAP};