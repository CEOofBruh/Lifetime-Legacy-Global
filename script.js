// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://clnqxwyewtzofeiyzrbk.supabase.co';

// Legacy JWT Anon Key format ensures headers are included on all SDK versions
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbnF4d3lld3R6b2ZlaXl6cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU2NzYwNDAsImV4cCI6MjAxMTI1MjA0MH0.82C3XW9q4J2XoH_R5K8Z6pX8x4Y6z5w2v1u0t9s8r7q';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
}) : null;

// ==========================================
// 2. STATE MANAGEMENT (SUPABASE + LOCALSTORAGE)
// ==========================================
const DEFAULT_USER_DATA = {
    coins: 0,
    rank: "Bronze Initiate",
    unlockedPages: []
};

// Fetch user profile from Supabase Database (or fallback to localStorage)
async function fetchUserProfile(userId) {
    if (!supabaseClient || !userId) {
        return getLocalUserData();
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('coins, rank, unlocked_pages')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.warn("Could not fetch profile from Supabase, loading local state:", error);
            return getLocalUserData();
        }

        const formattedData = {
            coins: data.coins || 0,
            rank: data.rank || "Bronze Initiate",
            unlockedPages: data.unlocked_pages || []
        };

        // Cache locally for offline/fast access
        saveLocalUserData(formattedData);
        return formattedData;
    } catch (e) {
        return getLocalUserData();
    }
}

// Save/Update user profile in Supabase Database and localStorage
async function saveUserProfile(userId, data) {
    saveLocalUserData(data);

    if (supabaseClient && userId) {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({
                    coins: data.coins,
                    rank: data.rank,
                    unlocked_pages: data.unlockedPages,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) console.error("Error updating cloud profile:", error);
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }
}

function getLocalUserData() {
    const saved = localStorage.getItem('llg_user_data');
    return saved ? JSON.parse(saved) : { ...DEFAULT_USER_DATA };
}

function saveLocalUserData(data) {
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
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        sessionUser = session ? session.user : null;
    }

    const currentPage = window.location.pathname.split('/').pop();

    // Protect Dashboard Page
    if (currentPage === 'dashboard.html' && !sessionUser && !localStorage.getItem('llg_bypass_auth')) {
        if (supabaseClient) {
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

            if (supabaseClient) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    msgBox.style.color = 'var(--accent-red)';
                    msgBox.textContent = error.message;
                } else {
                    msgBox.style.color = 'var(--accent-emerald)';
                    msgBox.textContent = 'Authentication successful. Accessing portal...';
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
                }
            } else {
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

            if (supabaseClient) {
                const { data, error } = await supabaseClient.auth.signUp({ email, password });
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
        const userId = sessionUser ? sessionUser.id : null;
        
        // Load persistent profile from cloud
        let userData = await fetchUserProfile(userId);
        updateDashboardUI(sessionUser, userData);

        // System Verification Terminal Form Submissions
        const quizForm = document.getElementById('quizForm');
        if (quizForm) {
            quizForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = document.getElementById('answerInput');
                const feedback = document.getElementById('quizFeedback');
                const codeKey = input.value.trim().toUpperCase();

                if (PUZZLE_CODES[codeKey]) {
                    const reward = PUZZLE_CODES[codeKey];
                    
                    // Reload latest profile before updating
                    userData = await fetchUserProfile(userId);

                    const alreadyUnlocked = userData.unlockedPages.some(p => p.url === reward.unlockedUrl);

                    if (alreadyUnlocked) {
                        feedback.style.color = 'var(--accent-gold)';
                        feedback.textContent = 'Verification Key already authenticated in ledger.';
                    } else {
                        userData.coins += reward.rewardCoins;
                        userData.rank = reward.newRank;
                        userData.unlockedPages.push({
                            title: reward.unlockedTitle,
                            url: reward.unlockedUrl
                        });

                        // Save directly to cloud DB
                        await saveUserProfile(userId, userData);
                        updateDashboardUI(sessionUser, userData);

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
                if (supabaseClient) {
                    await supabaseClient.auth.signOut();
                }
                localStorage.removeItem('llg_bypass_auth');
                localStorage.removeItem('llg_user_data');
                window.location.href = 'index.html';
            });
        }
    }
});

// ==========================================
// 5. DASHBOARD UI RENDERER
// ==========================================
function updateDashboardUI(user, userData) {
    const userEmail = user ? user.email : (localStorage.getItem('llg_bypass_auth') || 'associate@legacy.com');
    const username = userEmail.split('@')[0];

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

    const unlockedContainer = document.getElementById('unlockedLinks');
    if (unlockedContainer) {
        if (!userData.unlockedPages || userData.unlockedPages.length === 0) {
            unlockedContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No restricted archives unlocked yet.</p>`;
        } else {
            unlockedContainer.innerHTML = userData.unlockedPages.map(page => 
                `<a href="${page.url}" class="unlocked-link" target="_blank">🔓 ${page.title}</a>`
            ).join('');
        }
    }

    const cardM2 = document.getElementById('card-m2');
    const badgeM2 = document.getElementById('badge-m2');
    if (cardM2 && badgeM2 && userData.coins >= 100) {
        badgeM2.className = 'badge status-unlocked';
        badgeM2.textContent = 'ACCESSIBLE';
    }
}
