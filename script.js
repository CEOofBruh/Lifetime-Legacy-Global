// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://clnqxwyewtzofeiyzrbk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbnF4d3lld3R6b2ZlaXl6cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTgzMzksImV4cCI6MjEwNjQ5NDMzOX0.pZa8UV-EBkI-hJmYdi4Cl406pTsC2B4WqyAyO_0f_Tg";

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ==========================================
// 2. UNIVERSAL AUTHENTICATION ROUTE GUARD
// ==========================================
async function enforceRouteSecurity() {
    if (!supabaseClient) return null;

    const currentPath = window.location.pathname;
    
    // Public pages that do NOT require authentication
    const isPublicPage = currentPath.endsWith('index.html') || 
                         currentPath.endsWith('signup.html') || 
                         currentPath === '/' || 
                         currentPath === '';

    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUser = session ? session.user : null;

    if (!session && !isPublicPage) {
        // Unauthenticated user attempting to access any restricted page -> bounce to login
        window.location.href = 'index.html';
        return null;
    } else if (session && isPublicPage) {
        // Authenticated user visiting landing/signup -> send to dashboard
        window.location.href = 'dashboard.html';
        return currentUser;
    }

    return currentUser;
}

// ==========================================
// 3. LOCAL STORAGE & STATUS HELPERS
// ==========================================
function getLocalUserData() {
    const local = localStorage.getItem('user_profile_data');
    if (!local) return { coins: 0, rank: "Bronze Initiate", unlockedPages: [], avatarUrl: null };
    try {
        return JSON.parse(local);
    } catch (e) {
        return { coins: 0, rank: "Bronze Initiate", unlockedPages: [], avatarUrl: null };
    }
}

function saveLocalUserData(data) {
    const current = getLocalUserData();
    const updated = { ...current, ...data };
    localStorage.setItem('user_profile_data', JSON.stringify(updated));
}

function setStatusMessage(elementId, text, color) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = text;
        if (color) el.style.color = color;
    }
}

// ==========================================
// 4. SUPABASE PROFILE & LEADERBOARD API
// ==========================================
async function fetchUserProfile(userId) {
    if (!supabaseClient || !userId) {
        return getLocalUserData();
    }

    try {
        let { data, error } = await supabaseClient
            .from('profiles')
            .select('coins, rank, unlocked_pages, avatar_url')
            .eq('id', userId)
            .maybeSingle();

        if (!data) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            const newProfile = {
                id: userId,
                email: user ? user.email : '',
                coins: 0,
                rank: "Bronze Initiate",
                unlocked_pages: [],
                avatar_url: null
            };

            await supabaseClient.from('profiles').upsert(newProfile);

            return {
                coins: 0,
                rank: "Bronze Initiate",
                unlockedPages: [],
                avatarUrl: null
            };
        }

        const formattedData = {
            coins: data.coins || 0,
            rank: data.rank || "Bronze Initiate",
            unlockedPages: data.unlocked_pages || [],
            avatarUrl: data.avatar_url || null
        };

        saveLocalUserData(formattedData);
        return formattedData;
    } catch (e) {
        console.error("Fetch profile failed:", e);
        return getLocalUserData();
    }
}

async function saveUserProfile(userId, data) {
    saveLocalUserData(data);

    if (supabaseClient && userId) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();

            const payload = {
                id: userId,
                email: user ? user.email : '',
                coins: data.coins,
                rank: data.rank,
                unlocked_pages: data.unlockedPages,
                updated_at: new Date().toISOString()
            };

            if (data.avatarUrl !== undefined) {
                payload.avatar_url = data.avatarUrl;
            }

            await supabaseClient
                .from('profiles')
                .upsert(payload);
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }
}

