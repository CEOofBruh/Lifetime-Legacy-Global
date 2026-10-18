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
// 1. SAFE BASE64 OBFUSCATION UTILITIES
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
            unlocked_pages: profileData.un
