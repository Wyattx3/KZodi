export interface MBTIQuestion {
  id: number;
  dimension: "EI" | "SN" | "TF" | "JP";
  question: string;
  optionA: string;
  optionB: string;
}

export const mbtiQuestions: MBTIQuestion[] = [
  // E/I Dimension (12 questions)
  { id: 1, dimension: "EI", question: "At a party, you tend to...", optionA: "Talk to many people, including strangers", optionB: "Talk to a few close friends" },
  { id: 2, dimension: "EI", question: "You feel energized after...", optionA: "Spending time with a group of people", optionB: "Spending time alone or with one close person" },
  { id: 3, dimension: "EI", question: "When working on a project, you prefer to...", optionA: "Brainstorm with others", optionB: "Think it through on your own first" },
  { id: 4, dimension: "EI", question: "In your free time, you'd rather...", optionA: "Go out and socialize", optionB: "Stay in and enjoy a quiet activity" },
  { id: 5, dimension: "EI", question: "You are more comfortable...", optionA: "Speaking up in a group discussion", optionB: "Sharing thoughts in a one-on-one conversation" },
  { id: 6, dimension: "EI", question: "After a long day, you recharge by...", optionA: "Calling friends or going out", optionB: "Having quiet time to yourself" },
  { id: 7, dimension: "EI", question: "When meeting new people, you...", optionA: "Feel excited and approach them easily", optionB: "Feel cautious and take time to warm up" },
  { id: 8, dimension: "EI", question: "You prefer working in...", optionA: "An open, collaborative environment", optionB: "A quiet, private space" },
  { id: 9, dimension: "EI", question: "At lunch, you prefer to eat...", optionA: "With a group of colleagues", optionB: "Alone or with one or two close friends" },
  { id: 10, dimension: "EI", question: "Your ideal weekend involves...", optionA: "Going to events and meeting people", optionB: "Relaxing at home with hobbies" },
  { id: 11, dimension: "EI", question: "When you have exciting news, you...", optionA: "Tell everyone you see", optionB: "Share it with a select few" },
  { id: 12, dimension: "EI", question: "You tend to think...", optionA: "Out loud, talking through ideas", optionB: "Internally, processing before speaking" },

  // S/N Dimension (13 questions)
  { id: 13, dimension: "SN", question: "You trust more in...", optionA: "Direct experience and concrete facts", optionB: "Gut feelings and intuitions" },
  { id: 14, dimension: "SN", question: "When reading, you prefer...", optionA: "Realistic stories with practical details", optionB: "Imaginative stories with deeper meanings" },
  { id: 15, dimension: "SN", question: "You focus more on...", optionA: "What is happening right now", optionB: "What could happen in the future" },
  { id: 16, dimension: "SN", question: "You prefer instructions that are...", optionA: "Step-by-step and detailed", optionB: "General overview with room for interpretation" },
  { id: 17, dimension: "SN", question: "When solving problems, you rely on...", optionA: "Proven methods and past experience", optionB: "Creative new approaches and theories" },
  { id: 18, dimension: "SN", question: "You are more interested in...", optionA: "Practical applications", optionB: "Abstract concepts and theories" },
  { id: 19, dimension: "SN", question: "In conversation, you tend to be...", optionA: "Literal and specific", optionB: "Figurative and use metaphors" },
  { id: 20, dimension: "SN", question: "You pay more attention to...", optionA: "Details and specifics", optionB: "The big picture and patterns" },
  { id: 21, dimension: "SN", question: "You prefer to learn through...", optionA: "Hands-on experience", optionB: "Exploring ideas and possibilities" },
  { id: 22, dimension: "SN", question: "You describe yourself as more...", optionA: "Down-to-earth and practical", optionB: "Imaginative and visionary" },
  { id: 23, dimension: "SN", question: "When planning a trip, you...", optionA: "Plan a detailed itinerary", optionB: "Leave room for spontaneous exploration" },
  { id: 24, dimension: "SN", question: "You value being...", optionA: "Realistic and sensible", optionB: "Innovative and original" },
  { id: 25, dimension: "SN", question: "At work, you prefer tasks that are...", optionA: "Well-defined with clear expectations", optionB: "Open-ended with creative freedom" },

  // T/F Dimension (13 questions)
  { id: 26, dimension: "TF", question: "When making decisions, you rely more on...", optionA: "Logic and objective analysis", optionB: "Personal values and how others feel" },
  { id: 27, dimension: "TF", question: "In a disagreement, you prioritize...", optionA: "Finding the truth, even if it's uncomfortable", optionB: "Maintaining harmony and considering feelings" },
  { id: 28, dimension: "TF", question: "You are more impressed by...", optionA: "Someone's logical consistency", optionB: "Someone's emotional awareness" },
  { id: 29, dimension: "TF", question: "When giving feedback, you tend to be...", optionA: "Direct and honest, even if blunt", optionB: "Tactful and considerate of feelings" },
  { id: 30, dimension: "TF", question: "You think it's more important to be...", optionA: "Fair and just", optionB: "Compassionate and merciful" },
  { id: 31, dimension: "TF", question: "People come to you more for...", optionA: "Practical advice and solutions", optionB: "Emotional support and understanding" },
  { id: 32, dimension: "TF", question: "In a team conflict, you...", optionA: "Analyze the situation objectively", optionB: "Consider everyone's feelings first" },
  { id: 33, dimension: "TF", question: "You admire people who are...", optionA: "Rational and level-headed", optionB: "Warm and empathetic" },
  { id: 34, dimension: "TF", question: "When a friend is upset, your first instinct is to...", optionA: "Help them find a solution", optionB: "Listen and offer emotional comfort" },
  { id: 35, dimension: "TF", question: "You prefer to be seen as...", optionA: "Competent and capable", optionB: "Kind and caring" },
  { id: 36, dimension: "TF", question: "Criticism is...", optionA: "Helpful for improvement", optionB: "Something to deliver gently" },
  { id: 37, dimension: "TF", question: "You make choices based on...", optionA: "What makes the most sense", optionB: "What feels right in your heart" },
  { id: 38, dimension: "TF", question: "You think the world needs more...", optionA: "Rational thinking", optionB: "Compassion and empathy" },

  // J/P Dimension (12 questions)
  { id: 39, dimension: "JP", question: "You prefer your daily life to be...", optionA: "Structured and organized", optionB: "Flexible and spontaneous" },
  { id: 40, dimension: "JP", question: "When starting a task, you...", optionA: "Create a plan before beginning", optionB: "Jump right in and figure it out" },
  { id: 41, dimension: "JP", question: "Deadlines make you feel...", optionA: "Motivated to finish on time", optionB: "Pressured — you work best with flexibility" },
  { id: 42, dimension: "JP", question: "Your workspace is usually...", optionA: "Neat and organized", optionB: "A bit messy but you know where things are" },
  { id: 43, dimension: "JP", question: "You feel more comfortable when...", optionA: "Decisions are made and things are settled", optionB: "Options are still open" },
  { id: 44, dimension: "JP", question: "When packing for a trip, you...", optionA: "Make a checklist and pack days ahead", optionB: "Throw things in last minute" },
  { id: 45, dimension: "JP", question: "You tend to...", optionA: "Finish one project before starting another", optionB: "Work on several projects at once" },
  { id: 46, dimension: "JP", question: "Your calendar is usually...", optionA: "Full of scheduled events and reminders", optionB: "Mostly empty — you go with the flow" },
  { id: 47, dimension: "JP", question: "You prefer rules that are...", optionA: "Clear and consistently enforced", optionB: "Flexible and adaptable" },
  { id: 48, dimension: "JP", question: "When plans change suddenly, you...", optionA: "Feel frustrated or stressed", optionB: "Adapt easily and go with it" },
  { id: 49, dimension: "JP", question: "You get more satisfaction from...", optionA: "Completing tasks and checking them off", optionB: "Starting new and exciting ventures" },
  { id: 50, dimension: "JP", question: "Your approach to life is more...", optionA: "Planned and decisive", optionB: "Open-ended and exploratory" },
];

