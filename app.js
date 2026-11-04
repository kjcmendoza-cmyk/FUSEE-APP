// Real-Time Clock & Dynamic Greeting Script
        function updateClockAndGreeting() {
            const now = new Date();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; 
            
            const timeString = `${hours}:${minutes} ${ampm}`;
            const clockEl = document.getElementById('clock-display');
            if (clockEl) clockEl.textContent = timeString;

            const greetingEl = document.getElementById('greeting-display');
            if (greetingEl) {
                const curHour = now.getHours();
                if (curHour < 12) greetingEl.textContent = 'Good Morning ⚡';
                else if (curHour < 18) greetingEl.textContent = 'Good Afternoon ⚡';
                else greetingEl.textContent = 'Good Evening ⚡';
            }
        }
        setInterval(updateClockAndGreeting, 1000);
        updateClockAndGreeting();

        // Search Filtering Logic with "No Results" State Handler
        function filterSystems() {
            const searchInput = document.getElementById('search-input');
            if (!searchInput) return;
            const query = searchInput.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.system-card');
            const clearBtn = document.getElementById('clear-search');
            const noResultsMsg = document.getElementById('no-results-msg');
            let visibleCount = 0;

            if (clearBtn) {
                if (query.length > 0) clearBtn.classList.remove('hidden');
                else clearBtn.classList.add('hidden');
            }

            const activePill = document.querySelector('.filter-pill.active-pill');
            const activeCategory = activePill ? activePill.getAttribute('data-filter') : 'all';

            cards.forEach(card => {
                const searchData = card.getAttribute('data-name').toLowerCase();
                const cardCategory = card.getAttribute('data-category');

                const matchesQuery = searchData.includes(query);
                const matchesCategory = activeCategory === 'all' || cardCategory === activeCategory;

                if (matchesQuery && matchesCategory) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (noResultsMsg) {
                if (visibleCount === 0) noResultsMsg.classList.remove('hidden');
                else noResultsMsg.classList.add('hidden');
            }
        }

        function clearSearch() {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
                filterSystems();
            }
        }

        // Category Filter Pills Handler
        function setFilter(category) {
            const pills = document.querySelectorAll('.filter-pill');
            pills.forEach(pill => {
                if (pill.getAttribute('data-filter') === category) {
                    pill.className = 'filter-pill active-pill flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-fusee-cyan text-slate-950 transition shadow-neon-cyan';
                } else {
                    pill.className = 'filter-pill flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-fusee-cyan transition';
                }
            });

            filterSystems();
        }
         // Global Lab Status Setter (Invoked by Firestore & manual toggle)
        window.setGlobalStatusUI = function(status) {
            const simIndicator = document.getElementById('sim-indicator');
            const simText = document.getElementById('sim-text');

            if (status === 'ALL OPEN') {
                if (simIndicator) simIndicator.className = 'w-2 h-2 rounded-full bg-fusee-lime animate-ping';
                if (simText) {
                    simText.className = 'font-semibold text-fusee-lime';
                    simText.textContent = 'ALL OPEN';
                }
                window.refreshAllSystemStatuses();
            } else if (status === 'LIMITED') {
                if (simIndicator) simIndicator.className = 'w-2 h-2 rounded-full bg-fusee-yellow animate-ping';
                if (simText) {
                    simText.className = 'font-semibold text-fusee-yellow';
                    simText.textContent = 'LIMITED';
                }
                window.refreshAllSystemStatuses();
            } else {
                if (simIndicator) simIndicator.className = 'w-2 h-2 rounded-full bg-fusee-magenta animate-ping';
                if (simText) {
                    simText.className = 'font-semibold text-fusee-magenta';
                    simText.textContent = 'CLOSED';
                }
                const statusBadges = document.querySelectorAll('.status-badge');
                statusBadges.forEach(badge => {
                    badge.className = 'status-badge px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1';
                    badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> CLOSED';
                });
            }
        };

        // Manual Lab Status Toggle Button Handler
        let simState = 0; // 0 = OPEN, 1 = LIMITED, 2 = CLOSED
        function toggleLabStatusSimulation() {
            simState = (simState + 1) % 3;
            const states = ['ALL OPEN', 'LIMITED', 'CLOSED'];
            window.setGlobalStatusUI(states[simState]);
        }

        // Toast Notification Engine
function showToast(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    let themeClasses = 'border-emerald-500/50 text-emerald-400 shadow-lg';
    let iconClass = 'fa-circle-check text-emerald-400';

    if (type === 'error') {
        themeClasses = 'border-rose-500/50 text-rose-400 shadow-neon-pink';
        iconClass = 'fa-circle-xmark text-rose-400';
    } else if (type === 'info') {
        themeClasses = 'border-fusee-cyan/50 text-fusee-cyan shadow-neon-cyan';
        iconClass = 'fa-circle-info text-fusee-cyan';
    } else if (type === 'warning') {
        themeClasses = 'border-fusee-yellow/50 text-fusee-yellow shadow-lg';
        iconClass = 'fa-triangle-exclamation text-fusee-yellow';
    }

    // Changed items-start -> items-center, added w-full
    toast.className = `pointer-events-auto flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/95 border backdrop-blur-xl text-xs font-semibold shadow-2xl transition-all duration-300 transform -translate-y-2 opacity-0 w-full ${themeClasses}`;
    
    // Added text-center to message container
    toast.innerHTML = `
    <i class="fa-solid ${iconClass} text-base flex-shrink-0"></i>
    <div class="flex-1 min-w-0 leading-relaxed text-slate-200 text-center">${message}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white transition flex-shrink-0 ml-1">
        <i class="fa-solid fa-xmark text-xs"></i>
    </button>
`;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('-translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Global Alert Override
window.alert = function(message) {
    const isError = /fail|error|invalid|prohibited|denied/i.test(message);
    const isInfo = /login|sign|copied|notice/i.test(message);
    showToast(message, isError ? 'error' : (isInfo ? 'info' : 'success'));

};


// ========================================================
// IN-APP MERCH CHECKOUT SYSTEM ENGINE
// ========================================================
let activeCheckoutItem = null;
let currentQuantity = 1;
let unitNumericPrice = 0;

// 1. Open Order Modal
window.openMerchOrderModal = function(index) {
    if (!window.currentMerchItems || !window.currentMerchItems[index]) {
        alert("Item data unavailable. Please try again.");
        return;
    }

    activeCheckoutItem = window.currentMerchItems[index];
    currentQuantity = 1;

    const rawPrice = activeCheckoutItem.price ? activeCheckoutItem.price.replace(/[^0-9.]/g, '') : '0';
    unitNumericPrice = parseFloat(rawPrice) || 0;

    const imgEl = document.getElementById('checkout-item-img');
    const iconEl = document.getElementById('checkout-item-icon');
    if (activeCheckoutItem.imageUrl) {
        imgEl.src = activeCheckoutItem.imageUrl;
        imgEl.classList.remove('hidden');
        iconEl.classList.add('hidden');
    } else {
        imgEl.classList.add('hidden');
        iconEl.classList.remove('hidden');
    }

    document.getElementById('checkout-item-title').innerText = activeCheckoutItem.title || "EE Merchandise";
    document.getElementById('checkout-item-badge').innerText = activeCheckoutItem.badge || "PRE-ORDER";
    document.getElementById('checkout-item-unit-price').innerText = `₱${unitNumericPrice.toFixed(2)}`;

    if (window.paymentInfo) {
        document.getElementById('checkout-payment-name').innerText = window.paymentInfo.name || "FUSEE Treasurer";
        document.getElementById('checkout-payment-number').innerText = window.paymentInfo.number || "N/A";
        
        const qrContainer = document.getElementById('checkout-qr-container');
        const qrImg = document.getElementById('checkout-qr-img');
        if (window.paymentInfo.qrUrl) {
            qrImg.src = window.paymentInfo.qrUrl;
            qrContainer.classList.remove('hidden');
        } else {
            qrContainer.classList.add('hidden');
        }
    }

    const sizeContainer = document.getElementById('checkout-size-container');
    const selectedSizeInput = document.getElementById('checkout-selected-size');
    selectedSizeInput.value = "";
    
    document.querySelectorAll('#size-pill-group .size-pill').forEach(btn => {
        btn.classList.remove('border-fusee-magenta', 'bg-fusee-magenta/20', 'text-fusee-magenta');
        btn.classList.add('border-slate-700', 'bg-slate-900', 'text-white');
    });

    if (activeCheckoutItem.requiresSize === false) {
        sizeContainer.classList.add('hidden');
        selectedSizeInput.value = "N/A";
    } else {
        sizeContainer.classList.remove('hidden');
    }

    if (window.currentUser) {
        if (window.currentUser.displayName) {
            document.getElementById('checkout-student-name').value = window.currentUser.displayName;
        }
        if (window.currentUser.email) {
            document.getElementById('checkout-student-email').value = window.currentUser.email;
        }
    }

    updateMerchQty(0);

    if (typeof window.openModal === 'function') {
        window.openModal('merch-order-modal');
    } else {
        document.getElementById('merch-order-modal').classList.remove('hidden-sheet');
    }
};

// 2. Select Size Pill Handler
window.selectMerchSize = function(size) {
    document.getElementById('checkout-selected-size').value = size;
    document.querySelectorAll('#size-pill-group .size-pill').forEach(btn => {
        if (btn.getAttribute('data-size') === size) {
            btn.classList.remove('border-slate-700', 'bg-slate-900', 'text-white');
            btn.classList.add('border-fusee-magenta', 'bg-fusee-magenta/20', 'text-fusee-magenta');
        } else {
            btn.classList.remove('border-fusee-magenta', 'bg-fusee-magenta/20', 'text-fusee-magenta');
            btn.classList.add('border-slate-700', 'bg-slate-900', 'text-white');
        }
    });
};

// 3. Quantity Handler
window.updateMerchQty = function(change) {
    currentQuantity += change;
    if (currentQuantity < 1) currentQuantity = 1;
    
    document.getElementById('checkout-qty-display').innerText = currentQuantity;
    const grandTotal = unitNumericPrice * currentQuantity;
    document.getElementById('checkout-total-price').innerText = `₱${grandTotal.toFixed(2)}`;
};

// 4. Handle Order Submission to Firestore
window.handleMerchOrderSubmit = async function(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submit-order-btn');
    const selectedSize = document.getElementById('checkout-selected-size').value;

    if (activeCheckoutItem.requiresSize !== false && !selectedSize) {
        alert("Please select a size before placing your order.");
        return;
    }

    const studentName = document.getElementById('checkout-student-name').value.trim();
    const studentEmail = document.getElementById('checkout-student-email').value.trim();
    const studentId = document.getElementById('checkout-student-id').value.trim();
    const courseYearSec = document.getElementById('checkout-student-course').value.trim();
    const gcashRefNo = document.getElementById('checkout-gcash-ref').value.trim();

    if (!studentName || !studentEmail || !studentId || !courseYearSec || !gcashRefNo) {
        alert("Please fill in all required fields.");
        return;
    }

    if (gcashRefNo.length < 10) {
        alert("Please enter a valid GCash / Maya Reference Number (at least 10–13 digits).");
        return;
    }

    const grandTotal = unitNumericPrice * currentQuantity;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting Order...`;

    try {
        await window.addDoc(window.collection(window.db, "merch_orders"), {
            itemTitle: activeCheckoutItem.title || "EE Merch",
            itemPrice: activeCheckoutItem.price || `₱${unitNumericPrice.toFixed(2)}`,
            size: selectedSize || "N/A",
            quantity: currentQuantity,
            totalAmount: grandTotal,
            studentName: studentName,
            studentEmail: studentEmail,
            studentId: studentId,
            courseYearSec: courseYearSec,
            gcashRefNo: gcashRefNo,
            status: "PENDING",
            createdAt: window.serverTimestamp()
        });

        alert("🎉 Order submitted successfully! FUSEE officers will verify your payment reference shortly.");

        document.getElementById('merch-checkout-form').reset();
        if (typeof window.closeModal === 'function') {
            window.closeModal('merch-order-modal');
        } else {
            document.getElementById('merch-order-modal').classList.add('hidden-sheet');
        }
    } catch (err) {
        console.error("Error placing order:", err);
        alert("Failed to submit order: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Confirm & Submit Order</span>`;
    }
};

// --- Enhanced Lightbox Zoom Engine (Mouse + Touch + Wheel + Double-Click / Double-Tap) ---
let currentScale = 1;
let initialPinchDistance = 0;
let initialScale = 1;
let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;

window.openImageZoomModal = function(frontUrl, backUrl, btnElement) {
    const modal = document.getElementById('imageZoomModal');
    const zoomedImg = document.getElementById('zoomedImage');
    if (!modal || !zoomedImg) return;
    
    let targetUrl = frontUrl;
    if (btnElement) {
        const card = btnElement.closest('.group') || btnElement.closest('div');
        const backImg = card ? card.querySelector('.merch-back-img') : null;
        const isShowingBack = backImg && window.getComputedStyle(backImg).opacity === '1';
        targetUrl = (isShowingBack && backUrl) ? backUrl : frontUrl;
    }

    zoomedImg.src = targetUrl;
    
    // Reset transforms upon opening
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    updateImageTransform();

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
};

window.closeImageZoomModal = function() {
    const modal = document.getElementById('imageZoomModal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        updateImageTransform();
    }, 300);
};

function updateImageTransform() {
    const zoomedImg = document.getElementById('zoomedImage');
    if (zoomedImg) {
        zoomedImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    }
}

function initImageZoomEngine() {
    const zoomedImg = document.getElementById('zoomedImage');
    const zoomContainer = document.getElementById('zoomModalViewport') || (zoomedImg ? zoomedImg.parentElement : null);
    if (!zoomedImg || !zoomContainer) return;

    zoomedImg.addEventListener('dragstart', (e) => e.preventDefault());

    // 1. Mouse Wheel Zooming (PC)
    zoomContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
        const newScale = Math.min(Math.max(1, currentScale * zoomFactor), 5);
        if (newScale === 1) {
            translateX = 0;
            translateY = 0;
        }
        currentScale = newScale;
        updateImageTransform();
    }, { passive: false });

    // 2. Double Click (PC) & Double Tap (Phone) Toggle
    let lastTapTime = 0;
    const handleDoubleZoom = (e) => {
        e.preventDefault();
        if (currentScale > 1) {
            currentScale = 1;
            translateX = 0;
            translateY = 0;
        } else {
            currentScale = 2.5;
        }
        updateImageTransform();
    };

    zoomedImg.addEventListener('dblclick', handleDoubleZoom);

    // 3. Desktop Mouse Dragging
    zoomedImg.addEventListener('mousedown', (e) => {
        if (currentScale > 1) {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            zoomedImg.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateImageTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (zoomedImg) zoomedImg.style.cursor = currentScale > 1 ? 'grab' : 'default';
        }
    });

    // 4. Mobile Two-Finger Pinch-to-Zoom & One-Finger Drag Pan
