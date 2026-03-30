import type { DiaryEntry } from "@/lib/types";

export const mockScenarios: Array<Pick<DiaryEntry, "mood" | "diaryText">> = [
  {
    mood: "stressed",
    diaryText:
      "I have two exams this week and I keep losing focus while revising. I feel behind and worried that I will blank out during the test.",
  },
  {
    mood: "conflicted",
    diaryText:
      "I had an awkward argument with a close friend today. I am not sure if I overreacted, and now I feel weird about messaging them first.",
  },
  {
    mood: "homesick",
    diaryText:
      "It has been a long semester away from home. I miss my family and familiar routines more than usual tonight.",
  },
  {
    mood: "upset",
    diaryText:
      "I lost my wallet on the way back to campus, and it had my student card and transport card. I feel annoyed and tired.",
  },
  {
    mood: "relieved",
    diaryText:
      "I finally submitted my assignment after several late nights. I am exhausted but also proud I made it before the deadline.",
  },
];
