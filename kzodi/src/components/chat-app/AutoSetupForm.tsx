"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AutoSetupFormProps {
    onComplete?: (data: any) => void;
}

export default function AutoSetupForm({ onComplete }: AutoSetupFormProps) {
    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [sourceType, setSourceType] = useState<"file" | "link">("file");
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<string>("");

    const [image, setImage] = useState("");

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setStatus("Initializing...");

        try {
            const formData = new FormData();
            formData.append("name", name);
            // We don't necessarily need to send nickname to backend if it's just for the form fill, 
            // but we can if we want the AI to recognize it. For now, we focus on prepopulating.
            formData.append("nickname", nickname);
            formData.append("type", sourceType);

            if (sourceType === "file" && file) {
                setStatus("Uploading & Reading file...");
                formData.append("file", file);
            } else if (sourceType === "link" && url) {
                setStatus("Scraping link content...");
                formData.append("url", url);
            } else {
                alert("Please provide a source.");
                setIsProcessing(false);
                return;
            }

            setStatus("Analyzing content with AI...");

            const response = await fetch("/api/character/setup", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to process source");
            }

            setStatus("Generating character profile...");
            // Slight delay to show success state
            await new Promise(r => setTimeout(r, 500));

            if (onComplete) {
                onComplete({ ...result.data, image, nickname });
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Error processing source.");
            setStatus("");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="auto-setup-form-wrap" style={{ padding: "0 4px" }}>
            <form onSubmit={handleSubmit} className="auto-setup-form">

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

                {/* Source Toggle */}
                <div className="form-section" style={{ marginTop: '16px' }}>
                    <label className="label-sm">Source Type</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setSourceType("file")}
                            className={`source-toggle-btn ${sourceType === "file" ? "active" : ""}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg> File Upload
                        </button>
                        <button
                            type="button"
                            onClick={() => setSourceType("link")}
                            className={`source-toggle-btn ${sourceType === "link" ? "active" : ""}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg> Web Link
                        </button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="form-section" style={{ marginTop: '16px' }}>
                    <AnimatePresence mode="wait">
                        {sourceType === "file" ? (
                            <motion.div
                                key="file-input"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <label className="label-sm">Upload Source File <span style={{ opacity: 0.5, fontWeight: 400 }}>(PDF, TXT, EPUB)</span></label>
                                <div className="file-drop-zone">
                                    <input
                                        type="file"
                                        accept=".pdf,.txt,.epub"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        id="source-file-upload"
                                    />
                                    <label htmlFor="source-file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', gap: '12px' }}>
                                        {file ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '56px', height: '56px',
                                                    background: '#FFF8D6', borderRadius: '16px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#4A3728', fontWeight: 'bold',
                                                    boxShadow: '0 4px 12px rgba(255, 229, 102, 0.2)'
                                                }}>
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                        <polyline points="14 2 14 8 20 8"></polyline>
                                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                                        <polyline points="10 9 9 9 8 9"></polyline>
                                                    </svg>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#4A3728' }}>{file.name}</div>
                                                    <div style={{ fontSize: '13px', color: '#9CA3AF' }}>{(file.size / 1024).toFixed(1)} KB</div>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#4A3728', fontWeight: 600, textDecoration: 'underline' }}>Change File</div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px', opacity: 0.8 }}>
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#4A3728' }}>Click to Upload File</div>
                                                    <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>PDF, TXT, or EPUB (Max 10MB)</div>
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="link-input"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <label className="label-sm">Wikipedia / Fandom Link</label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '14px', top: '14px', pointerEvents: 'none' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                        </svg>
                                    </div>
                                    <input
                                        type="url"
                                        className="input-field"
                                        placeholder="Paste URL here..."
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        required
                                        style={{ paddingLeft: '40px' }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Submit Button */}
                <div style={{ marginTop: "30px", paddingBottom: "40px" }}>
                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="btn-accent"
                        style={{
                            width: "100%",
                            height: "54px",
                            fontSize: "16px",
                            boxShadow: "0 8px 20px rgba(255, 229, 102, 0.4)",
                            opacity: isProcessing ? 0.7 : 1,
                            cursor: isProcessing ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px"
                        }}
                    >
                        {isProcessing ? (
                            <>
                                <div className="spinner-sm"></div>
                                <span>{status}</span>
                            </>
                        ) : (
                            <>
                                <span>Auto Setup Character</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="M12 5l7 7-7 7" />
                                </svg>
                            </>
                        )}
                    </button>
                    <p style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: "#9CA3AF" }}>
                        We will analyze the source and create a detailed profile for you.
                    </p>
                </div>

            </form>

            <style jsx>{`
                .auto-setup-form {
                    display: flex;
                    flex-direction: column;
                }
                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .label-sm {
                    font-size: 12px;
                    font-weight: 700;
                    color: #9CA3AF;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .input-field {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 12px;
                    border: 1.5px solid #F3F4F6;
                    background: #fff;
                    font-size: 14px;
                    transition: all 0.2s;
                    color: #4A3728;
                }
                .input-field:focus {
                    border-color: #FFE566;
                    box-shadow: 0 0 0 3px rgba(255, 229, 102, 0.15);
                    outline: none;
                }
                .source-toggle-btn {
                    flex: 1;
                    padding: 16px;
                    border-radius: 12px;
                    border: 1.5px solid #F3F4F6;
                    background: #fff;
                    font-size: 14px;
                    font-weight: 600;
                    color: #6B7280;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .source-toggle-btn.active {
                    background: #FFF8D6;
                    border-color: #FFE566;
                    color: #4A3728;
                }
                .file-drop-zone {
                    width: 100%;
                    height: 120px;
                    border: 2px dashed #E5E7EB;
                    border-radius: 12px;
                    background: #FAFAFA;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .file-drop-zone:hover {
                    border-color: #FFE566;
                    background: #FFFDF5;
                }
                .btn-accent {
                    background: #FFE566;
                    color: #4A3728;
                    font-weight: 700;
                    border: none;
                    border-radius: 14px;
                    transition: transform 0.1s, box-shadow 0.2s;
                }
                .btn-accent:active {
                    transform: scale(0.98);
                }
                .spinner-sm {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(74, 55, 40, 0.2);
                    border-top-color: #4A3728;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
