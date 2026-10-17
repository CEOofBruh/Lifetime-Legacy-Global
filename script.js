// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://clnqxwyewtzofeiyzrbk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbnF4d3lld3R6b2ZlaXl6cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTgzMzksImV4cCI6MjEwNjQ5NDMzOX0.pZa8UV-EBkI-hJmYdi4Cl406pTsC2B4WqyAyO_0f_Tg";

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ==========================================
// 2. UNIVERSAL AUTHENTICATION ROUTE GUARD
// ==========================================
async function enforceRouteSecurity() {
    if (!supabaseClient) return null;

    const currentPath = window.location.pathname;
    
    // Public pages that do NOT require authentication
    const isPublicPage = currentPath.endsWith('index.html') || 
                         currentPath.endsWith('signup.html') || 
                         currentPath === '/' || 
                         currentPath === '';

    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentUser = session ? session.user : null;

    if (!session && !isPublicPage) {
        window.location.href = 'index.html';
        return null;
    } else if (session && isPublicPage) {
        window.location.href = 'dashboard.html';
        return currentUser;
    }

    return currentUser;
}

// ==========================================
// 3. LOCAL STORAGE & STATUS HELPERS
// ==========================================
function getLocalUserData() {
    const local = localStorage.getItem('user_profile_data');
    if (!local) return { coins: 0, rank: "Bronze Initiate", unlockedPages: [], avatarUrl: null };
    try {
        return JSON.parse(local);
    } catch (e) {
        return { coins: 0, rank: "Bronze Initiate", unlockedPages: [], avatarUrl: null };
    }
}

function saveLocalUserData(data) {
    const current = getLocalUserData();
    const updated = { ...current, ...data };
    localStorage.setItem('user_profile_data', JSON.stringify(updated));
}

function setStatusMessage(elementId, text, color) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = text;
        if (color) el.style.color = color;
    }
}

// ==========================================
// 4. SUPABASE PROFILE & LEADERBOARD API
// ==========================================
async function fetchUserProfile(userId) {
    if (!supabaseClient || !userId) {
        return getLocalUserData();
    }

    try {
        let { data, error } = await supabaseClient
            .from('profiles')
            .select('coins, rank, unlocked_pages, avatar_url')
            .eq('id', userId)
            .maybeSingle();

        if (!data) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            const newProfile = {
                id: userId,
                email: user ? user.email : '',
                coins: 0,
                rank: "Bronze Initiate",
                unlocked_pages: [],
                avatar_url: null
            };

            await supabaseClient.from('profiles').upsert(newProfile);

            return {
                coins: 0,
                rank: "Bronze Initiate",
                unlockedPages: [],
                avatarUrl: null
            };
        }

        const formattedData = {
            coins: data.coins || 0,
            rank: data.rank || "Bronze Initiate",
            unlockedPages: data.unlocked_pages || [],
            avatarUrl: data.avatar_url || null
        };

        saveLocalUserData(formattedData);
        return formattedData;
    } catch (e) {
        console.error("Fetch profile failed:", e);
        return getLocalUserData();
    }
}

async function saveUserProfile(userId, data) {
    saveLocalUserData(data);

    if (supabaseClient && userId) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();

            const payload = {
                id: userId,
                email: user ? user.email : '',
                coins: data.coins,
                rank: data.rank,
                unlocked_pages: data.unlockedPages,
                updated_at: new Date().toISOString()
            };

            if (data.avatarUrl !== undefined) {
                payload.avatar_url = data.avatarUrl;
            }

            await supabaseClient
                .from('profiles')
                .upsert(payload);
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }
}

