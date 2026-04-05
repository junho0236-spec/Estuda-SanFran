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

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Feature routers exist", () => {
  it("should have habits router", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.habits).toBeDefined();
    expect(caller.habits.list).toBeDefined();
    expect(caller.habits.create).toBeDefined();
  });

  it("should have tasks router", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.tasks).toBeDefined();
    expect(caller.tasks.list).toBeDefined();
    expect(caller.tasks.create).toBeDefined();
  });

  it("should have goals router", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.goals).toBeDefined();
    expect(caller.goals.list).toBeDefined();
    expect(caller.goals.create).toBeDefined();
  });

  it("should have finance router", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance).toBeDefined();
    expect(caller.finance.list).toBeDefined();
    expect(caller.finance.create).toBeDefined();
  });

  it("should have focus router", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.focus).toBeDefined();
    expect(caller.focus.projects).toBeDefined();
    expect(caller.focus.sessions).toBeDefined();
  });

  it("should have water router", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.water).toBeDefined();
    expect(caller.water.get).toBeDefined();
    expect(caller.water.update).toBeDefined();
  });

  it("should have xp router", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.xp).toBeDefined();
    expect(caller.xp.get).toBeDefined();
    expect(caller.xp.add).toBeDefined();
  });

  it("auth.me returns user for authenticated context", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.name).toBe("Test User");
  });

  it("auth.me returns null for unauthenticated context", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});
