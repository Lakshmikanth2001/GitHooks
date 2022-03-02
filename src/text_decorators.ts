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

const defaultMarkdown: string = `This is a test 
<h1>Git Hook</h1>
<p>This is a test</p>
`;

function makeHoverMarkdownString(markDown: string = defaultMarkdown): MarkdownString {
	const hoverMessage: MarkdownString = new MarkdownString(markDown);
	hoverMessage.supportHtml = true;

	return hoverMessage;
}

function annotateFirstLine(event: TextEditorSelectionChangeEvent) {
	const editor = window.activeTextEditor;

	// get file name
	if (editor) {
		const fileName = editor.document.fileName;
		if (event.selections[0].isSingleLine) {
			// from the first line
			let hookLaunguage = editor.document.getText(new Range(new Position(0, 0), new Position(1, 0)));

			const hoverBoxContent = `<h1> Git Hook </h1> 
			<h1> ${fileName.replace(/^.*[\\\/]/, '').replace('.sample', '')} </h1>
			<p>Will run using ${editor.document.languageId} shell </p>
			`;

			if (event.selections[0].start.line === 0) {
				lineAnnotation(editor, makeHoverMarkdownString(hoverBoxContent), editor.document.languageId);
			} else {
				clearLineAnnotation(editor);
			}
		}
	}
}

function lineAnnotation(activeEditor: TextEditor, hoverMessage: MarkdownString, contentText: string): void {
	const decoratorOption: DecorationOptions[] = [
		{
			range: new Range(new Position(0, Number.MAX_VALUE), new Position(0, Number.MAX_VALUE)),
			hoverMessage: hoverMessage,
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
		const fileName = editor.document.fileName;
		const fileLocation = editor?.document.uri.fsPath;

		if (fileLocation && fileLocation.indexOf('hooks') !== -1 && fileLocation.indexOf('.git') !== -1) {
			const hoverBoxContent = `<h1> Git Hook </h1> 
			<h1> ${fileName.replace(/^.*[\\\/]/, '').replace('.sample', '')} </h1>
			<p>Will run using ${editor.document.languageId} shell </p>
			`;
			lineAnnotation(editor, makeHoverMarkdownString(hoverBoxContent), editor.document.languageId);
		}
	}
}

function clearLineAnnotation(activeEditor: TextEditor): void {
	activeEditor.setDecorations(lineDecorationType, []);
}

function onLaunguageChange(event: TextDocument) {
	const { fileName, languageId } = event;
	window.showInformationMessage(`Hook Launguage is changed to ${languageId}`);

	const hoverBoxContent = `<h1> Git Hook </h1> 
	<h1> ${fileName.replace(/^.*[\\\/]/, '').replace('.sample', '')} </h1>
	<p>Will run using ${languageId} shell </p>
	`;

	if (window.activeTextEditor) {
		const decoratorOption: DecorationOptions[] = [
			{
				range: new Range(new Position(0, Number.MAX_VALUE), new Position(0, Number.MAX_VALUE)),
				hoverMessage: makeHoverMarkdownString(hoverBoxContent),
				renderOptions: {
					dark: {
						after: {
							contentText: languageId,
						},
					},
				},
			},
		];
		window.activeTextEditor.setDecorations(lineDecorationType, decoratorOption);
	}
}

export { annotateFirstLine, clearLineAnnotation, lineAnnotation, onLaunguageChange, initialAnnotation };