async function fetchLeaderboard() {
    const leaderboardTable = document.getElementById('leaderboardTable');
    if (!leaderboardTable || !supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('email, rank, coins')
            .order('coins', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            leaderboardTable.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; color: var(--text-muted);">
                        No associate standings recorded yet.
                    </td>
                </tr>`;
            return;
        }

        leaderboardTable.innerHTML = data.map((item, index) => {
            const username = item.email ? item.email.split('@')[0] : `Associate #${index + 1}`;
            return `
                <tr>
                    <td style="font-family: var(--font-mono); color: var(--gold);">#${index + 1}</td>
                    <td style="font-weight: 600;">${username}</td>
                    <td><span class="tier-badge">${item.rank || 'Bronze Initiate'}</span></td>
                    <td style="font-family: var(--font-mono); font-weight: bold;">${item.coins || 0} LC</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error("Failed to load leaderboard:", e);
        leaderboardTable.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color: var(--accent-red);">
                    Failed to sync leaderboard with network.
                </td>
            </tr>`;
    }
}

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!supabaseClient) {
        return alert("Cloud database connection unavailable.");
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return alert("Session expired. Please log in again.");
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    try {
        let { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        const avatarUrl = publicUrlData.publicUrl + '?t=' + new Date().getTime();

        await supabaseClient
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', user.id);

        saveLocalUserData({ avatarUrl: avatarUrl });
        renderAvatar(avatarUrl);
        alert("Avatar updated successfully!");
    } catch (error) {
        console.error("Error uploading avatar:", error);
        alert("Failed to upload avatar: " + error.message);
    }
}

function renderAvatar(url) {
    const avatarImg = document.getElementById('avatarImage');
    const avatarFallback = document.getElementById('avatarFallback');

    if (!avatarImg) return;

    if (url) {
        avatarImg.src = url;
        avatarImg.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        if (avatarFallback) avatarFallback.style.display = 'inline';
    }
}

function renderUnlockedArchives(unlockedPages) {
    const container = document.getElementById('unlockedLinks');
    if (!container) return;

    if (!unlockedPages || unlockedPages.length === 0) {
        container.innerHTML = `
            <p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                No bonus resources unlocked yet. Enter promo codes on the portal to access premium training.
            </p>`;
        return;
    }

    container.innerHTML = unlockedPages.map(page => `
        <a href="${page.url}" class="unlocked-link" target="_blank" style="display:block; color:var(--gold); margin-bottom:0.4rem; text-decoration:none;">
            🔓 ${page.title}
        </a>
    `).join('');
}

// ==========================================
// 5. MAIN PIPELINE LOGIC & DOM HANDLERS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await enforceRouteSecurity();

    const avatarInput = document.getElementById('avatarInput') || document.getElementById('avatarFileInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', uploadAvatar);
    }

    // SIGNUP FORM
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');
            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            setStatusMessage('signupStatus', 'Registering associate identity...', 'var(--text-muted)');

            if (!supabaseClient) {
                setStatusMessage('signupStatus', 'Error: Supabase client not loaded.', 'var(--accent-red)');
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({ email, password });

            if (error) {
                setStatusMessage('signupStatus', error.message, 'var(--accent-red)');
            } else {
                setStatusMessage('signupStatus', 'Registration successful! Redirecting to login portal...', 'var(--gold)');
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            }
        });
    }

    // LOGIN FORM
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            setStatusMessage('loginStatus', 'Authenticating clearance...', 'var(--text-muted)');

            if (!supabaseClient) {
                setStatusMessage('loginStatus', 'Error: Supabase client not loaded.', 'var(--accent-red)');
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                setStatusMessage('loginStatus', error.message, 'var(--accent-red)');
            } else {
                setStatusMessage('loginStatus', 'Access granted. Opening Associate Portal...', 'var(--gold)');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            }
        });
    }

    // DASHBOARD HYDRATION
    if (document.getElementById('coinBalance')) {
        const userId = currentUser ? currentUser.id : null;

        if (currentUser) {
            const userHandle = currentUser.email ? currentUser.email.split('@')[0] : 'Associate';
            const navUser = document.getElementById('navUser');
            const profileName = document.getElementById('profileName');

            if (navUser) navUser.textContent = currentUser.email;
            if (profileName) profileName.textContent = userHandle;
        }

        const profile = await fetchUserProfile(userId);

        const coinBalance = document.getElementById('coinBalance');
        const profileRank = document.getElementById('profileRank');

        if (coinBalance) coinBalance.textContent = profile.coins;
        if (profileRank) profileRank.textContent = profile.rank;

        renderAvatar(profile.avatarUrl);
        renderUnlockedArchives(profile.unlockedPages);
        fetchLeaderboard();
    }

    // PROMO CODE SUBMISSION
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
                const { data: puzzleData, error } = await supabaseClient
                    .from('puzzle_codes')
                    .select('*')
                    .eq('code', userInput)
                    .maybeSingle();

                if (error) throw error;

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
                        avatarUrl: currentProfile.avatarUrl
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

    // LOGOUT
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});

