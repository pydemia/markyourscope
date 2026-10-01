import assert from "node:assert/strict";
import test from "node:test";
import { paletteColors, paletteId } from "../src/palette";

test("auto follows light and high contrast themes", () => {
    const light = paletteColors("auto", "light").colors;
    assert.equal(light.boundary, "#4A6074");
    const highContrast = paletteColors(
        "auto", "highContrastLight").colors;
    assert.equal(highContrast.boundary, "#000000");
    assert.equal(paletteId("unknown"), "auto");
});

test("invalid custom color falls back only for that key", () => {
    const result = paletteColors("darkSoft", "dark", {
        boundary: "#123456",
        scopeFocus: "red",
    });
    assert.equal(result.colors.boundary, "#123456");
    assert.equal(result.colors.scopeFocus,
        "rgba(128, 128, 128, 0.16)");
    assert.deepEqual(result.invalidKeys, ["scopeFocus"]);
});
