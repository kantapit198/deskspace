<?php
/**
 * Plugin Name: DeskSpace Configurator
 * Plugin URI: https://www.deskspace.in.th/
 * Description: Custom 2D/3D Desk Configurator System.
 * Version: 1.0.0
 * Author: DeskSpace
 * Author URI: https://www.deskspace.in.th/
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Define Plugin Constants
define('DS_CONFIGURATOR_PATH', plugin_dir_path(__FILE__));
define('DS_CONFIGURATOR_URL', plugin_dir_url(__FILE__));

if (!defined('EC_DRAW_API_URL')) {
    define('EC_DRAW_API_URL', 'https://script.google.com/macros/s/AKfycbx5WSVstxQA8NZdP7K4FkU_y69aJJDxIFEN0_aBzBo9rJNIVLrEIjG9YKimKraeuR5n7A/exec');
}

// Include plugin dependencies
require_once DS_CONFIGURATOR_PATH . 'includes/db-setup.php';
require_once DS_CONFIGURATOR_PATH . 'includes/ajax-handlers.php';
require_once DS_CONFIGURATOR_PATH . 'includes/shortcode.php';
require_once DS_CONFIGURATOR_PATH . 'includes/admin-dashboard.php';
require_once DS_CONFIGURATOR_PATH . 'includes/log-dashboard.php';

// Database Hook & Auto-Initialization
register_activation_hook(__FILE__, 'dslog_create_tables');
add_action('plugins_loaded', function() {
    if (get_option('dslog_db_version') !== '1.0.0') {
        dslog_create_tables();
        update_option('dslog_db_version', '1.0.0');
    }
});

// Enqueue styles and scripts
add_action('wp_enqueue_scripts', 'ds_configurator_enqueue_assets');
function ds_configurator_enqueue_assets() {
    // Only register assets here, they will be enqueued in the shortcode logic to avoid bloat
    wp_register_style(
        'ds-google-fonts-prompt',
        'https://fonts.googleapis.com/css2?family=Gemunu+Libre:wght@200;300;400;500;600;700;800&family=Prompt:wght@100;200;300;400;500;600;700;800;900&display=swap',
        [],
        null
    );

    wp_register_style(
        'ds-font-awesome',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        [],
        '6.4.0'
    );

    wp_register_style(
        'ds-configurator-style',
        DS_CONFIGURATOR_URL . 'assets/css/configurator.css',
        [],
        filemtime(DS_CONFIGURATOR_PATH . 'assets/css/configurator.css')
    );

    // Register JS files with dependencies
    wp_register_script(
        'ds-configurator-core',
        DS_CONFIGURATOR_URL . 'assets/js/configurator-core.js',
        ['jquery'],
        '1.0.0',
        true
    );

    wp_register_script(
        'ds-configurator-drawing',
        DS_CONFIGURATOR_URL . 'assets/js/configurator-drawing.js',
        ['ds-configurator-core'],
        '1.0.0',
        true
    );

    wp_register_script(
        'ds-configurator-ui',
        DS_CONFIGURATOR_URL . 'assets/js/configurator-ui.js',
        ['ds-configurator-drawing'],
        '1.0.0',
        true
    );

    wp_register_script(
        'ds-configurator-ai',
        DS_CONFIGURATOR_URL . 'assets/js/configurator-ai.js',
        ['ds-configurator-core'],
        '1.0.0',
        true
    );

    wp_register_script(
        'ds-configurator-misc',
        DS_CONFIGURATOR_URL . 'assets/js/configurator-misc.js',
        ['ds-configurator-ui'],
        '1.0.0',
        true
    );
}
