# Design: Frontend Foundation (React + TypeScript + Material UI)

Last updated: 2026-04-18

This document does two things at once:

1. **Design** — it specifies the frontend foundation for the enterprise-app-scaffold: a React + TypeScript web app with Login, Registration, and Home pages, styled with Material UI (MUI), wired to the existing backend's Cognito auth endpoints.
2. **Crash course** — it teaches the React and tooling concepts you need to read, write, and reason about this code if React is new to you. Concepts are introduced in context, grounded in the actual code we are designing, not in the abstract.

Read it top-to-bottom. The order matters — each section builds on the previous one.

---

## 1. What we are building

A single-page web application (SPA) with three screens:

| Screen | Path | Purpose | Auth required |
|---|---|---|---|
| Login | `/login` | Enter email + password, receive tokens, navigate to Home | No |
| Register | `/register` | Create a new user via the backend, show "check your email to confirm" | No |
| Home | `/` | Authenticated landing page. Shows the signed-in user, fetches `GET /v1/health` as a proof-of-life. | **Yes** |

The frontend lives in a new top-level directory, `web/`. It is a sibling of `src/` (backend source), `infra/`, and `docs/`. It has its own `package.json` and dev server — it is a separate Node project that consumes the backend over HTTP.

```
enterprise-app-scaffold/
├── src/            ← backend Lambda handlers (unchanged)
├── infra/          ← SAM template (unchanged)
├── web/            ← new frontend project
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── theme.ts
│       ├── api/
│       ├── auth/
│       ├── components/
│       └── pages/
└── docs/
    └── frontend/
        └── frontend-design.md   ← this file
```

---

## 2. React in 10 minutes (the mental model you actually need)

Skip this section only if you already write React. Otherwise, slow down here — it pays back tenfold later.

### 2.1 The one big idea: `UI = f(state)`

Traditional web code thinks imperatively: "find the element with id `x`, change its text, toggle its class." Every DOM mutation is a line of code.

React flips that. You write a **function** that takes the current state of the world and returns what the UI should look like right now. React takes your output, figures out what changed since last time, and patches the DOM for you.

Read that twice. That's the whole model. Everything else is plumbing.

### 2.2 Components

A React **component** is a function that returns UI. Here is the smallest possible one:

```tsx
function Greeting() {
  return <h1>Hello</h1>;
}
```

That's a component. You use it like an HTML tag: `<Greeting />`. React calls the function, gets `<h1>Hello</h1>`, puts it on the page.

### 2.3 JSX: HTML inside JS

`<h1>Hello</h1>` inside a `.tsx` file is not HTML. It is **JSX** — a syntax extension that the TypeScript compiler turns into plain function calls (`React.createElement("h1", null, "Hello")`). You can read JSX as "HTML-flavored JavaScript." A few gotchas:

- Attributes are camelCase: `onClick`, `className` (not `class` — `class` is reserved in JS).
- You interpolate JS with braces: `<h1>Hello {name}</h1>`.
- A component must return **one** root element. Wrap siblings in `<>...</>` (a "fragment") if needed.

### 2.4 Props: inputs to a component

Props are the arguments a component accepts, written exactly like HTML attributes:

```tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello {name}</h1>;
}

// used like:
<Greeting name="Cyrus" />
```

Props are **read-only**. A component never modifies its own props — it only renders based on them.

### 2.5 State: values that, when changed, re-render the component

This is where UI starts moving. State lives inside a component and is managed with the `useState` **hook**:

```tsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

What's happening:

- `useState(0)` returns a pair: the current value, and a setter function.
- When the button is clicked, `setCount(count + 1)` is called.
- React notices state changed. It re-runs `Counter()`. The function returns new JSX with the new count. React diffs and updates the DOM.

You never write `element.innerText = ...`. You **set state**. Everything downstream is automatic.

### 2.6 Hooks (the `use*` functions)

"Hook" is just the name for a function that plugs a component into React's machinery. All of them start with `use`. The ones that matter for this project:

| Hook | What it does |
|---|---|
| `useState` | Holds a piece of state inside a component. |
| `useEffect` | Runs a side effect (fetching data, setting a timer) after the component renders. |
| `useContext` | Reads a value from a shared context (see §5). |
| `useNavigate` (from `react-router`) | Programmatically navigate to another URL. |

The two rules of hooks:
1. Call them **at the top level** of your component — never inside `if`, `for`, or a nested function.
2. Call them only from components or other hooks — never from plain functions.

These rules exist because React identifies hooks by their call order across renders.

### 2.7 Side effects with `useEffect`

A component's job is to return JSX. Anything else — fetching, subscribing, logging — is a **side effect** and belongs in `useEffect`:

```tsx
function HealthPanel() {
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    fetch("/v1/health")
      .then((r) => r.json())
      .then(setData);
  }, []); // empty array = run once on mount

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

