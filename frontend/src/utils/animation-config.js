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
    ROTATION_ANIMATION_DURATION: 10500,
    
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
    PAUSE_BETWEEN_ROTATIONS: 700,
    
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
    DEBUG_MODE: true,
    
    /**
     * Suavidad de links durante animación
     * true = re-dibujar dinámicamente durante la animación
     * false = re-dibujar solo al final
     */
    SMOOTH_LINK_REDRAW: true
};

/**
 * ============================================
 * CONFIGURACIÓN: PROCESAMIENTO DE COLA
 * ============================================
 * 
 * Configuración global para animaciones durante el procesamiento
 * paso a paso de la cola de inserciones (Procesar Cola)
 */
const QUEUE_ANIMATION_CONFIG = {
    /**
     * Duración (ms) entre cada paso de procesamiento
     * Tiempo que espera el sistema antes de ir al siguiente paso
     * Recomendado: 800-1200ms para visualizar bien cada inserción
     */
    STEP_DURATION_MS: 800,
    
    /**
     * Duración (ms) de la animación de entrada del nodo nuevo
     * Fade-in + scale suave del nodo recién insertado
     * Recomendado: 400-600ms
     */
    NODE_ENTRY_DURATION_MS: 500,
    
    /**
     * Delay (ms) antes de buscar y animar el nodo en el DOM
     * Permite tiempo para que D3 lo renderice completamente
     * Recomendado: 200-400ms (D3 puede ser lento con árboles grandes)
     */
    ANIMATION_DELAY_MS: 300,
    
    /**
     * Duración total (ms) que el badge de rotación permanece visible
     * Incluye entrada + permanencia + salida
     * Recomendado: 1500-2500ms
     */
    ROTATION_BADGE_DURATION_MS: 2000,
    
    /**
     * Duración (ms) de la animación de entrada del badge de rotación
     */
    ROTATION_BADGE_ENTER_DURATION: 400,
    
    /**
     * Duración (ms) de la animación de salida del badge de rotación
     */
    ROTATION_BADGE_EXIT_DURATION: 300,
    
    /**
     * Color del nodo recién insertado (highlight)
     */
    NODE_HIGHLIGHT_COLOR: '#fbbf24', // amarillo
    
    /**
     * Color del nodo en conflicto crítico
     */
    CONFLICT_NODE_COLOR: '#ef4444', // rojo
    
    /**
     * Si mostrar logs detallados en consola
     */
    DEBUG_MODE: false,
    
    /**
     * Duración de la animación de rotación AVL (movimiento FLIP)
     * Recomendado: 600-1000ms para claridad visual
     */
    ROTATION_ANIMATION_DURATION_MS: 800,

    /* ============================================
       CONFIGURACIÓN: DETECCIÓN Y VISUALIZACIÓN DE DESBALANCE
       ============================================ */
    
    /**
     * FASE 1: Tiempo mínimo que el nodo permanece en estado de alerta
     * El usuario debe percibir claramente la animación de pulso/shake
     * Recomendado: 1000-1500ms
     */
    CONFLICT_ALERT_VISIBLE_MIN_DURATION: 1000,

    /**
     * FASE 2: Duración de la animación de pulso del nodo desbalanceado
     * Solo el pulso visual sin interrupción de otras operaciones
     * Recomendado: 400-600ms
     */
    CONFLICT_NODE_PULSE_DURATION: 500,

    /**
     * FASE 2: Duración de la animación de entrada del tooltip/badge de balance
     * Muestra el factor de balance sobre el nodo
     * Recomendado: 300-400ms
     */
    CONFLICT_TOOLTIP_ENTER_DURATION: 350,

    /**
     * FASE 2: Duración total del tooltip visible (incluye entrada + permanencia)
     * El usuario puede leer el factor de balance antes de que desaparezca
     * Recomendado: 900-1200ms
     */
    CONFLICT_TOOLTIP_VISIBLE_DURATION: 1000,

    /**
     * FASE 2: Duración de la animación de salida del tooltip
     * Fade-out suave cuando se completa la visualización
     * Recomendado: 300-400ms
     */
    CONFLICT_TOOLTIP_EXIT_DURATION: 300,

    /**
     * FASE 3: Delay entre terminar alerta y comenzar rotación
     * Breve pausa para que el usuario vea que se va a resolver
     * Recomendado: 200-400ms
     */
    CONFLICT_TO_ROTATION_DELAY: 300,

    /**
     * FASE 4: Duración de la animación de resolución del conflicto
     * El nodo regresa a su estado normal de color/estilo
     * Recomendado: 400-600ms
     */
    CONFLICT_RESOLUTION_DURATION: 500,

    /**
     * Duración (ms) de la animación de remoción de item de la cola
     * Slide-out o fade-out suave
     * Recomendado: 300-500ms
     */
    QUEUE_ITEM_REMOVAL_DURATION_MS: 400,
    
    /**
     * Duración (ms) de la animación de resumen final
     * Slide in / out del modal de resumen
     */
    SUMMARY_ANIMATION_DURATION: 500,
};

// Función para actualizar configuración
function updateRebalanceAnimationConfig(options) {
    Object.assign(REBALANCE_ANIMATION_CONFIG, options);
    console.log('✅ Configuración de animación actualizada:', REBALANCE_ANIMATION_CONFIG);
}

// Función para actualizar configuración de cola
function updateQueueAnimationConfig(options) {
    Object.assign(QUEUE_ANIMATION_CONFIG, options);
    console.log('✅ Configuración de animación de cola actualizada:', QUEUE_ANIMATION_CONFIG);
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

export { REBALANCE_ANIMATION_CONFIG, QUEUE_ANIMATION_CONFIG, updateQueueAnimationConfig };
