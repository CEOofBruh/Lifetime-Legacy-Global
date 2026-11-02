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
    coins: 0,
    rank: "Unranked Initiate",
    unlockedPages: [
        { title: "Module 01: Fast-Track Freedom", url: "module_01.html" }
    ],
    avatarUrl: "https://raw.githubusercontent.com/CEOofBruh/Lifetime-Legacy-Global/refs/heads/main/LLG%20-%20Icon.ico"
};

// ==========================================
// 1. SAFE BASE64 & XSS UTILITIES
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

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
            display_name: profileData.displayName,
            updated_at: new Date()
        });
    } catch (e) {
        // Silently handle save fallback
    }
}

async function fetchLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    const leaderboardList = document.getElementById('leaderboardList');
    
    if (!leaderboardBody && !leaderboardList) return;

    if (!supabaseClient) {
        if (leaderboardBody) leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Offline Mode Active</td></tr>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('rank, coins, avatar_url, display_name, email')
            .order('coins', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!data || data.length === 0) {
            if (leaderboardBody) leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No active associate records found</td></tr>`;
            return;
        }

        if (leaderboardBody) {
            leaderboardBody.innerHTML = '';
            data.forEach((row, index) => {
                const tr = document.createElement('tr');
                const rowName = escapeHTML(row.display_name || (row.email ? row.email.split('@')[0] : 'Associate'));
                const rowRank = escapeHTML(row.rank || 'Unranked Initiate');
                const rawAvatar = row.avatar_url || DEFAULT_PROFILE.avatarUrl;
                const safeAvatar = escapeHTML(rawAvatar.startsWith('data:image/') || rawAvatar.startsWith('http') ? rawAvatar : DEFAULT_PROFILE.avatarUrl);
                
                tr.innerHTML = `
                    <td style="padding: 0.8rem;">#${index + 1}</td>
                    <td style="padding: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${safeAvatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                        <span>${rowName}</span>
                    </td>
                    <td style="padding: 0.8rem; color: var(--text-muted);">${rowRank}</td>
                    <td style="padding: 0.8rem; color: var(--gold); font-weight: bold;">${Number(row.coins ?? 0).toLocaleString()} LC</td>
                `;
                leaderboardBody.appendChild(tr);
            });
        }

        if (leaderboardList) {
            leaderboardList.innerHTML = '';
            data.forEach((user, index) => {
                const row = document.createElement('div');
                row.className = 'leaderboard-row';
                row.innerHTML = `
                    <span class="rank-number">#${index + 1}</span>
                    <span class="user-name">${escapeHTML(user.display_name || 'Anonymous Associate')}</span>
                    <span class="user-tier">${escapeHTML(user.rank || 'Silver Associate')}</span>
                    <span class="user-coins">${(user.coins || 0).toLocaleString()} LC</span>
                `;
                leaderboardList.appendChild(row);
            });
        }

    } catch (e) {
        if (leaderboardBody) leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Leaderboard sync paused</td></tr>`;
    }
}

function renderUnlockedArchives(unlockedList) {
    const archiveContainer = document.getElementById('unlockedArchiveList');
    if (!archiveContainer) return;

    archiveContainer.innerHTML = '';
    
    const combinedList = [
        ...DEFAULT_PROFILE.unlockedPages,
        ...unlockedList.filter(item => item.url !== "module_01.html")
    ];

    combinedList.forEach(item => {
        const li = document.createElement('div');
        li.style.marginBottom = "0.6rem";
        const safeTitle = escapeHTML(item.unlocked_title || item.title);
        const safeUrl = escapeHTML(item.unlocked_url || item.url);
        const unlockedBy = item.unlocked_by_name ? ` <span style="font-size:0.7rem; color: var(--text-muted);">(by ${escapeHTML(item.unlocked_by_name)})</span>` : '';
        
        li.innerHTML = `<a href="${safeUrl}" class="gold-text" style="text-decoration: none; font-weight: bold; font-size: 0.9rem;">🔓 ${safeTitle}</a>${unlockedBy}`;
        archiveContainer.appendChild(li);
    });
}

function updateAvatarUI(avatarUrl) {
    const avatarImage = document.getElementById('avatarImage');
    const avatarFallback = document.getElementById('avatarFallback');

    if (avatarImage && avatarUrl) {
        avatarImage.src = avatarUrl;
        avatarImage.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
    }
}

