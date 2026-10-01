import { parser as pythonParser } from "@lezer/python";
import * as ts from "typescript";

export interface Scope {
    kind: string;
    start: number;
    end: number;
    level: "block" | "expression";
}

export type ScopeAnalysis =
    | { state: "supported"; scopes: Scope[] }
    | { state: "unsupported"; scopes: [] }
    | { state: "unresolved"; scopes: Scope[] }
    | { state: "failed"; scopes: [] };

const scriptKinds: Record<string, ts.ScriptKind> = {
    javascript: ts.ScriptKind.JS,
    typescript: ts.ScriptKind.TS,
    json: ts.ScriptKind.JSON,
};

function blockKind(parent: ts.Node): string {
    if (ts.isIfStatement(parent)) return "if";
    if (ts.isForStatement(parent) || ts.isForInStatement(parent) ||
        ts.isForOfStatement(parent)) return "for";
    if (ts.isWhileStatement(parent) || ts.isDoStatement(parent)) {
        return "while";
    }
    if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) ||
        ts.isArrowFunction(parent) || ts.isMethodDeclaration(parent) ||
        ts.isConstructorDeclaration(parent)) return "function";
    if (ts.isTryStatement(parent)) return "try";
    if (ts.isCatchClause(parent)) return "catch";
    return "block";
}

function parseTypeScript(text: string, language: string): ScopeAnalysis {
    if (language === "json") {
        try {
            JSON.parse(text);
        } catch {
            return { state: "unresolved", scopes: [] };
        }
    }
    const fileName = `scope.${language === "json" ? "json" :
        language === "javascript" ? "js" : "ts"}`;
    const source = ts.createSourceFile(
        fileName,
        text,
        ts.ScriptTarget.Latest,
        true,
        scriptKinds[language],
    );
    const host: ts.CompilerHost = {
        getSourceFile: (name) => name === fileName ? source : undefined,
        getDefaultLibFileName: () => "",
        writeFile: () => undefined,
        getCurrentDirectory: () => "",
        getDirectories: () => [],
        fileExists: (name) => name === fileName,
        readFile: (name) => name === fileName ? text : undefined,
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: (name) => name,
        getNewLine: () => "\n",
    };
    const diagnostics = language === "json" ? [] : ts.createProgram([fileName], {
        allowJs: language === "javascript",
        noLib: true,
        noResolve: true,
    }, host).getSyntacticDiagnostics(source)
    if (diagnostics.some((diagnostic) => diagnostic.start === undefined)) {
        return { state: "unresolved", scopes: [] };
    }
    const errors = diagnostics
        .filter((diagnostic) => diagnostic.start !== undefined)
        .map((diagnostic) => ({
            start: diagnostic.start!,
            end: diagnostic.start! + (diagnostic.length ?? 0),
        }));
    const scopes: Scope[] = [];

    function visit(node: ts.Node): void {
        if (ts.isBlock(node) && node.parent &&
            text[node.getStart(source)] === "{" &&
            text[node.end - 1] === "}") {
            const parent = node.parent;
            const isElse = ts.isIfStatement(parent) &&
                parent.elseStatement === node;
            const isFinally = ts.isTryStatement(parent) &&
                parent.finallyBlock === node;
            scopes.push({
                kind: isElse ? "else" : isFinally ? "finally" :
                    blockKind(parent),
                start: isElse || isFinally
                    ? node.getStart(source) : parent.getStart(source),
                end: node.end,
                level: "block",
            });
        } else if (ts.isClassDeclaration(node) &&
            text[node.end - 1] === "}") {
            scopes.push({
                kind: "class",
                start: node.getStart(source),
                end: node.end,
                level: "block",
            });
        }

        if (ts.isCallExpression(node) && text[node.end - 1] === ")") {
            scopes.push({
                kind: "call",
                start: node.getStart(source),
                end: node.end,
                level: "expression",
            });
        } else if (ts.isArrayLiteralExpression(node) &&
            text[node.end - 1] === "]") {
            scopes.push({
                kind: "array",
                start: node.getStart(source),
                end: node.end,
                level: language === "json" ? "block" : "expression",
            });
        } else if (ts.isObjectLiteralExpression(node) &&
            text[node.end - 1] === "}") {
            scopes.push({
                kind: "object",
                start: node.getStart(source),
                end: node.end,
                level: language === "json" ? "block" : "expression",
            });
        }

        ts.forEachChild(node, visit);
    }

    visit(source);
    return {
        state: errors.length > 0 ? "unresolved" : "supported",
        scopes: scopes.filter((scope) => !errors.some((error) =>
            scope.start <= error.start && error.end <= scope.end)),
    };
}

const pythonBlocks: Record<string, string> = {
    FunctionDefinition: "function",
    ClassDefinition: "class",
    IfStatement: "if",
    ForStatement: "for",
    WhileStatement: "while",
    TryStatement: "try",
    WithStatement: "with",
};

const pythonExpressions: Record<string, string> = {
    CallExpression: "call",
    ArrayExpression: "array",
    DictionaryExpression: "object",
};

function parsePython(text: string): ScopeAnalysis {
    const tree = pythonParser.parse(text);
    const scopes: Scope[] = [];
    const errors: Array<{ from: number; to: number }> = [];
    tree.iterate({
        enter(node) {
            if (node.type.isError) {
                errors.push({ from: node.from, to: node.to });
            }
        },
    });

    tree.iterate({
        enter(node) {
            const blockKind = pythonBlocks[node.name];
            const expressionKind = pythonExpressions[node.name];
            if (!blockKind && !expressionKind) return;
            const hasError = errors.some((error) =>
                node.from <= error.from && error.to <= node.to);
            if (hasError) return;
            scopes.push({
                kind: blockKind || expressionKind,
                start: node.from,
                end: node.to,
                level: blockKind ? "block" : "expression",
            });
        },
    });
    return {
        state: errors.length > 0 ? "unresolved" : "supported",
        scopes,
    };
}

/** Return parser-confirmed scopes; never infer blocks from indentation alone. */
export function analyzeScopes(text: string, language: string): ScopeAnalysis {
    if (language === "python") return parsePython(text);
    if (scriptKinds[language] !== undefined) {
        return parseTypeScript(text, language);
    }
    return { state: "unsupported", scopes: [] };
}

/** The first scope is the cursor default; later entries are its parents. */
export function scopesAt(
    scopes: readonly Scope[],
    offset: number,
    target: "block" | "expression",
): Scope[] {
    return scopes
        .filter((scope) => scope.start <= offset && offset < scope.end &&
            (target === "expression" || scope.level === "block"))
        .sort((a, b) =>
            (a.end - a.start) - (b.end - b.start) ||
            b.start - a.start || a.kind.localeCompare(b.kind));
}