export function calculateMBTI(answers: Record<number, "a" | "b">): string {
  const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  mbtiQuestions.forEach((q) => {
    const answer = answers[q.id];
    if (!answer) return;

    switch (q.dimension) {
      case "EI":
        if (answer === "a") counts.E++;
        else counts.I++;
        break;
      case "SN":
        if (answer === "a") counts.S++;
        else counts.N++;
        break;
      case "TF":
        if (answer === "a") counts.T++;
        else counts.F++;
        break;
      case "JP":
        if (answer === "a") counts.J++;
        else counts.P++;
        break;
    }
  });

  return (
    (counts.E >= counts.I ? "E" : "I") +
    (counts.S >= counts.N ? "S" : "N") +
    (counts.T >= counts.F ? "T" : "F") +
    (counts.J >= counts.P ? "J" : "P")
  );
}

export const mbtiDescriptions: Record<string, { title: string; description: string }> = {
  INTJ: { title: "The Architect", description: "Strategic, independent, and determined. You see the big picture and create plans to achieve your vision." },
  INTP: { title: "The Logician", description: "Analytical, innovative, and curious. You love exploring complex theories and finding logical explanations." },
  ENTJ: { title: "The Commander", description: "Bold, strategic, and confident. You're a natural leader who loves organizing people and resources." },
  ENTP: { title: "The Debater", description: "Quick-witted, curious, and innovative. You love intellectual challenges and playing devil's advocate." },
  INFJ: { title: "The Advocate", description: "Insightful, principled, and compassionate. You have a deep understanding of people and strong ideals." },
  INFP: { title: "The Mediator", description: "Idealistic, empathetic, and creative. You seek harmony and authenticity in everything you do." },
  ENFJ: { title: "The Protagonist", description: "Charismatic, inspiring, and altruistic. You naturally lead others and bring out the best in people." },
  ENFP: { title: "The Campaigner", description: "Enthusiastic, creative, and sociable. You see possibilities everywhere and inspire others with your energy." },
  ISTJ: { title: "The Logistician", description: "Responsible, thorough, and dependable. You value tradition, order, and getting things done right." },
  ISFJ: { title: "The Defender", description: "Dedicated, warm, and protective. You care deeply about others and work hard to maintain harmony." },
  ESTJ: { title: "The Executive", description: "Organized, dedicated, and strong-willed. You excel at managing people and bringing order to chaos." },
  ESFJ: { title: "The Consul", description: "Caring, sociable, and loyal. You're attentive to others' needs and thrive on helping and connecting." },
  ISTP: { title: "The Virtuoso", description: "Bold, practical, and experimental. You love exploring with your hands and understanding how things work." },
  ISFP: { title: "The Adventurer", description: "Gentle, sensitive, and artistic. You live in the moment and express yourself through actions and creativity." },
  ESTP: { title: "The Entrepreneur", description: "Energetic, perceptive, and bold. You thrive on excitement and are great at reading people and situations." },
  ESFP: { title: "The Entertainer", description: "Spontaneous, energetic, and fun-loving. You love life and know how to make everyone around you smile." },
};
