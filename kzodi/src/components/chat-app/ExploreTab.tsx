import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOURCE_CATEGORIES, type Character } from "@/data/characters";
import { useRouter } from "next/navigation";

const CATEGORIES = ["All", ...SOURCE_CATEGORIES] as const;
type ExploreCategory = (typeof CATEGORIES)[number];
import { App } from '@capacitor/app';
import { useChatStore } from "@/lib/chatStore";
import { buildCreateStoryData } from "@/lib/storyData";

const getSafeImage = (image?: string | null, seedName?: string) => {
    if (image && image.trim() !== '') return image;
    const firstLetter = seedName && seedName.trim() ? seedName.trim().charAt(0).toUpperCase() : '?';
    const colors = [['#FF9A9E','#FECFEF'],['#a18cd1','#fbc2eb'],['#84fab0','#8fd3f4'],['#a6c0fe','#f68084'],['#fccb90','#d57eeb'],['#e0c3fc','#8ec5fc']];
    let hash = 0;
    if (seedName) for (let i = 0; i < seedName.length; i++) hash = seedName.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % colors.length;
    const [c1, c2] = colors[index];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="g${index}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}" /><stop offset="100%" stop-color="${c2}" /></linearGradient></defs><rect width="400" height="400" fill="url(#g${index})" /><text x="50%" y="50%" font-family="sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.8">${firstLetter}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

interface ExploreTabProps {
    onSelectCharacter: (character: Character) => void;
    onSelectGroup?: (groupId: string) => void;
}

type StoryDetailField = {
    label: string;
    value: string;
};

type StoryPreviewCastMember = {
    name: string;
    image: string;
    description: string;
    role: string;
    roleLabel: string;
};

const PAGE_SIZE = 50;
const STORY_GENRES = ["All", "Fantasy", "Romance", "Mystery", "Action", "Horror", "Sci-Fi", "Slice of Life", "Thriller", "Comedy"] as const;
const SEARCH_HISTORY_STORAGE_KEY = "kzodi.explore.search.history";
const SEARCH_FALLBACK_TERMS = ["Baji", "Jungkook", "Mafia", "Boyfriend", "Gojo", "Bakugo", "Romance", "Yandere"];
const STORY_LIBRARY_SPRING = [0.34, 1.56, 0.64, 1] as const;
const STORY_DETAIL_EASE = [0.22, 1, 0.36, 1] as const;

const storyOverlayVariants = {
    initial: { opacity: 0, y: "0%" },
    animate: {
        opacity: 1,
        y: "-100%",
        transition: {
            opacity: { duration: 0.2 },
            y: { delay: 0.2, duration: 0.4, ease: STORY_LIBRARY_SPRING },
        },
    },
    exit: {
        y: "-100%",
        transition: { duration: 0.4, ease: STORY_LIBRARY_SPRING },
    },
};

const storyLibraryVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { delay: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
};

const storyDetailVariants = {
    initial: { opacity: 0, x: "8%" },
    animate: { opacity: 1, x: "0%", transition: { duration: 0.28, ease: STORY_DETAIL_EASE } },
    exit: { opacity: 0, x: "8%", transition: { duration: 0.18, ease: STORY_DETAIL_EASE } },
};

function safeParseJSON(jsonValue: any) {
    if (typeof jsonValue !== "string") return jsonValue;
    try {
        return JSON.parse(jsonValue);
    } catch (error) {
        console.warn("Safe JSON parse failed for story metadata, returning undefined", error);
        return undefined;
    }
}

function mapStoryToCharacter(story: any): Character {
    const parsedStoryData = safeParseJSON(story.story_data) || {};
    const parsedWorldData = safeParseJSON(story.world_data);

    return {
        id: story.id,
        name: story.name,
        tag: story.genre || parsedStoryData.genre || "Story",
        description: story.synopsis || parsedStoryData.synopsis || "",
        personality: "Play Story",
        greeting: story.synopsis || parsedStoryData.synopsis || "Begin your story...",
        image: story.image,
        source: "story",
        creatorId: story.creator_id,
        storyData: {
            ...parsedStoryData,
            isPublished: Boolean(story.is_published),
            synopsis: story.synopsis || parsedStoryData.synopsis || "",
            genre: story.genre || parsedStoryData.genre || "",
        },
        worldData: parsedWorldData,
    } as Character;
}

function getStoryHeatBadge(story: any, index: number) {
    const createdAt = story?.created_at ? new Date(story.created_at).getTime() : 0;
    if (createdAt && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 7) {
        return "New";
    }

    if (index < 3) {
        return "Hot";
    }

    return null;
}

function getFirstNonEmptyString(...values: any[]) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return "";
}

function getStorySynopsis(story: any) {
    const parsedStoryData = safeParseJSON(story?.story_data) || {};
    return getFirstNonEmptyString(
        story?.synopsis,
        parsedStoryData.synopsis,
        parsedStoryData.summary,
    ) || "Step into a new world and start the story.";
}

function getStoryWorldLabel(story: any) {
    const parsedStoryData = safeParseJSON(story?.story_data) || {};
    const parsedWorldData = safeParseJSON(story?.world_data) || {};
    return getFirstNonEmptyString(
        parsedWorldData.name,
        parsedWorldData.title,
        parsedWorldData.setting,
        parsedStoryData.setting,
        parsedStoryData.world,
    );
}

function getStoryToneLabel(story: any) {
    const parsedStoryData = safeParseJSON(story?.story_data) || {};
    const parsedWorldData = safeParseJSON(story?.world_data) || {};
    return getFirstNonEmptyString(
        parsedStoryData.tone,
        parsedStoryData.mood,
        parsedStoryData.vibe,
        parsedWorldData.tone,
        parsedWorldData.vibe,
    );
}

function getStoryHook(story: any) {
    const parsedStoryData = safeParseJSON(story?.story_data) || {};
    const parsedWorldData = safeParseJSON(story?.world_data) || {};
    return getFirstNonEmptyString(
        parsedStoryData.opening,
        parsedStoryData.hook,
        parsedStoryData.premise,
        parsedStoryData.intro,
        parsedWorldData.description,
    );
}

function getStoryMetaLine(story: any) {
    const worldLabel = getStoryWorldLabel(story);
    const toneLabel = getStoryToneLabel(story);
    return [worldLabel, toneLabel, story?.genre || "Story"].filter(Boolean).slice(0, 2).join(" • ");
}

const STORY_ROLE_LABELS: Record<string, string> = {
    "main-npc": "Main NPC",
    supporting: "Supporting",
    antagonist: "Antagonist",
    mentor: "Mentor",
    "love-interest": "Love Interest",
    ally: "Ally",
};

