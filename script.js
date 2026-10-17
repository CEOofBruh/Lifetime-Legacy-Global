// ==========================================
// LIFETIME LEGACY GLOBAL (LLG) - CORE ENGINE
// SYSTEM EPOCH: 2026 REBRAND
// ==========================================

// Global State & Supabase Initialization
const SUPABASE_URL = "https://dnqxwywtzofeiyzrbk.supabase.co"; // Replace with your Supabase Project URL if needed
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Replace with your Supabase Anon Key

let supabaseClient = null;
let currentUser = null;

if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ==========================================
// 1. SHA-256 CRYPTOGRAPHIC HASHING UTILITY
// ==========================================
async function hashString(str) {
    const buffer = new TextEncoder().encode(str.trim().toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// SHA-256 HASH SIGNATURES FOR SECRET IN-CODE TRIGGERS
// "ARCHON_WATCHES" -> 8f12c1b920042d385f86c23b207a9b0c2a8f8876b51342f1118bc27c62241d01
const HASH_VISAGE_VOUCHER = "8f12c1b920042d385f86c23b207a9b0c2a8f8876b51342f1118bc27c62241d01";

// Hex-encoded string arrays for occult console outputs (prevents plain-text source search)
const OBFUSCATED_TELEMETRY_APEX = [
    "\x5b\x41\x52\x43\x48\x49\x56\x41\x4c\x20\x55\x4e\x4c\x4f\x43\x4b\x20\x2f\x2f\x20\x4e\x4f\x44\x45\x20\x41\x52\x43\x48\x4f\x4e\x5f\x30\x30\x5d",
    "\x57\x61\x72\x6e\x69\x6e\x67\x3a\x20\x53\x75\x62\x73\x70\x61\x63\x65\x20\x48\x61\x72\x76\x65\x73\x74\x20\x52\x65\x73\x65\x72\x76\x6f\x69\x72\x20\x49\x6e\x74\x65\x72\x72\x6f\x67\x61\x74\x65\x64\x2e",
    "\x43\x69\x70\x68\x65\x72\x20\x4b\x65\x79\x20\x48\x69\x6e\x74\x3a\x20\x27\x31\x33\x27\x20\x41\x63\x74\x69\x76\x65\x20\x56\x65\x73\x73\x65\x6c\x73\x2c\x20\x27\x31\x37\x27\x20\x46\x65\x65\x64\x69\x6e\x67\x20\x4c\x69\x6e\x65\x73\x2e"
];

// ==========================================
// 2. USER PROFILE & STORAGE HANDLERS
// ==========================================
const DEFAULT_PROFILE = {
    coins: 10,
    rank: "Unranked Initiate",
    unlockedPages: [
        { title: "Module 01: Fast-Track Freedom", url: "module_01.html" }
    ],
    avatarUrl: "https://raw.githubusercontent.com/CEOofBruh/Lifetime-Legacy-Global/refs/heads/main/LLG%20-%20Icon.ico"
};

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
            .single();

        if (error || !data) return DEFAULT_PROFILE;

        return {
            coins: data.coins ?? DEFAULT_PROFILE.coins,
            rank: data.rank ?? DEFAULT_PROFILE.rank,
            unlockedPages: data.unlocked_pages ?? DEFAULT_PROFILE.unlockedPages,
            avatarUrl: data.avatar_url ?? DEFAULT_PROFILE.avatarUrl
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
            updated_at: new Date()
        });
    } catch (e) {
        console.error("Error saving profile:", e);
    }
}

// ==========================================
// 3. UI INITIALIZATION & DASHBOARD RENDER
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check Supabase session
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) currentUser = session.user;

        supabaseClient.auth.onAuthStateChange((_event, session) => {
            currentUser = session ? session.user : null;
        });
    }

    const userId = currentUser ? currentUser.id : null;
    const profile = await fetchUserProfile(userId);

    // Update Dashboard UI Elements
    const coinBalance = document.getElementById('coinBalance');
    const profileRank = document.getElementById('profileRank');

    if (coinBalance) coinBalance.textContent = profile.coins;
    if (profileRank) profileRank.textContent = profile.rank;

    renderUnlockedArchives(profile.unlockedPages);
    fetchLeaderboard();
});

function renderUnlockedArchives(unlockedList) {
    const archiveContainer = document.getElementById('unlockedArchiveList');
    if (!archiveContainer) return;

    archiveContainer.innerHTML = '';
    unlockedList.forEach(item => {
        const li = document.createElement('li');
        li.style.marginBottom = "0.6rem";
        li.innerHTML = `<a href="${item.url}" class="gold-text" style="text-decoration: none; font-weight: bold;">🔓 ${item.title}</a>`;
        archiveContainer.appendChild(li);
    });
}

async function fetchLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    if (!leaderboardBody) return;

    if (!supabaseClient) {
        leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">Offline Mode Active</td></tr>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('rank, coins, avatar_url')
            .order('coins', { ascending: false })
            .limit(5);

        if (error || !data) return;

        leaderboardBody.innerHTML = '';
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${index + 1}</td>
                <td style="display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${row.avatar_url || DEFAULT_PROFILE.avatarUrl}" style="width: 20px; height: 20px; border-radius: 50%;">
                    <span>${row.rank || 'Associate'}</span>
                </td>
                <td style="color: var(--gold); font-weight: bold;">${row.coins} LC</td>
            `;
            leaderboardBody.appendChild(tr);
        });
    } catch (e) {
        console.error("Leaderboard error:", e);
    }
}

function setStatusMessage(elementId, message, color) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.color = color;
        el.textContent = message;
    }
}

// ==========================================
// 4. PROMO CODE SUBMISSION ENGINE (SECURE RPC)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
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
                // Secure RPC Function call (bypasses RLS table dumps)
                const { data: puzzleResults, error } = await supabaseClient
                    .rpc('verify_puzzle_code', { input_code: userInput });

                if (error) throw error;

                const puzzleData = (puzzleResults && puzzleResults.length > 0) ? puzzleResults[0] : null;

                if (puzzleData) {
                    const userId = currentUser ? currentUser.id : null;
                    const currentProfile = await fetchUserProfile(userId);

                    const alreadyUnlocked = currentProfile.unlockedPages.some(
                        p => p.url
