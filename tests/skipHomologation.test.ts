import { describe, it, expect } from "vitest";
import { countWords, MIN_SKIP_REASON_WORDS } from "../src/utils/skipHomologation";
describe("motivo para pular homologação", () => {
  it("exige no mínimo 30 palavras", () => expect(MIN_SKIP_REASON_WORDS).toBe(30));
  it("29 palavras não bastam, 30 sim", () => {
    expect(countWords(Array(29).fill("a").join(" "))).toBeLessThan(30);
    expect(countWords(Array(30).fill("a").join("  \n "))).toBe(30);
  });
  it("texto vazio conta zero", () => expect(countWords("   ")).toBe(0));
});
