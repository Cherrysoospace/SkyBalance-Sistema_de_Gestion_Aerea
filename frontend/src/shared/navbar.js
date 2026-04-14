/* ============================================
    NAVBAR SCRIPT - Navigation logic
    ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Activate the current link in the navbar
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar-menu a');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage ||
            (currentPage === '' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ============================================
    // STRESS MODE - Cross-page communication
    // ============================================
    applyStressModeState();
});

/**
 * Applies the stress mode state from localStorage
 */
function applyStressModeState() {
    const stressMode = localStorage.getItem('stressMode') === 'true';

    // Find and update the stress mode toggle if it exists on this page
    const toggleStressMode = document.getElementById('toggle-stress-mode');
    if (toggleStressMode) {
        toggleStressMode.checked = stressMode;
    }

    // Find and update the audit button state if it exists
    const btnAuditar = document.getElementById('btn-auditar');
    if (btnAuditar) {
        btnAuditar.disabled = !stressMode;
    }
}

/**
 * Updates the stress mode state on the current page and in localStorage
 * This function should be called from modo-estres.js when the toggle changes
 */
function updateStressModeState(enabled) {
    localStorage.setItem('stressMode', enabled ? 'true' : 'false');

    // Update the audit button state on the current page
    const btnAuditar = document.getElementById('btn-auditar');
    if (btnAuditar) {
        btnAuditar.disabled = !enabled;
    }
}

export { applyStressModeState, updateStressModeState };
