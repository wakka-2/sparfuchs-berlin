import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { weekPhase, remaining } from "../lib/week";
import { formatValidUntil } from "../lib/format";
import { Icon } from "./Icon";

/**
 * Big countdown to the end of this week's offers (Saturday night, Berlin
 * time), then — once they ended — to the next flyer on Monday.
 * The ticking digits are hidden from screen readers; they get the dates once.
 */
export function OfferCountdown({ validUntil }: { validUntil: string }) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const phase = weekPhase(validUntil, now);
  const left = remaining(phase.target, now);
  const urgent = phase.mode === "ends" && left.total < 86_400;
  // Monday before the new prices are in: nothing sensible to count down to.
  if (phase.mode === "starts" && left.total === 0) return null;
  const nextStart = formatValidUntil(phase.nextStart, i18n.language);
  const until = formatValidUntil(validUntil, i18n.language);

  const units = [
    { value: left.days, label: t("countdown.days") },
    { value: left.hours, label: t("countdown.hours") },
    { value: left.minutes, label: t("countdown.minutes") },
    { value: left.seconds, label: t("countdown.seconds") },
  ];

  return (
    <section
      aria-labelledby="countdown-title"
      className="flex flex-col gap-4 rounded-3xl bg-ink px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8"
    >
      <div>
        <h2 id="countdown-title" className="flex items-center gap-2 text-base font-semibold text-white/80">
          <Icon name="calendar" className="h-5 w-5" />
          {phase.mode === "ends" ? t("countdown.endsIn") : t("countdown.startsIn")}
        </h2>
        <p className="sr-only">
          {phase.mode === "ends" ? t("countdown.srEnds", { date: until, next: nextStart }) : t("countdown.srStarts", { next: nextStart })}
        </p>
        <div className="mt-2 flex gap-2 sm:gap-3" aria-hidden="true">
          {units.map((u) => (
            <div
              key={u.label}
              className={`flex w-16 flex-col items-center rounded-2xl py-2 sm:w-20 ${urgent ? "bg-deal-500 text-ink" : "bg-white/10"}`}
            >
              <span className="tabular font-display text-3xl font-bold leading-none sm:text-4xl">
                {String(u.value).padStart(2, "0")}
              </span>
              <span className={`mt-1 text-xs font-medium ${urgent ? "text-ink/80" : "text-white/70"}`}>{u.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white/10 px-4 py-3 sm:max-w-xs sm:text-right" aria-hidden="true">
        {phase.mode === "ends" ? (
          <>
            <p className="text-sm text-white/70">{t("countdown.validUntil", { date: until })}</p>
            <p className="font-semibold">{t("countdown.nextFrom", { date: nextStart })}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-white/70">{t("countdown.ended")}</p>
            <p className="font-semibold">{t("countdown.nextFrom", { date: nextStart })}</p>
          </>
        )}
      </div>
    </section>
  );
}
