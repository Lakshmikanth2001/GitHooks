import {
	MarkdownString,
	TextEditor,
	DecorationOptions,
	Position,
	Range,
	window,
	OverviewRulerLane,
	DecorationRangeBehavior,
	TextEditorSelectionChangeEvent,
} from 'vscode';

function makeHoverMarkdownString(): MarkdownString {
	const hoverMessage: MarkdownString = new MarkdownString(`This is a test 
	<h1>Git Hook</h1>
	<p>This is a test</p>
	`);
	hoverMessage.supportHtml = true;

	return hoverMessage;
}

function annotateFirstLine(event: TextEditorSelectionChangeEvent) {
	const editor = window.activeTextEditor;

	if (editor) {
		if (event.selections[0].isSingleLine) {
			if (event.selections[0].start.line === 0) {
				lineAnnotation(editor, makeHoverMarkdownString());
			} else {
				clearLineAnnotation(editor);
			}
		}
	}
}

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

function lineAnnotation(activeEditor: TextEditor, hoverMessage: MarkdownString) {
	const decoratorOption: DecorationOptions[] = [
		{
			range: new Range(new Position(0, Number.MAX_VALUE), new Position(0, Number.MAX_VALUE)),
			hoverMessage: hoverMessage,
			renderOptions: {
				dark: {
					after: {
						contentText: activeEditor.document.languageId,
					},
				},
			},
		},
	];
	activeEditor.setDecorations(lineDecorationType, decoratorOption);
}

function clearLineAnnotation(activeEditor: TextEditor) {
	activeEditor.setDecorations(lineDecorationType, []);
}

export { annotateFirstLine };
