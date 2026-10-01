import type { Scope } from "./scope";

/** Find the last non-whitespace character within a half-open scope. */
export function scopeEndOffset(text: string, scope: Scope): number {
    let offset = Math.max(scope.start, scope.end - 1);
    while (offset > scope.start && /\s/u.test(text[offset])) offset--;
    const code = text.charCodeAt(offset);
    if (code >= 0xDC00 && code <= 0xDFFF && offset > scope.start) {
        const previous = text.charCodeAt(offset - 1);
        if (previous >= 0xD800 && previous <= 0xDBFF) offset--;
    }
    return offset;
}
