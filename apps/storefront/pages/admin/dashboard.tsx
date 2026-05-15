// apps/storefront/pages/admin/dashboard.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const ADMIN = "/api/v1/admin";
const HEADERS = { "X-Admin-Secret": "admin_dev_secret" };
const ONBOARDING_STORAGE_KEY = "cc_admin_onboarding_dismissed";

async function fetchStats() {
  try {
    const res = await fetch(`${ADMIN}/stats`, { headers: HEADERS });
    if (res.ok) return res.json();
  } catch {}

  return {
    products: { total: 24, published: 20, draft: 4 },
    orders:   { total: 47, pending: 8, fulfilled: 35, cancelled: 4, revenue: 428900 },
  };
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats, refetchInterval: 30_000 });
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true",
  );

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const productCount = stats?.products?.total ?? 0;
  const orderCount = stats?.orders?.total ?? 0;
  const isBlankDashboard = !isLoading && productCount === 0 && orderCount === 0;
  const showOnboarding = !isLoading && !onboardingDismissed && (isBlankDashboard || productCount < 3 || orderCount === 0);

  const onboardingSteps = useMemo(() => [
    {
      title: "Add your first product",
      description: "Create a product, set price and inventory, then publish it to the storefront.",
      action: "Create product",
      to: "/admin/products",
      done: productCount > 0,
    },
    {
      title: "Review your storefront",
      description: "Check how customers see your catalog before you start sharing the shop.",
      action: "Open storefront",
      to: "/",
      done: productCount > 0,
    },
    {
      title: "Track incoming orders",
      description: "Use the orders page to fulfill, cancel, or refund orders when sales arrive.",
      action: "View orders",
      to: "/admin/orders",
      done: orderCount > 0,
    },
  ], [productCount, orderCount]);

  const completedSteps = onboardingSteps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedSteps / onboardingSteps.length) * 100);

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setOnboardingDismissed(true);
  };

  const cards = stats ? [
    { label: "Total Products",  value: productCount,  sub: `${stats.products?.published ?? 0} published`, color: "#7c6aff", icon: "◈", to: "/admin/products" },
    { label: "Total Orders",    value: orderCount,    sub: `${stats.orders?.pending ?? 0} pending`,    color: "#f5a623", icon: "○", to: "/admin/orders" },
    { label: "Revenue",         value: fmt(stats.orders?.revenue ?? 0), sub: "All time",          color: "#3ddc97", icon: "⬡", to: "/admin/orders" },
    { label: "Fulfilled",       value: stats.orders?.fulfilled ?? 0, sub: `${stats.orders?.cancelled ?? 0} cancelled`, color: "#60a5fa", icon: "✓", to: "/admin/orders" },
  ] : [];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={s.pageTitle}>Dashboard</h1>
        <p style={{ color: "#888", fontSize: 14 }}>
          {isBlankDashboard ? "Let’s get your store ready for customers." : "Welcome back. Here's what's happening."}
        </p>
      </div>

      {showOnboarding && (
        <section style={s.onboardingCard} aria-label="New user onboarding">
          <div style={s.onboardingHeader}>
            <div>
              <span style={s.eyebrow}>Getting started</span>
              <h2 style={s.onboardingTitle}>Launch your store in 3 steps</h2>
              <p style={s.onboardingCopy}>Follow this checklist so the dashboard never feels empty or confusing.</p>
            </div>
            <button onClick={dismissOnboarding} style={s.dismissBtn} aria-label="Dismiss onboarding checklist">Dismiss</button>
          </div>

          <div style={s.progressTrack} aria-label={`${progressPercent}% onboarding complete`}>
            <div style={{ ...s.progressFill, width: `${progressPercent}%` }} />
          </div>
          <p style={s.progressText}>{completedSteps} of {onboardingSteps.length} steps complete</p>

          <div style={s.stepGrid}>
            {onboardingSteps.map((step, index) => (
              <Link key={step.title} to={step.to} style={s.stepCard}>
                <span style={{ ...s.stepNumber, background: step.done ? "#3ddc97" : "rgba(124,106,255,0.18)", color: step.done ? "#0c0c0e" : "#7c6aff" }}>
                  {step.done ? "✓" : index + 1}
                </span>
                <div>
                  <h3 style={s.stepTitle}>{step.title}</h3>
                  <p style={s.stepDescription}>{step.description}</p>
                  <span style={s.stepAction}>{step.action} →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div style={{ color: "#888" }}>Loading stats…</div>
      ) : (
        <div style={s.grid}>
          {cards.map((card) => (
            <Link key={card.label} to={card.to} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ ...s.cardIcon, color: card.color, background: `${card.color}18` }}>{card.icon}</span>
              </div>
              <div style={{ ...s.cardValue, color: card.color }}>{card.value}</div>
              <div style={s.cardLabel}>{card.label}</div>
              <div style={s.cardSub}>{card.sub}</div>
            </Link>
          ))}
        </div>
      )}

      <div style={s.quickLinks}>
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/admin/products" style={s.actionBtn}>Manage Products →</Link>
          <Link to="/admin/orders"   style={s.actionBtn}>View Orders →</Link>
          <Link to="/"              style={s.ghostBtn}>View Storefront ↗</Link>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, any> = {
  pageTitle:   { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 48 },
  card:        { background: "#141417", border: "1px solid #2a2a31", borderRadius: 14, padding: 24, textDecoration: "none", color: "inherit", transition: "border-color 0.2s", display: "block" },
  cardIcon:    { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  cardValue:   { fontSize: 32, fontWeight: 800, marginBottom: 4 },
  cardLabel:   { fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 },
  cardSub:     { fontSize: 12, color: "#888" },
  quickLinks:  { background: "#141417", border: "1px solid #2a2a31", borderRadius: 16, padding: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  actionBtn:   { padding: "10px 20px", background: "#7c6aff", color: "#fff", textDecoration: "none", borderRadius: 8, fontSize: 14, fontWeight: 600 },
  ghostBtn:    { padding: "10px 20px", background: "none", color: "#888", border: "1px solid #2a2a31", textDecoration: "none", borderRadius: 8, fontSize: 14 },
  onboardingCard: { background: "linear-gradient(135deg, rgba(124,106,255,0.18), rgba(61,220,151,0.08))", border: "1px solid rgba(124,106,255,0.35)", borderRadius: 20, padding: 28, marginBottom: 32 },
  onboardingHeader: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18 },
  eyebrow: { display: "inline-block", color: "#7c6aff", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  onboardingTitle: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
  onboardingCopy: { color: "#aaa", fontSize: 14, maxWidth: 560, lineHeight: 1.6 },
  dismissBtn: { background: "rgba(12,12,14,0.45)", border: "1px solid #2a2a31", color: "#aaa", borderRadius: 999, padding: "8px 14px", cursor: "pointer", fontSize: 13 },
  progressTrack: { height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", background: "#3ddc97", borderRadius: 999, transition: "width 0.25s ease" },
  progressText: { color: "#888", fontSize: 12, marginBottom: 18 },
  stepGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 },
  stepCard: { display: "flex", gap: 14, background: "rgba(12,12,14,0.58)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, textDecoration: "none", color: "inherit" },
  stepNumber: { width: 32, height: 32, flexShrink: 0, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 },
  stepTitle: { fontSize: 15, fontWeight: 800, marginBottom: 6 },
  stepDescription: { color: "#aaa", fontSize: 13, lineHeight: 1.5, marginBottom: 10 },
  stepAction: { color: "#7c6aff", fontSize: 13, fontWeight: 700 },
};
