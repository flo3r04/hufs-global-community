import { Link } from "wouter";
import { Calendar, Users, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  id: number;
  category: "동아리" | "학회" | "스터디";
  title: string;
  authorName?: string | null;
  capacity: number;
  deadline?: Date | string | null;
  keywords?: string | null;
  status: "모집중" | "마감";
  createdAt?: Date | string;
  score?: number; // 추천 점수
}

const CATEGORY_STYLES: Record<string, string> = {
  동아리: "bg-blue-100 text-blue-700 border-blue-200",
  학회: "bg-teal-100 text-teal-700 border-teal-200",
  스터디: "bg-pink-100 text-pink-700 border-pink-200",
};

const STATUS_STYLES: Record<string, string> = {
  모집중: "bg-green-100 text-green-700",
  마감: "bg-gray-100 text-gray-500",
};

export default function PostCard({
  id,
  category,
  title,
  authorName,
  capacity,
  deadline,
  keywords,
  status,
  createdAt,
  score,
}: PostCardProps) {
  let parsedKeywords: string[] = [];
  try {
    parsedKeywords = JSON.parse(keywords ?? "[]");
  } catch { /* ignore */ }

  const deadlineDate = deadline ? new Date(deadline) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;
  const displayStatus = isExpired ? "마감" : status;

  return (
    <Link href={`/post/${id}`} className="block no-underline group">
      <div className="bg-card rounded-2xl border border-border p-5 h-full flex flex-col gap-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 group-hover:-translate-y-0.5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[category] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
          >
            {category}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[displayStatus]}`}>
            {displayStatus}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 mt-auto">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              모집 {capacity}명
            </span>
            {deadlineDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {deadlineDate.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 마감
              </span>
            )}
          </div>

          {/* Keywords */}
          {parsedKeywords.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              {parsedKeywords.slice(0, 3).map((kw) => (
                <span
                  key={kw}
                  className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md"
                >
                  {kw}
                </span>
              ))}
              {parsedKeywords.length > 3 && (
                <span className="text-xs text-muted-foreground">+{parsedKeywords.length - 3}</span>
              )}
            </div>
          )}

          {/* Author */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{authorName ?? "익명"}</span>
            {score !== undefined && score > 0 && (
              <span className="text-xs text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
                ✦ 추천
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
