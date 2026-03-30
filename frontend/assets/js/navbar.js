/* ============================================
   NAVBAR SCRIPT - Lógica de la navegación
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Activar el link actual en el navbar
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar-menu a');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage ||
            (currentPage === '' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Smooth scroll para anclas
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
    // STRESS MODE - Comunicación entre páginas
    // ============================================
    applyStressModeState();
});

/**
 * Aplica el estado de modo estrés desde localStorage
 */
function applyStressModeState() {
    const stressMode = localStorage.getItem('stressMode') === 'true';

    // Buscar y actualizar el toggle de modo estrés si existe en esta página
    const toggleStressMode = document.getElementById('toggle-stress-mode');
    if (toggleStressMode) {
        toggleStressMode.checked = stressMode;
    }

    // Buscar y actualizar estado del botón de auditoría si existe
    const btnAuditar = document.getElementById('btn-auditar');
    if (btnAuditar) {
        btnAuditar.disabled = !stressMode;
    }
}

/**
 * Actualiza el estado de modo estrés en la página actual y en localStorage
 * Esta función debe ser llamada desde modo-estres.js cuando el toggle se modifique
 */
function updateStressModeState(enabled) {
    localStorage.setItem('stressMode', enabled ? 'true' : 'false');

    // Actualizar estado del botón de auditoría en la página actual
    const btnAuditar = document.getElementById('btn-auditar');
    if (btnAuditar) {
        btnAuditar.disabled = !enabled;
    }
}