The second argument to `useEffect` is the **dependency array**. Rerun the effect whenever anything in that array changes. `[]` means run once ever. `[userId]` means rerun whenever `userId` changes.

### 2.8 That is 90% of what you need

Components, JSX, props, state, `useEffect`. The rest of this document will introduce a few more pieces (`createContext`, `<Routes>`) as they come up. You now have the vocabulary to read the code.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build tool / dev server | **Vite** | Fast. Modern. The Create-React-App successor everyone is using in 2026. |
| Language | **TypeScript** | You already write it on the backend. Same mental model. |
| UI library | **React 19** | Current stable. The foundational piece. |
| Component library | **MUI (Material UI) v6** | Pre-built React components that follow Material Design. Saves us from writing buttons, inputs, and dialogs from scratch. |
| Routing | **React Router v7** | Standard choice. Declarative `<Route path=... />` mapping URLs to components. |
| HTTP client | Built-in **`fetch`** | No library needed. We already use it in the backend integration tests. |
| Testing | **Vitest** + **React Testing Library** | Vitest mirrors Jest's API but runs on Vite's toolchain. RTL tests components the way a user sees them. |

> **What is Vite?** A dev server and build tool. During development it serves your source files directly to the browser with near-instant hot reload — edit a component, see the change in ~50 ms. For production, it bundles everything into optimized JS and CSS. Think of it as the modern replacement for Webpack + dev server.

> **What is MUI?** A library of React components styled to Google's Material Design spec. You import `<Button variant="contained">Sign in</Button>` and you get a properly-styled, accessible, themed button. No CSS to write for the common cases.

---

## 4. Project layout

```
web/
├── index.html              ← HTML shell; loads main.tsx
├── package.json
├── vite.config.ts          ← Vite config (incl. dev proxy to backend)
├── tsconfig.json
├── src/
│   ├── main.tsx            ← App entry: mounts <App /> into #root
│   ├── App.tsx             ← Top-level component: theme + router + routes
│   ├── theme.ts            ← MUI theme (colors, typography)
│   ├── api/
│   │   └── auth.ts         ← Typed wrappers around /v1/auth/* and /v1/health
│   ├── auth/
│   │   ├── AuthContext.tsx ← Stores tokens + user; exposes login/logout
│   │   └── RequireAuth.tsx ← Guards routes; redirects to /login if no session
│   ├── components/
│   │   └── AppShell.tsx    ← MUI <AppBar> + nav bar used on every page
│   └── pages/
│       ├── LoginPage.tsx
│       ├── RegisterPage.tsx
│       └── HomePage.tsx
└── test/
    └── pages/
        └── LoginPage.test.tsx
```

---

## 5. The authentication model

The backend issues three tokens on login: `idToken`, `accessToken`, and `refreshToken`. The frontend needs to:

1. Send credentials to `POST /v1/auth/login`.
2. Store the returned tokens.
3. Attach `Authorization: Bearer <accessToken>` to every protected request.
4. Clear tokens on logout.
5. Redirect unauthenticated users to `/login` when they try to access a protected page.

### 5.1 Where to keep the tokens

Two reasonable options for this foundation:

- **In-memory (React state) + `localStorage` for persistence.** Simple, works offline, survives a page refresh. Vulnerable to XSS — if an attacker injects a script, they can read `localStorage`.
- **httpOnly cookie for the refresh token, in-memory for the access token.** The best practice for production. Requires backend cooperation (the backend sets the cookie).

For the foundation we use **option 1** and document the upgrade path. It keeps the code simple while we get the basics working. Swapping to httpOnly cookies is a backend-coordinated change we can do once the full auth loop is proven end-to-end.

### 5.2 `AuthContext` — one place owns the session

React's **Context** API lets you share state across the whole component tree without passing props through every intermediate component. We create a single `AuthContext` that holds the current user and tokens, plus the login/logout functions:

```tsx
// src/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Session {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  user: { sub: string; email: string };
}

interface AuthValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem("session");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (session) localStorage.setItem("session", JSON.stringify(session));
    else localStorage.removeItem("session");
  }, [session]);

  async function login(email: string, password: string) {
    const res = await fetch("/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("login failed");
    const body = await res.json();
    setSession({
      accessToken: body.accessToken,
      idToken: body.idToken,
      refreshToken: body.refreshToken,
      user: decodeUserFromIdToken(body.idToken),
    });
  }

  function logout() {
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
```

Anywhere in the tree, `const { session, login, logout } = useAuth();` gives you the current session.

### 5.3 `RequireAuth` — route-level gate

```tsx
// src/auth/RequireAuth.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
```

Wrap any protected page in `<RequireAuth>...</RequireAuth>`. If there is no session, the user is bounced to `/login`.

---

## 6. Routing

