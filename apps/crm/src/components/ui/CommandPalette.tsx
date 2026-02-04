"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Users,
  FileText,
  Receipt,
  Briefcase,
  User,
  Target,
  Search,
  Clock,
} from "lucide-react";

type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

const RECENT_SEARCHES_KEY = "qt_recent_searches";
const RECENT_ITEMS_KEY = "qt_recent_items";
const MAX_RECENT = 5;

type RecentItem = {
  type: string;
  id: string;
  title: string;
  url: string;
};

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage errors
  }
}

function getRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentItem(result: SearchResult) {
  if (typeof window === "undefined") return;
  try {
    const item: RecentItem = { type: result.type, id: result.id, title: result.title, url: result.url };
    const recent = getRecentItems().filter((r) => r.id !== item.id);
    recent.unshift(item);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage errors
  }
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200/60 text-inherit rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    ),
  );
}

const typeLabels: Record<string, string> = {
  client: "Clients",
  quote: "Quotes",
  invoice: "Invoices",
  job: "Jobs",
  contact: "Contacts",
  deal: "Deals",
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  client: Users,
  quote: FileText,
  invoice: Receipt,
  job: Briefcase,
  contact: User,
  deal: Target,
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [recentItems, setRecentItems] = React.useState<RecentItem[]>([]);

  // Load recent searches and items on mount
  React.useEffect(() => {
    setRecentSearches(getRecentSearches());
    setRecentItems(getRecentItems());
  }, [open]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Register global keyboard shortcut
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Search debounce
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(query)}&limit=20`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (data.ok) {
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          console.error("Search error:", e);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  // Group results by type
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const result of results) {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    }
    return groups;
  }, [results]);

  // Flatten for keyboard navigation
  const flatResults = React.useMemo(() => {
    const flat: SearchResult[] = [];
    for (const type of Object.keys(groupedResults)) {
      flat.push(...groupedResults[type]);
    }
    return flat;
  }, [groupedResults]);

  function handleSelect(result: SearchResult) {
    saveRecentSearch(query);
    saveRecentItem(result);
    onOpenChange(false);
    router.push(result.url);
  }

  function handleRecentSearch(searchQuery: string) {
    setQuery(searchQuery);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        handleSelect(flatResults[selectedIndex]);
      }
    }
  }

  if (!open) return null;

  let currentIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <button
        aria-label="Close search"
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative w-full max-w-[600px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
            <Search className="h-5 w-5 text-[var(--muted-foreground)]" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent py-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none text-base"
              placeholder="Search clients, quotes, invoices, jobs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            )}
            <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
              ESC
            </kbd>
          </div>

          {/* Results or Recent Searches */}
          <div className="max-h-[400px] overflow-y-auto">
            {query.trim() === "" ? (
              // Show recent searches and recent items
              recentSearches.length > 0 || recentItems.length > 0 ? (
                <div className="p-2">
                  {recentSearches.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Recent Searches
                      </div>
                      {recentSearches.map((search, i) => (
                        <button
                          key={i}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[var(--muted)] transition-colors"
                          onClick={() => handleRecentSearch(search)}
                        >
                          <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                          <span className="text-sm text-[var(--foreground)]">{search}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {recentItems.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Recent Items
                      </div>
                      {recentItems.map((item) => {
                        const IconComponent = typeIcons[item.type] || User;
                        return (
                          <button
                            key={item.id}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[var(--muted)] transition-colors"
                            onClick={() => { onOpenChange(false); router.push(item.url); }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--muted)] text-[var(--muted-foreground)]">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--foreground)] truncate">{item.title}</div>
                              <div className="text-xs text-[var(--muted-foreground)]">{typeLabels[item.type] || item.type}</div>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Start typing to search...
                </div>
              )
            ) : results.length === 0 && !loading ? (
              <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                No results found for "{query}"
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedResults).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      {typeLabels[type] || type}
                    </div>
                    {items.map((result) => {
                      const index = currentIndex++;
                      const isSelected = index === selectedIndex;
                      const IconComponent = typeIcons[result.type] || User;
                      return (
                        <button
                          key={result.id}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            isSelected ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"
                          )}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                              isSelected
                                ? "bg-[var(--primary-foreground)]/20 text-[var(--primary-foreground)]"
                                : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                            )}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-medium truncate",
                              isSelected ? "text-[var(--primary-foreground)]" : "text-[var(--foreground)]"
                            )}>
                              {highlightMatch(result.title, query)}
                            </div>
                            {result.subtitle && (
                              <div className={cn(
                                "text-sm truncate",
                                isSelected ? "text-[var(--primary-foreground)]/70" : "text-[var(--muted-foreground)]"
                              )}>
                                {highlightMatch(result.subtitle, query)}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono rounded bg-[var(--primary-foreground)]/20">
                              Enter
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono">
                  <span className="text-[10px]">arrow</span>
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono">
                  <span className="text-[10px]">enter</span>
                </kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono">
                <span className="text-[10px]">{isMac ? "⌘" : "ctrl"}</span>
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono">K</kbd>
              toggle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
