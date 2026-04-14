/* ============================================
    REBALANCE ANIMATION - CONFIGURATION
    ============================================ */

/**
 * Global configuration for the global rebalance animation.
 * These values can be adjusted to customize the experience.
 */

const REBALANCE_ANIMATION_CONFIG = {
    /**
        * Duration (ms) of each rotation animation
        * Time it takes to interpolate from one position to another
        * Recommended: 800-1200ms for clear visibility
     */
    ROTATION_ANIMATION_DURATION: 10500,
    
    /**
        * Easing function for smooth animations
        * Options: 'linear', 'easeInOutCubic', 'easeInOutQuad', 'easeOutCubic'
     */
    EASING_FUNCTION: 'easeInOutCubic',
    
    /**
        * Pause between rotations (after the previous animation ends)
        * Higher value = more time between rotations
        * Recommended: 200-400ms
     */
    PAUSE_BETWEEN_ROTATIONS: 700,
    
    /**
        * Time (ms) the node stays highlighted during rotation
        * Recommended: 300-500ms
     */
    NODE_HIGHLIGHT_DURATION: 300,
    
    /**
        * Show the final notification as an alert
        * If false, it is only shown in console.log
     */
    SHOW_FINAL_ALERT: true,
    
    /**
        * Progress bar animation duration
        * Higher value = smoother transition
     */
    PROGRESS_BAR_ANIMATION: 300,
    
    /**
        * Auto-scroll to the animation panel
     */
    AUTO_SCROLL_PANEL: true,
    
    /**
        * Time (ms) the panel stays visible after completion
        * Before showing the final alert
     */
    PANEL_DISPLAY_TIME_AFTER_COMPLETE: 1500,
    
    /**
        * Debug options - verbose console logs
     */
    DEBUG_MODE: true,
    
    /**
        * Link smoothness during animation
        * true = re-draw dynamically during the animation
        * false = re-draw only at the end
     */
    SMOOTH_LINK_REDRAW: true
};

/**
 * ============================================
 * CONFIGURATION: QUEUE PROCESSING
 * ============================================
 * 
 * Global configuration for animations during step-by-step
 * processing of the insertion queue (Process Queue)
 */
const QUEUE_ANIMATION_CONFIG = {
    /**
        * Duration (ms) between processing steps
        * Time the system waits before moving to the next step
        * Recommended: 800-1200ms to clearly visualize each insertion
     */
    STEP_DURATION_MS: 800,
    
    /**
        * Duration (ms) of the new node entry animation
        * Fade-in + smooth scale for the newly inserted node
        * Recommended: 400-600ms
     */
    NODE_ENTRY_DURATION_MS: 500,
    
    /**
        * Delay (ms) before finding and animating the node in the DOM
        * Gives D3 time to fully render it
        * Recommended: 200-400ms (D3 can be slow with large trees)
     */
    ANIMATION_DELAY_MS: 300,
    
    /**
        * Total duration (ms) the rotation badge remains visible
        * Includes enter + hold + exit
        * Recommended: 1500-2500ms
     */
    ROTATION_BADGE_DURATION_MS: 2000,
    
    /**
        * Duration (ms) of the rotation badge enter animation
     */
    ROTATION_BADGE_ENTER_DURATION: 400,
    
    /**
        * Duration (ms) of the rotation badge exit animation
     */
    ROTATION_BADGE_EXIT_DURATION: 300,
    
    /**
        * Color for the newly inserted node (highlight)
     */
        NODE_HIGHLIGHT_COLOR: '#fbbf24', // yellow
    
    /**
        * Color for a critical conflict node
     */
        CONFLICT_NODE_COLOR: '#ef4444', // red
    
    /**
        * Whether to show verbose console logs
     */
    DEBUG_MODE: false,
    
    /**
        * Duration of the AVL rotation animation (FLIP movement)
        * Recommended: 600-1000ms for visual clarity
     */
    ROTATION_ANIMATION_DURATION_MS: 800,

     /* ============================================
         CONFIGURATION: IMBALANCE DETECTION & VISUALIZATION
         ============================================ */
    
    /**
        * PHASE 1: Minimum time the node stays in alert state
        * The user should clearly perceive the pulse/shake animation
        * Recommended: 1000-1500ms
     */
    CONFLICT_ALERT_VISIBLE_MIN_DURATION: 1000,

    /**
        * PHASE 2: Pulse animation duration for the imbalanced node
        * Visual pulse only, without interrupting other operations
        * Recommended: 400-600ms
     */
    CONFLICT_NODE_PULSE_DURATION: 500,

    /**
        * PHASE 2: Enter animation duration for the balance tooltip/badge
        * Shows the balance factor on top of the node
        * Recommended: 300-400ms
     */
    CONFLICT_TOOLTIP_ENTER_DURATION: 350,

    /**
        * PHASE 2: Total time the tooltip stays visible (includes enter + hold)
        * The user can read the balance factor before it disappears
        * Recommended: 900-1200ms
     */
    CONFLICT_TOOLTIP_VISIBLE_DURATION: 1000,

    /**
        * PHASE 2: Tooltip exit animation duration
        * Smooth fade-out when visualization completes
        * Recommended: 300-400ms
     */
    CONFLICT_TOOLTIP_EXIT_DURATION: 300,

    /**
        * PHASE 3: Delay between finishing the alert and starting rotation
        * Brief pause so the user sees it will be resolved
        * Recommended: 200-400ms
     */
    CONFLICT_TO_ROTATION_DELAY: 300,

    /**
        * PHASE 4: Conflict resolution animation duration
        * The node returns to its normal color/style
        * Recommended: 400-600ms
     */
    CONFLICT_RESOLUTION_DURATION: 500,

    /**
        * Duration (ms) of queue item removal animation
        * Smooth slide-out or fade-out
        * Recommended: 300-500ms
     */
    QUEUE_ITEM_REMOVAL_DURATION_MS: 400,
    
    /**
        * Duration (ms) of the final summary animation
        * Slide in / out of the summary modal
     */
    SUMMARY_ANIMATION_DURATION: 500,
};

// Function to update configuration
function updateRebalanceAnimationConfig(options) {
    Object.assign(REBALANCE_ANIMATION_CONFIG, options);
    console.log('✅ Configuración de animación actualizada:', REBALANCE_ANIMATION_CONFIG);
}

// Function to update queue configuration
function updateQueueAnimationConfig(options) {
    Object.assign(QUEUE_ANIMATION_CONFIG, options);
    console.log('✅ Configuración de animación de cola actualizada:', QUEUE_ANIMATION_CONFIG);
}

// Function to reset to default values
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
