"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Character } from "@/data/characters";

interface CreateCharacterFormProps {
    onSuccess?: (character: Character) => void;
    initialData?: {
        id?: string;
        name?: string;
        nickname?: string;
        tag?: string;
        description?: string;
        longDescription?: string;
        personality?: string;
        scenario?: string;
        greeting?: string;
        exampleDialogue?: string;
        voice?: string;
        tags?: string[];
        image?: string;
    };
}

import { SOURCE_CATEGORIES, CHARACTER_TAGS } from "@/data/characters";

// Custom Select Component for a premium feel
const CustomSelect = ({ options, value, onChange }: { options: string[], value: string, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="custom-select-container" style={{ position: 'relative' }}>
            <button
                type="button"
                className={`input-field custom-select-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: '#fff'
                }}
            >
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#4A3728' }}>{value}</span>
                <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                    <path d="M1 1L5 5L9 1" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="custom-select-dropdown"
                        style={{
                            position: 'absolute',
                            top: '110%',
                            left: 0,
                            right: 0,
                            background: '#fff',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                            border: '1px solid #F3F4F6',
                            zIndex: 100,
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: '6px'
                        }}
                    >
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className="custom-option"
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    fontSize: '13px',
                                    borderRadius: '8px',
                                    background: option === value ? '#FFF8D6' : 'transparent',
                                    color: option === value ? '#4A3728' : '#6B7280',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: option === value ? 600 : 400,
                                    marginBottom: '2px',
                                    transition: 'all 0.1s'
                                }}
                            >
                                {option}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            {isOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default function CreateCharacterForm({ onSuccess, initialData }: CreateCharacterFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [nickname, setNickname] = useState(initialData?.nickname || "");
    const [tag, setTag] = useState<string>(initialData?.tag || "Anime");
    const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
    const [description, setDescription] = useState(initialData?.description || "");
    const [longDescription, setLongDescription] = useState(initialData?.longDescription || "");
    const [personality, setPersonality] = useState(initialData?.personality || "");
    const [scenario, setScenario] = useState(initialData?.scenario || "");
    const [greeting, setGreeting] = useState(initialData?.greeting || "");
    const [exampleDialogue, setExampleDialogue] = useState(initialData?.exampleDialogue || "");
    const [image, setImage] = useState("");
    const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
    const [voice, setVoice] = useState(initialData?.voice || "Sweet");

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setNickname(initialData.nickname || "");
            setTag(initialData.tag || "Anime");
            setSelectedTags(initialData.tags || []);
            setDescription(initialData.description || "");
            setLongDescription(initialData.longDescription || "");
            setPersonality(initialData.personality || "");
            setScenario(initialData.scenario || "");
            setGreeting(initialData.greeting || "");
            setExampleDialogue(initialData.exampleDialogue || "");
            setVoice(initialData.voice || "Sweet");
            if (initialData.image) setImage(initialData.image);
        } else {
            // Reset form if no initial data
            setName("");
            setNickname("");
            setTag("Anime");
            setSelectedTags([]);
            setDescription("");
            setLongDescription("");
            setPersonality("");
            setScenario("");
            setGreeting("");
            setExampleDialogue("");
            setVoice("Sweet");
            setImage("");
        }
    }, [initialData]);

    const toggleTag = (t: string) => {
        if (selectedTags.includes(t)) {
            setSelectedTags(selectedTags.filter(i => i !== t));
        } else {
            if (selectedTags.length >= 10) return; // Limit to 10 tags
            setSelectedTags([...selectedTags, t]);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) {
            alert("Please upload a character image/avatar.");
            return;
        }

        const characterData: Character = {
            id: initialData?.id || Date.now().toString(),
            name,
            tag: tag as any,
            tags: selectedTags,
            description,
            longDescription,
            personality,
            scenario,
            greeting,
            exampleDialogue,
            image,
            visibility: visibility as any
        };

        if (initialData?.id) {
            console.log("Updating character:", characterData);
            alert("Character updated! (Simulation)");
        } else {
            console.log("Creating character:", characterData);
            // alert("Character created! (Simulation)");
        }
        if (onSuccess) onSuccess(characterData);
    };

    return (
        <div className="create-character-form-wrap" style={{ padding: "0 4px" }}>
            <form onSubmit={handleSubmit} className="create-character-form">

                {/* ── Visual Header (Avatar & Name) ── */}
                <div className="create-form-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                    <div className="avatar-input-wrapper" style={{ position: 'relative', marginBottom: '20px' }}>
                        <label
                            className="avatar-preview"
                            style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '32px',
                                background: image ? `url(${image}) center/cover` : '#F3F4F6',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
                                border: '4px solid #fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {!image ? (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            ) : (
                                <div className="avatar-overlay" style={{ opacity: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 0 0 0-2 2v14a2 0 0 0 2 2h14a2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>

                    <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Character Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={{
                                textAlign: 'center',
                                fontSize: '20px',
                                fontWeight: '700',
                                padding: '12px',
                                border: 'none',
                                background: 'transparent',
                                boxShadow: 'none',
                                borderBottom: '2px solid transparent'
                            }}
                        />
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Nickname (Optional)"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            style={{
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: '500',
                                padding: '8px',
                                border: 'none',
                                background: 'transparent',
                                boxShadow: 'none',
                                color: '#6B7280'
                            }}
                        />
                        <div style={{ height: '3px', width: '40px', background: '#FFE566', margin: '0 auto', borderRadius: '2px' }}></div>
                    </div>
                </div>

                <div className="form-grid-2">
                    <div className="form-section">
                        <label className="label-sm">Classifications</label>
                        <CustomSelect
                            options={SOURCE_CATEGORIES.filter(c => c !== "All")}
                            value={tag}
                            onChange={setTag}
                        />
                    </div>
                    <div className="form-section">
                        <label className="label-sm">Voice (TTS)</label>
                        <CustomSelect
                            options={["Sweet", "Energetic", "Sultry", "Deep", "Serious", "Playful", "Monotone"]}
                            value={voice}
                            onChange={setVoice}
                        />
                    </div>
                </div>

                <div className="form-section">
                    <label className="label-sm">Tags <span style={{ fontSize: "11px", fontWeight: "400", opacity: 0.6 }}>(Max 10)</span></label>
                    <div className="category-chips-wrap" style={{ maxHeight: '140px', overflowY: 'auto', padding: '4px' }}>
                        {CHARACTER_TAGS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                className={`chip-select-xs ${selectedTags.includes(t) ? "chip-select-active" : ""}`}
                                onClick={() => toggleTag(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-section">
                    <label className="label-sm">Short Description</label>
                    <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Briefly describe them for the card preview..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>

                {/* ── Details ── */}
                <div className="advanced-section">
                    <div className="section-header-line">
                        <span>Character Definition</span>
                        <div className="line"></div>
                    </div>

                    <div className="form-section">
                        <label className="label-sm">Greeting</label>
                        <textarea
                            className="input-field"
                            rows={3}
                            placeholder="What do they say first?"
                            value={greeting}
                            onChange={(e) => setGreeting(e.target.value)}
                            required
                            style={{ lineHeight: "1.5" }}
                        />
                    </div>

                    <div className="form-section" style={{ marginTop: "16px" }}>
                        <label className="label-sm">Long Description (Bio)</label>
                        <textarea
                            className="input-field"
                            rows={5}
                            placeholder="Deep dive into their lore, secrets, appearance, and detailed personality quirks..."
                            value={longDescription}
                            onChange={(e) => setLongDescription(e.target.value)}
                            style={{ fontSize: "13px", lineHeight: "1.5" }}
                        />
                    </div>

                    <div className="form-section" style={{ marginTop: "16px" }}>
                        <label className="label-sm">Personality</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Cold, Possessive, CEO, Smart, Tsundere"
                            value={personality}
                            onChange={(e) => setPersonality(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-section" style={{ marginTop: "16px" }}>
                        <label className="label-sm">Scenario</label>
                        <textarea
                            className="input-field"
                            rows={2}
                            placeholder="The current situation or context of the chat..."
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            style={{ fontSize: "13px" }}
                        />
                    </div>

                    <div className="form-section" style={{ marginTop: "16px" }}>
                        <label className="label-sm">Example Dialogue</label>
                        <textarea
                            className="input-field"
                            rows={8}
                            placeholder={`User: Hello\nChar: *looks away* Hmph. What do you want?\nUser: Just wanted to say hi.\nChar: Well... hi, I guess.\n\n(This helps the AI understand how to speak)`}
                            value={exampleDialogue}
                            onChange={(e) => setExampleDialogue(e.target.value)}
                            style={{ fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}
                        />
                        <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "6px" }}>
                            The more examples you provide, the better the character will behave.
                        </p>
                    </div>

                    <div className="form-section" style={{ marginTop: "20px" }}>
                        <label className="label-sm">Visibility</label>
                        <div className="visibility-options" style={{ display: "flex", gap: "10px" }}>
                            {(["public", "unlisted", "private"] as const).map(v => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setVisibility(v)}
                                    className={`visibility-btn ${visibility === v ? "active" : ""}`}
                                >
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: "30px", paddingBottom: "40px" }}>
                    <button type="submit" className="btn-accent" style={{ width: "100%", height: "54px", fontSize: "16px", boxShadow: "0 8px 20px rgba(255, 229, 102, 0.4)" }}>
                        {initialData?.id ? "Update Character" : "Create Character"}
                    </button>
                    <p style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: "#9CA3AF" }}>
                        By creating, you agree to our Terms of Service.
                    </p>
                </div>
            </form>

            <style jsx>{`
                .create-character-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .form-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .category-chips-wrap {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .chip-select-sm {
                    padding: 8px 14px;
                    font-size: 13px;
                    border-radius: 10px;
                    background: #fff;
                    border: 1.5px solid #F3F4F6;
                    color: #9CA3AF;
                    transition: all 0.2s;
                    font-weight: 600;
                    flex-shrink: 0;
                }
                .chip-select-xs {
                    padding: 6px 12px;
                    font-size: 11px;
                    border-radius: 8px;
                    background: #fff;
                    border: 1px solid #F3F4F6;
                    color: #9CA3AF;
                    transition: all 0.2s;
                    font-weight: 600;
                    flex-shrink: 0;
                }
                .chip-select-active {
                    background: #FFE566;
                    border-color: #FFE566;
                    color: #4A3728;
                    box-shadow: 0 4px 10px rgba(255, 229, 102, 0.3);
                }
                .select-wrapper {
                    position: relative;
                    width: 100%;
                }
                .styled-select {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    background-color: #fff;
                    cursor: pointer;
                    padding-right: 40px; /* Space for arrow */
                    font-size: 13px;
                    height: 48px;
                    width: 100%;
                }
                .select-arrow {
                    position: absolute;
                    top: 50%;
                    right: 16px;
                    transform: translateY(-50%);
                    pointer-events: none;
                    color: #9CA3AF;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .input-field {
                   transition: all 0.2s ease;
                }
                .input-field:focus {
                     border-color: #FFE566;
                     box-shadow: 0 0 0 3px rgba(255, 229, 102, 0.15);
                     outline: none;
                }
                .advanced-section {
                    margin-top: 12px;
                    border-top: 1px solid #F3F4F6;
                    padding-top: 24px;
                }
                .section-header-line {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                .section-header-line span {
                    font-size: 12px;
                    font-weight: 800;
                    color: #A39E98;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .section-header-line .line {
                    flex: 1;
                    height: 1px;
                    background: #F3F4F6;
                }
                .visibility-btn {
                    flex: 1;
                    padding: 12px;
                    border: 1.5px solid #F3F4F6;
                    background: #fff;
                    border-radius: 12px;
                    color: #9CA3AF;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .visibility-btn.active {
                    border-color: #4A3728;
                    background: #4A3728;
                    color: #fff;
                }
            `}</style>
        </div >
    );
}
