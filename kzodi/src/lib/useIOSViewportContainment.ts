"use client";

import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";

const BODY_LOCK_CLASS = "ios-scroll-lock";

let bodyLockCount = 0;

function lockBody() {
    if (typeof document === "undefined") return;
    bodyLockCount += 1;
    if (bodyLockCount === 1) {
        document.documentElement.classList.add(BODY_LOCK_CLASS);
        document.body.classList.add(BODY_LOCK_CLASS);
    }
}

function unlockBody() {
    if (typeof document === "undefined") return;
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) {
        document.documentElement.classList.remove(BODY_LOCK_CLASS);
        document.body.classList.remove(BODY_LOCK_CLASS);
    }
}

function detectIOS() {
    if (typeof navigator === "undefined") {
        return false;
    }

    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

interface ViewportContainmentState {
    viewportHeight: number | string;
    viewportTop: number;
    keyboardInset: number;
    keyboardOpen: boolean;
    composerHeight: number;
}

export interface IOSViewportContainmentOptions<T extends HTMLElement, C extends HTMLElement = HTMLElement> {
    rootRef: RefObject<T | null>;
    composerRef?: RefObject<C | null>;
    enabled?: boolean;
    lockBody?: boolean;
    followViewportPan?: boolean;
    scrollableSelectors?: string[];
}

export function useIOSViewportContainment<T extends HTMLElement, C extends HTMLElement = HTMLElement>({
    rootRef,
    composerRef,
    enabled = true,
    lockBody: shouldLockBody = true,
    followViewportPan = false,
    scrollableSelectors = [],
}: IOSViewportContainmentOptions<T, C>) {
    const isIOS = useMemo(() => detectIOS(), []);
    const isNativeApp = useMemo(() => Capacitor.isNativePlatform(), []);
    const isIOSLike = isIOS || (isNativeApp && Capacitor.getPlatform() === "ios");
    const [state, setState] = useState<ViewportContainmentState>({
        viewportHeight: "100dvh",
        viewportTop: 0,
        keyboardInset: 0,
        keyboardOpen: false,
        composerHeight: 0,
    });
    const frameRef = useRef<number | null>(null);
    const nativeKeyboardHeightRef = useRef(0);
    const allowlistSelector = scrollableSelectors.filter(Boolean).join(", ");

    useEffect(() => {
        if (enabled) {
            return;
        }

        nativeKeyboardHeightRef.current = 0;
        setState({
            viewportHeight: "100dvh",
            viewportTop: 0,
            keyboardInset: 0,
            keyboardOpen: false,
            composerHeight: 0,
        });
    }, [enabled]);

    useEffect(() => {
        if (!enabled || typeof window === "undefined") {
            return;
        }

        const syncViewport = () => {
            const visualViewport = window.visualViewport;
            const layoutHeight = window.innerHeight;
            const visualViewportHeight = Math.round(visualViewport?.height ?? layoutHeight);
            const rawVisualViewportTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0));
            const visualViewportTop = followViewportPan ? rawVisualViewportTop : 0;
            const visualViewportInset = Math.max(0, layoutHeight - visualViewportHeight - visualViewportTop);
            const nativeKeyboardInset = nativeKeyboardHeightRef.current;
            const effectiveKeyboardInset = visualViewportInset > 0 ? visualViewportInset : nativeKeyboardInset;
            const effectiveViewportHeight = visualViewportInset > 0
                ? visualViewportHeight
                : Math.max(0, layoutHeight - nativeKeyboardInset);

            setState((currentState) => {
                const nextState: ViewportContainmentState = {
                    viewportHeight: effectiveViewportHeight,
                    viewportTop: visualViewportTop,
                    keyboardInset: effectiveKeyboardInset,
                    keyboardOpen: effectiveKeyboardInset > 0,
                    composerHeight: currentState.composerHeight,
                };

                if (
                    currentState.viewportHeight === nextState.viewportHeight &&
                    currentState.viewportTop === nextState.viewportTop &&
                    currentState.keyboardInset === nextState.keyboardInset &&
                    currentState.keyboardOpen === nextState.keyboardOpen
                ) {
                    return currentState;
                }

                return nextState;
            });
        };

        const scheduleViewportSync = () => {
            if (frameRef.current !== null) return;
            frameRef.current = window.requestAnimationFrame(() => {
                frameRef.current = null;
                syncViewport();
            });
        };

        if (shouldLockBody) {
            lockBody();
        }

        const visualViewport = window.visualViewport;
        window.addEventListener("resize", scheduleViewportSync);
        window.addEventListener("orientationchange", scheduleViewportSync);
        visualViewport?.addEventListener("resize", scheduleViewportSync);
        if (followViewportPan) {
            visualViewport?.addEventListener("scroll", scheduleViewportSync);
        }

        scheduleViewportSync();

        return () => {
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }

            window.removeEventListener("resize", scheduleViewportSync);
            window.removeEventListener("orientationchange", scheduleViewportSync);
            visualViewport?.removeEventListener("resize", scheduleViewportSync);
            if (followViewportPan) {
                visualViewport?.removeEventListener("scroll", scheduleViewportSync);
            }

            if (shouldLockBody) {
                unlockBody();
            }
        };
    }, [enabled, followViewportPan, shouldLockBody]);

    useEffect(() => {
        if (!enabled || !isNativeApp) {
            return;
        }

        let cancelled = false;
        let removeWillShow: (() => void) | null = null;
        let removeDidShow: (() => void) | null = null;
        let removeWillHide: (() => void) | null = null;
        let removeDidHide: (() => void) | null = null;

        const scheduleViewportSync = () => {
            if (typeof window === "undefined") return;
            if (frameRef.current !== null) return;
            frameRef.current = window.requestAnimationFrame(() => {
                frameRef.current = null;
                const visualViewport = window.visualViewport;
                const layoutHeight = window.innerHeight;
                const visualViewportHeight = Math.round(visualViewport?.height ?? layoutHeight);
                const rawVisualViewportTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0));
                const visualViewportTop = followViewportPan ? rawVisualViewportTop : 0;
                const visualViewportInset = Math.max(0, layoutHeight - visualViewportHeight - visualViewportTop);
                const effectiveKeyboardInset = visualViewportInset > 0 ? visualViewportInset : nativeKeyboardHeightRef.current;
                const effectiveViewportHeight = visualViewportInset > 0
                    ? visualViewportHeight
                    : Math.max(0, layoutHeight - nativeKeyboardHeightRef.current);

                setState((currentState) => ({
                    ...currentState,
                    viewportHeight: effectiveViewportHeight,
                    viewportTop: visualViewportTop,
                    keyboardInset: effectiveKeyboardInset,
                    keyboardOpen: effectiveKeyboardInset > 0,
                }));
            });
        };

        const attachListeners = async () => {
            try {
                const willShow = await Keyboard.addListener("keyboardWillShow", (event) => {
                    nativeKeyboardHeightRef.current = event.keyboardHeight;
                    scheduleViewportSync();
                });
                const didShow = await Keyboard.addListener("keyboardDidShow", (event) => {
                    nativeKeyboardHeightRef.current = event.keyboardHeight;
                    scheduleViewportSync();
                });
                const willHide = await Keyboard.addListener("keyboardWillHide", () => {
                    nativeKeyboardHeightRef.current = 0;
                    scheduleViewportSync();
                });
                const didHide = await Keyboard.addListener("keyboardDidHide", () => {
                    nativeKeyboardHeightRef.current = 0;
                    scheduleViewportSync();
                });

                if (cancelled) {
                    void willShow.remove();
                    void didShow.remove();
                    void willHide.remove();
                    void didHide.remove();
                    return;
                }

                removeWillShow = () => {
                    void willShow.remove();
                };
                removeDidShow = () => {
                    void didShow.remove();
                };
                removeWillHide = () => {
                    void willHide.remove();
                };
                removeDidHide = () => {
                    void didHide.remove();
                };
            } catch {
                // Ignore native keyboard listener failures and fall back to visualViewport.
            }
        };

        void attachListeners();

        return () => {
            cancelled = true;
            removeWillShow?.();
            removeDidShow?.();
            removeWillHide?.();
            removeDidHide?.();
        };
    }, [enabled, followViewportPan, isNativeApp]);

    useEffect(() => {
        if (!enabled || typeof window === "undefined" || !composerRef?.current) {
            return;
        }

        const composer = composerRef.current;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            const nextHeight = Math.round(entry?.contentRect.height ?? composer.getBoundingClientRect().height);
            setState((currentState) => currentState.composerHeight === nextHeight
                ? currentState
                : { ...currentState, composerHeight: nextHeight });
        });

        observer.observe(composer);

        return () => {
            observer.disconnect();
        };
    }, [composerRef, enabled]);

    useEffect(() => {
        if (!enabled || typeof window === "undefined") {
            return;
        }

        const root = rootRef.current;
        if (!root) {
            return;
        }

        const handleTouchMove = (event: TouchEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            if (target.closest("[data-viewport-allow-touch]")) {
                return;
            }

            if (allowlistSelector && target.closest(allowlistSelector)) {
                return;
            }

            event.preventDefault();
        };

        root.addEventListener("touchmove", handleTouchMove, { passive: false });
        return () => root.removeEventListener("touchmove", handleTouchMove);
    }, [allowlistSelector, enabled, rootRef]);

    const viewportStyle = useMemo(() => ({
        ["--mobile-viewport-height" as "--mobile-viewport-height"]: typeof state.viewportHeight === "number" ? `${state.viewportHeight}px` : state.viewportHeight,
        ["--mobile-viewport-top" as "--mobile-viewport-top"]: `${state.viewportTop}px`,
        ["--mobile-keyboard-inset" as "--mobile-keyboard-inset"]: `${state.keyboardInset}px`,
        ["--mobile-composer-height" as "--mobile-composer-height"]: `${state.composerHeight}px`,
        ["--ios-viewport-height" as "--ios-viewport-height"]: typeof state.viewportHeight === "number" ? `${state.viewportHeight}px` : state.viewportHeight,
        ["--ios-viewport-top" as "--ios-viewport-top"]: `${state.viewportTop}px`,
    }) as CSSProperties, [state.composerHeight, state.keyboardInset, state.viewportHeight, state.viewportTop]);

    return {
        isIOS,
        isNativeApp,
        keyboardInset: state.keyboardInset,
        keyboardOpen: state.keyboardOpen,
        composerHeight: state.composerHeight,
        viewportStyle,
    };
}
