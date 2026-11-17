import { describe, it, expect, beforeEach, vi } from "vitest";

describe("analytics consent", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.head.querySelectorAll("script").forEach((s) => s.remove());
    delete window.gtag;
    delete window.dataLayer;
  });

  it("loads nothing without a measurement ID, even with consent", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");
    const a = await import("../lib/analytics");
    a.setConsent("granted");
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    expect(a.analyticsConfigured()).toBe(false);
  });

  it("loads Google's script only after consent, and sends events then", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST1234");
    const a = await import("../lib/analytics");
    a.initAnalytics();
    a.track("add_to_list", { item_name: "Butter" });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();

    a.setConsent("granted");
    expect(document.querySelector('script[src*="googletagmanager"]')).not.toBeNull();
    a.track("add_to_list", { item_name: "Butter" });
    expect(window.dataLayer!.map((args) => Array.from(args as ArrayLike<unknown>)[1])).toContain("add_to_list");
  });

  it("stops sending after consent is withdrawn", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST1234");
    const a = await import("../lib/analytics");
    a.setConsent("granted");
    a.setConsent("denied");
    const before = window.dataLayer!.length;
    a.track("search", { search_term: "eier" });
    expect(window.dataLayer!.length).toBe(before);
    expect(window["ga-disable-G-TEST1234"]).toBe(true);
  });
});
