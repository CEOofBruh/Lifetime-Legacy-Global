// ==========================================
// LIFETIME LEGACY GLOBAL (LLG) - CORE ENGINE
// SYSTEM EPOCH: 2026 REBRAND
// ==========================================

// Global State & Supabase Initialization
const SUPABASE_URL = "https://dnqxwywtzofeiyzrbk.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Ensure your public anon key is present here

let supabaseClient = null;
let currentUser = null;

if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ==========================================
// 1. SHA-256 CRYPTOGRAPHIC HASHING UTILITY
// ==========================================
async function hashString(str) {
    const buffer = new TextEncoder().encode(str.trim().toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// SHA-256 HASH SIGNATURES & OBFUSCATED STRINGS
const HASH_VISAGE_VOUCHER = "8f12c1b920042d385f86c23b207a9b0c2a8f8876b51342f1118bc27c62241d01";

const OBFUSCATED_TELEMETRY_APEX = [
    "\x5b\x41\x52\x43\x48\x49\x56\x41\x4c\x20\x55\x4e\x4c\x4f\x43\x4b\x20\x2f\x2f\x20\x4e\x4f\x44\x45\x20\x41\x52\x43\x48\x4f\x4e\x5f\x30\x30\x5d",
    "\x57\x61\x72\x6e\x69\x6e\x67\x3a\x20\x53\x75\x62\x73\x70\x61\x63\x65\x20\x48\x61\x72\x76\x65\x73\x74\x20\x52\x65\x73\x65\x72\x76\x6f\x69\x72\x20\x49\x6e\x74\x65\x72\x72\x6f\x67\x61\x74\x65\x64\x2e",
    "\x43\x69\x70\x68\x65\x72\x20\x4b\x65\x79\x20\x48\x69\x6e\x74\x3a\x20\x27\x31\x33\x27\x20\x41\x63\x74\x69\x76\x65\x20\x56\x65\x73\x73\x65\x6c\x73\x2c\x20\x27\x31\x37\x27\x20\x46\x65\x65\x64\x69\x6e\x67\x20\x4c\x69\x6e\x65\x73\x2e"
];

// ==========================================
// 2. USER PROFILE & STORAGE HANDLERS
// ==========================================
const DEFAULT_PROFILE = {
    coins: 10,
    rank: "Unranked Initiate",
    unlockedPages: [
        { title: "Module 01: Fast-Track Freedom", url: "module_01.html" }
    ],
    avatarUrl: "https://raw.githubusercontent.com/CEOofBruh/Lifetime-Legacy-Global/refs/heads/main/LLG%20-%20Icon.ico"
};

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
            .single();

        if (error || !data) return DEFAULT_PROFILE;

        return {
            coins: data.coins ?? DEFAULT_PROFILE.coins,
            rank: data.rank ?? DEFAULT_PROFILE.rank,
            unlockedPages: data.unlocked_pages ?? DEFAULT_PROFILE.unlockedPages,
            avatarUrl: data.avatar_url ?? DEFAULT_PROFILE.avatarUrl
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
            updated_at: new Date()
        });
    } catch (e) {
        console.error("Error saving profile:", e);
    }
}

// ==========================================
// 3. AUTH ROUTING & DASHBOARD INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();
    const isPublicPage = currentPage === '' || currentPage === 'index.html' || currentPage === 'login.html';

    // Verify session
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session ? session.user : null;

        // Redirect unauthenticated visitors away from protected portal pages
        if (!currentUser && !isPublicPage) {
            window.location.href = 'index.html';
            return;
        }

        supabaseClient.auth.onAuthStateChange((_event, session) => {
            currentUser = session ? session.user : null;
            if (!currentUser && !isPublicPage) {
                window.location.href = 'index.html';
            }
        });
    }

    const userId = currentUser ? currentUser.id : null;
    const profile = await fetchUserProfile(userId);

    // Update Dashboard UI Elements
    const coinBalance = document.getElementById('coinBalance');
    const profileRank = document.getElementById('profileRank');

    if (coinBalance) coinBalance.textContent = profile.coins;
    if (profileRank) profileRank.textContent = profile.rank;

    renderUnlockedArchives(profile.unlockedPages);
    fetchLeaderboard();
});

// Logout handler for header/nav button
async function handleLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    localStorage.removeItem('llg_user_profile');
    window.location.href = 'index.html';
}

function renderUnlockedArchives(unlockedList) {
    const archiveContainer = document.getElementById('unlockedArchiveList');
    if (!archiveContainer) return;

    archiveContainer.innerHTML = '';
    unlockedList.forEach(item => {
        const li = document.createElement('li');
        li.style.marginBottom = "0.6rem";
        li.innerHTML = `<a href="${item.url}" class="gold-text" style="text-decoration: none; font-weight: bold;">🔓 ${item.title}</a>`;
        archiveContainer.appendChild(li);
    });
}

async function fetchLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    if (!leaderboardBody) return;

    if (!supabaseClient) {
        leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">Offline Mode Active</td></tr>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('rank, coins, avatar_url')
            .order('coins', { ascending: false })
            .limit(5);

        if (error || !data) return;

        leaderboardBody.innerHTML = '';
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${index + 1}</td>
                <td style="display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${row.avatar_url || DEFAULT_PROFILE.avatarUrl}" style="width: 20px; height: 20px; border-radius: 50%;">
                    <span>${row.rank || 'Associate'}</span>
                </td>
                <td style="color: var(--gold); font-weight: bold;">${row.coins} LC</td>
            `;
            leaderboardBody.appendChild(tr);
        });
    } catch (e) {
        console.error("Leaderboard error:", e);
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
// 4. PROMO CODE SUBMISSION ENGINE (SECURE RPC)
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
                // Secure RPC Function call
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
});

// ==========================================
// 5. THREE.JS 3D HOLOGRAM ENGINE (INVERTED ANAMORPHIC HASHED REVEAL)
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

    // Vector instantiated safely inside function execution
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

    // 13 STANDARD EXECUTIVE NODES
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

    // OCCULT SUBSPACE LAYER
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

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 10, 0xd4af37, 0x1f242d);
    gridHelper.position.y = -1.8;
    hologramScene.add(gridHelper);

    // RAYCASTER CLICK DETECTOR
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
                    `%c${OBFUSCATED_TELEMETRY_APEX[0]}\n--------------------------------------------------\n${OBFUSCATED_TELEMETRY_APEX[1]}\n${OBFUSCATED_TELEMETRY_APEX[2]}\n--------------------------------------------------`,
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

    // ANIMATION & HASH-VERIFIED ALIGNMENT LOOP
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
                        `Verification Signature: ${HASH_VISAGE_VOUCHER}\n` +
                        "--------------------------------------------------",
                        "color: #ef4444; font-family: monospace; font-size: 12px; font-weight: bold;"
                    );
                }
            } else if (isVisageAligned) {
                isVisageAligned = false;
                
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
