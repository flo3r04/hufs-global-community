import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import { Link } from "wouter";
import { ArrowRight, Users, GraduationCap, BookOpen, Sparkles } from "lucide-react";

const CATEGORIES = [
  {
    key: "동아리",
    label: "동아리",
    desc: "다양한 취미와 활동을 함께할 동아리를 찾아보세요",
    icon: Users,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    iconBg: "bg-blue-100",
  },
  {
    key: "학회",
    label: "학회",
    desc: "학문적 탐구와 연구를 함께할 학회에 참여하세요",
    icon: GraduationCap,
    color: "bg-teal-50 border-teal-200 text-teal-700",
    iconBg: "bg-teal-100",
  },
  {
    key: "스터디",
    label: "스터디",
    desc: "목표를 향해 함께 공부할 스터디 그룹을 모집합니다",
    icon: BookOpen,
    color: "bg-pink-50 border-pink-200 text-pink-700",
    iconBg: "bg-pink-100",
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  const { data: latestPosts } = trpc.post.list.useQuery({
    status: "모집중",
    limit: 6,
    sort: "latest",
  });

  const { data: recommendedPosts } = trpc.post.recommended.useQuery(
    { limit: 6 },
    { enabled: isAuthenticated }
  );

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-card border-b border-border">
        {/* Geometric decorations */}
        <div className="absolute top-8 right-16 w-48 h-48 rounded-full bg-blue-100/60 blur-2xl pointer-events-none" />
        <div className="absolute bottom-4 right-32 w-32 h-32 rounded-full bg-pink-100/70 blur-xl pointer-events-none" />
        <div className="absolute top-16 left-8 w-24 h-24 rounded-full bg-teal-100/50 blur-xl pointer-events-none" />

        <div className="container py-16 md:py-24 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              HUFSquare
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight mb-4">
              나에게 맞는
              <br />
              <span className="text-primary">동아리·학회·스터디</span>
              <br />
              찾기
            </h1>
            <p className="text-lg text-muted-foreground font-light mb-8 leading-relaxed">
              관심 키워드 기반 맞춤 추천으로 적은 클릭 수로
              <br className="hidden sm:block" />
              원하는 모집 정보를 한눈에 확인하세요.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <>
                  <Link href="/board">
                    <Button size="lg" className="font-bold gap-2">
                      모집 게시판 보기
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/post/new">
                    <Button size="lg" variant="outline" className="font-bold">
                      모집 글 작성하기
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="font-bold gap-2"
                    onClick={() => (window.location.href = getLoginUrl())}
                  >
                    시작하기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Link href="/board">
                    <Button size="lg" variant="outline" className="font-bold">
                      게시판 둘러보기
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category Cards */}
      <section className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.key} href={`/board?category=${cat.key}`} className="block no-underline group">
                <div className={`rounded-2xl border p-6 ${cat.color} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
                  <div className={`w-10 h-10 rounded-xl ${cat.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-lg mb-1">{cat.label}</h3>
                  <p className="text-sm font-light opacity-80 leading-snug">{cat.desc}</p>
                  <div className="flex items-center gap-1 mt-4 text-sm font-semibold">
                    보러가기 <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recommended Posts (로그인 시) */}
      {isAuthenticated && recommendedPosts && recommendedPosts.length > 0 && (
        <section className="container pb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {user?.name}님을 위한 추천
              </h2>
              <p className="text-sm text-muted-foreground font-light mt-1">
                관심 키워드와 매칭된 모집 글이에요
              </p>
            </div>
            <Link href="/board">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                전체 보기 <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedPosts.map((item) => (
              <PostCard
                key={item.post.id}
                id={item.post.id}
                category={item.post.category}
                title={item.post.title}
                authorName={item.authorName}
                capacity={item.post.capacity}
                deadline={item.post.deadline}
                keywords={item.post.keywords}
                status={item.post.status}
                createdAt={item.post.createdAt}
                score={"score" in item ? (item as { score: number }).score : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Posts */}
      <section className="container pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-foreground">최신 모집 글</h2>
            <p className="text-sm text-muted-foreground font-light mt-1">
              새롭게 올라온 모집 정보를 확인하세요
            </p>
          </div>
          <Link href="/board">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              전체 보기 <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
        {latestPosts && latestPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestPosts.map((item) => (
              <PostCard
                key={item.post.id}
                id={item.post.id}
                category={item.post.category}
                title={item.post.title}
                authorName={item.authorName}
                capacity={item.post.capacity}
                deadline={item.post.deadline}
                keywords={item.post.keywords}
                status={item.post.status}
                createdAt={item.post.createdAt}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">아직 모집 글이 없습니다</p>
            <p className="text-sm mt-1">첫 번째 모집 글을 작성해보세요!</p>
            {isAuthenticated && (
              <Link href="/post/new">
                <Button className="mt-4" size="sm">
                  모집 글 작성하기
                </Button>
              </Link>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}
