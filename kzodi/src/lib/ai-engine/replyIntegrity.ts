const ACTION_DIRECTIVE_REGEX = /\[\[\s*(?:REACT|STICKER)\s*:[\s\S]*?\]+/gi;

export function extractActionDirectives(content: string): string[] {
    const rawDirectives = content.match(ACTION_DIRECTIVE_REGEX)?.map((directive) => directive.trim()) || [];
    return rawDirectives.filter((d) => {
        if (/\[\[\s*STICKER\s*:\s*\]\]/i.test(d)) return false;
        if (/\[\[\s*REACT\s*:/i.test(d)) {
            const inner = d.replace(/\[\[/g, "").replace(/\]\]/g, "").trim();
            const parts = inner.split(":");
            if (parts.length < 3) return false;
            const msgId = parts[1].trim();
            if (msgId === "" || msgId.length <= 5 || !/^[A-Za-z0-9_-]+$/.test(msgId)) return false;
        }
        return true;
    });
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
