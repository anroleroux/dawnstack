var authSession = null;

function authTemplate(state) {
    if (state.view === 'sent') return `
        <div class="auth-card">
            <h2>UnLog</h2>
            <div class="auth-message">Check your email for a sign-in link.</div>
        </div>
    `;

    const passwordForm = `
        <form class="auth-form" onsubmit="authWithPassword(event)">
            <div><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
            <div><label>Password</label><input type="password" name="password" required autocomplete="${state.signup ? 'new-password' : 'current-password'}"></div>
            ${state.error ? `<div class="auth-error">${state.error}</div>` : ''}
            <button class="auth-submit" type="submit">${state.signup ? 'Create account' : 'Sign in'}</button>
            <button class="auth-toggle" type="button" onclick="authMount.signup=!authMount.signup;authMount.error=null">
                ${state.signup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
        </form>
    `;

    const magicForm = `
        <form class="auth-form" onsubmit="sendMagicLink(event)">
            <div><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
            ${state.error ? `<div class="auth-error">${state.error}</div>` : ''}
            <button class="auth-submit" type="submit">Send magic link</button>
        </form>
    `;

    return `
        <div class="auth-card">
            <h2>UnLog</h2>
            <div class="auth-tabs">
                <button class="auth-tab${state.tab === 'password' ? ' auth-tab--active' : ''}" type="button"
                    onclick="authMount.tab='password';authMount.error=null">Password</button>
                <button class="auth-tab${state.tab === 'magic' ? ' auth-tab--active' : ''}" type="button"
                    onclick="authMount.tab='magic';authMount.error=null">Magic link</button>
            </div>
            ${state.tab === 'password' ? passwordForm : magicForm}
            <div class="auth-divider">or</div>
            <div class="auth-oauth">
                <button class="auth-oauth-btn" type="button" onclick="oauthSignIn('google')">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                </button>
                <button class="auth-oauth-btn" type="button" onclick="oauthSignIn('github')">
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#222" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                    Continue with GitHub
                </button>
            </div>
        </div>
    `;
}

var authMount = mount(
    document.getElementById("auth-section"),
    {tab: 'password', signup: false, error: null, view: 'form'},
    authTemplate
);

function showAuth() {
    document.getElementById('auth-section').hidden = false;
    document.getElementById('app-section').hidden = true;
}

function showApp() {
    document.getElementById('auth-section').hidden = true;
    document.getElementById('app-section').hidden = false;
    document.getElementById('sign-out-btn').hidden = false;
    scheduleRefresh(authSession.expires_at);
    loadAll();
}

function setSession(data) {
    authSession = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + data.expires_in,
    };
    localStorage.setItem('sb_session', JSON.stringify(authSession));
}

function scheduleRefresh(expiresAt) {
    const ms = (expiresAt - Math.floor(Date.now() / 1000) - 60) * 1000;
    if (ms <= 0) { refreshToken(authSession.refresh_token); return; }
    setTimeout(() => refreshToken(authSession.refresh_token), ms);
}

async function refreshToken(token, initial = false) {
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
            body: JSON.stringify({ refresh_token: token }),
        });
        if (!res.ok) throw new Error();
        setSession(await res.json());
        scheduleRefresh(authSession.expires_at);
        if (initial) showApp();
    } catch {
        authSession = null;
        localStorage.removeItem('sb_session');
        showAuth();
    }
}

function initAuth() {
    // Check for token in URL hash (OAuth / magic link callback)
    const hash = window.location.hash.slice(1);
    if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        if (access_token) {
            setSession({
                access_token,
                refresh_token: params.get('refresh_token') || '',
                expires_in:    parseInt(params.get('expires_in') || '3600', 10),
            });
            history.replaceState(null, '', window.location.pathname);
            showApp();
            return;
        }
    }

    // Check localStorage for saved session
    try {
        const saved = JSON.parse(localStorage.getItem('sb_session') || 'null');
        if (saved && saved.access_token) {
            authSession = saved;
            if (saved.expires_at - Math.floor(Date.now() / 1000) < 60) {
                refreshToken(saved.refresh_token, true);
            } else {
                showApp();
            }
            return;
        }
    } catch { /* ignore */ }

    showAuth();
}

async function authWithPassword(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email    = fd.get('email');
    const password = fd.get('password');
    const signup   = authMount.signup;
    authMount.error = null;

    try {
        const url = signup
            ? `${SUPABASE_URL}/auth/v1/signup`
            : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error_description || data.msg || 'Authentication failed');
        if (signup && !data.access_token) {
            authMount.view = 'sent';
            return;
        }
        setSession(data);
        showApp();
    } catch (err) {
        authMount.error = err.message;
    }
}

async function sendMagicLink(e) {
    e.preventDefault();
    const email = new FormData(e.target).get('email');
    authMount.error = null;

    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
            body: JSON.stringify({ email, create_user: true }),
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error_description || data.msg || 'Failed to send link');
        }
        authMount.view = 'sent';
    } catch (err) {
        authMount.error = err.message;
    }
}

function oauthSignIn(provider) {
    const redirectTo = window.location.origin + window.location.pathname;
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

async function signOut() {
    try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authSession.access_token}` },
        });
    } catch { /* best-effort */ }
    authSession = null;
    localStorage.removeItem('sb_session');
    document.getElementById('sign-out-btn').hidden = true;
    authMount.view = 'form';
    authMount.error = null;
    showAuth();
}
