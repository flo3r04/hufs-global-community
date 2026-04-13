import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  Application,
  InsertApplication,
  InsertPost,
  InsertProfile,
  InsertUser,
  Post,
  applications,
  posts,
  profiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const queryClient = postgres(process.env.DATABASE_URL);
      _db = drizzle(queryClient);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertProfile(data: InsertProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(profiles)
    .values(data)
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        department: data.department,
        grade: data.grade,
        bio: data.bio,
        keywords: data.keywords,
      },
    });
  return getProfileByUserId(data.userId);
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function listPosts(opts: {
  category?: "동아리" | "학회" | "스터디";
  keyword?: string;
  status?: "모집중" | "마감";
  sort?: "latest" | "deadline";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts.category) conditions.push(eq(posts.category, opts.category));
  if (opts.status) conditions.push(eq(posts.status, opts.status));
  if (opts.keyword) {
    conditions.push(
      or(
        like(posts.title, `%${opts.keyword}%`),
        like(posts.keywords, `%${opts.keyword}%`)
      )
    );
  }

  const query = db
    .select({
      post: posts,
      authorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      opts.sort === "deadline"
        ? sql`CASE WHEN ${posts.deadline} IS NULL THEN 1 ELSE 0 END, ${posts.deadline} ASC`
        : desc(posts.createdAt)
    )
    .limit(opts.limit ?? 20)
    .offset(opts.offset ?? 0);

  return query;
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ post: posts, authorName: users.name, authorOpenId: users.openId })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data).returning({ id: posts.id });
  return getPostById(result[0].id);
}

export async function updatePost(id: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(posts).set(data).where(eq(posts.id, id));
  return getPostById(id);
}

export async function deletePost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(posts).where(eq(posts.id, id));
}

export async function incrementViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set({ viewCount: sql`${posts.viewCount} + 1` }).where(eq(posts.id, id));
}

export async function getPostsByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.authorId, authorId)).orderBy(desc(posts.createdAt));
}

// ─── Applications ─────────────────────────────────────────────────────────────

export async function getApplicationByPostAndUser(postId: number, applicantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(applications)
    .where(and(eq(applications.postId, postId), eq(applications.applicantId, applicantId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(applications).values(data).returning();
  return result[0];
}

export async function getApplicationsByPost(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      application: applications,
      applicantName: users.name,
      applicantOpenId: users.openId,
    })
    .from(applications)
    .leftJoin(users, eq(applications.applicantId, users.id))
    .where(eq(applications.postId, postId))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationsByUser(applicantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      application: applications,
      post: posts,
    })
    .from(applications)
    .leftJoin(posts, eq(applications.postId, posts.id))
    .where(eq(applications.applicantId, applicantId))
    .orderBy(desc(applications.createdAt));
}

export async function updateApplicationStatus(
  id: number,
  status: Application["status"]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(applications).set({ status }).where(eq(applications.id, id));
  const rows = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return rows[0];
}

// ─── Recommendation ───────────────────────────────────────────────────────────

export async function getRecommendedPosts(userId: number, limit = 6) {
  const db = await getDb();
  if (!db) return [];

  // 사용자 프로필 키워드 조회
  const profile = await getProfileByUserId(userId);
  if (!profile?.keywords) {
    // 키워드 없으면 최신 모집중 게시글 반환
    return db
      .select({ post: posts, authorName: users.name })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.status, "모집중"))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  let userKeywords: string[] = [];
  try {
    userKeywords = JSON.parse(profile.keywords);
  } catch {
    userKeywords = [];
  }

  if (userKeywords.length === 0) {
    return db
      .select({ post: posts, authorName: users.name })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.status, "모집중"))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  // 키워드 매칭: 각 키워드에 대해 LIKE 조건 생성
  const keywordConditions = userKeywords.map((kw) => like(posts.keywords, `%${kw}%`));
  const allPosts = await db
    .select({ post: posts, authorName: users.name })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.status, "모집중"), or(...keywordConditions)))
    .orderBy(desc(posts.createdAt))
    .limit(limit * 3);

  // 매칭 점수 계산 후 정렬
  const scored = allPosts.map((row) => {
    let score = 0;
    try {
      const postKws: string[] = JSON.parse(row.post.keywords ?? "[]");
      for (const uk of userKeywords) {
        if (postKws.some((pk) => pk.toLowerCase().includes(uk.toLowerCase()))) score++;
      }
    } catch { /* ignore */ }
    return { ...row, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
