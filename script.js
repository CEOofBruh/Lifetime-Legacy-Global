// Supabase Project Credentials
const SUPABASE_URL = "https://ioU2uiw5NZqp8ShkzkYOHA.supabase.co"; // Update with full URL if different
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ioU2uiw5NZqp8ShkzkYOHA_cxRXKJyx";

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let isSignUpMode = false;
let currentUser = null;

// User Profile State (persisted per session in localStorage / ready for database integration)
let userData = {
    coins: 0,
    rank: "Bronze Initiate",
    solvedCodes: [],
    unlockedPages: []
};

document.addEventListener("DOMContentLoaded", async () => {
    
    // Check current path
    const isDashboard = window.location.pathname.includes("dashboard.html");

    // Check for Active Supabase Session
    const { data: { session } } = await supabase.auth.getSession();

    if (isDashboard) {
        if (!session) {
            // Unauthenticated users are sent back to login page
            window.location.href = "index.html";
            return;
        }
        currentUser = session.user;
        loadUserData();
        updateDashboardUI();
    } else if (session && !isDashboard) {
        // If already logged in on index page, skip login and direct to dashboard
        const loginForm = document.getElementById("authForm");
        if (loginForm) {
            window.location.href = "dashboard.html";
            return;
        }
    }

    // 1. Toggle Login / Register Modes on index.html
    const toggleAuthMode = document.getElementById("toggleAuthMode");
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const submitBtn = document.getElementById("submitBtn");
    const toggleQuestion = document.getElementById("toggleQuestion");
    const authMessage = document.getElementById("authMessage");

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener("click", (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;

            if (isSignUpMode) {
                authTitle.textContent = "Register Associate ID";
                authSubtitle.textContent = "Create your account credentials in the global network.";
                submitBtn.textContent = "Initialize Registration";
                toggleQuestion.textContent = "Already registered?";
                toggleAuthMode.textContent = "Login Here";
            } else {
                authTitle.textContent = "Associate Access Portal";
                authSubtitle.textContent = "Authenticate with your Associate Credentials.";
                submitBtn.textContent = "Authenticate Session";
                toggleQuestion.textContent = "Need an Associate ID?";
                toggleAuthMode.textContent = "Register Here";
            }
            if (authMessage) authMessage.textContent = "";
        });
    }

    // 2. Handle Login / Sign Up Submission
    const authForm = document.getElementById("authForm");
    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            authMessage.style.color = "#c5a059";
            authMessage.textContent = "Processing payload...";

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            if (isSignUpMode) {
                // Real Supabase Sign Up
                const { data, error } = await supabase.auth.signUp({ email, password });

                if (error) {
                    authMessage.style.color = "#ef4444";
                    authMessage.textContent = error.message;
                } else {
                    authMessage.style.color = "#10b981";
                    authMessage.textContent = "Associate Account Created! You can now log in.";
                }
            } else {
                // Real Supabase Login
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });

                if (error) {
                    authMessage.style.color = "#ef4444";
                    authMessage.textContent = error.message;
                } else {
                    authMessage.style.color = "#10b981";
                    authMessage.textContent = "Session Authenticated! Redirecting...";
                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 1000);
                }
            }
        });
    }

    // 3. Handle ARG Code / Verification Submissions on Dashboard
    const quizForm = document.getElementById("quizForm");
    const quizFeedback = document.getElementById("quizFeedback");

    if (quizForm) {
        quizForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const answer = document.getElementById("answerInput").value.trim().toLowerCase();

            if (answer === "0x88f_override" && !userData.solvedCodes.includes("m1")) {
                userData.coins += 100;
                userData.solvedCodes.push("m1");
                userData.rank = "Silver Visionary";
                quizFeedback.style.color = "#10b981";
                quizFeedback.textContent = "SUCCESS: Override key verified. +100 Legacy Coins awarded! Rank upgraded.";
            } 
            else if (answer === "pioneer" && !userData.solvedCodes.includes("m2")) {
                userData.coins += 150;
                userData.solvedCodes.push("m2");
                userData.rank = "Gold Executive";
                if (!userData.unlockedPages.includes("secret-archive.html")) {
                    userData.unlockedPages.push("secret-archive.html");
                }
                quizFeedback.style.color = "#10b981";
                quizFeedback.textContent = "SUCCESS: Key accepted! REDACTED ARCHIVE unlocked in navigation bar.";
            } 
            else if (userData.solvedCodes.includes(answer)) {
                quizFeedback.style.color = "#f59e0b";
                quizFeedback.textContent = "WARNING: Code already redeemed.";
            } 
            else {
                quizFeedback.style.color = "#ef4444";
                quizFeedback.textContent = "ERROR: Invalid verification key.";
            }

            saveUserData();
            updateDashboardUI();
            document.getElementById("answerInput").value = "";
        });
    }

    // 4. Handle Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await supabase.auth.signOut();
            window.location.href = "index.html";
        });
    }
});

// Load player state scoped to logged-in Supabase user ID
function loadUserData() {
    if (!currentUser) return;
    const storageKey = `llg_user_${currentUser.id}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        userData = JSON.parse(savedData);
    }
}

// Save player state scoped to logged-in Supabase user ID
function saveUserData() {
    if (!currentUser) return;
    const storageKey = `llg_user_${currentUser.id}`;
    localStorage.setItem(storageKey, JSON.stringify(userData));
}

// Update DOM elements on Dashboard
function updateDashboardUI() {
    if (!document.getElementById("coinBalance") || !currentUser) return;

    const userDisplayName = currentUser.email.split("@")[0];

    document.getElementById("coinBalance").textContent = userData.coins;
    document.getElementById("navUser").textContent = currentUser.email;
    document.getElementById("profileName").textContent = userDisplayName;
    document.getElementById("profileRank").textContent = userData.rank;

    document.getElementById("lbUserName").textContent = userDisplayName + " (You)";
    document.getElementById("lbUserRank").textContent = userData.rank;
    document.getElementById("lbUserCoins").textContent = userData.coins;

    // Module 2 Auto-unlock visual state when balance >= 100
    if (userData.coins >= 100) {
        const card2 = document.getElementById("card-m2");
        if (card2) {
            card2.classList.remove("locked");
            card2.classList.add("unlocked");
            const badge2 = document.getElementById("badge-m2");
            if (badge2) {
                badge2.className = "badge status-unlocked";
                badge2.textContent = "UNLOCKED";
            }
        }
    }

    // Populate sidebar with unlocked links
    const unlockedContainer = document.getElementById("unlockedLinks");
    if (unlockedContainer) {
        unlockedContainer.innerHTML = "";
        if (userData.unlockedPages.includes("secret-archive.html")) {
            const link = document.createElement("a");
            link.href = "secret-archive.html";
            link.className = "unlocked-link";
            link.textContent = "⚠️ REDACTED ARCHIVE";
            unlockedContainer.appendChild(link);
        }
    }
}