function checkMasterclassRedemption(unlockedPages) {
    const badge = document.getElementById('voucherRedeemedBadge');
    if (!badge || !unlockedPages) return;

    const isRedeemed = unlockedPages.some(page => {
        const title = (page.unlocked_title || page.title || "").toLowerCase();
        const url = (page.unlocked_url || page.url || "").toLowerCase();

        return (
            title.includes('masterclass') || 
            title.includes('matrix') || 
            title.includes('module 01') ||
            title.includes('fast-track') ||
            url.includes('module_01.html') ||
            url.includes('workshops.html')
        );
    });

    if (isRedeemed) {
        badge.style.display = 'block';
    }
}

// ==========================================
// 3. SHARED PROGRESSION & REALTIME ENGINE
// ==========================================
async function fetchGlobalUnlocks() {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('global_unlocks')
            .select('*')
            .order('unlocked_at', { ascending: true });

        if (error) throw error;

        renderUnlockedArchives(data || []);
        checkMasterclassRedemption(data || []);
    } catch (e) {
        // Silently handle fallback
    }
}

function subscribeToGlobalUnlocks() {
    if (!supabaseClient) return;

    supabaseClient
        .channel('public:global_unlocks')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_unlocks' }, (payload) => {
            const newUnlock = payload.new;
            
            fetchGlobalUnlocks();
            fetchLeaderboard();

            const noticeTitle = newUnlock.unlocked_title || 'New Node';
            const noticeUser = newUnlock.unlocked_by_name || 'Associate';
            
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed; top:20px; right:20px; background:#0f1219; border:1px solid #d4af37; color:#d4af37; padding:12px 20px; border-radius:6px; z-index:99999; font-family:monospace; font-size:0.8rem; box-shadow:0 0 15px rgba(212,175,55,0.4);';
            banner.innerHTML = `<strong>🔓 GLOBAL UNLOCK:</strong> ${escapeHTML(noticeUser)} solved "${escapeHTML(noticeTitle)}"!`;
            document.body.appendChild(banner);

            setTimeout(() => banner.remove(), 6000);
        })
        .subscribe();
}

// ==========================================
// 4. THREE.JS 3D HOLOGRAM ENGINE
// ==========================================
let hologramScene, hologramCamera, hologramRenderer, hologramControls, hologramAnimationId;
let invertedApexNode = null;
let occultLinesGroup = null;
let isSubspaceRevealed = false;
let isVisageAligned = false;

function openProjectionModal() {
    const modal = document.getElementById('projectionModal');
    if (!modal) return;

    modal.style.display = 'flex';
    initHologram3D();
}

function closeProjectionModal(event) {
    const modal = document.getElementById('projectionModal');
    if (modal) modal.style.display = 'none';

    if (hologramAnimationId) cancelAnimationFrame(hologramAnimationId);
    
    const container = document.getElementById('hologramCanvasContainer');
    if (container) {
        container.classList.remove('glitch-active');
        container.innerHTML = `
            <div id="controlsHud" style="position: absolute; top: 12px; left: 12px; font-family: var(--font-mono); font-size: 0.7rem; color: var(--gold); background: rgba(0,0,0,0.7); padding: 0.4rem 0.8rem; border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; pointer-events: none; text-align: left;">
                <div>🖱️ <strong>Left Click + Drag:</strong> Rotate 360°</div>
                <div>🔍 <strong>Scroll:</strong> Zoom In/Out</div>
                <div>🖐️ <strong>Right Click + Drag:</strong> Pan Vector</div>
            </div>
            <div id="hologramStatusText" style="position: absolute; bottom: 12px; right: 12px; font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-muted); background: rgba(0,0,0,0.7); padding: 0.3rem 0.6rem; border-radius: 4px; pointer-events: none;">
                STATUS: NETWORK STRUCTURE STABLE • TIER 1-3 LINKED
            </div>`;
    }
    isSubspaceRevealed = false;
    isVisageAligned = false;
}

