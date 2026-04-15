import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Board from "./pages/Board";
import PostDetail from "./pages/PostDetail";
import PostForm from "./pages/PostForm";
import Profile from "./pages/Profile";
import MyPage from "./pages/MyPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/board" component={Board} />
      <Route path="/post/new" component={PostForm} />
      <Route path="/post/:id/edit" component={PostForm} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/mypage" component={MyPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
