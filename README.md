# Mark Your Scope

Mark Your Scope makes the code block around your cursor easier to follow in
Visual Studio Code. It combines indentation guides with the current syntax
scope, so you can see where a nested block begins and ends while reading or
editing. The scope name and line range also appear in the status bar. Your
code, syntax token colors and other extensions' settings stay untouched.

![A TypeScript if scope highlighted in VS Code](media/overview.png)

## What it does

- **See the active scope.** Highlight the current block with a quiet
  background and start/end boundaries. In supported languages, choose a
  structural block or a smaller expression such as a call or collection.
- **Follow indentation.** Show guides as lines or alternating whitespace
  bands. Optional advisory marks point out mixed tabs and spaces or
  indentation that does not line up with tab stops.
- **Move through nested code.** Focus a parent scope, jump to the current
  scope's start or end, or select the scope. The commands work with the
  active editor and preserve other cursors when selecting.
- **Fit your editor.** Choose a display mode and a theme-aware palette, or
  set individual colors. A high-contrast palette is included.

### Display modes

| Mode | Indentation | Current scope |
| --- | --- | --- |
| Balanced (default) | Subtle lines | Light background and boundaries |
| Structure | Alternating whitespace bands | Boundaries without a scope background |
| Focus | Minimal lines | Stronger background and boundaries |
| Off | Hidden | Hidden |

The mode sets defaults; an explicit indentation style setting takes priority.
If you only want nearby context, set `markYourScope.focus.target` to `lines`
and choose the number of logical lines with
`markYourScope.focus.contextLines`.

## Supported files

| Language | Scope highlighting | Indentation |
| --- | --- | --- |
| JavaScript, TypeScript | Blocks; calls, arrays and objects in expression mode | Yes |
| Python | Functions, classes, control blocks; calls and collections in expression mode | Yes |
| JSON | Objects and arrays, only when the document parses as standard JSON | Yes |
| YAML | No syntax scope | Yes |
| Other languages | No syntax scope | Yes, unless excluded |

Plain text and Markdown are excluded by default. JSX/TSX, JSON with comments,
notebooks, diff editors, remote hosts and web extensions have not been verified
for this release. Syntax errors may suppress the affected scope; valid scopes
elsewhere can remain visible. When a document exceeds 20,000 lines or 2 MiB
of UTF-8 text, syntax analysis is skipped while visible indentation remains.

## Get started

1. Install the extension and open a JavaScript, TypeScript, Python or JSON
   file. YAML gets indentation guides only; other non-excluded files may
   also show indentation.
2. Place the cursor inside a function, conditional or nested collection.
   The current scope boundaries appear in the editor and its name and line
   range appear in the status bar.
3. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search
   for **Mark Your Scope**.

Available commands include:

- **Choose Display Mode:** Balanced, Structure, Focus or Off.
- **Choose Palette:** preview with the arrow keys; `Esc` restores the
  previous colors. Confirm a palette, then choose User or Workspace settings.
- **Reset Palette:** remove the palette value at a chosen settings location.
- **Focus Parent Scope / Reset Scope Focus:** move through nested scopes.
- **Go to Scope Start / End:** navigate within the selected scope.
- **Select Scope:** select its text while leaving other cursors unchanged.
- **Toggle Scope Highlight:** temporarily hide or show scope decoration for
  the current window. Indentation remains visible.

Commands have no default keyboard shortcuts. Assign them in VS Code's
Keyboard Shortcuts editor if desired. The status bar names the current scope
and its line range, or explains why no scope is displayed.

## Settings

| Setting | Default | Values or effect |
| --- | --- | --- |
| `markYourScope.enabled` | `true` | Enable all decorations |
| `markYourScope.mode` | `balanced` | `balanced`, `structure`, `focus`, `off` |
| `markYourScope.indentation.style` | `line` | `line`, `background`, `off`; an explicit value overrides the mode preset |
| `markYourScope.indentation.warnings` | `off` | `mixed` marks mixed tabs/spaces; `all` also marks indentation outside tab stops |
| `markYourScope.focus.target` | `block` | `block`, `expression`, `lines` |
| `markYourScope.focus.contextLines` | `3` | Logical lines above and below the cursor in `lines` mode |
| `markYourScope.palette` | `auto` | `auto`, `darkSoft`, `lightSoft`, `highContrast`, `monochrome` |
| `markYourScope.palette.customColors` | `{}` | Optional `#RRGGBB` or `#RRGGBBAA` values for `indentLine`, `indentBandEven`, `indentBandOdd`, `scopeBalanced`, `scopeFocus`, `boundary` |
| `markYourScope.excludedLanguages` | `["plaintext", "markdown"]` | Language IDs with no decorations |

`auto` follows the active light, dark or high contrast theme. Invalid custom
colors fall back one property at a time and produce a warning. Indentation
warnings are advisory marks, not language diagnostics or automatic fixes.

The extension runs in the desktop extension host. This release was verified
on Windows x64 with VS Code 1.140.0. Other platforms and remote setups need
their own validation.

## Development

```text
npm ci
npm run check
npm test
npm run test:host
npm run package:vsix
```

The extension is licensed under
[Apache License 2.0](https://github.com/pydemia/markyourscope/blob/main/LICENSE).
Bundled dependency notices are in
[THIRD_PARTY_NOTICES.md](https://github.com/pydemia/markyourscope/blob/main/THIRD_PARTY_NOTICES.md).
