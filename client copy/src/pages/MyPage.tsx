import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  LayoutDashboard,
  PenSquare,
  ClipboardList,
  ArrowRight,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
} from "lucide-react";

const STATUS_CONFIG = {
  대기중: { label: "대기중", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  수락: { label: "수락됨", icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
  거절: { label: "거절됨", icon: XCircle, color: "text-red-500 bg-red-50 border-red-200" },
};

const CATEGORY_STYLES: Record<string, string> = {
  동아리: "bg-blue-100 text-blue-700",
  학회: "bg-teal-100 text-teal-700",
  스터디: "bg-pink-100 text-pink-700",
};

type Tab = "posts" | "applications";

export default function MyPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  const { data: myPosts, isLoading: postsLoading } = trpc.post.myPosts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: myApplications, isLoading: appsLoading } = trpc.application.listByUser.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-4">로그인이 필요합니다.</p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>로그인하기</Button>
        </div>
      </Layout>
    );
  }

  const pendingCount = myApplications?.filter((a) => a.application.status === "대기중").length ?? 0;

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground">마이페이지</h1>
              <p className="text-muted-foreground font-light text-sm">{user?.name}님의 활동 현황</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="font-semibold">
                프로필 설정
              </Button>
            </Link>
            <Link href="/post/new">
              <Button size="sm" className="gap-1.5 font-semibold">
                <PenSquare className="w-4 h-4" />
                모집 글 작성
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground font-light mb-1">작성한 모집 글</p>
            <p className="text-3xl font-black text-foreground">{myPosts?.length ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground font-light mb-1">신청한 모집</p>
            <p className="text-3xl font-black text-foreground">{myApplications?.length ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 col-span-2 sm:col-span-1">
            <p className="text-sm text-muted-foreground font-light mb-1">대기 중인 신청</p>
            <p className="text-3xl font-black text-primary">{pendingCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "posts"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenSquare className="w-4 h-4" />
            내 모집 글
            {myPosts && myPosts.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {myPosts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "applications"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            신청 현황
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "posts" ? (
          <div>
            {postsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : myPosts && myPosts.length > 0 ? (
              <div className="space-y-3">
                {myPosts.map((post) => {
                  const deadlineDate = post.deadline ? new Date(post.deadline) : null;
                  const isExpired = deadlineDate ? deadlineDate < new Date() : false;
                  const displayStatus = isExpired ? "마감" : post.status;
                  let parsedKeywords: string[] = [];
                  try { parsedKeywords = JSON.parse(post.keywords ?? "[]"); } catch { /* ignore */ }

                  return (
                    <Link key={post.id} href={`/post/${post.id}`} className="block no-underline group">
                      <div className="bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[post.category]}`}>
                                {post.category}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${displayStatus === "모집중" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {displayStatus}
                              </span>
                            </div>
                            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {post.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {post.capacity}명
                              </span>
                              {deadlineDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {deadlineDate.toLocaleDateString("ko-KR")} 마감
                                </span>
                              )}
                              {parsedKeywords.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {parsedKeywords.slice(0, 2).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors mt-1" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <PenSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">아직 작성한 모집 글이 없습니다</p>
                <p className="text-sm mt-1">첫 번째 모집 글을 작성해보세요!</p>
                <Link href="/post/new">
                  <Button className="mt-4" size="sm">모집 글 작성하기</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div>
            {appsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : myApplications && myApplications.length > 0 ? (
              <div className="space-y-3">
                {myApplications.map(({ application, post }) => {
                  if (!post) return null;
                  const statusConfig = STATUS_CONFIG[application.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Link key={application.id} href={`/post/${post.id}`} className="block no-underline group">
                      <div className="bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[post.category]}`}>
                                {post.category}
                              </span>
                              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                            </div>
                            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {post.title}
                            </h3>
                            {application.introduction && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                내 소개: {application.introduction}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(application.createdAt).toLocaleDateString("ko-KR")} 신청
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors mt-1" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">아직 신청한 모집이 없습니다</p>
                <p className="text-sm mt-1">관심 있는 동아리, 학회, 스터디에 신청해보세요!</p>
                <Link href="/board">
                  <Button className="mt-4" size="sm">게시판 보러가기</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
