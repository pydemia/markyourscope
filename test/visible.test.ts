import assert from "node:assert/strict";
import test from "node:test";
import { visibleLineIntersections } from "../src/visible";

test("scope decoration stays inside disjoint visible ranges", () => {
    assert.deepEqual(visibleLineIntersections(
        { startLine: 3, endLine: 30 },
        [
            { start: { line: 0, character: 0 },
                end: { line: 9, character: 8 } },
            { start: { line: 20, character: 0 },
                end: { line: 40, character: 0 } },
        ],
    ), [
        { startLine: 3, endLine: 9 },
        { startLine: 20, endLine: 30 },
    ]);
});

test("a range ending at the next line start excludes that line", () => {
    assert.deepEqual(visibleLineIntersections(
        { startLine: 8, endLine: 12 },
        [{ start: { line: 0, character: 0 },
            end: { line: 8, character: 0 } }],
    ), []);
});
