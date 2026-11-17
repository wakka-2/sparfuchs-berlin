import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { fetchReviews, decideReview, type ReviewItem } from "../lib/api";
import { StoreBadge } from "../components/StoreBadge";
import { ErrorState } from "../components/ErrorState";
import { Icon } from "../components/Icon";

const TOKEN_KEY = "sparfuchs-review-token";
const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
};
const saveToken = (t: string) => {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode: ask again next time */ }
};

/**
 * The owner's review queue: matches the AI questioned and prices the pipeline
 * held back. Decisions take effect on the next daily pipeline run.
 */
export function ReviewPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState(readToken);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchReviews(token)
      .then((r) => { if (!cancelled) { setItems(r); setError(""); } })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (/token/i.test(msg)) { saveToken(""); setToken(""); }
        setError(msg);
      });
    return () => { cancelled = true; };
  }, [token, reload]);

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    saveToken(v);
    setItems(null);
    setToken(v);
    setInput("");
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      await decideReview(token, id, status);
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!token) {
    return (
      <form onSubmit={signIn} className="mx-auto max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6">
        <h1 className="text-2xl font-bold">{t("review.title")}</h1>
        <p className="text-sm text-ink-muted">{t("review.signInHint")}</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{t("review.tokenLabel")}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>
        <button type="submit" disabled={!input.trim()} className="min-h-12 w-full cursor-pointer rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
          {t("review.signIn")}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("review.title")}</h1>
          <p className="mt-1 max-w-2xl text-ink-muted">{t("review.subtitle")}</p>
        </div>
        <button type="button" onClick={() => { saveToken(""); setToken(""); setItems(null); }} className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold text-ink-muted hover:bg-canvas hover:text-ink">
          {t("review.signOut")}
        </button>
      </header>

      {error && items !== null && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {items === null ? (
        error ? <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} /> : <p className="text-ink-muted">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-muted">{t("review.empty")}</p>
      ) : (
        <>
          <p className="text-sm text-ink-subtle" aria-live="polite">{t("review.count", { count: items.length })}</p>
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl bg-white sm:w-24">
                  {r.image_url ? <img src={r.image_url} alt="" width={96} height={96} loading="lazy" className="h-full w-auto object-contain" /> : <Icon name="package" className="h-8 w-8 text-line" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-base font-semibold">
                    {r.kind === "match" ? t("review.questionMatch", { product: r.product_name }) : t("review.questionPrice", { product: r.product_name })}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{r.offer_name}</span>
                    <span className="tabular text-ink-muted"> · {r.price_formatted} · {r.unit_text}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink-subtle">
                    <StoreBadge name={r.store_name} color={r.store_color} />
                    <span>{r.reason}</span>
                    {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-800 underline-offset-2 hover:underline">{t("review.open")}</a>}
                  </p>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <button type="button" disabled={busy === r.id} onClick={() => decide(r.id, "approved")} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
                    {t("review.approve")}
                  </button>
                  <button type="button" disabled={busy === r.id} onClick={() => decide(r.id, "rejected")} className="min-h-11 flex-1 cursor-pointer rounded-xl border border-line px-4 font-semibold text-ink hover:bg-canvas disabled:opacity-50">
                    {t("review.reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
