import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js";
import { 
    getFirestore, doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { 
    getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyCoydIWpV6ujbc9q-COWxFr9SyAyU7I7D0",
    authDomain: "fusee-app.firebaseapp.com",
    projectId: "fusee-app",
    storageBucket: "fusee-app.firebasestorage.app",
    messagingSenderId: "1027948046459",
    appId: "1:1027948046459:web:549cc5e4d6e47dd7e89ade",
    measurementId: "G-MN7CMTLDZ2"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
    hd: "addu.edu.ph",
    prompt: "select_account"
});

// --- Window Global Exports ---
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
window.db = db;
window.auth = auth;
window.doc = doc;
window.getDoc = getDoc;
window.updateDoc = updateDoc;
window.collection = collection;
window.addDoc = addDoc;
window.serverTimestamp = serverTimestamp;

window.userRole = localStorage.getItem('fusee_user_role') || null;
window.currentUser = null;
window.whitelistedEmails = [];

window.FUSEE = {
    currentUser: null,
    userRole: localStorage.getItem('fusee_user_role') || null,
    whitelistedEmails: [],
    data: {
        peerTutoring: [],
        lostFound: [],
        notices: [],
        events: []
    }
};

// --- Whitelist Utilities (Updated with Section Exclusions) ---
function parseWhitelistData(data) {
    if (!data || typeof data !== 'object') return [];

    const extractedSet = new Set();

    // Ignore public site content sections so public contact/org emails are not scraped
    const ignoredKeys = new Set([
        'sys1', 'sys2', 'sys3', 'weeklyschedule', 'activityevents', 'banner', 
        'notices', 'faqs', 'officers', 'events', 'academiclinks', 'eedept', 
        'merchitems', 'paymentinfo', 'labpolicies', 'capstoneitems', 
        'lostandfound', 'qpisubjects', 'peertutoring', 'importantevents', 
        'fuseeinfo', 'tickertext', 'globalstatus'
    ]);

    function collectEmails(val) {
        if (!val) return;
        if (typeof val === 'string') {
            const tokens = val.split(/[\r\n,;\s]+/);
            for (let t of tokens) {
                const cleaned = t.trim().toLowerCase().replace(/^["']|["']$/g, '');
                if (cleaned.length > 0 && cleaned.includes('@')) {
                    extractedSet.add(cleaned);
                }
            }
        } else if (Array.isArray(val)) {
            for (let item of val) collectEmails(item);
        } else if (typeof val === 'object') {
            for (let [k, v] of Object.entries(val)) {
                const cleanKey = k.trim().toLowerCase();
                if (cleanKey.includes('@')) {
                    extractedSet.add(cleanKey);
                }
                collectEmails(v);
            }
        }
    }

    // 1. Look for explicit whitelist field keys first (e.g., eeWhitelistedStudentEmails)
    const whitelistFields = ['whitelist', 'whitelistedemails', 'approvedemails', 'allowedusers', 'eestudents', 'eewhitelistedstudentemails'];
    let foundExplicit = false;

    for (let [k, v] of Object.entries(data)) {
        const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (whitelistFields.some(f => cleanK.includes(f))) {
            collectEmails(v);
            foundExplicit = true;
        }
    }

    // 2. Fallback: Sweep non-content root keys (e.g. numeric keys 101, 102...)
    if (!foundExplicit) {
        for (let [k, v] of Object.entries(data)) {
            const cleanK = k.trim().toLowerCase();
            if (!ignoredKeys.has(cleanK)) {
                collectEmails(v);
            }
        }
    }

    const parsed = Array.from(extractedSet);
    window.whitelistedEmails = parsed;
    if (window.FUSEE) window.FUSEE.whitelistedEmails = parsed;

    return parsed;
}

function checkIsWhitelisted(email) {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim().replace(/^["']|["']$/g, '');
    
    // 1. Official Domain Prerequisite
    if (!cleanEmail.endsWith("@addu.edu.ph")) {
        return false;
    }

    // 2. Explicit Database Whitelist Verification
    const list = window.whitelistedEmails || window.FUSEE?.whitelistedEmails || [];
    
    if (Array.isArray(list) && list.length > 0) {
        return list.some(item => {
            if (!item) return false;
            let str = typeof item === 'object' 
                ? (item.email || item.value || item.userEmail || item.mail || item.address || '') 
                : item.toString();
            str = str.trim().toLowerCase().replace(/^["']|["']$/g, '');
            return str === cleanEmail;
        });
    }

    // 3. Fallback: Allow @addu.edu.ph users if directory is not yet populated
    return true;
}

window.parseWhitelistData = parseWhitelistData;
window.checkIsWhitelisted = checkIsWhitelisted;

// --- Access & UI Visibility Guards ---
function updateHeaderUserBadge() {
    const badgeEl = document.getElementById('user-badge-display');
    if (!badgeEl) return;

    const activeRole = window.userRole || window.FUSEE?.userRole || localStorage.getItem('fusee_user_role');

    if (activeRole === 'EE') {
        badgeEl.innerHTML = `
            <button onclick="handleSignOut()" 
                    style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2px 8px; border-radius: 8px; background-color: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; font-size: 9px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s ease;">
                <i class="fa-solid fa-right-from-bracket" style="font-size: 8px;"></i>
                <span>Log Out</span>
            </button>
        `;
    } else {
        badgeEl.innerHTML = `
            <button onclick="resetAccessRole()" 
                    style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2px 8px; border-radius: 8px; background-color: rgba(0, 240, 255, 0.15); border: 1px solid rgba(0, 240, 255, 0.3); color: #00F0FF; font-size: 9px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s ease;">
                <i class="fa-solid fa-right-to-bracket" style="font-size: 8px;"></i>
                <span>Sign In</span>
            </button>
        `;
    }
}
window.updateHeaderUserBadge = updateHeaderUserBadge;

window.checkGatewayStatus = function() {
    const modal = document.getElementById('entry-gateway-modal');
    if (!modal) return;

    const storedRole = localStorage.getItem('fusee_user_role');
    const activeRole = window.userRole || window.FUSEE?.userRole || storedRole;

    if (activeRole === 'EE' || activeRole === 'SPECTATOR') {
        modal.classList.add('hidden');
        updateHeaderUserBadge();
    } else {
        modal.classList.remove('hidden');
    }
};

window.checkEEAccess = function(featureName = "this feature", event = null) {
    const role = window.userRole || window.FUSEE?.userRole || localStorage.getItem('fusee_user_role');
    const user = window.currentUser || window.FUSEE?.currentUser || auth?.currentUser;

    // MUST have role 'EE' AND an active authenticated user session
    if (role === 'EE' && user && user.email) {
        return true;
    }

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (typeof showToast === 'function') {
        showToast(`Access Restricted: ${featureName} is reserved for EE Students.`, "warning");
    } else {
        alert(`Access Restricted: ${featureName} is reserved for EE Students.`);
    }
    return false;
};

// --- Target Grade Calculation Helpers ---
window.updateMidtermSubBreakdown = function() {
    const rawScore = parseFloat(document.getElementById('tg-subMT-dept-raw')?.value);
    const totalItems = parseFloat(document.getElementById('tg-subMT-dept-total')?.value) || 100;
    const topicRawPct = parseFloat(document.getElementById('tg-subMT-topic-raw')?.value);

    const deptBadge = document.getElementById('tg-mtDeptTransmutedBadge');
    const topicBadge = document.getElementById('tg-mtTopicTransmutedBadge');
    const mtMainInput = document.getElementById('tg-gradeMT');

    let deptTransmuted = null;
    if (!isNaN(rawScore) && totalItems > 0) {
        const rawPct = Math.min(100, Math.max(0, (rawScore / totalItems) * 100));
        deptTransmuted = 40 + (0.60 * rawPct);
        if (deptBadge) deptBadge.textContent = `40-Base: ${deptTransmuted.toFixed(1)}%`;
    } else if (deptBadge) {
        deptBadge.textContent = `40-Base: --%`;
    }

    let topicTransmuted = null;
    if (!isNaN(topicRawPct)) {
        const topicPct = Math.min(100, Math.max(0, topicRawPct));
        topicTransmuted = 40 + (0.60 * topicPct);
        if (topicBadge) topicBadge.textContent = `40-Base: ${topicTransmuted.toFixed(1)}%`;
    } else if (topicBadge) {
        topicBadge.textContent = `40-Base: --%`;
    }

    if (deptTransmuted !== null || topicTransmuted !== null) {
        const finalDept = deptTransmuted !== null ? deptTransmuted : 40;
        const finalTopic = topicTransmuted !== null ? topicTransmuted : 40;

        const overallMidtermTransmuted = (finalDept * 0.80) + (finalTopic * 0.20);
        if (mtMainInput) {
            mtMainInput.value = overallMidtermTransmuted.toFixed(1);
            if (typeof window.calculateTargetGrade === 'function') {
                window.calculateTargetGrade();
            }
        }
    }
};

window.initTargetGradeEvents = function() {
    ['tg-subMT-dept-raw', 'tg-subMT-dept-total', 'tg-subMT-topic-raw'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.hasMtListener) {
            el.addEventListener('input', window.updateMidtermSubBreakdown);
            el.dataset.hasMtListener = 'true';
        }
    });
};

// --- Auth Action Handlers ---
window.handleEESignIn = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        if (result && result.user) {
            console.log("Logged in successfully as EE Student:", result.user.email);
        }
    } catch (err) {
        console.warn("Popup sign-in failed or blocked, trying redirect fallback:", err);
        try {
            await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
            console.error("Sign-in error:", redirectErr);
        }
    }
};

window.enterAsSpectator = () => {
    window.currentUser = null;
    window.userRole = 'SPECTATOR';
    if (window.FUSEE) {
        window.FUSEE.currentUser = null;
        window.FUSEE.userRole = 'SPECTATOR';
    }
    localStorage.setItem('fusee_user_role', 'SPECTATOR');
    if (typeof showToast === 'function') showToast("Entered in Spectator Mode (Read-Only)", "info");
    window.checkGatewayStatus();
};

window.resetAccessRole = () => {
    localStorage.removeItem('fusee_user_role');
    window.userRole = null;
    window.currentUser = null;
    if (window.FUSEE) {
        window.FUSEE.userRole = null;
        window.FUSEE.currentUser = null;
    }
    if (auth && auth.currentUser) signOut(auth);
    location.reload();
};
window.handleSignOut = async () => {
    try {
        if (auth && auth.currentUser) {
            await signOut(auth);
        }
    } catch (err) {
        console.error("Error signing out:", err);
    } finally {
        // Clear stored role and global state
        localStorage.removeItem('fusee_user_role');
        window.currentUser = null;
        window.userRole = null;
        if (window.FUSEE) {
            window.FUSEE.currentUser = null;
            window.FUSEE.userRole = null;
        }
        
        // Show login modal & update badge UI
        const loginModal = document.getElementById('entry-gateway-modal');
        if (loginModal) loginModal.classList.remove('hidden');
        
        window.updateHeaderUserBadge();
    }
};
// --- Consolidated Auth State Listener ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const email = user.email || '';
        
        // 1. Fetch & Store Whitelist Array globally if not populated yet
        let list = window.whitelistedEmails || window.FUSEE?.whitelistedEmails || [];
        if (!Array.isArray(list) || list.length === 0) {
            try {
                const docSnap = await getDoc(doc(db, "fusee_hub", "landing_content"));
                if (docSnap.exists()) {
                    list = parseWhitelistData(docSnap.data());
                }
            } catch (err) {
                console.error("Error fetching whitelist data during auth check:", err);
            }
        }
        
        // 2. Uniform Whitelist Verification
        const isWhitelisted = checkIsWhitelisted(email);
        
        if (isWhitelisted) {
            window.currentUser = user;
            window.userRole = 'EE';
            if (window.FUSEE) {
                window.FUSEE.currentUser = user;
                window.FUSEE.userRole = 'EE';
            }
            localStorage.setItem('fusee_user_role', 'EE');

            const loginModal = document.getElementById('entry-gateway-modal');
            if (loginModal) loginModal.classList.add('hidden');

            console.log("Logged in successfully as EE Student:", email);

        } else {
            const cleanEmail = email.toLowerCase().trim();
            const isAdDUEmail = cleanEmail.endsWith("@addu.edu.ph");
            const reason = !isAdDUEmail
                ? "Sign-in requires an official @addu.edu.ph email address."
                : `Your account (${email}) is not listed in the active EE student directory.`;
            
            alert(`Access Restricted: ${reason}\n\nYou will enter the app in Spectator (Guest) mode.`);
            
            window.currentUser = null;
            window.userRole = 'SPECTATOR';
            if (window.FUSEE) {
                window.FUSEE.currentUser = null;
                window.FUSEE.userRole = 'SPECTATOR';
            }
            localStorage.setItem('fusee_user_role', 'SPECTATOR');
            
            // Hide login modal & enter Spectator mode cleanly without triggering signOut loop
            const loginModal = document.getElementById('entry-gateway-modal');
            if (loginModal) loginModal.classList.add('hidden');
        }
    } else {
        window.currentUser = null;
        if (window.FUSEE) window.FUSEE.currentUser = null;
        
        const storedRole = localStorage.getItem('fusee_user_role');
        window.userRole = storedRole === 'SPECTATOR' ? 'SPECTATOR' : null;
        if (window.FUSEE) window.FUSEE.userRole = window.userRole;
    }

    // Refresh UI components
    window.checkGatewayStatus();
    if (typeof window.initTargetGradeEvents === 'function') window.initTargetGradeEvents();
    if (typeof window.renderLostFoundUI === 'function') window.renderLostFoundUI();
    if (typeof window.renderPeerTutoringUI === 'function') window.renderPeerTutoringUI();
    if (typeof window.renderTutorManagementUI === 'function') window.renderTutorManagementUI();
});

