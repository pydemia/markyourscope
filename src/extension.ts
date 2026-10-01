import * as vscode from "vscode";
import { AnalysisScheduler } from "./analysis-scheduler";
import {
    resolveDisplay,
    type DisplayMode,
    type FocusTarget,
    type IndentationStyle,
} from "./display";
import {
    EditorDecorations,
    type DecorationSet,
} from "./editor-decorations";
import { indentationBands, indentationGuides } from "./indentation";
import { scopeEndOffset } from "./navigation";
import {
    paletteColors,
    paletteId,
    type PaletteId,
    type ThemeKind,
} from "./palette";
import { analyzeScopes, scopesAt, type Scope, type ScopeAnalysis } from "./scope";
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
    origin: vscode.Position;
    parentIndex: number;
    pinnedScope?: Scope;
    expectedSelection?: vscode.Selection;
}

export function activate(context: vscode.ExtensionContext): void {
    const decorations = new EditorDecorations();
    const status = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
    );
    const output = vscode.window.createOutputChannel("Mark Your Scope");
    const analysisCache = new Map<string, CachedAnalysis>();
    const editorFocus = new Map<vscode.TextEditor, EditorFocus>();
    let previousVisible = new Set(vscode.window.visibleTextEditors);
    const palettePreview = new Map<vscode.TextEditor, PaletteId>();
    const reportedInvalidColors = new Set<string>();
    let scopeToggleEnabled = true;
    const analysisScheduler = new AnalysisScheduler(75, (key, version) => {
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === key &&
                editor.document.version === version) render(editor);
        }
    });
    context.subscriptions.push(
        decorations,
        status,
        output,
        analysisScheduler,
    );

    function clearScope(
        editor: vscode.TextEditor,
        types: DecorationSet,
    ): void {
        editor.setDecorations(types.scopeBalanced, []);
        editor.setDecorations(types.scopeFocus, []);
        editor.setDecorations(types.start, []);
        editor.setDecorations(types.end, []);
    }

    function clear(editor: vscode.TextEditor): void {
        decorations.release(editor);
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

    function themeKind(): ThemeKind {
        switch (vscode.window.activeColorTheme.kind) {
            case vscode.ColorThemeKind.Light:
                return "light";
            case vscode.ColorThemeKind.HighContrast:
                return "highContrast";
            case vscode.ColorThemeKind.HighContrastLight:
                return "highContrastLight";
            default:
                return "dark";
        }
    }

    function editorTypes(
        editor: vscode.TextEditor,
        config: vscode.WorkspaceConfiguration,
    ): DecorationSet {
        const setting = palettePreview.get(editor) ??
            paletteId(config.get<string>("palette", "auto"));
        const rawCustom = config.get<unknown>("palette.customColors", {});
        const custom = rawCustom && typeof rawCustom === "object" &&
            !Array.isArray(rawCustom)
            ? rawCustom as Record<string, unknown> : {};
        const result = paletteColors(setting, themeKind(), custom);
        if (result.invalidKeys.length > 0) {
            const signature = JSON.stringify(result.invalidKeys.map(
                (key) => [key, custom[key]]));
            if (!reportedInvalidColors.has(signature)) {
                reportedInvalidColors.add(signature);
                const message = "Invalid Mark Your Scope color: " +
                    result.invalidKeys.join(", ") +
                    ". Palette defaults are used for those values.";
                output.appendLine(message);
                void vscode.window.showWarningMessage(message);
            }
        }
        return decorations.get(editor, result.colors);
    }

    function paintRange(
        editor: vscode.TextEditor,
        types: DecorationSet,
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
            types.scopeBalanced, background === "balanced" ? ranges : []);
        editor.setDecorations(
            types.scopeFocus, background === "focus" ? ranges : []);
        editor.setDecorations(
            types.start,
            visible.some((range) => range.startLine <= start &&
                start <= range.endLine) ? [lineRange(document, start)] : [],
        );
        editor.setDecorations(
            types.end,
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

    function editorConfiguration(
        editor: vscode.TextEditor,
    ): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("markYourScope", {
            uri: editor.document.uri,
            languageId: editor.document.languageId,
        });
    }

    function focusedScope(
        editor: vscode.TextEditor,
        analysis: ScopeAnalysis | null,
        target: "block" | "expression",
    ): Scope | undefined {
        const focus = editorFocus.get(editor);
        const current = editor.selection.active;
        const retained = focus?.anchor.isEqual(current) ? focus : undefined;
        if (retained?.pinnedScope) return retained.pinnedScope;
        const origin = retained?.origin ?? current;
        const candidates = analysis
            ? scopesAt(analysis.scopes, editor.document.offsetAt(origin), target)
            : [];
        return candidates[Math.min(
            retained?.parentIndex ?? 0, candidates.length - 1)];
    }

    function navigableScope(editor: vscode.TextEditor): Scope | undefined {
        const config = editorConfiguration(editor);
        if (!config.get<boolean>("enabled", true) ||
            config.get<string[]>("excludedLanguages", []).includes(
                editor.document.languageId) ||
            config.get<string>("mode", "balanced") === "off" ||
            !scopeToggleEnabled ||
            config.get<string>("focus.target", "block") === "lines" ||
            analysisScheduler.isPending(
                editor.document.uri.toString(), editor.document.version)) {
            return undefined;
        }
        const target = focusTarget(config.get<string>(
            "focus.target", "block"));
        return focusedScope(editor, analyze(editor.document),
            target === "expression" ? "expression" : "block");
    }

    function navigateScope(action: "start" | "end" | "select"): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const scope = navigableScope(editor);
        if (!scope) return;
        const focus = editorFocus.get(editor);
        const current = editor.selection.active;
        const retained = focus?.anchor.isEqual(current) ? focus : undefined;
        const start = editor.document.positionAt(scope.start);
        const end = editor.document.positionAt(scope.end);
        const destination = action === "start" ? start :
            editor.document.positionAt(scopeEndOffset(
                editor.document.getText(), scope));
        const selection = action === "select"
            ? new vscode.Selection(start, end)
            : new vscode.Selection(destination, destination);
        editorFocus.set(editor, {
            anchor: selection.active,
            origin: retained?.origin ?? current,
            parentIndex: retained?.parentIndex ?? 0,
            pinnedScope: scope,
            expectedSelection: selection,
        });
        editor.selections = [selection, ...editor.selections.slice(1)];
        editor.revealRange(selection,
            vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        render(editor);
    }

    type PaletteLocation = vscode.QuickPickItem & {
        target: vscode.ConfigurationTarget;
        inLanguage: boolean;
    };

    function paletteLocations(
        editor: vscode.TextEditor,
        config: vscode.WorkspaceConfiguration,
    ): PaletteLocation[] {
        const inspected = config.inspect<string>("palette");
        const locations: PaletteLocation[] = [{
            label: "User settings",
            description: inspected?.globalLanguageValue !== undefined
                ? "Current language override" : undefined,
            target: vscode.ConfigurationTarget.Global,
            inLanguage: inspected?.globalLanguageValue !== undefined,
        }];
        if (vscode.workspace.workspaceFolders?.length) {
            locations.push({
                label: "Workspace settings",
                description: inspected?.workspaceLanguageValue !== undefined
                    ? "Current language override" : undefined,
                target: vscode.ConfigurationTarget.Workspace,
                inLanguage: inspected?.workspaceLanguageValue !== undefined,
            });
        }
        const folder = vscode.workspace.getWorkspaceFolder(
            editor.document.uri);
        if (folder && (vscode.workspace.workspaceFolders?.length ?? 0) > 1) {
            locations.push({
                label: `Folder: ${folder.name}`,
                description:
                    inspected?.workspaceFolderLanguageValue !== undefined
                        ? "Current language override" : undefined,
                target: vscode.ConfigurationTarget.WorkspaceFolder,
                inLanguage:
                    inspected?.workspaceFolderLanguageValue !== undefined,
            });
        }
        return locations;
    }

    function previewPalette(
        editor: vscode.TextEditor,
        palette?: PaletteId,
    ): void {
        if (palette) palettePreview.set(editor, palette);
        else palettePreview.delete(editor);
        if (vscode.window.visibleTextEditors.includes(editor)) render(editor);
    }

    async function choosePalette(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const config = editorConfiguration(editor);
        const items: Array<vscode.QuickPickItem & {
            id: PaletteId;
        }> = [
            { label: "Auto", id: "auto" },
            { label: "Dark Soft", id: "darkSoft" },
            { label: "Light Soft", id: "lightSoft" },
            { label: "High Contrast", id: "highContrast" },
            { label: "Monochrome", id: "monochrome" },
        ];
        const picker = vscode.window.createQuickPick<typeof items[number]>();
        picker.items = items;
        picker.placeholder = "Preview a palette; Esc restores the original";
        picker.activeItems = items.filter((item) => item.id ===
            paletteId(config.get<string>("palette", "auto")));
        const selected = await new Promise<PaletteId | undefined>(
            (resolve) => {
                let accepted: PaletteId | undefined;
                picker.onDidChangeActive(([item]) => {
                    if (item) previewPalette(editor, item.id);
                });
                picker.onDidAccept(() => {
                    accepted = (picker.selectedItems[0] ??
                        picker.activeItems[0])?.id;
                    picker.hide();
                });
                picker.onDidHide(() => {
                    picker.dispose();
                    resolve(accepted);
                });
                picker.show();
            });
        if (!selected) {
            previewPalette(editor);
            return;
        }
        const location = await vscode.window.showQuickPick(
            paletteLocations(editor, config),
            { placeHolder: "Save palette in" },
        );
        if (!location) {
            previewPalette(editor);
            return;
        }
        try {
            await config.update(
                "palette", selected, location.target,
                location.inLanguage);
        } catch (error) {
            void vscode.window.showErrorMessage(
                `Could not save palette: ${String(error)}`);
        } finally {
            previewPalette(editor);
        }
    }

    async function resetPalette(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const config = editorConfiguration(editor);
        const location = await vscode.window.showQuickPick(
            paletteLocations(editor, config),
            { placeHolder: "Reset palette in" },
        );
        if (!location) return;
        try {
            await config.update(
                "palette", undefined, location.target,
                location.inLanguage);
        } catch (error) {
            void vscode.window.showErrorMessage(
                `Could not reset palette: ${String(error)}`);
        }
    }

    function render(editor: vscode.TextEditor): void {
        const document = editor.document;
        const config = editorConfiguration(editor);
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
        const types = editorTypes(editor, config);

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
        editor.setDecorations(types.indentLine, guides);
        editor.setDecorations(types.indentBandEven, evenBands);
        editor.setDecorations(types.indentBandOdd, oddBands);

        if (!display.showScope) {
            clearScope(editor, types);
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
            paintRange(
                editor, types, start, end, display.scopeBackground);
            if (editor === vscode.window.activeTextEditor) {
                status.text = `Scope: 주변 L${start + 1}–L${end + 1}`;
                status.show();
            }
            return;
        }

        if (analysisScheduler.isPending(
            document.uri.toString(), document.version)) {
            clearScope(editor, types);
            if (editor === vscode.window.activeTextEditor) {
                status.text = "Scope: 분석 중";
                status.show();
            }
            return;
        }

        const analysis = analyze(document);
        const focus = editorFocus.get(editor);
        const retained = focus?.anchor.isEqual(anchor) ? focus : undefined;
        editorFocus.set(editor, retained ?? {
            anchor, origin: anchor, parentIndex: 0,
        });
        const scope = focusedScope(editor, analysis, display.target);
        if (!scope) {
            clearScope(editor, types);
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
        paintRange(editor, types, start, end, display.scopeBackground);
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
            "markYourScope.choosePalette", choosePalette),
        vscode.commands.registerCommand(
            "markYourScope.resetPalette", resetPalette),
        vscode.commands.registerCommand(
            "markYourScope.goToScopeStart",
            () => navigateScope("start")),
        vscode.commands.registerCommand(
            "markYourScope.goToScopeEnd",
            () => navigateScope("end")),
        vscode.commands.registerCommand(
            "markYourScope.selectScope",
            () => navigateScope("select")),
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
                const retained = focus?.anchor.isEqual(
                    editor.selection.active) ? focus : undefined;
                editorFocus.set(editor, {
                    anchor: editor.selection.active,
                    origin: retained?.origin ?? editor.selection.active,
                    parentIndex: (retained?.parentIndex ?? 0) + 1,
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
            if (focus) {
                if (focus.expectedSelection?.isEqual(event.selections[0])) {
                    focus.expectedSelection = undefined;
                } else if (!focus.anchor.isEqual(
                    event.selections[0].active)) {
                    editorFocus.delete(event.textEditor);
                }
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
            for (const editor of previousVisible) {
                if (!editors.includes(editor)) {
                    decorations.release(editor);
                    palettePreview.delete(editor);
                }
            }
            previousVisible = new Set(editors);
            renderAll();
        }),
        vscode.window.onDidChangeActiveColorTheme(() => renderAll()),
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
            if (event.affectsConfiguration("markYourScope.focus.target")) {
                editorFocus.clear();
            }
            if (event.affectsConfiguration("markYourScope")) renderAll();
        }),
    );

    renderAll();
}
