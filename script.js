// ==========================================
// LIFETIME LEGACY GLOBAL (LLG) - CORE ENGINE
// SYSTEM EPOCH: 2026 REBRAND
// ==========================================

// Global State & Supabase Initialization
const SUPABASE_URL = "https://clnqxwyewtzofeiyzrbk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbnF4d3lld3R6b2ZlaXl6cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTgzMzksImV4cCI6MjEwNjQ5NDMzOX0.pZa8UV-EBkI-hJmYdi4Cl406pTsC2B4WqyAyO_0f_Tg";

let supabaseClient = null;
let currentUser = null;

if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Default Fallback Data (0 LC Starting Balance)
const DEFAULT_PROFILE = {
    coins: 0,
    rank: "Unranked Initiate",
    unlockedPages: [
        { title: "Module 01: Fast-Track Freedom", url: "module_01.html" }
    ],
    avatarUrl: "https://raw.githubusercontent.com/CEOofBruh/Lifetime-Legacy-Global/refs/heads/main/LLG%20-%20Icon.ico"
};

// ==========================================
// 1. SAFE BASE64 & XSS UTILITIES
// ==========================================
const SEC_SIG_0 = "8f12c1b920042d385f86c23b207a9b0c2a8f8876b51342f1118bc27c62241d01";
const SEC_TELEMETRY_B64 = [
    "W0FSQ0hJVkFMIFVOTE9DSyAvLyBOT0RFIEFSRUhPTl8wMF0=",
    "V2FybmluZzogU3Vic3BhY2UgSGFydmVzdCBSZXNlcnZvaXIgSW50ZXJyb2dhdGVkLg==",
    "Q2lwaGVyIEtleSBIaW50OiAnMTMnIEFjdGl2ZSBWZXNzZWxzLCAnMTcnIEZlZWRpbmcgTGluZXMu"
];

function getDecodedTelemetry(index) {
    try {
        return atob(SEC_TELEMETRY_B64[index]);
    } catch (e) {
        return "";
    }
}

