import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function Layout({ children, className = "" }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className={`flex-1 ${className}`}>{children}</main>
      <footer className="border-t border-border bg-card mt-auto">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <span className="text-white font-black text-xs">H</span>
              </div>
              <span className="text-sm font-semibold text-foreground">HUFS Global Campus Community</span>
            </div>
            <p className="text-xs text-muted-foreground">
              한국외국어대학교 글로벌 캠퍼스 교내 커뮤니티 플랫폼
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
