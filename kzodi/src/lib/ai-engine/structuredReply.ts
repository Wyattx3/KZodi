const REPLY_FIELD_KEYS = [
    "reply",
    "text",
    "content",
    "response",
    "message",
    "output",
    "result",
    "final",
];

function decodeJsonString(value: string): string {
    return value
        .replace(/\\"/g, "\"")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\");
}

function tryParseJsonCandidate(candidate: string): unknown | null {
    const trimmed = candidate.trim();
    if (!trimmed) return null;

    const looksStructured =
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"));

    if (!looksStructured) {
        return null;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return null;
    }
}

export function extractStructuredReplyText(value: unknown): string | null {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const nested = extractStructuredReplyText(item);
            if (nested) return nested;
        }
        return null;
    }

    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;

    for (const key of REPLY_FIELD_KEYS) {
        const nested = extractStructuredReplyText(record[key]);
        if (nested) return nested;
    }

    for (const nestedValue of Object.values(record)) {
        const nested = extractStructuredReplyText(nestedValue);
        if (nested) return nested;
    }

    return null;
}

function extractReplyFieldByRegex(content: string): string | null {
    const match = content.match(/"(?:reply|text|content|response|message|output|result|final)"\s*:\s*"((?:\\.|[^"\\])*)"/i);
    if (!match?.[1]) {
        return null;
    }

    const extracted = decodeJsonString(match[1]).trim();
    return extracted || null;
}

export function unwrapStructuredReplyPayload(rawContent: string): string {
    let content = rawContent.trim();
    if (!content) {
        return content;
    }

    const standaloneFence = content.match(/^```(?:json|javascript|js|ts|txt)?\s*([\s\S]*?)```$/i);
    if (standaloneFence?.[1]) {
        content = standaloneFence[1].trim();
    }

    const directParsed = tryParseJsonCandidate(content);
    const directExtract = extractStructuredReplyText(directParsed);
    if (directExtract) {
        return directExtract;
    }

    const fencedBlocks = Array.from(content.matchAll(/```(?:json|javascript|js|ts|txt)?\s*([\s\S]*?)```/gi));
    for (const block of fencedBlocks) {
        const fencedCandidate = block[1]?.trim();
        if (!fencedCandidate) continue;

        const parsed = tryParseJsonCandidate(fencedCandidate);
        const extracted = extractStructuredReplyText(parsed);
        if (extracted) {
            return extracted;
        }
    }

    const regexExtract = extractReplyFieldByRegex(content);
    if (regexExtract) {
        return regexExtract;
    }

    return content;
}