function initHologram3D() {
    const container = document.getElementById('hologramCanvasContainer');
    if (!container) return;

    if (typeof THREE === 'undefined') {
        container.innerHTML = `<div style="color:var(--accent-red); padding:2rem; font-family:monospace;">Error: Three.js library missing. Please load three.min.js in HTML head.</div>`;
        return;
    }

    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) existingCanvas.remove();

    const targetInvertedAngle = new THREE.Vector3(0.0, -4.2, 3.5);

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    hologramScene = new THREE.Scene();
    hologramScene.background = new THREE.Color(0x020305);

    hologramCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    hologramCamera.position.set(0, 1.5, 9);

    hologramRenderer = new THREE.WebGLRenderer({ antialias: true });
    hologramRenderer.setSize(width, height);
    hologramRenderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(hologramRenderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
        hologramControls = new THREE.OrbitControls(hologramCamera, hologramRenderer.domElement);
    } else if (typeof OrbitControls !== 'undefined') {
        hologramControls = new OrbitControls(hologramCamera, hologramRenderer.domElement);
    } else {
        hologramControls = { update: () => {} };
    }

    if (hologramControls.enableDamping !== undefined) {
        hologramControls.enableDamping = true;
        hologramControls.dampingFactor = 0.05;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    hologramScene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffd700, 2, 50);
    pointLight.position.set(0, 5, 5);
    hologramScene.add(pointLight);

    const tier1 = [new THREE.Vector3(0, 2.8, 0)];
    const tier2 = [
        new THREE.Vector3(-1.8, 0.9, 0.8),
        new THREE.Vector3(0, 0.9, -0.5),
        new THREE.Vector3(1.8, 0.9, 0.8)
    ];
    const tier3 = [
        new THREE.Vector3(-2.8, -1.0, 1.2),
        new THREE.Vector3(-1.8, -1.0, 0.4),
        new THREE.Vector3(-0.9, -1.0, -0.6),
        new THREE.Vector3(-0.5, -1.0, 1.0),
        new THREE.Vector3(0, -1.0, 0.2),
        new THREE.Vector3(0.5, -1.0, 1.0),
        new THREE.Vector3(0.9, -1.0, -0.6),
        new THREE.Vector3(1.8, -1.0, 0.4),
        new THREE.Vector3(2.8, -1.0, 1.2)
    ];

    const allStandardNodes = [...tier1, ...tier2, ...tier3];

    const nodeGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const nodeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xd4af37,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8
    });

    allStandardNodes.forEach((pos, idx) => {
        const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
        mesh.position.copy(pos);
        mesh.userData = { id: `NODE_${idx + 1}`, type: "EXECUTIVE" };
        hologramScene.add(mesh);
    });

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2 });

    tier2.forEach(target => {
        const geometry = new THREE.BufferGeometry().setFromPoints([tier1[0], target]);
        const line = new THREE.Line(geometry, lineMaterial);
        hologramScene.add(line);
    });

    for (let i = 0; i < 3; i++) {
        const parent = tier2[i];
        for (let j = 0; j < 3; j++) {
            const child = tier3[i * 3 + j];
            const geometry = new THREE.BufferGeometry().setFromPoints([parent, child]);
            const line = new THREE.Line(geometry, lineMaterial);
            hologramScene.add(line);
        }
    }

    occultLinesGroup = new THREE.Group();
    occultLinesGroup.visible = false;

    const hiddenApexPos = new THREE.Vector3(0, -3.8, 0);
    const darkNodeMaterial = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x990000,
        emissiveIntensity: 1.0,
        roughness: 0.1
    });

    invertedApexNode = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), darkNodeMaterial);
    invertedApexNode.position.copy(hiddenApexPos);
    invertedApexNode.userData = { id: "SUB_APEX", type: "OCCULT_APEX" };
    occultLinesGroup.add(invertedApexNode);

    const occultLineMaterial = new THREE.LineBasicMaterial({ color: 0xef4444, opacity: 0.8, transparent: true });
    
    tier3.forEach(parentPos => {
        const geometry = new THREE.BufferGeometry().setFromPoints([parentPos, hiddenApexPos]);
        const line = new THREE.Line(geometry, occultLineMaterial);
        occultLinesGroup.add(line);
    });

    hologramScene.add(occultLinesGroup);

    const gridHelper = new THREE.GridHelper(10, 10, 0xd4af37, 0x1f242d);
    gridHelper.position.y = -1.8;
    hologramScene.add(gridHelper);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('pointerdown', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, hologramCamera);
        const intersects = raycaster.intersectObjects(hologramScene.children, true);

        if (intersects.length > 0 && intersects[0].object.isMesh) {
            const clickedObject = intersects[0].object;
            if (clickedObject.userData.type === "OCCULT_APEX") {
                clickedObject.material.color.setHex(0xff0000);
                console.warn(
                    `%c${getDecodedTelemetry(0)}\n--------------------------------------------------\n${getDecodedTelemetry(1)}\n${getDecodedTelemetry(2)}\n--------------------------------------------------`,
                    "color: #ef4444; font-family: monospace; font-size: 12px; font-weight: bold;"
                );
            } else {
                clickedObject.material.color.setHex(0xffd700);
            }
        }
    });

    function animate() {
        hologramAnimationId = requestAnimationFrame(animate);
        if (hologramControls && hologramControls.update) hologramControls.update();

        const modalHeader = document.getElementById('modalHologramTitle');
        const modalTag = document.getElementById('modalHologramTag');
        const statusOverlay = document.getElementById('hologramStatusText');

        if (hologramCamera.position.y < -0.8) {
            if (!isSubspaceRevealed) {
                isSubspaceRevealed = true;
                occultLinesGroup.visible = true;
                hologramScene.background = new THREE.Color(0x1a0305);

                if (container) container.classList.add('glitch-active');

                if (modalTag) {
                    modalTag.textContent = "CRITICAL: GEOMETRY CORRUPTION";
                    modalTag.style.color = "var(--accent-red)";
                }
                if (modalHeader) {
                    modalHeader.textContent = "THE TRUE MONARCH // ALL LEADS FEED ONE";
                    modalHeader.style.color = "var(--accent-red)";
                }
                if (statusOverlay) {
                    statusOverlay.innerHTML = `<span style="color: var(--accent-red); font-weight: bold; letter-spacing: 1px;">STATUS: UNMASKED // ALL DOWNLINES CONVERGING ON SOLE RECEIVER</span>`;
                }
            }

            const distToAngle = hologramCamera.position.distanceTo(targetInvertedAngle);
            if (distToAngle < 0.95) {
                if (!isVisageAligned) {
                    isVisageAligned = true;
                    hologramScene.traverse((obj) => {
                        if (obj.isMesh && obj.userData.type === "EXECUTIVE") {
                            obj.material.color.setHex(0xef4444);
                        }
                    });
                }
            } else if (isVisageAligned) {
                isVisageAligned = false;
                hologramScene.traverse((obj) => {
                    if (obj.isMesh && obj.userData.type === "EXECUTIVE") {
                        obj.material.color.setHex(0xffd700);
                    }
                });
            }
        } else {
            if (isSubspaceRevealed) {
                isSubspaceRevealed = false;
                isVisageAligned = false;
                occultLinesGroup.visible = false;
                hologramScene.background = new THREE.Color(0x020305);

                if (container) container.classList.remove('glitch-active');

                if (modalTag) {
                    modalTag.textContent = "NETWORK GEOMETRY VISUALIZER";
                    modalTag.style.color = "var(--gold)";
                }
                if (modalHeader) {
                    modalHeader.textContent = "DOWNLINE MATRIX TOPOLOGY";
                    modalHeader.style.color = "var(--gold)";
                }
                if (statusOverlay) {
                    statusOverlay.textContent = "STATUS: NETWORK STRUCTURE STABLE • TIER 1-3 LINKED";
                }
            }
        }

        hologramRenderer.render(hologramScene, hologramCamera);
    }

    animate();
}

