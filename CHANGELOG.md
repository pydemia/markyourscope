# Changelog

## 0.4.1

- Align scope rails with VS Code indentation guide columns instead of the whitespace character before code.
- Use the editor's resolved `indentSize` for guide spacing and indentation warnings, while using `tabSize` for tab width.
- Keep partial indentation guides and avoid placing a shifted extension guide inside a tab character.

## 0.4.0

- Keep line-distinct ancestors visible through inline parentheses, calls, and assignments; one-line top-level scopes no longer dim the whole document.
- Add `markYourScope.spotlight.depth` (1–6, default 3) for visible scope levels, with faint ancestor backgrounds and rails.
- Add `scopeAncestor` to custom palette colors.

## 0.3.0

- Keep the immediate parent scope visible while giving the current scope a stronger highlight.
- Dim code outside the parent scope in Balanced and Focus modes; high contrast themes keep full opacity.
- Add separate scope rails in available indentation whitespace and show the parent in the status bar.

## 0.2.0

- Show nested Python `elif`, `else`, `except`, and `finally` clauses as separate scopes.
- Include parentheses, call arguments, function parameters, calls, `return` statements, and assignments in the default scope target for JavaScript, TypeScript, and Python.
- Start JavaScript and TypeScript `else` and `finally` scopes at their keywords.
- Support VS Code 1.139.1 and later.

## 0.1.1

- Added the scope logo, Marketplace icon, banner, search tags, and expanded usage guide.

## 0.1.0

- Initial release with scope highlighting, indentation guides, navigation, and palettes.
