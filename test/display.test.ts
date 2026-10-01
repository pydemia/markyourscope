import assert from "node:assert/strict";
import test from "node:test";
import { resolveDisplay } from "../src/display";

test("structure mode uses background unless explicitly overridden", () => {
    const base = {
        enabled: true,
        mode: "structure" as const,
        scopeToggleEnabled: true,
        target: "block" as const,
        contextLines: 3,
    };
    assert.deepEqual(resolveDisplay(base), {
        indentationStyle: "background",
        showScope: true,
        scopeBackground: "none",
        target: "block",
        contextLines: 3,
    });
    assert.equal(resolveDisplay({
        ...base, explicitIndentationStyle: "line",
    }).indentationStyle, "line");
});

test("off mode overrides settings while toggle affects scope only", () => {
    const base = {
        enabled: true,
        mode: "balanced" as const,
        explicitIndentationStyle: "background" as const,
        scopeToggleEnabled: false,
        target: "lines" as const,
        contextLines: 999,
    };
    assert.deepEqual(resolveDisplay(base), {
        indentationStyle: "background",
        showScope: false,
        scopeBackground: "balanced",
        target: "lines",
        contextLines: 100,
    });
    const off = resolveDisplay({ ...base, mode: "off" });
    assert.equal(off.indentationStyle, "off");
    assert.equal(off.showScope, false);
});
