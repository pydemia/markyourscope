const path = require("node:path");
const { downloadAndUnzipVSCode, runTests } = require("@vscode/test-electron");

async function main() {
    const root = path.resolve(__dirname, "../..");
    const vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH ||
        await downloadAndUnzipVSCode("stable");
    await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath: root,
        extensionTestsPath: path.join(__dirname, "suite.cjs"),
        launchArgs: [
            path.join(root, "test/fixtures"),
            "--disable-extensions",
            "--skip-welcome",
            "--skip-release-notes",
        ],
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