zoomedImg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = currentScale;
    } else if (e.touches.length === 1) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength < 300 && tapLength > 0) {
            handleDoubleZoom(e);
        } else if (currentScale > 1) {
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
        lastTapTime = currentTime;
    }
}, { passive: false });

zoomedImg.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance > 0) {
        e.preventDefault();
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        
        const scaleFactor = currentDistance / initialPinchDistance;
        let newScale = initialScale * scaleFactor;
        
        // Clamp scale between 1x and 4x
        newScale = Math.min(Math.max(1, newScale), 4);
        
        if (newScale === 1) {
            translateX = 0;
            translateY = 0;
        }
        
        currentScale = newScale;
        updateImageTransform();
    } else if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        updateImageTransform();
    }
}, { passive: false });

zoomedImg.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = 0;
    }
    
    if (e.touches.length === 1 && currentScale > 1) {
        // Seamlessly switch to single-finger panning for the remaining finger
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    } else if (e.touches.length === 0) {
        isDragging = false;
    }
});
zoomedImg.addEventListener('touchcancel', () => {
    isDragging = false;
    initialPinchDistance = 0;
});
}

// Attach event listeners after DOM element creation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageZoomEngine);
} else {
    initImageZoomEngine();
}
// Generic debounce utility to delay execution until typing pauses
function debounce(func, delay = 250) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
// Custom Confirmation Modal Helper
    window.showConfirm = function(message, title = "Confirmation Required", iconClass = "fa-circle-question") {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const modalBox = document.getElementById('confirm-modal-box');
            const titleEl = document.getElementById('confirm-modal-title');
            const msgEl = document.getElementById('confirm-modal-msg');
            const iconEl = document.getElementById('confirm-modal-icon');
            const btnCancel = document.getElementById('confirm-btn-cancel');
            const btnOk = document.getElementById('confirm-btn-ok');

            if (!modal) {
                resolve(window.confirm(message));
                return;
            }

            titleEl.textContent = title;
            msgEl.textContent = message;
            if (iconEl) iconEl.className = `fa-solid ${iconClass}`;

            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modalBox.classList.remove('scale-95');
                modalBox.classList.add('scale-100');
            });

            function cleanup(result) {
                modal.classList.add('opacity-0');
                modalBox.classList.remove('scale-100');
                modalBox.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    btnOk.removeEventListener('click', onOk);
                    btnCancel.removeEventListener('click', onCancel);
                    resolve(result);
                }, 200);
            }

            function onOk() { cleanup(true); }
            function onCancel() { cleanup(false); }

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);
        });
    };

