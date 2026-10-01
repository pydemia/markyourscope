import assert from "node:assert/strict";
import test from "node:test";
import { scopeEndOffset } from "../src/navigation";
import type { Scope } from "../src/scope";

const scope = (end: number): Scope => ({
    kind: "block", start: 0, end, level: "block",
});

test("end navigation skips trailing whitespace", () => {
    assert.equal(scopeEndOffset("if x:\n    run()\n", scope(16)), 14);
});

test("end navigation lands at a complete Unicode character", () => {
    assert.equal(scopeEndOffset("call(🦊)", scope(8)), 7);
    assert.equal(scopeEndOffset("🦊", scope(2)), 0);
});