const STORY_CONTENT_RATING_LABELS: Record<string, string> = {
    "all-ages": "All Ages",
    teen: "Teen",
    mature: "Mature",
};

function getStoryCast(story: any) {
    const parsedStoryData = safeParseJSON(story?.story_data) || {};
    const baseCast = Array.isArray(parsedStoryData.cast) ? parsedStoryData.cast : [];
    const customCast = Array.isArray(parsedStoryData.creatorCustomCharacters) ? parsedStoryData.creatorCustomCharacters : [];
    const seenNames = new Set<string>();

    return [...baseCast, ...customCast]
        .map((member: any): StoryPreviewCastMember | null => {
            const name = getFirstNonEmptyString(member?.name);
            if (!name || seenNames.has(name.toLowerCase())) {
                return null;
            }

            seenNames.add(name.toLowerCase());
            return {
                name,
                image: member?.image || "",
                description: getFirstNonEmptyString(member?.description, member?.personality),
                role: member?.role || "",
                roleLabel: STORY_ROLE_LABELS[member?.role] || (member?.isCustom ? "Custom Cast" : "Story Cast"),
            };
        })
        .filter((member): member is StoryPreviewCastMember => Boolean(member))
        .slice(0, 12);
}

function formatCompactSocialCount(value?: number) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return "0";
    }

    if (value < 1_000) {
        return `${value}`;
    }

    const divisor = value >= 1_000_000 ? 1_000_000 : 1_000;
    const suffix = divisor === 1_000_000 ? "M" : "K";
    const scaled = value / divisor;
    const digits = scaled >= 100 ? 0 : 1;
    return `${scaled.toFixed(digits).replace(/\.0$/, "")}${suffix}`;
}

function getSearchResultTags(character: Character) {
    const candidates = [
        character.tag,
        character.personality?.split(",")[0]?.trim(),
        character.personality?.split(",")[1]?.trim(),
        character.source === "story" ? "Interactive" : undefined,
    ].filter(Boolean) as string[];

    return [...new Set(candidates.map((item) => item.trim()).filter(Boolean))].slice(0, 3);
}

function getCharacterLikeTotal(character: Character) {
    return character.likes ?? character.likesCount ?? 0;
}

function getTrendingSearchMeta(character: Character) {
    return [
        character.tag,
        character.personality?.split(",")[0]?.trim(),
    ].filter(Boolean).join(" | ");
}

function getSearchResultMeta(character: Character) {
    if (character.source === "story") {
        return [character.tag || "Story", "Interactive story"].filter(Boolean).join(" | ");
    }

    return [
        character.tag,
        `${formatCompactSocialCount(getCharacterLikeTotal(character))} likes`,
    ].filter(Boolean).join(" | ");
}

function getSearchResultCopy(character: Character) {
    return (character.description || character.greeting || "No description yet.")
        .replace(/\s+/g, " ")
        .trim();
}

