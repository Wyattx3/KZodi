export interface ZodiacSign {
  name: string;
  symbol: string;
  element: string;
  quality: string;
  rulingPlanet: string;
  dateRange: string;
  traits: string[];
  loveStyle: string;
  compatibleSigns: string[];
  luckyNumbers: number[];
  luckyColors: string[];
  strengths: string[];
  weaknesses: string[];
  personalityDescription: string;
  loveDescription: string;
}

const zodiacSigns: Record<string, ZodiacSign> = {
  aries: {
    name: "Aries",
    symbol: "Ar",
    element: "Fire",
    quality: "Cardinal",
    rulingPlanet: "Mars",
    dateRange: "Mar 21 - Apr 19",
    traits: ["Courageous", "Energetic", "Confident", "Passionate"],
    loveStyle: "Bold & Direct",
    compatibleSigns: ["Leo", "Sagittarius", "Gemini", "Aquarius"],
    luckyNumbers: [1, 8, 17],
    luckyColors: ["Red", "Orange"],
    strengths: ["Leadership", "Bravery", "Honesty", "Determination"],
    weaknesses: ["Impatient", "Impulsive", "Short-tempered"],
    personalityDescription:
      "Aries are natural-born leaders with fierce determination. They charge headfirst into challenges and inspire others with their boundless energy. Their enthusiasm is contagious and they thrive on competition.",
    loveDescription:
      "In love, Aries are passionate and direct. They fall fast, love hard, and express their feelings openly. They need a partner who can match their energy and isn't afraid of a little healthy debate.",
  },
  taurus: {
    name: "Taurus",
    symbol: "Ta",
    element: "Earth",
    quality: "Fixed",
    rulingPlanet: "Venus",
    dateRange: "Apr 20 - May 20",
    traits: ["Reliable", "Patient", "Devoted", "Sensual"],
    loveStyle: "Loyal & Sensual",
    compatibleSigns: ["Virgo", "Capricorn", "Cancer", "Pisces"],
    luckyNumbers: [2, 6, 9],
    luckyColors: ["Green", "Pink"],
    strengths: ["Dependability", "Persistence", "Loyalty", "Practicality"],
    weaknesses: ["Stubborn", "Possessive", "Materialistic"],
    personalityDescription:
      "Taurus values stability and comfort above all. They are grounded, patient, and incredibly loyal. Their appreciation for beauty and the finer things in life makes them excellent at creating warm, inviting spaces.",
    loveDescription:
      "Taurus loves deeply and steadfastly. They show love through acts of service and physical affection. Once committed, they are unwaveringly devoted partners who build lasting relationships.",
  },
  gemini: {
    name: "Gemini",
    symbol: "Ge",
    element: "Air",
    quality: "Mutable",
    rulingPlanet: "Mercury",
    dateRange: "May 21 - Jun 20",
    traits: ["Adaptable", "Curious", "Witty", "Communicative"],
    loveStyle: "Playful & Intellectual",
    compatibleSigns: ["Libra", "Aquarius", "Aries", "Leo"],
    luckyNumbers: [5, 7, 14],
    luckyColors: ["Yellow", "Light Green"],
    strengths: ["Versatility", "Intelligence", "Charm", "Quick-wittedness"],
    weaknesses: ["Indecisive", "Restless", "Inconsistent"],
    personalityDescription:
      "Gemini is the social butterfly of the zodiac. Their dual nature makes them adaptable and versatile. They have insatiable curiosity and can hold conversations on virtually any topic, making them endlessly fascinating.",
    loveDescription:
      "Gemini needs mental stimulation in love. They're attracted to intelligence and humor. Communication is their love language, and they thrive with partners who can keep up with their quick minds and ever-changing interests.",
  },
  cancer: {
    name: "Cancer",
    symbol: "Ca",
    element: "Water",
    quality: "Cardinal",
    rulingPlanet: "Moon",
    dateRange: "Jun 21 - Jul 22",
    traits: ["Nurturing", "Intuitive", "Protective", "Emotional"],
    loveStyle: "Nurturing & Devoted",
    compatibleSigns: ["Scorpio", "Pisces", "Taurus", "Virgo"],
    luckyNumbers: [2, 7, 11],
    luckyColors: ["Silver", "White"],
    strengths: ["Empathy", "Intuition", "Loyalty", "Tenacity"],
    weaknesses: ["Moody", "Clingy", "Oversensitive"],
    personalityDescription:
      "Cancer is the nurturer of the zodiac. Their deep emotional intelligence allows them to read people and situations with remarkable accuracy. They create safe spaces for those they love and have an incredible memory for meaningful moments.",
    loveDescription:
      "Cancer loves with their entire being. They are devoted, protective partners who express love through care and creating a warm home. They seek deep emotional connections and value security in relationships above all.",
  },
  leo: {
    name: "Leo",
    symbol: "Le",
    element: "Fire",
    quality: "Fixed",
    rulingPlanet: "Sun",
    dateRange: "Jul 23 - Aug 22",
    traits: ["Charismatic", "Generous", "Creative", "Dramatic"],
    loveStyle: "Grand & Romantic",
    compatibleSigns: ["Aries", "Sagittarius", "Gemini", "Libra"],
    luckyNumbers: [1, 3, 10],
    luckyColors: ["Gold", "Orange"],
    strengths: ["Leadership", "Creativity", "Warmth", "Generosity"],
    weaknesses: ["Arrogant", "Attention-seeking", "Domineering"],
    personalityDescription:
      "Leo radiates warmth and charisma like the Sun that rules them. They are natural performers with huge hearts and generous spirits. Their confidence inspires those around them, and they have an innate ability to light up any room.",
    loveDescription:
      "Leo loves grandly and dramatically. They shower their partners with affection, gifts, and attention. They need admiration and appreciation in return, and thrive with partners who celebrate them openly.",
  },
  virgo: {
    name: "Virgo",
    symbol: "Vi",
    element: "Earth",
    quality: "Mutable",
    rulingPlanet: "Mercury",
    dateRange: "Aug 23 - Sep 22",
    traits: ["Analytical", "Practical", "Diligent", "Modest"],
    loveStyle: "Thoughtful & Devoted",
    compatibleSigns: ["Taurus", "Capricorn", "Cancer", "Scorpio"],
    luckyNumbers: [5, 14, 23],
    luckyColors: ["Navy", "Beige"],
    strengths: ["Attention to detail", "Reliability", "Intelligence", "Modesty"],
    weaknesses: ["Overcritical", "Worrying", "Perfectionist"],
    personalityDescription:
      "Virgo is the perfectionist of the zodiac with sharp analytical minds. They notice what others miss and excel at problem-solving. Beneath their composed exterior lies a deeply caring soul who shows love through helpful actions.",
    loveDescription:
      "Virgo expresses love through acts of service and thoughtful gestures. They pay attention to the little things and remember every detail about their partner. They seek partners who appreciate their dedication and share their values.",
  },
  libra: {
    name: "Libra",
    symbol: "Li",
    element: "Air",
    quality: "Cardinal",
    rulingPlanet: "Venus",
    dateRange: "Sep 23 - Oct 22",
    traits: ["Diplomatic", "Harmonious", "Charming", "Fair"],
    loveStyle: "Romantic & Balanced",
    compatibleSigns: ["Gemini", "Aquarius", "Leo", "Sagittarius"],
    luckyNumbers: [4, 6, 13],
    luckyColors: ["Pink", "Lavender"],
    strengths: ["Diplomacy", "Grace", "Fairness", "Social skills"],
    weaknesses: ["Indecisive", "People-pleasing", "Avoids confrontation"],
    personalityDescription:
      "Libra seeks harmony and balance in everything. They are natural diplomats with an eye for beauty and aesthetics. Their charming personality makes them beloved by many, and they have a gift for bringing people together.",
    loveDescription:
      "Libra is in love with love itself. They are true romantics who believe in partnership and equality. They create beautiful, harmonious relationships and go above and beyond to make their partners feel valued and cherished.",
  },
  scorpio: {
    name: "Scorpio",
    symbol: "Sc",
    element: "Water",
    quality: "Fixed",
    rulingPlanet: "Pluto",
    dateRange: "Oct 23 - Nov 21",
    traits: ["Intense", "Passionate", "Resourceful", "Magnetic"],
    loveStyle: "Deep & Transformative",
    compatibleSigns: ["Cancer", "Pisces", "Virgo", "Capricorn"],
    luckyNumbers: [8, 11, 18],
    luckyColors: ["Black", "Maroon"],
    strengths: ["Determination", "Loyalty", "Intuition", "Resourcefulness"],
    weaknesses: ["Jealous", "Secretive", "Controlling"],
    personalityDescription:
      "Scorpio is the most intense sign of the zodiac. They possess extraordinary depth of emotion and an uncanny ability to see through facades. Their magnetic presence draws people in, and their loyalty runs deeper than any other sign.",
    loveDescription:
      "Scorpio loves with profound intensity. They seek soul-deep connections and transformative relationships. Trust is everything to them, and once earned, their devotion is absolute and unwavering.",
  },
  sagittarius: {
    name: "Sagittarius",
    symbol: "Sg",
    element: "Fire",
    quality: "Mutable",
    rulingPlanet: "Jupiter",
    dateRange: "Nov 22 - Dec 21",
    traits: ["Adventurous", "Optimistic", "Philosophical", "Free-spirited"],
    loveStyle: "Adventurous & Free",
    compatibleSigns: ["Aries", "Leo", "Libra", "Aquarius"],
    luckyNumbers: [3, 7, 9],
    luckyColors: ["Purple", "Turquoise"],
    strengths: ["Optimism", "Honesty", "Generosity", "Humor"],
    weaknesses: ["Commitment-phobic", "Tactless", "Restless"],
    personalityDescription:
      "Sagittarius is the eternal adventurer and philosopher. They see life as one grand adventure and approach everything with infectious optimism. Their honest, straightforward nature and great sense of humor make them irresistible companions.",
    loveDescription:
      "Sagittarius needs freedom and adventure in love. They're attracted to open-minded partners who share their wanderlust. While they may take time to commit, once they do, they bring incredible fun and growth to the relationship.",
  },
  capricorn: {
    name: "Capricorn",
    symbol: "Cp",
    element: "Earth",
    quality: "Cardinal",
    rulingPlanet: "Saturn",
    dateRange: "Dec 22 - Jan 19",
    traits: ["Ambitious", "Disciplined", "Responsible", "Strategic"],
    loveStyle: "Traditional & Committed",
    compatibleSigns: ["Taurus", "Virgo", "Scorpio", "Pisces"],
    luckyNumbers: [4, 8, 13],
    luckyColors: ["Brown", "Black"],
    strengths: ["Ambition", "Discipline", "Patience", "Wisdom"],
    weaknesses: ["Workaholic", "Pessimistic", "Rigid"],
    personalityDescription:
      "Capricorn is the mountain goat — steadily climbing towards their goals with unwavering determination. They are incredibly ambitious yet practical, combining big dreams with the discipline to achieve them. Their dry humor and quiet wisdom are often underappreciated.",
    loveDescription:
      "Capricorn approaches love with the same dedication they bring to everything. They are traditional romantics who believe in building lasting partnerships. They show love through stability, support, and steadfast commitment.",
  },
  aquarius: {
    name: "Aquarius",
    symbol: "Aq",
    element: "Air",
    quality: "Fixed",
    rulingPlanet: "Uranus",
    dateRange: "Jan 20 - Feb 18",
    traits: ["Innovative", "Independent", "Humanitarian", "Eccentric"],
    loveStyle: "Unique & Intellectual",
    compatibleSigns: ["Gemini", "Libra", "Aries", "Sagittarius"],
    luckyNumbers: [4, 7, 11],
    luckyColors: ["Electric Blue", "Silver"],
    strengths: ["Originality", "Independence", "Humanitarianism", "Vision"],
    weaknesses: ["Emotionally detached", "Unpredictable", "Aloof"],
    personalityDescription:
      "Aquarius is the visionary of the zodiac. They think differently, challenge conventions, and dream of making the world a better place. Their unique perspective and innovative mind make them ahead of their time.",
    loveDescription:
      "Aquarius values intellectual connection above all in love. They need space and freedom but offer a deeply unique and stimulating partnership. They love unconventionally but genuinely, often surprising their partners with their depth of care.",
  },
  pisces: {
    name: "Pisces",
    symbol: "Pi",
    element: "Water",
    quality: "Mutable",
    rulingPlanet: "Neptune",
    dateRange: "Feb 19 - Mar 20",
    traits: ["Compassionate", "Artistic", "Dreamy", "Empathetic"],
    loveStyle: "Romantic & Selfless",
    compatibleSigns: ["Cancer", "Scorpio", "Taurus", "Capricorn"],
    luckyNumbers: [3, 9, 12],
    luckyColors: ["Sea Green", "Lavender"],
    strengths: ["Empathy", "Creativity", "Intuition", "Wisdom"],
    weaknesses: ["Escapist", "Overly trusting", "Idealistic"],
    personalityDescription:
      "Pisces is the dreamer and empath of the zodiac. They possess extraordinary intuition and creativity, often feeling the emotions of those around them. Their rich inner world is a source of incredible artistic and spiritual gifts.",
    loveDescription:
      "Pisces loves with their entire soul. They are the most romantic sign, creating fairy-tale love stories. They are selfless partners who put their loved ones first and have an uncanny ability to know exactly what their partner needs.",
  },
};

