import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createApplication,
  createPost,
  deletePost,
  getApplicationByPostAndUser,
  getApplicationsByPost,
  getApplicationsByUser,
  getPostById,
  getPostsByAuthor,
  getProfileByUserId,
  getRecommendedPosts,
  incrementViewCount,
  listPosts,
  updateApplicationStatus,
  updatePost,
  upsertProfile,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const categoryEnum = z.enum(["동아리", "학회", "스터디"]);
const gradeEnum = z.enum(["1", "2", "3", "4", "대학원"]);

const profileInput = z.object({
  department: z.string().max(100).optional(),
  grade: gradeEnum.optional(),
  bio: z.string().max(500).optional(),
  keywords: z.array(z.string().max(30)).max(10).optional(),
});

const postCreateInput = z.object({
  category: categoryEnum,
  title: z.string().min(2).max(200),
  content: z.string().min(10),
  capacity: z.number().int().min(1).max(999),
  deadline: z.string().optional(), // ISO string
  keywords: z.array(z.string().max(30)).max(10).optional(),
});

const postUpdateInput = postCreateInput.partial().extend({
  status: z.enum(["모집중", "마감"]).optional(),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Profile ────────────────────────────────────────────────────────────────

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getProfileByUserId(ctx.user.id);
    }),

    getByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getProfileByUserId(input.userId);
      }),

    upsert: protectedProcedure
      .input(profileInput)
      .mutation(async ({ ctx, input }) => {
        return upsertProfile({
          userId: ctx.user.id,
          department: input.department ?? null,
          grade: input.grade ?? null,
          bio: input.bio ?? null,
          keywords: input.keywords ? JSON.stringify(input.keywords) : null,
        });
      }),
  }),

  // ─── Posts ──────────────────────────────────────────────────────────────────

  post: router({
    list: publicProcedure
      .input(
        z.object({
          category: categoryEnum.optional(),
          keyword: z.string().optional(),
          status: z.enum(["모집중", "마감"]).optional(),
          sort: z.enum(["latest", "deadline"]).optional(),
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).optional(),
        })
      )
      .query(async ({ input }) => {
        return listPosts(input);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await getPostById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." });
        await incrementViewCount(input.id);
        return result;
      }),

    create: protectedProcedure
      .input(postCreateInput)
      .mutation(async ({ ctx, input }) => {
        return createPost({
          authorId: ctx.user.id,
          category: input.category,
          title: input.title,
          content: input.content,
          capacity: input.capacity,
          deadline: input.deadline ? new Date(input.deadline) : null,
          keywords: input.keywords ? JSON.stringify(input.keywords) : null,
        });
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: postUpdateInput }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPostById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." });
        if (existing.post.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "수정 권한이 없습니다." });
        }
        return updatePost(input.id, {
          ...input.data,
          deadline: input.data.deadline ? new Date(input.data.deadline) : undefined,
          keywords: input.data.keywords ? JSON.stringify(input.data.keywords) : undefined,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPostById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." });
        if (existing.post.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "삭제 권한이 없습니다." });
        }
        await deletePost(input.id);
        return { success: true };
      }),

    myPosts: protectedProcedure.query(async ({ ctx }) => {
      return getPostsByAuthor(ctx.user.id);
    }),

    recommended: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(20).optional() }))
      .query(async ({ ctx, input }) => {
        return getRecommendedPosts(ctx.user.id, input.limit ?? 6);
      }),
  }),

  // ─── Applications ────────────────────────────────────────────────────────────

  application: router({
    submit: protectedProcedure
      .input(
        z.object({
          postId: z.number(),
          introduction: z.string().max(300).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 게시글 존재 확인
        const post = await getPostById(input.postId);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." });
        if (post.post.status === "마감") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "마감된 모집입니다." });
        }
        // 본인 게시글 신청 방지
        if (post.post.authorId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "본인이 작성한 모집 글에는 신청할 수 없습니다." });
        }
        // 중복 신청 방지
        const existing = await getApplicationByPostAndUser(input.postId, ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "이미 신청한 모집 글입니다." });
        }
        return createApplication({
          postId: input.postId,
          applicantId: ctx.user.id,
          introduction: input.introduction ?? null,
        });
      }),

    checkMyApplication: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getApplicationByPostAndUser(input.postId, ctx.user.id);
      }),

    listByPost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        const post = await getPostById(input.postId);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." });
        if (post.post.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "조회 권한이 없습니다." });
        }
        return getApplicationsByPost(input.postId);
      }),

    listByUser: protectedProcedure.query(async ({ ctx }) => {
      return getApplicationsByUser(ctx.user.id);
    }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          applicationId: z.number(),
          status: z.enum(["수락", "거절"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 신청 조회
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { applications } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "신청을 찾을 수 없습니다." });

        const app = rows[0];
        const post = await getPostById(app.postId);
        if (!post) throw new TRPCError({ code: "NOT_FOUND" });
        if (post.post.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "처리 권한이 없습니다." });
        }
        return updateApplicationStatus(input.applicationId, input.status);
      }),
  }),
});

export type AppRouter = typeof appRouter;