// Floating Quick-Access Speed Dial Toggle Engine
window.toggleQuickLinksMenu = function(forceState) {
    const menu = document.getElementById('quick-links-menu');
    const icon = document.getElementById('quick-links-icon');
    const btn = document.getElementById('quick-links-toggle-btn');
    if (!menu || !icon || !btn) return;

    const isHidden = menu.classList.contains('hidden');
    const shouldOpen = forceState !== undefined ? forceState : isHidden;

    if (shouldOpen) {
        menu.classList.remove('hidden');
        btn.classList.remove('opacity-40');
        btn.classList.add('opacity-100', 'shadow-neon-cyan', 'border-fusee-cyan');
        requestAnimationFrame(() => {
            menu.classList.remove('opacity-0', 'scale-90');
            menu.classList.add('opacity-100', 'scale-100');
        });
        icon.className = 'fa-solid fa-xmark text-lg';
    } else {
        menu.classList.remove('opacity-100', 'scale-100');
        menu.classList.add('opacity-0', 'scale-90');
        btn.classList.remove('shadow-neon-cyan');
        btn.classList.add('opacity-40');
        setTimeout(() => {
            menu.classList.add('hidden');
            icon.className = 'fa-solid fa-bolt text-lg';
        }, 200);
    }
};

// Auto-close quick links floating menu when clicking anywhere outside
document.addEventListener('click', (e) => {
    const widget = document.getElementById('quick-links-widget');
    if (widget && !widget.contains(e.target)) {
        window.toggleQuickLinksMenu(false);
    }
});
