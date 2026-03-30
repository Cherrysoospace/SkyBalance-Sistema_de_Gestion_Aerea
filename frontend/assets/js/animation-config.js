/* ============================================
   ANIMACIÓN DE REBALANCEO - CONFIGURACIÓN
   ============================================ */

/**
 * Configuración global para la animación del rebalanceo global.
 * Estos valores pueden ser ajustados para personalizar la experiencia.
 */

const REBALANCE_ANIMATION_CONFIG = {
    /**
     * Delay (ms) entre cada rotación
     * Mayor valor = animación más lenta
     * Recomendado: 600-1000ms
     */
    DELAY_BETWEEN_ROTATIONS: 1500,
    
    /**
     * Tiempo (ms) que el nodo permanece resaltado
     * Recomendado: 400-800ms
     */
    NODE_HIGHLIGHT_DURATION: 600,
    
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
    PANEL_DISPLAY_TIME_AFTER_COMPLETE: 2000,
    
    /**
     * Opciones de debug
     */
    DEBUG_MODE: false // Habilitar logs detallados en consola
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
