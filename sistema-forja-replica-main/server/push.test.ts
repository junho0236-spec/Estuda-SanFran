import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("push notification routes", () => {
  it("push.subscribe route exists and is a mutation", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.push.subscribe).toBeDefined();
    expect(typeof caller.push.subscribe).toBe("function");
  });

  it("push.unsubscribe route exists and is a mutation", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.push.unsubscribe).toBeDefined();
    expect(typeof caller.push.unsubscribe).toBe("function");
  });

  it("push.send route exists and is a mutation", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.push.send).toBeDefined();
    expect(typeof caller.push.send).toBe("function");
  });

  it("push.test route exists and is a mutation", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.push.test).toBeDefined();
    expect(typeof caller.push.test).toBe("function");
  });
});