`App.tsx` wires MUI's theme, the AuthProvider, and the router:

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <HomePage />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

The reading order: theme → auth context → router → routes. Each outer layer supplies something the inner layers can use.

---

## 7. The three pages

### 7.1 LoginPage

Uses MUI's `TextField`, `Button`, `Card`, `Alert`. Holds email + password in local state, calls `auth.login` on submit, and navigates on success:

```tsx
// src/pages/LoginPage.tsx
import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box, Card, CardContent, Typography,
  TextField, Button, Alert, Link,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>Sign in</Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email" type="email" fullWidth required
              margin="normal"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password" type="password" fullWidth required
              margin="normal"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Button
              type="submit" variant="contained" fullWidth
              sx={{ mt: 3 }} disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <Typography variant="body2" sx={{ mt: 2 }}>
            No account? <Link component={RouterLink} to="/register">Register</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
```

Things to notice that illustrate the concepts from §2:

- `useState` four times: email, password, error, submitting.
- `onChange={(e) => setEmail(e.target.value)}` is the "controlled input" pattern — the `<TextField>` displays `email`, and every keystroke updates `email`, which re-renders the input.
- `useAuth()` reaches into the context and pulls out `login`.
- `useNavigate()` from React Router returns a function we call to change the URL programmatically.
- `sx={{ maxWidth: 400, mx: "auto", mt: 8 }}` is MUI's styling prop — a shortcut for writing CSS inline using the theme's spacing and palette.

### 7.2 RegisterPage

Identical shape to LoginPage but calls `POST /v1/auth/signup`. On success, shows an informational message ("Check your email for a confirmation code") rather than auto-logging in, because Cognito requires email verification.

```tsx
// src/pages/RegisterPage.tsx (sketch)
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const res = await fetch("/v1/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.ok) setStep("check-email");
  else setError((await res.json()).message ?? "signup failed");
}
```

A second step (in the same page) asks for the 6-digit confirmation code, then calls `POST /v1/auth/confirm`, then redirects to `/login`.

### 7.3 HomePage

