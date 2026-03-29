"use client";
import React, { useRef, useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useChatStore, type Conversation } from "@/lib/chatStore";
import { Character } from "@/data/characters";
import { useIOSViewportContainment } from "@/lib/useIOSViewportContainment";

interface WorldBuildingModalProps {
    charMap: Record<string, Character>;
    conversations: Conversation[];
    onClose: () => void;
    onCreated: (groupId: string) => void;
}

const ArrayInput = ({ label, items, setItems }: { label: string, items: string[], setItems: (i: string[]) => void }) => {
    const [val, setVal] = useState("");
    const add = () => {
        if (val.trim() && !items.includes(val.trim())) {
            setItems([...items, val.trim()]);
            setVal("");
        }
    };
    return (
        <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>
                {label.toUpperCase()}
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: items.length > 0 ? "8px" : "0" }}>
                {items.map((item, i) => (
                    <div key={i} style={{ background: "rgba(74,55,40,0.08)", padding: "4px 10px", borderRadius: "16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                        {item}
                        <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}>×</button>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
                <input 
                    value={val} onChange={e => setVal(e.target.value)} 
                    onKeyDown={e => e.key === "Enter" && add()}
                    placeholder={`Add ${label}...`}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", border: "1px solid #ddd", outline: "none" }}
                />
                <button onClick={add} style={{ padding: "8px 16px", background: "#4A3728", color: "#fff", border: "none", borderRadius: "10px" }}>Add</button>
            </div>
        </div>
    );
};

export default function WorldBuildingModal({ charMap, conversations, onClose, onCreated }: WorldBuildingModalProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [step, setStep] = useState<"select" | "info" | "world">("select");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [groupName, setGroupName] = useState("");
    const [groupImage, setGroupImage] = useState("");
    const [searchQ, setSearchQ] = useState("");
    const [resolvedChars, setResolvedChars] = useState<Record<string, Character>>({});
    const [retryTick, setRetryTick] = useState(0);
    
    // World Data Fields
    const [lore, setLore] = useState("");
    const [factions, setFactions] = useState<string[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [powerSystems, setPowerSystems] = useState<string[]>([]);
    const [laws, setLaws] = useState<string[]>([]);
    const [extras, setExtras] = useState<{label: string, value: string}[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const inFlightCharIdsRef = useRef<Set<string>>(new Set());
    const permanentFailedCharIdsRef = useRef<Set<string>>(new Set());
    const transientRetryStateRef = useRef<Map<string, { attempts: number; retryAfter: number }>>(new Map());
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const eligibleCharacterIds = useMemo(() => (
        conversations
            .filter(c => !c.isGroup && c.conversationType !== "story")
            .map(c => c.characterId)
    ), [conversations]);

    const eligibleCharacterIdsKey = useMemo(() => (
        [...eligibleCharacterIds].sort().join("|")
    ), [eligibleCharacterIds]);

    const availableChars = useMemo(() => {
        const enrichedCharMap = { ...charMap, ...resolvedChars };
        return conversations
            .filter(c => !c.isGroup && c.conversationType !== "story")
            .map(c => enrichedCharMap[c.characterId])
            .filter(Boolean);
    }, [conversations, charMap, resolvedChars]);

    useEffect(() => {
        const activeIds = new Set(eligibleCharacterIds);

        inFlightCharIdsRef.current.forEach(id => {
            if (!activeIds.has(id)) inFlightCharIdsRef.current.delete(id);
        });

        permanentFailedCharIdsRef.current.forEach(id => {
            if (!activeIds.has(id)) permanentFailedCharIdsRef.current.delete(id);
        });

        Array.from(transientRetryStateRef.current.keys()).forEach(id => {
            if (!activeIds.has(id)) {
                transientRetryStateRef.current.delete(id);
            }
        });

        // Refresh transient failures when the eligible character set changes,
        // so recoverable auth/network hiccups can be retried while the modal stays open.
        eligibleCharacterIds.forEach(id => {
            transientRetryStateRef.current.delete(id);
        });
    }, [eligibleCharacterIdsKey]);

    useEffect(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }

        let earliestRetryAfter: number | null = null;
        transientRetryStateRef.current.forEach((state, id) => {
            if (!eligibleCharacterIds.includes(id)) return;
            if (earliestRetryAfter === null || state.retryAfter < earliestRetryAfter) {
                earliestRetryAfter = state.retryAfter;
            }
        });

        if (earliestRetryAfter !== null) {
            const delay = Math.max(earliestRetryAfter - Date.now(), 0);
            retryTimerRef.current = setTimeout(() => {
                retryTimerRef.current = null;
                setRetryTick(t => t + 1);
            }, delay);
        }

        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, [eligibleCharacterIdsKey, retryTick]);

    useEffect(() => {
        eligibleCharacterIds.forEach((characterId) => {
            if (
                charMap[characterId]
                || resolvedChars[characterId]
                || inFlightCharIdsRef.current.has(characterId)
                || permanentFailedCharIdsRef.current.has(characterId)
            ) {
                return;
            }

            const retryState = transientRetryStateRef.current.get(characterId);
            if (retryState && retryState.retryAfter > Date.now()) {
                return;
            }

            inFlightCharIdsRef.current.add(characterId);
            fetch(`/api/characters/${characterId}`)
                .then(async (res) => {
                    if (res.ok) return { kind: "success" as const, data: await res.json() };
                    if (res.status === 403 || res.status === 404) return { kind: "permanent" as const, status: res.status };
                    throw new Error(`HTTP ${res.status}`);
                })
                .then(result => {
                    if (result.kind === "success" && result.data?.character) {
                        transientRetryStateRef.current.delete(characterId);
                        setRetryTick(t => t + 1);
                        setResolvedChars(prev => ({ ...prev, [characterId]: result.data.character }));
                        return;
                    }

                    if (result.kind === "permanent") {
                        transientRetryStateRef.current.delete(characterId);
                        permanentFailedCharIdsRef.current.add(characterId);
                        setRetryTick(t => t + 1);
                        return;
                    }

                    const attempts = (transientRetryStateRef.current.get(characterId)?.attempts || 0) + 1;
                    const retryAfter = Date.now() + Math.min(1000 * Math.pow(2, attempts - 1), 15000);
                    transientRetryStateRef.current.set(characterId, { attempts, retryAfter });
                    setRetryTick(t => t + 1);
                })
                .catch(err => {
                    const attempts = (transientRetryStateRef.current.get(characterId)?.attempts || 0) + 1;
                    const retryAfter = Date.now() + Math.min(1000 * Math.pow(2, attempts - 1), 15000);
                    transientRetryStateRef.current.set(characterId, { attempts, retryAfter });
                    setRetryTick(t => t + 1);
                    console.error("Failed to resolve world-building character", err);
                })
                .finally(() => {
                    inFlightCharIdsRef.current.delete(characterId);
                });
        });
    }, [eligibleCharacterIdsKey, charMap, resolvedChars, retryTick]);

    const filteredChars = useMemo(() => {
        if (!searchQ.trim()) return availableChars;
        const q = searchQ.toLowerCase();
        return availableChars.filter(c => c.name.toLowerCase().includes(q));
    }, [availableChars, searchQ]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreate = () => {
        if (!groupName.trim() || !groupImage) return;
        
        const worldData = {
            lore,
            factions,
            locations,
            powerSystems,
            laws,
            extras
        };

        const groupId = useChatStore.getState().createWorldGroup(groupName, selectedIds, groupImage, worldData);
        onCreated(groupId);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setGroupImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };
    const { viewportStyle } = useIOSViewportContainment({
        rootRef,
        scrollableSelectors: [".world-building-scroll-surface"],
    });

    return (
        <motion.div
            ref={rootRef}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
                ...viewportStyle,
                position: "fixed",
                top: "var(--ios-viewport-top, 0px)",
                left: 0,
                right: 0,
                height: "var(--ios-viewport-height, 100dvh)",
                zIndex: 1000,
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "flex-end", justifyContent: "center"
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: "100%", maxWidth: "480px", height: "85vh", maxHeight: "100%",
                    background: "#FFFDF5", borderRadius: "24px 24px 0 0",
                    display: "flex", flexDirection: "column", overflow: "hidden"
                }}
            >
                <div style={{
                    padding: "20px 20px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                            onClick={() => step === "world" ? setStep("info") : step === "info" ? setStep("select") : onClose()}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#4A3728", padding: "4px" }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div>
                            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#4A3728", margin: 0 }}>
                                {step === "select" ? "Select Characters" : step === "info" ? "World Info" : "World Building"}
                            </h2>
                            <p style={{ fontSize: "13px", color: "#8B8680", margin: 0 }}>
                                {step === "select" ? `${selectedIds.length} selected (min 1)` : step === "info" ? "Name & Avatar" : "Lore & Elements"}
                            </p>
                        </div>
                    </div>

                    {step === "select" && (
                        <motion.button onClick={() => setStep("info")} disabled={selectedIds.length === 0} style={{ background: selectedIds.length > 0 ? "#4A3728" : "#ccc", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontSize: "14px", fontWeight: 600, cursor: selectedIds.length > 0 ? "pointer" : "default" }}>
                            Next →
                        </motion.button>
                    )}

                    {step === "info" && (
                        <motion.button onClick={() => setStep("world")} disabled={!groupName || !groupImage} style={{ background: (groupName && groupImage) ? "#4A3728" : "#ccc", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontSize: "14px", fontWeight: 600, cursor: (groupName && groupImage) ? "pointer" : "default" }}>
                            Next →
                        </motion.button>
                    )}

                    {step === "world" && (
                        <motion.button onClick={handleCreate} style={{ background: "#4A3728", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                            Create ✨
                        </motion.button>
                    )}
                </div>

                {step === "select" && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.04)", borderRadius: "12px", padding: "10px 14px" }}>
                                <input type="text" placeholder="Search contacts..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ background: "none", border: "none", outline: "none", fontSize: "14px", color: "#4A3728", width: "100%" }} />
                            </div>
                        </div>
                        <div className="world-building-scroll-surface" style={{ flex: 1, overflowY: "auto", padding: "0 8px 20px" }}>
                            {filteredChars.map(c => {
                                const isSelected = selectedIds.includes(c.id);
                                return (
                                    <div key={c.id} onClick={() => toggleSelect(c.id)} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px", borderRadius: "14px", cursor: "pointer", background: isSelected ? "rgba(74,55,40,0.06)" : "transparent" }}>
                                        <img src={c.image} alt={c.name} style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: isSelected ? "2px solid #111827" : "2px solid transparent" }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "15px", fontWeight: 600, color: "#4A3728" }}>{c.name}</div>
                                            <div style={{ fontSize: "12px", color: "#8B8680" }}>{c.tag}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === "info" && (
                    <div style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", gap: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
                            <div onClick={() => fileInputRef.current?.click()} style={{ width: "90px", height: "90px", borderRadius: "50%", background: groupImage ? `url(${groupImage}) center/cover` : "linear-gradient(135deg, #eee, #ddd)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed #bbb" }}>
                                {!groupImage && "Avatar"}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>WORLD NAME</label>
                            <input type="text" placeholder="Enter world name..." value={groupName} onChange={e => setGroupName(e.target.value)} style={{ width: "100%", padding: "14px 16px", fontSize: "16px", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: "14px", outline: "none" }} />
                        </div>
                    </div>
                )}

                {step === "world" && (
                    <div className="world-building-scroll-surface" style={{ flex: 1, padding: "24px 20px", overflowY: "auto" }}>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>LORE / DESCRIPTION</label>
                            <textarea placeholder="Describe the world..." value={lore} onChange={e => setLore(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #ddd", minHeight: "100px", outline: "none", resize: "vertical" }} />
                        </div>
                        <ArrayInput label="Factions" items={factions} setItems={setFactions} />
                        <ArrayInput label="Locations" items={locations} setItems={setLocations} />
                        <ArrayInput label="Power Systems" items={powerSystems} setItems={setPowerSystems} />
                        <ArrayInput label="Laws / Rules" items={laws} setItems={setLaws} />
                        
                        <div style={{ marginTop: "20px" }}>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "#8B8680", marginBottom: "8px", display: "block" }}>EXTRA FIELDS</label>
                            {extras.map((extra, i) => (
                                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                    <input value={extra.label} onChange={e => { const ne = [...extras]; ne[i].label = e.target.value; setExtras(ne); }} placeholder="Label" style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }} />
                                    <input value={extra.value} onChange={e => { const ne = [...extras]; ne[i].value = e.target.value; setExtras(ne); }} placeholder="Value" style={{ flex: 2, padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }} />
                                    <button onClick={() => setExtras(extras.filter((_, idx) => idx !== i))} style={{ padding: "8px", background: "#fee", color: "red", border: "none", borderRadius: "8px" }}>×</button>
                                </div>
                            ))}
                            <button onClick={() => setExtras([...extras, { label: "", value: "" }])} style={{ padding: "8px 16px", background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", width: "100%" }}>+ Add Field</button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