// ==========================================
// 6. THREE.JS 3D MATRIX HOLOGRAM ENGINE (INVERTED ANAMORPHIC VISAGE)
// ==========================================
let hologramScene, hologramCamera, hologramRenderer, hologramControls, hologramAnimationId;
let invertedApexNode = null;
let occultLinesGroup = null;
let isSubspaceRevealed = false;
let isVisageAligned = false;

// Target camera position looking up from under the floor grid
const targetInvertedAngle = new THREE.Vector3(0.0, -4.2, 3.5);

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

    // 13 STANDARD EXECUTIVE NODES (With Z-depth offsets for forced perspective)
    const tier1 = [new THREE.Vector3(0, 2.8, 0)];
    
    const tier2 = [
        new THREE.Vector3(-1.8, 0.9, 0.8),
        new THREE.Vector3(0, 0.9, -0.5),
        new THREE.Vector3(1.8, 0.9, 0.8)
    ];

    const tier3 = [
        new THREE.Vector3(-2.8, -1.0, 1.2),  // Left Eye Brow
        new THREE.Vector3(-1.8, -1.0, 0.4),  // Left Eye Socket
        new THREE.Vector3(-0.9, -1.0, -0.6), // Cheekbone Left
        new THREE.Vector3(-0.5, -1.0, 1.0),  // Nose Bridge Left
        new THREE.Vector3(0, -1.0, 0.2),     // Nose Apex
        new THREE.Vector3(0.5, -1.0, 1.0),   // Nose Bridge Right
        new THREE.Vector3(0.9, -1.0, -0.6),  // Cheekbone Right
        new THREE.Vector3(1.8, -1.0, 0.4),   // Right Eye Socket
        new THREE.Vector3(2.8, -1.0, 1.2)    // Right Eye Brow
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

    // 17 GOLD RESIDUAL VECTOR LINES
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

    // ==========================================
    // HIDDEN INVERTED OCCULT GEOMETRY
    // ==========================================
    occultLinesGroup = new THREE.Group();
    occultLinesGroup.visible = false; // Hidden until camera moves below floor

    const hiddenApexPos = new THREE.Vector3(0, -3.8, 0); // [ARCHON_00] - Forms the core mouth/jaw of the visage
    const darkNodeMaterial = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x990000,
        emissiveIntensity: 1.0,
        roughness: 0.1
    });

    invertedApexNode = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), darkNodeMaterial);
    invertedApexNode.position.copy(hiddenApexPos);
    invertedApexNode.userData = { id: "ARCHON_00", type: "OCCULT_APEX" };
    occultLinesGroup.add(invertedApexNode);

    // INVERTED CRIMSON VECTOR LINES
    const occultLineMaterial = new THREE.LineBasicMaterial({ color: 0xef4444, opacity: 0.8, transparent: true });
    
    tier3.forEach(parentPos => {
        const geometry = new THREE.BufferGeometry().setFromPoints([parentPos, hiddenApexPos]);
        const line = new THREE.Line(geometry, occultLineMaterial);
        occultLinesGroup.add(line);
    });

    hologramScene.add(occultLinesGroup);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 10, 0xd4af37, 0x1f242d);
    gridHelper.position.y = -1.8;
    hologramScene.add(gridHelper);

    // RAYCASTER CLICK DETECTOR FOR NODES
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
                    "%c[ARCHIVAL UNLOCK // NODE ARCHON_00]\n" +
                    "--------------------------------------------------\n" +
                    "Warning: Subspace Harvest Reservoir Interrogated.\n" +
                    "Residual Yield Transferred To Higher Order.\n" +
                    "Cipher Key Hint: '13' Active Vessels, '17' Feeding Lines.\n" +
                    "--------------------------------------------------",
                    "color: #ef4444; font-family: monospace; font-size: 12px; font-weight: bold;"
                );
            } else {
                clickedObject.material.color.setHex(0xffd700);
                console.log(
                    `%c[LLG TELEMETRY] Node ${clickedObject.userData.id} verified active.`,
                    "color: #d4af37; font-family: monospace;"
                );
            }
        }
    });

    // ANIMATION & PERSPECTIVE CHECK LOOP
    function animate() {
        hologramAnimationId = requestAnimationFrame(animate);
        hologramControls.update();

        // 1. Check if camera is beneath the grid floor (Y < -0.8)
        if (hologramCamera.position.y < -0.8) {
            if (!isSubspaceRevealed) {
                isSubspaceRevealed = true;
                occultLinesGroup.visible = true;
                hologramScene.background = new THREE.Color(0x1a0305);
            }

            // 2. Check if camera hits the specific alignment angle looking up
            const distToAngle = hologramCamera.position.distanceTo(targetInvertedAngle);
            if (distToAngle < 0.95) {
                if (!isVisageAligned) {
                    isVisageAligned = true;
                    
                    // Flash all standard nodes crimson to highlight the face
                    hologramScene.traverse((obj) => {
                        if (obj.isMesh && obj.userData.type === "EXECUTIVE") {
                            obj.material.color.setHex(0xef4444);
                        }
                    });

                    const title = document.getElementById('modalHologramTitle');
                    const statusHud = document.getElementById('statusHud');
                    
                    if (title) {
                        title.textContent = "ANAMORPHIC REVEAL // ARCHON VISAGE";
                        title.style.color = "var(--accent-red)";
                    }
                    if (statusHud) {
                        statusHud.textContent = "CRITICAL ALIGNMENT • THE ARCHITECT IS WATCHING";
                        statusHud.style.color = "var(--accent-red)";
                    }

                    console.warn(
                        "%c[INVERTED VISAGE ALIGNMENT DETECTED]\n" +
                        "--------------------------------------------------\n" +
                        "Subspace geometry resolves into the countenance of the Founder.\n" +
                        "Console Voucher: 'ARCHON_WATCHES'\n" +
                        "--------------------------------------------------",
                        "color: #ef4444; font-family: monospace; font-size: 12px; font-weight: bold;"
                    );
                }
            } else if (isVisageAligned) {
                isVisageAligned = false;
                
                // Revert nodes back to gold
                hologramScene.traverse((obj) => {
                    if (obj.isMesh && obj.userData.type === "EXECUTIVE") {
                        obj.material.color.setHex(0xffd700);
                    }
                });

                const title = document.getElementById('modalHologramTitle');
                const statusHud = document.getElementById('statusHud');
                
                if (title) {
                    title.textContent = "INVERTED SUBSPACE HARVEST MATRIX";
                    title.style.color = "var(--accent-red)";
                }
                if (statusHud) {
                    statusHud.textContent = "CRACKED TRANSMISSION • ARCHON_00 APEX FEED UNLOCKED";
                    statusHud.style.color = "var(--accent-red)";
                }
            }

        } else {
            // Above grid floor -> hide occult layer and reset titles
            if (isSubspaceRevealed) {
                isSubspaceRevealed = false;
                isVisageAligned = false;
                occultLinesGroup.visible = false;
                hologramScene.background = new THREE.Color(0x020305);
                
                hologramScene.traverse((obj) => {
                    if (obj.isMesh && obj.userData.type === "EXECUTIVE") {
                        obj.material.color.setHex(0xffd700);
                    }
                });

                const title = document.getElementById('modalHologramTitle');
                const statusHud = document.getElementById('statusHud');
                
                if (title) {
                    title.textContent = "360° MATRIX VECTOR AUDIT";
                    title.style.color = "var(--gold-bright)";
                }
                if (statusHud) {
                    statusHud.textContent = "STATUS: LIVE HOLOGRAM FEED • TACTICAL ORBIT ACTIVE";
                    statusHud.style.color = "var(--text-muted)";
                }
            }
        }

        hologramRenderer.render(hologramScene, hologramCamera);
    }

    animate();
}
