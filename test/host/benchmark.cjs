const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const vscode = require("vscode");

function percentile(values, fraction) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.ceil(sorted.length * fraction) - 1];
}

async function moveCursor(editor, line) {
    const position = new vscode.Position(line, 8);
    let subscription;
    const changed = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            subscription.dispose();
            reject(new Error("selection event did not arrive"));
        }, 5000);
        subscription = vscode.window.onDidChangeTextEditorSelection(
            (event) => {
                if (event.textEditor !== editor) return;
                clearTimeout(timer);
                subscription.dispose();
                resolve();
            });
    });
    const started = performance.now();
    editor.selection = new vscode.Selection(position, position);
    await changed;
    await new Promise((resolve) => setImmediate(resolve));
    return performance.now() - started;
}

exports.run = async function run() {
    const extension = vscode.extensions.all.find((candidate) =>
        candidate.packageJSON.name === "mark-your-scope");
    assert.ok(extension);
    await extension.activate();

    const text = Array.from({ length: 2500 }, (_, index) =>
        `function f${index}() {\n    if (ready) { save(); }\n}\n\n`).join("");
    const document = await vscode.workspace.openTextDocument({
        language: "typescript",
        content: text,
    });
    const editor = await vscode.window.showTextDocument(document);
    assert.ok(document.lineCount >= 10000);
    for (let index = 0; index < 20; index++) {
        await moveCursor(editor, index % 2 === 0 ? 5 : 6);
    }
    const durations = [];
    for (let index = 0; index < 200; index++) {
        durations.push(await moveCursor(
            editor, index % 2 === 0 ? 5 : 6));
    }
    console.log("MARK_YOUR_SCOPE_HOST_BENCHMARK=" + JSON.stringify({
        lines: document.lineCount,
        selections: durations.length,
        p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
        maxMs: Number(Math.max(...durations).toFixed(2)),
        measurement: "selection assignment to next event-loop turn",
    }));
};
