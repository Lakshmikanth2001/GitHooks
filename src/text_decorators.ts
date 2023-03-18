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
	// get file name
	if (editor) {
		if (event.selections[0].isSingleLine) {
			if (event.selections[0].start.line === 0) {
				lineAnnotation(editor, editor.document.languageId);
			} else {
				clearLineAnnotation(editor);
			}
		}
	}
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
	if (window.activeTextEditor) {
		const editor = window.activeTextEditor;
		const fileLocation = editor?.document.uri.fsPath;

		if (fileLocation && fileLocation.indexOf('hooks') !== -1 && fileLocation.indexOf('.git') !== -1) {
			lineAnnotation(editor, editor.document.languageId);
		}
	}
}

function clearLineAnnotation(activeEditor: TextEditor): void {
	activeEditor.setDecorations(lineDecorationType, []);
}

function onLaunguageChange(event: TextDocument) {
	const { fileName, languageId } = event;
	window.showInformationMessage(`Hook Launguage is changed to ${languageId}`);


	if (window.activeTextEditor) {
		if(fileName && fileName.indexOf('hooks') !== -1 && fileName.indexOf('.git') !== -1){
			lineAnnotation(window.activeTextEditor, languageId);
		}
	}
}

export { annotateFirstLine, clearLineAnnotation, lineAnnotation, onLaunguageChange, initialAnnotation };
