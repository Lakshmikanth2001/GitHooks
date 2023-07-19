import {
	MarkdownString,
	TextEditor,
	TextDocument,
	DecorationOptions,
	Position,
	Range,
	window,
	OverviewRulerLane,
	DecorationRangeBehavior,
	TextEditorSelectionChangeEvent,
} from 'vscode';
import { HOOK_MAP } from './hook_description';

const lineDecorationType = window.createTextEditorDecorationType({
	dark: {
		after: {
			textDecoration: 'none',
			margin: '0 0 0 3em',
			color: '#696969',
		},
	},
	overviewRulerLane: OverviewRulerLane.Center,
	rangeBehavior: DecorationRangeBehavior.ClosedOpen,
});

function makeHoverMarkdownString(markDown: string): MarkdownString {
	const hoverMessage: MarkdownString = new MarkdownString(markDown);
	hoverMessage.supportHtml = true;
	hoverMessage.isTrusted = true;

	return hoverMessage;
}

function annotateFirstLine(event: TextEditorSelectionChangeEvent) {
	const editor = window.activeTextEditor;
	if (!editor) {
		return;
	}

	if (!event.selections[0].isSingleLine || event.selections[0].start.line !== 0) {
		clearLineAnnotation(editor);
		return;
	}

	lineAnnotation(editor, editor.document.languageId);
}

function lineAnnotation(activeEditor: TextEditor, contentText: string): void {
	const fileName = activeEditor.document.fileName;
	let baseName = fileName.replace(/^.*[\\\/]/, '').replace('.sample', '');
	let hookDescription = HOOK_MAP.get(baseName);

	const hoverBoxContent = makeHoverMarkdownString(hookDescription + "");

	const decoratorOption: DecorationOptions[] = [
		{
			range: new Range(new Position(0, Number.MAX_VALUE), new Position(0, Number.MAX_VALUE)),
			hoverMessage: hoverBoxContent,
			renderOptions: {
				dark: {
					after: {
						contentText: contentText,
					},
				},
			},
		},
	];
	activeEditor.setDecorations(lineDecorationType, decoratorOption);
}

function initialAnnotation() {
	const editor = window.activeTextEditor;
	if (!editor) return;

	const fileLocation = editor.document.uri.fsPath;
	if (!fileLocation || fileLocation.indexOf('hooks') === -1 || fileLocation.indexOf('.git') === -1) return;

	lineAnnotation(editor, editor.document.languageId);
}

function clearLineAnnotation(activeEditor: TextEditor): void {
	activeEditor.setDecorations(lineDecorationType, []);
}

function onLaunguageChange(event: TextDocument) {
	if (!event) {
		return;
	}

	const { fileName, languageId } = event;

	if (!fileName || !languageId) {
		return;
	}

	if (fileName.indexOf('hooks') === -1 || fileName.indexOf('.git') === -1) {
		return;
	}

	window.showInformationMessage(`Hook Language is changed to ${languageId}`);

	if (window.activeTextEditor) {
		lineAnnotation(window.activeTextEditor, languageId);
	}
}

export { annotateFirstLine, clearLineAnnotation, lineAnnotation, onLaunguageChange, initialAnnotation };