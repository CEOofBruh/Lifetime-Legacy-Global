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
// 1. PROFILE & LEADERBOARD FETCHING ENGINE
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
            unlocked_pages: profileData.unlockedPages,
            avatar_url: profileData.avatarUrl,
            display_name: profileData.displayName,
            updated_at: new Date()
        });
    } catch (e) {
        console.error("Error saving profile:", e);
    }
}

async function fetchLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    if (!leaderboardBody) return;

    if (!supabaseClient) {
        leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Offline Mode Active</td></tr>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('rank, coins, avatar_url, display_name, email')
            .order('coins', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!data || data.length === 0) {
            leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No active associate records found</td></tr>`;
            return;
        }

        leaderboardBody.innerHTML = '';
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            const rowName = row.display_name || (row.email ? row.email.split('@')[0] : 'Associate');
            const rowRank = row.rank || 'Unranked Initiate';
            
            tr.innerHTML = `
                <td style="padding: 0.8rem;">#${index + 1}</td>
                <td style="padding: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${row.avatar_url || DEFAULT_PROFILE.avatarUrl}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                    <span>${rowName}</span>
                </td>
                <td style="padding: 0.8rem; color: var(--text-muted);">${rowRank}</td>
                <td style="padding: 0.8rem; color: var(--gold); font-weight: bold;">${row.coins ?? 0} LC</td>
            `;
            leaderboardBody.appendChild(tr);
        });
    } catch (e) {
        console.error("Leaderboard error:", e);
        leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Leaderboard sync paused</td></tr>`;
    }
}

function renderUnlockedArchives(unlockedList) {
    const archiveContainer = document.getElementById('unlockedArchiveList');
    if (!archiveContainer) return;

    archiveContainer.innerHTML = '';
    unlockedList.forEach(item => {
        const li = document.createElement('div');
        li.style.marginBottom = "0.6rem";
        li.innerHTML = `<a href="${item.url}" class="gold-text" style="text-decoration: none; font-weight: bold; font-size: 0.9rem;">🔓 ${item.title}</a>`;
        archiveContainer.appendChild(li);
    });
}

// Render Avatar Image Helper
function updateAvatarUI(avatarUrl) {
    const avatarImage = document.getElementById('avatarImage');
    const avatarFallback = document.getElementById('avatarFallback');

    if (avatarImage && avatarUrl) {
        avatarImage.src = avatarUrl;
        avatarImage.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
    }
}

// ==========================================
// 2. AUTH ROUTING & DOM INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const rawPage = window.location.pathname.split('/').pop().toLowerCase();
    const currentPage = rawPage === '' ? 'index.html' : rawPage;
    const isPublicPage = currentPage === 'index.html' || currentPage === 'login.html' || currentPage === 'signup.html';

    // Verify Auth Session
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session ? session.user : null;

        if (currentUser && isPublicPage) {
            window.location.href = 'dashboard.html';
            return;
        }

        if (!currentUser && !isPublicPage) {
            window.location.href = 'index.html';
            return;
        }

        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentUser = session ? session.user : null;
            if (!currentUser && !isPublicPage) {
                window.location.href = 'index.html';
            }
        });
    }

    // Attach Login Listener (index.html)
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
                console.error("Login Error:", err);
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = err.message || "Invalid credentials. Check email and password.";
                }
            }
        });
    }

    // Attach Signup Listener (signup.html)
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayNameInput = document.getElementById('signupDisplayName');
            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');
            const feedback = document.getElementById('signupStatus') || document.getElementById('signupFeedback');

            if (!emailInput || !passwordInput) return;

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
                const displayName = displayNameInput ? displayNameInput.value.trim() : "";
                const email = emailInput.value.trim();
                const password = passwordInput.value;

                // Register user in Supabase Auth
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

                // Upsert Profile row with 0 LC starting balance
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
                console.error("Signup Error:", err);
                if (feedback) {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = err.message || "Failed to register account. Check inputs.";
                }
            }
        });
    }

    // Attach Avatar Image Picker Listener (dashboard.html)
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Image = event.target.result;
                
                // Update local UI preview immediately
                updateAvatarUI(base64Image);

                // Persist new avatar URL across Supabase and local storage
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

    // Load Profile & Leaderboard Data on Protected Pages
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
        
        if (navUser) navUser.textContent = `ONLINE: ${userEmail.toUpperCase()}`;
        if (profileName) profileName.textContent = displayName;

        updateAvatarUI(profile.avatarUrl);
        renderUnlockedArchives(profile.unlockedPages);
        fetchLeaderboard();
    }
});

// Logout Procedure
async function handleLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    localStorage.removeItem('llg_user_profile');
    window.location.href = 'index.html';
}

function setStatusMessage(elementId, message, color) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.color = color;
        el.textContent = message;
    }
}

