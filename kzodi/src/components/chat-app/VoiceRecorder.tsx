"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
    onRecordComplete: (blob: Blob, duration: number) => void;
    disabled?: boolean;
}

export default function VoiceRecorder({ onRecordComplete, disabled }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [cancelled, setCancelled] = useState(false);
    const [slideX, setSlideX] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startXRef = useRef(0);
    const cancelledRef = useRef(false);
    const isPointerDownRef = useRef(false);
    const startTimeRef = useRef(0);
    const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Increase cancel threshold slightly for easier cancellations
    const CANCEL_THRESHOLD = -100;

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

            if (!isPointerDownRef.current) {
                // User let go before initialization finished
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            // Optimize for speech (16kbps is plenty for Whisper and uploads instantly)
            const recorder = new MediaRecorder(stream, { 
                mimeType,
                audioBitsPerSecond: 16000
            });
            chunksRef.current = [];
            cancelledRef.current = false;
            setCancelled(false);
            setSlideX(0);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                // Stop all tracks
                stream.getTracks().forEach((t) => t.stop());

                const wasCancelled = cancelledRef.current;
                const chunks = chunksRef.current;
                const blob = chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : null;
                
                // Clear immediately for next run
                chunksRef.current = [];

                if (wasCancelled || !blob) {
                    return;
                }

                // Only send if > 0.5s of audio (avoid accidental taps more cleanly)
                if (blob.size < 1000) return;

                // Fire completion using a slightly delayed effect to ensure states flush
                Promise.resolve().then(() => {
                    const actualSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
                    onRecordComplete(blob, actualSeconds);
                });
            };

            recorder.start(250); // Collect data every 250ms
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setDuration(0);
            startTimeRef.current = Date.now();

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
    }, [disabled, onRecordComplete, duration]);

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

    // Handle global pointer events to ensure slide-to-cancel works even if finger leaves the button
    useEffect(() => {
        if (!isRecording) return;
        
        const handleMove = (e: PointerEvent) => {
            const dx = e.clientX - startXRef.current;
            if (dx < 0) {
                setSlideX(dx);
                if (dx < CANCEL_THRESHOLD) {
                    cancelRecording();
                }
            }
        };

        const handleUp = () => {
            isPointerDownRef.current = false;
            stopRecording();
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', cancelRecording);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', cancelRecording);
        };
    }, [isRecording, cancelRecording, stopRecording, CANCEL_THRESHOLD]);

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

    // Recording state — show timer + slide-to-cancel overlaid securely
    if (isRecording) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    position: "absolute", inset: 0,
                    background: "#fff", zIndex: 50,
                    padding: "0 16px",
                    transform: `translateX(${slideX}px)`,
                    borderRadius: "24px", // match outer input bar shape if any
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                    touchAction: "none",
                } as React.CSSProperties}
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
                <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, overflow: "hidden", padding: "0 8px" }}>
                    {Array.from({ length: 30 }).map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                height: [4, 6 + Math.random() * 12, 4],
                            }}
                            transition={{
                                duration: 0.3 + Math.random() * 0.3,
                                repeat: Infinity,
                                delay: i * 0.05,
                            }}
                            style={{
                                flex: 1, maxWidth: "4px", borderRadius: 2,
                                background: `rgba(239, 68, 68, ${0.4 + Math.random() * 0.6})`,
                            }}
                        />
                    ))}
                </div>

                {/* Slide to cancel hint */}
                <motion.span
                    animate={{ opacity: [0.4, 0.8, 0.4], x: [-4, 4, -4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontSize: "13px", color: "#6B7280", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500 }}
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
                aria-label="Voice Message"
                onPointerDown={(e) => {
                    e.preventDefault();
                    isPointerDownRef.current = true;
                    startXRef.current = e.clientX;
                    startRecording();
                }}
                onPointerUp={() => {
                    isPointerDownRef.current = false;
                    if (!isRecording) {
                        cancelledRef.current = true;
                    } else {
                        stopRecording();
                    }
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerCancel={() => {
                    isPointerDownRef.current = false;
                    cancelRecording();
                }}
                disabled={disabled}
                style={{
                    background: "none",
                    border: "none",
                    color: disabled ? "rgba(0,0,0,0.2)" : "#38a3fd",
                    padding: "8px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none"
                }}
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

