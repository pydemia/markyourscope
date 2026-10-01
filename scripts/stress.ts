import { performance } from "node:perf_hooks";
import { analyzeScopes } from "../src/scope";

const cases = [
    {
        name: "typescript-long-line",
        language: "typescript",
        text: `const value = "${"x".repeat(1_000_000)}";\n`,
    },
    {
        name: "typescript-deep-nesting",
        language: "typescript",
        text: "function run() {\n" +
            "if (ready) {\n".repeat(2_000) +
            "save();\n" + "}\n".repeat(2_001),
    },
    {
        name: "typescript-many-errors",
        language: "typescript",
        text: "if (ready) { save( }\n".repeat(3_000),
    },
    {
        name: "python-many-errors",
        language: "python",
        text: "def run():\n    save(\n".repeat(3_000),
    },
];

for (const sample of cases) {
    const started = performance.now();
    try {
        const analysis = analyzeScopes(sample.text, sample.language);
        console.log(JSON.stringify({
            name: sample.name,
            lines: sample.text.split("\n").length - 1,
            bytes: Buffer.byteLength(sample.text, "utf8"),
            ms: Number((performance.now() - started).toFixed(2)),
            state: analysis.state,
            scopes: analysis.scopes.length,
        }));
    } catch (error) {
        console.log(JSON.stringify({
            name: sample.name,
            lines: sample.text.split("\n").length - 1,
            bytes: Buffer.byteLength(sample.text, "utf8"),
            ms: Number((performance.now() - started).toFixed(2)),
            error: String(error),
        }));
    }
}
