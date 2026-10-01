export type PaletteId =
    | "auto"
    | "darkSoft"
    | "lightSoft"
    | "highContrast"
    | "monochrome";

export type ThemeKind =
    | "dark"
    | "light"
    | "highContrast"
    | "highContrastLight";

export interface PaletteColors {
    indentLine: string;
    indentBandEven: string;
    indentBandOdd: string;
    scopeBalanced: string;
    scopeFocus: string;
    boundary: string;
}

export function paletteId(value: string): PaletteId {
    if (value === "darkSoft" || value === "lightSoft" ||
        value === "highContrast" || value === "monochrome") {
        return value;
    }
    return "auto";
}

export function paletteColors(
    setting: PaletteId,
    theme: ThemeKind,
    custom: Record<string, unknown> = {},
): { colors: PaletteColors; invalidKeys: string[] } {
    const effective = setting === "auto"
        ? theme === "highContrast" || theme === "highContrastLight"
            ? "highContrast"
            : theme === "light" ? "lightSoft" : "darkSoft"
        : setting;
    const light = theme === "light" || theme === "highContrastLight";
    let colors: PaletteColors;
    switch (effective) {
        case "lightSoft":
            colors = {
                indentLine: "rgba(72, 72, 72, 0.38)",
                indentBandEven: "rgba(72, 72, 72, 0.07)",
                indentBandOdd: "rgba(72, 72, 72, 0.035)",
                scopeBalanced: "rgba(72, 72, 72, 0.07)",
                scopeFocus: "rgba(72, 72, 72, 0.13)",
                boundary: "#4A6074",
            };
            break;
        case "highContrast": {
            const base = light ? "0, 0, 0" : "255, 255, 255";
            colors = {
                indentLine: light ? "#000000" : "#FFFFFF",
                indentBandEven: `rgba(${base}, 0.07)`,
                indentBandOdd: `rgba(${base}, 0.04)`,
                scopeBalanced: `rgba(${base}, 0.04)`,
                scopeFocus: `rgba(${base}, 0.08)`,
                boundary: light ? "#000000" : "#FFFFFF",
            };
            break;
        }
        case "monochrome": {
            const base = light ? "64, 64, 64" : "176, 176, 176";
            colors = {
                indentLine: light ? "#555555" : "#BBBBBB",
                indentBandEven: `rgba(${base}, 0.07)`,
                indentBandOdd: `rgba(${base}, 0.035)`,
                scopeBalanced: `rgba(${base}, 0.07)`,
                scopeFocus: `rgba(${base}, 0.14)`,
                boundary: light ? "#555555" : "#BBBBBB",
            };
            break;
        }
        default:
            colors = {
                indentLine: "rgba(160, 160, 160, 0.45)",
                indentBandEven: "rgba(128, 128, 128, 0.08)",
                indentBandOdd: "rgba(128, 128, 128, 0.04)",
                scopeBalanced: "rgba(128, 128, 128, 0.08)",
                scopeFocus: "rgba(128, 128, 128, 0.16)",
                boundary: "#8EAFC6",
            };
    }
    const invalidKeys: string[] = [];
    for (const key of Object.keys(colors) as Array<keyof PaletteColors>) {
        const value = custom[key];
        if (value === undefined) continue;
        if (typeof value === "string" &&
            /^#(?:[\da-fA-F]{6}|[\da-fA-F]{8})$/.test(value)) {
            colors[key] = value;
        } else {
            invalidKeys.push(key);
        }
    }
    return { colors, invalidKeys };
}
