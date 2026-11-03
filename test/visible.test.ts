import assert from "node:assert/strict";
import test from "node:test";
import {
    selectSpotlightLayers,
    subtractLineSpan,
    visibleLineIntersections,
} from "../src/visible";

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

test("spotlight leaves the parent visible and dims only outside lines", () => {
    const visible = [
        { startLine: 0, endLine: 9 },
        { startLine: 20, endLine: 24 },
    ];
    const parent = { startLine: 2, endLine: 7 };
    const current = { startLine: 4, endLine: 6 };
    assert.deepEqual(subtractLineSpan(visible, parent), [
        { startLine: 0, endLine: 1 },
        { startLine: 8, endLine: 9 },
        { startLine: 20, endLine: 24 },
    ]);
    assert.deepEqual(subtractLineSpan([parent], current), [
        { startLine: 2, endLine: 3 },
        { startLine: 7, endLine: 7 },
    ]);
});

test("inline parentheses do not consume visual depth or dim the file", () => {
    const spans = [
        { startLine: 2, endLine: 2 },
        { startLine: 2, endLine: 2 },
        { startLine: 2, endLine: 2 },
        { startLine: 0, endLine: 12 },
        { startLine: 0, endLine: 25 },
    ];
    assert.deepEqual(selectSpotlightLayers(spans, 3), [
        spans[0], spans[3], spans[4],
    ]);
    assert.deepEqual(selectSpotlightLayers(spans.slice(0, 3), 3), [
        spans[0],
    ]);
});

test("visual depth counts distinct line ranges", () => {
    const spans = [
        { startLine: 8, endLine: 9 },
        { startLine: 7, endLine: 10 },
        { startLine: 5, endLine: 14 },
        { startLine: 0, endLine: 20 },
    ];
    assert.deepEqual(selectSpotlightLayers(spans, 2), spans.slice(0, 2));
    assert.deepEqual(selectSpotlightLayers(spans, 3), spans.slice(0, 3));
});
