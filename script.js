// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://clnqxwyewtzofeiyzrbk.supabase.co";
// Replace this string with your exact fresh anon public key from Project Settings -> API
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbnF4d3lld3R6b2ZlaXl6cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTgzMzksImV4cCI6MjEwNjQ5NDMzOX0.pZa8UV-EBkI-hJmYdi4Cl406pTsC2B4WqyAyO_0f_Tg";

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ==========================================
// 2. LOCAL STORAGE HELPERS
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

// ==========================================
// 3. PUZZLE / OVERRIDE CODES DATABASE
// ==========================================
const PUZZLE_CODES = {
    // Decoded string target
    "LEGACY_INITIATE_2026": {
        rewardCoins: 50,
        newRank: "Silver Visionary",
        unlockedTitle: "Archive 01: Directive Memorandum",
        unlockedUrl: "archive_01.html"
    },
    // Raw Base64 string fallback
    "TEVHQUNZX01OSVRJQVRFXzIwMjY=": {
        rewardCoins: 50,
        newRank: "Silver Visionary",
        unlockedTitle: "Archive 01: Directive Memorandum",
        unlockedUrl: "archive_01.html"
    }
};

// ==========================================
// 4. SUPABASE PROFILE & LEADERBOARD API
// ==========================================

// Fetch profile data from database
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

        // If row doesn't exist yet, construct and insert default row
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

// Save profile updates to Cloud DB and Local Storage
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

// Fetch global leaderboard standings
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
                    <td style="font-family: var(--font-mono); color: var(--accent-gold);">#${index + 1}</td>
                    <td style="font-weight: 600;">${username}</td>
                    <td><span class="badge status-unlocked">${item.rank || 'Bronze Initiate'}</span></td>
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

// Upload Avatar to Supabase Storage Bucket
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
        // Upload image file to 'avatars' storage bucket
        let { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Obtain public accessible URL
        const { data: publicUrlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Add timestamp parameter to clear browser image cache
        const avatarUrl = publicUrlData.publicUrl + '?t=' + new Date().getTime();

        // Update database record
        await supabaseClient
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', user.id);

        // Update local storage
        saveLocalUserData({ avatarUrl: avatarUrl });

        // Update UI
        renderAvatar(avatarUrl);
        alert("Avatar updated successfully!");
    } catch (error) {
        console.error("Error uploading avatar:", error);
        alert("Failed to upload avatar: " + error.message);
    }
}

// Render Avatar Image Helper
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

// Render Unlocked Archives Links Helper
function renderUnlockedArchives(unlockedPages) {
    const container = document.getElementById('unlockedLinks');
    if (!container) return;

    if (!unlockedPages || unlockedPages.length === 0) {
        container.innerHTML = `
            <p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                No restricted archives unlocked yet.
            </p>`;
        return;
    }

    container.innerHTML = unlockedPages.map(page => `
        <a href="${page.url}" class="unlocked-link" target="_blank">
            🔓 ${page.title}
        </a>
    `).join('');
}

