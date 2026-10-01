import { performance } from "node:perf_hooks";
import { analyzeScopes, scopesAt } from "../src/scope";

const samples = {
    typescript: Array.from({ length: 2_500 }, (_, index) =>
        `function f${index}() {\n    if (ready) { save(); }\n}\n\n`)
        .join(""),
    python: Array.from({ length: 2_500 }, (_, index) =>
        `def f${index}():\n    if ready:\n        save()\n\n`)
        .join(""),
};

for (const [language, text] of Object.entries(samples)) {
    const started = performance.now();
    const analysis = analyzeScopes(text, language);
    const parseMs = performance.now() - started;
    const durations: number[] = [];
    for (let index = 0; index < 500; index++) {
        const offset = Math.floor(text.length * index / 500);
        const before = performance.now();
        scopesAt(analysis.scopes, offset, "block");
        durations.push(performance.now() - before);
    }
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
    console.log(JSON.stringify({
        language,
        lines: text.split("\n").length - 1,
        scopes: analysis.scopes.length,
        parseMs: Number(parseMs.toFixed(2)),
        selectionP95Ms: Number(p95.toFixed(3)),
    }));
}