// ==========================================
// 5. AUTH ROUTING & DOM INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // -----------------------------------------------------------------
    // SAFE EVENT BINDINGS (Eliminates CSP inline execution violations)
    // -----------------------------------------------------------------
    const openHologramBtn = document.getElementById('openHologramBtn');
    const closeHologramBtn = document.getElementById('closeHologramBtn');

    if (openHologramBtn) openHologramBtn.addEventListener('click', openProjectionModal);
    if (closeHologramBtn) closeHologramBtn.addEventListener('click', closeProjectionModal);

    const rawPage = window.location.pathname.split('/').pop().toLowerCase();
    const currentPage = rawPage === '' ? 'index.html' : rawPage;
    const isPublicPage = currentPage === 'index.html' || currentPage === 'login.html' || currentPage === 'signup.html';

    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session ? session.user : null;

        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentUser = session ? session.user : null;
        });
    }

    // Attach Login Listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            const feedback = document.getElementById('loginFeedback') || document.getElementById('loginStatus');

            if (!emailInput || !passwordInput) return;

            if (feedback) {
                feedback.style.color = "var(--text-muted)";
                feedback.textContent = "Authenticating associate credentials...";
            }

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                });

                if (error) throw error;

                if (feedback) {
                    feedback.style.color = "var(--gold)";
                    feedback.textContent = "Authentication successful! Entering dashboard...";
                }

                currentUser = data.user;
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);

            } catch (err) {
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = err.message || "Invalid credentials. Check email and password.";
                }
            }
        });
    }

    // Attach Signup Listener
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayNameInput = document.getElementById('signupDisplayName');
            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');
            const feedback = document.getElementById('signupStatus') || document.getElementById('signupFeedback');

            if (!emailInput || !passwordInput) return;

            const displayName = displayNameInput ? displayNameInput.value.trim() : "";
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

            if (displayName.length > 0 && (displayName.length < 3 || displayName.length > 25)) {
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = "Validation Error: Display name must be between 3 and 25 characters.";
                }
                return;
            }

            if (!emailRegex.test(email)) {
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = "Validation Error: Please enter a valid email address.";
                }
                return;
            }

            if (password.length < 8) {
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = "Validation Error: Password must be at least 8 characters long.";
                }
                return;
            }

            if (feedback) {
                feedback.style.color = "var(--text-muted)";
                feedback.textContent = "Initializing associate identity...";
            }

            if (!supabaseClient) {
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = "Error: Database client connection missing.";
                }
                return;
            }

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            display_name: displayName
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    await supabaseClient.from('profiles').upsert({
                        id: data.user.id,
                        email: email,
                        display_name: displayName,
                        rank: "Unranked Initiate",
                        coins: 0,
                        unlocked_pages: DEFAULT_PROFILE.unlockedPages,
                        avatar_url: DEFAULT_PROFILE.avatarUrl,
                        updated_at: new Date()
                    });
                }

                if (feedback) {
                    feedback.style.color = "var(--gold)";
                    feedback.textContent = "Identity verified! Redirecting to login...";
                }

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1200);

            } catch (err) {
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = err.message || "Failed to register account. Check inputs.";
                }
            }
        });
    }

    // Attach Avatar Image Picker
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file format. Please upload a PNG, JPEG, WEBP, or GIF image.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                alert('File size exceeds the 2MB limit.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Image = event.target.result;
                
                updateAvatarUI(base64Image);

                if (currentUser) {
                    const profile = await fetchUserProfile(currentUser.id);
                    profile.avatarUrl = base64Image;
                    await saveUserProfile(currentUser.id, profile);
                    fetchLeaderboard();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Load Profile, Leaderboard Data & Shared Unlocks on Protected Pages
    if (!isPublicPage) {
        const userId = currentUser ? currentUser.id : null;
        const profile = await fetchUserProfile(userId);

        const coinBalance = document.getElementById('coinBalance');
        const profileRank = document.getElementById('profileRank');
        const navUser = document.getElementById('navUser');
        const profileName = document.getElementById('profileName');

        const userEmail = currentUser?.email || 'Associate';
        const metadataName = currentUser?.user_metadata?.display_name;
        const displayName = profile.displayName || metadataName || (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail);

        if (coinBalance) coinBalance.textContent = profile.coins;
        if (profileRank) profileRank.textContent = profile.rank;
        
        if (navUser) navUser.textContent = `ONLINE: ${escapeHTML(userEmail).toUpperCase()}`;
        if (profileName) profileName.textContent = displayName;

        updateAvatarUI(profile.avatarUrl);
        fetchGlobalUnlocks();
        subscribeToGlobalUnlocks();
        fetchLeaderboard();
    }
});