async function fetchLeaderboard() {
    const leaderboardTable = document.getElementById('leaderboardTable');
    if (!leaderboardTable || !supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('email, rank, coins')
            .order('coins', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            leaderboardTable.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; color: var(--text-muted);">
                        No associate standings recorded yet.
                    </td>
                </tr>`;
            return;
        }

        leaderboardTable.innerHTML = data.map((item, index) => {
            const username = item.email ? item.email.split('@')[0] : `Associate #${index + 1}`;
            return `
                <tr>
                    <td style="font-family: var(--font-mono); color: var(--gold);">#${index + 1}</td>
                    <td style="font-weight: 600;">${username}</td>
                    <td><span class="hero-tag" style="margin:0; padding:0.1rem 0.5rem; font-size:0.65rem;">${item.rank || 'Bronze Initiate'}</span></td>
                    <td style="font-family: var(--font-mono); font-weight: bold;">${item.coins || 0} LC</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error("Failed to load leaderboard:", e);
        leaderboardTable.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color: var(--accent-red);">
                    Failed to sync leaderboard with network.
                </td>
            </tr>`;
    }
}

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!supabaseClient) {
        return alert("Cloud database connection unavailable.");
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return alert("Session expired. Please log in again.");
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    try {
        let { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        const avatarUrl = publicUrlData.publicUrl + '?t=' + new Date().getTime();

        await supabaseClient
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', user.id);

        saveLocalUserData({ avatarUrl: avatarUrl });
        renderAvatar(avatarUrl);
        alert("Avatar updated successfully!");
    } catch (error) {
        console.error("Error uploading avatar:", error);
        alert("Failed to upload avatar: " + error.message);
    }
}

function renderAvatar(url) {
    const avatarImg = document.getElementById('avatarImage');
    const avatarFallback = document.getElementById('avatarFallback');

    if (!avatarImg) return;

    if (url) {
        avatarImg.src = url;
        avatarImg.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        if (avatarFallback) avatarFallback.style.display = 'inline';
    }
}

function renderUnlockedArchives(unlockedPages) {
    const container = document.getElementById('unlockedLinks');
    if (!container) return;

    if (!unlockedPages || unlockedPages.length === 0) {
        container.innerHTML = `
            <p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                No bonus resources unlocked yet. Enter promo codes on the portal to access premium training.
            </p>`;
        return;
    }

    container.innerHTML = unlockedPages.map(page => `
        <a href="${page.url}" class="unlocked-link" target="_blank" style="display:block; color:var(--gold); margin-bottom:0.4rem; text-decoration:none;">
            🔓 ${page.title}
        </a>
    `).join('');
}

// ==========================================
// 5. MAIN PIPELINE LOGIC & DOM HANDLERS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // RUN AUTOMATIC ROUTE GUARD FOR ALL PAGES
    const currentUser = await enforceRouteSecurity();

    // Avatar File Input Listener
    const avatarInput = document.getElementById('avatarInput') || document.getElementById('avatarFileInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', uploadAvatar);
    }

    // --- SIGNUP FORM HANDLER (signup.html) ---
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');

            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            setStatusMessage('signupStatus', 'Registering associate identity...', 'var(--text-muted)');

            if (!supabaseClient) {
                setStatusMessage('signupStatus', 'Error: Supabase client not loaded.', 'var(--accent-red)');
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({ email, password });

            if (error) {
                setStatusMessage('signupStatus', error.message, 'var(--accent-red)');
            } else {
                setStatusMessage('signupStatus', 'Registration successful! Redirecting to login portal...', 'var(--gold)');
                setTimeout(() => { 
                    window.location.href = 'index.html'; 
                }, 1500);
            }
        });
    }

    // --- LOGIN FORM HANDLER (index.html) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');

            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            setStatusMessage('loginStatus', 'Authenticating clearance...', 'var(--text-muted)');

            if (!supabaseClient) {
                setStatusMessage('loginStatus', 'Error: Supabase client not loaded.', 'var(--accent-red)');
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                setStatusMessage('loginStatus', error.message, 'var(--accent-red)');
            } else {
                setStatusMessage('loginStatus', 'Access granted. Opening Associate Portal...', 'var(--gold)');
                setTimeout(() => { 
                    window.location.href = 'dashboard.html'; 
                }, 1000);
            }
        });
    }

    // --- DASHBOARD HYDRATION (dashboard.html) ---
    if (document.getElementById('coinBalance')) {
        const userId = currentUser ? currentUser.id : null;

        if (currentUser) {
            const userHandle = currentUser.email ? currentUser.email.split('@')[0] : 'Associate';
            const navUser = document.getElementById('navUser');
            const profileName = document.getElementById('profileName');

            if (navUser) navUser.textContent = currentUser.email;
            if (profileName) profileName.textContent = userHandle;
        }

        const profile = await fetchUserProfile(userId);

        const coinBalance = document.getElementById('coinBalance');
        const profileRank = document.getElementById('profileRank');

        if (coinBalance) coinBalance.textContent = profile.coins;
        if (profileRank) profileRank.textContent = profile.rank;

        renderAvatar(profile.avatarUrl);
        renderUnlockedArchives(profile.unlockedPages);
        fetchLeaderboard();
    }

    // --- PROMO CODE / VOUCHER SUBMISSION (SUPABASE DIRECT VERIFICATION) ---
    const quizForm = document.getElementById('quizForm');
    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputField = document.getElementById('answerInput');
            const feedback = document.getElementById('quizFeedback');
            if (!inputField || !feedback) return;

            const userInput = inputField.value.trim().toUpperCase();
            setStatusMessage('quizFeedback', 'Verifying promo voucher with billing network...', 'var(--text-muted)');

            if (!supabaseClient) {
                setStatusMessage('quizFeedback', 'Error: Cloud database client unavailable.', 'var(--accent-red)');
                return;
            }

            try {
                // Query Supabase puzzle_codes table
                const { data: puzzleData, error } = await supabaseClient
                    .from('puzzle_codes')
                    .select('*')
                    .eq('code', userInput)
                    .maybeSingle();

                if (error) throw error;

                if (puzzleData) {
                    const userId = currentUser ? currentUser.id : null;
                    const currentProfile = await fetchUserProfile(userId);

                    // Check if already unlocked
                    const alreadyUnlocked = currentProfile.unlockedPages.some(
                        p => p.url === puzzleData.unlocked_url
                    );

                    if (alreadyUnlocked) {
                        feedback.style.color = "var(--gold)";
                        feedback.textContent = "Voucher Notice: Promotion already claimed on this associate account.";
                        return;
                    }

                    // Update profile stats
                    const updatedCoins = currentProfile.coins + puzzleData.reward_coins;
                    const updatedRank = puzzleData.new_rank || currentProfile.rank;
                    const updatedUnlocked = [
                        ...currentProfile.unlockedPages,
                        { title: puzzleData.unlocked_title, url: puzzleData.unlocked_url }
                    ];

                    const updatedProfile = {
                        coins: updatedCoins,
                        rank: updatedRank,
                        unlockedPages: updatedUnlocked,
                        avatarUrl: currentProfile.avatarUrl
                    };

                    // Persist to Supabase profiles
                    await saveUserProfile(userId, updatedProfile);

                    // Update UI elements
                    const coinBalance = document.getElementById('coinBalance');
                    const profileRank = document.getElementById('profileRank');

                    if (coinBalance) coinBalance.textContent = updatedCoins;
                    if (profileRank) profileRank.textContent = updatedRank;

                    renderUnlockedArchives(updatedUnlocked);
                    fetchLeaderboard();

                    feedback.style.color = "var(--gold)";
                    feedback.textContent = `Voucher Approved! Awarded ${puzzleData.reward_coins} LC. Associate tier updated to ${updatedRank}.`;
                    inputField.value = "";
                } else {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = "Invalid Code: Promo voucher not recognized or expired.";
                }
            } catch (err) {
                console.error("Promo submission error:", err);
                feedback.style.color = "var(--accent-red)";
                feedback.textContent = "System error during voucher verification.";
            }
        });
    }

    // --- LOGOUT / DISCONNECT HANDLER ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});
