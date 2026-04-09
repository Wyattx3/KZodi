import { MODELS } from "@/lib/groq";
import { isBurmeseResponseLanguage, isNonEnglishResponseLanguage } from "./language";

export interface RoleplayModelPlan {
    brainModel: string;
    generationModel: string;
    fallbackModel?: string;
    isBurmese: boolean;
    isNonEnglish: boolean;
}

export function getRoleplayModelPlan(
    responseLanguage?: string,
    _context?: string,
): RoleplayModelPlan {
    const isBurmese = isBurmeseResponseLanguage(responseLanguage);
    const isNonEnglish = isNonEnglishResponseLanguage(responseLanguage);

    return {
        brainModel: "@cf/google/gemma-4-26b-a4b-it",
        generationModel: "@cf/google/gemma-4-26b-a4b-it",
        fallbackModel: undefined,
        isBurmese,
        isNonEnglish,
    };
}
