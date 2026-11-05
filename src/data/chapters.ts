/**
 * Chapter structure, verified against the PDF table of contents (pp. ix–x).
 * Titles and descriptions are in the dictionaries (`chapters.items`), indexed by chapter number - 1.
 */

export type StageId = "find" | "build" | "get-client" | "execute";

export const stages: { id: StageId; chapters: number[] }[] = [
  { id: "find", chapters: [1, 2, 3] },
  { id: "build", chapters: [4, 5, 6] },
  { id: "get-client", chapters: [7, 8, 9] },
  { id: "execute", chapters: [10] },
];

/** Book page where each chapter starts, and the figures it contains. */
export const chapterFacts: { number: number; page: number; figures: number[] }[] = [
  { number: 1, page: 1, figures: [2] },
  { number: 2, page: 9, figures: [3, 4, 5] },
  { number: 3, page: 21, figures: [6, 7] },
  { number: 4, page: 30, figures: [8, 9, 10] },
  { number: 5, page: 38, figures: [11, 12] },
  { number: 6, page: 46, figures: [13, 14, 15, 16] },
  { number: 7, page: 56, figures: [17] },
  { number: 8, page: 63, figures: [18, 19, 20] },
  { number: 9, page: 74, figures: [21, 22, 23] },
  { number: 10, page: 83, figures: [24] },
];
