document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize or Load User Data
    let userData = JSON.parse(localStorage.getItem("llg_user")) || {
        username: "Guest_Associate",
        coins: 0,
        rank: "Bronze Initiate",
        solvedCodes: [],
        unlockedPages: []
    };

    console.log("%c Lifetime Legacy Global - System Terminal v4.09 ", "background: #c5a059; color: #000; font-weight: bold;");
    console.log("%c WARNING: Unencrypted node detected. Session monitoring active.", "color: #ef4444;");

    updateDashboardUI();

    // 2. Handle Login Submission on Landing Page
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById("username").value.trim();
            if (usernameInput) {
                userData.username = usernameInput;
                localStorage.setItem("llg_user", JSON.stringify(userData));
                window.location.href = "dashboard.html";
            }
        });
    }

    // 3. Handle Quiz / Code Submissions
    const quizForm = document.getElementById("quizForm");
    const quizFeedback = document.getElementById("quizFeedback");

    if (quizForm) {
        quizForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const answer = document.getElementById("answerInput").value.trim().toLowerCase();

            // Code 1: Found in index.html source comment
            if (answer === "0x88f_override" && !userData.solvedCodes.includes("m1")) {
                userData.coins += 100;
                userData.solvedCodes.push("m1");
                userData.rank = "Silver Visionary";
                quizFeedback.style.color = "#10b981";
                quizFeedback.textContent = "SUCCESS: Override key verified. +100 Legacy Coins awarded! Rank upgraded.";
            } 
            // Code 2: Found in module hint
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

            localStorage.setItem("llg_user", JSON.stringify(userData));
            updateDashboardUI();
            document.getElementById("answerInput").value = "";
        });
    }

    // 4. Handle Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("llg_user");
            window.location.href = "index.html";
        });
    }

    // Synchronize UI elements with stored state
    function updateDashboardUI() {
        if (!document.getElementById("coinBalance")) return;

        document.getElementById("coinBalance").textContent = userData.coins;
        document.getElementById("navUser").textContent = userData.username;
        document.getElementById("profileName").textContent = userData.username;
        document.getElementById("profileRank").textContent = userData.rank;

        document.getElementById("lbUserName").textContent = userData.username + " (You)";
        document.getElementById("lbUserRank").textContent = userData.rank;
        document.getElementById("lbUserCoins").textContent = userData.coins;

        // Unlock Module 2 automatically if balance >= 100
        if (userData.coins >= 100) {
            const card2 = document.getElementById("card-m2");
            card2.classList.remove("locked");
            card2.classList.add("unlocked");
            const badge2 = document.getElementById("badge-m2");
            badge2.className = "badge status-unlocked";
            badge2.textContent = "UNLOCKED";
        }

        // Dynamically populate unlocked sidebar links
        const unlockedContainer = document.getElementById("unlockedLinks");
        unlockedContainer.innerHTML = "";
        if (userData.unlockedPages.includes("secret-archive.html")) {
            const link = document.createElement("a");
            link.href = "secret-archive.html";
            link.className = "unlocked-link";
            link.textContent = "⚠️ REDACTED ARCHIVE";
            unlockedContainer.appendChild(link);
        }
    }
});