// ==========================================
// 3. PROMO CODE SUBMISSION ENGINE (SECURE RPC)
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

                    const alreadyUnlocked = currentProfile.unlockedPages.some(
                        p => p.url === puzzleData.unlocked_url
                    );

                    if (alreadyUnlocked) {
                        feedback.style.color = "var(--gold)";
                        feedback.textContent = "Voucher Notice: Promotion already claimed on this associate account.";
                        return;
                    }

                    const updatedCoins = currentProfile.coins + puzzleData.reward_coins;
                    const updatedRank = puzzleData.new_rank || currentProfile.rank;
                    const updatedUnlocked = [
                        ...currentProfile.unlockedPages,
                        { title: puzzleData.unlocked_title, url: puzzleData.unlocked_url }
                    ];

                    const updatedProfile = {
                        coins: updatedCoins,
                        rank: updatedRank,
                        unlockedPages: updatedUnlocked,
                        avatarUrl: currentProfile.avatarUrl,
                        displayName: currentProfile.displayName
                    };

                    await saveUserProfile(userId, updatedProfile);

                    const coinBalance = document.getElementById('coinBalance');
                    const profileRank = document.getElementById('profileRank');

                    if (coinBalance) coinBalance.textContent = updatedCoins;
                    if (profileRank) profileRank.textContent = updatedRank;

                    renderUnlockedArchives(updatedUnlocked);
                    fetchLeaderboard();

                    feedback.style.color = "var(--gold)";
                    feedback.textContent = `Voucher Approved! Awarded ${puzzleData.reward_coins} LC. Associate tier updated to ${updatedRank}.`;
                    inputField.value = "";
                } else {
                    feedback.style.color = "var(--accent-red)";
                    feedback.textContent = "Invalid Code: Promo voucher not recognized or expired.";
                }
            } catch (err) {
                console.error("Promo submission error:", err);
                feedback.style.color = "var(--accent-red)";
                feedback.textContent = "System error during voucher verification.";
            }
        });
    }
});

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
        container.innerHTML = `
            <div style="position: absolute; top: 12px; left: 12px; font-family: var(--font-mono); font-size: 0.7rem; color: var(--gold); background: rgba(0,0,0,0.7); padding: 0.4rem 0.8rem; border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; pointer-events: none; text-align: left;">
                <div>🖱️ <strong>Left Click + Drag:</strong> Rotate 360°</div>
                <div>🔍 <strong>Scroll:</strong> Zoom In/Out</div>
                <div>🖐️ <strong>Right Click + Drag:</strong> Pan Vector</div>
            </div>
            <div style="position: absolute; bottom: 12px; right: 12px; font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-muted); background: rgba(0,0,0,0.7); padding: 0.3rem 0.6rem; border-radius: 4px; pointer-events: none;">
                STATUS: LIVE HOLOGRAM FEED • TACTICAL ORBIT ACTIVE
            </div>`;
    }
    isSubspaceRevealed = false;
    isVisageAligned = false;
}

function initHologram3D() {
    const container = document.getElementById('hologramCanvasContainer');
    if (!container || typeof THREE === 'undefined') return;

    const targetInvertedAngle = new THREE.Vector3(0.0, -4.2, 3.5);

    const width = container.clientWidth;
    const height = container.clientHeight;

    hologramScene = new THREE.Scene();
    hologramScene.background = new THREE.Color(0x020305);

    hologramCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    hologramCamera.position.set(0, 1.5, 9);

    hologramRenderer = new THREE.WebGLRenderer({ antialias: true });
    hologramRenderer.setSize(width, height);
    hologramRenderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(hologramRenderer.domElement);

    hologramControls = new THREE.OrbitControls(hologramCamera, hologramRenderer.domElement);
    hologramControls.enableDamping = true;
    hologramControls.dampingFactor = 0.05;

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
            } else {
                clickedObject.material.color.setHex(0xffd700);
            }
        }
    });

    function animate() {
        hologramAnimationId = requestAnimationFrame(animate);
        hologramControls.update();

        if (hologramCamera.position.y < -0.8) {
            if (!isSubspaceRevealed) {
                isSubspaceRevealed = true;
                occultLinesGroup.visible = true;
                hologramScene.background = new THREE.Color(0x1a0305);
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
            }
        }

        hologramRenderer.render(hologramScene, hologramCamera);
    }

    animate();
}

// ==========================================
// 5. MASTERCLASS VOUCHER WATCHDOG
// ==========================================
// Minimal helper to display the "REDEEMED" ribbon if voucher claimed
function checkMasterclassRedemption(unlockedPages) {
    const badge = document.getElementById('voucherRedeemedBadge');
    if (!badge || !unlockedPages) return;

    // Checks if any unlocked item matches the masterclass reward
    const isRedeemed = unlockedPages.some(page => 
        page.title.toLowerCase().includes('masterclass') || 
        page.title.toLowerCase().includes('matrix') ||
        page.url === 'workshops.html'
    );

    if (isRedeemed) {
        badge.style.display = 'block';
    }
}
