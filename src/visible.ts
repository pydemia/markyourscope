export interface LineSpan {
    startLine: number;
    endLine: number;
}

export interface VisibleRange {
    start: { line: number; character: number };
    end: { line: number; character: number };
}

/** Return only visible logical lines inside an inclusive scope line span. */
export function visibleLineIntersections(
    scope: LineSpan,
    visibleRanges: readonly VisibleRange[],
): LineSpan[] {
    const intersections: LineSpan[] = [];
    for (const visible of visibleRanges) {
        const visibleEnd = visible.end.character === 0 &&
            visible.end.line > visible.start.line
            ? visible.end.line - 1 : visible.end.line;
        const startLine = Math.max(scope.startLine, visible.start.line);
        const endLine = Math.min(scope.endLine, visibleEnd);
        if (startLine <= endLine) intersections.push({ startLine, endLine });
    }
    return intersections;
}

/** Remove one inclusive line span from a list of visible spans. */
export function subtractLineSpan(
    spans: readonly LineSpan[],
    excluded: LineSpan,
): LineSpan[] {
    const result: LineSpan[] = [];
    for (const span of spans) {
        if (span.startLine < excluded.startLine) {
            const endLine = Math.min(span.endLine, excluded.startLine - 1);
            if (span.startLine <= endLine) {
                result.push({ startLine: span.startLine, endLine });
            }
        }
        if (span.endLine > excluded.endLine) {
            const startLine = Math.max(span.startLine, excluded.endLine + 1);
            if (startLine <= span.endLine) {
                result.push({ startLine, endLine: span.endLine });
            }
        }
    }
    return result;
}