// ==========================================
// HARDENED LOGOUT & SESSION PURGE ENGINE
// ==========================================
async function handleLogout() {
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
    } catch (e) {
        // Continue cleanup
    } finally {
        localStorage.removeItem('llg_user_profile');

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key);
            }
        });

        window.location.href = 'index.html';
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
// 6. PROMO CODE SUBMISSION ENGINE
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
                const { data: puzzleResults, error } = await supabaseClient
                    .rpc('verify_puzzle_code', { input_code: userInput });

                if (error) throw error;

                const puzzleData = (puzzleResults && puzzleResults.length > 0) ? puzzleResults[0] : null;

                if (puzzleData) {
                    const userId = currentUser ? currentUser.id : null;
                    const currentProfile = await fetchUserProfile(userId);

                    const updatedCoins = currentProfile.coins + puzzleData.reward_coins;
                    const updatedRank = puzzleData.new_rank || currentProfile.rank;

                    const updatedProfile = {
                        coins: updatedCoins,
                        rank: updatedRank,
                        unlockedPages: currentProfile.unlockedPages,
                        avatarUrl: currentProfile.avatarUrl,
                        displayName: currentProfile.displayName
                    };

                    await saveUserProfile(userId, updatedProfile);

                    const coinBalance = document.getElementById('coinBalance');
                    const profileRank = document.getElementById('profileRank');

                    if (coinBalance) coinBalance.textContent = updatedCoins;
                    if (profileRank) profileRank.textContent = updatedRank;

                    fetchGlobalUnlocks();
                    fetchLeaderboard();

                    if (puzzleData.is_newly_unlocked) {
                        feedback.style.color = "var(--gold)";
                        feedback.textContent = `Voucher Approved! First global solve! Awarded ${puzzleData.reward_coins} LC. Tier updated to ${updatedRank}.`;
                    } else {
                        feedback.style.color = "var(--gold)";
                        feedback.textContent = `Voucher Approved! Node was already unlocked globally. Awarded ${puzzleData.reward_coins} LC for personal record!`;
                    }
                    inputField.value = "";
                } else {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = "Invalid Code: Promo voucher not recognized or expired.";
                }
            } catch (err) {
                feedback.style.color = "var(--accent-red)";
                feedback.textContent = "System error during voucher verification.";
            }
        });
    }
});

