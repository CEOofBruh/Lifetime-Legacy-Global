// ==========================================
// LEADERBOARD ENGINE (UPDATED TO TOP 20)
// ==========================================
async function loadLeaderboard() {
    const leaderboardContainer = document.getElementById('leaderboardList');
    if (!leaderboardContainer) return;

    try {
        const { data: leaderboard, error } = await supabaseClient
            .from('profiles')
            .select('display_name, rank, coins')
            .order('coins', { ascending: false })
            .limit(20); // Updated to 20 profiles

        if (error) throw error;

        leaderboardContainer.innerHTML = '';
        
        leaderboard.forEach((user, index) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.innerHTML = `
                <span class="rank-number">#${index + 1}</span>
                <span class="user-name">${user.display_name || 'Anonymous Associate'}</span>
                <span class="user-tier">${user.rank || 'Silver Associate'}</span>
                <span class="user-coins">${(user.coins || 0).toLocaleString()} LC</span>
            `;
            leaderboardContainer.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading leaderboard:", err);
    }
}

// ==========================================
// DYNAMIC AFFILIATE SLOTS POP-UP ENGINE (WITH DIAGNOSTICS)
// ==========================================
async function fetchRemainingSlots() {
    const MAX_ALLOWED_PROFILES = 9;

    if (!supabaseClient) {
        console.warn("⚠️ [Pop-up Debug] Supabase client not initialized.");
        return "FEW SLOTS REMAINING";
    }

    try {
        const { count, error } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (error || count === null) throw error;

        const remaining = MAX_ALLOWED_PROFILES - count;

        if (remaining <= 0) {
            return "0 SLOTS REMAINING (CEILING REACHED)";
        }

        return `ONLY ${remaining} SLOT${remaining === 1 ? '' : 'S'} REMAINING`;
    } catch (e) {
        console.warn("⚠️ [Pop-up Debug] Could not query profile count:", e);
        return "LIMITED SLOTS REMAINING";
    }
}

function initSimulatedPopups() {
    console.log("🔍 [Pop-up Debug] Running initSimulatedPopups()...");

    const adModal = document.getElementById('simulatedAdModal');
    const slotsCounter = document.getElementById('adSlotsCounter');
    const closeBtn = document.getElementById('closeAdBtn');
    const actionBtn = document.getElementById('adActionBtn');

    if (!adModal) {
        console.error("❌ [Pop-up Debug] Target element #simulatedAdModal NOT found in DOM. Check HTML placement.");
        return;
    }

    console.log("✅ [Pop-up Debug] Modal container found. Calculating timer...");

    // Random delay between 5s (5000ms) and 10s (10000ms)
    const randomDelay = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
    console.log(`⏱️ [Pop-up Debug] Pop-up scheduled to fire in ${(randomDelay / 1000).toFixed(1)} seconds.`);

    setTimeout(async () => {
        console.log("🚀 [Pop-up Debug] Timer elapsed! Attempting to display modal...");
        
        if (slotsCounter) {
            slotsCounter.textContent = await fetchRemainingSlots();
        }

        adModal.style.display = 'flex';
        console.log("🎉 [Pop-up Debug] adModal style set to 'flex'.");
    }, randomDelay);

    if (closeBtn) closeBtn.addEventListener('click', () => adModal.style.display = 'none');
    if (actionBtn) actionBtn.addEventListener('click', () => adModal.style.display = 'none');

    adModal.addEventListener('click', (e) => {
        if (e.target === adModal) adModal.style.display = 'none';
    });
}

// ==========================================
// DOM INITIALIZATION & ROUTING CHECK
// ==========================================
function setupAuthPopups() {
    // Get path and strip query params/hash
    const fullPath = window.location.pathname.toLowerCase();
    const rawPage = fullPath.split('/').pop();
    
    console.log(`📌 [Pop-up Debug] Current Path: "${fullPath}", Extracted Page: "${rawPage}"`);

    // Flexible match for login/signup pages regardless of clean URLs or extensions
    const isAuthPage = 
        rawPage === 'login' || 
        rawPage === 'login.html' || 
        rawPage === 'signup' || 
        rawPage === 'signup.html' ||
        fullPath.includes('/login') ||
        fullPath.includes('/signup');

    if (isAuthPage) {
        console.log("✅ [Pop-up Debug] Verified auth page. Initializing pop-up engine...");
        initSimulatedPopups();
    } else {
        console.log("ℹ️ [Pop-up Debug] Not an auth page (login/signup). Pop-up engine skipped.");
    }
}

// Run immediately if DOM is already loaded, otherwise wait for listener
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthPopups);
} else {
    setupAuthPopups();
}
