import assert from "node:assert/strict";
import test from "node:test";
import {
    indentationBands,
    indentationGuides,
    indentationWarning,
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

test("non-multiple alignment and invalid tab size add no false guide", () => {
    assert.deepEqual(indentationGuides(["   item"], 0, 4), []);
    assert.deepEqual(indentationGuides(["    item"], 0, 0), []);
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
    assert.equal(indentationWarning("\titem", 4, "all"), undefined);
    assert.equal(indentationWarning("  ", 4, "all"), undefined);
});
