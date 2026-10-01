import assert from "node:assert/strict";
import test from "node:test";
import { analyzeScopes, scopesAt } from "../src/scope";

test("Python selects nested blocks without treating calls as blocks", () => {
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
        ["if", "for", "function"],
    );
    assert.equal(
        scopesAt(result.scopes, text.indexOf("save(item)"), "expression")[0]
            .kind,
        "call",
    );
});

test("Python multiline argument alignment is not a block", () => {
    const text = "result = send(\n        value,\n    )\n";
    const result = analyzeScopes(text, "python");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("value"), "block"),
        [],
    );
    assert.equal(
        scopesAt(result.scopes, text.indexOf("value"), "expression")[0]
            .kind,
        "call",
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
        ["if", "function"],
    );
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("fake();"), "block"),
        [],
    );
});

test("TypeScript else branch is separate from the if branch", () => {
    const text = "if (ready) { save(); } else { retry(); }";
    const result = analyzeScopes(text, "typescript");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("retry"), "block")
            .map((scope) => scope.kind),
        ["else"],
    );
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

test("Unclosed TypeScript block is not selected", () => {
    const text = "function run() {\n    save();\n";
    const result = analyzeScopes(text, "typescript");
    assert.deepEqual(
        scopesAt(result.scopes, text.indexOf("save"), "block"),
        [],
    );
});

test("Unsupported language has a distinct state", () => {
    assert.deepEqual(analyzeScopes("a:\n    b\n", "yaml"), {
        state: "unsupported",
        scopes: [],
    });
});
