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
};