export function getZodiacSign(month: number, day: number): string {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "aquarius";
  return "pisces";
}

export function getZodiacData(signKey: string): ZodiacSign | null {
  return zodiacSigns[signKey] || null;
}

export function getCompatibilityScore(sign1: string, sign2: string): number {
  const data1 = zodiacSigns[sign1];
  const data2 = zodiacSigns[sign2];
  if (!data1 || !data2) return 50;

  // Check direct compatibility
  const isDirectCompat1 = data1.compatibleSigns
    .map((s) => s.toLowerCase())
    .includes(data2.name.toLowerCase());
  const isDirectCompat2 = data2.compatibleSigns
    .map((s) => s.toLowerCase())
    .includes(data1.name.toLowerCase());

  if (isDirectCompat1 && isDirectCompat2) return 95;
  if (isDirectCompat1 || isDirectCompat2) return 80;

  // Element compatibility
  const sameElement = data1.element === data2.element;
  const compatElements: Record<string, string[]> = {
    Fire: ["Air"],
    Air: ["Fire"],
    Earth: ["Water"],
    Water: ["Earth"],
  };
  const elementCompat = compatElements[data1.element]?.includes(data2.element);

  if (sameElement) return 75;
  if (elementCompat) return 70;
  return 55;
}

export { zodiacSigns };
