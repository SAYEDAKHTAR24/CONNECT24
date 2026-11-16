"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

type Message = { id: string; user_id: string; body: string; created_at: string; profiles?: { display_name: string | null } | { display_name: string | null }[] | null };
type Workspace = { id: string; name: string };

const supabase = createClient();

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState("system");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("ipchat-theme") || "system";
    setTheme(saved);
    document.documentElement.dataset.theme = saved === "system" ? "" : saved;
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, next: Session | null) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    let active = true;
    void loadWorkspace(supabase, session.user.id).then((next) => {
      if (active) setWorkspace(next);
    });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!workspace || !supabase) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from("messages").select("id,user_id,body,created_at,profiles(display_name)").eq("workspace_id", workspace.id).order("created_at", { ascending: true }).limit(100);
      if (error) { setNotice(error.message); return; }
      if (active) setMessages((data ?? []) as Message[]);
    };
    void load();
    const channel = supabase.channel(`workspace:${workspace.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `workspace_id=eq.${workspace.id}` }, (payload) => {
        setMessages((current) => current.some((message) => message.id === payload.new.id) ? current : [...current, payload.new as Message]);
      }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [workspace]);

  const initials = useMemo(() => (session?.user.email?.slice(0, 2) || "IP").toUpperCase(), [session]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setNotice("");
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName.trim() } } });
    setBusy(false);
    if (result.error) setNotice(result.error.message);
    else if (authMode === "signup") setNotice("Check your email to verify your account before signing in.");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !workspace || !session || !body.trim()) return;
    const text = body.trim(); setBody("");
    const { error } = await supabase.from("messages").insert({ workspace_id: workspace.id, user_id: session.user.id, body: text });
    if (error) { setBody(text); setNotice(error.message); }
  }

  async function createWorkspace() {
    if (!supabase || !session) return;
    const name = window.prompt("Workspace name");
    if (!name?.trim()) return;
    const { data, error } = await supabase.from("workspaces").insert({ name: name.trim(), owner_id: session.user.id }).select("id,name").single();
    if (error) { setNotice(error.message); return; }
    const membership = await supabase.from("workspace_members").insert({ workspace_id: data.id, user_id: session.user.id, role: "owner" });
    if (membership.error) { setNotice(membership.error.message); return; }
    setWorkspace(data);
  }

  function changeTheme(next: string) {
    setTheme(next); window.localStorage.setItem("ipchat-theme", next); document.documentElement.dataset.theme = next === "system" ? "" : next;
  }

  if (!supabase) return <AuthShell notice="Add Supabase variables to .env.local or Vercel before using authentication." />;
  if (!session) return <AuthShell mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} submit={authenticate} busy={busy} notice={notice} />;

  return (
    <main className="shell">
      <div className="app-shell">
        <aside className="sidebar glass">
          <div className="brand"><span className="brand-mark">✦</span><span>IPChat</span></div>
          <div className="workspace"><span className="avatar">{initials}</span><div><strong>{workspace?.name || "Your workspace"}</strong><small>{session.user.email}</small></div></div>
          <nav className="nav"><button className="active">◈ &nbsp; Conversations</button><button>⌁ &nbsp; Activity</button><button>⚙ &nbsp; Settings</button></nav>
          <div className="sidebar-footer"><button className="secondary" onClick={createWorkspace}>{workspace ? "＋ New workspace" : "＋ Create workspace"}</button><button className="secondary" onClick={() => void supabase.auth.signOut()}>Sign out</button></div>
        </aside>
        <section className="main-panel glass">
          <header className="topbar"><div><span className="eyebrow">Workspace</span><h2 style={{ margin: "5px 0 0" }}>{workspace ? "Team lounge" : "Set up your workspace"}</h2></div><div className="topbar-actions"><select className="secondary" aria-label="Theme" value={theme} onChange={(event) => changeTheme(event.target.value)}><option value="system">System theme</option><option value="light">Light theme</option><option value="dark">Dark theme</option></select><button className="icon-button" aria-label="Profile">{initials}</button></div></header>
          {workspace ? <div className="content"><section className="chat-panel"><div className="chat-head"><div><strong># team-lounge</strong><br /><small>Private workspace conversation</small></div><span className="muted">{messages.length} messages</span></div><div className="messages">{messages.length ? messages.map((message) => <MessageBubble key={message.id} message={message} mine={message.user_id === session.user.id} />) : <div className="notice">No messages yet. Start the conversation with your team.</div>}</div><form className="composer" onSubmit={sendMessage}><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" aria-label="Message" maxLength={4000} /><button className="primary" type="submit">Send</button></form></section><aside className="side-card glass"><h3>Workspace health</h3><div className="stat"><span>Members</span><strong>1</strong></div><div className="stat"><span>Messages</span><strong>{messages.length}</strong></div><div className="stat"><span>Realtime</span><strong>Live</strong></div></aside></div> : <div className="content"><div className="notice">Create a workspace to start private, realtime conversations. Workspace membership and message access are enforced by Supabase Row Level Security.</div></div>}
          {notice && <p className="notice error" style={{ margin: "0 22px 18px" }}>{notice}</p>}
        </section>
      </div>
    </main>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
  const name = profile?.display_name || "Member";
  return <article className={`message${mine ? " mine" : ""}`}><span className="avatar">{name.slice(0, 2).toUpperCase()}</span><div className="bubble"><small>{name} · {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small><p>{message.body}</p></div></article>;
}

function AuthShell(props: { mode?: "login" | "signup"; setMode?: (mode: "login" | "signup") => void; email?: string; setEmail?: (value: string) => void; password?: string; setPassword?: (value: string) => void; displayName?: string; setDisplayName?: (value: string) => void; submit?: (event: FormEvent) => void; busy?: boolean; notice: string }) {
  const configured = Boolean(props.setMode);
  return <main className="shell auth"><section className="auth-card glass"><div className="brand"><span className="brand-mark">✦</span><span>IPChat</span></div><span className="eyebrow" style={{ display: "block", marginTop: 40 }}>Calm, connected workspaces</span><h1>{configured ? (props.mode === "login" ? "Welcome back." : "Create your space.") : "Ready when you are."}</h1><p className="muted">{configured ? "A private place for focused conversations, shared context, and your team." : "The app is configured for Vercel, but Supabase credentials are still required."}</p>{configured ? <form onSubmit={props.submit}><>{props.mode === "signup" && <div className="field"><label htmlFor="displayName">Name</label><input id="displayName" value={props.displayName} onChange={(event) => props.setDisplayName?.(event.target.value)} required maxLength={80} /></div>}<div className="field"><label htmlFor="email">Email</label><input id="email" type="email" value={props.email} onChange={(event) => props.setEmail?.(event.target.value)} required autoComplete="email" /></div><div className="field"><label htmlFor="password">Password</label><input id="password" type="password" value={props.password} onChange={(event) => props.setPassword?.(event.target.value)} required minLength={8} autoComplete={props.mode === "login" ? "current-password" : "new-password"} /></div><button className="primary" disabled={props.busy}>{props.busy ? "Please wait…" : props.mode === "login" ? "Sign in" : "Create account"}</button></></form> : <div className="notice">Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then redeploy.</div>}{props.notice && <p className="notice error">{props.notice}</p>}{configured && <button className="secondary" style={{ width: "100%", marginTop: 12 }} onClick={() => props.setMode?.(props.mode === "login" ? "signup" : "login")}>{props.mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>}</section></main>;
}

async function loadWorkspace(client: SupabaseClient, userId: string): Promise<Workspace | null> {
  const { data } = await client.from("workspace_members").select("workspace:workspaces(id,name)").eq("user_id", userId).limit(1).maybeSingle();
  const workspace = data?.workspace;
  return Array.isArray(workspace) ? workspace[0] ?? null : workspace ?? null;
}
