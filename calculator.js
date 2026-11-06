// ========================================================
// QPI CALCULATOR ENGINE
// ========================================================
let selectedCurriculumMode = null;
let studentAddedSubjects = [];

const QPI_GRADE_SCALE = [
    { letter: 'A', value: 4.0, class: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
    { letter: 'B+', value: 3.5, class: 'text-fusee-cyan border-fusee-cyan/40 bg-fusee-cyan/10' },
    { letter: 'B', value: 3.0, class: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
    { letter: 'C+', value: 2.5, class: 'text-fusee-yellow border-fusee-yellow/40 bg-fusee-yellow/10' },
    { letter: 'C', value: 2.0, class: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
    { letter: 'D', value: 1.0, class: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
    { letter: 'F', value: 0.0, class: 'text-rose-400 border-rose-500/40 bg-rose-500/10' }
];

window.openQpiCalculatorModal = function() {
    if (typeof window.closeAllModals === 'function') {
        window.closeAllModals();
    } else if (typeof closeAllModals === 'function') {
        closeAllModals();
    }

    const saved = localStorage.getItem('fusee_qpi_student_list');
    const savedMode = localStorage.getItem('fusee_qpi_curriculum_mode');

    if (saved) {
        try { studentAddedSubjects = JSON.parse(saved); } catch (e) { studentAddedSubjects = []; }
    }

    if (savedMode) {
        selectedCurriculumMode = savedMode;
        showQpiWorkspace();
    } else {
        showQpiGateway();
    }

    if (typeof window.openModal === 'function') {
        window.openModal('qpi-calc-modal');
    } else {
        document.getElementById('qpi-calc-modal')?.classList.remove('hidden-sheet');
    }
};

function showQpiGateway() {
    document.getElementById('qpi-curriculum-screen')?.classList.remove('hidden');
    document.getElementById('qpi-workspace-screen')?.classList.add('hidden');
    document.getElementById('qpi-curriculum-badge')?.classList.add('hidden');
}

function showQpiWorkspace() {
    document.getElementById('qpi-curriculum-screen')?.classList.add('hidden');
    document.getElementById('qpi-workspace-screen')?.classList.remove('hidden');

    const badge = document.getElementById('qpi-curriculum-badge');
    if (badge) {
        badge.innerHTML = `${selectedCurriculumMode} <i class="fa-solid fa-rotate text-[8px] ml-1"></i>`;
        badge.classList.remove('hidden');
    }

    renderStudentQpiSubjects();
}

window.selectQpiCurriculum = function(mode) {
    selectedCurriculumMode = mode;
    localStorage.setItem('fusee_qpi_curriculum_mode', mode);
    showQpiWorkspace();
};

window.resetQpiCurriculum = function() {
    localStorage.removeItem('fusee_qpi_curriculum_mode');
    selectedCurriculumMode = null;
    showQpiGateway();
};

window.searchQpiSubjects = function() {
    const input = document.getElementById('qpi-search-input');
    const resultsBox = document.getElementById('qpi-search-results');
    if (!input || !resultsBox) return;

    const query = input.value.trim().toLowerCase();
    if (!query) {
        resultsBox.classList.add('hidden');
        return;
    }

    const directory = window.allQpiSubjectsData || [];

    const matches = directory.filter(sub => {
        const matchesCurr = sub.curriculum === 'Both Curriculum' || sub.curriculum === selectedCurriculumMode;
        const matchesQuery = (sub.code && sub.code.toLowerCase().includes(query)) ||
                             (sub.title && sub.title.toLowerCase().includes(query));
        return matchesCurr && matchesQuery;
    });

    if (matches.length === 0) {
        resultsBox.innerHTML = `<p class="text-[10px] text-slate-400 italic p-2 text-center">No subjects found for ${selectedCurriculumMode}.</p>`;
    } else {
        resultsBox.innerHTML = matches.map(sub => `
            <div onclick="addSubjectToQpiCalc('${sub.code.replace(/'/g, "\\'")}', '${sub.title.replace(/'/g, "\\'")}', ${sub.units})" 
                 class="p-2 rounded-lg bg-slate-800/80 hover:bg-fusee-cyan/20 border border-slate-700 hover:border-fusee-cyan/50 cursor-pointer flex items-center justify-between transition">
                <div>
                    <span class="font-bold text-white font-mono text-xs">${sub.code}</span>
                    <span class="text-slate-300 text-xs ml-2">${sub.title}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] text-fusee-cyan font-bold">${sub.units} Units</span>
                    <span class="px-2 py-0.5 rounded bg-fusee-cyan text-slate-950 text-[10px] font-bold"><i class="fa-solid fa-plus"></i> Add</span>
                </div>
            </div>
        `).join('');
    }

    resultsBox.classList.remove('hidden');
};

window.addSubjectToQpiCalc = function(code, title, units) {
    studentAddedSubjects.push({ code, title, units: parseFloat(units) || 3, gradeIndex: 0 });
    const input = document.getElementById('qpi-search-input');
    if (input) input.value = '';
    document.getElementById('qpi-search-results')?.classList.add('hidden');
    saveAndCalculateQpi();
};

window.removeSubjectFromQpiCalc = function(index) {
    studentAddedSubjects.splice(index, 1);
    saveAndCalculateQpi();
};

window.cycleQpiGrade = function(index) {
    if (!studentAddedSubjects[index]) return;
    studentAddedSubjects[index].gradeIndex = (studentAddedSubjects[index].gradeIndex + 1) % QPI_GRADE_SCALE.length;
    saveAndCalculateQpi();
};

window.setQpiGrade = function(index, gradeIdx) {
    if (!studentAddedSubjects[index]) return;
    studentAddedSubjects[index].gradeIndex = parseInt(gradeIdx, 10);
    saveAndCalculateQpi();
};

function saveAndCalculateQpi() {
    localStorage.setItem('fusee_qpi_student_list', JSON.stringify(studentAddedSubjects));
    renderStudentQpiSubjects();
}

function renderStudentQpiSubjects() {
    const container = document.getElementById('qpi-student-subjects-container');
    const countEl = document.getElementById('qpi-subject-count');
    if (!container) return;

    if (countEl) countEl.textContent = studentAddedSubjects.length;

    if (studentAddedSubjects.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 space-y-1 text-slate-500">
                <i class="fa-solid fa-folder-open text-2xl text-slate-600"></i>
                <p class="text-xs">No subjects added yet.</p>
                <p class="text-[10px]">Use the search bar above to search and add subjects one by one.</p>
            </div>
        `;
        calculateQpi();
        return;
    }

    container.innerHTML = studentAddedSubjects.map((sub, idx) => {
        const gradeObj = QPI_GRADE_SCALE[sub.gradeIndex] || QPI_GRADE_SCALE[0];
        
        return `
            <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-white font-mono text-xs">${sub.code}</span>
                        <span class="text-[10px] text-fusee-cyan font-bold">${sub.units} Units</span>
                    </div>
                    <p class="text-[11px] text-slate-300 truncate">${sub.title}</p>
                </div>

                <div class="flex items-center gap-2">
                    <select onchange="setQpiGrade(${idx}, this.value)" class="px-2.5 py-1.5 rounded-xl border font-techno font-bold text-xs bg-slate-950 focus:outline-none focus:border-fusee-cyan transition cursor-pointer ${gradeObj.class}">
                        ${QPI_GRADE_SCALE.map((g, gIdx) => `
                            <option value="${gIdx}" class="bg-slate-900 text-white font-sans" ${gIdx === sub.gradeIndex ? 'selected' : ''}>
                                ${g.letter} (${g.value.toFixed(1)})
                            </option>
                        `).join('')}
                    </select>
                    <button onclick="removeSubjectFromQpiCalc(${idx})" class="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    calculateQpi();
}

function calculateQpi() {
    const resultEl = document.getElementById('qpi-result-display');
    const unitsEl = document.getElementById('qpi-total-units');
    const honorsEl = document.getElementById('qpi-honors-badge');

    if (studentAddedSubjects.length === 0) {
        if (resultEl) resultEl.textContent = '0.00';
        if (unitsEl) unitsEl.textContent = '0';
        if (honorsEl) {
            honorsEl.className = 'text-[9px] font-bold text-slate-400';
            honorsEl.textContent = 'No Subjects Added';
        }
        return;
    }

    let totalUnits = 0;
    let totalPoints = 0;

    studentAddedSubjects.forEach(sub => {
        const gradeObj = QPI_GRADE_SCALE[sub.gradeIndex] || QPI_GRADE_SCALE[0];
        totalUnits += sub.units;
        totalPoints += (sub.units * gradeObj.value);
    });

    const qpi = totalUnits > 0 ? (totalPoints / totalUnits) : 0;
    if (resultEl) resultEl.textContent = qpi.toFixed(2);
    if (unitsEl) unitsEl.textContent = totalUnits.toString();

    if (honorsEl) {
        if (qpi >= 3.70) {
            honorsEl.className = 'text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30';
            honorsEl.textContent = '🌟 First Honors';
        } else if (qpi >= 3.35) {
            honorsEl.className = 'text-[9px] font-bold text-fusee-cyan bg-fusee-cyan/20 px-2 py-0.5 rounded border border-fusee-cyan/30';
            honorsEl.textContent = '⭐ Second Honors';
        } else if (qpi >= 2.00) {
            honorsEl.className = 'text-[9px] font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30';
            honorsEl.textContent = '👍 Good Standing';
        } else {
            honorsEl.className = 'text-[9px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30';
            honorsEl.textContent = '⚠️ Academic Review';
        }
    }
}

window.clearQpiCalculator = function() {
    if (studentAddedSubjects.length === 0) return;
    if (confirm("Are you sure you want to clear all added subjects?")) {
        studentAddedSubjects = [];
        saveAndCalculateQpi();
    }
};

// ========================================================
// TARGET GRADE CALCULATOR ENGINE
// ========================================================
let tgTargetPercent = 92.0;
let tgActiveBase40Period = 'pl'; // 'pl' or 'mt'

const ADDU_GRADE_CHIPS = [
    { letter: 'A',  pct: 92.0, range: '92-100%', label: 'Excellent (92% - 100%)' },
    { letter: 'B+', pct: 88.0, range: '88-91%',  label: 'Very Good (88% - 91%)' },
    { letter: 'B',  pct: 84.0, range: '84-87%',  label: 'Good (84% - 87%)' },
    { letter: 'C+', pct: 80.0, range: '80-83%',  label: 'Satisfactory (80% - 83%)' },
    { letter: 'C',  pct: 76.0, range: '76-79%',  label: 'Acceptable (76% - 79%)' },
    { letter: 'D',  pct: 72.0, range: '72-75%',  label: 'Minimal Pass (72% - 75%)' }
];

window.openTargetGradeCalculatorModal = function() {
    if (typeof window.closeAllModals === 'function') {
        window.closeAllModals();
    } else if (typeof closeAllModals === 'function') {
        closeAllModals();
    }

    renderGradeChips();
    initTargetGradeEvents();
    calculateTargetGrade();
    if (typeof window.openModal === 'function') {
        window.openModal('target-grade-calc-modal');
    } else {
        document.getElementById('target-grade-calc-modal')?.classList.remove('hidden-sheet');
    }
};

function renderGradeChips() {
    const container = document.getElementById('tg-gradeChipsContainer');
    if (!container) return;

    container.innerHTML = ADDU_GRADE_CHIPS.map(g => {
        const isSelected = g.pct === tgTargetPercent;
        const activeCls = isSelected 
            ? 'bg-fusee-yellow text-slate-950 font-black border-fusee-yellow shadow-neon-yellow scale-105' 
            : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 font-bold';

        return `
            <button type="button" onclick="selectTargetGrade(${g.pct})" title="${g.label}" 
                    class="py-2 px-1 rounded-xl border text-center transition ${activeCls}">
                <div class="text-xs font-techno">${g.letter}</div>
                <div class="text-[8px] sm:text-[9px] opacity-80 leading-tight mt-0.5">${g.range}</div>
            </button>
        `;
    }).join('');
}

window.selectTargetGrade = function(pct) {
    tgTargetPercent = pct;
    const badge = document.getElementById('tg-targetPctBadge');
    if (badge) badge.textContent = `${pct.toFixed(1)}% Required`;
    renderGradeChips();
    calculateTargetGrade();
};

window.setAssumedQuizGrade = function(pct) {
    const el = document.getElementById('tg-subPF-topic');
    if (el) {
        el.value = pct;
        calculateTargetGrade();
    }
};

function calculateTargetGrade() {
    const wPL = parseFloat(document.getElementById('tg-wPL')?.value) || 10;
    const wMT = parseFloat(document.getElementById('tg-wMT')?.value) || 45;
    const wPF = parseFloat(document.getElementById('tg-wPF')?.value) || 45;

    const gPL = parseFloat(document.getElementById('tg-gradePL')?.value) || 0;
    const gMT = parseFloat(document.getElementById('tg-gradeMT')?.value) || 0;

    const accumPts = (gPL * (wPL / 100)) + (gMT * (wMT / 100));
    const accumPtsEl = document.getElementById('tg-accumulatedPtsText');
    if (accumPtsEl) {
        accumPtsEl.textContent = `${accumPts.toFixed(2)} / ${tgTargetPercent.toFixed(2)} pts`;
    }

    const ptsNeeded = tgTargetPercent - accumPts;
    const reqPrefi = wPF > 0 ? (ptsNeeded / (wPF / 100)) : 0;

    const reqAvgDisplay = document.getElementById('tg-reqAvgDisplay');
    const reqRawDisplay = document.getElementById('tg-reqRawDisplay');
    const feasibilityBadge = document.getElementById('tg-feasibilityBadge');

    if (reqAvgDisplay) {
        if (reqPrefi > 100) {
            reqAvgDisplay.textContent = `>100%`;
        } else if (reqPrefi <= 0) {
            reqAvgDisplay.textContent = `0.0%`;
        } else {
            reqAvgDisplay.textContent = `${reqPrefi.toFixed(1)}%`;
        }
    }

    const reqRawPct = (reqPrefi - 40) / 0.60;
    if (reqRawDisplay) {
        if (reqPrefi > 100 || reqRawPct > 100) {
            reqRawDisplay.textContent = `N/A (Impossible)`;
        } else if (reqRawPct <= 0) {
            reqRawDisplay.textContent = `0.0% Raw`;
        } else {
            reqRawDisplay.textContent = `~${reqRawPct.toFixed(1)}% Raw`;
        }
    }

    const pfTopicInput = parseFloat(document.getElementById('tg-subPF-topic')?.value);
    const pfTotalItems = parseFloat(document.getElementById('tg-subPF-dept-total')?.value) || 100;
    const neededDeptExamEl = document.getElementById('tg-neededFinalDeptExam');
    const neededDeptRawScoreEl = document.getElementById('tg-neededDeptRawScore');

    if (neededDeptExamEl) {
        if (!isNaN(pfTopicInput) && reqPrefi <= 100) {
            const neededDept = (reqPrefi - (pfTopicInput * 0.20)) / 0.80;

            if (neededDept > 100) {
                neededDeptExamEl.textContent = `>100% (Unreachable)`;
                if (neededDeptRawScoreEl) neededDeptRawScoreEl.textContent = `N/A (>100%)`;
            } else if (neededDept <= 40) {
                neededDeptExamEl.textContent = `${Math.max(0, neededDept).toFixed(1)}%`;
                if (neededDeptRawScoreEl) neededDeptRawScoreEl.textContent = `0 / ${pfTotalItems} items (0.0% Raw)`;
            } else {
                const rawDept = (neededDept - 40) / 0.60;
                const itemsNeeded = Math.ceil((rawDept / 100) * pfTotalItems);
                neededDeptExamEl.textContent = `${neededDept.toFixed(1)}%`;
                if (neededDeptRawScoreEl) {
                    neededDeptRawScoreEl.textContent = `~${itemsNeeded} / ${pfTotalItems} items (~${rawDept.toFixed(1)}% Raw)`;
                }
            }
        } else if (reqPrefi > 100) {
            neededDeptExamEl.textContent = `N/A (>100%)`;
            if (neededDeptRawScoreEl) neededDeptRawScoreEl.textContent = `N/A`;
        } else {
            neededDeptExamEl.textContent = `--%`;
            if (neededDeptRawScoreEl) neededDeptRawScoreEl.textContent = `-- / 100 items`;
        }
    }

    if (feasibilityBadge) {
        if (reqPrefi <= 100 && reqPrefi >= 0) {
            feasibilityBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            feasibilityBadge.textContent = 'Achievable 🟢';
        } else if (reqPrefi > 100) {
            feasibilityBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-500/20 text-rose-400 border border-rose-500/30';
            feasibilityBadge.textContent = 'Unreachable 🔴';
        } else {
            feasibilityBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-fusee-cyan/20 text-fusee-cyan border border-fusee-cyan/30';
            feasibilityBadge.textContent = 'Target Met 🌟';
        }
    }
}

function computeSubBreakdown(deptId, topicId, ratioDept, ratioTopic, targetInputId) {
    const val1 = parseFloat(document.getElementById(deptId)?.value);
    const val2 = parseFloat(document.getElementById(topicId)?.value);
    
    if (!isNaN(val1) || !isNaN(val2)) {
        const score1 = isNaN(val1) ? 0 : val1;
        const score2 = isNaN(val2) ? 0 : val2;
        const calculated = (score1 * ratioDept) + (score2 * ratioTopic);
        const targetInput = document.getElementById(targetInputId);
        if (targetInput) {
            targetInput.value = calculated.toFixed(1);
            calculateTargetGrade();
        }
    }
}

function initTargetGradeEvents() {
    ['tg-wPL', 'tg-wMT', 'tg-wPF', 'tg-gradePL', 'tg-gradeMT', 'tg-subPF-topic', 'tg-subPF-dept-total'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.hasListener) {
            el.addEventListener('input', calculateTargetGrade);
            el.dataset.hasListener = 'true';
        }
    });

    const subInputs = [
        { d: 'tg-subPL-topic', t: 'tg-subPL-psets', r1: 0.90, r2: 0.10, target: 'tg-gradePL' },
        { d: 'tg-subMT-dept', t: 'tg-subMT-topic', r1: 0.80, r2: 0.20, target: 'tg-gradeMT' }
    ];

    subInputs.forEach(item => {
        const el1 = document.getElementById(item.d);
        const el2 = document.getElementById(item.t);
        const handler = () => computeSubBreakdown(item.d, item.t, item.r1, item.r2, item.target);
        if (el1) el1.addEventListener('input', handler);
        if (el2) el2.addEventListener('input', handler);
    });

    const preset104545 = document.getElementById('tg-preset104545Btn');
    if (preset104545 && !preset104545.dataset.hasListener) {
        preset104545.addEventListener('click', () => {
            document.getElementById('tg-wPL').value = 10;
            document.getElementById('tg-wMT').value = 45;
            document.getElementById('tg-wPF').value = 45;
            calculateTargetGrade();
        });
        preset104545.dataset.hasListener = 'true';
    }

    const presetEngg = document.getElementById('tg-presetEnggBtn');
    if (presetEngg && !presetEngg.dataset.hasListener) {
        presetEngg.addEventListener('click', () => {
            document.getElementById('tg-wPL').value = 20;
            document.getElementById('tg-wMT').value = 20;
            document.getElementById('tg-wPF').value = 20;
            document.getElementById('tg-wFR').value = 40;
            calculateTargetGrade();
        });
        presetEngg.dataset.hasListener = 'true';
    }
}

// Base-40 Modal Logic
window.openTargetGradeBase40 = function(period) {
    tgActiveBase40Period = period;
    const modal = document.getElementById('tg-base40Modal');
    if (modal) {
        modal.classList.remove('hidden');
        updateBase40ModalCalc();

        const rawEl = document.getElementById('tg-b40Raw');
        const totalEl = document.getElementById('tg-b40Total');
        if (rawEl && !rawEl.dataset.hasB40Listener) {
            rawEl.addEventListener('input', updateBase40ModalCalc);
            rawEl.dataset.hasB40Listener = 'true';
        }
        if (totalEl && !totalEl.dataset.hasB40Listener) {
            totalEl.addEventListener('input', updateBase40ModalCalc);
            totalEl.dataset.hasB40Listener = 'true';
        }
    }
};

window.closeTargetGradeBase40 = function() {
    const modal = document.getElementById('tg-base40Modal');
    if (modal) modal.classList.add('hidden');
};

function updateBase40ModalCalc() {
    const raw = parseFloat(document.getElementById('tg-b40Raw')?.value) || 0;
    const total = parseFloat(document.getElementById('tg-b40Total')?.value) || 1;
    const transmuted = 40 + (60 * (raw / total));
    const resText = document.getElementById('tg-b40ResultText');
    if (resText) resText.textContent = `${transmuted.toFixed(1)}%`;
}

window.applyTargetGradeBase40 = function() {
    const raw = parseFloat(document.getElementById('tg-b40Raw')?.value) || 0;
    const total = parseFloat(document.getElementById('tg-b40Total')?.value) || 1;
    const transmuted = Math.min(100, Math.max(0, 40 + (60 * (raw / total))));

    if (tgActiveBase40Period === 'pl') {
        const el = document.getElementById('tg-gradePL');
        if (el) el.value = transmuted.toFixed(1);
    } else {
        const el = document.getElementById('tg-gradeMT');
        if (el) el.value = transmuted.toFixed(1);
    }

    closeTargetGradeBase40();
    calculateTargetGrade();
};