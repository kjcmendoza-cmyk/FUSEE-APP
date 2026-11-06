function getCurrentUser() {
    return window.currentUser || window.FUSEE?.currentUser || null;
}
// Global sign-in bridge for whitelist checks
window.loginWithAdDU = function() {
    if (typeof window.handleEESignIn === 'function') {
        window.handleEESignIn();
    } else if (typeof handleEESignIn === 'function') {
        handleEESignIn();
    } else {
        console.error("Sign-in function 'handleEESignIn' is not available in global scope.");
    }
};
// Lost & Found Bulletin Board JavaScript Engine
    let currentLFFilter = 'all';

    window.setLostFoundFilter = function(cat, evt) {
        currentLFFilter = cat;
        document.querySelectorAll('.lf-pill').forEach(btn => {
            btn.className = 'lf-pill px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium flex-shrink-0';
        });
        if (evt && evt.target) {
            evt.target.className = 'lf-pill px-3 py-1 rounded-lg bg-rose-500 text-white font-bold flex-shrink-0';
        }
        window.renderLostFoundUI();
    };

    window.renderLostFoundUI = function() {
    const container = document.getElementById('lost-found-display-container');
    if (!container) return;

    const items = window.FUSEE.data.lostFound || [];
    const searchVal = (document.getElementById('lf-search-input')?.value || '').toLowerCase();

    const filtered = items.filter(item => {
        const isReturned = item.status === 'RETURNED';
        
        // Exclude returned items from 'lost' and 'found' tabs
        const matchesCat = currentLFFilter === 'all' || 
                           (currentLFFilter === 'lost' && item.type === 'LOST' && !isReturned) ||
                           (currentLFFilter === 'found' && (item.type === 'FOUND' || item.type === 'OFFICIAL') && !isReturned) ||
                           (currentLFFilter === 'returned' && isReturned);

        const matchesSearch = !searchVal ||
            (item.title && item.title.toLowerCase().includes(searchVal)) ||
            (item.location && item.location.toLowerCase().includes(searchVal)) ||
            (item.description && item.description.toLowerCase().includes(searchVal)) ||
            (item.contact && item.contact.toLowerCase().includes(searchVal));
            
        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-6 col-span-2">No lost or found reports match your search criteria.</p>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        let badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
        let badgeText = '🔴 LOST / LOOKING';

        if (item.status === 'RETURNED') {
            badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            badgeText = '🟢 RETURNED / CLAIMED';
        } else if (item.type === 'FOUND' || item.type === 'OFFICIAL') {
            badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            badgeText = '🟡 FOUND / AT R202B';
        }

        const photoHtml = item.imageUrl ? `
            <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative group flex items-center justify-center">
                <img src="${item.imageUrl}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            </div>
        ` : `
            <div class="w-full aspect-video rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-[10px]">
                <i class="fa-solid fa-box-open text-2xl text-rose-400/30 mb-1"></i>
                <span>No Photo Provided</span>
            </div>
        `;

        // Check ownership and status
        const isOwner = window.FUSEE.currentUser && item.ownerEmail && window.FUSEE.currentUser.email === item.ownerEmail;
        const isReturned = item.status === 'RETURNED';

        return `
            <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 hover:border-rose-400/40 transition flex flex-col justify-between">
                <div class="space-y-2">
                    ${photoHtml}
                    <div class="flex items-center justify-between gap-1">
                        <span class="px-2 py-0.5 rounded-full text-[8px] font-bold font-techno border ${badgeColor}">
                            ${badgeText}
                        </span>
                        <span class="text-[9px] text-slate-400 font-medium">
                            <i class="fa-solid fa-location-dot text-rose-400 mr-1"></i>${item.location || 'R202B'}
                        </span>
                    </div>
                    <h4 class="font-bold text-white text-xs leading-snug">${item.title || 'Untitled Item'}</h4>
                    ${item.date ? `<p class="text-[9px] text-slate-400"><i class="fa-regular fa-clock mr-1"></i>Logged: ${item.date}</p>` : ''}
                    <p class="text-[10px] text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        ${item.description || 'No additional details.'}
                    </p>
                </div>

                <div class="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                    <span>Contact: <strong class="text-white">${item.contact || 'Room R202B Desk'}</strong></span>
                    <div class="flex items-center gap-2">
                        ${isOwner ? (
                            isReturned ? `
                                <span class="text-emerald-400 font-bold flex items-center gap-1">
                                    <i class="fa-solid fa-circle-check"></i> Claimed
                                </span>
                            ` : `
                                <button onclick="markLostFoundClaimed('${item.id}')" class="text-emerald-400 hover:text-emerald-300 font-bold transition flex items-center gap-1">
                                    <i class="fa-solid fa-circle-check"></i> Mark as Claimed
                                </button>
                            `
                        ) : ''}
                        <span class="text-rose-400 font-bold">Present AdDU ID</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};
window.markLostFoundClaimed = async function(itemId) {
    const list = window.allLostFoundData || window.FUSEE?.data?.lostFound || [];
    const item = list.find(i => i.id == itemId);
    if (!item) return;

    const user = window.currentUser;
    if (!user || (item.ownerEmail && item.ownerEmail !== user.email)) {
        alert("Only the user who posted this report can mark it as claimed/returned.");
        return;
    }

    // Replaces browser popup with your styled cyber modal
    const confirmed = await window.showConfirm(
        "Are you sure you want to mark this item as claimed / returned?",
        "Mark Item as Claimed",
        "fa-box-archive"
    );

    if (confirmed) {
        item.status = 'RETURNED';

        try {
            const db = window.db;
            const docRef = window.doc(db, "fusee_hub", "landing_content");
            await window.updateDoc(docRef, {
                lostAndFound: window.allLostFoundData
            });

            if (typeof window.renderLostFoundUI === 'function') {
                window.renderLostFoundUI();
            }
            alert("Report successfully marked as Claimed / Returned!");
        } catch (err) {
            console.error("Error updating report status:", err);
            alert("Failed to update status on server: " + err.message);
        }
    }
};

window.removeTutorListing = async function(itemId) {
    const list = window.allPeerTutoringData || [];
    const item = list.find(i => i.id === itemId || i.id == itemId);
    if (!item) return;

    const user = window.currentUser;
    if (user && item.ownerEmail && item.ownerEmail !== user.email) {
        alert("Only the owner can remove this listing.");
        return;
    }

    const confirmed = await window.showConfirm(
        "Are you sure you want to delete this tutor request?",
        "Delete Tutor Request",
        "fa-trash"
    );

    if (confirmed) {
        window.allPeerTutoringData = list.filter(i => i.id !== itemId && i.id != itemId);

        try {
            const db = window.db;
            const docRef = window.doc(db, "fusee_hub", "landing_content");
            await window.updateDoc(docRef, {
                peerTutoring: window.allPeerTutoringData
            });

            if (typeof window.renderPeerTutoringUI === 'function') window.renderPeerTutoringUI();
        } catch (err) {
            console.error("Error updating Firestore:", err);
            alert("Failed to sync deletion with server.");
        }
    }
};
        async function handleStudentReportSubmit(e) {
    if (e) e.preventDefault();

    // 1. Validate Whitelist & Login
    const user = await checkUserWhitelisted();
    if (!user) return;

    const typeSelect = document.getElementById('rpt-type');
    const rawType = typeSelect ? typeSelect.value : 'LOST';
    const reportType = rawType.toUpperCase().includes('FOUND') ? 'FOUND' : 'LOST';

    const title = document.getElementById('rpt-title')?.value.trim() || 'Untitled Item';
    const location = document.getElementById('rpt-location')?.value.trim() || 'N/A';
    const date = document.getElementById('rpt-date')?.value || new Date().toISOString().split('T')[0];
    const description = document.getElementById('rpt-desc')?.value.trim() || '';
    const contact = document.getElementById('rpt-contact')?.value.trim() || user.email;

    const newReport = {
        id: Date.now(),
        type: reportType,
        status: 'UNCLAIMED',
        title: title,
        location: location,
        description: description,
        contact: contact,
        ownerEmail: user.email,
        date: date
    };

    // Ensure array references stay synchronized
    if (!window.allLostFoundData) window.allLostFoundData = [];
    if (!window.FUSEE.data.lostFound) window.FUSEE.data.lostFound = window.allLostFoundData;

    window.allLostFoundData.unshift(newReport);
    if (window.FUSEE.data.lostFound !== window.allLostFoundData) {
        window.FUSEE.data.lostFound.unshift(newReport);
    }

    try {
        const db = window.db;
        const docRef = window.doc(db, "fusee_hub", "landing_content");
        await window.updateDoc(docRef, {
            lostAndFound: window.allLostFoundData
        });

        if (typeof window.renderLostFoundUI === 'function') {
            window.renderLostFoundUI();
        }

        const form = document.getElementById('student-report-form');
        if (form) form.reset();

        closeModal('report-item-modal');
        alert("Report submitted successfully! Linked to " + user.email);
    } catch (err) {
        console.error("Error saving Lost & Found report to Firestore:", err);
        alert("Failed to save report to server: " + err.message);
    }
}

        // Automatic Operating Hours to OPEN/CLOSED Status Calculator
        function parseTimeStringToMinutes(timeStr) {
            if (!timeStr) return null;
            const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (!match) return null;
            let [_, hours, minutes, period] = match;
            hours = parseInt(hours, 10);
            minutes = parseInt(minutes, 10);
            if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        }

        function updateBadgeFromHours(hoursStr, badgeId) {
            const badgeEl = document.getElementById(badgeId);
            if (!badgeEl || !hoursStr) return;

            const parts = hoursStr.split('-');
            if (parts.length !== 2) return;

            const startMins = parseTimeStringToMinutes(parts[0]);
            const endMins = parseTimeStringToMinutes(parts[1]);

            if (startMins === null || endMins === null) return;

            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();

            if (currentMins >= startMins && currentMins < endMins) {
                badgeEl.className = 'status-badge px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1';
                badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> OPEN NOW';
            } else {
                badgeEl.className = 'status-badge px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1';
                badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> CLOSED';
            }
        }

        window.refreshAllSystemStatuses = function() {
            const sys1Hours = document.getElementById('sys1-display-hours')?.textContent;
            const sys2Hours = document.getElementById('sys2-display-hours')?.textContent;
            const sys3Hours = document.getElementById('sys3-display-hours')?.textContent;

            if (sys1Hours) updateBadgeFromHours(sys1Hours, 'sys1-status-badge');
            if (sys2Hours) updateBadgeFromHours(sys2Hours, 'sys2-status-badge');
            if (sys3Hours) updateBadgeFromHours(sys3Hours, 'sys3-status-badge');
        };

        setInterval(() => {
            if (window.refreshAllSystemStatuses) window.refreshAllSystemStatuses();
            if (window.evaluateLiveRoomStatuses) window.evaluateLiveRoomStatuses();
        }, 30000);


document.addEventListener('DOMContentLoaded', () => {
    // Automatically set timetable dropdown to current day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    const daySelect = document.getElementById('matrix-day-select');
    if (daySelect && daySelect.querySelector(`option[value="${todayName}"]`)) {
        daySelect.value = todayName;
    }

    if (window.refreshAllSystemStatuses) window.refreshAllSystemStatuses();
    if (window.evaluateLiveRoomStatuses) window.evaluateLiveRoomStatuses();
    
    // Attach debounced live search listener
    const tutorSearchInput = document.getElementById('tutoring-search-input');
    if (tutorSearchInput) {
        tutorSearchInput.addEventListener('input', debounce((event) => {
            const searchTerm = event.target.value.trim().toLowerCase();
            
            const filteredTutors = (window.allPeerTutoringData || []).filter(item => 
                item.subject?.toLowerCase().includes(searchTerm) ||
                item.name?.toLowerCase().includes(searchTerm) ||
                item.topic?.toLowerCase().includes(searchTerm)
            );

            if (typeof window.renderPeerTutoringUI === 'function') {
                window.renderPeerTutoringUI(filteredTutors);
            }
        }, 250));
    }
});

        // Live Room Status Evaluator & Matrix Grid Engine
        let activeMatrixRoom = 'ee'; // 'ee' or 'com'

        function timeStrToMinutes(str) {
    if (!str) return 0;
    const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    let [_, h, m, p] = match;
    let hours = parseInt(h, 10);
    let mins = parseInt(m, 10);
    if (p.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (p.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
}

        window.evaluateLiveRoomStatuses = function() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const curDay = days[now.getDay()];
    const curMins = now.getHours() * 60 + now.getMinutes();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const isActivityPeriod = (curDay === 'Monday' || curDay === 'Wednesday') && (curMins >= 15 * 60 && curMins < 18 * 60);

    const schedule = window.allWeeklySchedule || { eeLab: [], comLab: [] };
    const events = window.allActivityEvents || [];

    const evaluateRoom = (roomKey, roomName) => {
        const schedKey = roomKey === 'ee' ? 'eeLab' : (roomKey === 'com' ? 'comLab' : roomKey);
        const classes = (schedule[schedKey] || []).filter(c => c.day === curDay);
        let ongoingClass = null;

        for (let c of classes) {
            const start = timeStrToMinutes(c.startTime);
            const end = timeStrToMinutes(c.endTime);
            if (curMins >= start && curMins < end) {
                ongoingClass = c;
                break;
            }
        }

        if (isActivityPeriod) {
            const event = events.find(e => 
                (e.room === roomKey || e.room === 'both') && 
                (!e.eventDate || e.eventDate === todayStr)
            );

            if (event) {
                return {
                    type: 'EVENT',
                    subject: `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-1">
                            <span class="text-xs font-bold text-white font-display flex items-center gap-1.5">
                                <i class="fa-solid fa-star text-fusee-purple"></i> ${event.eventTitle}
                            </span>
                            <span class="text-[10px] text-fusee-purple font-semibold bg-fusee-purple/15 px-2 py-0.5 rounded-md border border-fusee-purple/30 self-start sm:self-auto">
                                Special Event
                            </span>
                        </div>
                    `,
                    badge: 'bg-fusee-purple/20 text-fusee-purple border-fusee-purple/40',
                    badgeText: 'SPECIAL EVENT',
                    rules: roomKey === 'ee' 
                        ? `Activity Period Event ongoing: ${event.description || 'Rest & study permitted unless occupied by activity.'}`
                        : `Activity Period Event ongoing: Strict quiet zone enforced in ComLab during activities.`
                };
            } else {
                return {
                    type: 'ACTIVITY_FREE',
                    subject: `
                        <div class="mt-1">
                            <span class="text-xs font-bold text-white font-display flex items-center gap-1.5">
                                <i class="fa-solid fa-clock text-fusee-cyan"></i> Activity Period <span class="text-[10px] text-slate-400 font-normal">(3:00 PM - 6:00 PM)</span>
                            </span>
                        </div>
                    `,
                    badge: 'bg-fusee-cyan/20 text-fusee-cyan border-fusee-cyan/40',
                    badgeText: 'ACTIVITY PERIOD',
                    rules: roomKey === 'ee'
                        ? 'Special Activity Period: Free/No class schedule. Students can Rest, Relax, Talk, Study, & do Lab-works.'
                        : 'Special Activity Period: Free/No class schedule. Silent Study Zone: Noise must be controlled even more.'
                };
            }
        } else if (ongoingClass) {
            const accentColor = roomKey === 'ee' ? 'text-fusee-cyan' : 'text-fusee-magenta';
            return {
                type: 'CLASS',
                subject: `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-1">
                        <span class="text-xs font-bold text-white font-display flex items-center gap-1.5 truncate">
                            <i class="fa-solid fa-chalkboard-user ${accentColor}"></i>
                            ${ongoingClass.subjectName}
                        </span>
                        <span class="text-[10px] text-slate-300 font-medium flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-800 flex-shrink-0 self-start sm:self-auto">
                            <i class="fa-solid fa-user-tie ${accentColor}"></i>
                            ${ongoingClass.instructor || 'Faculty Instructor'}
                        </span>
                    </div>
                `,
                badge: roomKey === 'ee' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40',
                badgeText: roomKey === 'ee' ? 'ONGOING CLASS' : 'PROHIBITED / CLASS',
                rules: roomKey === 'ee'
                    ? 'Have a class: Resting & Study of Lab-works allowed, but non-class students should NEVER disrupt the ongoing class.'
                    : 'Have a class: Entering the Computer Lab is STRICTLY PROHIBITED during class hours.'
            };
        } else {
            return {
                type: 'FREE',
                subject: `
                    <div class="mt-1">
                        <span class="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                            <i class="fa-solid fa-circle-check text-emerald-400"></i> No Class Ongoing <span class="text-[10px] text-slate-500">(Vacant)</span>
                        </span>
                    </div>
                `,
                badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                badgeText: roomKey === 'ee' ? 'VACANT / OPEN' : 'SILENT STUDY ZONE',
                rules: roomKey === 'ee'
                    ? 'No Class: Students can Rest, Relax, Talk with fellow EE, Study and Do Lab-works (Keep noise controlled).'
                    : 'No Class: Students can Rest, Relax, Talk, Study & Do Lab-works (Maintain strict silence).'
            };
        }
    };

    const eeState = evaluateRoom('ee', 'EE Laboratory');
    const comState = evaluateRoom('com', 'EE Computer Laboratory');

    // Update EE Lab UI
    const eeBadge = document.getElementById('ee-lab-live-badge');
    const eeSub = document.getElementById('ee-lab-live-subject');
    const eeRules = document.getElementById('ee-lab-live-rules');
    if (eeBadge) {
        eeBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${eeState.badge}`;
        eeBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span> ${eeState.badgeText}`;
    }
    if (eeSub) eeSub.innerHTML = eeState.subject;
    if (eeRules) eeRules.textContent = eeState.rules;

    // Update Com Lab UI
    const comBadge = document.getElementById('com-lab-live-badge');
    const comSub = document.getElementById('com-lab-live-subject');
    const comRules = document.getElementById('com-lab-live-rules');
    if (comBadge) {
        comBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${comState.badge}`;
        comBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span> ${comState.badgeText}`;
    }
    if (comSub) comSub.innerHTML = comState.subject;
    if (comRules) comRules.textContent = comState.rules;

    window.renderMatrixGrid();
};

        window.switchMatrixRoom = function(room) {
            activeMatrixRoom = room;
            const btnEe = document.getElementById('matrix-btn-ee');
            const btnCom = document.getElementById('matrix-btn-com');
            const title = document.getElementById('matrix-room-title');

            if (room === 'ee') {
                btnEe.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold bg-fusee-cyan text-slate-950 transition shadow-neon-cyan';
                btnCom.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:border-fusee-magenta transition';
                if (title) title.textContent = 'R202B EE Laboratory';
            } else {
                btnCom.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold bg-fusee-magenta text-white transition shadow-neon-pink';
                btnEe.className = 'flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:border-fusee-cyan transition';
                if (title) title.textContent = 'R202B EE Computer Laboratory';
            }
            window.renderMatrixGrid();
        };

        // Helper to convert total minutes back to 12-hour formatted string
function minutesTo12H(mins) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return `${hStr}:${mStr} ${period}`;
}

window.renderMatrixGrid = function() {
    const container = document.getElementById('matrix-slots-container');
    const selectDay = document.getElementById('matrix-day-select')?.value || 'Monday';
    if (!container) return;

    const schedule = window.allWeeklySchedule || { eeLab: [], comLab: [] };
    const events = window.allActivityEvents || [];
    const roomKey = activeMatrixRoom === 'ee' ? 'eeLab' : 'comLab';
    const roomClasses = (schedule[roomKey] || []).filter(c => c.day === selectDay);

    let occupied = [];

    // 1. Gather all logged classes
    roomClasses.forEach(c => {
        const start = timeStrToMinutes(c.startTime);
        const end = timeStrToMinutes(c.endTime);
        if (end > start) {
            occupied.push({
                type: 'CLASS',
                start,
                end,
                startTimeStr: c.startTime,
                endTimeStr: c.endTime,
                subjectName: c.subjectName,
                instructor: c.instructor
            });
        }
    });

    // 2. Add Activity Period on Mondays and Wednesdays
    if (selectDay === 'Monday' || selectDay === 'Wednesday') {
        const actEvent = events.find(e => (e.room === (activeMatrixRoom === 'ee' ? 'ee' : 'com') || e.room === 'both'));
        occupied.push({
            type: 'ACTIVITY',
            start: 900,  // 3:00 PM
            end: 1080,   // 6:00 PM
            startTimeStr: '03:00 PM',
            endTimeStr: '06:00 PM',
            actEvent
        });
    }

    // 3. Sort chronologically by start time
    occupied.sort((a, b) => a.start - b.start);

    // 4. Fill timeline from 7:30 AM (450m) to 7:00 PM (1140m)
    const LAB_START = 450;
    const LAB_END = 1140;

    let timeline = [];
    let cursor = LAB_START;

    occupied.forEach(block => {
        if (block.start > cursor) {
            timeline.push({
                type: 'FREE',
                start: cursor,
                end: block.start,
                startTimeStr: minutesTo12H(cursor),
                endTimeStr: minutesTo12H(block.start)
            });
        }

        if (block.end > cursor) {
            const adjustedStart = Math.max(block.start, cursor);
            timeline.push({
                ...block,
                start: adjustedStart,
                startTimeStr: minutesTo12H(adjustedStart)
            });
            cursor = Math.max(cursor, block.end);
        }
    });

    if (cursor < LAB_END) {
        timeline.push({
            type: 'FREE',
            start: cursor,
            end: LAB_END,
            startTimeStr: minutesTo12H(cursor),
            endTimeStr: minutesTo12H(LAB_END)
        });
    }

    // 5. Render HTML
    let html = '';
    timeline.forEach(slot => {
        if (slot.type === 'CLASS') {
            html += `
                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs font-bold font-techno text-fusee-yellow">${slot.startTimeStr} - ${slot.endTimeStr}</span>
                            <span class="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[8px] font-bold border border-amber-500/30">CLASS</span>
                        </div>
                        <h4 class="font-bold text-white text-xs mt-0.5">${slot.subjectName}</h4>
                        <p class="text-[10px] text-slate-400">${slot.instructor || 'Faculty Instructor'}</p>
                    </div>
                </div>
            `;
        } else if (slot.type === 'ACTIVITY') {
            html += `
                <div class="p-3 rounded-xl bg-gradient-to-r from-fusee-cyan/15 via-purple-500/20 to-fusee-magenta/15 border border-fusee-cyan/40 space-y-1">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold text-fusee-cyan font-techno"><i class="fa-solid fa-star text-fusee-yellow mr-1"></i> ${slot.startTimeStr} - ${slot.endTimeStr}</span>
                        <span class="px-2 py-0.5 rounded bg-fusee-cyan/20 text-fusee-cyan font-bold text-[9px] border border-fusee-cyan/30">ACTIVITY PERIOD</span>
                    </div>
                    <p class="font-bold text-white text-xs">${slot.actEvent ? `⚡ SPECIAL EVENT: ${slot.actEvent.eventTitle}` : 'FREE / NO CLASS SCHEDULE (Activity Window)'}</p>
                    <p class="text-[10px] text-slate-300">${slot.actEvent ? (slot.actEvent.description || 'Scheduled FUSEE activity') : 'Open activity window for officers and students.'}</p>
                </div>
            `;
        } else if (slot.type === 'FREE') {
            html += `
                <div class="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between opacity-80">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs font-bold font-techno text-emerald-400">${slot.startTimeStr} - ${slot.endTimeStr}</span>
                            <span class="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-bold border border-emerald-500/30">FREE TIME</span>
                        </div>
                        <p class="font-medium text-slate-300 text-xs mt-0.5"><i class="fa-solid fa-circle-check text-emerald-400 mr-1"></i> Vacant / Open for Free Study</p>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
};

        // Bottom Sheet & Modal Controls
function openModal(modalId) {
    // EE-Only Feature Guard
    const eeOnlyModals = ['merch-modal', 'academic-drive-modal', 'post-tutor-modal', 'report-item-modal', 'tutor-dashboard-modal'];
    if (eeOnlyModals.includes(modalId)) {
        if (typeof window.checkEEAccess === 'function' && !window.checkEEAccess("EE Feature")) {
            return;
        }
    }

    document.querySelectorAll('.bottom-sheet').forEach(sheet => {
        sheet.classList.add('hidden-sheet');
    });

    // Render merch items whenever the merch modal is opened
    if (modalId === 'merch-modal' && typeof window.renderMerchUI === 'function') {
        window.renderMerchUI();
    }

    // Default the Day Select dropdown to Today when opening the Room Schedule Modal
    if (modalId === 'room-schedule-modal') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];
        const daySelect = document.getElementById('room-day-select');

        if (daySelect) {
            daySelect.value = days.includes(todayName) ? todayName : 'Monday';
        }

        if (typeof window.renderMatrixGrid === 'function') {
            window.renderMatrixGrid();
        }
    }

    // Open Backdrop and Modal
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById(modalId);

    if (backdrop && modal) {
        backdrop.classList.remove('hidden');
        setTimeout(() => backdrop.classList.add('opacity-100'), 10);
        modal.classList.remove('hidden-sheet');
    }
}

        function closeModal(modalId) {
            const backdrop = document.getElementById('modal-backdrop');
            const modal = document.getElementById(modalId);

            if (modal) {
                modal.classList.add('hidden-sheet');
            }
            if (backdrop) {
                backdrop.classList.remove('opacity-100');
                setTimeout(() => backdrop.classList.add('hidden'), 300);
            }
        }

        function closeAllModals() {
            const modals = document.querySelectorAll('.bottom-sheet');
            modals.forEach(m => m.classList.add('hidden-sheet'));
            
            const backdrop = document.getElementById('modal-backdrop');
            if (backdrop) {
                backdrop.classList.remove('opacity-100');
                setTimeout(() => backdrop.classList.add('hidden'), 300);
            }
        }

        // Navigation Tab Switcher Handler (View Page Switcher)
        function switchTab(tabId) {
            // Hide all view tab sections
            const views = document.querySelectorAll('.tab-view');
            views.forEach(v => v.classList.add('hidden'));

            // Show selected view section
            const targetView = document.getElementById(`view-${tabId}`);
            if (targetView) {
                targetView.classList.remove('hidden');
            }

            // Update mobile bottom nav active styles
            const mobileTabs = document.querySelectorAll('.nav-tab');
            mobileTabs.forEach(t => {
                t.classList.remove('text-fusee-cyan');
                t.classList.add('text-slate-400');
            });

            const activeMobileTab = document.getElementById(`tab-${tabId}`);
            if (activeMobileTab) {
                activeMobileTab.classList.remove('text-slate-400');
                activeMobileTab.classList.add('text-fusee-cyan');
            }

            // Update desktop header nav active styles
            const desktopTabs = document.querySelectorAll('.desktop-nav-tab');
            desktopTabs.forEach(dt => {
                dt.classList.remove('text-fusee-cyan');
                dt.classList.add('text-slate-300');
            });

            const activeDesktopTab = document.getElementById(`desktop-tab-${tabId}`);
            if (activeDesktopTab) {
                activeDesktopTab.classList.remove('text-slate-300');
                activeDesktopTab.classList.add('text-fusee-cyan');
            }

            // Scroll smoothly to top upon switching tabs
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
// Officers UI Category Filter, Search Logic & Photo Avatar Renderer
let currentOfficerCategory = 'all';

window.renderOfficersUI = function() {
    const data = window.allOfficersData || [];
    const searchVal = (document.getElementById('officer-search')?.value || '').toLowerCase();
    const offContainers = document.querySelectorAll('#officers-display-container, .officers-display-container');

    const filtered = data.filter(o => {
        const matchesCat = currentOfficerCategory === 'all' || 
                           (currentOfficerCategory === 'exec' && (o.category === 'executive' || !o.category)) ||
                           (currentOfficerCategory === 'reps' && o.category === 'reps') ||
                           (currentOfficerCategory === 'cmte' && o.category === 'committees');
        const matchesSearch = !searchVal || 
                              (o.name && o.name.toLowerCase().includes(searchVal)) ||
                              (o.dept && o.dept.toLowerCase().includes(searchVal)) || 
                              (o.title && o.title.toLowerCase().includes(searchVal)) || 
                              (o.email && o.email.toLowerCase().includes(searchVal));
        return matchesCat && matchesSearch;
    });

    const executives = filtered.filter(o => o.category === 'executive' || !o.category);
    const reps = filtered.filter(o => o.category === 'reps');
    const committees = filtered.filter(o => o.category === 'committees');

    // Helper function to build mobile-friendly officer card HTML with photo support
    const createOfficerCard = (off, themeColor, defaultIcon) => {
        const photoSrc = off.imageUrl || off.photo || off.image || '';
        const officerName = off.name || off.dept || 'Officer Name';
        const officerTitle = off.title || 'Position Title';
        const badgeText = off.badge || 'OFFICER';

        return `
            <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-${themeColor}/40 transition flex items-center space-x-3 min-w-0">
                <!-- Officer Photo Avatar -->
                <div class="w-10 h-10 rounded-lg bg-${themeColor}/15 border border-${themeColor}/30 text-${themeColor} flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
                    ${photoSrc ? `
                        <img src="${photoSrc}" alt="${officerName}" class="w-full h-full object-cover object-top" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid ${defaultIcon}\\'></i>';">
                    ` : `
                        <i class="fa-solid ${defaultIcon}"></i>
                    `}
                </div>

                <!-- Officer Information Details -->
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-1 mb-0.5">
                        <h5 class="font-bold text-white text-[11px] leading-tight truncate">${officerName}</h5>
                        <span class="px-1.5 py-0.2 rounded bg-${themeColor}/15 border border-${themeColor}/30 text-${themeColor} font-techno text-[7px] font-bold uppercase tracking-wider flex-shrink-0">
                            ${badgeText}
                        </span>
                    </div>
                    <p class="text-[9.5px] text-${themeColor} font-semibold truncate leading-tight">${officerTitle}</p>
                </div>
            </div>
        `;
    };

    offContainers.forEach(offContainer => {
        let html = '<div class="space-y-4">';

        // 1. Executive Board
        if (executives.length > 0) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-[11px] font-bold font-techno text-fusee-cyan tracking-wider uppercase flex items-center justify-between border-b border-fusee-cyan/20 pb-1">
                        <span class="flex items-center gap-1.5"><i class="fa-solid fa-crown text-amber-400"></i> Executive Board</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-fusee-cyan/10 border border-fusee-cyan/30 text-fusee-cyan">${executives.length}</span>
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${executives.map(off => createOfficerCard(off, 'fusee-cyan', 'fa-user-tie')).join('')}
                    </div>
                </div>`;
        }

        // 2. Batch & Course Reps
        if (reps.length > 0) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-[11px] font-bold font-techno text-orange-500 tracking-wider uppercase flex items-center justify-between border-b border-orange-500/20 pb-1">
                        <span class="flex items-center gap-1.5"><i class="fa-solid fa-user-graduate text-orange-500"></i> Batch & Course Reps</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-500">${reps.length}</span>
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${reps.map(off => createOfficerCard(off, 'orange-500', 'fa-user-graduate')).join('')}
                    </div>
                </div>`;
        }

        // 3. Committees
        if (committees.length > 0) {
            const subCats = [
    { id: 'academics', name: 'Academics & Scholarship', icon: 'fa-graduation-cap', color: 'text-amber-400', theme: 'fusee-yellow', badgeColor: 'bg-amber-400/10 text-amber-300 border-amber-400/30', match: o => o.subCategory === 'academics' || /academic|scholarship/i.test((o.title || '') + (o.dept || '') + (o.name || '')) },
    { id: 'creatives', name: 'Creatives', icon: 'fa-palette', color: 'text-cyan-400', theme: 'fusee-cyan', badgeColor: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30', match: o => o.subCategory === 'creatives' || /creative/i.test((o.title || '') + (o.dept || '') + (o.name || '')) },
    { id: 'documentations', name: 'Documentations', icon: 'fa-camera', color: 'text-sky-400', theme: 'fusee-cyan', badgeColor: 'bg-sky-400/10 text-sky-300 border-sky-400/30', match: o => o.subCategory === 'documentations' || /docu/i.test((o.title || '') + (o.dept || '') + (o.name || '')) },
    { id: 'communications', name: 'Communications', icon: 'fa-bullhorn', color: 'text-pink-400', theme: 'fusee-magenta', badgeColor: 'bg-pink-400/10 text-pink-300 border-pink-400/30', match: o => o.subCategory === 'communications' || /comm/i.test((o.title || '') + (o.dept || '') + (o.name || '')) },
    { id: 'logistics', name: 'Logistics', icon: 'fa-boxes-packing', color: 'text-emerald-400', theme: 'emerald-400', badgeColor: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30', match: o => o.subCategory === 'logistics' || /logi/i.test((o.title || '') + (o.dept || '') + (o.name || '')) },
    { id: 'projects', name: 'FUSEE Projects', icon: 'fa-rocket', color: 'text-purple-400', theme: 'fusee-purple', badgeColor: 'bg-purple-400/10 text-purple-300 border-purple-400/30', match: o => o.subCategory === 'projects' || /project/i.test((o.title || '') + (o.dept || '') + (o.name || '')) }
];

            html += `
                <div class="space-y-3">
                    <h4 class="text-[11px] font-bold font-techno text-fusee-yellow tracking-wider uppercase flex items-center justify-between border-b border-fusee-yellow/20 pb-1">
                        <span class="flex items-center gap-1.5"><i class="fa-solid fa-users-gear text-fusee-yellow"></i> Committees</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-fusee-yellow/10 border border-fusee-yellow/30 text-fusee-yellow">${committees.length}</span>
                    </h4>
                    <div class="space-y-3 pl-1">
            `;

            subCats.forEach(sub => {
                const subMembers = committees.filter(sub.match);
                if (subMembers.length > 0) {
                    html += `
                        <div class="space-y-1.5">
                            <div class="flex items-center space-x-1.5 text-[10px] font-bold ${sub.color}">
                                <i class="fa-solid ${sub.icon}"></i>
                                <span>${sub.name}</span>
                                <span class="text-[8px] px-1.5 py-0.2 rounded ${sub.badgeColor} border">${subMembers.length}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    ${subMembers.map(off => createOfficerCard(off, sub.theme, sub.icon)).join('')}
</div>
                        </div>
                    `;
                }
            });

            // Fallback for unassigned committee members
const unassigned = committees.filter(off => !subCats.some(sub => sub.match(off)));
if (unassigned.length > 0) {
    html += `
        <div class="space-y-1.5">
            <div class="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400">
                <i class="fa-solid fa-users"></i>
                <span>General Committee</span>
                <span class="text-[8px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">${unassigned.length}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${unassigned.map(off => createOfficerCard(off, 'slate-400', 'fa-user')).join('')}
            </div>
        </div>
    `;
}

            html += `</div></div>`;
        }

        if (filtered.length === 0) {
            html = `<p class="text-[11px] text-slate-400 italic p-3 text-center">No matching officers found.</p>`;
        }

        html += '</div>';
        offContainer.innerHTML = html;
    });
};

window.setOfficerCategory = function(cat, evt) {
    currentOfficerCategory = cat;
    document.querySelectorAll('.off-pill').forEach(btn => {
        btn.className = 'off-pill px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium flex-shrink-0';
    });
    if (evt && evt.target) {
        evt.target.className = 'off-pill px-3 py-1 rounded-lg bg-fusee-purple text-white font-bold flex-shrink-0';
    }
    window.renderOfficersUI();
};

window.filterOfficers = function() {
    window.renderOfficersUI();
};
function toggleExpandablePanel(panelId, chevronId) {
    const panel = document.getElementById(panelId);
    const chevron = document.getElementById(chevronId);
    if (panel && chevron) {
        panel.classList.toggle('hidden');
        chevron.classList.toggle('rotate-180');
    }
}
window.renderCapstonesUI = function() {
    const capContainer = document.getElementById('capstone-display-container');
    if (!capContainer) return;
    const items = window.allCapstoneData || [];
    const searchVal = (document.getElementById('capstone-search-input')?.value || '').toLowerCase();

    const filtered = items.filter(item => {
        return !searchVal ||
            (item.title && item.title.toLowerCase().includes(searchVal)) ||
            (item.advisor && item.advisor.toLowerCase().includes(searchVal)) ||
            (item.authors && item.authors.toLowerCase().includes(searchVal)) ||
            (item.abstract && item.abstract.toLowerCase().includes(searchVal));
    });

    if (filtered.length === 0) {
        capContainer.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-6 col-span-2">No capstone projects found matching your search.</p>';
        return;
    }

    capContainer.innerHTML = filtered.map(item => {
        const diagramHtml = item.diagramUrl ? `
            <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative group flex items-center justify-center">
                <img src="${item.diagramUrl}" alt="${item.title || 'Block Diagram'}" class="w-full h-full object-contain p-1 group-hover:scale-105 transition duration-300">
            </div>
        ` : `
    <div class="w-full aspect-video rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-[10px]">
        <i class="fa-solid fa-graduation-cap text-2xl text-fusee-cyan/30 mb-1"></i>
        <span>Capstone Project</span>
    </div>
`;

        const videoBtnHtml = item.videoUrl ? `
    <a href="${item.videoUrl}" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-2 bg-gradient-to-r from-fusee-cyan to-blue-600 text-slate-950 font-bold rounded-xl text-xs hover:from-cyan-400 hover:to-blue-500 transition shadow-neon-cyan mt-2">
        <i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i> View Capstone Project
    </a>
` : '';

        return `
            <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 hover:border-fusee-cyan/50 transition flex flex-col justify-between">
                <div class="space-y-2">
                    ${diagramHtml}
                    <div class="flex items-center justify-between gap-1">
                        <span class="px-2 py-0.5 rounded-full bg-fusee-cyan/15 text-fusee-cyan text-[8px] font-bold font-techno border border-fusee-cyan/30">
                            ${item.year || 'CAPSTONE'}
                        </span>
                        <span class="text-[9px] text-slate-400 font-medium truncate">
                            <i class="fa-solid fa-user-tie text-fusee-cyan mr-1"></i>${item.advisor || 'Faculty Advisor'}
                        </span>
                    </div>
                    <h4 class="font-bold text-white text-xs leading-snug">${item.title || 'Untitled Project'}</h4>
                    ${item.authors ? `<p class="text-[10px] text-slate-400"><i class="fa-solid fa-users text-slate-500 mr-1"></i>${item.authors}</p>` : ''}
                    
                    <details class="group text-[10px] text-slate-300">
    <summary class="cursor-pointer font-semibold text-fusee-cyan hover:underline flex items-center justify-between pt-1 select-none focus:outline-none">
        <span>Read Abstract</span>
        <i class="fa-solid fa-chevron-down text-[8px] group-open:rotate-180 transition"></i>
    </summary>
    <div class="mt-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 leading-relaxed text-slate-300 text-[10.5px] whitespace-pre-line max-h-48 overflow-y-auto text-justify">
        ${item.abstract || 'No abstract provided.'}
    </div>
</details>
                </div>
                ${videoBtnHtml}
            </div>
        `;
    }).join('');
};

window.filterCapstonesUI = function() {
    window.renderCapstonesUI();
};
let currentTutoringSubject = 'all';

window.openTutorDashboard = function() {
    window.renderTutorManagementUI();
    openModal('tutor-dashboard-modal');
};

window.setTutoringSubjectFilter = function(subj, evt) {
    currentTutoringSubject = subj;
    document.querySelectorAll('.tut-pill').forEach(btn => {
        btn.className = 'tut-pill px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium flex-shrink-0';
    });
    if (evt && evt.target) {
        evt.target.className = 'tut-pill px-2.5 py-1 rounded-lg bg-fusee-cyan text-slate-950 font-bold flex-shrink-0';
    }
    window.renderPeerTutoringUI();
};

// Tutee Browsing UI Renderer (Retains Email Request Match)
window.renderPeerTutoringUI = function() {
    const container = document.getElementById('tutoring-display-container');
    if (!container) return;

    const items = window.allPeerTutoringData || window.FUSEE?.data?.peerTutoring || [];
    const searchVal = (document.getElementById('tutoring-search-input')?.value || '').toLowerCase();

    const filtered = items.filter(item => {
        const matchesSubj = currentTutoringSubject === 'all' || 
                            (item.subject && item.subject.toLowerCase().includes(currentTutoringSubject.toLowerCase()));
        const matchesSearch = !searchVal ||
            (item.tutorName && item.tutorName.toLowerCase().includes(searchVal)) ||
            (item.subject && item.subject.toLowerCase().includes(searchVal)) ||
            (item.topicFocus && item.topicFocus.toLowerCase().includes(searchVal)) ||
            (item.location && item.location.toLowerCase().includes(searchVal));
        return matchesSubj && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-6 col-span-2">No active tutors or study groups found matching your criteria.</p>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const isGroup = item.type === 'STUDY_GROUP';
        const badgeColor = isGroup ? 'bg-fusee-purple/20 text-fusee-purple border-fusee-purple/30' : 'bg-fusee-cyan/20 text-fusee-cyan border-fusee-cyan/30';
        const badgeIcon = isGroup ? 'fa-users' : 'fa-bolt';
        const badgeText = isGroup ? '👥 OPEN STUDY GROUP' : '⚡ 1-ON-1 TUTOR';
        const isFull = item.status === 'FULL';

        const statusBadge = isFull 
            ? '<span class="text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 text-[8px] font-bold">🔴 FULL</span>'
            : '<span class="text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 text-[8px] font-bold">🟢 AVAILABLE</span>';

        const subjectText = `[FUSEE Peer Match] Request for ${item.subject} Tutoring`;
        const bodyText = `Hi ${item.tutorName},\n\nI saw your listing on FUSEE Hub for ${item.subject}. I would like to request/join a tutoring session.\n\nThank you!`;
        const tutorEmail = item.contact || '';

        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const requestUrl = isMobileDevice 
            ? `mailto:${tutorEmail}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`
            : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(tutorEmail)}&su=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;

        const matchButtonHtml = isFull ? `
            <button disabled class="block w-full text-center py-2 bg-slate-800 text-slate-500 font-bold rounded-xl text-xs cursor-not-allowed border border-slate-700">
                <i class="fa-solid fa-lock mr-1"></i> Listing Full
            </button>
        ` : `
            <a href="${requestUrl}" ${isMobileDevice ? '' : 'target="_blank" rel="noopener noreferrer"'} 
               class="block w-full text-center py-2 bg-gradient-to-r from-fusee-cyan to-blue-600 text-slate-950 font-bold rounded-xl text-xs hover:from-cyan-400 hover:to-blue-500 transition shadow-neon-cyan">
                <i class="fa-solid fa-paper-plane mr-1"></i> Request Match
            </a>
        `;

        return `
            <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 hover:border-fusee-cyan/40 transition flex flex-col justify-between">
                <div class="space-y-2">
                    <div class="flex items-center justify-between gap-1">
                        <span class="px-2 py-0.5 rounded-full text-[8px] font-bold font-techno border ${badgeColor} flex items-center gap-1">
                            <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
                        </span>
                        ${statusBadge}
                    </div>

                    <div>
                        <h4 class="font-bold text-white text-xs leading-snug">${item.tutorName || 'Peer Tutor'}</h4>
                        <p class="text-[10px] text-fusee-cyan font-semibold">${item.yearLevel || 'EE Senior'} • <span class="text-white">${item.subject || 'EE Core'}</span></p>
                    </div>

                    <p class="text-[10px] text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        <strong>Focus:</strong> ${item.topicFocus || 'Core course topics review & problem solving.'}
                    </p>

                    <div class="grid grid-cols-2 gap-1 text-[9px] text-slate-400 pt-1">
                        <span><i class="fa-solid fa-location-dot text-fusee-cyan mr-1"></i>${item.location || 'R202C ComLab'}</span>
                        <span><i class="fa-solid fa-clock text-fusee-yellow mr-1"></i>${item.schedule || 'Flexible'}</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-2">
                    ${matchButtonHtml}
                    <button type="button" onclick="navigator.clipboard.writeText('${tutorEmail}'); alert('Copied tutor email: ${tutorEmail}')" 
                            class="block w-full text-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition border border-slate-700">
                        <i class="fa-solid fa-copy mr-1"></i> Copy Email
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

// Tutor Management Hub Renderer
window.renderTutorManagementUI = function() {
    const container = document.getElementById('tutor-manage-container');
    if (!container) return;

    const items = window.allPeerTutoringData || window.FUSEE?.data?.peerTutoring || [];

    if (items.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-6">No active listings found. Click "+ Post New Listing" to publish one.</p>';
        return;
    }

    container.innerHTML = items.map((item, idx) => {
        const isFull = item.status === 'FULL';
        return `
            <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-bold text-white text-xs">${item.tutorName}</h4>
                        <p class="text-[10px] text-fusee-cyan font-semibold">${item.subject} (${item.yearLevel})</p>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[8px] font-bold border ${isFull ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}">
                        ${isFull ? '🔴 FULL' : '🟢 AVAILABLE'}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button onclick="toggleTutorStatus(${idx})" class="py-1.5 px-3 rounded-lg ${isFull ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'} border text-[10px] font-bold transition">
                        ${isFull ? 'Mark as AVAILABLE' : 'Mark as FULL'}
                    </button>
                    <button onclick="deleteTutorListing(${idx})" class="py-1.5 px-3 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold hover:bg-rose-500/30 transition">
                        <i class="fa-solid fa-trash mr-1"></i> Delete Listing
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.toggleTutorStatus = async function(index) {
    if (window.allPeerTutoringData && window.allPeerTutoringData[index]) {
        const currentStatus = window.allPeerTutoringData[index].status;
        window.allPeerTutoringData[index].status = (currentStatus === 'FULL') ? 'AVAILABLE' : 'FULL';

        try {
            const db = window.db;
            const docRef = window.doc(db, "fusee_hub", "landing_content");
            await window.updateDoc(docRef, {
                peerTutoring: window.allPeerTutoringData
            });
            window.renderTutorManagementUI();
            window.renderPeerTutoringUI();
        } catch (err) {
            console.error("Error updating tutor status:", err);
            alert("Failed to update status in database: " + err.message);
        }
    }
};

window.deleteTutorListing = async function(index) {
    const confirmed = await window.showConfirm(
        "Are you sure you want to remove this tutoring listing?",
        "Delete Listing",
        "fa-trash"
    );

    if (confirmed) {
        if (window.allPeerTutoringData) {
            window.allPeerTutoringData.splice(index, 1);

            try {
                const db = window.db;
                const docRef = window.doc(db, "fusee_hub", "landing_content");
                await window.updateDoc(docRef, {
                    peerTutoring: window.allPeerTutoringData
                });
                window.renderTutorManagementUI();
                window.renderPeerTutoringUI();
            } catch (err) {
                console.error("Error deleting tutor listing:", err);
                alert("Failed to delete listing from database: " + err.message);
            }
        }
    }
};

async function handleStudentTutorSubmit(e) {
    if (e) e.preventDefault();

    // 1. Validate Whitelist & Login
    const user = await checkUserWhitelisted();
    if (!user) return;

    const type = document.getElementById('tut-post-type')?.value || 'TUTOR';
    const tutorName = document.getElementById('tut-post-name')?.value.trim() || '';
    const yearLevel = document.getElementById('tut-post-year')?.value.trim() || '';
    const subject = document.getElementById('tut-post-subject')?.value.trim() || '';
    const maxStudents = document.getElementById('tut-post-max')?.value || '3';
    const topicFocus = document.getElementById('tut-post-focus')?.value.trim() || '';
    const location = document.getElementById('tut-post-location')?.value.trim() || '';
    const schedule = document.getElementById('tut-post-schedule')?.value.trim() || '';
    const contact = document.getElementById('tut-post-contact')?.value.trim() || user.email;

    if (!tutorName || !subject || !contact) {
        alert('Please fill out all required fields.');
        return;
    }

    const newListing = {
        id: Date.now().toString(),
        type,
        role: type,
        status: 'AVAILABLE',
        tutorName,
        yearLevel,
        subject,
        maxStudents,
        topicFocus,
        location,
        schedule,
        contact,
        ownerEmail: user.email
    };

    // Keep state arrays synchronized across both namespace references
    if (!window.allPeerTutoringData) window.allPeerTutoringData = [];
    if (!window.FUSEE.data.peerTutoring) window.FUSEE.data.peerTutoring = window.allPeerTutoringData;

    window.allPeerTutoringData.unshift(newListing);
    if (window.FUSEE.data.peerTutoring !== window.allPeerTutoringData) {
        window.FUSEE.data.peerTutoring.unshift(newListing);
    }

    try {
        const db = window.db;
        const docRef = window.doc(db, "fusee_hub", "landing_content");
        await window.updateDoc(docRef, {
            peerTutoring: window.allPeerTutoringData
        });

        if (typeof window.renderPeerTutoringUI === 'function') window.renderPeerTutoringUI();
        if (typeof window.renderTutorManagementUI === 'function') window.renderTutorManagementUI();

        document.getElementById('student-tutor-form')?.reset();
        closeModal('post-tutor-modal');
        alert('Your peer tutoring listing has been published!');
    } catch (err) {
        console.error("Error saving listing to Firestore:", err);
        alert("Failed to publish listing to the database: " + err.message);
    }
}
// Helper to verify current user against Firestore whitelist
// Helper to verify current user against Firestore whitelist
async function checkUserWhitelisted() {
    const role = window.userRole || window.FUSEE?.userRole || localStorage.getItem('fusee_user_role');
    const user = window.currentUser || window.FUSEE?.currentUser || window.auth?.currentUser;

    if (role !== 'EE' || !user || !user.email) {
        alert("Access Restricted: This action is reserved for whitelisted EE Students.");
        return null;
    }

    const userEmail = user.email.toLowerCase().trim();

    // Fetch fresh whitelist directly if list is empty
    let list = window.whitelistedEmails || window.FUSEE?.whitelistedEmails || [];
    if ((!Array.isArray(list) || list.length === 0) && window.db && window.doc && window.getDoc) {
        try {
            const docSnap = await window.getDoc(window.doc(window.db, "fusee_hub", "landing_content"));
            if (docSnap.exists() && typeof window.parseWhitelistData === 'function') {
                list = window.parseWhitelistData(docSnap.data());
            }
        } catch (err) {
            console.error("Error fetching whitelist during verification:", err);
        }
    }

    if (typeof window.checkIsWhitelisted === 'function') {
        if (!window.checkIsWhitelisted(userEmail)) {
            alert(`Access Denied: Account (${userEmail}) is not on the admin whitelist.`);
            return null;
        }
    }

    return user;
}

// Bind function globally for inline form event handlers
window.checkUserWhitelisted = checkUserWhitelisted;

    // ========================================================
// 18. Important Events & Academic Calendar JavaScript Engine
// ========================================================
let currentCalDate = new Date();
let currentImpFilter = 'all';

// Month Navigation Handler (< Prev / Next >)
window.changeCalendarMonth = function(delta) {
    currentCalDate.setMonth(currentCalDate.getMonth() + delta);
    window.renderImportantEventsUI();
};

// Filter Category Pills Handler (All / Major Exams / Ateneo Events / Holidays)
window.setImportantEventFilter = function(cat, evt) {
    currentImpFilter = cat;
    document.querySelectorAll('.imp-pill').forEach(btn => {
        btn.className = 'imp-pill px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium flex-shrink-0';
    });
    if (evt && evt.target) {
        evt.target.className = 'imp-pill px-2.5 py-1 rounded-lg bg-fusee-yellow text-slate-950 font-bold flex-shrink-0';
    }
    window.renderImportantEventsUI();
};

// Main UI Renderer for Home Banner & Modal Calendar
window.renderImportantEventsUI = function() {
    const events = window.allImportantEventsData || [];

    // 1. Update Today's Schedule Banner on Home View
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD

    const todayTitleEl = document.getElementById('today-event-title');
    const todayDescEl = document.getElementById('today-event-desc');

    if (todayTitleEl && todayDescEl) {
        // Find events active today (date <= today <= endDate)
        const todayEvents = events.filter(e => {
            if (!e.date) return false;
            const startDate = e.date;
            const endDate = e.endDate || e.date;
            return todayStr >= startDate && todayStr <= endDate;
        });

        if (todayEvents.length > 0) {
            todayTitleEl.textContent = todayEvents.map(e => e.title).join(' • ');
            todayDescEl.textContent = todayEvents.map(e => e.description || e.category || 'Event scheduled today').join(' | ');
        } else {
            todayTitleEl.textContent = "No important event today";
            todayDescEl.textContent = "Regular academic schedule in effect.";
        }
    }

    // 2. Render Month & Year Header inside Modal
    const monthYearEl = document.getElementById('calendar-month-year');
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    const calYear = currentCalDate.getFullYear();
    const calMonth = currentCalDate.getMonth();

    if (monthYearEl) {
        monthYearEl.textContent = `${monthNames[calMonth]} ${calYear}`;
    }

    // Category Filter Helper
    const filterCategoryMatches = (e) => {
        if (currentImpFilter === 'all') return true;
        const cat = (e.category || '').toLowerCase();
        if (currentImpFilter === 'exam') return cat.includes('exam');
        if (currentImpFilter === 'ateneo') return cat.includes('ateneo');
        if (currentImpFilter === 'holiday') return cat.includes('holiday') || cat.includes('suspension');
        return true;
    };

    const filteredEvents = events.filter(filterCategoryMatches);

    // 3. Render Calendar Days Grid inside Modal
    const gridContainer = document.getElementById('calendar-days-grid');
    if (gridContainer) {
        const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // Starting day of week
        const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

        let gridHtml = '';

        // Empty padding cells before Day 1
        for (let i = 0; i < firstDayIndex; i++) {
            gridHtml += `<div class="p-2 text-center text-slate-700 font-pixel text-[10px]"></div>`;
        }

        // Days 1 through N
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dayStr === todayStr;

            const dayEvents = filteredEvents.filter(e => {
                const start = e.date;
                const end = e.endDate || e.date;
                return dayStr >= start && dayStr <= end;
            });

            const hasEvent = dayEvents.length > 0;

            let dayBg = 'bg-slate-900/60 text-slate-300 border-slate-800';
            if (isToday) {
                dayBg = 'bg-fusee-yellow/20 text-fusee-yellow border-fusee-yellow font-bold ring-1 ring-fusee-yellow';
            } else if (hasEvent) {
                dayBg = 'bg-slate-800 text-white border-fusee-yellow/50 font-bold';
            }

            const indicatorDot = hasEvent 
                ? `<span class="w-1.5 h-1.5 rounded-full bg-fusee-yellow inline-block mt-0.5"></span>`
                : '';

            gridHtml += `
                <div class="p-1.5 sm:p-2 rounded-xl border ${dayBg} flex flex-col items-center justify-center min-h-[36px] transition">
                    <span class="text-[10px] md:text-xs font-techno">${day}</span>
                    ${indicatorDot}
                </div>
            `;
        }

        gridContainer.innerHTML = gridHtml;
    }

    // 4. Render Events Agenda List below Calendar inside Modal
    const listContainer = document.getElementById('important-events-list-container');
    if (listContainer) {
        const monthEvents = filteredEvents.filter(e => {
            if (!e.date) return false;
            const eYear = parseInt(e.date.substring(0, 4), 10);
            const eMonth = parseInt(e.date.substring(5, 7), 10) - 1;
            return eYear === calYear && eMonth === calMonth;
        });

        monthEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        if (monthEvents.length === 0) {
            listContainer.innerHTML = `<p class="text-[10px] text-slate-400 italic text-center py-4">No events scheduled for ${monthNames[calMonth]} ${calYear}.</p>`;
        } else {
            listContainer.innerHTML = monthEvents.map(e => {
                let catBadge = 'bg-fusee-yellow/20 text-fusee-yellow border-fusee-yellow/30';
                if (e.category && e.category.toLowerCase().includes('exam')) {
                    catBadge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
                } else if (e.category && e.category.toLowerCase().includes('ateneo')) {
                    catBadge = 'bg-fusee-cyan/20 text-fusee-cyan border-fusee-cyan/30';
                } else if (e.category && (e.category.toLowerCase().includes('holiday') || e.category.toLowerCase().includes('suspension'))) {
                    catBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                }

                const dateDisplay = (e.endDate && e.endDate !== e.date) 
                    ? `${e.date} to ${e.endDate}` 
                    : e.date;

                return `
                    <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 hover:border-fusee-yellow/40 transition">
                        <div class="flex items-center justify-between gap-1">
                            <span class="px-2 py-0.5 rounded text-[8px] font-bold font-techno border ${catBadge}">
                                ${e.category || 'EVENT'}
                            </span>
                            <span class="text-[9px] text-slate-400 font-mono">
                                <i class="fa-regular fa-calendar mr-1 text-fusee-yellow"></i>${dateDisplay}
                            </span>
                        </div>
                        <h5 class="font-bold text-white text-xs leading-snug">${e.title || 'Untitled Event'}</h5>
                        ${e.description ? `<p class="text-[10px] text-slate-300 leading-relaxed">${e.description}</p>` : ''}
                    </div>
                `;
            }).join('');
        }
    }
};
// Toggle Merch Card Image View (Front <-> Back Crossfade)
window.toggleMerchCardImage = function(container) {
    const frontImg = container.querySelector('.merch-front-img');
    const backImg = container.querySelector('.merch-back-img');
    const badgeText = container.querySelector('.merch-badge-text');

    if (!frontImg || !backImg) return;

    const currentShowing = container.getAttribute('data-showing') || 'front';

    if (currentShowing === 'front') {
        frontImg.classList.remove('opacity-100');
        frontImg.classList.add('opacity-0');
        
        backImg.classList.remove('opacity-0');
        backImg.classList.add('opacity-100');
        
        if (badgeText) badgeText.textContent = 'Back — Tap for Front';
        container.setAttribute('data-showing', 'back');
    } else {
        backImg.classList.remove('opacity-100');
        backImg.classList.add('opacity-0');
        
        frontImg.classList.remove('opacity-0');
        frontImg.classList.add('opacity-100');
        
        if (badgeText) badgeText.textContent = 'Front — Tap for Back';
        container.setAttribute('data-showing', 'front');
    }
};
// Merchandise Catalog UI Renderer
window.renderMerchUI = function() {
    const container = document.getElementById('merch-display-container');
    if (!container) return;

    const items = window.currentMerchItems || [];

    if (items.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-6 col-span-2">No merchandise items available at this time.</p>';
        return;
    }

    container.innerHTML = items.map((item, index) => {
        const hasFrontAndBack = item.frontImageUrl && item.backImageUrl;
        const mainImage = item.imageUrl || item.frontImageUrl || item.image || '';
        const backImage = item.backImageUrl || '';

        const imageMarkup = mainImage ? `
            <div class="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group cursor-pointer"
                 data-showing="front"
                 onclick="${hasFrontAndBack ? 'toggleMerchCardImage(this)' : `openImageZoomModal('${mainImage}', '${backImage}', this)`}">
                <img src="${mainImage}" alt="${item.title || 'Merch Item'}" class="merch-front-img w-full h-full object-cover transition-opacity duration-300 opacity-100">
                ${backImage ? `<img src="${backImage}" alt="${item.title || 'Merch Item Back'}" class="merch-back-img absolute inset-0 w-full h-full object-cover transition-opacity duration-300 opacity-0">` : ''}
                
                ${hasFrontAndBack ? `
                    <span class="merch-badge-text absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 text-[8px] font-bold text-fusee-cyan border border-fusee-cyan/30 backdrop-blur-md">
                        Front — Tap for Back
                    </span>
                ` : ''}
                
                <button type="button" onclick="event.stopPropagation(); openImageZoomModal('${mainImage}', '${backImage}', this)" class="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-slate-900/80 text-white flex items-center justify-center border border-white/20 hover:bg-fusee-cyan hover:text-slate-950 transition">
                    <i class="fa-solid fa-magnifying-glass-plus text-[10px]"></i>
                </button>
            </div>
        ` : `
            <div class="w-full aspect-square rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-[10px]">
                <i class="fa-solid fa-shirt text-3xl text-fusee-magenta/30 mb-1"></i>
                <span>No Image Available</span>
            </div>
        `;

        return `
            <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 hover:border-fusee-magenta/40 transition flex flex-col justify-between">
                <div class="space-y-2">
                    ${imageMarkup}
                    
                    <div class="flex items-center justify-between gap-1">
                        <span class="px-2 py-0.5 rounded-full bg-fusee-magenta/20 text-fusee-magenta text-[8px] font-bold font-techno border border-fusee-magenta/30">
                            ${item.badge || 'PRE-ORDER'}
                        </span>
                        <span class="text-xs font-bold text-fusee-magenta font-techno">
                            ${item.price || '₱0.00'}
                        </span>
                    </div>

                    <h4 class="font-bold text-white text-xs leading-snug">${item.title || 'EE Merchandise'}</h4>
                    ${item.description ? `<p class="text-[10px] text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">${item.description}</p>` : ''}
                </div>

                <button onclick="openMerchOrderModal(${index})" class="w-full py-2 bg-gradient-to-r from-fusee-magenta to-pink-600 text-white font-bold rounded-xl text-xs hover:from-pink-500 hover:to-purple-500 transition shadow-neon-pink flex items-center justify-center gap-1.5 mt-2">
                    <i class="fa-solid fa-bag-shopping text-xs"></i>
                    <span>Order Now</span>
                </button>
            </div>
        `;
    }).join('');
};
