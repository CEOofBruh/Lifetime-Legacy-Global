// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://clnqxwyewtzofeiyzrbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbnF4d3lld3R6b2ZlaXl6cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU2NzYwNDAsImV4cCI6MjAxMTI1MjA0MH0.82C3XW9q4J2XoH_R5K8Z6pX8x4Y6z5w2v1u0t9s8r7q';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ==========================================
// 2. STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
const DEFAULT_USER_DATA = {
    coins: 0,
    rank: "Bronze Initiate",
    unlockedPages: []
};

function getUserData() {
    const saved = localStorage.getItem('llg_user_data');
    return saved ? JSON.parse(saved) : { ...DEFAULT_USER_DATA };
}

function saveUserData(data) {
    localStorage.setItem('llg_user_data', JSON.stringify(data));
}

// ==========================================
// 3. PUZZLE / OVERRIDE CODES DATABASE
// ==========================================
const PUZZLE_CODES = {
    "LEGACY_INITIATE_2026": {
        rewardCoins: 50,
        newRank: "Silver Visionary",
        unlockedTitle: "Archive 01: Directive Memorandum",
        unlockedUrl: "archive_01.html"
    }
};

// ==========================================
// 4. DOM INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // Check Active Session for Dashboard Protection
    let sessionUser = null;
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        sessionUser = session ? session.user : null;
    }

    const currentPage = window.location.pathname.split('/').pop();

    // Protect Dashboard Page
    if (currentPage === 'dashboard.html' && !sessionUser && !localStorage.getItem('llg_bypass_auth')) {
        // Redirect to login if unauthenticated (allows local demo via fallback)
        if (supabase) {
            window.location.href = 'index.html';
            return;
        }
    }

    // --- A. LOGIN FORM HANDLER (index.html) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const msgBox = document.getElementById('loginMessage');

            msgBox.style.color = 'var(--text-muted)';
            msgBox.textContent = 'Authenticating with network...';

            if (supabase) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    msgBox.style.color = 'var(--accent-red)';
                    msgBox.textContent = error.message;
                } else {
                    msgBox.style.color = 'var(--accent-emerald)';
                    msgBox.textContent = 'Authentication successful. Accessing portal...';
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
                }
            } else {
                // Fallback demo mode if Supabase fails to load
                localStorage.setItem('llg_bypass_auth', email);
                window.location.href = 'dashboard.html';
            }
        });
    }

    // --- B. SIGNUP FORM HANDLER (signup.html) ---
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const msgBox = document.getElementById('signupMessage');

            msgBox.style.color = 'var(--text-muted)';
            msgBox.textContent = 'Initializing associate profile...';

            if (supabase) {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) {
                    msgBox.style.color = 'var(--accent-red)';
                    msgBox.textContent = error.message;
                } else {
                    msgBox.style.color = 'var(--accent-emerald)';
                    msgBox.textContent = 'Registration submitted. Check your email to confirm activation.';
                }
            } else {
                msgBox.style.color = 'var(--accent-emerald)';
                msgBox.textContent = 'Demo Mode: Registration simulated. You may login now.';
            }
        });
    }

    // --- C. DASHBOARD HANDLER (dashboard.html) ---
    if (document.getElementById('coinBalance')) {
        updateDashboardUI(sessionUser);

        // System Verification Terminal Form Submissions
        const quizForm = document.getElementById('quizForm');
        if (quizForm) {
            quizForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('answerInput');
                const feedback = document.getElementById('quizFeedback');
                const codeKey = input.value.trim().toUpperCase();

                if (PUZZLE_CODES[codeKey]) {
                    const reward = PUZZLE_CODES[codeKey];
                    let userData = getUserData();

                    // Check if code was already redeemed
                    const alreadyUnlocked = userData.unlockedPages.some(p => p.url === reward.unlockedUrl);

                    if (alreadyUnlocked) {
                        feedback.style.color = 'var(--accent-gold)';
                        feedback.textContent = 'Verification Key already authenticated in ledger.';
                    } else {
                        // Grant Rewards
                        userData.coins += reward.rewardCoins;
                        userData.rank = reward.newRank;
                        userData.unlockedPages.push({
                            title: reward.unlockedTitle,
                            url: reward.unlockedUrl
                        });

                        saveUserData(userData);
                        updateDashboardUI(sessionUser);

                        feedback.style.color = 'var(--accent-emerald)';
                        feedback.textContent = `Key Verified. Awarded ${reward.rewardCoins} LC. Rank updated to ${reward.newRank}.`;
                        input.value = '';
                    }
                } else {
                    feedback.style.color = 'var(--accent-red)';
                    feedback.textContent = 'Invalid Verification Key. Security Incident Logged.';
                }
            });
        }

        // Logout Handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (supabase) {
                    await supabase.auth.signOut();
                }
                localStorage.removeItem('llg_bypass_auth');
                window.location.href = 'index.html';
            });
        }
    }
});

// ==========================================
// 5. DASHBOARD UI RENDERER
// ==========================================
function updateDashboardUI(user) {
    const userData = getUserData();
    const userEmail = user ? user.email : (localStorage.getItem('llg_bypass_auth') || 'associate@legacy.com');
    const username = userEmail.split('@')[0];

    // Profile & Header
    const navUser = document.getElementById('navUser');
    const profileName = document.getElementById('profileName');
    const profileRank = document.getElementById('profileRank');
    const coinBalance = document.getElementById('coinBalance');
    const lbUserName = document.getElementById('lbUserName');
    const lbUserRank = document.getElementById('lbUserRank');
    const lbUserCoins = document.getElementById('lbUserCoins');

    if (navUser) navUser.textContent = userEmail;
    if (profileName) profileName.textContent = username;
    if (profileRank) profileRank.textContent = userData.rank;
    if (coinBalance) coinBalance.textContent = userData.coins;
    
    if (lbUserName) lbUserName.textContent = username;
    if (lbUserRank) lbUserRank.textContent = userData.rank;
    if (lbUserCoins) lbUserCoins.textContent = userData.coins;

    // Unlocked Links Container
    const unlockedContainer = document.getElementById('unlockedLinks');
    if (unlockedContainer) {
        if (userData.unlockedPages.length === 0) {
            unlockedContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No restricted archives unlocked yet.</p>`;
        } else {
            unlockedContainer.innerHTML = userData.unlockedPages.map(page => 
                `<a href="${page.url}" class="unlocked-link" target="_blank">🔓 ${page.title}</a>`
            ).join('');
        }
    }

    // Dynamic Module Status Updates based on progress
    const cardM2 = document.getElementById('card-m2');
    const badgeM2 = document.getElementById('badge-m2');
    if (cardM2 && badgeM2 && userData.coins >= 100) {
        badgeM2.className = 'badge status-unlocked';
        badgeM2.textContent = 'ACCESSIBLE';
    }
}
