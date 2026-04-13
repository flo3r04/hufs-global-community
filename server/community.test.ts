import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getProfileByUserId: vi.fn(),
  upsertProfile: vi.fn(),
  listPosts: vi.fn(),
  getPostById: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  incrementViewCount: vi.fn(),
  getPostsByAuthor: vi.fn(),
  getApplicationByPostAndUser: vi.fn(),
  createApplication: vi.fn(),
  getApplicationsByPost: vi.fn(),
  getApplicationsByUser: vi.fn(),
  updateApplicationStatus: vi.fn(),
  getRecommendedPosts: vi.fn(),
  getDb: vi.fn(),
}));

import * as db from "./db";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "user-1",
      name: "테스트 유저",
      email: "test@hufs.ac.kr",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

const MOCK_POST = {
  post: {
    id: 10,
    authorId: 99, // 다른 사용자
    category: "스터디" as const,
    title: "알고리즘 스터디 모집",
    content: "함께 알고리즘을 공부해요",
    capacity: 5,
    deadline: null,
    keywords: '["알고리즘","코딩"]',
    status: "모집중" as const,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  authorName: "다른 유저",
  authorOpenId: "user-99",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("application.submit - 신청 기능", () => {
  beforeEach(() => vi.clearAllMocks());

  it("정상 신청: 새 신청이 성공적으로 생성된다", async () => {
    vi.mocked(db.getPostById).mockResolvedValue(MOCK_POST);
    vi.mocked(db.getApplicationByPostAndUser).mockResolvedValue(undefined);
    const mockApp = {
      id: 1, postId: 10, applicantId: 1,
      introduction: "안녕하세요", status: "대기중" as const,
      createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(db.createApplication).mockResolvedValue(mockApp);

    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.application.submit({ postId: 10, introduction: "안녕하세요" });

    expect(result).toMatchObject({ postId: 10, applicantId: 1, status: "대기중" });
    expect(db.createApplication).toHaveBeenCalledOnce();
  });

  it("중복 신청 방지: 이미 신청한 경우 CONFLICT 에러를 반환한다", async () => {
    vi.mocked(db.getPostById).mockResolvedValue(MOCK_POST);
    vi.mocked(db.getApplicationByPostAndUser).mockResolvedValue({
      id: 1, postId: 10, applicantId: 1,
      introduction: null, status: "대기중" as const,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.application.submit({ postId: 10 })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "이미 신청한 모집 글입니다.",
    });
    expect(db.createApplication).not.toHaveBeenCalled();
  });

  it("마감된 모집에는 신청할 수 없다", async () => {
    vi.mocked(db.getPostById).mockResolvedValue({
      ...MOCK_POST,
      post: { ...MOCK_POST.post, status: "마감" as const },
    });

    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.application.submit({ postId: 10 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "마감된 모집입니다.",
    });
  });

  it("본인 게시글에는 신청할 수 없다", async () => {
    vi.mocked(db.getPostById).mockResolvedValue({
      ...MOCK_POST,
      post: { ...MOCK_POST.post, authorId: 1 }, // 본인 게시글
    });

    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.application.submit({ postId: 10 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "본인이 작성한 모집 글에는 신청할 수 없습니다.",
    });
  });

  it("로그인하지 않은 사용자는 신청할 수 없다", async () => {
    const ctx = makeCtx({ user: null });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.application.submit({ postId: 10 })).rejects.toThrow();
  });
});

describe("application.updateStatus - 수락/거절 처리", () => {
  beforeEach(() => vi.clearAllMocks());

  it("작성자가 신청을 수락할 수 있다", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 1, postId: 10, applicantId: 2,
        introduction: null, status: "대기중" as const,
        createdAt: new Date(), updatedAt: new Date(),
      }]),
    };
    vi.mocked(db.getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(db.getPostById).mockResolvedValue({
      ...MOCK_POST,
      post: { ...MOCK_POST.post, authorId: 1 }, // 본인 게시글
    });
    vi.mocked(db.updateApplicationStatus).mockResolvedValue({
      id: 1, postId: 10, applicantId: 2,
      introduction: null, status: "수락" as const,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.application.updateStatus({ applicationId: 1, status: "수락" });

    expect(result?.status).toBe("수락");
  });
});

describe("profile.upsert - 프로필 저장", () => {
  beforeEach(() => vi.clearAllMocks());

  it("프로필을 저장하면 키워드가 JSON 문자열로 변환된다", async () => {
    const mockProfile = {
      id: 1, userId: 1,
      department: "컴퓨터공학부",
      grade: "3" as const,
      bio: "안녕하세요",
      keywords: '["프로그래밍","AI"]',
      createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(db.upsertProfile).mockResolvedValue(mockProfile);

    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.upsert({
      department: "컴퓨터공학부",
      grade: "3",
      bio: "안녕하세요",
      keywords: ["프로그래밍", "AI"],
    });

    expect(db.upsertProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        keywords: '["프로그래밍","AI"]',
      })
    );
    expect(result?.keywords).toBe('["프로그래밍","AI"]');
  });
});

describe("post.create - 게시글 작성", () => {
  beforeEach(() => vi.clearAllMocks());

  it("인증된 사용자가 게시글을 작성할 수 있다", async () => {
    const mockPost = {
      post: {
        id: 1, authorId: 1,
        category: "스터디" as const,
        title: "파이썬 스터디",
        content: "파이썬을 함께 공부하는 스터디입니다.",
        capacity: 5,
        deadline: null,
        keywords: '["파이썬"]',
        status: "모집중" as const,
        viewCount: 0,
        createdAt: new Date(), updatedAt: new Date(),
      },
      authorName: "테스트 유저",
      authorOpenId: "user-1",
    };
    vi.mocked(db.createPost).mockResolvedValue(mockPost);

    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.post.create({
      category: "스터디",
      title: "파이썬 스터디",
      content: "파이썬을 함께 공부하는 스터디입니다.",
      capacity: 5,
      keywords: ["파이썬"],
    });

    expect(result?.post.title).toBe("파이썬 스터디");
    expect(db.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 1, category: "스터디" })
    );
  });
});
