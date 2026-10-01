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
    assert.ok(commands.includes("markYourScope.toggleScopeHighlight"));
    assert.ok(commands.includes("markYourScope.chooseDisplayMode"));
    assert.ok(commands.includes("markYourScope.choosePalette"));
    assert.ok(commands.includes("markYourScope.resetPalette"));

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

    const configuration = vscode.workspace.getConfiguration(
        "markYourScope",
        { uri: liveDocument.uri, languageId: liveDocument.languageId },
    );
    await configuration.update(
        "mode", "structure", vscode.ConfigurationTarget.Global);
    await configuration.update(
        "focus.target", "lines", vscode.ConfigurationTarget.Global);
    const updatedConfiguration = vscode.workspace.getConfiguration(
        "markYourScope",
        { uri: liveDocument.uri, languageId: liveDocument.languageId },
    );
    assert.equal(updatedConfiguration.get("mode"), "structure");
    assert.equal(updatedConfiguration.get("focus.target"), "lines");
    await vscode.commands.executeCommand(
        "markYourScope.toggleScopeHighlight");
    await configuration.update(
        "palette", "lightSoft", vscode.ConfigurationTarget.Global);
    assert.equal(vscode.workspace.getConfiguration(
        "markYourScope",
        { uri: liveDocument.uri, languageId: liveDocument.languageId },
    ).get("palette"), "lightSoft");
    const currentPalette = () => vscode.workspace.getConfiguration(
        "markYourScope",
        { uri: liveDocument.uri, languageId: liveDocument.languageId },
    ).get("palette");
    const pause = () => new Promise((resolve) => setTimeout(resolve, 400));
    const cancelledPalette = vscode.commands.executeCommand(
        "markYourScope.choosePalette");
    await pause();
    await vscode.commands.executeCommand(
        "workbench.action.quickOpenSelectNext");
    await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
    await cancelledPalette;
    assert.equal(currentPalette(), "lightSoft",
        "cancelling palette preview preserves the setting");

    const savedPalette = vscode.commands.executeCommand(
        "markYourScope.choosePalette");
    await pause();
    await vscode.commands.executeCommand(
        "workbench.action.quickOpenSelectNext");
    await vscode.commands.executeCommand(
        "workbench.action.acceptSelectedQuickOpenItem");
    await pause();
    await vscode.commands.executeCommand(
        "workbench.action.acceptSelectedQuickOpenItem");
    await savedPalette;
    assert.equal(currentPalette(), "highContrast",
        "palette save persists the selected preset");
    await vscode.commands.executeCommand(
        "markYourScope.toggleScopeHighlight");
    await configuration.update(
        "mode", undefined, vscode.ConfigurationTarget.Global);
    await configuration.update(
        "focus.target", undefined, vscode.ConfigurationTarget.Global);
    await configuration.update(
        "palette", undefined, vscode.ConfigurationTarget.Global);
};
