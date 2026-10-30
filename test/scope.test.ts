import assert from "node:assert/strict";
import test from "node:test";
import { analyzeScopes, scopesAt } from "../src/scope";

test("Python selects nested call and structural scopes", () => {
    const text = [
        "def process(items):",
        "    for item in items:",
        "        if item.valid:",
        "            save(item)",
        "",
    ].join("\n");
    const result = analyzeScopes(text, "python");
    assert.equal(result.state, "supported");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("save(item)"), "block")
            .map((scope) => scope.kind),
        ["call", "if", "for", "function"],
    );
    assert.equal(
        scopesAt(result.scopes, text.indexOf("save(item)"), "expression")[0]
            .kind,
        "call",
    );
});

test("Python multiline argument scope follows parentheses rather than indentation", () => {
    const text = "result = send(\n        value,\n    )\n";
    const result = analyzeScopes(text, "python");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("value"), "block")
            .map((scope) => scope.kind),
        ["arguments", "call", "assignment"],
    );
    assert.equal(
        scopesAt(result.scopes, text.indexOf("value"), "expression")[0]
            .kind,
        "arguments",
    );
});

test("Python incomplete call does not leave a broad false block", () => {
    const text = "def broken():\n    if x:\n        save(\n";
    const result = analyzeScopes(text, "python");
    assert.equal(result.state, "unresolved");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("save"), "block"),
        [],
    );
});

test("TypeScript ignores braces in strings and comments", () => {
    const text = [
        "const example = 'if (x) { fake(); }';",
        "// { not a block }",
        "function run() {",
        "    if (ready) { save(); }",
        "}",
    ].join("\n");
    const result = analyzeScopes(text, "typescript");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("save();"), "block")
            .map((scope) => scope.kind),
        ["call", "if", "function"],
    );
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("fake();"), "block")
            .map((scope) => scope.kind),
        ["assignment"],
    );
});

test("TypeScript else branch is separate from the if branch", () => {
    const text = "if (ready) { save(); } else { retry(); }";
    const result = analyzeScopes(text, "typescript");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("retry"), "block")
            .map((scope) => scope.kind),
        ["call", "else"],
    );
});

test("TypeScript clause scopes start at else and finally keywords", () => {
    const text = [
        "if (ready) { save(); }",
        "else { retry(); }",
        "try { work(); }",
        "catch (error) { recover(); }",
        "finally { cleanup(); }",
    ].join("\n");
    const scopes = analyzeScopes(text, "typescript").scopes;
    assert.equal(scopes.find((scope) => scope.kind === "else")?.start,
        text.indexOf("else"));
    assert.equal(scopes.find((scope) => scope.kind === "catch")?.start,
        text.indexOf("catch"));
    assert.equal(scopes.find((scope) => scope.kind === "finally")?.start,
        text.indexOf("finally"));
});

test("Class and method scopes remain parents of nested return and call scopes", () => {
    for (const [language, text, needle] of [
        ["typescript", "class Job { run() { return send(); } }", "send"],
        ["python", "class Job:\n    def run(self):\n        return send()\n", "send"],
    ]) {
        assert.deepEqual(scopesAt(
            analyzeScopes(text, language).scopes,
            text.indexOf(needle), "block",
        ).map((scope) => scope.kind),
        ["call", "return", "function", "class"]);
    }
});

test("JSON objects and arrays are structural scopes", () => {
    const text = '{"items": [{"enabled": true}]}';
    const result = analyzeScopes(text, "json");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("true"), "block")
            .map((scope) => scope.kind),
        ["object", "array", "object"],
    );
});

test("Collection scopes remain available in expression mode", () => {
    for (const [language, text, needle] of [
        ["typescript", "const result = [value];", "value"],
        ["python", "result = [value]\n", "value"],
    ]) {
        const scopes = analyzeScopes(text, language).scopes;
        assert.deepEqual(scopesAt(scopes, text.indexOf(needle), "block")
            .map((scope) => scope.kind), ["assignment"]);
        assert.deepEqual(scopesAt(scopes, text.indexOf(needle), "expression")
            .map((scope) => scope.kind), ["array", "assignment"]);
    }
});

test("Unclosed TypeScript block does not hide a valid nested call", () => {
    const text = "function run() {\n    save();\n";
    const result = analyzeScopes(text, "typescript");
    assert.deepEqual(scopesAt(result.scopes, text.indexOf("save"), "block")
        .map((scope) => scope.kind), ["call"]);
});

test("TypeScript syntax error suppresses its enclosing scope", () => {
    const broken = "if (ready) { save( }";
    const result = analyzeScopes(broken, "typescript");
    assert.equal(result.state, "unresolved");
    assert.deepEqual(scopesAt(result.scopes, broken.indexOf("save"), "block"), []);

    const repaired = "if (ready) { save(); }";
    const recovered = analyzeScopes(repaired, "typescript");
    assert.equal(recovered.state, "supported");
    assert.deepEqual(
        scopesAt(recovered.scopes, repaired.indexOf("save"), "block")
            .map((scope) => scope.kind),
        ["call", "if"],
    );
});

