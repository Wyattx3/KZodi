const ACTION_DIRECTIVE_REGEX = /\[\[\s*(?:REACT|STICKER)\s*:[\s\S]*?\]+/gi;

export function extractActionDirectives(content: string): string[] {
    return content.match(ACTION_DIRECTIVE_REGEX)?.map((directive) => directive.trim()) || [];
}

export function stripActionDirectives(content: string): string {
    return content
        .replace(ACTION_DIRECTIVE_REGEX, " ")
        .replace(/\s*\|\s*/g, " | ")
        .replace(/\s{2,}/g, " ")
        .replace(/(?:\s*\|\s*){2,}/g, " | ")
        .replace(/^(?:\|\s*)+|(?:\s*\|)+$/g, "")
        .trim();
}

export function hasVisibleReplyText(content: string): boolean {
    return stripActionDirectives(content)
        .replace(/\|/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .length > 0;
}

export function ensureVisibleReplyContent(content: string, fallbackText: string): string {
    const trimmedContent = content.trim();
    const trimmedFallback = fallbackText.trim();

    if (!trimmedContent) {
        return trimmedFallback;
    }

    if (hasVisibleReplyText(trimmedContent) || !trimmedFallback) {
        return trimmedContent;
    }

    const directives = extractActionDirectives(trimmedContent);
    if (directives.length === 0) {
        return trimmedFallback;
    }

    const hasStickerDirective = directives.some((directive) => /\[\[\s*STICKER\s*:/i.test(directive));
    return hasStickerDirective
        ? `${directives.join(" | ")} | ${trimmedFallback}`.trim()
        : `${directives.join(" ")} ${trimmedFallback}`.trim();
}
