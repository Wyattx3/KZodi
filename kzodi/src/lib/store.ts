import { create } from "zustand";

export type UserTarget = "self" | "others";
export type RelationshipStatus = "single" | "rs";

export interface BirthLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
  tz: number;
}

export interface PersonInfo {
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthTime: string;
  birthLocation: BirthLocation | null;
  mbti: string;
}

export interface AppState {
  /* Session */
  sessionId: string;

  /* Navigation */
  currentStep: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  /* User selection */
  userTarget: UserTarget | null;
  setUserTarget: (t: UserTarget) => void;

  relationshipStatus: RelationshipStatus | null;
  setRelationshipStatus: (s: RelationshipStatus) => void;

  rsDuration: string;
  setRsDuration: (d: string) => void;

  /* Person data */
  person1: PersonInfo;
  setPerson1: (p: Partial<PersonInfo>) => void;

  person2: PersonInfo;
  setPerson2: (p: Partial<PersonInfo>) => void;

  /* MBTI test */
  mbtiTestTarget: 1 | 2 | null;
  setMbtiTestTarget: (t: 1 | 2 | null) => void;
  mbtiAnswers: Record<number, "a" | "b">;
  setMbtiAnswer: (q: number, a: "a" | "b") => void;
  resetMbtiAnswers: () => void;

  /* Birth chart data (from server) */
  birthChartData: Record<string, unknown> | null;
  setBirthChartData: (d: Record<string, unknown> | null) => void;

  /* Results */
  results: Record<string, unknown> | null;
  setResults: (r: Record<string, unknown>) => void;
  isLoading: boolean;
  setIsLoading: (l: boolean) => void;

  /* Reset */
  reset: () => void;
}

const defaultPerson: PersonInfo = {
  birthYear: null,
  birthMonth: null,
  birthDay: null,
  birthTime: "",
  birthLocation: null,
  mbti: "",
};

function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useAppStore = create<AppState>((set) => ({
  sessionId: generateSessionId(),

  currentStep: 0,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
  prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),

  userTarget: null,
  setUserTarget: (t) => set({ userTarget: t }),

  relationshipStatus: null,
  setRelationshipStatus: (s) => set({ relationshipStatus: s }),

  rsDuration: "",
  setRsDuration: (d) => set({ rsDuration: d }),

  person1: { ...defaultPerson },
  setPerson1: (p) => set((s) => ({ person1: { ...s.person1, ...p } })),

  person2: { ...defaultPerson },
  setPerson2: (p) => set((s) => ({ person2: { ...s.person2, ...p } })),

  mbtiTestTarget: null,
  setMbtiTestTarget: (t) => set({ mbtiTestTarget: t }),
  mbtiAnswers: {},
  setMbtiAnswer: (q, a) =>
    set((s) => ({ mbtiAnswers: { ...s.mbtiAnswers, [q]: a } })),
  resetMbtiAnswers: () => set({ mbtiAnswers: {} }),

  birthChartData: null,
  setBirthChartData: (d) => set({ birthChartData: d }),

  results: null,
  setResults: (r) => set({ results: r }),
  isLoading: false,
  setIsLoading: (l) => set({ isLoading: l }),

  reset: () =>
    set({
      sessionId: generateSessionId(),
      currentStep: 0,
      userTarget: null,
      relationshipStatus: null,
      rsDuration: "",
      person1: { ...defaultPerson },
      person2: { ...defaultPerson },
      mbtiTestTarget: null,
      mbtiAnswers: {},
      birthChartData: null,
      results: null,
      isLoading: false,
    }),
}));
