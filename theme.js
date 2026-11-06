// Retractable Theme Dropdown Toggle
        window.toggleThemeDropdown = function(e) {
            if (e) e.stopPropagation();
            const menu = document.getElementById('theme-dropdown-menu');
            const chevron = document.getElementById('theme-dropdown-chevron');
            if (menu) {
                const isHidden = menu.classList.contains('hidden');
                menu.classList.toggle('hidden', !isHidden);
                if (chevron) {
                    chevron.classList.toggle('rotate-180', isHidden);
                }
            }
        };

        window.selectTheme = function(themeName) {
            window.setTheme(themeName);
            const menu = document.getElementById('theme-dropdown-menu');
            const chevron = document.getElementById('theme-dropdown-chevron');
            if (menu) menu.classList.add('hidden');
            if (chevron) chevron.classList.remove('rotate-180');
        };

        // Close Theme Menu when Clicking Outside
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('theme-dropdown-menu');
            const btn = document.getElementById('theme-dropdown-btn');
            if (menu && !menu.classList.contains('hidden')) {
                if (btn && !btn.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.add('hidden');
                    const chevron = document.getElementById('theme-dropdown-chevron');
                    if (chevron) chevron.classList.remove('rotate-180');
                }
            }
        });

        // Updated Theme Switcher Engine
window.setTheme = function(themeName) {
    const themeMap = {
        'fusee': { id: 'theme-btn-fusee', label: '⚡ Cyber', cls: "bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20" },
        'light': { id: 'theme-btn-light', label: '☀️ Light', cls: "bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20" },
        'cyber-pink': { id: 'theme-btn-pink', label: '🌸 Pink', cls: "bg-pink-500/10 text-pink-400 font-semibold border border-pink-500/20" }
    };

    // Fallback if themeName is null, undefined, or not in themeMap
    if (!themeName || !themeMap[themeName]) {
        themeName = 'fusee';
    }

    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('fusee_selected_theme', themeName);

    // Update active label on the closed trigger button
    const activeLabel = document.getElementById('theme-active-label');
    if (activeLabel) {
        activeLabel.innerHTML = themeMap[themeName].label;
    }

    Object.keys(themeMap).forEach(key => {
        const btn = document.getElementById(themeMap[key].id);
        if (btn) {
            btn.className = "w-full px-2.5 py-1.5 rounded-lg font-medium transition-colors " +
                (key === themeName ? themeMap[key].cls : "text-slate-400 hover:text-white hover:bg-slate-800/50");
        }
    });
};

// Instantly apply saved theme to prevent screen flashing (FOUC)
(function() {
    const savedTheme = localStorage.getItem('fusee_selected_theme') || 'fusee';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Initialize full theme state once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('fusee_selected_theme') || 'fusee';
    window.setTheme(savedTheme);
});