// --- Consolidated Real-Time Firestore Sync Listener ---
onSnapshot(doc(db, "fusee_hub", "landing_content"), async (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();

    parseWhitelistData(data);

    // Live revoking: only check after whitelist array has loaded
    if (window.currentUser && localStorage.getItem('fusee_user_role') === 'EE') {
        const userEmail = window.currentUser.email || '';
        if (window.whitelistedEmails.length > 0 && !checkIsWhitelisted(userEmail)) {
            console.warn(`Revoking EE role for non-whitelisted email: ${userEmail}`);
            window.currentUser = null;
            window.userRole = 'SPECTATOR';
            if (window.FUSEE) {
                window.FUSEE.currentUser = null;
                window.FUSEE.userRole = 'SPECTATOR';
            }
            localStorage.setItem('fusee_user_role', 'SPECTATOR');
            alert(`Access Restricted: Your email (${userEmail}) is no longer listed in the EE directory. Switched to Spectator Mode.`);
        }
    }

    // Ticker & Global Status Sync
    if (data.tickerText) {
        const tickerEl = document.getElementById('announcement-text');
        if (tickerEl) tickerEl.textContent = data.tickerText;
    }

    if (data.globalStatus && typeof window.setGlobalStatusUI === 'function') {
        window.setGlobalStatusUI(data.globalStatus);
    }

    // Systems 01, 02, 03 Sync
    ['sys1', 'sys2', 'sys3'].forEach((sysKey, idx) => {
        const num = idx + 1;
        const sysData = data[sysKey];
        if (sysData) {
            const tag = document.getElementById(`sys${num}-display-tag`);
            if (tag && sysData.tag) tag.textContent = sysData.tag;

            const title = document.getElementById(`sys${num}-display-title`);
            if (title && sysData.title) title.textContent = sysData.title;

            const desc = document.getElementById(`sys${num}-display-desc`);
            if (desc && sysData.description) desc.textContent = sysData.description;

            const loc = document.getElementById(`sys${num}-display-location`);
            if (loc && sysData.location) loc.textContent = sysData.location;

            const hours = document.getElementById(`sys${num}-display-hours`);
            if (hours && sysData.hours) hours.textContent = sysData.hours;

            const modalHours = document.getElementById(`sys${num}-modal-hours`);
            if (modalHours && sysData.hours) modalHours.textContent = sysData.hours;

            const url = document.getElementById(`sys${num}-display-url`) || document.getElementById(`sys${num}-display-student-url`);
            if (url && (sysData.url || sysData.studentUrl)) url.href = sysData.url || sysData.studentUrl;

            const rules = document.getElementById(`sys${num}-display-rules`);
            if (rules && (sysData.guidelinesContent || sysData.policiesContent)) {
                rules.innerHTML = sysData.guidelinesContent || sysData.policiesContent;
            }
        }
    });

    // Room Schedules & Statuses
    if (data.weeklySchedule) window.allWeeklySchedule = data.weeklySchedule;
    if (data.activityEvents) window.allActivityEvents = data.activityEvents;
    if (typeof window.evaluateLiveRoomStatuses === 'function') window.evaluateLiveRoomStatuses();
    if (typeof window.refreshAllSystemStatuses === 'function') window.refreshAllSystemStatuses();

    // Hero Banner
    if (data.banner) {
        const title = document.getElementById('banner-display-title');
        if (title && data.banner.title) title.textContent = data.banner.title;
        const body = document.getElementById('banner-display-body');
        if (body && data.banner.body) body.textContent = `"${data.banner.body}"`;
    }

    // Notices
    if (data.notices && Array.isArray(data.notices)) {
        window.allNoticesData = data.notices;
        if (typeof window.renderNoticesUI === 'function') window.renderNoticesUI();
    }

    // FAQs Accordion
    if (data.faqs && Array.isArray(data.faqs)) {
        const faqContainers = document.querySelectorAll('#faq-display-container, .faq-display-container');
        faqContainers.forEach(faqContainer => {
            faqContainer.innerHTML = data.faqs.map(item => `
                <details class="group p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <summary class="font-semibold text-white cursor-pointer list-none flex justify-between items-center">
                        <span class="text-xs md:text-sm">${item.q}</span>
                        <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 group-open:rotate-180 transition"></i>
                    </summary>
                    <p class="mt-2 text-[11px] md:text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-2">
                        ${item.a}
                    </p>
                </details>
            `).join('');
        });
    }

    // Officers
    if (data.officers && Array.isArray(data.officers)) {
        window.allOfficersData = data.officers;
        if (typeof window.renderOfficersUI === 'function') window.renderOfficersUI();
    }

    // Upcoming Events
    if (data.events && Array.isArray(data.events)) {
        const container = document.getElementById('events-display-container');
        if (container) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcomingEvents = data.events.filter(event => {
                if (!event.date) return true;
                const eventDate = new Date(typeof event.date === 'string' ? event.date.replace(/-/g, '/') : event.date);
                if (isNaN(eventDate.getTime())) return true;
                eventDate.setHours(23, 59, 59, 999);
                return eventDate >= today;
            });

            if (upcomingEvents.length === 0) {
                container.innerHTML = `<p class="text-[10px] text-slate-400 italic p-2">No upcoming events scheduled.</p>`;
            } else {
                container.innerHTML = upcomingEvents.map(event => {
                    const hasLink = event.link && event.link.trim() !== '';
                    return `
                        <${hasLink ? `a href="${event.link}" target="_blank" rel="noopener noreferrer" onclick="return checkEEAccess('Event Registration', event)"` : 'div'} 
                            class="block p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs ${hasLink ? 'hover:border-fusee-cyan/50 hover:bg-slate-800/80 transition-all cursor-pointer' : ''}">
                            <div class="flex justify-between font-semibold text-white">
                                <span>⚡ ${event.title || 'Upcoming Event'}</span>
                                <span class="text-fusee-cyan text-[10px]">${event.location || ''}</span>
                            </div>
                            <div class="flex items-center justify-between mt-1">
                                <p class="text-[10px] text-slate-400">${event.date || 'Upcoming FUSEE event'}</p>
                                ${hasLink ? `<span class="text-[10px] font-bold text-fusee-cyan underline flex items-center gap-1">Register <i class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i></span>` : ''}
                            </div>
                        </${hasLink ? 'a' : 'div'}>
                    `;
                }).join('');
            }
        }
    }

    // Academic Drive Links
    if (data.academicLinks && Array.isArray(data.academicLinks)) {
        const driveContainer = document.getElementById('academic-drive-display-container');
        if (driveContainer) {
            if (data.academicLinks.length === 0) {
                driveContainer.innerHTML = `<span class="text-[10px] text-slate-400 italic col-span-2">No resource links available.</span>`;
            } else {
                driveContainer.innerHTML = data.academicLinks.map(link => `
                    <a href="${link.url || '#'}" target="_blank" rel="noopener noreferrer" class="p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-fusee-yellow text-slate-300 flex items-center gap-2 truncate">
                        <i class="fa-solid fa-file-pdf text-rose-400"></i>
                        <span class="truncate">${link.title || 'Academic Link'}</span>
                    </a>
                `).join('');
            }
        }
    }

    // EE Department
    if (data.eeDept) {
        const desc = document.getElementById('ee-dept-display-desc');
        if (desc && data.eeDept.description) desc.textContent = data.eeDept.description;

        const chairName = document.getElementById('ee-dept-chair-name');
        if (chairName && data.eeDept.chairName) chairName.textContent = data.eeDept.chairName;

        const chairDetails = document.getElementById('ee-dept-chair-details');
        if (chairDetails && data.eeDept.chairDetails) chairDetails.textContent = data.eeDept.chairDetails;

        const custodianName = document.getElementById('ee-dept-custodian-name');
        if (custodianName && data.eeDept.custodianName) custodianName.textContent = data.eeDept.custodianName;

        const custodianDetails = document.getElementById('ee-dept-custodian-details');
        if (custodianDetails && data.eeDept.custodianDetails) custodianDetails.textContent = data.eeDept.custodianDetails;

        if (data.eeDept.faculty && Array.isArray(data.eeDept.faculty)) {
            const facContainer = document.getElementById('ee-dept-faculty-container');
            if (facContainer) {
                facContainer.innerHTML = data.eeDept.faculty.map(f => `
                    <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-fusee-cyan/40 transition flex items-center space-x-2.5">
                        <div class="w-9 h-9 rounded-lg bg-fusee-cyan/15 border border-fusee-cyan/30 text-fusee-cyan flex items-center justify-center text-[10px] flex-shrink-0 overflow-hidden">
                            ${f.imageUrl ? `
                                <img src="${f.imageUrl}" alt="${f.name}" class="w-full h-full object-cover object-top" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid fa-user-tie\\'></i>';">
                            ` : `
                                <i class="fa-solid fa-user-tie"></i>
                            `}
                        </div>
                        <div class="min-w-0 flex-1">
                            <h5 class="font-bold text-white text-[11px] truncate leading-tight">${f.name || 'Engr. Faculty Member'}</h5>
                            <p class="text-[9px] text-fusee-cyan font-medium truncate">${f.specialization || 'Part-time Faculty'}</p>
                        </div>
                    </div>
                `).join('');
            }
        }

        if (data.eeDept.facilities && Array.isArray(data.eeDept.facilities)) {
            const facilContainer = document.getElementById('ee-dept-facilities-container');
            if (facilContainer) {
                facilContainer.innerHTML = data.eeDept.facilities.map(f => `
                    <li class="flex items-center space-x-2 py-1 border-b border-slate-800/60 last:border-0">
                        <span class="font-bold text-fusee-cyan font-techno text-[10px] tracking-wider bg-fusee-cyan/10 px-2 py-0.5 rounded border border-fusee-cyan/30 flex-shrink-0">
                            ${f.code || ''}
                        </span>
                        <span class="text-slate-300 text-xs font-medium">${f.description || ''}</span>
                    </li>
                `).join('');
            }
        }
    }

    // Merch & Payment Info
    if (data.merchItems && Array.isArray(data.merchItems)) {
        window.currentMerchItems = data.merchItems;
        if (typeof window.renderMerchUI === 'function') window.renderMerchUI();
    }
    
    if (data.paymentInfo) {
        window.paymentInfo = {
            name: data.paymentInfo.name || "FUSEE Treasurer",
            number: data.paymentInfo.number || "N/A",
            qrUrl: data.paymentInfo.qr || ""
        };
    }

    // Lab Policies Accordion
    if (data.labPolicies && Array.isArray(data.labPolicies)) {
        const colors = ['fusee-cyan', 'fusee-yellow', 'fusee-magenta', 'fusee-purple', 'emerald-400'];
        const icons = ['fa-shield', 'fa-clock', 'fa-pen-to-square', 'fa-circle-info', 'fa-triangle-exclamation'];

        const renderAccordionItem = (item, idx) => {
            const color = colors[idx % colors.length];
            const icon = icons[idx % icons.length];
            let formattedContent = item.content || '';
            formattedContent = formattedContent.replace(/^([0-9]+\.\s*[^:\n]+:)/gm, `<strong class="text-${color} font-extrabold tracking-wide block mb-1">$1</strong>`);

            return `
                <details class="group p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 transition hover:border-${color}/40">
                    <summary class="font-extrabold text-white cursor-pointer list-none flex justify-between items-center select-none">
                        <span class="text-xs md:text-sm flex items-center gap-2 text-${color}">
                            <i class="fa-solid ${icon} text-xs"></i> 
                            <span class="text-white font-extrabold">${item.title || 'Policy Rule'}</span>
                        </span>
                        <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 group-open:rotate-180 transition-transform duration-200"></i>
                    </summary>
                    <div class="mt-2.5 text-xs leading-relaxed text-slate-100 whitespace-pre-line border-t border-slate-800/80 pt-2.5 font-normal">
                        ${formattedContent}
                    </div>
                </details>
            `;
        };

        const modalContainer = document.getElementById('lab-policies-display-container');
        if (modalContainer) {
            modalContainer.innerHTML = `<div class="space-y-2.5">${data.labPolicies.map((item, idx) => renderAccordionItem(item, idx)).join('')}</div>`;
        }

        const tab4Container = document.getElementById('tab4-lab-policies-container');
        if (tab4Container) {
            tab4Container.innerHTML = `<div class="space-y-2.5">${data.labPolicies.map((item, idx) => renderAccordionItem(item, idx)).join('')}</div>`;
        }
    }

    // Capstones
    if (data.capstoneItems && Array.isArray(data.capstoneItems)) {
        window.allCapstoneData = data.capstoneItems;
        if (typeof window.renderCapstonesUI === 'function') window.renderCapstonesUI();
    }

    // Lost & Found
    if (data.lostAndFound && Array.isArray(data.lostAndFound)) {
        window.allLostFoundData = data.lostAndFound;
        if (window.FUSEE?.data) window.FUSEE.data.lostFound = data.lostAndFound;
        if (typeof window.renderLostFoundUI === 'function') window.renderLostFoundUI();
    }

    // QPI Directory
    if (data.qpiSubjects && Array.isArray(data.qpiSubjects)) {
        window.allQpiSubjectsData = data.qpiSubjects;
    } else if (data.qpisubjects && Array.isArray(data.qpisubjects)) {
        window.allQpiSubjectsData = data.qpisubjects;
    }

    // Peer Tutoring
    if (data.peerTutoring && Array.isArray(data.peerTutoring)) {
        window.allPeerTutoringData = data.peerTutoring;
        if (window.FUSEE?.data) window.FUSEE.data.peerTutoring = data.peerTutoring;
        if (typeof window.renderPeerTutoringUI === 'function') window.renderPeerTutoringUI();
        if (typeof window.renderTutorManagementUI === 'function') window.renderTutorManagementUI();
    }

    // Important Events
    if (data.importantEvents && Array.isArray(data.importantEvents)) {
        window.allImportantEventsData = data.importantEvents;
        if (typeof window.renderImportantEventsUI === 'function') window.renderImportantEventsUI();
    }
// Safely update badge and status when Firebase is ready
    if (typeof window.updateHeaderUserBadge === 'function') {
        window.updateHeaderUserBadge();
    }
    if (typeof window.checkGatewayStatus === 'function') {
        window.checkGatewayStatus();
    }
    window.dispatchEvent(new CustomEvent('fusee-firebase-ready'));
});