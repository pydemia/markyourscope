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

/** Place one guide per completed tab stop within visible leading whitespace. */
export function indentationGuides(
    lines: readonly string[],
    startLine: number,
    tabSize: number,
): IndentGuide[] {
    const guides: IndentGuide[] = [];
    if (!Number.isInteger(tabSize) || tabSize < 1) return guides;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        let column = 0;
        let lastStop = 0;
        let groupStart = 0;
        for (let character = 0; character < line.length; character++) {
            const value = line[character];
            if (value !== " " && value !== "\t") break;
            const next = value === "\t"
                ? column + tabSize - column % tabSize
                : column + 1;
            if (next >= lastStop + tabSize) {
                guides.push({ line: startLine + index, character: groupStart });
                lastStop += tabSize;
                groupStart = character + 1;
            }
            column = next;
        }
    }
    return guides;
}
