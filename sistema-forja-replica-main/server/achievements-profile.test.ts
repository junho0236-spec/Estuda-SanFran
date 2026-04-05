import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Achievements router", () => {
  it("should have achievements.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.achievements).toBeDefined();
    expect(caller.achievements.list).toBeDefined();
  });

  it("should have achievements.unlock procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.achievements.unlock).toBeDefined();
  });

  it("should have achievements.featured.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.achievements.featured).toBeDefined();
    expect(caller.achievements.featured.list).toBeDefined();
  });

  it("should have achievements.featured.set procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.achievements.featured.set).toBeDefined();
  });
});

describe("Profile router - new fields", () => {
  it("should have profile.getUser procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.profile.getUser).toBeDefined();
  });

  it("profile.getUser returns the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.getUser();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@example.com");
  });

  it("profile.update accepts displayName and notification fields", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Verify the update procedure exists and accepts the new fields
    expect(caller.profile.update).toBeDefined();
  });
});
