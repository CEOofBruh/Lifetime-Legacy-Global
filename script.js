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

// Default Fallback Data
const DEFAULT_PROFILE = {
    coins: 10,
    rank: "Unranked Initiate",
    unlockedPages: [
        { title: "Module 01: Fast-Track Freedom", url: "module_01.html" }
    ],
    avatarUrl: "https://raw.githubusercontent.com/CEOofBruh/Lifetime-Legacy-Global/refs/heads/main/LLG%20-%20Icon.ico"
};

// ==========================================
// 1. CRYPTOGRAPHIC UTILITIES & OBFUSCATED STRINGS
// ==========================================
async function hashString(str) {
    const buffer = new TextEncoder().encode(str.trim().toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Hex-Encoded System Telemetry
const SEC_SIG_0 = "8f12c1b920042d385f86c23b207a9b0c2a8f8876b51342f1118bc27c62241d01";
const SEC_TELEMETRY = [
    "\x5b\x41\x52\x43\x48\x49\x56\x41\x4c\x20\x55\x4e\x4c\x4f\x43\x4b\x20\x2f\x2f\x20\x4e\x4f\x44\x45\x20\x41\x52\x43\x48\x4f\x4e\x5f\x30\x30\x5d",
    "\x57\x61\x72\x6e\x69\x6e\x67\x3a\x20\x53\x75\x62\x73\x70\x61\x63\x65\x20\x48\x61\x72\x76\x65\x73\x74\x20\x52\x65\x73\x65\x72\x76\x6f\x69\x72\x20\x49\x6e\x74\x65\x72\x72\x6f\x67\x61\x74\x65\x64\x2e",
    "\x43\x69\x70\x68\x65\x72\x20\x4b\x65\x79\x20\x48\x69\x6e\x74\x3a\x20\x27\x31\x33\x27\x20\x41\x63\x74\x69\x76\x65\x20\x56\x65\x73\x73\x65\x6c\x73\x2c\x20\x27\x31\x37\x27\x20\x46\x65\x65\x64\x69\x6e\x67\x20\x4c\x69\x6e\x65\x73\x2e"
];

// ==========================================
// 2. PROFILE & LEADERBOARD FETCHING ENGINE
// ==========================================
async function fetchUserProfile(userId) {
    if (!supabaseClient || !userId) {
        const local = localStorage.getItem('llg_user
