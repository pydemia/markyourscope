import * as vscode from "vscode";
import { AnalysisScheduler } from "./analysis-scheduler";
import {
    resolveDisplay,
    type DisplayMode,
    type FocusTarget,
    type IndentationStyle,
} from "./display";
import { indentationBands, indentationGuides } from "./indentation";
import { analyzeScopes, scopesAt, type ScopeAnalysis } from "./scope";
import { visibleLineIntersections } from "./visible";

const MAX_LINES = 20_000;
const MAX_BYTES = 2 * 1024 * 1024;
const SUPPORTED_LANGUAGES = new Set([
    "javascript", "typescript", "python", "json",
]);

interface CachedAnalysis {
    version: number;
    result: ScopeAnalysis;
}

interface EditorFocus {
    anchor: vscode.Position;
    parentIndex: number;
}

export function activate(context: vscode.ExtensionContext): void {
    const indentDecoration = vscode.window.createTextEditorDecorationType({
        borderColor: new vscode.ThemeColor("editorIndentGuide.background1"),
        borderStyle: "solid",
        borderWidth: "0 0 0 1px",
    });
    const indentBandEven = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(128, 128, 128, 0.08)",
    });
    const indentBandOdd = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(128, 128, 128, 0.04)",
    });
    const scopeDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(128, 128, 128, 0.08)",
        isWholeLine: true,
    });
    const focusScopeDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(128, 128, 128, 0.16)",
        isWholeLine: true,
    });
    const startDecoration = vscode.window.createTextEditorDecorationType({
        borderColor: new vscode.ThemeColor("editorInfo.foreground"),
        borderStyle: "solid",
        borderWidth: "1px 0 0 0",
        isWholeLine: true,
    });
    const endDecoration = vscode.window.createTextEditorDecorationType({
        borderColor: new vscode.ThemeColor("editorInfo.foreground"),
        borderStyle: "solid",
        borderWidth: "0 0 1px 0",
        isWholeLine: true,
    });
    const status = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
    );
    const output = vscode.window.createOutputChannel("Mark Your Scope");
    const analysisCache = new Map<string, CachedAnalysis>();
    const editorFocus = new Map<vscode.TextEditor, EditorFocus>();
    let scopeToggleEnabled = true;
    const analysisScheduler = new AnalysisScheduler(75, (key, version) => {
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === key &&
                editor.document.version === version) render(editor);
        }
    });
    context.subscriptions.push(
        indentDecoration,
        indentBandEven,
        indentBandOdd,
        scopeDecoration,
        focusScopeDecoration,
        startDecoration,
        endDecoration,
        status,
        output,
        analysisScheduler,
    );

    function clearScope(editor: vscode.TextEditor): void {
        editor.setDecorations(scopeDecoration, []);
        editor.setDecorations(focusScopeDecoration, []);
        editor.setDecorations(startDecoration, []);
        editor.setDecorations(endDecoration, []);
    }

    function clear(editor: vscode.TextEditor): void {
        editor.setDecorations(indentDecoration, []);
        editor.setDecorations(indentBandEven, []);
        editor.setDecorations(indentBandOdd, []);
        clearScope(editor);
        if (editor === vscode.window.activeTextEditor) status.hide();
    }

    function analyze(document: vscode.TextDocument): ScopeAnalysis | null {
        const key = document.uri.toString();
        const cached = analysisCache.get(key);
        if (cached?.version === document.version) return cached.result;
        if (document.lineCount > MAX_LINES) return null;
        const text = document.getText();
        if (Buffer.byteLength(text, "utf8") > MAX_BYTES) return null;
        let result: ScopeAnalysis;
        try {
            result = analyzeScopes(text, document.languageId);
        } catch (error) {
            output.appendLine(
                `Analysis failed for ${key} at version ${document.version}: ` +
                String(error),
            );
            result = { state: "failed", scopes: [] };
        }
        analysisCache.set(key, { version: document.version, result });
        return result;
    }

    function lineRange(document: vscode.TextDocument, line: number): vscode.Range {
        return new vscode.Range(
            line,
            0,
            line,
            document.lineAt(line).text.length,
        );
    }

    function displayMode(value: string): DisplayMode {
        if (value === "structure" || value === "focus" || value === "off") {
            return value;
        }
        return "balanced";
    }

    function focusTarget(value: string): FocusTarget {
        if (value === "expression" || value === "lines") return value;
        return "block";
    }

    function explicitIndentationStyle(
        config: vscode.WorkspaceConfiguration,
    ): IndentationStyle | undefined {
        const inspected = config.inspect<string>("indentation.style");
        if (!inspected) return undefined;
        const values = [
            inspected.globalValue,
            inspected.workspaceValue,
            inspected.workspaceFolderValue,
            inspected.globalLanguageValue,
            inspected.workspaceLanguageValue,
            inspected.workspaceFolderLanguageValue,
        ];
        if (values.every((value) => value === undefined)) return undefined;
        const style = config.get<string>("indentation.style");
        return style === "line" || style === "background" ||
            style === "off" ? style : undefined;
    }

    function paintRange(
        editor: vscode.TextEditor,
        start: number,
        end: number,
        background: "balanced" | "focus" | "none",
    ): void {
        const document = editor.document;
        const visible = visibleLineIntersections(
            { startLine: start, endLine: end },
            editor.visibleRanges,
        );
        const ranges = visible.map(({ startLine, endLine }) =>
            new vscode.Range(
                startLine,
                0,
                endLine,
                document.lineAt(endLine).text.length,
            ));
        editor.setDecorations(
            scopeDecoration, background === "balanced" ? ranges : []);
        editor.setDecorations(
            focusScopeDecoration, background === "focus" ? ranges : []);
        editor.setDecorations(
            startDecoration,
            visible.some((range) => range.startLine <= start &&
                start <= range.endLine) ? [lineRange(document, start)] : [],
        );
        editor.setDecorations(
            endDecoration,
            visible.some((range) => range.startLine <= end &&
                end <= range.endLine) ? [lineRange(document, end)] : [],
        );
    }

    function modeWriteLocation(
        config: vscode.WorkspaceConfiguration,
    ): { target: vscode.ConfigurationTarget; inLanguage: boolean } {
        const inspected = config.inspect<string>("mode");
        if (inspected?.workspaceFolderLanguageValue !== undefined) {
            return {
                target: vscode.ConfigurationTarget.WorkspaceFolder,
                inLanguage: true,
            };
        }
        if (inspected?.workspaceLanguageValue !== undefined) {
            return {
                target: vscode.ConfigurationTarget.Workspace,
                inLanguage: true,
            };
        }
        if (inspected?.globalLanguageValue !== undefined) {
            return {
                target: vscode.ConfigurationTarget.Global,
                inLanguage: true,
            };
        }
        if (inspected?.workspaceFolderValue !== undefined) {
            return {
                target: vscode.ConfigurationTarget.WorkspaceFolder,
                inLanguage: false,
            };
        }
        if (inspected?.workspaceValue !== undefined) {
            return {
                target: vscode.ConfigurationTarget.Workspace,
                inLanguage: false,
            };
        }
        return {
            target: vscode.ConfigurationTarget.Global,
            inLanguage: false,
        };
    }

    function render(editor: vscode.TextEditor): void {
        const document = editor.document;
        const config = vscode.workspace.getConfiguration(
            "markYourScope",
            { uri: document.uri, languageId: document.languageId },
        );
        const excluded = config.get<string[]>("excludedLanguages", []);
        if (!config.get<boolean>("enabled", true) ||
            excluded.includes(document.languageId)) {
            clear(editor);
            return;
        }
        const mode = displayMode(config.get<string>("mode", "balanced"));
        const target = focusTarget(config.get<string>(
            "focus.target", "block"));
        const contextLines = config.get<number>("focus.contextLines", 3);
        const display = resolveDisplay({
            enabled: true,
            mode,
            explicitIndentationStyle: explicitIndentationStyle(config),
            scopeToggleEnabled,
            target,
            contextLines: Number.isFinite(contextLines) ? contextLines : 3,
        });
        if (mode === "off") {
            clear(editor);
            return;
        }

        const tabSize = typeof editor.options.tabSize === "number"
            ? editor.options.tabSize : 4;
        const guides: vscode.Range[] = [];
        const evenBands: vscode.Range[] = [];
        const oddBands: vscode.Range[] = [];
        if (display.indentationStyle !== "off") {
            const seen = new Set<number>();
            for (const visible of visibleLineIntersections(
                { startLine: 0, endLine: document.lineCount - 1 },
                editor.visibleRanges,
            )) {
                for (let line = visible.startLine;
                    line <= visible.endLine;
                    line++) {
                    if (seen.has(line)) continue;
                    seen.add(line);
                    const text = document.lineAt(line).text;
                    if (display.indentationStyle === "line") {
                        for (const guide of indentationGuides(
                            [text], line, tabSize)) {
                            guides.push(new vscode.Range(
                                guide.line,
                                guide.character,
                                guide.line,
                                guide.character + 1,
                            ));
                        }
                    } else {
                        for (const band of indentationBands(
                            [text], line, tabSize)) {
                            const range = new vscode.Range(
                                line, band.start, line, band.end);
                            if (band.level % 2 === 0) {
                                evenBands.push(range);
                            } else {
                                oddBands.push(range);
                            }
                        }
                    }
                }
            }
        }
        editor.setDecorations(indentDecoration, guides);
        editor.setDecorations(indentBandEven, evenBands);
        editor.setDecorations(indentBandOdd, oddBands);

        if (!display.showScope) {
            clearScope(editor);
            if (editor === vscode.window.activeTextEditor) status.hide();
            return;
        }

        const anchor = editor.selection.active;
        if (display.target === "lines") {
            const start = Math.max(
                0, anchor.line - display.contextLines);
            const end = Math.min(
                document.lineCount - 1,
                anchor.line + display.contextLines,
            );
            paintRange(editor, start, end, display.scopeBackground);
            if (editor === vscode.window.activeTextEditor) {
                status.text = `Scope: 주변 L${start + 1}–L${end + 1}`;
                status.show();
            }
            return;
        }

        if (analysisScheduler.isPending(
            document.uri.toString(), document.version)) {
            clearScope(editor);
            if (editor === vscode.window.activeTextEditor) {
                status.text = "Scope: 분석 중";
                status.show();
            }
            return;
        }

        const analysis = analyze(document);
        const focus = editorFocus.get(editor);
        const parentIndex = focus?.anchor.isEqual(anchor)
            ? focus.parentIndex : 0;
        editorFocus.set(editor, { anchor, parentIndex });

        const candidates = analysis
            ? scopesAt(analysis.scopes, document.offsetAt(anchor),
                display.target)
            : [];
        const scope = candidates[Math.min(parentIndex, candidates.length - 1)];
        if (!scope) {
            clearScope(editor);
            if (editor === vscode.window.activeTextEditor) {
                status.text = analysis === null
                    ? "Scope: 파일 크기 제한"
                    : analysis.state === "unsupported"
                        ? "Scope: 들여쓰기만 표시"
                        : analysis.state === "failed"
                            ? "Scope: 분석 오류"
                        : analysis.state === "unresolved"
                            ? "Scope: 구문 확인 불가"
                            : "Scope: 범위 없음";
                status.show();
            }
            return;
        }

        const start = document.positionAt(scope.start).line;
        const end = document.positionAt(scope.end - 1).line;
        paintRange(editor, start, end, display.scopeBackground);
        if (editor === vscode.window.activeTextEditor) {
            status.text = `Scope: ${scope.kind} · L${start + 1}–L${end + 1}`;
            status.show();
        }
    }

    function renderAll(): void {
        for (const editor of vscode.window.visibleTextEditors) render(editor);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "markYourScope.toggleScopeHighlight",
            () => {
                scopeToggleEnabled = !scopeToggleEnabled;
                renderAll();
            },
        ),
        vscode.commands.registerCommand(
            "markYourScope.chooseDisplayMode",
            async () => {
                const items: Array<vscode.QuickPickItem & {
                    mode: DisplayMode;
                }> = [
                    { label: "Balanced", mode: "balanced" },
                    { label: "Structure", mode: "structure" },
                    { label: "Focus", mode: "focus" },
                    { label: "Off", mode: "off" },
                ];
                const picked = await vscode.window.showQuickPick(items, {
                    placeHolder: "Choose a display mode",
                });
                if (!picked) return;
                const config = vscode.workspace.getConfiguration(
                    "markYourScope",
                    vscode.window.activeTextEditor
                        ? {
                            uri: vscode.window.activeTextEditor.document.uri,
                            languageId: vscode.window.activeTextEditor
                                .document.languageId,
                        }
                        : undefined,
                );
                const location = modeWriteLocation(config);
                try {
                    await config.update(
                        "mode", picked.mode, location.target,
                        location.inLanguage);
                } catch (error) {
                    void vscode.window.showErrorMessage(
                        `Could not save display mode: ${String(error)}`);
                }
            },
        ),
        vscode.commands.registerCommand(
            "markYourScope.focusParentScope",
            () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;
                const focus = editorFocus.get(editor);
                editorFocus.set(editor, {
                    anchor: editor.selection.active,
                    parentIndex: (focus?.parentIndex ?? 0) + 1,
                });
                render(editor);
            },
        ),
        vscode.commands.registerCommand(
            "markYourScope.resetScopeFocus",
            () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;
                editorFocus.delete(editor);
                render(editor);
            },
        ),
        vscode.window.onDidChangeTextEditorSelection((event) => {
            const focus = editorFocus.get(event.textEditor);
            if (focus && !focus.anchor.isEqual(event.selections[0].active)) {
                editorFocus.delete(event.textEditor);
            }
            render(event.textEditor);
        }),
        vscode.window.onDidChangeTextEditorVisibleRanges((event) =>
            render(event.textEditor)),
        vscode.window.onDidChangeTextEditorOptions((event) =>
            render(event.textEditor)),
        vscode.window.onDidChangeVisibleTextEditors((editors) => {
            for (const editor of editorFocus.keys()) {
                if (!editors.includes(editor)) editorFocus.delete(editor);
            }
            renderAll();
        }),
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) render(editor);
            else status.hide();
        }),
        vscode.workspace.onDidChangeTextDocument((event) => {
            const key = event.document.uri.toString();
            analysisCache.delete(key);
            if (SUPPORTED_LANGUAGES.has(event.document.languageId)) {
                analysisScheduler.schedule(key, event.document.version);
            } else {
                analysisScheduler.cancel(key);
            }
            for (const editor of editorFocus.keys()) {
                if (editor.document === event.document) {
                    editorFocus.delete(editor);
                }
            }
            for (const editor of vscode.window.visibleTextEditors) {
                if (editor.document === event.document) {
                    render(editor);
                }
            }
        }),
        vscode.workspace.onDidCloseTextDocument((document) => {
            const key = document.uri.toString();
            analysisScheduler.cancel(key);
            analysisCache.delete(key);
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("markYourScope")) renderAll();
        }),
    );

    renderAll();
}
