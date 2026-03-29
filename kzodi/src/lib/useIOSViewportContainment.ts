"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";

const BODY_LOCK_CLASS = "ios-scroll-lock";

let bodyLockCount = 0;

function lockBody() {
    if (typeof document === "undefined") return;
    bodyLockCount += 1;
    if (bodyLockCount === 1) {
        document.body.classList.add(BODY_LOCK_CLASS);
    }
}

function unlockBody() {
    if (typeof document === "undefined") return;
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) {
        document.body.classList.remove(BODY_LOCK_CLASS);
    }
}

export interface IOSViewportContainmentOptions<T extends HTMLElement> {
    rootRef: RefObject<T | null>;
    enabled?: boolean;
    lockBody?: boolean;
    scrollableSelectors?: string[];
}

export function useIOSViewportContainment<T extends HTMLElement>({
    rootRef,
    enabled = true,
    lockBody: shouldLockBody = true,
    scrollableSelectors = [],
}: IOSViewportContainmentOptions<T>) {
    const isIOS = useMemo(() => {
        if (typeof navigator === "undefined") return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }, []);

    const [viewportHeight, setViewportHeight] = useState<number | string>("100dvh");
    const [viewportTop, setViewportTop] = useState(0);
    const frameRef = useRef<number | null>(null);
    const allowlistSelector = scrollableSelectors.filter(Boolean).join(", ");

    useEffect(() => {
        if (typeof window === "undefined" || !enabled || !isIOS) return;

        const visualViewport = window.visualViewport;

        if (shouldLockBody) {
            lockBody();
        }

        const syncViewport = () => {
            const nextHeight = Math.round(visualViewport?.height ?? window.innerHeight);
            const nextTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0));

            setViewportHeight((currentHeight) => {
                if (typeof currentHeight === "number" && currentHeight === nextHeight) {
                    return currentHeight;
                }
                return nextHeight;
            });

            setViewportTop((currentTop) => {
                if (currentTop === nextTop) {
                    return currentTop;
                }
                return nextTop;
            });
        };

        const scheduleViewportSync = () => {
            if (frameRef.current !== null) return;
            frameRef.current = window.requestAnimationFrame(() => {
                frameRef.current = null;
                syncViewport();
            });
        };

        window.addEventListener("resize", scheduleViewportSync);
        if (visualViewport) {
            visualViewport.addEventListener("resize", scheduleViewportSync);
            visualViewport.addEventListener("scroll", scheduleViewportSync);
        }

        scheduleViewportSync();

        return () => {
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }

            window.removeEventListener("resize", scheduleViewportSync);
            if (visualViewport) {
                visualViewport.removeEventListener("resize", scheduleViewportSync);
                visualViewport.removeEventListener("scroll", scheduleViewportSync);
            }

            if (shouldLockBody) {
                unlockBody();
            }
        };
    }, [enabled, isIOS, shouldLockBody]);

    useEffect(() => {
        if (typeof window === "undefined" || !enabled || !isIOS) return;

        const root = rootRef.current;
        if (!root) return;

        const handleTouchMove = (event: TouchEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (allowlistSelector && target.closest(allowlistSelector)) {
                return;
            }

            event.preventDefault();
        };

        root.addEventListener("touchmove", handleTouchMove, { passive: false });
        return () => root.removeEventListener("touchmove", handleTouchMove);
    }, [allowlistSelector, enabled, isIOS, rootRef]);

    const viewportStyle = useMemo(() => ({
        ["--ios-viewport-height" as "--ios-viewport-height"]: typeof viewportHeight === "number" ? `${viewportHeight}px` : viewportHeight,
        ["--ios-viewport-top" as "--ios-viewport-top"]: `${viewportTop}px`,
    }) as CSSProperties, [viewportHeight, viewportTop]);

    return {
        isIOS,
        viewportStyle,
    };
}