/**
 * Escapes unsafe HTML characters to prevent XSS attacks when embedding user data into DOM strings.
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// 2. PROFILE & LEADERBOARD FETCHING ENGINE
// ==========================================
async function fetchUserProfile(userId) {
    if (!supabaseClient || !userId) {
        const local = localStorage.getItem('llg_user_profile');
        return local ? JSON.parse(local) : DEFAULT_PROFILE;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error || !data) {
            console.warn("Profile record missing or restricted, returning default profile...");
            return DEFAULT_PROFILE;
        }

        return {
            coins: data.coins ?? DEFAULT_PROFILE.coins,
            rank: data.rank ?? DEFAULT_PROFILE.rank,
            unlockedPages: data.unlocked_pages ?? DEFAULT_PROFILE.unlockedPages,
            avatarUrl: data.avatar_url ?? DEFAULT_PROFILE.avatarUrl,
            displayName: data.display_name || null
        };
    } catch (e) {
        console.error("Error fetching profile:", e);
        return DEFAULT_PROFILE;
    }
}

async function saveUserProfile(userId, profileData) {
    localStorage.setItem('llg_user_profile', JSON.stringify(profileData));

    if (!supabaseClient || !userId) return;

    try {
        await supabaseClient.from('profiles').upsert({
            id: userId,
            coins: profileData.coins,
            rank: profileData.rank,
            unlocked_pages: profileData.unlockedPages,
            avatar_url: profileData.avatarUrl,
            display_name: profileData.displayName,
            updated_at: new Date()
        });
    } catch (e) {
        console.error("Error saving profile:", e);
    }
}

async function fetchLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    if (!leaderboardBody) return;

    if (!supabaseClient) {
        leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Offline Mode Active</td></tr>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('rank, coins, avatar_url, display_name, email')
            .order('coins', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!data || data.length === 0) {
            leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No active associate records found</td></tr>`;
            return;
        }

        leaderboardBody.innerHTML = '';
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            const rowName = escapeHTML(row.display_name || (row.email ? row.email.split('@')[0] : 'Associate'));
            const rowRank = escapeHTML(row.rank || 'Unranked Initiate');
            const rawAvatar = row.avatar_url || DEFAULT_PROFILE.avatarUrl;
            const safeAvatar = escapeHTML(rawAvatar.startsWith('data:image/') || rawAvatar.startsWith('http') ? rawAvatar : DEFAULT_PROFILE.avatarUrl);
            
            tr.innerHTML = `
                <td style="padding: 0.8rem;">#${index + 1}</td>
                <td style="padding: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${safeAvatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                    <span>${rowName}</span>
                </td>
                <td style="padding: 0.8rem; color: var(--text-muted);">${rowRank}</td>
                <td style="padding: 0.8rem; color: var(--gold); font-weight: bold;">${Number(row.coins ?? 0)} LC</td>
            `;
            leaderboardBody.appendChild(tr);
        });
    } catch (e) {
        console.error("Leaderboard error:", e);
        leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Leaderboard sync paused</td></tr>`;
    }
}

function renderUnlockedArchives(unlockedList) {
    const archiveContainer = document.getElementById('unlockedArchiveList');
    if (!archiveContainer) return;

    archiveContainer.innerHTML = '';
    unlockedList.forEach(item => {
        const li = document.createElement('div');
        li.style.marginBottom = "0.6rem";
        const safeTitle = escapeHTML(item.title);
        const safeUrl = escapeHTML(item.url);
        li.innerHTML = `<a href="${safeUrl}" class="gold-text" style="text-decoration: none; font-weight: bold; font-size: 0.9rem;">🔓 ${safeTitle}</a>`;
        archiveContainer.appendChild(li);
    });
}

function updateAvatarUI(avatarUrl) {
    const avatarImage = document.getElementById('avatarImage');
    const avatarFallback = document.getElementById('avatarFallback');

    if (avatarImage && avatarUrl) {
        avatarImage.src = avatarUrl;
        avatarImage.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
    }
}

// Check Masterclass Redemption and toggle ribbon
function checkMasterclassRedemption(unlockedPages) {
    const badge = document.getElementById('voucherRedeemedBadge');
    if (!badge || !unlockedPages) return;

    const isRedeemed = unlockedPages.some(page => {
        const title = (page.title || "").toLowerCase();
        const url = (page.url || "").toLowerCase();

        return (
            title.includes('masterclass') || 
            title.includes('matrix') || 
            title.includes('module 01') ||
            title.includes('fast-track') ||
            url.includes('module_01.html') ||
            url.includes('workshops.html')
        );
    });

    if (isRedeemed) {
        badge.style.display = 'block';
    }
}

// ==========================================
// 3. AUTH ROUTING & DOM INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const rawPage = window.location.pathname.split('/').pop().toLowerCase();
    const currentPage = rawPage === '' ? 'index.html' : rawPage;
    const isPublicPage = currentPage === 'index.html' || currentPage === 'login.html' || currentPage === 'signup.html';

    // Verify Auth Session
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session ? session.user : null;

        if (currentUser && isPublicPage) {
            window.location.href = 'dashboard.html';
            return;
        }

        if (!currentUser && !isPublicPage) {
            window.location.href = 'index.html';
            return;
        }

        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentUser = session ? session.user : null;
            if (!currentUser && !isPublicPage) {
                window.location.href = 'index.html';
            }
        });
    }

    // Attach Login Listener (index.html)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            const feedback = document.getElementById('loginFeedback') || document.getElementById('loginStatus');

            if (!emailInput || !passwordInput) return;

            if (feedback) {
                feedback.style.color = "var(--text-muted)";
                feedback.textContent = "Authenticating associate credentials...";
            }

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                });

                if (error) throw error;

                if (feedback) {
                    feedback.style.color = "var(--gold)";
                    feedback.textContent = "Authentication successful! Entering dashboard...";
                }

                currentUser = data.user;
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);

            } catch (err) {
                console.error("Login Error:", err);
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = err.message || "Invalid credentials. Check email and password.";
                }
            }
        });
    }

    // Attach Signup Listener (signup.html) with Strict Client-Side Input Validation
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayNameInput = document.getElementById('signupDisplayName');
            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');
            const feedback = document.getElementById('signupStatus') || document.getElementById('signupFeedback');

            if (!emailInput || !passwordInput) return;

            const displayName = displayNameInput ? displayNameInput.value.trim() : "";
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Client-
