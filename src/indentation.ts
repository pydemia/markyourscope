export interface IndentGuide {
    line: number;
    character: number;
}

export interface IndentBand {
    line: number;
    start: number;
    end: number;
    level: number;
}

export type IndentationWarnings = "off" | "mixed" | "all";

export interface IndentationWarning {
    start: number;
    end: number;
    reason: "mixed" | "unaligned";
}

/** Advisory whitespace warning, independent of syntax diagnostics. */
export function indentationWarning(
    text: string,
    tabSize: number,
    mode: IndentationWarnings,
    indentSize = tabSize,
): IndentationWarning | undefined {
    if (mode === "off" || !Number.isInteger(tabSize) || tabSize < 1 ||
        !Number.isInteger(indentSize) || indentSize < 1) {
        return undefined;
    }
    const match = /^[ \t]+/u.exec(text);
    if (!match || match[0].length === text.length) return undefined;
    const leading = match[0];
    const mixed = leading.includes(" ") && leading.includes("\t");
    if (mixed) return { start: 0, end: leading.length, reason: "mixed" };
    if (mode === "mixed") return undefined;
    let column = 0;
    for (const character of leading) {
        column = character === "\t"
            ? column + tabSize - column % tabSize : column + 1;
    }
    if (column % indentSize !== 0) {
        return { start: 0, end: leading.length, reason: "unaligned" };
    }
    return undefined;
}

/** Map completed visual indentation steps to character ranges. */
export function indentationBands(
    lines: readonly string[],
    startLine: number,
    tabSize: number,
): IndentBand[] {
    const bands: IndentBand[] = [];
    if (!Number.isInteger(tabSize) || tabSize < 1) return bands;

    for (let index = 0; index < lines.length; index++) {
        const text = lines[index];
        let column = 0;
        let step = 1;
        let groupStart = 0;
        for (let character = 0; character < text.length; character++) {
            const value = text[character];
            if (value !== " " && value !== "\t") break;
            column = value === "\t"
                ? column + tabSize - column % tabSize
                : column + 1;
            if (column >= step * tabSize) {
                bands.push({
                    line: startLine + index,
                    start: groupStart,
                    end: character + 1,
                    level: step,
                });
                groupStart = character + 1;
                step++;
            }
        }
    }
    return bands;
}

/** Return a character boundary at a visual indentation column, if present. */
export function indentationCharacterAtVisualColumn(
    text: string,
    visualColumn: number,
    tabSize: number,
): number | undefined {
    if (!Number.isInteger(visualColumn) || visualColumn < 0 ||
        !Number.isInteger(tabSize) || tabSize < 1) return undefined;
    let column = 0;
    for (let character = 0; character < text.length; character++) {
        const value = text[character];
        if (value !== " " && value !== "\t") break;
        if (column === visualColumn) return character;
        column = value === "\t"
            ? column + tabSize - column % tabSize : column + 1;
    }
    return undefined;
}

/** Align a scope rail with the next native indentation guide. */
export function scopeRailColumn(
    text: string,
    tabSize: number,
    indentSize: number,
): number | undefined {
    if (!Number.isInteger(tabSize) || tabSize < 1 ||
        !Number.isInteger(indentSize) || indentSize < 1) return undefined;
    let column = 0;
    let hasContent = false;
    for (const value of text) {
        if (value !== " " && value !== "\t") {
            hasContent = true;
            break;
        }
        column = value === "\t"
            ? column + tabSize - column % tabSize : column + 1;
    }
    return hasContent ? Math.ceil(column / indentSize) * indentSize
        : undefined;
}

/** Place guides at native indentation columns that have character boundaries. */
export function indentationGuides(
    lines: readonly string[],
    startLine: number,
    tabSize: number,
    indentSize = tabSize,
): IndentGuide[] {
    const guides: IndentGuide[] = [];
    if (!Number.isInteger(tabSize) || tabSize < 1 ||
        !Number.isInteger(indentSize) || indentSize < 1) return guides;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        let column = 0;
        const boundaries = new Map<number, number>([[0, 0]]);
        for (let character = 0; character < line.length; character++) {
            const value = line[character];
            if (value !== " " && value !== "\t") break;
            column = value === "\t"
                ? column + tabSize - column % tabSize
                : column + 1;
            boundaries.set(column, character + 1);
        }
        for (let level = 0; level < Math.ceil(column / indentSize);
            level++) {
            const character = boundaries.get(level * indentSize);
            if (character !== undefined) {
                guides.push({ line: startLine + index, character });
            }
        }
    }
    return guides;
}
