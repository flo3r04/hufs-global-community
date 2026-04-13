import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Tag,
  Eye,
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle,
  ClipboardList,
} from "lucide-react";
import { Link } from "wouter";

const CATEGORY_STYLES: Record<string, string> = {
  동아리: "bg-blue-100 text-blue-700 border-blue-200",
  학회: "bg-teal-100 text-teal-700 border-teal-200",
  스터디: "bg-pink-100 text-pink-700 border-pink-200",
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const postId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [introduction, setIntroduction] = useState("");

  const { data, isLoading, error } = trpc.post.get.useQuery({ id: postId }, { enabled: !!postId });
  const { data: myApplication } = trpc.application.checkMyApplication.useQuery(
    { postId },
    { enabled: isAuthenticated && !!postId, refetchInterval: 30000 }
  );
  const { data: applicationList } = trpc.application.listByPost.useQuery(
    { postId },
    { enabled: isAuthenticated && data?.post.authorId === user?.id }
  );

  const applyMutation = trpc.application.submit.useMutation({
    onSuccess: () => {
      toast.success("신청이 완료되었습니다!");
      setApplyDialogOpen(false);
      setIntroduction("");
      utils.application.checkMyApplication.invalidate({ postId });
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") {
        toast.error("이미 신청한 모집 글입니다.");
      } else {
        toast.error(err.message || "신청에 실패했습니다.");
      }
      setApplyDialogOpen(false);
    },
  });

  const deleteMutation = trpc.post.delete.useMutation({
    onSuccess: () => {
      toast.success("게시글이 삭제되었습니다.");
      navigate("/board");
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  const updateStatusMutation = trpc.application.updateStatus.useMutation({
    onSuccess: (updated) => {
      toast.success(`신청을 ${updated?.status}했습니다.`);
      utils.application.listByPost.invalidate({ postId });
    },
    onError: () => toast.error("처리에 실패했습니다."),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded w-3/4" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">게시글을 찾을 수 없습니다.</p>
          <Link href="/board">
            <Button className="mt-4">게시판으로 돌아가기</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const { post, authorName } = data;
  const isAuthor = user?.id === post.authorId;
  const deadlineDate = post.deadline ? new Date(post.deadline) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;
  const displayStatus = isExpired ? "마감" : post.status;

  let parsedKeywords: string[] = [];
  try { parsedKeywords = JSON.parse(post.keywords ?? "[]"); } catch { /* ignore */ }

  const pendingCount = applicationList?.filter((a) => a.application.status === "대기중").length ?? 0;

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back */}
          <Link href="/board">
            <Button variant="ghost" size="sm" className="gap-1.5 mb-6 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              게시판으로
            </Button>
          </Link>

          {/* Header */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[post.category]}`}>
                {post.category}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${displayStatus === "모집중" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {displayStatus}
              </span>
            </div>

            <h1 className="text-2xl font-black text-foreground mb-4">{post.title}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                모집 인원 {post.capacity}명
              </span>
              {deadlineDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {deadlineDate.toLocaleDateString("ko-KR")} 마감
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                조회 {post.viewCount}
              </span>
            </div>

            {parsedKeywords.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                {parsedKeywords.map((kw) => (
                  <span key={kw} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-lg">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">작성자:</span>
                <span className="font-medium text-foreground text-sm">{authorName ?? "익명"}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-4">
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isAuthor ? (
              <>
                <Link href={`/post/${post.id}/edit`} className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <Pencil className="w-4 h-4" />
                    수정하기
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제하기
                </Button>
              </>
            ) : isAuthenticated ? (
              myApplication ? (
                <div className="flex-1 flex items-center gap-3 bg-card rounded-xl border border-border p-4">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">신청 완료</p>
                    <p className="text-xs text-muted-foreground">
                      현재 상태:{" "}
                      <span className={`font-semibold ${
                        myApplication.status === "수락" ? "text-green-600" :
                        myApplication.status === "거절" ? "text-red-500" : "text-amber-600"
                      }`}>
                        {myApplication.status}
                      </span>
                    </p>
                  </div>
                </div>
              ) : displayStatus === "마감" ? (
                <Button disabled className="flex-1">마감된 모집입니다</Button>
              ) : (
                <Button
                  className="flex-1 font-semibold"
                  onClick={() => setApplyDialogOpen(true)}
                >
                  신청하기
                </Button>
              )
            ) : (
              <Button
                className="flex-1 font-semibold"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                로그인 후 신청하기
              </Button>
            )}
          </div>

          {/* 작성자: 신청자 목록 */}
          {isAuthor && applicationList && applicationList.length > 0 && (
            <div className="mt-6 bg-card rounded-2xl border border-border p-6">
              <h2 className="font-black text-lg mb-1 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                신청자 목록
                {pendingCount > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold">
                    대기 {pendingCount}
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">총 {applicationList.length}명이 신청했습니다</p>
              <div className="space-y-3">
                {applicationList.map(({ application, applicantName }) => (
                  <div
                    key={application.id}
                    className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{applicantName ?? "익명"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          application.status === "수락" ? "bg-green-100 text-green-700" :
                          application.status === "거절" ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {application.status}
                        </span>
                      </div>
                      {application.introduction && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {application.introduction}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(application.createdAt).toLocaleDateString("ko-KR")} 신청
                      </p>
                    </div>
                    {application.status === "대기중" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="text-xs h-8 bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatusMutation.mutate({ applicationId: application.id, status: "수락" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          수락
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => updateStatusMutation.mutate({ applicationId: application.id, status: "거절" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          거절
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">신청하기</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{post.title}</span>에 신청합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-semibold text-foreground mb-2 block">
              한 줄 소개 <span className="text-muted-foreground font-normal">(선택)</span>
            </label>
            <Textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="자신을 간단히 소개해주세요 (최대 300자)"
              maxLength={300}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{introduction.length}/300</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>취소</Button>
            <Button
              onClick={() => applyMutation.mutate({ postId, introduction: introduction || undefined })}
              disabled={applyMutation.isPending}
              className="font-semibold"
            >
              {applyMutation.isPending ? "신청 중..." : "신청 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 게시글은 복구할 수 없습니다. 기존 신청 내역도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: post.id })}
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
