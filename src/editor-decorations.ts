import * as vscode from "vscode";
import type { PaletteColors } from "./palette";

export interface DecorationSet {
    indentLine: vscode.TextEditorDecorationType;
    indentBandEven: vscode.TextEditorDecorationType;
    indentBandOdd: vscode.TextEditorDecorationType;
    scopeBalanced: vscode.TextEditorDecorationType;
    scopeFocus: vscode.TextEditorDecorationType;
    start: vscode.TextEditorDecorationType;
    end: vscode.TextEditorDecorationType;
}

interface EditorSet {
    key: string;
    types: DecorationSet;
}

/** Own decoration types per editor so previews do not affect other panes. */
export class EditorDecorations implements vscode.Disposable {
    private readonly editors = new Map<vscode.TextEditor, EditorSet>();

    get(editor: vscode.TextEditor, colors: PaletteColors): DecorationSet {
        const key = JSON.stringify(colors);
        const current = this.editors.get(editor);
        if (current?.key === key) return current.types;
        this.release(editor);
        const types: DecorationSet = {
            indentLine: vscode.window.createTextEditorDecorationType({
                borderColor: colors.indentLine,
                borderStyle: "solid",
                borderWidth: "0 0 0 1px",
            }),
            indentBandEven: vscode.window.createTextEditorDecorationType({
                backgroundColor: colors.indentBandEven,
            }),
            indentBandOdd: vscode.window.createTextEditorDecorationType({
                backgroundColor: colors.indentBandOdd,
            }),
            scopeBalanced: vscode.window.createTextEditorDecorationType({
                backgroundColor: colors.scopeBalanced,
                isWholeLine: true,
            }),
            scopeFocus: vscode.window.createTextEditorDecorationType({
                backgroundColor: colors.scopeFocus,
                isWholeLine: true,
            }),
            start: vscode.window.createTextEditorDecorationType({
                borderColor: colors.boundary,
                borderStyle: "solid",
                borderWidth: "1px 0 0 0",
                isWholeLine: true,
            }),
            end: vscode.window.createTextEditorDecorationType({
                borderColor: colors.boundary,
                borderStyle: "solid",
                borderWidth: "0 0 1px 0",
                isWholeLine: true,
            }),
        };
        this.editors.set(editor, { key, types });
        return types;
    }

    release(editor: vscode.TextEditor): void {
        const current = this.editors.get(editor);
        if (!current) return;
        for (const type of Object.values(current.types)) type.dispose();
        this.editors.delete(editor);
    }

    dispose(): void {
        for (const editor of this.editors.keys()) this.release(editor);
    }
}
