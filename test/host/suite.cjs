const assert = require("node:assert/strict");
const path = require("node:path");
const vscode = require("vscode");

exports.run = async function run() {
    const extension = vscode.extensions.all.find((candidate) =>
        candidate.packageJSON.name === "mark-your-scope");
    assert.ok(extension, "development extension is available");
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("markYourScope.focusParentScope"));
    assert.ok(commands.includes("markYourScope.resetScopeFocus"));

    const document = await vscode.workspace.openTextDocument(
        path.resolve(__dirname, "../fixtures/sample.py"),
    );
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(3, 13, 3, 13);
    await vscode.commands.executeCommand("markYourScope.focusParentScope");
    await vscode.commands.executeCommand("markYourScope.resetScopeFocus");
    assert.equal(editor.document.languageId, "python");

    const liveDocument = await vscode.workspace.openTextDocument({
        language: "python",
        content: [
            "def process(items):",
            "    for item in items:",
            "        if item.valid:",
            "            save(item)",
            "",
        ].join("\n"),
    });
    const left = await vscode.window.showTextDocument(liveDocument, {
        viewColumn: vscode.ViewColumn.One,
    });
    const right = await vscode.window.showTextDocument(liveDocument, {
        viewColumn: vscode.ViewColumn.Two,
    });
    assert.notEqual(left, right, "split editors keep separate editor state");
    assert.ok(vscode.window.visibleTextEditors.includes(left));
    assert.ok(vscode.window.visibleTextEditors.includes(right));

    left.selection = new vscode.Selection(3, 13, 3, 13);
    right.selection = new vscode.Selection(2, 11, 2, 11);
    assert.notDeepEqual(left.selection.active, right.selection.active);
    const broken = await right.edit((edit) =>
        edit.replace(liveDocument.lineAt(3).range, "            save("));
    assert.ok(broken, "syntax error edit applied");
    assert.match(liveDocument.getText(), /save\(\n/);
    const repaired = await right.edit((edit) =>
        edit.replace(liveDocument.lineAt(3).range, "            save(item)"));
    assert.ok(repaired, "syntax repair edit applied");
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.match(liveDocument.getText(), /save\(item\)/);
};
