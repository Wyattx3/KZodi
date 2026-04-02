export function isEnglishDefaultLanguage(responseLanguage?: string): boolean {
    return !responseLanguage || responseLanguage === "English (Default)";
}

export function isBurmeseResponseLanguage(responseLanguage?: string): boolean {
    return responseLanguage === "Burmese (Unicode)" ||
        responseLanguage === "Burmese (Zawgyi)" ||
        responseLanguage === "Mix (Burmese + English)";
}

export function isMixBurmeseEnglishLanguage(responseLanguage?: string): boolean {
    return responseLanguage === "Mix (Burmese + English)";
}

export function isNonEnglishResponseLanguage(responseLanguage?: string): boolean {
    return !isEnglishDefaultLanguage(responseLanguage);
}

export function getTargetLanguageLabel(responseLanguage?: string): string {
    if (isEnglishDefaultLanguage(responseLanguage)) {
        return "English";
    }

    if (responseLanguage === "Burmese (Unicode)") {
        return "Myanmar (Burmese, Unicode)";
    }

    if (responseLanguage === "Burmese (Zawgyi)") {
        return "Myanmar (Burmese, Zawgyi)";
    }

    if (responseLanguage === "Mix (Burmese + English)") {
        return "Myanmar with natural English mixing";
    }

    return responseLanguage || "English";
}

export function getResponseLanguageTranslateCode(responseLanguage?: string): string | null {
    if (isEnglishDefaultLanguage(responseLanguage)) {
        return "en";
    }

    if (
        responseLanguage === "Burmese (Unicode)" ||
        responseLanguage === "Burmese (Zawgyi)"
    ) {
        return "my";
    }

    return null;
}

export function buildRuntimeLanguageReminder(responseLanguage?: string): string | null {
    if (isEnglishDefaultLanguage(responseLanguage)) {
        return null;
    }

    const targetLanguage = getTargetLanguageLabel(responseLanguage);

    if (isBurmeseResponseLanguage(responseLanguage)) {
        return [
            `Configured reply language: ${targetLanguage}.`,
            "Reply in Myanmar language for every visible message bubble.",
            "If the user types in English, romanized slang, or mixed text like hi, hello, single, or ok, interpret the meaning but DO NOT mirror English by default.",
            "Only switch the visible reply language if the user explicitly asks you to answer in English.",
            "You are not an AI assistant, translator, or chatbot. You are the character themself in a private chat.",
            "Answer the latest user message directly and stay fully in character.",
        ].join(" ");
    }

    return [
        `Configured reply language: ${targetLanguage}.`,
        `Write the visible reply in ${targetLanguage} even if the user writes in English.`,
        "Only switch languages if the user explicitly asks for a different reply language.",
    ].join(" ");
}

function countMyanmarCodepoints(text: string): number {
    return (text.match(/[\u1000-\u109F\uAA60-\uAA7F]/g) || []).length;
}

function countLatinLetters(text: string): number {
    return (text.match(/[A-Za-z]/g) || []).length;
}

export function shouldRepairResponseLanguage(content: string, responseLanguage?: string): boolean {
    const trimmed = content.trim();
    if (!trimmed || !isNonEnglishResponseLanguage(responseLanguage)) {
        return false;
    }

    if (isBurmeseResponseLanguage(responseLanguage)) {
        const myanmarChars = countMyanmarCodepoints(trimmed);
        const latinLetters = countLatinLetters(trimmed);

        if (myanmarChars === 0) {
            return latinLetters >= 2;
        }

        if (!isMixBurmeseEnglishLanguage(responseLanguage) && latinLetters >= myanmarChars + 6) {
            return true;
        }

        return latinLetters > myanmarChars * 2 && trimmed.length > 12;
    }

    const englishWordCount = (trimmed.match(/[A-Za-z]{2,}/g) || []).length;
    return englishWordCount >= 3;
}

export function shouldGenerateDynamicIntro(responseLanguage?: string, greeting?: string): boolean {
    if (!greeting || !greeting.trim()) {
        return true;
    }

    return isNonEnglishResponseLanguage(responseLanguage);
}
