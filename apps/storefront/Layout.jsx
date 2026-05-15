import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";

const CartStateCtx = createContext(null);
const CartDispatchCtx = createContext(null);
const ThemeCtx = createContext(null);

const THEME_STORAGE_KEY = "commit-conquer-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")) }),
    [theme],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeCtx);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const key = (i) => `${i.id}__${i.variantId ?? "default"}`;
      const exists = state.items.find((i) => key(i) === key(action.payload));
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            key(i) === key(action.payload)
              ? { ...i, quantity: i.quantity + (action.payload.quantity ?? 1) }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: action.payload.quantity ?? 1 }],
      };
    }
    case "REMOVE_ITEM": {
      const key = `${action.payload.id}__${action.payload.variantId ?? "default"}`;
      return { ...state, items: state.items.filter((i) => `${i.id}__${i.variantId ?? "default"}` !== key) };
    }
    case "UPDATE_QTY": {
      const key = `${action.payload.id}__${action.payload.variantId ?? "default"}`;
      if (action.payload.quantity <= 0)
        return { ...state, items: state.items.filter((i) => `${i.id}__${i.variantId ?? "default"}` !== key) };
      return {
        ...state,
        items: state.items.map((i) =>
          `${i.id}__${i.variantId ?? "default"}` === key ? { ...i, quantity: action.payload.quantity } : i,
        ),
      };
    }
    case "CLEAR":
      return { ...state, items: [] };
    case "TOGGLE_CART":
      return { ...state, isOpen: action.payload ?? !state.isOpen };
    default:
      return state;
  }
}

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });
  const derived = {
    ...state,
    count: state.items.reduce((n, i) => n + i.quantity, 0),
    total: state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };

  return (
    <CartStateCtx.Provider value={derived}>
      <CartDispatchCtx.Provider value={dispatch}>{children}</CartDispatchCtx.Provider>
    </CartStateCtx.Provider>
  );
}

export function useCartState() {
  return useContext(CartStateCtx);
}

export function useCartDispatch() {
  return useContext(CartDispatchCtx);
}

function Header() {
  const cart = useCartState();
  const dispatch = useCartDispatch();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navStyle = ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "var(--accent)" : "var(--text-dim)",
    fontSize: 14,
    fontWeight: 500,
    transition: "color 0.15s",
  });

  return (
    <header style={s.header}>
      <Link to="/" style={s.logo}>commit&amp;conquer</Link>

      <nav style={s.nav}>
        <NavLink to="/" end style={navStyle}>Shop</NavLink>
        <NavLink to="/collections" style={navStyle}>Collections</NavLink>
        <NavLink to="/about" style={navStyle}>About</NavLink>
        <NavLink to="/account" style={navStyle}>Account</NavLink>
        <NavLink
          to="/admin"
          style={({ isActive }) => ({
            ...navStyle({ isActive }),
            background: isActive ? "var(--accent-dim)" : "var(--surface2)",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 13,
          })}
        >
          Admin ↗
        </NavLink>
      </nav>

      <button
        onClick={toggleTheme}
        style={s.themeBtn}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        {theme === "dark" ? "☀️" : "🌙"}
        <span style={s.themeText}>{theme === "dark" ? "Light" : "Dark"}</span>
      </button>

      <button
        onClick={() => dispatch({ type: "TOGGLE_CART", payload: true })}
        style={s.cartBtn}
        aria-label="Open cart"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        {cart?.count > 0 && <span style={s.badge}>{cart.count > 99 ? "99+" : cart.count}</span>}
      </button>
    </header>
  );
}

function Footer() {
  return (
    <footer style={s.footer}>
      <div style={s.footerInner}>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>© {new Date().getFullYear()} Commit &amp; Conquer</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link to="/about" style={s.footerLink}>About</Link>
          <Link to="/collections" style={s.footerLink}>Collections</Link>
          <Link to="/account" style={s.footerLink}>Account</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <CartProvider>
        <GlobalThemeStyles />
        <div style={s.root}>
          <Header />
          <main style={s.main}>
            <Outlet />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}

function GlobalThemeStyles() {
  return (
    <style>{`
      :root,
      :root[data-theme="dark"] {
        --bg: #0c0c0e;
        --surface: #141417;
        --surface2: #1c1c21;
        --border: #2a2a31;
        --border-hover: #404050;
        --text: #e8e8f0;
        --text-muted: #6b6b80;
        --text-dim: #9999aa;
        --accent: #7c6aff;
        --accent-hover: #9080ff;
        --accent-dim: rgba(124,106,255,0.15);
        --accent-glow: rgba(124,106,255,0.3);
        --green: #3ddc97;
        --green-dim: rgba(61,220,151,0.12);
        --amber: #f5a623;
        --amber-dim: rgba(245,166,35,0.12);
        --red: #ff5c5c;
        --red-dim: rgba(255,92,92,0.12);
        --header-bg: rgba(12,12,14,0.9);
        --shadow-strong: rgba(0,0,0,0.5);
      }

      :root[data-theme="light"] {
        --bg: #f7f7fb;
        --surface: #ffffff;
        --surface2: #f0f0f7;
        --border: #ddddea;
        --border-hover: #c5c5d6;
        --text: #141417;
        --text-muted: #68687a;
        --text-dim: #4f4f62;
        --accent: #6654f1;
        --accent-hover: #5544d9;
        --accent-dim: rgba(102,84,241,0.12);
        --accent-glow: rgba(102,84,241,0.22);
        --green: #10845c;
        --green-dim: rgba(16,132,92,0.12);
        --amber: #a96400;
        --amber-dim: rgba(169,100,0,0.12);
        --red: #c92a2a;
        --red-dim: rgba(201,42,42,0.12);
        --header-bg: rgba(255,255,255,0.88);
        --shadow-strong: rgba(20,20,35,0.14);
      }

      body { background: var(--bg); color: var(--text); }
      * { transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease; }
    `}</style>
  );
}

const s = {
  root: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)" },
  header: {
    position: "sticky", top: 0, zIndex: 100,
    display: "flex", alignItems: "center", gap: 24,
    padding: "0 32px", height: 60,
    background: "var(--header-bg)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border)",
  },
  logo: { fontWeight: 800, fontSize: 17, textDecoration: "none", color: "var(--text)", letterSpacing: "-0.5px", marginRight: "auto" },
  nav: { display: "flex", alignItems: "center", gap: 20 },
  themeBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)",
    borderRadius: 999, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  themeText: { fontSize: 12 },
  cartBtn: {
    position: "relative", background: "none", border: "none",
    cursor: "pointer", color: "var(--text)", padding: "6px 8px",
    borderRadius: 8, marginLeft: 8, display: "flex", alignItems: "center",
  },
  badge: {
    position: "absolute", top: 0, right: 0,
    background: "var(--accent)", color: "#fff",
    fontSize: 10, fontWeight: 700, borderRadius: "50%",
    width: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center",
  },
  main: { flex: 1 },
  footer: { borderTop: "1px solid var(--border)", padding: "24px 32px" },
  footerInner: { maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  footerLink: { color: "var(--text-muted)", textDecoration: "none", fontSize: 13 },
};
