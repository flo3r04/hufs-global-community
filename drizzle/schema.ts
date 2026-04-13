import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 20 }).$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 사용자 프로필 테이블
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  department: varchar("department", { length: 100 }),
  grade: varchar("grade", { length: 20 }).$type<"1" | "2" | "3" | "4" | "대학원">(),
  bio: text("bio"),
  keywords: text("keywords"), // JSON 배열 문자열로 저장 e.g. '["스터디","프로그래밍"]'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// 모집 게시글 테이블
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("authorId").notNull(),
  category: varchar("category", { length: 50 }).$type<"동아리" | "학회" | "스터디">().notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  capacity: integer("capacity").notNull().default(10),
  deadline: timestamp("deadline"),
  keywords: text("keywords"), // JSON 배열 문자열 e.g. '["프로그래밍","AI"]'
  status: varchar("status", { length: 20 }).$type<"모집중" | "마감">().default("모집중").notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// 신청 테이블
export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    postId: integer("postId").notNull(),
    applicantId: integer("applicantId").notNull(),
    introduction: text("introduction"), // 한 줄 소개
    status: varchar("status", { length: 20 }).$type<"대기중" | "수락" | "거절">().default("대기중").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("unique_application").on(table.postId, table.applicantId),
  ]
);

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