test("Syntax error in one block preserves a separate valid block", () => {
    const text = "if (bad) { save( }\nif (good) { retry(); }";
    const result = analyzeScopes(text, "javascript");
    assert.equal(result.state, "unresolved");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("retry"), "block")
            .map((scope) => scope.kind),
        ["call", "if"],
    );
});

test("JSON syntax error does not retain an enclosing object", () => {
    const text = '{"items": [1,]}';
    const result = analyzeScopes(text, "json");
    assert.equal(result.state, "unresolved");
    assert.deepEqual(scopesAt(result.scopes, text.indexOf("items"), "block"), []);
});

test("Unsupported language has a distinct state", () => {
    assert.deepEqual(analyzeScopes("a:\n    b\n", "yaml"), {
        state: "unsupported",
        scopes: [],
    });
});

test("Python exposes clause, assignment, return, and parenthesis scopes in block mode", () => {
    const text = [
        "def run(value):",
        "    if value:",
        "        return send(",
        "            (value),",
        "        )",
        "    elif other:",
        "        result = fetch(other)",
        "    else:",
        "        return None",
        "",
    ].join("\n");
    const result = analyzeScopes(text, "python");
    assert.equal(result.state, "supported");
    const kindsAt = (needle: string) => scopesAt(
        result.scopes, text.indexOf(needle), "block",
    ).map((scope) => scope.kind);
    assert.ok(kindsAt("value),").includes("parentheses"));
    assert.ok(kindsAt("value),").includes("arguments"));
    assert.ok(kindsAt("value),").includes("call"));
    assert.ok(kindsAt("return send").includes("return"));
    assert.ok(kindsAt("return send").includes("if clause"));
    assert.ok(kindsAt("result =").includes("assignment"));
    assert.ok(kindsAt("result =").includes("elif"));
    assert.ok(kindsAt("return None").includes("else"));
    assert.ok(kindsAt("value):").includes("parameters"));
    const elif = result.scopes.find((scope) => scope.kind === "elif");
    assert.equal(elif?.start, text.indexOf("elif other"));
    assert.ok(elif!.end <= text.indexOf("    else:"));
});

test("Python try clauses remain separate while the whole try stays navigable", () => {
    const text = [
        "try:",
        "    value = load()",
        "except ValueError:",
        "    return 1",
        "except TypeError:",
        "    return 2",
        "else:",
        "    value = 3",
        "finally:",
        "    cleanup()",
        "",
    ].join("\n");
    const result = analyzeScopes(text, "python");
    assert.equal(result.state, "supported");
    for (const [needle, expected] of [
        ["value = load", "try clause"],
        ["return 1", "except"],
        ["return 2", "except"],
        ["value = 3", "else"],
        ["cleanup", "finally"],
    ]) {
        const kinds = scopesAt(result.scopes, text.indexOf(needle), "block")
            .map((scope) => scope.kind);
        assert.ok(kinds.includes(expected), `${needle}: ${expected}`);
        assert.ok(kinds.includes("try"), `${needle}: parent try`);
    }
    assert.equal(result.scopes.filter((scope) => scope.kind === "except")
        .length, 2);
});

test("TypeScript exposes nested clauses, parentheses, return, and assignments in block mode", () => {
    const text = [
        "function run(value: number) {",
        "    if (value > 0) {",
        "        return send(",
        "            (value),",
        "        );",
        "    } else if (value < 0) {",
        "        const result = fetch(value);",
        "    } else {",
        "        result = 0;",
        "    }",
        "}",
    ].join("\n");
    const result = analyzeScopes(text, "typescript");
    assert.equal(result.state, "supported");
    const kindsAt = (needle: string) => scopesAt(
        result.scopes, text.indexOf(needle), "block",
    ).map((scope) => scope.kind);
    assert.ok(kindsAt("value: number").includes("parameters"));
    assert.ok(kindsAt("value > 0").includes("parentheses"));
    assert.ok(kindsAt("value),").includes("arguments"));
    assert.ok(kindsAt("value),").includes("call"));
    assert.ok(kindsAt("value),").includes("return"));
    assert.ok(kindsAt("result = fetch").includes("assignment"));
    assert.ok(kindsAt("result = fetch").includes("if"));
    assert.ok(kindsAt("result = 0").includes("assignment"));
    assert.ok(kindsAt("result = 0").includes("else"));
});

test("Invalid nested syntax does not create a call or argument scope", () => {
    const text = "function run() { return send( }";
    const result = analyzeScopes(text, "typescript");
    assert.equal(result.state, "unresolved");
    assert.deepEqual(scopesAt(result.scopes, text.indexOf("send"), "block")
        .map((scope) => scope.kind), ["return"]);
});
