import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-finance",
    email: "finance@example.com",
    name: "Finance User",
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

describe("Finance - Transactions", () => {
  it("should have finance.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.list).toBeDefined();
  });

  it("should have finance.create procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.create).toBeDefined();
  });

  it("should have finance.update procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.update).toBeDefined();
  });

  it("should have finance.delete procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.delete).toBeDefined();
  });
});

describe("Finance - Cards", () => {
  it("should have finance.cards.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.cards).toBeDefined();
    expect(caller.finance.cards.list).toBeDefined();
  });

  it("should have finance.cards.create procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.cards.create).toBeDefined();
  });

  it("should have finance.cards.update procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.cards.update).toBeDefined();
  });

  it("should have finance.cards.delete procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.cards.delete).toBeDefined();
  });
});

describe("Finance - Bank Accounts", () => {
  it("should have finance.accounts.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.accounts).toBeDefined();
    expect(caller.finance.accounts.list).toBeDefined();
  });

  it("should have finance.accounts.create procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.accounts.create).toBeDefined();
  });

  it("should have finance.accounts.update procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.accounts.update).toBeDefined();
  });

  it("should have finance.accounts.delete procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.accounts.delete).toBeDefined();
  });
});

describe("Finance - Shopping", () => {
  it("should have finance.shopping.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.shopping).toBeDefined();
    expect(caller.finance.shopping.list).toBeDefined();
  });

  it("should have finance.shopping.create procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.shopping.create).toBeDefined();
  });

  it("should have finance.shopping.update procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.shopping.update).toBeDefined();
  });

  it("should have finance.shopping.delete procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.shopping.delete).toBeDefined();
  });
});

describe("Finance - Budget Rules", () => {
  it("should have finance.rules.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.rules).toBeDefined();
    expect(caller.finance.rules.list).toBeDefined();
  });

  it("should have finance.rules.create procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.rules.create).toBeDefined();
  });

  it("should have finance.rules.update procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.rules.update).toBeDefined();
  });

  it("should have finance.rules.delete procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.rules.delete).toBeDefined();
  });
});

describe("Finance - Notes", () => {
  it("should have finance.notes.list procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.notes).toBeDefined();
    expect(caller.finance.notes.list).toBeDefined();
  });

  it("should have finance.notes.create procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.notes.create).toBeDefined();
  });

  it("should have finance.notes.update procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.notes.update).toBeDefined();
  });

  it("should have finance.notes.delete procedure", () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.finance.notes.delete).toBeDefined();
  });
});
