import { describe, expect, it } from "vitest";
import { parseArcadeInviteToken } from "./telegram";

describe("parseArcadeInviteToken", () => {
  it("matches the prefix case-insensitively and preserves the token exactly", () => {
    const token = "AbCdEFghIjKLMnOP_qRstUVwxYZ0123456789abcdEF";
    expect(parseArcadeInviteToken(`ArCaDe_${token}`)).toBe(token);
  });

  it("rejects unrelated launch parameters and malformed tokens", () => {
    expect(parseArcadeInviteToken("profile")).toBe("");
    expect(parseArcadeInviteToken("arcade_short")).toBe("");
    expect(parseArcadeInviteToken("arcade_" + "x".repeat(129))).toBe("");
    expect(parseArcadeInviteToken("arcade_valid-token?view=shop")).toBe("");
  });
});
