import assert from "node:assert/strict";
import test from "node:test";
import { indentationGuides } from "../src/indentation";

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
