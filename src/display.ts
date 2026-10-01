export type DisplayMode = "balanced" | "structure" | "focus" | "off";
export type IndentationStyle = "line" | "background" | "off";
export type FocusTarget = "block" | "expression" | "lines";

export interface DisplayInput {
    enabled: boolean;
    mode: DisplayMode;
    explicitIndentationStyle?: IndentationStyle;
    scopeToggleEnabled: boolean;
    target: FocusTarget;
    contextLines: number;
}

export interface DisplayState {
    indentationStyle: IndentationStyle;
    showScope: boolean;
    scopeBackground: "balanced" | "focus" | "none";
    target: FocusTarget;
    contextLines: number;
}

/** Apply hard-off states before mode defaults and explicit detail settings. */
export function resolveDisplay(input: DisplayInput): DisplayState {
    if (!input.enabled || input.mode === "off") {
        return {
            indentationStyle: "off",
            showScope: false,
            scopeBackground: "none",
            target: input.target,
            contextLines: input.contextLines,
        };
    }
    const defaultIndentation = input.mode === "structure"
        ? "background" : "line";
    return {
        indentationStyle: input.explicitIndentationStyle ??
            defaultIndentation,
        showScope: input.scopeToggleEnabled,
        scopeBackground: input.mode === "structure" ? "none" :
            input.mode === "focus" ? "focus" : "balanced",
        target: input.target,
        contextLines: Math.max(0, Math.min(100, input.contextLines)),
    };
}
