import { describe, expect, it } from "vitest";
import { getExperienceQaConfig } from "./experienceConfig";

describe("explicit experience QA route", () => {
  it("keeps inspection parameters from changing an ordinary visit", () => {
    expect(getExperienceQaConfig("?chapter=b&time=3600", ["a", "b"])).toBeNull();
  });
  it("reproduces a chapter at an absolute time and rejects unusable input", () => {
    expect(getExperienceQaConfig("?qa=1&chapter=b&time=3600.125", ["a", "b"])).toEqual({
      patternIndex: 1,
      timeSeconds: 3600.125,
    });
    for (const time of ["-1", "Infinity", "hello", "999999999"]) {
      expect(getExperienceQaConfig(`?qa=1&chapter=unknown&time=${time}`, ["a", "b"])).toEqual({
        patternIndex: 0,
        timeSeconds: 0,
      });
    }
  });
});
