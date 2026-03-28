"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/chatStore";
import type { Character } from "@/data/characters";
import { buildCreateStoryData } from "@/lib/storyData";
import { fetchServerStoryConversation } from "@/lib/storyConversation";

function safeParseJSON(v: any) {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return undefined; }
}

function first(...vals: any[]) {
    for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
    return "";
}

const ROLE_LABELS: Record<string, string> = {
    "main-npc": "Main NPC", supporting: "Supporting", antagonist: "Antagonist",
    mentor: "Mentor", "love-interest": "Love Interest", ally: "Ally",
};

const RATING_LABELS: Record<string, string> = {
    "all-ages": "All Ages", teen: "Teen", mature: "Mature",
};

const getSafeImage = (image?: string | null, seedName?: string) => {
    if (image && image.trim()) return image;
    const letter = seedName?.trim()?.charAt(0)?.toUpperCase() || "?";
    const palettes = [["#6366f1", "#818cf8"], ["#ec4899", "#f472b6"], ["#8b5cf6", "#a78bfa"], ["#14b8a6", "#5eead4"], ["#f59e0b", "#fbbf24"], ["#ef4444", "#f87171"]];
    let h = 0;
    if (seedName) for (let i = 0; i < seedName.length; i++) h = seedName.charCodeAt(i) + ((h << 5) - h);
    const idx = Math.abs(h) % palettes.length;
    const [c1, c2] = palettes[idx];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="560" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="140" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.7">${letter}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export default function StoryPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [storyId, setStoryId] = useState<string | null>(null);
    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then(r => setStoryId(r.id));
    }, [params]);

    useEffect(() => {
        if (!storyId) return;
        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const res = await fetch(`/api/stories/${storyId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setStory(data.story || data);
                }
            } catch (err) {
                console.error("Failed to load story", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [storyId]);

    const details = useMemo(() => {
        if (!story) return null;
        const sd = safeParseJSON(story.story_data) || {};
        const wd = safeParseJSON(story.world_data) || {};
        const worldRules = sd.worldRules || {};

        const synopsis = first(story.synopsis, sd.synopsis, sd.summary) || "An untold story awaits…";
        const world = first(wd.name, wd.title, wd.setting, sd.setting, sd.world);
        const tone = first(sd.tone, sd.mood, sd.vibe, wd.tone, wd.vibe);
        const hook = first(sd.opening, sd.hook, sd.premise, sd.intro, wd.description);
        const contentRating = RATING_LABELS[sd.contentRating] || "";
        const playerMode = sd.allowUserCharacterCustomization ? "Custom Lead" : "Preset Lead";

        const baseCast = Array.isArray(sd.cast) ? sd.cast : [];
        const customCast = Array.isArray(sd.creatorCustomCharacters) ? sd.creatorCustomCharacters : [];
        const seenNames = new Set<string>();
        const cast = [...baseCast, ...customCast]
            .map((m: any) => {
                const name = first(m?.name);
                if (!name || seenNames.has(name.toLowerCase())) return null;
                seenNames.add(name.toLowerCase());
                return {
                    name,
                    image: m?.image || "",
                    description: first(m?.description, m?.personality),
                    role: m?.role || "",
                    roleLabel: ROLE_LABELS[m?.role] || (m?.isCustom ? "Custom" : "Cast"),
                };
            })
            .filter(Boolean)
            .slice(0, 12);

        const overview = [
            { label: "Genre", value: story.genre || "Story" },
            tone ? { label: "Tone", value: tone } : null,
            contentRating ? { label: "Rating", value: contentRating } : null,
            { label: "Lead", value: playerMode },
            worldRules.worldType ? { label: "World", value: worldRules.worldType } : null,
            worldRules.timePeriod ? { label: "Era", value: worldRules.timePeriod } : null,
        ].filter(Boolean) as { label: string; value: string }[];

        const worldRulesList = [
            worldRules.timePeriod ? { label: "Time Period", value: worldRules.timePeriod } : null,
            worldRules.worldType ? { label: "World Type", value: worldRules.worldType } : null,
            worldRules.specialRules ? { label: "Special Rules", value: worldRules.specialRules } : null,
            worldRules.forbiddenTopics ? { label: "Boundaries", value: worldRules.forbiddenTopics } : null,
        ].filter(Boolean) as { label: string; value: string }[];

        return { synopsis, world, tone, hook, overview, worldRulesList, cast };
    }, [story]);

    const handleStartStory = useCallback(async () => {
        if (!story) return;
        const sd = safeParseJSON(story.story_data) || {};
        const wd = safeParseJSON(story.world_data);

        const char: Character = {
            id: story.id,
            name: story.name,
            tag: story.genre || sd.genre || "Story",
            description: story.synopsis || sd.synopsis || "",
            personality: "Play Story",
            greeting: story.synopsis || sd.synopsis || "Begin your story...",
            image: story.image,
            source: "story",
            creatorId: story.creator_id,
            storyData: {
                ...sd,
                isPublished: Boolean(story.is_published),
                synopsis: story.synopsis || sd.synopsis || "",
                genre: story.genre || sd.genre || "",
            },
            worldData: wd,
        } as Character;

        const store = useChatStore.getState();
        const existing = store.conversations[char.id];
        const existingStory = existing?.conversationType === "story" ? existing : undefined;

        if (existingStory) {
            // Existing conversation — go straight to chatroom
            router.push(`/story/${char.id}`);
        } else {
            // New story — create conversation and enter (character setup is inside the story)
            try {
                const serverStory = await fetchServerStoryConversation(char.id);
                if (serverStory) {
                    router.push(`/story/${char.id}`);
                    return;
                }
            } catch (error) {
                console.error("Failed to check existing story conversation on the server", error);
            }

            const storyConvoId = store.createStory(
                char.name, char.image,
                buildCreateStoryData(
                    char.storyData,
                    {
                        synopsis: char.storyData?.synopsis || char.description || "",
                        genre: char.storyData?.genre || char.tag || "",
                        isPublished: char.storyData?.isPublished ?? true,
                        castIds: char.storyData?.castIds || [],
                    },
                    {
                        playerCharacterName: "",
                        playerCharacterDescription: "",
                    }
                ),
                char.worldData,
                char.id,
                char.creatorId
            );
            router.push(`/story/${storyConvoId}`);
        }
    }, [story, router]);

    if (loading) {
        return (
            <div className="sp-root">
                <div className="sp-loading">
                    <div className="sp-loading-spinner" />
                </div>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="sp-root">
                <header className="sp-header">
                    <button className="sp-back-btn" onClick={() => router.back()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </header>
                <div className="sp-empty">
                    <p>Story not found</p>
                    <button className="sp-empty-btn" onClick={() => router.push("/story/explore")}>
                        Browse Stories
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="sp-root">
            {/* Scroll content */}
            <div className="sp-scroll no-scrollbar">
                {/* Hero cover */}
                <div className="sp-hero">
                    <img src={getSafeImage(story.image, story.name)} alt={story.name} className="sp-hero-img" />
                    <div className="sp-hero-fade" />

                    {/* Floating back button */}
                    <button className="sp-hero-back" onClick={() => router.back()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Info sheet */}
                <div className="sp-sheet">
                    <div className="sp-cover-badge-row">
                        <span className="sp-genre-badge">{story.genre || "Story"}</span>
                        {details?.tone && <span className="sp-tone-badge">{details.tone}</span>}
                    </div>

                    <h1 className="sp-title">{story.name}</h1>

                    <p className="sp-meta-line">
                        {[details?.world, story.genre, details?.tone].filter(Boolean).join(" · ")}
                    </p>

                    {/* Start button */}
                    <button className="sp-start-btn" onClick={handleStartStory}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Start Reading
                    </button>

                    {/* Overview grid */}
                    {details && details.overview.length > 0 && (
                        <div className="sp-overview-grid">
                            {details.overview.map(item => (
                                <div key={item.label} className="sp-overview-item">
                                    <span className="sp-overview-label">{item.label}</span>
                                    <span className="sp-overview-value">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Synopsis */}
                    {details && (
                        <div className="sp-section">
                            <h3 className="sp-section-label">Synopsis</h3>
                            <p className="sp-section-text">{details.synopsis}</p>
                        </div>
                    )}

                    {/* Story Hook */}
                    {details?.hook && (
                        <div className="sp-section">
                            <h3 className="sp-section-label">Story Hook</h3>
                            <p className="sp-section-text sp-hook">{details.hook}</p>
                        </div>
                    )}

                    {/* World Rules */}
                    {details && details.worldRulesList.length > 0 && (
                        <div className="sp-section">
                            <h3 className="sp-section-label">World Rules</h3>
                            <div className="sp-world-list">
                                {details.worldRulesList.map(item => (
                                    <div key={item.label} className="sp-world-item">
                                        <span className="sp-world-item-label">{item.label}</span>
                                        <span className="sp-world-item-value">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Character Cast */}
                    {details && details.cast.length > 0 && (
                        <div className="sp-section">
                            <h3 className="sp-section-label">Characters</h3>
                            <div className="sp-cast-list">
                                {details.cast.map((member: any) => (
                                    <div key={member.name} className="sp-cast-card">
                                        <img
                                            src={getSafeImage(member.image, member.name)}
                                            alt={member.name}
                                            className="sp-cast-avatar"
                                        />
                                        <div className="sp-cast-info">
                                            <div className="sp-cast-name-row">
                                                <span className="sp-cast-name">{member.name}</span>
                                                <span className="sp-cast-role">{member.roleLabel}</span>
                                            </div>
                                            <p className="sp-cast-desc">
                                                {member.description || "A key character in this story."}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bottom spacer for fixed button */}
                    <div style={{ height: 100 }} />
                </div>
            </div>

            {/* Fixed bottom CTA */}
            <div className="sp-bottom-bar">
                <button className="sp-bottom-start" onClick={handleStartStory}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    Start Reading
                </button>
            </div>
        </div>
    );
}
