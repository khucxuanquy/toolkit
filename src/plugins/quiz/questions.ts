import type { Locale } from "@/core/i18n/locale-store";
import type { QuizQuestion } from "./types";

export interface QuizPack {
  id: string;
  name: Record<Locale, string>;
  questions: Record<Locale, QuizQuestion[]>;
}

/** Built-in question packs. Host can pick one (or add custom questions). */
export const PACKS: QuizPack[] = [
  {
    id: "general",
    name: { vi: "Kiến thức chung", en: "General knowledge" },
    questions: {
      vi: [
        { q: "Thủ đô của Việt Nam là gì?", options: ["Hà Nội", "TP.HCM", "Đà Nẵng", "Huế"], correct: 0 },
        { q: "Hành tinh nào gần Mặt Trời nhất?", options: ["Sao Kim", "Sao Thủy", "Trái Đất", "Sao Hỏa"], correct: 1 },
        { q: "Có bao nhiêu màu trong cầu vồng?", options: ["5", "6", "7", "8"], correct: 2 },
        { q: "Đại dương nào lớn nhất?", options: ["Đại Tây Dương", "Ấn Độ Dương", "Bắc Băng Dương", "Thái Bình Dương"], correct: 3 },
        { q: "Nước nào đông dân nhất thế giới?", options: ["Ấn Độ", "Trung Quốc", "Mỹ", "Indonesia"], correct: 0 },
      ],
      en: [
        { q: "What is the capital of Vietnam?", options: ["Hanoi", "Ho Chi Minh City", "Da Nang", "Hue"], correct: 0 },
        { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Earth", "Mars"], correct: 1 },
        { q: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], correct: 2 },
        { q: "Which is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
        { q: "Which country has the most people?", options: ["India", "China", "USA", "Indonesia"], correct: 0 },
      ],
    },
  },
  {
    id: "science",
    name: { vi: "Khoa học", en: "Science" },
    questions: {
      vi: [
        { q: "Ký hiệu hóa học của nước là gì?", options: ["O2", "CO2", "H2O", "NaCl"], correct: 2 },
        { q: "Cơ quan nào bơm máu đi khắp cơ thể?", options: ["Phổi", "Tim", "Gan", "Thận"], correct: 1 },
        { q: "Tốc độ ánh sáng xấp xỉ?", options: ["300.000 km/s", "150.000 km/s", "1.000 km/s", "30.000 km/s"], correct: 0 },
        { q: "Khí nào cây hấp thụ khi quang hợp?", options: ["Oxy", "Nitơ", "CO2", "Hydro"], correct: 2 },
        { q: "Hành tinh nào được gọi là Hành tinh Đỏ?", options: ["Sao Mộc", "Sao Hỏa", "Sao Kim", "Sao Thổ"], correct: 1 },
      ],
      en: [
        { q: "What is the chemical symbol for water?", options: ["O2", "CO2", "H2O", "NaCl"], correct: 2 },
        { q: "Which organ pumps blood through the body?", options: ["Lungs", "Heart", "Liver", "Kidney"], correct: 1 },
        { q: "The speed of light is about?", options: ["300,000 km/s", "150,000 km/s", "1,000 km/s", "30,000 km/s"], correct: 0 },
        { q: "Which gas do plants absorb for photosynthesis?", options: ["Oxygen", "Nitrogen", "CO2", "Hydrogen"], correct: 2 },
        { q: "Which planet is called the Red Planet?", options: ["Jupiter", "Mars", "Venus", "Saturn"], correct: 1 },
      ],
    },
  },
];

export function packQuestions(pack: QuizPack, locale: Locale): QuizQuestion[] {
  return pack.questions[locale] ?? pack.questions.en;
}