export default function ExploreTab({ onSelectCharacter, onSelectGroup }: ExploreTabProps) {
    const router = useRouter();
    const [activeCategory, setActiveCategory] = useState<ExploreCategory>("All");
    const [search, setSearch] = useState("");
    const [searchMode, setSearchMode] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedPreview, setSelectedPreview] = useState<Character | null>(null);
    // Pre-play character setup modal state
    const [storySetupChar, setStorySetupChar] = useState<Character | null>(null);
    const [playerName, setPlayerName] = useState("");
    const [playerDesc, setPlayerDesc] = useState("");
    const [characters, setCharacters] = useState<Character[]>([]);
    const [specialCharacters, setSpecialCharacters] = useState<Character[]>([]);
    const [forYouCharacters, setForYouCharacters] = useState<Character[]>([]);
    // initialLoading: true only on very first load (no data yet) → shows skeleton grid
    const [initialLoading, setInitialLoading] = useState(true);
    // refreshLoading: true on category/search refreshes when cards already exist → shows overlay spinner
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const touchStartX = useRef<number>(0);
    const isDragging = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
    const abortControllerRef = useRef<AbortController | null>(null);
    // queryToken: incremented on every category/search change. Lets loadMore detect stale appends.
    const queryTokenRef = useRef(0);

    // Fetch characters (initial or reset)
    const fetchCharacters = async (append = false, offset = 0, signal?: AbortSignal, expectedToken?: number) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            // Use the full skeleton only on the very first load (no cards, no search query).
            // When the user is searching, keep existing results visible and show the
            // overlay spinner instead — this eliminates the blank flash between keystrokes.
            if (characters.length === 0 && !search) {
                setInitialLoading(true);
            } else {
                setRefreshLoading(true);
            }
        }
        try {
            const fetchUrl = `/api/characters?category=${encodeURIComponent(activeCategory)}&search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${offset}`;
            const res = await fetch(fetchUrl, { signal });
            if (res.ok) {
                const data = await res.json();
                const chars: Character[] = data.characters || data;

                if (append) {
                    // Discard stale load-more append if the query context has changed
                    if (expectedToken !== undefined && queryTokenRef.current !== expectedToken) return;
                    setCharacters(prev => [...prev, ...chars]);
                } else {
                    setCharacters(chars);
                }
                setHasMore(data.hasMore ?? false);
                setCurrentOffset(offset + chars.length);
            }
        } catch (error: any) {
            if (error?.name === 'AbortError') return; // stale request — do not update state
            console.error("Failed to fetch characters:", error);
        } finally {
            if (!signal?.aborted) {
                setInitialLoading(false);
                setRefreshLoading(false);
                setIsLoadingMore(false);
            }
        }
    };

    // Load next page
    const loadMore = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        // Capture the token at call-time; fetchCharacters will discard the append if it changes
        const token = queryTokenRef.current;
        fetchCharacters(true, currentOffset, undefined, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingMore, hasMore, currentOffset, activeCategory, search]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMore(); },
            { rootMargin: "400px" }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    const fetchSpecialCharacters = async () => {
        try {
            const res = await fetch(`/api/characters?category=Specialist&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setSpecialCharacters(data.characters || data);
            }
        } catch (error) {
            console.error("Failed to fetch special characters:", error);
        }
    };

    const fetchForYou = async () => {
        try {
            const res = await fetch(`/api/characters/for-you`);
            if (res.ok) {
                const data = await res.json();
                setForYouCharacters(data);
            }
        } catch (error) {
            console.error("Failed to fetch for-you characters:", error);
        }
    };



    useEffect(() => {
        setCurrentOffset(0);
        setHasMore(false);
        // Bump token to invalidate any in-flight load-more from the previous query
        queryTokenRef.current += 1;

        // Abort any previous in-flight request
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const runFetch = () => fetchCharacters(false, 0, controller.signal);

        if (search) {
            // Debounce search input to avoid stale races on every keystroke
            clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(runFetch, 350);
        } else {
            // Category change — fire immediately, no debounce needed
            runFetch();
        }

        if (activeCategory === "All" && !search) {
            fetchSpecialCharacters();
            fetchForYou();
        } else {
            setSpecialCharacters([]);
            setForYouCharacters([]);
        }

        const handleLikeUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<{ id: string, likesCount: number, liked: boolean }>;
            const { id, likesCount, liked } = customEvent.detail;
            setCharacters(prev => prev.map(c =>
                c.id === id ? { ...c, likes: likesCount, userHasLiked: liked } : c
            ));
            setSelectedPreview(prev => prev?.id === id ? { ...prev, likes: likesCount, userHasLiked: liked } : prev);
        };

        window.addEventListener('characterLikeUpdate', handleLikeUpdate);
        return () => {
            clearTimeout(debounceTimer.current);
            abortControllerRef.current?.abort();
            window.removeEventListener('characterLikeUpdate', handleLikeUpdate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory, search]);

    const handleLike = async (character: Character, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent opening preview

        const wasLiked = character.userHasLiked || false;
        const newLikes = (character.likes || 0) + (wasLiked ? -1 : 1);

        // Optimistic UI update
        setCharacters(prev => prev.map(c =>
            c.id === character.id
                ? { ...c, likes: Math.max(0, newLikes), userHasLiked: !wasLiked }
                : c
        ));

        if (selectedPreview?.id === character.id) {
            setSelectedPreview(prev => prev ? { ...prev, likes: Math.max(0, newLikes), userHasLiked: !wasLiked } : null);
        }

        try {
            const res = await fetch(`/api/characters/${character.id}/like`, { method: "POST" });

            if (!res.ok) {
                throw new Error(res.status === 401 ? "unauthorized" : "failed");
            }

            const data = await res.json();
            if (data.success && typeof data.likesCount === 'number') {
                // Correct optimistic UI
                setCharacters(prev => prev.map(c =>
                    c.id === character.id ? { ...c, likes: data.likesCount, userHasLiked: data.liked } : c
                ));
                if (selectedPreview?.id === character.id) {
                    setSelectedPreview(prev => prev ? { ...prev, likes: data.likesCount, userHasLiked: data.liked } : null);
                }
                // Notify other components
                window.dispatchEvent(new CustomEvent('characterLikeUpdate', {
                    detail: { id: character.id, likesCount: data.likesCount, liked: data.liked }
                }));
            }
        } catch (error: any) {
            // Revert
            setCharacters(prev => prev.map(c =>
                c.id === character.id ? { ...c, likes: character.likes, userHasLiked: wasLiked } : c
            ));
            if (selectedPreview?.id === character.id) {
                setSelectedPreview(prev => prev ? { ...prev, likes: character.likes, userHasLiked: wasLiked } : null);
            }
            if (error.message === "unauthorized") alert("Please log in to like this character.");
            else alert("Failed to like character.");
        }
    };

    // Featured characters (top trending ones)
    const featuredList = useMemo(() => {
        return characters.slice(0, 5);
    }, [characters]);

    const safeFeaturedIndex = featuredList.length > 0
        ? Math.min(featuredIndex, featuredList.length - 1)
        : 0;
    const featured = featuredList[safeFeaturedIndex] ?? null;

    useEffect(() => {
        if (featuredList.length === 0) {
            if (featuredIndex !== 0) {
                setFeaturedIndex(0);
            }
            return;
        }

        if (featuredIndex >= featuredList.length) {
            setFeaturedIndex(featuredList.length - 1);
        }
    }, [featuredIndex, featuredList.length]);

    // Auto-play the slider
    useEffect(() => {
        if (featuredList.length <= 1) return;
        const timer = setInterval(() => {
            setFeaturedIndex((prev) => (prev + 1) % featuredList.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [featuredList.length]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        isDragging.current = true;
        setDragOffset(0);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const diff = e.touches[0].clientX - touchStartX.current;
        setDragOffset(diff);
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        if (dragOffset < -50 && featuredList.length > 1) {
            setFeaturedIndex((prev) => (prev + 1) % featuredList.length);
        } else if (dragOffset > 50 && featuredList.length > 1) {
            setFeaturedIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length);
        }
        setDragOffset(0);
    }, [dragOffset, featuredList.length]);

    // For You picks — use personalized API data, fallback to trending slice
    const forYou = forYouCharacters.length > 0
        ? forYouCharacters
        : characters.slice(featuredList.length, featuredList.length + 3);

    const hasSearchQuery = search.trim().length > 0;
    const searchTrendingCharacters = useMemo(() => {
        const merged = [...characters, ...specialCharacters, ...forYou];
        const unique = merged.filter((character, index, array) =>
            array.findIndex((candidate) => candidate.id === character.id) === index
        );

        return unique
            .filter((character) => character.source !== "story")
            .sort((left, right) => getCharacterLikeTotal(right) - getCharacterLikeTotal(left))
            .slice(0, 6);
    }, [characters, specialCharacters, forYou]);

    const searchHotTerms = useMemo(() => {
        const dynamicTerms = [
            ...searchTrendingCharacters.map((character) => character.name),
            ...searchTrendingCharacters.map((character) => character.tag),
            ...searchTrendingCharacters.flatMap((character) => character.personality?.split(",").map((item) => item.trim()).slice(0, 1) || []),
        ];

        const merged = [...recentSearches, ...dynamicTerms, ...SEARCH_FALLBACK_TERMS];
        return merged.filter(Boolean).filter((term, index, array) =>
            array.findIndex((candidate) => candidate.toLowerCase() === term.toLowerCase()) === index
        ).slice(0, 10);
    }, [recentSearches, searchTrendingCharacters]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setRecentSearches(parsed.filter((item): item is string => typeof item === "string").slice(0, 8));
            }
        } catch (error) {
            console.warn("Failed to restore search history", error);
        }
    }, []);

    const pushRecentSearch = useCallback((term: string) => {
        const normalized = term.trim();
        if (!normalized) {
            return;
        }

        setRecentSearches((previous) => {
            const next = [
                normalized,
                ...previous.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase()),
            ].slice(0, 8);

            if (typeof window !== "undefined") {
                window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
            }

            return next;
        });
    }, []);

    const clearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
        }
    }, []);

    const applySearchTerm = useCallback((term: string) => {
        const normalized = term.trim();
        if (!normalized) {
            return;
        }

        setActiveCategory("All");
        setSearch(normalized);
        pushRecentSearch(normalized);

        window.requestAnimationFrame(() => {
            searchInputRef.current?.focus();
        });
    }, [pushRecentSearch]);

    const handlePreview = (char: Character, e?: React.MouseEvent | React.TouchEvent) => {
        if (e) e.stopPropagation();
        setSelectedPreview(char);
    };

    // Capacitor Hardware Back Button for Preview Modal
    useEffect(() => {
        const handleBack = () => {
            if (selectedPreview) {
                setSelectedPreview(null);
            }
        };
        const listener = App.addListener('backButton', handleBack);
        return () => {
            listener.then(l => l.remove());
        };
    }, [selectedPreview]);

    // --- Long Press Logic ---
    const longPressTimer = useRef<NodeJS.Timeout | undefined>(undefined);
    const isLongPressActive = useRef(false);

    const handlePressStart = (char: Character, e: React.TouchEvent | React.MouseEvent) => {
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressActive.current = true;
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
            handlePreview(char, e);
        }, 500);
    };

    const handlePressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleCardClick = useCallback((char: Character, e: React.MouseEvent | React.TouchEvent) => {
        if (isLongPressActive.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (char.source === "story" && onSelectGroup) {
            const store = useChatStore.getState();
            const existingConvo = store.conversations[char.id];
            const existingStoryConvo = existingConvo?.conversationType === "story" ? existingConvo : undefined;
            const allowCustomization = char.storyData?.allowUserCharacterCustomization === true;

            if (existingStoryConvo) {
                onSelectGroup(char.id);
                return;
            }

            if (!allowCustomization) {
                const storyId = store.createStory(
                    char.name,
                    char.image,
                    buildCreateStoryData(
                        char.storyData,
                        {
                            synopsis: char.storyData?.synopsis || char.description || "",
                            genre: char.storyData?.genre || char.tag || "",
                            isPublished: char.storyData?.isPublished ?? true,
                            castIds: char.storyData?.castIds || []
                        },
                        {
                            playerCharacterName: char.storyData?.playerCharacterName || "",
                            playerCharacterDescription: char.storyData?.playerCharacterDescription || ""
                        }
                    ),
                    char.worldData,
                    char.id,
                    char.creatorId
                );
                onSelectGroup(storyId);
                return;
            }

            setPlayerName(
                char.storyData?.playerCharacterName || ""
            );
            setPlayerDesc(
                char.storyData?.playerCharacterDescription || ""
            );
            setStorySetupChar(char);
        } else {
            onSelectCharacter(char);
        }
    }, [onSelectCharacter, onSelectGroup]);

    /** Called when the player confirms their character in the pre-play setup modal. */
    const handleStorySetupConfirm = () => {
        if (!storySetupChar || !onSelectGroup) return;
        const char = storySetupChar;
        const finalName = playerName.trim() || "Player";
        const finalDesc = playerDesc.trim() || "The protagonist";

        const store = useChatStore.getState();
        const existingConvo = store.conversations[char.id];
        const existingStoryConvo = existingConvo?.conversationType === "story" ? existingConvo : undefined;

        if (existingStoryConvo) {
            // Existing conversation found — persist updated story metadata to the backend
            // Prefer reusing createStory with the explicit id so sync is consistent
            store.createStory(
                char.name,
                char.image,
                {
                    ...existingStoryConvo.storyData,
                    ...char.storyData,
                    synopsis: char.storyData?.synopsis || char.description || existingStoryConvo.storyData?.synopsis || "",
                    genre: char.storyData?.genre || char.tag || existingStoryConvo.storyData?.genre || "",
                    isPublished: char.storyData?.isPublished ?? existingStoryConvo.storyData?.isPublished ?? true,
                    playerCharacterName: finalName,
                    playerCharacterDescription: finalDesc,
                    castIds: char.storyData?.castIds || existingStoryConvo.storyData?.castIds || []
                },
                char.worldData ?? existingStoryConvo.worldData,
                char.id,
                char.creatorId ?? existingStoryConvo.creatorId
            );
            onSelectGroup(char.id);
        } else {
            // No existing conversation — create a new one
            const storyId = store.createStory(
                char.name,
                char.image,
                buildCreateStoryData(
                    char.storyData,
                    {
                        synopsis: char.storyData?.synopsis || char.description || "",
                        genre: char.storyData?.genre || char.tag || "",
                        isPublished: char.storyData?.isPublished ?? true,
                        castIds: char.storyData?.castIds || []
                    },
                    {
                        playerCharacterName: finalName,
                        playerCharacterDescription: finalDesc
                    }
                ),
                char.worldData,
                char.id,
                char.creatorId
            );
            onSelectGroup(storyId);
        }

        setStorySetupChar(null);
    };



    return (
        <div className="explore-container">

            <AnimatePresence mode="wait">
                {searchMode ? (
                    <motion.div
                        key="search-page"
                        className="explore-search-mode explore-search-theme"
                    >
                        <div className="explore-search-header">
                            <div className="explore-search-topbar">
                                <div className="explore-search-shell">
                                    <svg className="explore-search-shell-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                        <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    <input
                                        ref={searchInputRef}
                                        className="explore-search-shell-input"
                                        type="text"
                                        placeholder="Search characters, tags, vibes"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                pushRecentSearch(search);
                                            }
                                        }}
                                        autoFocus
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            className="explore-search-shell-clear"
                                            onClick={() => setSearch("")}
                                            aria-label="Clear search"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="explore-search-cancel"
                                    onClick={() => {
                                        setSearchMode(false);
                                        setSearch("");
                                        setActiveCategory("All");
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <div className="explore-search-scroll no-scrollbar">
                            {!hasSearchQuery ? (
                                <div className="explore-search-dashboard">
                                    <section className="explore-search-section">
                                        <div className="explore-search-section-head">
                                            <h2 className="explore-search-section-title">History</h2>
                                            {recentSearches.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="explore-search-section-action"
                                                    onClick={clearRecentSearches}
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        {recentSearches.length > 0 ? (
                                            <div className="explore-search-pill-list">
                                                {recentSearches.map((term) => (
                                                    <button
                                                        key={term}
                                                        type="button"
                                                        className="explore-search-pill"
                                                        onClick={() => applySearchTerm(term)}
                                                    >
                                                        {term}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="explore-search-muted-copy">
                                                Your recent taps will show up here.
                                            </div>
                                        )}
                                    </section>

                                    <section className="explore-search-section">
                                        <div className="explore-search-section-head">
                                            <h2 className="explore-search-section-title">Hot</h2>
                                        </div>
                                        <div className="explore-search-pill-list">
                                            {searchHotTerms.map((term) => (
                                                <button
                                                    key={term}
                                                    type="button"
                                                    className="explore-search-keyword-pill"
                                                    onClick={() => applySearchTerm(term)}
                                                >
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="explore-search-section">
                                        <div className="explore-search-section-head">
                                            <h2 className="explore-search-section-title">Trending</h2>
                                        </div>
                                        <div className="explore-search-trending-list">
                                            {initialLoading
                                                ? Array.from({ length: 6 }).map((_, index) => (
                                                    <div key={`search-trending-skeleton-${index}`} className="explore-search-trending-skeleton" />
                                                ))
                                                : searchTrendingCharacters.map((item, index) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className="explore-search-trending-card"
                                                        onClick={() => applySearchTerm(item.name)}
                                                    >
                                                        <span className="explore-search-rank">{index + 1}</span>
                                                        <img
                                                            src={getSafeImage(item.image, item.name)}
                                                            alt={item.name}
                                                            className="explore-search-trending-avatar"
                                                        />
                                                        <span className="explore-search-trending-copy">
                                                            <span className="explore-search-trending-name">{item.name}</span>
                                                            <span className="explore-search-trending-meta">
                                                                {getTrendingSearchMeta(item)}
                                                            </span>
                                                        </span>
                                                        <span className="explore-search-trending-count">
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                                            </svg>
                                                            {formatCompactSocialCount(getCharacterLikeTotal(item))}
                                                        </span>
                                                    </button>
                                                ))}
                                        </div>
                                    </section>
                                </div>
                            ) : initialLoading ? (
                                <div className="explore-search-results">
                                    <div className="explore-search-results-head">
                                        <div>
                                            <div className="explore-search-results-label">Searching</div>
                                            <h2 className="explore-search-results-title">{search}</h2>
                                        </div>
                                    </div>
                                    <div className="explore-search-result-list">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div key={`search-result-skeleton-${index}`} className="explore-search-result-skeleton" />
                                        ))}
                                    </div>
                                </div>
                            ) : characters.length > 0 ? (
                                <div className="explore-search-results">
                                    {refreshLoading && (
                                        <div className="explore-search-loading-overlay">
                                            <div className="explore-search-loading-spinner" />
                                        </div>
                                    )}
                                    <div className="explore-search-results-head">
                                        <div>
                                            <div className="explore-search-results-label">Search Results</div>
                                            <h2 className="explore-search-results-title">{search}</h2>
                                        </div>
                                        <div className="explore-search-results-count">{characters.length} found</div>
                                    </div>

                                    <div className="explore-search-result-list">
                                        {characters.map((char) => (
                                            <motion.button
                                                key={char.id}
                                                type="button"
                                                className="explore-search-result-card"
                                                onClick={(event) => {
                                                    pushRecentSearch(search);
                                                    handleCardClick(char, event as any);
                                                }}
                                                onTouchStart={(event) => handlePressStart(char, event)}
                                                onTouchEnd={handlePressEnd}
                                                onTouchMove={handlePressEnd}
                                                onMouseDown={(event) => handlePressStart(char, event)}
                                                onMouseUp={handlePressEnd}
                                                onMouseLeave={handlePressEnd}
                                                whileTap={{ scale: 0.985 }}
                                                layout
                                            >
                                                <img
                                                    src={getSafeImage(char.image, char.name)}
                                                    alt={char.name}
                                                    className="explore-search-result-avatar"
                                                />
                                                <span className="explore-search-result-copy">
                                                    <span className="explore-search-result-name-row">
                                                        <span className="explore-search-result-title-group">
                                                            <span className="explore-search-result-name">{char.name}</span>
                                                            {char.nickname && (
                                                                <span className="explore-search-result-alias">{char.nickname}</span>
                                                            )}
                                                        </span>
                                                        {char.source === "story" && (
                                                            <span className="explore-search-result-badge">Story</span>
                                                        )}
                                                    </span>
                                                    <span className="explore-search-result-subtitle">
                                                        {getSearchResultMeta(char)}
                                                    </span>
                                                    <span className="explore-search-result-desc">
                                                        {getSearchResultCopy(char)}
                                                    </span>
                                                    <span className="explore-search-result-tags">
                                                        {getSearchResultTags(char).map((tag) => (
                                                            <span key={`${char.id}-${tag}`} className="explore-search-result-tag">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </span>
                                                </span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <motion.div className="explore-search-empty">
                                    <div className="explore-search-empty-icon">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                            <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="explore-search-empty-title">No matches yet</div>
                                    <div className="explore-search-empty-copy">
                                        Try a different keyword, tag, or vibe.
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    /* ══════════ EXPLORE PAGE ══════════ */
                    <motion.div
                        key="explore-page"
                        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                        {/* ── Sticky Header ────────────────────────────────── */}
                        <div className="explore-header-sticky">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 4px 8px' }}>
                                <div style={{ paddingLeft: "4px" }}>
                                    <h1 className="explore-hero-title" style={{ fontSize: '22px', marginBottom: '2px' }}>Discover</h1>
                                    <p className="explore-hero-subtitle" style={{ fontSize: '11px' }}>Find your next partner</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <motion.button
                                        className="story-mode-btn"
                                        onClick={() => router.push("/story/explore")}
                                        whileTap={{ scale: 0.92 }}
                                        aria-label="Story Library"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </motion.button>
                                    <motion.button
                                        className="explore-header-search-btn"
                                        onClick={() => {
                                            setActiveCategory("All");
                                            setSearchMode(true);
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        style={{
                                            width: '36px', height: '36px', borderRadius: '50%',
                                            background: '#F3F4F6', border: 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#4A3728', cursor: 'pointer',
                                            flexShrink: 0
                                        }}
                                        aria-label="Search characters"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                            <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </motion.button>
                                </div>
                            </div>

                            {/* ── Category chips ─────────────────────────── */}
                            <motion.div
                                className="explore-chips no-scrollbar"
                                style={{ padding: '4px 0 8px' }}
                            >
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`explore-chip ${activeCategory === cat ? "explore-chip-active" : ""}`}
                                        onClick={() => setActiveCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </motion.div>
                        </div>

                        {/* ── Scrollable Content ────────────────────── */}
                        <div className="explore-scroll-content no-scrollbar">

                            {initialLoading ? (
                                /* First-load skeleton — shown only when no data exists yet */
                                <div style={{ padding: '0px' }}>
                                    <div className="explore-section">
                                        <div className="explore-section-header">
                                            <div style={{ width: '150px', height: '28px', background: '#F3F4F6', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                                            <div style={{ width: '80px', height: '16px', background: '#F3F4F6', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                        </div>
                                        <div className="explore-grid explore-grid-masonry">
                                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                                <div key={i} className="explore-card" style={{ pointerEvents: 'none' }}>
                                                    <div className="explore-card-img-wrap" style={{ background: '#F3F4F6', animation: 'pulse 1.5s infinite' }} />
                                                    <div className="explore-card-body">
                                                        <div className="explore-card-name-row">
                                                            <div style={{ width: '70%', height: '20px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        </div>
                                                        <div style={{ width: '100%', height: '12px', background: '#e5e7eb', borderRadius: '4px', marginTop: '6px', animation: 'pulse 1.5s infinite' }} />
                                                        <div style={{ width: '80%', height: '12px', background: '#e5e7eb', borderRadius: '4px', marginTop: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        <div className="explore-card-footer" style={{ marginTop: '8px' }}>
                                                            <div style={{ width: '40px', height: '16px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                            <div style={{ width: '50px', height: '14px', background: '#e5e7eb', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    {/* Refresh overlay spinner — shown over existing cards on category/search change */}
                                    {refreshLoading && (
                                        <div style={{
                                            position: 'absolute', inset: 0, zIndex: 10,
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                                            paddingTop: '64px',
                                            background: 'rgba(255,253,245,0.65)', backdropFilter: 'blur(2px)',
                                            borderRadius: '12px', pointerEvents: 'none'
                                        }}>
                                            <div style={{
                                                width: '28px', height: '28px', border: '3px solid #e5e7eb',
                                                borderTop: '3px solid #4A3728', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                        </div>
                                    )}
                                    {/* ── Specialist Characters — Horizontal Scroll ── */}
                                    {activeCategory === "All" && !search && specialCharacters.length > 0 && (
                                        <div className="explore-section">
                                            <div className="explore-section-header">
                                                <h2 className="explore-section-title">Specialist Characters</h2>
                                            </div>
                                            <div className="explore-specialist-scroll no-scrollbar">
                                                {specialCharacters.map((char, i) => (
                                                    <motion.div
                                                        key={char.id}
                                                        className="explore-specialist-card"
                                                        onClick={(e) => handleCardClick(char, e as any)}
                                                        onTouchStart={(e) => handlePressStart(char, e)}
                                                        onTouchEnd={handlePressEnd}
                                                        onTouchMove={handlePressEnd}
                                                        onMouseDown={(e) => handlePressStart(char, e)}
                                                        onMouseUp={handlePressEnd}
                                                        onMouseLeave={handlePressEnd}
                                                        whileTap={{ scale: 0.96 }}
                                                    >
                                                        <img src={getSafeImage(char.image, char.name)} alt={char.name} className="explore-specialist-img" />
                                                        <div className="explore-specialist-overlay" />
                                                        <div className="explore-specialist-badge-wrap">
                                                            <span className="explore-specialist-badge">
                                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                                Specialist
                                                            </span>
                                                        </div>
                                                        <div className="explore-specialist-chat-hint">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                        <div className="explore-specialist-info">
                                                            <div className="explore-specialist-name">{char.name}</div>
                                                            <div className="explore-specialist-role">{char.description?.substring(0, 40) || char.tag}</div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Featured Character Spotlight ──────────── */}
                                    {activeCategory === "All" && !search && featuredList.length > 0 && (() => {
                                        const currentChar = featured;
                                        if (!currentChar) return null;
                                        return (
                                            <motion.div
                                                className="explore-featured"
                                                style={{ position: 'relative' }}
                                                onTouchStart={handleTouchStart}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={handleTouchEnd}
                                            >
                                                <div
                                                    key={currentChar.id}
                                                    className="explore-featured-card explore-slide-in"
                                                    onClick={(e) => handleCardClick(currentChar, e as any)}
                                                    onTouchStart={(e) => handlePressStart(currentChar, e)}
                                                    onTouchEnd={handlePressEnd}
                                                    onTouchMove={handlePressEnd}
                                                    onMouseDown={(e) => handlePressStart(currentChar, e)}
                                                    onMouseUp={handlePressEnd}
                                                    onMouseLeave={handlePressEnd}
                                                >
                                                    <div className="explore-featured-img-wrap">
                                                        <img src={getSafeImage(currentChar.image, currentChar.name)} alt={currentChar.name} className="explore-featured-img" style={{ pointerEvents: 'none', userSelect: 'none' }} />
                                                        <div className="explore-featured-overlay" />
                                                        <div className="explore-featured-content">
                                                            <span className="explore-featured-label">#{safeFeaturedIndex + 1} Trending</span>
                                                            <h2 className="explore-featured-name">{currentChar.name}</h2>
                                                            <p className="explore-featured-desc">{currentChar.description}</p>
                                                            <div className="explore-featured-actions">
                                                                <span className="explore-featured-tag">{currentChar.tag}</span>
                                                                <span className="explore-featured-chat-btn">
                                                                    {currentChar.source === "story" ? (
                                                                        <>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                                                <path d="M8 5v14l11-7z" />
                                                                            </svg>
                                                                            Play Story
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                            </svg>
                                                                            Start Chat
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {featuredList.length > 1 && (
                                                    <div style={{ position: 'absolute', bottom: '16px', right: '20px', display: 'flex', gap: '6px', zIndex: 10 }}>
                                                        {featuredList.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFeaturedIndex(idx);
                                                                }}
                                                                style={{
                                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                                    background: idx === safeFeaturedIndex ? '#FFE566' : 'rgba(255,255,255,0.4)',
                                                                    border: 'none', cursor: 'pointer', padding: 0,
                                                                    transition: 'all 0.3s',
                                                                    transform: idx === safeFeaturedIndex ? 'scale(1.4)' : 'scale(1)',
                                                                    boxShadow: idx === safeFeaturedIndex ? '0 0 6px rgba(255, 229, 102, 0.6)' : 'none'
                                                                }}
                                                                aria-label={`Go to slide ${idx + 1}`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })()}

                                    {/* ── For You Section ──────────────────────── */}
                                    {activeCategory === "All" && !search && forYou.length > 0 && (
                                        <div className="explore-section">
                                            <div className="explore-section-header">
                                                <h2 className="explore-section-title">For You</h2>
                                            </div>
                                            <div className="explore-for-you no-scrollbar">
                                                {forYou.map((char, i) => (
                                                    <motion.div
                                                        key={char.id}
                                                        className="explore-fy-card"
                                                        onClick={(e) => handleCardClick(char, e as any)}
                                                        onTouchStart={(e) => handlePressStart(char, e)}
                                                        onTouchEnd={handlePressEnd}
                                                        onTouchMove={handlePressEnd}
                                                        onMouseDown={(e) => handlePressStart(char, e)}
                                                        onMouseUp={handlePressEnd}
                                                        onMouseLeave={handlePressEnd}
                                                        whileTap={{ scale: 0.96 }}
                                                    >
                                                        <div className="explore-fy-img-wrap">
                                                            <img src={getSafeImage(char.image, char.name)} alt={char.name} className="explore-fy-img" />
                                                            <div className="explore-fy-overlay" />
                                                        </div>
                                                        <div className="explore-fy-info">
                                                            <span className="explore-fy-tag">{char.tag}</span>
                                                            <h3 className="explore-fy-name">{char.name}</h3>
                                                            <div className="explore-fy-status" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span className="explore-fy-online-dot" /> Online
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ff4d4f' }}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                                                    {formatCompactSocialCount(char.likes)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── All Characters grid ────────────────────── */}
                                    <div className="explore-section">
                                            <div className="explore-section-header">
                                                <h2 className="explore-section-title">
                                                {activeCategory === "All" ? "All Characters" : activeCategory}
                                            </h2>
                                        </div>
                                        <div className="explore-grid explore-grid-masonry">
                                            <AnimatePresence mode="popLayout">
                                                {characters.map((char, i) => (
                                                    <motion.div
                                                        key={char.id}
                                                        className="explore-card"
                                                        onClick={(e) => handleCardClick(char, e as any)}
                                                        onTouchStart={(e) => handlePressStart(char, e)}
                                                        onTouchEnd={handlePressEnd}
                                                        onTouchMove={handlePressEnd}
                                                        onMouseDown={(e) => handlePressStart(char, e)}
                                                        onMouseUp={handlePressEnd}
                                                        onMouseLeave={handlePressEnd}
                                                        whileTap={{ scale: 0.97 }}
                                                        layout
                                                    >
                                                        <div className="explore-card-img-wrap">
                                                            <img src={getSafeImage(char.image, char.name)} alt={char.name} className="explore-card-img" />
                                                            <div className="explore-card-img-overlay" />
                                                            <div className="explore-card-float-tag">
                                                                <span>{char.tag}</span>
                                                            </div>
                                                            <button
                                                                className="explore-card-info-btn"
                                                                onClick={(e) => handlePreview(char, e)}
                                                                aria-label="Character info"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                                                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <div className="explore-card-body">
                                                            <div className="explore-card-name-row">
                                                                <div className="explore-card-title-group">
                                                                    <h3 className="explore-card-name">
                                                                        {char.name}
                                                                    </h3>
                                                                    {char.nickname && (
                                                                        <div className="explore-card-nickname">
                                                                            "{char.nickname}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {char.source !== "story" && (
                                                                    <button
                                                                        onClick={(e) => handleLike(char, e)}
                                                                        className="explore-like-btn"
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill={char.userHasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                                                        </svg>
                                                                        {formatCompactSocialCount(char.likes)}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="explore-card-desc">{char.description}</p>
                                                            <div className="explore-card-footer">
                                                                {char.source === "story" && (
                                                                    <span className="explore-card-meta-chip">
                                                                        Playable Story
                                                                    </span>
                                                                )}
                                                                <span className="explore-card-personality">
                                                                    {char.source === "story"
                                                                        ? (char.tag || "Story")
                                                                        : ((char.personality?.split(",")[0] || char.tag || "Character").trim())}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* ── Infinite scroll sentinel + loading ── */}
                                    <div ref={sentinelRef} style={{ height: '1px' }} />
                                    {isLoadingMore && (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', border: '3px solid #e5e7eb',
                                                borderTop: '3px solid #4A3728', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                        </div>
                                    )}
                                    {!isLoadingMore && hasMore && (
                                        <div style={{ textAlign: 'center', padding: '16px 0 32px', color: '#9CA3AF', fontSize: '13px' }}>
                                            Scroll for more...
                                        </div>
                                    )}

                                    {/* ── Empty state ────────────────────────────── */}
                                    {characters.length === 0 && (
                                        <motion.div
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', gridColumn: '1 / -1' }}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px', opacity: 0.9, filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.06))' }}>
                                                <circle cx="100" cy="90" r="60" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="8" />
                                                <path d="M140 130l25 25" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
                                                <circle cx="85" cy="80" r="4" fill="#6B7280" />
                                                <circle cx="115" cy="80" r="4" fill="#6B7280" />
                                                <path d="M92 98c5 4 11 4 16 0" stroke="#6B7280" strokeWidth="3" strokeLinecap="round" fill="none" />
                                                <path d="M125 50l5-8M140 60l10-4M55 120l-10 5" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round" />
                                            </svg>
                                            <p style={{ fontSize: '18px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                                No characters found
                                            </p>
                                            <p style={{ fontSize: '14px', color: '#6B7280' }}>
                                                Try a different search or category
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Character Preview Modal ── */}
            <AnimatePresence>
                {selectedPreview && (
                    <motion.div
                        className="explore-preview-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedPreview(null)}
                    >
                        <motion.div
                            className="explore-preview-modal"
                            initial={{ opacity: 0, y: 60, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.95 }}
                            transition={{ type: "spring", damping: 28, stiffness: 340 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="explore-preview-close"
                                onClick={() => setSelectedPreview(null)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </button>
                            <div className="explore-preview-header">
                                <div className="explore-preview-avatar">
                                    <img src={getSafeImage(selectedPreview.image, selectedPreview.name)} alt={selectedPreview.name} />
                                </div>
                                <div className="explore-preview-header-info">
                                    <h3 className="explore-preview-name">{selectedPreview.name}</h3>
                                    <span className="explore-preview-tag-pill">{selectedPreview.tag}</span>
                                    <div className="explore-preview-online-row">
                                        <span className="explore-preview-online-dot" />
                                        <span>Online{selectedPreview.source !== "story" ? ` | ${formatCompactSocialCount(selectedPreview.likes)} Likes` : ""}</span>
                                    </div>
                                    {selectedPreview.source !== "story" && (
                                        <button
                                            onClick={(e) => handleLike(selectedPreview, e)}
                                            style={{
                                                marginTop: '8px',
                                                padding: '8px 16px',
                                                background: selectedPreview.userHasLiked ? '#FFF0F0' : '#F9FAFB',
                                                color: selectedPreview.userHasLiked ? '#FF4D4F' : '#6B7280',
                                                border: selectedPreview.userHasLiked ? '1px solid #FFCCC7' : '1px solid #E5E7EB',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedPreview.userHasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                            {selectedPreview.userHasLiked ? 'Liked' : 'Like'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="explore-preview-body">
                                <div className="explore-preview-section">
                                    <span className="explore-preview-label">About</span>
                                    <p className="explore-preview-text" style={{ whiteSpace: "pre-wrap" }}>
                                        {selectedPreview.longDescription || selectedPreview.description}
                                    </p>
                                </div>
                                {selectedPreview.tags && selectedPreview.tags.length > 0 && (
                                    <div className="explore-preview-section">
                                        <span className="explore-preview-label">Tags</span>
                                        <div className="explore-preview-traits">
                                            {selectedPreview.tags.map(tag => (
                                                <span key={tag} className="explore-preview-trait" style={{ background: "#F3F4F6", border: "none" }}>#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(selectedPreview.zodiac_sign || selectedPreview.birthday) && (
                                    <div className="explore-preview-section" style={{ display: "flex", gap: "24px" }}>
                                        {selectedPreview.zodiac_sign && (
                                            <div>
                                                <span className="explore-preview-label">Zodiac</span>
                                                <div className="explore-preview-text" style={{ fontWeight: 600 }}>{selectedPreview.zodiac_sign}</div>
                                            </div>
                                        )}
                                        {selectedPreview.birthday && (
                                            <div>
                                                <span className="explore-preview-label">Birthday</span>
                                                <div className="explore-preview-text" style={{ fontWeight: 600 }}>{selectedPreview.birthday}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="explore-preview-section">
                                    <span className="explore-preview-label">Personality</span>
                                    <div className="explore-preview-traits">
                                        {selectedPreview.personality.split(",").map((trait) => (
                                            <span key={trait.trim()} className="explore-preview-trait">
                                                {trait.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {selectedPreview.scenario && (
                                    <div className="explore-preview-section">
                                        <span className="explore-preview-label">Scenario</span>
                                        <p className="explore-preview-text" style={{ fontStyle: "italic", background: "#F9FAFB", padding: "10px", borderRadius: "10px", fontSize: "13px" }}>
                                            {selectedPreview.scenario}
                                        </p>
                                    </div>
                                )}
                                <div className="explore-preview-section">
                                    <span className="explore-preview-label">Greeting</span>
                                    <p className="explore-preview-greeting">{selectedPreview.greeting}</p>
                                </div>
                            </div>
                            <button
                                className="explore-preview-start"
                                onClick={(e) => {
                                    setSelectedPreview(null);
                                    if (selectedPreview.source === "story") {
                                        handleCardClick(selectedPreview, e);
                                    } else {
                                        onSelectCharacter(selectedPreview);
                                    }
                                }}
                            >
                                {selectedPreview.source === "story" ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Play Story
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Start Conversation
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Pre-Play Character Setup Modal ── */}
            <AnimatePresence>
                {storySetupChar && (
                    <motion.div
                        className="explore-preview-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setStorySetupChar(null)}
                        style={{ zIndex: 1100 }}
                    >
                        <motion.div
                            className="explore-preview-modal"
                            initial={{ opacity: 0, y: 60, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.95 }}
                            transition={{ type: "spring", damping: 28, stiffness: 340 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '400px' }}
                        >
                            <button
                                className="explore-preview-close"
                                onClick={() => setStorySetupChar(null)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </button>

                            {/* Story Info Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '20px 20px 0', marginBottom: '4px'
                            }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '14px',
                                    overflow: 'hidden', flexShrink: 0,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}>
                                    <img
                                        src={getSafeImage(storySetupChar.image, storySetupChar.name)}
                                        alt={storySetupChar.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div>
                                    <h3 style={{
                                        fontWeight: 700, fontSize: '17px', color: '#1F2937',
                                        margin: 0, lineHeight: 1.3
                                    }}>{storySetupChar.name}</h3>
                                    <span style={{
                                        fontSize: '12px', color: '#6B7280',
                                        background: '#F3F4F6', padding: '2px 8px',
                                        borderRadius: '6px', marginTop: '4px', display: 'inline-block'
                                    }}>{storySetupChar.tag || 'Story'}</span>
                                </div>
                            </div>

                            {/* Setup Form */}
                            <div style={{ padding: '16px 20px 20px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
                                    borderRadius: '12px', padding: '14px 16px',
                                    marginBottom: '16px', border: '1px solid #FDE68A'
                                }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        marginBottom: '6px'
                                    }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#D97706' }}>
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />
                                        </svg>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                                            Set up your character
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#78716C', margin: 0, lineHeight: 1.5 }}>
                                        Create your player persona to immerse yourself in the story. The AI narrator will address you by this identity.
                                    </p>
                                </div>

                                <label style={{
                                    display: 'block', fontSize: '13px', fontWeight: 600,
                                    color: '#374151', marginBottom: '6px'
                                }}>
                                    Character Name
                                </label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder="e.g. Arya, Kai, your name..."
                                    maxLength={40}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        border: '1.5px solid #E5E7EB', borderRadius: '10px',
                                        fontSize: '14px', outline: 'none',
                                        background: '#FAFAFA', color: '#1F2937',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box',
                                        marginBottom: '14px'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#D97706'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                                    autoFocus
                                />

                                <label style={{
                                    display: 'block', fontSize: '13px', fontWeight: 600,
                                    color: '#374151', marginBottom: '6px'
                                }}>
                                    Character Description
                                </label>
                                <textarea
                                    value={playerDesc}
                                    onChange={(e) => setPlayerDesc(e.target.value)}
                                    placeholder="e.g. A wandering swordsman seeking redemption..."
                                    maxLength={200}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        border: '1.5px solid #E5E7EB', borderRadius: '10px',
                                        fontSize: '14px', outline: 'none',
                                        background: '#FAFAFA', color: '#1F2937',
                                        transition: 'border-color 0.2s',
                                        resize: 'none', fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                        marginBottom: '18px'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#D97706'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                                />

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setStorySetupChar(null)}
                                        style={{
                                            flex: 1, padding: '12px',
                                            borderRadius: '12px', border: '1px solid #E5E7EB',
                                            background: '#F9FAFB', color: '#6B7280',
                                            fontWeight: 600, fontSize: '14px',
                                            cursor: 'pointer', transition: 'background 0.2s'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStorySetupConfirm}
                                        style={{
                                            flex: 2, padding: '12px',
                                            borderRadius: '12px', border: 'none',
                                            background: 'linear-gradient(135deg, #4A3728, #6B4F3A)',
                                            color: '#FFF', fontWeight: 700,
                                            fontSize: '14px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', gap: '8px',
                                            boxShadow: '0 2px 8px rgba(74, 55, 40, 0.3)',
                                            transition: 'opacity 0.2s'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Start Playing
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
