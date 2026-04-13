import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Link } from "wouter";

type Category = "동아리" | "학회" | "스터디";

const CATEGORY_OPTIONS: Category[] = ["동아리", "학회", "스터디"];

const SUGGESTED_KEYWORDS = [
  "프로그래밍", "AI", "데이터분석", "디자인", "영어", "일본어", "중국어",
  "취업", "스타트업", "봉사", "음악", "스포츠", "독서", "토론", "연구",
  "마케팅", "경제", "법학", "의학", "공학",
];

export default function PostForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const postId = id ? parseInt(id) : undefined;
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const [category, setCategory] = useState<Category>("동아리");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [deadline, setDeadline] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  const { data: existingPost } = trpc.post.get.useQuery(
    { id: postId! },
    { enabled: isEdit && !!postId }
  );

  useEffect(() => {
    if (existingPost) {
      const { post } = existingPost;
      setCategory(post.category);
      setTitle(post.title);
      setContent(post.content);
      setCapacity(post.capacity);
      if (post.deadline) {
        const d = new Date(post.deadline);
        setDeadline(d.toISOString().split("T")[0]);
      }
      try { setKeywords(JSON.parse(post.keywords ?? "[]")); } catch { /* ignore */ }
    }
  }, [existingPost]);

  const createMutation = trpc.post.create.useMutation({
    onSuccess: (data) => {
      toast.success("모집 글이 등록되었습니다!");
      navigate(`/post/${data?.post.id}`);
    },
    onError: (err) => {
      const message = err.message || "등록에 실패했습니다.";
      if (message.includes("Too small") || message.includes("10 characters")) {
        toast.error("내용을 좀 더 길게 작성해주세요. (최소 10자)");
      } else {
        toast.error(message);
      }
    },
  });

  const updateMutation = trpc.post.update.useMutation({
    onSuccess: (data) => {
      toast.success("수정되었습니다!");
      navigate(`/post/${data?.post.id}`);
    },
    onError: (err) => {
      const message = err.message || "수정에 실패했습니다.";
      if (message.includes("Too small") || message.includes("10 characters")) {
        toast.error("내용을 좀 더 길게 작성해주세요. (최소 10자)");
      } else {
        toast.error(message);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }
    if (content.trim().length < 10) {
      toast.error("내용을 좀 더 길게 작성해주세요. (최소 10자)");
      return;
    }
    const payload = {
      category,
      title: title.trim(),
      content: content.trim(),
      capacity,
      deadline: deadline || undefined,
      keywords,
    };
    if (isEdit && postId) {
      updateMutation.mutate({ id: postId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed || keywords.includes(trimmed) || keywords.length >= 10) return;
    setKeywords([...keywords, trimmed]);
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/board">
            <Button variant="ghost" size="sm" className="gap-1.5 mb-6 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              게시판으로
            </Button>
          </Link>

          <h1 className="text-3xl font-black mb-2">
            {isEdit ? "모집 글 수정" : "모집 글 작성"}
          </h1>
          <p className="text-muted-foreground font-light mb-8">
            동아리, 학회, 스터디 모집 정보를 등록하세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <Label className="font-semibold">카테고리 *</Label>
              <div className="flex gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      category === cat
                        ? cat === "동아리"
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : cat === "학회"
                          ? "bg-teal-100 text-teal-700 border-teal-300"
                          : "bg-pink-100 text-pink-700 border-pink-300"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="font-semibold">제목 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="모집 글 제목을 입력하세요"
                maxLength={200}
                required
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="font-semibold">내용 *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="모집 내용, 활동 소개, 지원 방법 등을 자세히 작성해주세요"
                rows={10}
                className="resize-none"
                required
              />
            </div>

            {/* Capacity & Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity" className="font-semibold">모집 인원 *</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  min={1}
                  max={999}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline" className="font-semibold">
                  마감일 <span className="text-muted-foreground font-normal">(선택)</span>
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-3">
              <Label className="font-semibold">
                키워드 태그 <span className="text-muted-foreground font-normal">(최대 10개)</span>
              </Label>

              {/* Selected keywords */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1 bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-medium"
                    >
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addKeyword(keywordInput); }
                  }}
                  placeholder="키워드 입력 후 Enter 또는 추가 버튼"
                  maxLength={30}
                  disabled={keywords.length >= 10}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => addKeyword(keywordInput)}
                  disabled={keywords.length >= 10}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_KEYWORDS.filter((kw) => !keywords.includes(kw)).slice(0, 12).map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => addKeyword(kw)}
                    disabled={keywords.length >= 10}
                    className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40"
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => history.back()} className="flex-1">
                취소
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1 font-bold">
                {isPending ? "처리 중..." : isEdit ? "수정 완료" : "모집 글 등록"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