// ==========================================
// 7. DYNAMIC AFFILIATE SLOTS POP-UP ENGINE
// ==========================================
async function fetchRemainingSlots() {
    const SEEDED_DUMMY_COUNT = 12;
    const REAL_PLAYER_SLOTS = 9;
    const TOTAL_CEILING = SEEDED_DUMMY_COUNT + REAL_PLAYER_SLOTS;

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        return "FEW SLOTS REMAINING";
    }

    try {
        const { count, error } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (error || count === null) throw error;

        const remaining = TOTAL_CEILING - count;

        if (remaining <= 0) {
            return "0 SLOTS REMAINING (CEILING REACHED)";
        }

        return `ONLY ${remaining} SLOT${remaining === 1 ? '' : 'S'} REMAINING`;
    } catch (e) {
        return "LIMITED SLOTS REMAINING";
    }
}

function initSimulatedPopups() {
    const adModal = document.getElementById('simulatedAdModal');
    const slotsCounter = document.getElementById('adSlotsCounter');
    const closeBtn = document.getElementById('closeAdBtn');
    const actionBtn = document.getElementById('adActionBtn');

    if (!adModal) return;

    const randomDelay = Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;

    setTimeout(async () => {
        if (slotsCounter) {
            slotsCounter.textContent = await fetchRemainingSlots();
        }

        adModal.style.display = 'flex';
    }, randomDelay);

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            adModal.style.display = 'none';
        });
    }

    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            adModal.style.display = 'none';
        });
    }

    adModal.addEventListener('click', (e) => {
        if (e.target === adModal) {
            adModal.style.display = 'none';
        }
    });
}

function setupAuthPopups() {
    const fullPath = window.location.pathname.toLowerCase();
    const rawPage = fullPath.split('/').pop();

    const isTargetPage = 
        rawPage === 'login' || 
        rawPage === 'login.html' || 
        rawPage === 'signup' || 
        rawPage === 'signup.html' ||
        fullPath.includes('/login') ||
        fullPath.includes('/signup');

    if (isTargetPage) {
        initSimulatedPopups();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupAuthPopups();
    });
} else {
    setupAuthPopups();
}
