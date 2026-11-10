import assert from "node:assert/strict";
import test from "node:test";
import {
    indentationBands,
    indentationGuides,
    indentationCharacterAtVisualColumn,
    indentationWarning,
    scopeRailColumn,
} from "../src/indentation";

test("guides follow visual tab stops rather than character count", () => {
    assert.deepEqual(
        indentationGuides(["    item", "\titem", "  \t    item"], 8, 4),
        [
            { line: 8, character: 0 },
            { line: 9, character: 0 },
            { line: 10, character: 0 },
            { line: 10, character: 3 },
        ],
    );
});

test("partial indentation keeps the first guide, invalid tab size adds none", () => {
    assert.deepEqual(indentationGuides(["   item"], 0, 4), [
        { line: 0, character: 0 },
    ]);
    assert.deepEqual(indentationGuides(["    item"], 0, 0), []);
    assert.deepEqual(indentationGuides(["    "], 0, 4), [
        { line: 0, character: 0 },
    ]);
});

test("guides use indent size and never shift a guide inside a tab", () => {
    assert.deepEqual(indentationGuides([
        "    item", "\titem", "  \t    item", "   item",
    ], 0, 4, 2), [
        { line: 0, character: 0 },
        { line: 0, character: 2 },
        { line: 1, character: 0 },
        { line: 2, character: 0 },
        { line: 2, character: 2 },
        { line: 2, character: 3 },
        { line: 2, character: 5 },
        { line: 3, character: 0 },
        { line: 3, character: 2 },
    ]);
    assert.deepEqual(indentationGuides(["   item"], 0, 4, 4), [
        { line: 0, character: 0 },
    ]);
});

test("scope rails start at the indentation guide column", () => {
    assert.equal(scopeRailColumn("    if ready:", 4, 4), 4);
    assert.equal(scopeRailColumn("\tif ready:", 4, 4), 4);
    assert.equal(scopeRailColumn("   if ready:", 4, 4), 4);
    assert.equal(scopeRailColumn("if ready:", 4, 4), 0);
    assert.equal(scopeRailColumn("    ", 4, 4), undefined);
    assert.equal(indentationCharacterAtVisualColumn("        item", 4, 4),
        4);
    assert.equal(indentationCharacterAtVisualColumn("\t\titem", 4, 4),
        1);
    assert.equal(indentationCharacterAtVisualColumn("\titem", 2, 4),
        undefined);
});

test("background bands end at completed visual tab stops", () => {
    assert.deepEqual(indentationBands(["  \t    item", "   item"], 5, 4), [
        { line: 5, start: 0, end: 3, level: 1 },
        { line: 5, start: 3, end: 7, level: 2 },
    ]);
});

test("optional indentation warnings distinguish mixed and unaligned", () => {
    assert.equal(indentationWarning(" \titem", 4, "off"), undefined);
    assert.deepEqual(indentationWarning(" \titem", 4, "mixed"), {
        start: 0, end: 2, reason: "mixed",
    });
    assert.equal(indentationWarning("  item", 4, "mixed"), undefined);
    assert.deepEqual(indentationWarning("  item", 4, "all"), {
        start: 0, end: 2, reason: "unaligned",
    });
    assert.equal(indentationWarning("  item", 4, "all", 2), undefined);
    assert.deepEqual(indentationWarning("   item", 4, "all", 2), {
        start: 0, end: 3, reason: "unaligned",
    });
    assert.equal(indentationWarning("\titem", 4, "all"), undefined);
    assert.equal(indentationWarning("  ", 4, "all"), undefined);
});