// ==========================================
// 5. EVENT LISTENERS & INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;

    // Session Management via Supabase
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
        } else if (window.location.pathname.includes('dashboard.html')) {
            // Redirect if trying to view dashboard without active session
            window.location.href = 'index.html';
            return;
        }
    }

    // Sign Up Form Handler (signup.html)
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const statusMsg = document.getElementById('signupStatus');

            statusMsg.style.color = 'var(--text-muted)';
            statusMsg.textContent = 'Registering associate identity...';

            if (!supabaseClient) {
                statusMsg.style.color = 'var(--accent-red)';
                statusMsg.textContent = 'Error: Supabase client not loaded.';
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (error) {
                statusMsg.style.color = 'var(--accent-red)';
                statusMsg.textContent = error.message;
            } else {
                statusMsg.style.color = 'var(--accent-emerald)';
                statusMsg.textContent = 'Registration successful! Redirecting to login...';
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        });
    }

    // Login Form Handler (index.html)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const statusMsg = document.getElementById('loginStatus');

            statusMsg.style.color = 'var(--text-muted)';
            statusMsg.textContent = 'Authenticating clearance...';

            if (!supabaseClient) {
                statusMsg.style.color = 'var(--accent-red)';
                statusMsg.textContent = 'Error: Supabase client not loaded.';
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                statusMsg.style.color = 'var(--accent-red)';
                statusMsg.textContent = error.message;
            } else {
                statusMsg.style.color = 'var(--accent-emerald)';
                statusMsg.textContent = 'Access granted. Opening portal...';
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }
        });
    }

    // Initialize Dashboard UI if on dashboard.html
    if (document.getElementById('coinBalance')) {
        const userId = currentUser ? currentUser.id : null;
        
        if (currentUser) {
            const userHandle = currentUser.email ? currentUser.email.split('@')[0] : 'Associate';
            document.getElementById('navUser').textContent = currentUser.email;
            document.getElementById('profileName').textContent = userHandle;
        }

        // Fetch User Profile Data
        const profile = await fetchUserProfile(userId);

        // Update DOM elements
        document.getElementById('coinBalance').textContent = profile.coins;
        document.getElementById('profileRank').textContent = profile.rank;
        
        // Render Avatar & Unlocked Archives
        renderAvatar(profile.avatarUrl);
        renderUnlockedArchives(profile.unlockedPages);

        // Fetch Leaderboard
        fetchLeaderboard();
    }

    // Terminal / Puzzle Submit Form Handling
    const quizForm = document.getElementById('quizForm');
    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputField = document.getElementById('answerInput');
            const feedback = document.getElementById('quizFeedback');
            const userKey = inputField.value.trim().toUpperCase();

            // Find matching puzzle rule
            const matchedKey = Object.keys(PUZZLE_CODES).find(
                key => key.toUpperCase() === userKey
            );

            if (matchedKey) {
                const puzzleData = PUZZLE_CODES[matchedKey];
                const userId = currentUser ? currentUser.id : null;
                const currentProfile = await fetchUserProfile(userId);

                // Check if key/archive has already been claimed
                const alreadyUnlocked = currentProfile.unlockedPages.some(
                    p => p.url === puzzleData.unlockedUrl
                );

                if (alreadyUnlocked) {
                    feedback.style.color = "var(--accent-gold)";
                    feedback.textContent = "Key recognized: Override already authorized for this account.";
                    return;
                }

                // Award points & unlock page
                const updatedCoins = currentProfile.coins + puzzleData.rewardCoins;
                const updatedRank = puzzleData.newRank || currentProfile.rank;
                const updatedUnlocked = [
                    ...currentProfile.unlockedPages,
                    { title: puzzleData.unlockedTitle, url: puzzleData.unlockedUrl }
                ];

                const updatedProfile = {
                    coins: updatedCoins,
                    rank: updatedRank,
                    unlockedPages: updatedUnlocked,
                    avatarUrl: currentProfile.avatarUrl
                };

                // Save to Cloud & Local Storage
                await saveUserProfile(userId, updatedProfile);

                // Update UI state
                document.getElementById('coinBalance').textContent = updatedCoins;
                document.getElementById('profileRank').textContent = updatedRank;
                renderUnlockedArchives(updatedUnlocked);

                // Re-fetch global leaderboard
                fetchLeaderboard();

                feedback.style.color = "var(--accent-emerald)";
                feedback.textContent = `Key Verified. Awarded ${puzzleData.rewardCoins} LC. Rank updated to ${updatedRank}.`;
                inputField.value = "";
            } else {
                feedback.style.color = "var(--accent-red)";
                feedback.textContent = "Access Denied: Invalid authorization key or cipher.";
            }
        });
    }

    // Logout Handler
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Script loaded and DOM ready.");

    // Sign Up Form Handler (signup.html)
    const signupForm = document.getElementById('signupForm');
    
    if (signupForm) {
        console.log("Signup form found! Attaching submit listener.");

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Signup submit event triggered!");

            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');
            const statusMsg = document.getElementById('signupStatus');

            if (!emailInput || !passwordInput) {
                console.error("Email or Password input fields missing from HTML!");
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (statusMsg) {
                statusMsg.style.color = 'var(--text-muted)';
                statusMsg.textContent = 'Registering associate identity...';
            }

            if (!supabaseClient) {
                console.error("Supabase client is null or failed to initialize!");
                if (statusMsg) {
                    statusMsg.style.color = 'var(--accent-red)';
                    statusMsg.textContent = 'Error: Supabase client not initialized.';
                }
                return;
            }

            console.log("Attempting Supabase signUp for:", email);

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (error) {
                console.error("Supabase Signup Error:", error);
                if (statusMsg) {
                    statusMsg.style.color = 'var(--accent-red)';
                    statusMsg.textContent = error.message;
                }
            } else {
                console.log("Signup successful:", data);
                if (statusMsg) {
                    statusMsg.style.color = 'var(--accent-emerald)';
                    statusMsg.textContent = 'Registration successful! Redirecting to login...';
                }
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        });
    } else {
        console.warn("signupForm not found on this page.");
    }
});
