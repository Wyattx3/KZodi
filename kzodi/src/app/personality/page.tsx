"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import TargetStep from "@/components/form/TargetStep";
import RelationshipStep from "@/components/form/RelationshipStep";
import RsDurationStep from "@/components/form/RsDurationStep";
import NameStep from "@/components/form/NameStep";
import BirthdayStep from "@/components/form/BirthdayStep";
import LocationStep from "@/components/form/LocationStep";
import MBTIStep from "@/components/form/MBTIStep";
import MBTITest from "@/components/form/MBTITest";
import ProgressBar from "@/components/ui/ProgressBar";
import StepWrapper from "@/components/ui/StepWrapper";
import ResultsPage from "@/components/results/ResultsPage";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAppStore, type BirthLocation } from "@/lib/store";
import { getZodiacSign } from "@/lib/zodiac";

type AppView = "flow" | "mbti-test" | "loading" | "results";

export default function PersonalityPage() {
    const store = useAppStore();
    const router = useRouter();
    const [view, setView] = useState<AppView>("flow");
    const [direction, setDirection] = useState(1);
    const [aiInsights, setAiInsights] = useState<Record<string, unknown> | null>(null);

    // Initialize step to 0 when mounted to ensure it starts fresh if they just navigated here
    useEffect(() => {
        // If we're at step 0 and want to know personality, we might just keep the current store state
        // but typically it is reset before pushing here.
    }, []);

    const handleAskAstrologer = () => {
        if (store.sessionId) {
            localStorage.setItem("pendingAstrologerRedirect", "true");
            localStorage.setItem("kakoei_session_id", store.sessionId);
        }
        router.push("/?view=chat-landing");
    };

    /* Navigation helpers */
    const goForward = useCallback(() => {
        setDirection(1);
        store.nextStep();
    }, [store]);

    const goBack = useCallback(() => {
        setDirection(-1);
        if (store.currentStep === 0) {
            router.push("/");
        } else {
            store.prevStep();
        }
    }, [store, router]);

    /* Step handlers */
    const handleTargetSelect = (target: "self" | "others") => {
        store.setUserTarget(target);
        goForward();
    };

    const handleRelationshipSelect = (status: "single" | "rs") => {
        store.setRelationshipStatus(status);
        goForward();
    };

    const handleRsDuration = (duration: string) => {
        store.setRsDuration(duration);
        goForward();
    };

    const handleName1 = (name: string) => {
        store.setPerson1({ name });
        goForward();
    };

    const handleBirthday1 = (data: { birthYear: number; birthMonth: number; birthDay: number; birthTime: string }) => {
        store.setPerson1(data);
        goForward();
    };

    const handleLocation1 = (loc: BirthLocation) => {
        store.setPerson1({ birthLocation: loc });
        goForward();
    };

    const handleName2 = (name: string) => {
        store.setPerson2({ name });
        goForward();
    };

    const handleBirthday2 = (data: { birthYear: number; birthMonth: number; birthDay: number; birthTime: string }) => {
        store.setPerson2(data);
        goForward();
    };

    const handleLocation2 = (loc: BirthLocation) => {
        store.setPerson2({ birthLocation: loc });
        goForward();
    };

    const handleMBTI1 = (mbti: string) => {
        store.setPerson1({ mbti });
        if (store.relationshipStatus === "rs") {
            goForward();
        } else {
            triggerAnalysis({ ...store.person1, mbti });
        }
    };

    const handleMBTIDontKnow1 = () => {
        store.setMbtiTestTarget(1);
        setView("mbti-test");
    };

    const handleMBTI2 = (mbti: string) => {
        store.setPerson2({ mbti });
        triggerAnalysis(undefined, { ...store.person2, mbti });
    };

    const handleMBTIDontKnow2 = () => {
        store.setMbtiTestTarget(2);
        setView("mbti-test");
    };

    const handleMBTITestComplete = (result: string) => {
        if (store.mbtiTestTarget === 1) {
            store.setPerson1({ mbti: result });
            store.setMbtiTestTarget(null);
            store.resetMbtiAnswers();
            setView("flow");
            if (store.relationshipStatus === "rs") {
                goForward();
            } else {
                triggerAnalysis({ ...store.person1, mbti: result });
            }
        } else if (store.mbtiTestTarget === 2) {
            store.setPerson2({ mbti: result });
            store.setMbtiTestTarget(null);
            store.resetMbtiAnswers();
            setView("flow");
            triggerAnalysis(undefined, { ...store.person2, mbti: result });
        }
    };

    const handleMBTITestBack = () => {
        store.setMbtiTestTarget(null);
        store.resetMbtiAnswers();
        setView("flow");
    };

    /* Analysis trigger */
    const triggerAnalysis = async (
        p1Override?: Partial<typeof store.person1>,
        p2Override?: Partial<typeof store.person2>
    ) => {
        setView("loading");
        store.setIsLoading(true);

        const p1 = { ...store.person1, ...p1Override };
        const p2 = store.relationshipStatus === "rs" ? { ...store.person2, ...p2Override } : null;

        const sign1 = p1.birthMonth && p1.birthDay ? getZodiacSign(p1.birthMonth, p1.birthDay) : "aries";
        const sign2 = p2?.birthMonth && p2?.birthDay ? getZodiacSign(p2.birthMonth, p2.birthDay) : undefined;

        const parseTime = (t: string) => {
            const parts = t.split(":");
            return { hour: parseInt(parts[0]) || 12, minute: parseInt(parts[1]) || 0 };
        };

        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: store.sessionId,
                    zodiacSign: sign1,
                    mbtiType: p1.mbti || "",
                    partnerZodiac: sign2,
                    partnerMbti: p2?.mbti || "",
                    relationshipStatus: store.relationshipStatus || "single",
                    rsDuration: store.rsDuration,
                    birthData: {
                        year: p1.birthYear,
                        month: p1.birthMonth,
                        day: p1.birthDay,
                        ...parseTime(p1.birthTime || "12:00"),
                        latitude: p1.birthLocation?.lat || 0,
                        longitude: p1.birthLocation?.lng || 0,
                        timezone: p1.birthLocation?.tz || 0,
                    },
                    partnerBirthData: p2 ? {
                        year: p2.birthYear,
                        month: p2.birthMonth,
                        day: p2.birthDay,
                        ...parseTime(p2.birthTime || "12:00"),
                        latitude: p2.birthLocation?.lat || 0,
                        longitude: p2.birthLocation?.lng || 0,
                        timezone: p2.birthLocation?.tz || 0,
                    } : null,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setAiInsights(data.data);
                    if (data.birthChart) {
                        store.setBirthChartData(data.birthChart);
                    }
                    if (data.partnerBirthChart) {
                        store.setPartnerBirthChartData(data.partnerBirthChart);
                    }
                } else {
                    console.error("API returned error:", data.error);
                }
            } else {
                console.error("API request failed:", res.status);
            }
        } catch (e) {
            console.error("Analysis fetch error:", e);
        }

        store.setIsLoading(false);
        setView("results");
    };

    /* Build steps based on flow */
    const getFlowSteps = () => {
        const steps: { key: string; component: React.ReactNode }[] = [];

        steps.push({
            key: "target",
            component: <TargetStep onSelect={handleTargetSelect} />,
        });

        steps.push({
            key: "relationship",
            component: <RelationshipStep onSelect={handleRelationshipSelect} />,
        });

        if (store.relationshipStatus === "rs") {
            steps.push({
                key: "rs-duration",
                component: <RsDurationStep onSubmit={handleRsDuration} />,
            });
        }

        steps.push({
            key: "name1",
            component: (
                <NameStep
                    personLabel={store.userTarget === "self" ? "Your" : "Person 1"}
                    onSubmit={handleName1}
                />
            ),
        });

        steps.push({
            key: "birthday1",
            component: (
                <BirthdayStep
                    personLabel={store.userTarget === "self" ? "Your" : "Person 1"}
                    onSubmit={handleBirthday1}
                />
            ),
        });

        steps.push({
            key: "location1",
            component: (
                <LocationStep
                    personLabel={store.userTarget === "self" ? "Your" : "Person 1"}
                    onSubmit={handleLocation1}
                />
            ),
        });

        steps.push({
            key: "mbti1",
            component: (
                <MBTIStep
                    personLabel={store.userTarget === "self" ? "Your" : "Person 1"}
                    onSelect={handleMBTI1}
                    onDontKnow={handleMBTIDontKnow1}
                />
            ),
        });

        if (store.relationshipStatus === "rs") {
            steps.push({
                key: "name2",
                component: (
                    <NameStep
                        personLabel="Partner"
                        onSubmit={handleName2}
                    />
                ),
            });
            steps.push({
                key: "birthday2",
                component: (
                    <BirthdayStep
                        personLabel="Partner"
                        onSubmit={handleBirthday2}
                    />
                ),
            });
            steps.push({
                key: "location2",
                component: (
                    <LocationStep
                        personLabel="Partner"
                        onSubmit={handleLocation2}
                    />
                ),
            });
            steps.push({
                key: "mbti2",
                component: (
                    <MBTIStep
                        personLabel="Partner"
                        onSelect={handleMBTI2}
                        onDontKnow={handleMBTIDontKnow2}
                    />
                ),
            });
        }

        return steps;
    };

    const steps = getFlowSteps();
    const totalSteps = steps.length;
    const currentStepData = steps[store.currentStep] || steps[steps.length - 1] || null;

    return (
        <div className="chat-app" style={{ height: '100dvh', overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
                {view === "flow" && currentStepData && (
                    <div key="flow" className="chat-app-view">
                        <div className="chat-app-content">
                            <div className="px-5 pt-4">
                                <ProgressBar currentStep={store.currentStep} totalSteps={totalSteps} />
                            </div>
                            <StepWrapper
                                stepKey={currentStepData.key}
                                direction={direction}
                                onBack={goBack}
                                title="Want to Know Personality"
                                subtitle={`Step ${store.currentStep + 1} of ${totalSteps}`}
                            >
                                {currentStepData.component}
                            </StepWrapper>
                        </div>
                    </div>
                )}

                {view === "mbti-test" && (
                    <div key="mbti-test" className="chat-app-view">
                        <div className="chat-app-content px-5 py-5 safe-top safe-bottom">
                            <MBTITest
                                onComplete={handleMBTITestComplete}
                                onBack={handleMBTITestBack}
                            />
                        </div>
                    </div>
                )}

                {view === "loading" && (
                    <div key="loading" className="chat-app-view h-full w-full">
                        <LoadingScreen />
                    </div>
                )}

                {view === "results" && (
                    <div key="results" className="chat-app-view h-full w-full">
                        <div className="chat-app-content">
                            <ResultsPage
                                person1={store.person1}
                                person2={store.relationshipStatus === "rs" ? store.person2 : undefined}
                                relationshipStatus={store.relationshipStatus || "single"}
                                rsDuration={store.rsDuration}
                                onBack={() => {
                                    store.reset();
                                    setAiInsights(null);
                                    router.push("/");
                                }}
                                aiInsights={aiInsights}
                                birthChartData={store.birthChartData}
                                partnerBirthChartData={store.partnerBirthChartData}
                                sessionId={store.sessionId}
                                onAskAstrologer={handleAskAstrologer}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