The authenticated landing page. Uses the AppShell (AppBar with the user's email and a logout button) and fetches `/v1/health` to prove the access token works:

```tsx
// src/pages/HomePage.tsx (sketch)
export function HomePage() {
  const { session, logout } = useAuth();
  const [health, setHealth] = useState<unknown>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/v1/health", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then(setHealth);
  }, [session]);

  return (
    <AppShell userEmail={session?.user.email} onLogout={logout}>
      <Typography variant="h4">Welcome, {session?.user.email}</Typography>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6">Health</Typography>
          <pre>{JSON.stringify(health, null, 2)}</pre>
        </CardContent>
      </Card>
    </AppShell>
  );
}
```

---

## 8. Material UI: the parts you will actually use

You do not need to learn MUI as a whole. You need these components for the foundation:

| Component | Use |
|---|---|
| `Box` | Generic container. MUI's equivalent of `<div>` but with the `sx` styling prop. |
| `Typography` | All text. `variant="h4"`, `"body1"`, etc. Handles fonts and spacing consistently. |
| `Button` | `variant="contained"` (filled), `"outlined"`, or `"text"`. |
| `TextField` | Input with label, helper text, error state. Covers email, password, text, number. |
| `Card` / `CardContent` | The raised "panel" look. Used for the login card. |
| `Alert` | Colored status banner — info, warning, error, success. |
| `AppBar` / `Toolbar` | The top nav bar. |
| `Link` | For in-app links. With `component={RouterLink} to="/..."` it integrates with React Router. |

The `sx` prop is MUI's styling shortcut. It accepts an object where keys are CSS properties (camelCase) or theme shortcuts like `mt` (margin-top), `px` (padding-x), `bgcolor`, etc. Values can be theme spacing units (`mt: 3` = 3 × 8 px = 24 px).

A custom theme file keeps the palette centralized:

```tsx
// src/theme.ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
});
```

---

## 9. Running it locally

### 9.1 One-time setup

```bash
# From the repo root
npm create vite@latest web -- --template react-ts
cd web
npm install
npm install @mui/material @emotion/react @emotion/styled react-router-dom
```

### 9.2 Vite proxy — how the frontend talks to the backend in dev

In development the backend runs at `http://127.0.0.1:3000` (SAM local) and the frontend runs at `http://127.0.0.1:5173` (Vite). Different ports mean the browser will block cross-origin requests unless we either (a) enable CORS on the backend, or (b) proxy API calls through Vite so the browser sees them as same-origin. We pick (b) — zero backend changes needed:

```ts
// web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/v1": "http://127.0.0.1:3000",
    },
  },
});
```

Now in the frontend, `fetch("/v1/auth/login")` hits Vite at `:5173`, which forwards to the backend at `:3000`. Same-origin from the browser's perspective.

### 9.3 Day-to-day dev loop

Three terminals:

```bash
# Terminal 1 — backend infra (postgres + cognito-local)
npm run integration:up
npm run build
node test/setup/seed-integration.js

# Terminal 2 — backend API (SAM local)
npm run sam:local:start

# Terminal 3 — frontend dev server
cd web
npm run dev
```

Then open http://127.0.0.1:5173. Edit any file in `web/src/` and the browser reloads in ~50 ms via Vite's Hot Module Reload.

### 9.4 Production build

```bash
cd web
npm run build    # outputs web/dist/ — static HTML/JS/CSS
npm run preview  # serves web/dist/ locally to spot-check
```

`web/dist/` is the artifact you would later upload to S3 + CloudFront (out of scope for this foundation).

---

## 10. Testing

### 10.1 Vitest + React Testing Library

Vitest is "Jest for Vite" — the same `describe`/`it`/`expect` API, zero config. React Testing Library (RTL) renders a component into a virtual DOM so your tests interact with it the way a user would (click, type, read text) instead of reaching into implementation details.

```tsx
// web/test/pages/LoginPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../../src/pages/LoginPage";
import { AuthProvider } from "../../src/auth/AuthContext";

it("shows an error when login fails", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );

  await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
  await userEvent.type(screen.getByLabelText(/password/i), "pw");
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

  expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
});
```

Key RTL idioms:

- `screen.getByLabelText` / `getByRole` / `getByText` — find elements the way a screen reader would.
- `userEvent.type` / `click` — simulate real user input, not synthetic DOM events.
- No snapshot tests. Assert on behavior and visible text, not on markup shape.

### 10.2 What to test at this stage

- Login page: success path navigates, failure path shows the error, disabled button while submitting.
- Register page: submit flows to the confirmation step on success.
- `RequireAuth`: redirects to `/login` when session is null.

Do **not** test MUI itself, React Router itself, or implementation details like "this div has this class." Those tests are worse than no tests — they break when you restyle, not when you regress.

### 10.3 End-to-end tests (future)

Playwright or Cypress against the running app + backend is a natural next step, but out of scope for this foundation. RTL at the component level + the existing backend integration tests cover enough for now.

---

## 11. What we are **not** doing (yet)

- **Password reset** — Cognito supports it, we just haven't exposed endpoints. Add once the basics work.
- **Refresh token rotation in the frontend** — the backend has `/v1/auth/refresh` but the frontend doesn't call it on 401 yet. Current behavior: after ~1 hour the access token expires and the user is bounced to login. Acceptable for the foundation.
- **Styling beyond MUI defaults** — no custom theme beyond the primary color.
- **Internationalization** — all copy is English.
- **Analytics, error reporting** — no Sentry, no Google Analytics.
- **PWA / service worker** — not a PWA.
- **Server-side rendering** — this is a pure SPA. Fine for authenticated pages.

---

## 12. Implementation plan

1. Scaffold the Vite project in `web/` with `npm create vite@latest`.
2. Install MUI + React Router.
3. Add `vite.config.ts` with the `/v1` proxy.
4. Create `src/theme.ts` with a minimal theme.
5. Build `src/auth/AuthContext.tsx` and `src/auth/RequireAuth.tsx`.
6. Build `src/api/auth.ts` — a thin typed wrapper around the backend's `/v1/auth/*` endpoints.
7. Build `src/pages/LoginPage.tsx` and wire it to `AuthContext.login`.
8. Build `src/pages/RegisterPage.tsx` with signup + confirm flow.
9. Build `src/components/AppShell.tsx` and `src/pages/HomePage.tsx`.
10. Wire everything in `src/App.tsx` with the router.
11. Add Vitest + RTL. Write the three tests called out in §10.2.
12. Document the three-terminal dev loop in the top-level README.

---

## 13. Glossary

- **SPA** — Single-Page Application. One HTML page; JS swaps the content as you "navigate." React Router makes the URL feel like a real URL but no server round-trip happens.
- **Component** — a function that returns JSX.
- **JSX** — HTML-like syntax compiled to JS function calls.
- **Prop** — input to a component.
- **State** — a value that, when changed, triggers the component to re-render.
- **Hook** — a `use*` function that plugs into React's machinery (state, effects, context, etc.).
- **Context** — a way to share a value (like the current user) across a component tree without prop-drilling.
- **HMR** — Hot Module Reload. Vite swaps edited modules into a running page without losing state.
- **Bundler** — tool that turns many source files into a few optimized output files for the browser. Vite uses Rollup for production builds.
- **CSR vs SSR** — Client-Side Rendering (this project) vs Server-Side Rendering (e.g. Next.js). CSR ships an empty HTML shell and renders in the browser; SSR renders HTML on the server. CSR is simpler and fine for authenticated apps.
