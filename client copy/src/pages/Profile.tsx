import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Plus, X, User, Sparkles } from "lucide-react";

type Grade = "1" | "2" | "3" | "4" | "대학원";

const GRADES: Grade[] = ["1", "2", "3", "4", "대학원"];

const DEPARTMENTS = [
  "영어대학", "한국어교육학과", "중국어대학", "일본어대학", "영어통번역학부",
  "Language & Diplomacy", "국제학부", "경영학부", "경제학부", "법학부",
  "미디어커뮤니케이션학부", "컴퓨터공학부", "산업경영공학과", "생명공학과",
  "환경학과", "기타",
];

const KEYWORD_SUGGESTIONS = [
  "프로그래밍", "AI", "머신러닝", "데이터분석", "웹개발", "앱개발",
  "디자인", "UX/UI", "영어", "일본어", "중국어", "스페인어",
  "취업", "스타트업", "창업", "봉사", "음악", "스포츠",
  "독서", "토론", "연구", "마케팅", "경제", "법학",
  "의학", "공학", "사진", "영상", "글쓰기",
];

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [department, setDepartment] = useState("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [bio, setBio] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [deptInput, setDeptInput] = useState("");
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);

  const { data: profile, isLoading } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      setDepartment(profile.department ?? "");
      setGrade((profile.grade as Grade) ?? "");
      setBio(profile.bio ?? "");
      try { setKeywords(JSON.parse(profile.keywords ?? "[]")); } catch { /* ignore */ }
    }
  }, [profile]);

  const upsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      toast.success("프로필이 저장되었습니다!");
      utils.profile.get.invalidate();
    },
    onError: (err) => toast.error(err.message || "저장에 실패했습니다."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate({
      department: department || undefined,
      grade: grade || undefined,
      bio: bio || undefined,
      keywords,
    });
  };

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed || keywords.includes(trimmed) || keywords.length >= 10) return;
    setKeywords([...keywords, trimmed]);
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => setKeywords(keywords.filter((k) => k !== kw));

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

  const filteredDepts = DEPARTMENTS.filter(
    (d) => d.toLowerCase().includes(deptInput.toLowerCase()) && d !== department
  );

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground">프로필 설정</h1>
              <p className="text-muted-foreground font-light text-sm">
                {user?.name}님의 프로필을 작성하면 맞춤 추천을 받을 수 있어요
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-xl" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name (readonly) */}
              <div className="space-y-2">
                <Label className="font-semibold">이름</Label>
                <Input value={user?.name ?? ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">이름은 로그인 계정에서 관리됩니다</p>
              </div>

              {/* Department */}
              <div className="space-y-2 relative">
                <Label htmlFor="department" className="font-semibold">학과/전공</Label>
                <Input
                  id="department"
                  value={department || deptInput}
                  onChange={(e) => {
                    setDeptInput(e.target.value);
                    setDepartment(e.target.value);
                    setShowDeptSuggestions(true);
                  }}
                  onFocus={() => setShowDeptSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDeptSuggestions(false), 200)}
                  placeholder="학과를 입력하거나 선택하세요"
                />
                {showDeptSuggestions && filteredDepts.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredDepts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => { setDepartment(d); setDeptInput(d); setShowDeptSuggestions(false); }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label className="font-semibold">학년</Label>
                <div className="flex gap-2 flex-wrap">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(grade === g ? "" : g)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        grade === g
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {g === "대학원" ? "대학원" : `${g}학년`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="font-semibold">
                  자기소개 <span className="text-muted-foreground font-normal">(선택)</span>
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="간단한 자기소개를 작성해주세요"
                  maxLength={500}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
              </div>

              {/* Keywords */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">관심 키워드</Label>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    추천에 활용됩니다
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  관심 분야 키워드를 등록하면 맞춤 모집 글을 추천해드립니다 (최대 10개)
                </p>

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

                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addKeyword(keywordInput); }
                    }}
                    placeholder="키워드 입력 후 Enter"
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

                <div className="flex flex-wrap gap-1.5">
                  {KEYWORD_SUGGESTIONS.filter((kw) => !keywords.includes(kw)).slice(0, 15).map((kw) => (
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

              <Button type="submit" disabled={upsertMutation.isPending} className="w-full font-bold" size="lg">
                {upsertMutation.isPending ? "저장 중..." : "프로필 저장"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
