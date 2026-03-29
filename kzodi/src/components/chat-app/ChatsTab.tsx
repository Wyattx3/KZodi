"use client";
import React from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useChatStore, type Conversation } from "@/lib/chatStore";
import { useIOSViewportContainment } from "@/lib/useIOSViewportContainment";
import { CHARACTERS, type Character } from "@/data/characters";
import WorldBuildingModal from "./WorldBuildingModal";

interface ChatsTabProps {
    onSelectCharacter: (character: Character, openProfile?: boolean) => void;
    onSelectGroup?: (groupId: string) => void;
    myCharacters?: Character[];
    allCharacters?: Character[];
    isLoading?: boolean;
}

function formatTime(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ─── Group Creation Modal ────────────────────────────────────────────────────

function GroupCreateModal({ charMap, conversations, onClose, onCreated }: {
    charMap: Record<string, Character>;
    conversations: Conversation[];
    onClose: () => void;
    onCreated: (groupId: string) => void;
}) {
    const [step, setStep] = React.useState<"select" | "name">("select");
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [groupName, setGroupName] = React.useState("");
    const [groupImage, setGroupImage] = React.useState("");
    const [searchQ, setSearchQ] = React.useState("");
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const { viewportStyle } = useIOSViewportContainment({
        rootRef,
        scrollableSelectors: [".group-create-scroll-surface"],
    });

    // Only show characters that have existing conversations (chat list contacts)
    const availableChars = React.useMemo(() => {
        return conversations
            .filter(c => !c.isGroup && c.conversationType !== 'story')
            .map(c => charMap[c.characterId])
            .filter(Boolean);
    }, [conversations, charMap]);

    const filteredChars = React.useMemo(() => {
        if (!searchQ.trim()) return availableChars;
        const q = searchQ.toLowerCase();
        return availableChars.filter(c => c.name.toLowerCase().includes(q));
    }, [availableChars, searchQ]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleCreate = () => {
        if (selectedIds.length < 2 || !groupImage) return;
        const name = groupName.trim() || selectedIds.map(id => charMap[id]?.name.split(" ")[0] || "?").join(", ");
        const groupId = useChatStore.getState().createGroup(name, selectedIds, groupImage);
        onCreated(groupId);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setGroupImage(base64);
        };
        reader.readAsDataURL(file);
    };

    return (
        <motion.div
            ref={rootRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                ...viewportStyle,
                position: "fixed",
                inset: "auto 0 0 0",
                top: "var(--ios-viewport-top, 0px)",
                height: "var(--ios-viewport-height, 100dvh)",
                zIndex: 1000,
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                paddingTop: "max(12px, env(safe-area-inset-top))",
                paddingBottom: "env(safe-area-inset-bottom)"
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: "100%", maxWidth: "480px",
                    height: "85%",
                    maxHeight: "100%",
                    background: "#FFFDF5",
                    borderRadius: "24px 24px 0 0",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden"
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "20px 20px 12px",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                            onClick={step === "name" ? () => setStep("select") : onClose}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "#4A3728", padding: "4px"
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div>
                            <h2 style={{
                                fontSize: "20px", fontWeight: 800,
                                color: "#4A3728", margin: 0,
                                fontFamily: "var(--font-display)"
                            }}>
                                {step === "select" ? "New Group" : "Group Info"}
                            </h2>
                            <p style={{ fontSize: "13px", color: "#8B8680", margin: 0 }}>
                                {step === "select"
                                    ? `${selectedIds.length} selected`
                                    : `${selectedIds.length} members`
                                }
                            </p>
                        </div>
                    </div>

                    {step === "select" && selectedIds.length >= 2 && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            onClick={() => setStep("name")}
                            style={{
                                background: "#4A3728", color: "#fff",
                                border: "none", borderRadius: "20px",
                                padding: "8px 20px", fontSize: "14px", fontWeight: 600,
                                cursor: "pointer"
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Next →
                        </motion.button>
                    )}

                    {step === "name" && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            onClick={handleCreate}
                            disabled={selectedIds.length < 2 || !groupImage}
                            style={{
                                background: (selectedIds.length >= 2 && groupImage) ? "#4A3728" : "#ccc",
                                color: "#fff",
                                border: "none", borderRadius: "20px",
                                padding: "8px 20px", fontSize: "14px", fontWeight: 600,
                                cursor: (selectedIds.length >= 2 && groupImage) ? "pointer" : "default"
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Create ✨
                        </motion.button>
                    )}
                </div>

                {step === "select" ? (
                    <>
                        {/* Selected chips */}
                        {selectedIds.length > 0 && (
                            <div style={{
                                padding: "12px 20px",
                                display: "flex", gap: "8px", flexWrap: "wrap",
                                borderBottom: "1px solid rgba(0,0,0,0.04)"
                            }}>
                                {selectedIds.map(id => {
                                    const c = charMap[id];
                                    if (!c) return null;
                                    return (
                                        <motion.div
                                            key={id}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "6px",
                                                background: "rgba(74,55,40,0.08)",
                                                borderRadius: "20px", padding: "4px 10px 4px 4px",
                                                fontSize: "13px", fontWeight: 500, color: "#4A3728"
                                            }}
                                        >
                                            <img src={c.image} alt="" style={{
                                                width: "22px", height: "22px",
                                                borderRadius: "50%", objectFit: "cover"
                                            }} />
                                            {c.name.split(" ")[0]}
                                            <button
                                                onClick={() => toggleSelect(id)}
                                                style={{
                                                    background: "none", border: "none",
                                                    cursor: "pointer", padding: "0", marginLeft: "2px",
                                                    color: "#8B8680", fontSize: "14px", lineHeight: 1
                                                }}
                                            >×</button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Search */}
                        <div style={{ padding: "12px 20px" }}>
                            <div style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                background: "rgba(0,0,0,0.04)", borderRadius: "12px",
                                padding: "10px 14px"
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                    <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={searchQ}
                                    onChange={e => setSearchQ(e.target.value)}
                                    style={{
                                        background: "none", border: "none", outline: "none",
                                        fontSize: "14px", color: "#4A3728", width: "100%"
                                    }}
                                />
                            </div>
                        </div>

                        {/* Contact list */}
                        <div className="group-create-scroll-surface no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0 8px 20px" }}>
                            {filteredChars.length === 0 && (
                                <div style={{
                                    padding: "40px 20px", textAlign: "center",
                                    color: "#8B8680", fontSize: "14px"
                                }}>
                                    {availableChars.length === 0
                                        ? "Start chatting with characters first to add them to groups!"
                                        : "No contacts match your search"}
                                </div>
                            )}
                            {filteredChars.map(c => {
                                const isSelected = selectedIds.includes(c.id);
                                return (
                                    <motion.div
                                        key={c.id}
                                        onClick={() => toggleSelect(c.id)}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "14px",
                                            padding: "12px", borderRadius: "14px",
                                            cursor: "pointer",
                                            background: isSelected ? "rgba(74,55,40,0.06)" : "transparent",
                                            transition: "background 0.15s"
                                        }}
                                    >
                                        <div style={{ position: "relative" }}>
                                            <img src={c.image} alt={c.name} style={{
                                                width: "48px", height: "48px",
                                                borderRadius: "50%", objectFit: "cover",
                                                border: isSelected ? "2px solid #111827" : "2px solid transparent"
                                            }} />
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    style={{
                                                        position: "absolute", bottom: "-2px", right: "-2px",
                                                        width: "20px", height: "20px",
                                                        borderRadius: "50%",
                                                        background: "#4A3728",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        border: "2px solid #FFFDF5"
                                                    }}
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                                        <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </motion.div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "15px", fontWeight: 600, color: "#4A3728" }}>{c.name}</div>
                                            <div style={{ fontSize: "12px", color: "#8B8680" }}>{c.tag}</div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* Step 2: Group Name */
                    <div className="group-create-scroll-surface no-scrollbar" style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto" }}>
                        {/* Group avatar preview & upload */}
                        <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: "90px", height: "90px",
                                    borderRadius: "50%",
                                    background: groupImage ? `url(${groupImage}) center/cover` : "linear-gradient(135deg, #eee, #ddd)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    position: "relative", overflow: "hidden",
                                    cursor: "pointer",
                                    border: "2px dashed #bbb"
                                }}
                            >
                                {!groupImage && (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: "#888" }}>
                                        <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                {groupImage && (
                                    <div style={{
                                        position: "absolute", inset: 0,
                                        background: "rgba(0,0,0,0.3)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        opacity: 0, transition: "opacity 0.2s"
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                        onMouseLeave={e => e.currentTarget.style.opacity = "0"}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "#fff" }}>
                                            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5l13.732-13.732z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {!groupImage && <span style={{ fontSize: "12px", color: "#EF4444", fontWeight: 600 }}>Profile photo required</span>}
                        </div>

                        {/* Group name input */}
                        <div>
                            <label style={{
                                fontSize: "13px", fontWeight: 600,
                                color: "#8B8680", marginBottom: "8px", display: "block"
                            }}>
                                GROUP NAME
                            </label>
                            <input
                                type="text"
                                placeholder="Enter group name..."
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                autoFocus
                                style={{
                                    width: "100%", padding: "14px 16px",
                                    fontSize: "16px", border: "1.5px solid rgba(0,0,0,0.08)",
                                    borderRadius: "14px", outline: "none",
                                    background: "rgba(0,0,0,0.02)",
                                    color: "#4A3728", fontWeight: 500,
                                    transition: "border-color 0.2s"
                                }}
                                onFocus={e => e.target.style.borderColor = "#4A3728"}
                                onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.08)"}
                            />
                        </div>

                        {/* Members preview */}
                        <div>
                            <label style={{
                                fontSize: "13px", fontWeight: 600,
                                color: "#8B8680", marginBottom: "12px", display: "block"
                            }}>
                                MEMBERS ({selectedIds.length})
                            </label>
                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                {selectedIds.map(id => {
                                    const c = charMap[id];
                                    if (!c) return null;
                                    return (
                                        <div key={id} style={{
                                            display: "flex", flexDirection: "column",
                                            alignItems: "center", gap: "4px", width: "60px"
                                        }}>
                                            <img src={c.image} alt={c.name} style={{
                                                width: "48px", height: "48px",
                                                borderRadius: "50%", objectFit: "cover"
                                            }} />
                                            <span style={{
                                                fontSize: "11px", color: "#4A3728",
                                                fontWeight: 500, textAlign: "center",
                                                overflow: "hidden", textOverflow: "ellipsis",
                                                whiteSpace: "nowrap", width: "100%"
                                            }}>
                                                {c.name.split(" ")[0]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─── Main ChatsTab ───────────────────────────────────────────────────────────

export default function ChatsTab({ onSelectCharacter, onSelectGroup, myCharacters = [], allCharacters = [], isLoading = false }: ChatsTabProps) {
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [actionConvo, setActionConvo] = React.useState<string | null>(null);
    const [draggingConvo, setDraggingConvo] = React.useState<string | null>(null);
    const [showNewMenu, setShowNewMenu] = React.useState(false);
    const [showGroupModal, setShowGroupModal] = React.useState(false);
    const [showWorldModal, setShowWorldModal] = React.useState(false);
    const [activeFilter, setActiveFilter] = React.useState<"all" | "personal" | "group" | "story">("all");
    // resolvedChars: on-demand fetched characters not yet in allCharacters/myCharacters
    const [resolvedChars, setResolvedChars] = React.useState<Record<string, Character>>({});
    // profileFetchingId: tracks which char ID is being fetched before opening profile
    const [profileFetchingId, setProfileFetchingId] = React.useState<string | null>(null);
    const pressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const menuOpenedAt = React.useRef<number>(0);

    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (Date.now() - menuOpenedAt.current < 600) return;
            setActionConvo(null);
            setShowNewMenu(false);
        };
        const handleContext = (e: MouseEvent) => {
            if (Date.now() - menuOpenedAt.current < 600) {
                e.preventDefault();
            }
        };
        window.addEventListener("click", handleClick);
        window.addEventListener("contextmenu", handleContext, { capture: true });
        return () => {
            window.removeEventListener("click", handleClick);
            window.removeEventListener("contextmenu", handleContext, { capture: true });
        }
    }, []);

    React.useEffect(() => {
        const update = () => {
            const convos = Object.values(useChatStore.getState().conversations);
            convos.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
            setConversations(convos);
        };
        update();
        const unsub = useChatStore.subscribe(update);
        return unsub;
    }, []);

    const charMap = React.useMemo(() => {
        const map: Record<string, Character> = {};
        allCharacters.forEach((c) => (map[c.id] = c));
        // Override with the most recent edits from the active user's library
        myCharacters.forEach((c) => (map[c.id] = c));
        // Supplement with any on-demand fetched characters (Fix 1)
        Object.assign(map, resolvedChars);
        return map;
    }, [allCharacters, myCharacters, resolvedChars]);

    // Fix 1: fetch missing characters on demand whenever the conversation list changes
    React.useEffect(() => {
        if (conversations.length === 0) return;
        const toFetch = conversations
            .filter(c => !c.isGroup && c.conversationType !== "story" && !charMap[c.characterId])
            .map(c => c.characterId);
        if (toFetch.length === 0) return;
        for (const id of toFetch) {
            // Only fetch if not already being resolved
            if (resolvedChars[id]) continue;
            fetch(`/api/characters/${id}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data?.character) {
                        setResolvedChars(prev => ({ ...prev, [id]: data.character }));
                    }
                })
                .catch(() => { /* silently ignore */ });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversations]);

    const filteredConvos = React.useMemo(() => {
        let baseConvos = conversations;
        if (activeFilter === "personal") {
            baseConvos = conversations.filter(c => !c.isGroup && c.conversationType !== "story");
        } else if (activeFilter === "group") {
            baseConvos = conversations.filter(c => c.isGroup && c.conversationType !== "story");
        } else if (activeFilter === "story") {
            baseConvos = conversations.filter(c => c.conversationType === "story");
        }

        if (!searchQuery.trim()) return baseConvos.map(convo => ({ convo, matchedMsg: null as any }));
        const q = searchQuery.toLowerCase();
        return baseConvos.flatMap((convo) => {
            if (convo.isGroup || convo.conversationType === "story") {
                const nameMatch = (convo.groupName?.toLowerCase().includes(q)) || (convo.customName?.toLowerCase().includes(q));
                const matchedMsg = [...convo.messages].reverse().find(m => m.content.toLowerCase().includes(q));
                if (nameMatch || matchedMsg) return [{ convo, matchedMsg: nameMatch ? null : matchedMsg }];
                return [];
            }
            const char = charMap[convo.characterId];
            const charName = char?.name || convo.customName || convo.characterId;
            const customNameMatch = convo.customName?.toLowerCase().includes(q);
            const nameMatch = charName.toLowerCase().includes(q) || customNameMatch;
            const matchedMsg = [...convo.messages].reverse().find(m => m.content.toLowerCase().includes(q));
            if (nameMatch || matchedMsg) {
                return [{ convo, matchedMsg: nameMatch ? null : matchedMsg }];
            }
            return [];
        });
    }, [conversations, searchQuery, charMap, activeFilter]);

    return (
        <div className="chats-container">
            <div className="chats-sticky-header">
                {/* Header */}
                <div className="chats-header">
                    <div>
                        <h1 className="chats-title">Messages</h1>
                        <p className="chats-header-sub">
                            {conversations.length > 0
                                ? `${conversations.length} conversation${conversations.length > 1 ? "s" : ""}`
                                : "Start a conversation"}
                        </p>
                    </div>
                    <div style={{ position: "relative" }}>
                        <button
                            className="chats-new-btn"
                            aria-label="New chat"
                            onClick={(e) => {
                                e.stopPropagation();
                                menuOpenedAt.current = Date.now();
                                setShowNewMenu(!showNewMenu);
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>

                        {/* New Chat / New Group dropdown */}
                        <AnimatePresence>
                            {showNewMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        position: "absolute", top: "44px", right: 0,
                                        background: "rgba(255,255,255,0.95)",
                                        backdropFilter: "blur(12px)",
                                        border: "1px solid rgba(0,0,0,0.06)",
                                        borderRadius: "16px",
                                        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                                        padding: "6px", minWidth: "170px", zIndex: 100
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            setShowNewMenu(false);
                                            setShowGroupModal(true);
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "10px",
                                            background: "transparent", border: "none",
                                            padding: "12px 14px", borderRadius: "12px",
                                            cursor: "pointer", color: "#4A3728",
                                            fontSize: "14px", fontWeight: 500, width: "100%",
                                            transition: "background 0.15s"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                                            <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M2 21c0-3.87 3.13-7 7-7 1.5 0 2.88.47 4.02 1.27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M17 14c3.87 0 7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                        New Group
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewMenu(false);
                                            setShowWorldModal(true);
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "10px",
                                            background: "transparent", border: "none",
                                            padding: "12px 14px", borderRadius: "12px",
                                            cursor: "pointer", color: "#4A3728",
                                            fontSize: "14px", fontWeight: 500, width: "100%",
                                            transition: "background 0.15s"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                        New World
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Filter Tabs */}
                {conversations.length > 0 && (
                    <LayoutGroup>
                        <div style={{ padding: "0 20px 12px", display: "flex", gap: "8px", overflowX: "auto" }} className="no-scrollbar">
                            {["all", "personal", "group", "story"].map((filter) => (
                                <motion.button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter as any)}
                                    style={{
                                        padding: "6px 16px",
                                        borderRadius: "20px",
                                        border: "none",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        textTransform: "capitalize",
                                        cursor: "pointer",
                                        background: "transparent",
                                        color: activeFilter === filter ? "#fff" : "#4A3728",
                                        position: "relative",
                                        zIndex: 1,
                                        transition: "color 0.2s"
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {activeFilter === filter && (
                                        <motion.div
                                            layoutId="chatFilterIndicator"
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                borderRadius: "20px",
                                                background: "#4A3728",
                                                zIndex: -1,
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    {filter}
                                </motion.button>
                            ))}
                        </div>
                    </LayoutGroup>
                )}

                {/* Search bar */}
                {conversations.length > 0 && (
                    <motion.div className="chats-search-wrap">
                        <div className="chats-search-box">
                            <svg className="chats-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                className="chats-search-input"
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Online avatars */}
                {conversations.length > 0 && (
                    <motion.div
                        className="chats-online-strip no-scrollbar"
                    >
                        {conversations.filter(c => !c.isGroup).map((convo) => {
                            const char = charMap[convo.characterId];
                            // Fix 5: skip entirely if char is missing or still a DiceBear stub
                            if (!char) return null;
                            if (char.image?.startsWith('https://api.dicebear.com')) return null;
                            const displayName = convo.customName || char.name;
                            return (
                                <motion.div
                                    key={convo.characterId}
                                    className="chats-online-item"
                                    onClick={() => onSelectCharacter(char)}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <div className="chats-online-avatar-ring">
                                        <img src={char.image} alt={char.name} />
                                    </div>
                                    <span className="chats-online-name">{displayName.split(" ")[0]}</span>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {/* Divider */}
                {conversations.length > 0 && <div className="chats-divider" />}
            </div>

            <div className="chats-list">
                <AnimatePresence>
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <motion.div
                                key={`skeleton-${i}`}
                                className="chats-item"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                style={{ background: "#FFFDF5", pointerEvents: "none" }}
                            >
                                <div className="chats-item-avatar" style={{ background: "rgba(0,0,0,0.06)" }} />
                                <div className="chats-item-info">
                                    <div className="chats-item-top">
                                        <div style={{ width: "40%", height: "16px", background: "rgba(0,0,0,0.06)", borderRadius: "4px" }} />
                                        <div style={{ width: "15%", height: "12px", background: "rgba(0,0,0,0.04)", borderRadius: "4px" }} />
                                    </div>
                                    <div className="chats-item-bottom" style={{ marginTop: "6px" }}>
                                        <div style={{ width: "70%", height: "14px", background: "rgba(0,0,0,0.04)", borderRadius: "4px" }} />
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        filteredConvos.map(({ convo, matchedMsg }, i) => {
                        // Helper: replace sticker tags with a friendly label.
                        // Handles both plain "[[STICKER: ...]]" and group-prefixed "Name: [[STICKER: ...]]"
                        const formatPreview = (content: string): string => {
                            // Plain sticker (starts directly with sticker tag)
                            if (/^\[\[\s*STICKER\s*:/i.test(content)) return "🎭 Sticker";
                            // Sender-prefixed sticker: "SenderName: [[STICKER: ...]]"
                            const prefixed = content.match(/^(.*?):\s*(\[\[\s*STICKER\s*:.*)/i);
                            if (prefixed) return `${prefixed[1]}: 🎭 Sticker`;
                            return content;
                        };
                        // ── Group Chat Row ────────────────────────
                        if (convo.isGroup || convo.conversationType === "story") {
                            const isStory = convo.conversationType === "story";
                            const memberChars = (convo.groupMemberIds || []).map(id => charMap[id]).filter(Boolean);
                            const msgToDisplay = matchedMsg || convo.messages[convo.messages.length - 1];
                            const displayContent = matchedMsg ? matchedMsg.content : convo.lastMessage;
                            const unreadCount = convo.messages.filter(m => m.role === "assistant" && m.status !== "seen").length;

                            return (
                                <div key={convo.characterId} style={{ position: "relative", overflow: "hidden" }}>
                                    {/* Swipe actions */}
                                    <div style={{
                                        position: "absolute", top: 0, right: 0, bottom: 0,
                                        width: "60px", display: "flex", alignItems: "center",
                                        justifyContent: "center", zIndex: 0,
                                        opacity: (draggingConvo === convo.characterId || actionConvo === convo.characterId) ? 1 : 0,
                                        transition: "opacity 0.15s", pointerEvents: (draggingConvo === convo.characterId || actionConvo === convo.characterId) ? "auto" : "none"
                                    }}>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                useChatStore.getState().deleteConversation(convo.characterId);
                                                try {
                                                    await fetch("/api/memory", {
                                                        method: "DELETE",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ characterId: convo.characterId })
                                                    });
                                                } catch (err) { }
                                            }}
                                            aria-label="Delete"
                                            style={{
                                                width: "42px", height: "42px", borderRadius: "50%",
                                                border: "none", background: "#EF4444", color: "#fff",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)"
                                            }}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                                            </svg>
                                        </button>
                                    </div>

                                    <motion.div
                                        className="chats-item"
                                        drag="x"
                                        dragConstraints={{ left: -60, right: 0 }}
                                        dragElastic={0.05}
                                        initial={false}
                                        animate={{ x: actionConvo === convo.characterId ? -60 : 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        onDragStart={() => setDraggingConvo(convo.characterId)}
                                        onDragEnd={(e, info) => {
                                            const isSwiped = info.offset.x < -35 || info.velocity.x < -80;
                                            if (isSwiped) setActionConvo(convo.characterId);
                                            else setActionConvo(null);
                                            setTimeout(() => setDraggingConvo(null), 200);
                                        }}
                                        onClick={(e) => {
                                            if (actionConvo) { e.stopPropagation(); setActionConvo(null); }
                                            else onSelectGroup?.(convo.characterId);
                                        }}
                                        style={{
                                            position: "relative", zIndex: 1,
                                            background: "#FFFDF5",
                                            WebkitUserSelect: "none", userSelect: "none",
                                            touchAction: "pan-y", cursor: "pointer"
                                        }}
                                    >
                                        {/* Group avatar: stacked */}
                                        <div className="chats-item-avatar" style={{ position: "relative" }}>
                                            {convo.groupImage ? (
                                                <img src={convo.groupImage} alt={convo.groupName || (isStory ? "Story" : "Group")} style={{
                                                    width: "48px", height: "48px",
                                                    borderRadius: "50%",
                                                    objectFit: "cover"
                                                }} />
                                            ) : (
                                                <div style={{
                                                    width: "48px", height: "48px",
                                                    borderRadius: "50%",
                                                    background: "#F3F4F6",
                                                    display: "flex", flexWrap: "wrap",
                                                    overflow: "hidden", position: "relative"
                                                }}>
                                                    {memberChars.slice(0, 4).map((c, idx) => (
                                                        <img key={c.id} src={c.image} alt={c.name} style={{
                                                            width: memberChars.length <= 2 ? "50%" : "50%",
                                                            height: memberChars.length <= 2 ? "100%" : "50%",
                                                            objectFit: "cover",
                                                            pointerEvents: "none"
                                                        }} />
                                                    ))}
                                                </div>
                                            )}
                                            {isStory && (
                                                <span
                                                    style={{
                                                        position: "absolute",
                                                        right: "-2px",
                                                        bottom: "-2px",
                                                        width: "18px",
                                                        height: "18px",
                                                        borderRadius: "50%",
                                                        background: "#c4a96a",
                                                        color: "#1a1612",
                                                        border: "2px solid #FFFDF5",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "10px",
                                                        lineHeight: 1,
                                                        boxShadow: "0 3px 8px rgba(0,0,0,0.14)",
                                                    }}
                                                >
                                                    📖
                                                </span>
                                            )}
                                            <span className="chats-item-online-dot" />
                                        </div>
                                        <div className="chats-item-info">
                                            <div className="chats-item-top">
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                                    <span className="chats-item-name">
                                                        {convo.groupName || (isStory ? "Story" : "Group")}
                                                    </span>
                                                    {isStory && (
                                                        <span
                                                            style={{
                                                                padding: "3px 8px",
                                                                borderRadius: "999px",
                                                                fontSize: "10px",
                                                                fontWeight: 700,
                                                                letterSpacing: "0.08em",
                                                                color: "#b89340",
                                                                background: "rgba(196,169,106,0.12)",
                                                                border: "1px solid rgba(196,169,106,0.18)",
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            STORY
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="chats-item-time">{formatTime(convo.lastTimestamp)}</span>
                                            </div>
                                            <div className="chats-item-bottom">
                                                <p className="chats-item-preview" style={isStory ? { fontStyle: "italic" } : undefined}>
                                                    {displayContent && formatPreview(displayContent).length > 45
                                                        ? formatPreview(displayContent).slice(0, 45) + "..."
                                                        : formatPreview(displayContent) || "No messages yet"}
                                                </p>
                                                <div className="chats-item-meta">
                                                    {unreadCount > 0 && <span className="chats-item-msg-count">{unreadCount}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        }

                        // ── Regular Chat Row ──────────────────────
                        const char = charMap[convo.characterId] || {
                            id: convo.characterId,
                            name: convo.customName || convo.characterId.split("-")[0] || "Character",
                            tag: "Original",
                            description: "",
                            longDescription: "",
                            tags: [],
                            personality: "",
                            greeting: "",
                            image: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${convo.characterId}`
                        } as Character;
                        
                        const displayName = convo.customName || char.name;
                        
                        const msgToDisplay = matchedMsg || convo.messages[convo.messages.length - 1];
                        const isAiLast = msgToDisplay?.role === "assistant";
                        const displayContent = matchedMsg ? matchedMsg.content : convo.lastMessage;
                        const unreadCount = convo.messages.filter(m => m.role === "assistant" && m.status !== "seen").length;
                        return (
                            <div key={convo.characterId} style={{ position: "relative", overflow: "hidden" }}>
                                <div
                                    style={{
                                        position: "absolute", top: 0, right: 0, bottom: 0,
                                        width: "110px", display: "flex", alignItems: "center",
                                        justifyContent: "center", gap: "12px", zIndex: 0,
                                        opacity: (draggingConvo === convo.characterId || actionConvo === convo.characterId) ? 1 : 0,
                                        transition: "opacity 0.15s ease",
                                        pointerEvents: (draggingConvo === convo.characterId || actionConvo === convo.characterId) ? "auto" : "none"
                                    }}
                                >
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setActionConvo(null);
                                            // If char is a stub (personality === ""), we must fetch real data first.
                                            // On any failure we keep the profile CLOSED to avoid showing broken stub data.
                                            if (char.personality === "") {
                                                setProfileFetchingId(convo.characterId);
                                                let opened = false;
                                                try {
                                                    const res = await fetch(`/api/characters/${convo.characterId}`);
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        if (data?.character) {
                                                            setResolvedChars(prev => ({ ...prev, [convo.characterId]: data.character }));
                                                            onSelectCharacter(data.character, true);
                                                            opened = true;
                                                        }
                                                    }
                                                } catch { /* network error — keep profile closed */ }
                                                finally { setProfileFetchingId(null); }
                                                // If we could not obtain real data, show feedback and bail out.
                                                if (!opened) {
                                                    const toast = document.createElement("div");
                                                    toast.textContent = "Couldn't load profile — please try again.";
                                                    Object.assign(toast.style, {
                                                        position: "fixed", bottom: "90px", left: "50%",
                                                        transform: "translateX(-50%)",
                                                        background: "#1F1F1F", color: "#fff",
                                                        padding: "10px 18px", borderRadius: "20px",
                                                        fontSize: "13px", fontWeight: "500",
                                                        zIndex: "9999", pointerEvents: "none",
                                                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                                                        opacity: "0", transition: "opacity 0.2s"
                                                    });
                                                    document.body.appendChild(toast);
                                                    requestAnimationFrame(() => { toast.style.opacity = "1"; });
                                                    setTimeout(() => {
                                                        toast.style.opacity = "0";
                                                        setTimeout(() => toast.remove(), 300);
                                                    }, 2500);
                                                }
                                                return;
                                            }
                                            onSelectCharacter(char, true);
                                        }}
                                        aria-label="Profile"
                                        disabled={profileFetchingId === convo.characterId}
                                        style={{
                                            width: "42px", height: "42px", borderRadius: "50%",
                                            border: "none", background: "#4A3728", color: "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            cursor: profileFetchingId === convo.characterId ? "wait" : "pointer",
                                            boxShadow: "0 2px 8px rgba(74,55,40,0.25)",
                                            transition: "transform 0.15s ease",
                                            flexShrink: 0,
                                            opacity: profileFetchingId === convo.characterId ? 0.6 : 1
                                        }}
                                    >
                                        {profileFetchingId === convo.characterId ? (
                                            <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                                                <path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            useChatStore.getState().deleteConversation(convo.characterId);
                                            setActionConvo(null);
                                            try {
                                                await fetch("/api/memory", {
                                                    method: "DELETE",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ characterId: convo.characterId })
                                                });
                                            } catch (err) { }
                                        }}
                                        aria-label="Delete"
                                        style={{
                                            width: "42px", height: "42px", borderRadius: "50%",
                                            border: "none", background: "#EF4444", color: "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
                                            transition: "transform 0.15s ease",
                                            flexShrink: 0
                                        }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                                        </svg>
                                    </button>
                                </div>

                                <motion.div
                                    className="chats-item"
                                    drag="x"
                                    dragConstraints={{ left: -110, right: 0 }}
                                    dragElastic={0.05}
                                    initial={false}
                                    animate={{ x: actionConvo === convo.characterId ? -110 : 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    onDragStart={() => setDraggingConvo(convo.characterId)}
                                    onDragEnd={(e, info) => {
                                        const isSwiped = info.offset.x < -35 || info.velocity.x < -80;
                                        if (isSwiped) setActionConvo(convo.characterId);
                                        else setActionConvo(null);
                                        setTimeout(() => setDraggingConvo(null), 200);
                                    }}
                                    onClick={(e) => {
                                        if (actionConvo) { e.stopPropagation(); setActionConvo(null); }
                                        else onSelectCharacter(char);
                                    }}
                                    style={{
                                        position: "relative", zIndex: 1,
                                        background: "#FFFDF5",
                                        WebkitUserSelect: "none", userSelect: "none",
                                        touchAction: "pan-y", WebkitTouchCallout: "none",
                                        cursor: "pointer"
                                    }}
                                    whileTap={{ cursor: "grabbing" }}
                                >
                                    <div className="chats-item-avatar">
                                        <img src={char.image} alt={char.name} style={{ pointerEvents: "none", width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }} />
                                        <span className="chats-item-online-dot" />
                                    </div>
                                    <div className="chats-item-info">
                                        <div className="chats-item-top">
                                            <span className="chats-item-name">{displayName}</span>
                                            <span className="chats-item-time">{formatTime(convo.lastTimestamp)}</span>
                                        </div>
                                        <div className="chats-item-bottom">
                                            <p className="chats-item-preview">
                                                {isAiLast && <span className="chats-item-preview-label">{displayName.split(" ")[0]}: </span>}
                                                {formatPreview(displayContent).length > 45
                                                    ? formatPreview(displayContent).slice(0, 45) + "..."
                                                    : formatPreview(displayContent)}
                                            </p>
                                            <div className="chats-item-meta">
                                                {unreadCount > 0 && <span className="chats-item-msg-count">{unreadCount}</span>}
                                                {isAiLast && unreadCount > 0 && <span className="chats-item-unread" />}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })
                    )}
                </AnimatePresence>
            </div>

            {/* Empty state */}
            {conversations.length === 0 && (
                <motion.div
                    key="chats-empty-state-final"
                    style={{
                        padding: "80px 24px", textAlign: "center",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: "transparent"
                    }}
                >
                    <div style={{
                        position: "relative", width: "140px", height: "140px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: "24px", background: "transparent"
                    }}>
                        <svg width="140" height="140" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <style>{`
                                @keyframes k-blink {
                                    0%, 96%, 100% { transform: scaleY(1); }
                                    98% { transform: scaleY(0.1); }
                                }
                                .eyes-anim {
                                    animation: k-blink 4s infinite;
                                    transform-origin: center;
                                    transform-box: fill-box;
                                }
                            `}</style>
                            <path d="M60 20C32.3858 20 10 39.0294 10 62.5C10 73.1 14.6 82.6 22 89.8L18 106C17.8 106.8 18.6 107.5 19.4 107.2L38 100.5C44.7 103.4 52.1 105 60 105C87.6142 105 110 85.9706 110 62.5C110 39.0294 87.6142 20 60 20Z" fill="#FFE566" stroke="#4A3728" strokeWidth="3.5" strokeLinejoin="round" />
                            <g className="eyes-anim">
                                <circle cx="42" cy="62" r="5.5" fill="#4A3728" />
                                <circle cx="78" cy="62" r="5.5" fill="#4A3728" />
                            </g>
                            <path d="M52 72C52 74 54 76 56 76C58 76 60 74 60 72C60 74 62 76 64 76C66 76 68 74 68 72" stroke="#4A3728" strokeWidth="3" strokeLinecap="round" />
                            <path d="M35 35C45 28 65 28 75 35" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
                        </svg>
                    </div>
                    <h3 style={{
                        fontFamily: "var(--font-display)", fontWeight: 900,
                        fontSize: "22px", color: "#4A3728",
                        marginBottom: "8px", letterSpacing: "-0.02em"
                    }}>No messages yet</h3>
                    <p style={{
                        fontSize: "15px", color: "#8B8680",
                        lineHeight: 1.5, maxWidth: "240px", margin: "0 auto"
                    }}>Find a character in Explore and start a fun conversation!</p>
                </motion.div>
            )}

            {/* Search empty */}
            {conversations.length > 0 && filteredConvos.length === 0 && searchQuery && (
                <motion.div
                    className="chats-empty-search"
                    style={{ padding: "40px 24px", textAlign: "center" }}
                >
                    <p style={{ fontWeight: 700, color: "#4A3728", fontSize: "18px" }}>No results</p>
                    <p style={{ color: "#9CA3AF", fontSize: "14px" }}>No conversations match &quot;{searchQuery}&quot;</p>
                </motion.div>
            )}

            {/* Filter empty */}
            {conversations.length > 0 && filteredConvos.length === 0 && !searchQuery && (
                <motion.div
                    className="chats-empty-filter"
                    style={{ padding: "80px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}
                >
                    <div style={{ width: "80px", height: "80px", marginBottom: "16px", background: "rgba(0,0,0,0.04)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
                        {activeFilter === "personal" ? "👤" : activeFilter === "group" ? "👥" : "📖"}
                    </div>
                    <p style={{ fontWeight: 700, color: "#4A3728", fontSize: "18px", marginBottom: "8px" }}>
                        {activeFilter === "personal" ? "No personal chats" : 
                         activeFilter === "group" ? "No groups" : 
                         "No stories"}
                    </p>
                    <p style={{ color: "#8B8680", fontSize: "14px", maxWidth: "240px" }}>
                        {activeFilter === "personal" ? "Start chatting with an AI character or astrologer from the Explore tab." : 
                         activeFilter === "group" ? "Create a group to chat with multiple characters at once." : 
                         "Create or join a story to start your adventure."}
                    </p>
                </motion.div>
            )}

            {/* Group Creation Modal */}
            <AnimatePresence>
                {showGroupModal && (
                    <GroupCreateModal
                        charMap={charMap}
                        conversations={conversations}
                        onClose={() => setShowGroupModal(false)}
                        onCreated={(groupId) => {
                            setShowGroupModal(false);
                            onSelectGroup?.(groupId);
                        }}
                    />
                )}
                {showWorldModal && (
                    <WorldBuildingModal
                        charMap={charMap}
                        conversations={conversations}
                        onClose={() => setShowWorldModal(false)}
                        onCreated={(groupId) => {
                            setShowWorldModal(false);
                            onSelectGroup?.(groupId);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
