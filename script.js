// 1. Rename the variable to avoid variable name collision with the SDK
const SUPABASE_URL = "https://clnqxwyewtzofeiyzrbk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ioU2uiw5NZqp8ShkzkYOHA_cxRXKJyx";

// Use supabaseClient instead of supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentUser = null;

let userData = {
    coins: 0,
    rank: "Bronze Initiate",
    solvedCodes: [],
    unlockedPages: []
};

document.addEventListener("DOMContentLoaded", async () => {
    const isDashboard = window.location.pathname.includes("dashboard.html");
    
    // Replace 'supabase.' with 'supabaseClient.'
    const { data: { session } } = await supabaseClient.auth.getSession();

    // Session Protection
    if (isDashboard) {
        if (!session) {
            window.location.href = "index.html";
            return;
        }
        currentUser = session.user;
        loadUserData();
        updateDashboardUI();
    } else if (session && (window.location.pathname.includes("index.html") || window.location.pathname.includes("signup.html"))) {
        window.location.href = "dashboard.html";
        return;
    }

    // 1. SIGNUP LOGIC (signup.html)
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const signupMessage = document.getElementById("signupMessage");
            signupMessage.style.color = "#c5a059";
            signupMessage.textContent = "Creating Associate Account...";

            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPassword").value.trim();

            const { data, error } = await supabaseClient.auth.signUp({ email, password });

            if (error) {
                signupMessage.style.color = "#ef4444";
                signupMessage.textContent = error.message;
            } else {
                signupMessage.style.color = "#10b981";
                signupMessage.textContent = "Account created! Redirecting to login...";
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            }
        });
    }

    // 2. LOGIN LOGIC (index.html)
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const loginMessage = document.getElementById("loginMessage");
            loginMessage.style.color = "#c5a059";
            loginMessage.textContent = "Authenticating session...";

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value.trim();

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                loginMessage.style.color = "#ef4444";
                loginMessage.textContent = error.message;
            } else {
                loginMessage.style.color = "#10b981";
                loginMessage.textContent = "Authenticated! Launching portal...";
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);
            }
        });
    }

    // 3. ARG PUZZLE VERIFICATION
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

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            window.location.href = "index.html";
        });
    }
});

function loadUserData() {
    if (!currentUser) return;
    const storageKey = `llg_user_${currentUser.id}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        userData = JSON.parse(savedData);
    }
}

function saveUserData() {
    if (!currentUser) return;
    const storageKey = `llg_user_${currentUser.id}`;
    localStorage.setItem(storageKey, JSON.stringify(userData));
}

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
