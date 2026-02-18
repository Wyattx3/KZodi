"use client";
import React, { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import LandingPage from "@/components/landing/LandingPage";
import ChatLandingPage from "@/components/landing/ChatLandingPage";
import TargetStep from "@/components/form/TargetStep";
import RelationshipStep from "@/components/form/RelationshipStep";
import RsDurationStep from "@/components/form/RsDurationStep";
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

type AppView = "landing" | "chat-landing" | "flow" | "mbti-test" | "loading" | "results";

export default function Home() {
  const store = useAppStore();
  const [view, setView] = useState<AppView>("landing");
  const [direction, setDirection] = useState(1);
  const [aiInsights, setAiInsights] = useState<Record<string, unknown> | null>(null);

  /* Landing */
  const handleLearnPersonality = () => {
    store.reset();
    store.setStep(0);
    setView("flow");
    setDirection(1);
  };

  const handleStartChat = () => {
    setView("chat-landing");
  };

  const handleChatGetStarted = () => {
    // Trigger Google sign-in
    import("next-auth/react").then(({ signIn }) => {
      signIn("google", { callbackUrl: "/chat" });
    });
  };

  const handleChatBack = () => {
    setView("landing");
  };

  /* Navigation helpers */
  const goForward = useCallback(() => {
    setDirection(1);
    store.nextStep();
  }, [store]);

  const goBack = useCallback(() => {
    setDirection(-1);
    if (store.currentStep === 0) {
      setView("landing");
    } else {
      store.prevStep();
    }
  }, [store]);

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

  const handleBirthday1 = (data: { birthYear: number; birthMonth: number; birthDay: number; birthTime: string }) => {
    store.setPerson1(data);
    goForward();
  };

  const handleLocation1 = (loc: BirthLocation) => {
    store.setPerson1({ birthLocation: loc });
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
    // If RS, go to person 2 birthday next; otherwise finish
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
      // If RS, continue to person 2
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

    // Parse birth time
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
          // Full birth data for chart
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

    // Step 0: Target selection
    steps.push({
      key: "target",
      component: <TargetStep onSelect={handleTargetSelect} />,
    });

    // Step 1: Relationship status
    steps.push({
      key: "relationship",
      component: <RelationshipStep onSelect={handleRelationshipSelect} />,
    });

    // Step 2 (if RS): Duration
    if (store.relationshipStatus === "rs") {
      steps.push({
        key: "rs-duration",
        component: <RsDurationStep onSubmit={handleRsDuration} />,
      });
    }

    // Next: Person 1 birthday
    steps.push({
      key: "birthday1",
      component: (
        <BirthdayStep
          personLabel={store.userTarget === "self" ? "Your" : "Person 1"}
          onSubmit={handleBirthday1}
        />
      ),
    });

    // Next: Person 1 location
    steps.push({
      key: "location1",
      component: (
        <LocationStep
          personLabel={store.userTarget === "self" ? "Your" : "Person 1"}
          onSubmit={handleLocation1}
        />
      ),
    });

    // Next: Person 1 MBTI
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

    // If RS: Person 2 birthday + location + MBTI
    if (store.relationshipStatus === "rs") {
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
  const currentStepData = steps[store.currentStep];

  return (
    <AnimatePresence mode="wait">
      {view === "landing" && (
        <LandingPage
          key="landing"
          onLearnPersonality={handleLearnPersonality}
          onStartChat={handleStartChat}
        />
      )}

      {view === "chat-landing" && (
        <ChatLandingPage
          key="chat-landing"
          onGetStarted={handleChatGetStarted}
          onBack={handleChatBack}
        />
      )}

      {view === "flow" && currentStepData && (
        <div key="flow">
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
      )}

      {view === "mbti-test" && (
        <div key="mbti-test" className="px-5 py-5 safe-top safe-bottom">
          <MBTITest
            onComplete={handleMBTITestComplete}
            onBack={handleMBTITestBack}
          />
        </div>
      )}

      {view === "loading" && (
        <LoadingScreen key="loading" />
      )}

      {view === "results" && (
        <ResultsPage
          key="results"
          person1={store.person1}
          person2={store.relationshipStatus === "rs" ? store.person2 : undefined}
          relationshipStatus={store.relationshipStatus || "single"}
          rsDuration={store.rsDuration}
          onBack={() => {
            store.reset();
            setView("landing");
            setAiInsights(null);
          }}
          aiInsights={aiInsights}
          birthChartData={store.birthChartData}
          sessionId={store.sessionId}
        />
      )}
    </AnimatePresence>
  );
}
