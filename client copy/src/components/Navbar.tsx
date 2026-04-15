import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { BookOpen, Users, GraduationCap, PenSquare, LogOut, User, LayoutDashboard } from "lucide-react";

const NAV_LINKS = [
  { href: "/board", label: "모집 게시판", icon: BookOpen },
];

const CATEGORY_LINKS = [
  { href: "/board?category=동아리", label: "동아리", icon: Users },
  { href: "/board?category=학회", label: "학회", icon: GraduationCap },
  { href: "/board?category=스터디", label: "스터디", icon: BookOpen },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-black text-sm">H</span>
            </div>
            <span className="hidden sm:block font-black text-foreground text-sm">HUFSquare</span>
          </Link>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm font-medium ${location.startsWith("/board") ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            {CATEGORY_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/post/new">
                  <Button size="sm" className="hidden sm:flex gap-1.5 font-semibold">
                    <PenSquare className="w-4 h-4" />
                    모집 글 작성
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full hover:bg-accent transition-colors p-1 pr-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {user?.name?.charAt(0) ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium text-foreground max-w-[80px] truncate">
                        {user?.name ?? "사용자"}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/mypage" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" />
                        마이페이지
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" />
                        프로필 설정
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-destructive focus:text-destructive flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => (window.location.href = getLoginUrl())}
                className="font-semibold"
              >
                로그인
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
