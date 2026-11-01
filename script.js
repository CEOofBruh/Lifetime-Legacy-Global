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
// DYNAMIC AFFILIATE SLOTS POP-UP ENGINE
// ==========================================
async function fetchRemainingSlots() {
    const MAX_ALLOWED_PROFILES = 9;

    if (!supabaseClient) {
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
        console.warn("Could not query profile count for pop-up, falling back:", e);
        return "LIMITED SLOTS REMAINING";
    }
}

function initSimulatedPopups() {
    const adModal = document.getElementById('simulatedAdModal');
    const slotsCounter = document.getElementById('adSlotsCounter');
    const closeBtn = document.getElementById('closeAdBtn');
    const actionBtn = document.getElementById('adActionBtn');

    if (!adModal) return;

    // Random delay between 15s (15000ms) and 45s (45000ms)
    const randomDelay = Math.floor(Math.random() * (45000 - 15000 + 1)) + 15000;

    setTimeout(async () => {
        if (slotsCounter) {
            slotsCounter.textContent = await fetchRemainingSlots();
        }
        adModal.style.display = 'flex';
    }, randomDelay);

    if (closeBtn) closeBtn.addEventListener('click', () => adModal.style.display = 'none');
    if (actionBtn) actionBtn.addEventListener('click', () => adModal.style.display = 'none');

    adModal.addEventListener('click', (e) => {
        if (e.target === adModal) adModal.style.display = 'none';
    });
}

// ==========================================
// DOM INITIALIZATION & ROUTING
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const rawPage = window.location.pathname.split('/').pop().toLowerCase();
    const currentPage = rawPage === '' ? 'index.html' : rawPage;

    // Load Leaderboard on pages where it exists
    loadLeaderboard();

    // Trigger popup ONLY on login.html and signup.html
    const isAuthPage = ['login.html', 'signup.html'].includes(currentPage);
    if (isAuthPage) {
        initSimulatedPopups();
    }
});
