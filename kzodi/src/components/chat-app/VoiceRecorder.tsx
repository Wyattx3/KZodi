"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
    onTranscription: (text: string) => void;
    disabled?: boolean;
}

export default function VoiceRecorder({ onTranscription, disabled }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [slideX, setSlideX] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startXRef = useRef(0);
    const cancelledRef = useRef(false);
    const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

    const CANCEL_THRESHOLD = -80;

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setErrorMsg(null), 3000);
    };

    const startRecording = useCallback(async () => {
        if (disabled) return;

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError("🎤 Browser doesn't support audio recording");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true }
            });

            // Use webm/opus (best browser support) or fallback
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/ogg";

            const recorder = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];
            cancelledRef.current = false;
            setCancelled(false);
            setSlideX(0);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(t => t.stop());

                if (cancelledRef.current) {
                    chunksRef.current = [];
                    return;
                }

                if (chunksRef.current.length === 0) return;

                const blob = new Blob(chunksRef.current, { type: mimeType });
                chunksRef.current = [];

                // Only send if > 0.3s of audio (avoid accidental taps)
                if (blob.size < 1000) return;

                setIsTranscribing(true);
                try {
                    const formData = new FormData();
                    const ext = mimeType.includes("webm") ? "webm" : "ogg";
                    formData.append("audio", blob, `voice.${ext}`);

                    const res = await fetch("/api/voice", {
                        method: "POST",
                        body: formData,
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.text && data.text.trim()) {
                            onTranscription(data.text.trim());
                        }
                    } else {
                        console.error("[Voice] Transcription failed:", res.status);
                        showError("Transcription failed");
                    }
                } catch (err) {
                    console.error("[Voice] Error sending audio:", err);
                    showError("Network error");
                } finally {
                    setIsTranscribing(false);
                }
            };

            recorder.start(250); // Collect data every 250ms
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);

        } catch (err: any) {
            const errName = err?.name || "";
            if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
                showError("🎤 Microphone not found");
            } else if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
                showError("🎤 Microphone permission denied");
            } else {
                showError("🎤 Cannot access microphone");
            }
            console.warn("[Voice] Mic error:", errName, err?.message);
        }
    }, [disabled, onTranscription]);

    const stopRecording = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setDuration(0);
        setSlideX(0);
        setCancelled(false);
    }, []);

    const cancelRecording = useCallback(() => {
        cancelledRef.current = true;
        setCancelled(true);
        stopRecording();
    }, [stopRecording]);

    // Handle slide-to-cancel on pointer move
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isRecording) return;
        const dx = e.clientX - startXRef.current;
        if (dx < 0) {
            setSlideX(dx);
            if (dx < CANCEL_THRESHOLD) {
                cancelRecording();
            }
        }
    }, [isRecording, cancelRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    // Transcribing state — show spinner
    if (isTranscribing) {
        return (
            <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "6px 12px", borderRadius: "20px",
                background: "rgba(99, 102, 241, 0.1)",
            }}>
                <motion.div
                    style={{ width: 16, height: 16, border: "2px solid #6366f1", borderTop: "2px solid transparent", borderRadius: "50%" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 500 }}>Transcribing...</span>
            </div>
        );
    }

    // Recording state — show timer + slide-to-cancel
    if (isRecording) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    width: "100%", padding: "0 8px",
                    transform: `translateX(${slideX}px)`,
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={stopRecording}
                onPointerCancel={cancelRecording}
            >
                {/* Recording indicator */}
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: "#ef4444", flexShrink: 0,
                    }}
                />

                {/* Timer */}
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#ef4444", fontVariantNumeric: "tabular-nums", minWidth: "36px" }}>
                    {formatDuration(duration)}
                </span>

                {/* Waveform animation */}
                <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1 }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                height: [4, 8 + Math.random() * 16, 4],
                            }}
                            transition={{
                                duration: 0.4 + Math.random() * 0.4,
                                repeat: Infinity,
                                delay: i * 0.05,
                            }}
                            style={{
                                width: 3, borderRadius: 2,
                                background: `rgba(239, 68, 68, ${0.4 + Math.random() * 0.4})`,
                            }}
                        />
                    ))}
                </div>

                {/* Slide to cancel hint */}
                <motion.span
                    animate={{ opacity: [0.4, 0.7, 0.4], x: [-3, 3, -3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                    ◀ Slide to cancel
                </motion.span>
            </motion.div>
        );
    }

    // Default — mic button + Telegram-style error toast
    return (
        <>
            {/* Telegram-style bottom toast for errors */}
            <AnimatePresence>
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        style={{
                            position: "fixed",
                            bottom: "80px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "rgba(0, 0, 0, 0.8)",
                            color: "#fff",
                            padding: "10px 20px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 500,
                            zIndex: 9999,
                            pointerEvents: "none",
                            backdropFilter: "blur(10px)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                type="button"
                className="chatroom-input-attach"
                aria-label="Voice Message"
                onPointerDown={(e) => {
                    e.preventDefault();
                    startXRef.current = e.clientX;
                    startRecording();
                }}
                onPointerUp={stopRecording}
                onPointerCancel={cancelRecording}
                disabled={disabled}
                style={{ flexShrink: 0, opacity: disabled ? 0.4 : 1, touchAction: "none" }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
            </button>
        </>
    );
}

