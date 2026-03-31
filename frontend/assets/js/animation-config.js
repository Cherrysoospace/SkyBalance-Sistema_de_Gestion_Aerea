/* ============================================
   ANIMACIÓN DE REBALANCEO - CONFIGURACIÓN
   ============================================ */

/**
 * Configuración global para la animación del rebalanceo global.
 * Estos valores pueden ser ajustados para personalizar la experiencia.
 */

const REBALANCE_ANIMATION_CONFIG = {
    /**
     * Duración (ms) de cada animación de rotación
     * Tiempo que tarda en interpolarse de una posición a otra
     * Recomendado: 800-1200ms para visibilidad clara
     */
    ROTATION_ANIMATION_DURATION: 1500,
    
    /**
     * Función de easing para animaciones suaves
     * Opciones: 'linear', 'easeInOutCubic', 'easeInOutQuad', 'easeOutCubic'
     */
    EASING_FUNCTION: 'easeInOutCubic',
    
    /**
     * Pausa entre cada rotación (después de que termina animación anterior)
     * Mayor valor = más tiempo entre rotaciones
     * Recomendado: 200-400ms
     */
    PAUSE_BETWEEN_ROTATIONS: 400,
    
    /**
     * Tiempo (ms) que el nodo permanece resaltado durante la rotación
     * Recomendado: 300-500ms
     */
    NODE_HIGHLIGHT_DURATION: 300,
    
    /**
     * Mostrar notificación final como alert
     * Si es false, solo se muestra en console.log
     */
    SHOW_FINAL_ALERT: true,
    
    /**
     * Anim duration de la barra de progreso
     * Mayor valor = transición más suave
     */
    PROGRESS_BAR_ANIMATION: 300,
    
    /**
     * Auto-scroll al panel de animación
     */
    AUTO_SCROLL_PANEL: true,
    
    /**
     * Tiempo (ms) que el panel permanece visible después de completar
     * Antes de mostrar el alert final
     */
    PANEL_DISPLAY_TIME_AFTER_COMPLETE: 1500,
    
    /**
     * Opciones de debug - logs detallados en consola
     */
    DEBUG_MODE: false,
    
    /**
     * Suavidad de links durante animación
     * true = re-dibujar dinámicamente durante la animación
     * false = re-dibujar solo al final
     */
    SMOOTH_LINK_REDRAW: true
};

// Función para actualizar configuración
function updateRebalanceAnimationConfig(options) {
    Object.assign(REBALANCE_ANIMATION_CONFIG, options);
    console.log('✅ Configuración de animación actualizada:', REBALANCE_ANIMATION_CONFIG);
}

// Función para reset a valores por defecto
function resetRebalanceAnimationConfig() {
    REBALANCE_ANIMATION_CONFIG.DELAY_BETWEEN_ROTATIONS = 800;
    REBALANCE_ANIMATION_CONFIG.NODE_HIGHLIGHT_DURATION = 600;
    REBALANCE_ANIMATION_CONFIG.SHOW_FINAL_ALERT = true;
    REBALANCE_ANIMATION_CONFIG.PROGRESS_BAR_ANIMATION = 300;
    REBALANCE_ANIMATION_CONFIG.AUTO_SCROLL_PANEL = true;
    REBALANCE_ANIMATION_CONFIG.PANEL_DISPLAY_TIME_AFTER_COMPLETE = 2000;
    REBALANCE_ANIMATION_CONFIG.DEBUG_MODE = false;
    console.log('✅ Configuración de animación reseteada a valores por defecto');
}
