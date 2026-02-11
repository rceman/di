import { useEffect, useState } from "react";

import { Button } from "./components/ui/button";
import DavanuPage from "./pages/DavanuPage";
import LieliskaPage from "./pages/LieliskaPage";

const PAGES = {
  lieliska: "Lieliska DK",
  davanu: "Davanu serviss",
} as const;

const ROUTES = {
  [PAGES.lieliska]: "/lieliska_dk",
  [PAGES.davanu]: "/davanu_serviss",
} as const;

const BASE_URL = import.meta.env.BASE_URL.replace(/\/+$/, "");

const withBase = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}` || normalizedPath;
};

const withoutBase = (pathname: string) => {
  if (!BASE_URL || BASE_URL === "/") {
    return pathname;
  }
  return pathname.startsWith(BASE_URL)
    ? pathname.slice(BASE_URL.length) || "/"
    : pathname;
};

export default function App() {
  const [activePage, setActivePage] = useState<string>(PAGES.lieliska);

  useEffect(() => {
    const resolvePage = (pathname: string) => {
      const localPath = withoutBase(pathname);
      if (localPath === ROUTES[PAGES.davanu]) {
        return PAGES.davanu;
      }
      return PAGES.lieliska;
    };

    const handlePopState = () => {
      const nextPage = resolvePage(window.location.pathname);
      setActivePage(nextPage);
      const localPath = withoutBase(window.location.pathname);
      if (localPath === "/") {
        window.history.replaceState(null, "", withBase(ROUTES[PAGES.lieliska]));
      }
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (page: string) => {
    const nextPath = ROUTES[page as keyof typeof ROUTES] ?? ROUTES[PAGES.lieliska];
    window.history.pushState(null, "", withBase(nextPath));
    setActivePage(page);
  };

  return (
    <div
      id="app-shell"
      className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(circle_at_bottom,_hsl(var(--accent)/0.3),_transparent_45%)]"
    >
      <div
        id="app-container"
        className="mx-auto flex w-full max-w-none flex-col gap-6 px-2 py-10 md:px-4"
      >
        <div id="page-tabs" className="flex flex-wrap gap-3">
          {[PAGES.lieliska, PAGES.davanu].map((page) => (
            <Button
              key={page}
              type="button"
              variant={activePage === page ? "default" : "outline"}
              onClick={() => navigateTo(page)}
            >
              {page}
            </Button>
          ))}
        </div>

        <header id="app-header" className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {activePage}
          </p>
        </header>

        <div id="app-content" className="flex flex-col gap-6">
          {activePage === PAGES.lieliska ? <LieliskaPage /> : <DavanuPage />}
        </div>
      </div>
    </div>
  );
}
