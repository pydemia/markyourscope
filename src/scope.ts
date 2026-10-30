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
            const clauseKeyword = isElse || isFinally
                ? parent.getChildren(source).find((child) => child.kind ===
                    (isElse ? ts.SyntaxKind.ElseKeyword :
                        ts.SyntaxKind.FinallyKeyword))
                : undefined;
            scopes.push({
                kind: isElse ? "else" : isFinally ? "finally" :
                    blockKind(parent),
                start: isElse || isFinally
                    ? clauseKeyword?.getStart(source) ?? node.getStart(source)
                    : parent.getStart(source),
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

        if ((ts.isCallExpression(node) || ts.isNewExpression(node)) &&
            text[node.end - 1] === ")") {
            scopes.push({
                kind: "call",
                start: node.getStart(source),
                end: node.end,
                level: "block",
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

        if (language !== "json") {
            if (ts.isReturnStatement(node)) {
                scopes.push({
                    kind: "return",
                    start: node.getStart(source),
                    end: node.end,
                    level: "block",
                });
            } else if (ts.isVariableDeclaration(node) && node.initializer) {
                scopes.push({
                    kind: "assignment",
                    start: node.name.getStart(source),
                    end: node.end,
                    level: "block",
                });
            } else if (ts.isBinaryExpression(node) &&
                node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
                node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
                scopes.push({
                    kind: "assignment",
                    start: node.getStart(source),
                    end: node.end,
                    level: "block",
                });
            }

            if (ts.isCallExpression(node) || ts.isNewExpression(node) ||
                ts.isParenthesizedExpression(node) || ts.isFunctionLike(node) ||
                ts.isIfStatement(node) || ts.isWhileStatement(node) ||
                ts.isDoStatement(node) || ts.isForStatement(node) ||
                ts.isForInStatement(node) || ts.isForOfStatement(node) ||
                ts.isSwitchStatement(node) || ts.isCatchClause(node)) {
                const children = node.getChildren(source);
                const opening = children.find((child) =>
                    child.kind === ts.SyntaxKind.OpenParenToken);
                const closing = [...children].reverse().find((child) =>
                    child.kind === ts.SyntaxKind.CloseParenToken);
                if (opening && closing &&
                    text[opening.getStart(source)] === "(" &&
                    text[closing.getStart(source)] === ")" &&
                    opening.end <= closing.getStart(source)) {
                    scopes.push({
                        kind: ts.isCallExpression(node) || ts.isNewExpression(node)
                            ? "arguments" : ts.isFunctionLike(node)
                                ? "parameters" : "parentheses",
                        start: opening.getStart(source),
                        end: closing.end,
                        level: "block",
                    });
                }
            }
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

const pythonNestedScopes: Record<string, string> = {
    CallExpression: "call",
    ArrayExpression: "array",
    DictionaryExpression: "object",
    ParenthesizedExpression: "parentheses",
    ArgList: "arguments",
    ParamList: "parameters",
    ReturnStatement: "return",
    AssignStatement: "assignment",
    AugAssignStatement: "assignment",
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
            const nestedKind = pythonNestedScopes[node.name];
            if (blockKind || nestedKind) {
                scopes.push({
                    kind: blockKind || nestedKind,
                    start: node.from,
                    end: node.to,
                    level: node.name === "ArrayExpression" ||
                        node.name === "DictionaryExpression"
                        ? "expression" : "block",
                });
            }

            if (node.name === "IfStatement" ||
                node.name === "TryStatement" ||
                node.name === "ForStatement" ||
                node.name === "WhileStatement") {
                const clauses: Scope[] = [];
                let kind = `${blockKind} clause`;
                let start = node.from;
                for (let child = node.node.firstChild; child;
                    child = child.nextSibling) {
                    if (child.name === "elif" || child.name === "else" ||
                        child.name === "except" || child.name === "finally") {
                        kind = child.name;
                        start = child.from;
                    } else if (child.name === "Body") {
                        clauses.push({
                            kind, start, end: child.to, level: "block",
                        });
                    }
                }
                if (clauses.length > 1) scopes.push(...clauses);
            }
        },
    });
    return {
        state: errors.length > 0 ? "unresolved" : "supported",
        scopes: scopes.filter((scope) => !errors.some((error) =>
            scope.start <= error.from && error.to <= scope.end)),
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
