<?php
/**
 * Deskspace Config — Admin Dashboard
 * v2.1 — Enhanced UI + Audit Log + Rollback + Image Upload
 * Integrated into deskspace-configurator plugin.
 */

if (!defined('ABSPATH')) exit;

// ===== CONFIG =====
if (!defined('DS_ADMIN_API_URL')) {
    define('DS_ADMIN_API_URL', 'https://script.google.com/macros/s/AKfycbx5WSVstxQA8NZdP7K4FkU_y69aJJDxIFEN0_aBzBo9rJNIVLrEIjG9YKimKraeuR5n7A/exec');
}
if (!defined('DS_ADMIN_TOKEN')) {
    define('DS_ADMIN_TOKEN', 'xK9mP2vL7nQ4wR8jT5hF3bN6cY1dZ0eM');
}
define('DS_ADMIN_CACHE_TTL', 300);
define('DS_AUDIT_LOG_OPTION', 'ds_audit_log');
define('DS_AUDIT_LOG_MAX',    200); // เก็บ log สูงสุด 200 รายการ

// ===========================================================
// SECTION 1: REGISTER ADMIN MENU
// ===========================================================

add_action('admin_menu', 'ds_register_admin_menu');
function ds_register_admin_menu() {
    if (!current_user_can('manage_options')) return;

    add_menu_page(
        'Deskspace Config', 'Deskspace Config', 'manage_options',
        'deskspace-config', 'ds_admin_page_main',
        'dashicons-admin-customizer', 30
    );

    $sheets = [
        'models'       => ['Models',       'โมเดลโต๊ะ (Models)'],
        'admin_models' => ['AdminModels',   'Admin Models (ขนาดพิเศษ)'],
        'colors'       => ['Colors',        'สีโต๊ะ (Colors)'],
        'prices'       => ['Prices',        'ราคา (Prices)'],
        'legs'         => ['Legs',          'ขาโต๊ะ (Legs)'],
        'edges'        => ['Edges',         'ขอบโต๊ะ (Edges)'],
        'options'      => ['Options',       'อุปกรณ์เสริม (Options)'],
        'remote'       => ['Remote',        'รีโมท (Remote)'],
    ];

    foreach ($sheets as $slug => [$sheetName, $label]) {
        add_submenu_page(
            'deskspace-config', $label, $label, 'manage_options',
            'deskspace-sheet-' . $slug,
            function() use ($sheetName) { ds_render_sheet_page($sheetName); }
        );
    }

    add_submenu_page(
        'deskspace-config', '🔄 Cache & Sync', '🔄 Cache & Sync',
        'manage_options', 'deskspace-sync', 'ds_admin_page_sync'
    );

    add_submenu_page(
        'deskspace-config', '📋 Audit Log', '📋 Audit Log',
        'manage_options', 'deskspace-audit', 'ds_admin_page_audit'
    );
}

// ===========================================================
// SECTION 2: ENQUEUE ADMIN ASSETS
// ===========================================================

add_action('admin_enqueue_scripts', 'ds_admin_enqueue');
function ds_admin_enqueue($hook) {
    if (strpos($hook, 'deskspace') === false) return;
    wp_enqueue_media();
}

// ✅ Inject CSS โดยตรงผ่าน admin_head — ทำงานได้แน่นอนทุก WP version
add_action('admin_head', 'ds_admin_inject_css');
function ds_admin_inject_css() {
    $screen = get_current_screen();
    if (!$screen || strpos($screen->id, 'deskspace') === false) return;
    echo '<style id="ds-admin-css">' . ds_admin_css() . '</style>';
}

add_action('admin_head', 'ds_admin_force_js_vars');
function ds_admin_force_js_vars() {
    $screen = get_current_screen();
    if ($screen && strpos($screen->id, 'deskspace') !== false) {
        echo '<script>window.dsAdmin = ' . wp_json_encode([
            'ajaxUrl'     => admin_url('admin-ajax.php'),
            'nonce'       => wp_create_nonce('ds_admin_nonce'),
            'apiUrl'      => DS_ADMIN_API_URL,
            'adminToken'  => DS_ADMIN_TOKEN,
            // pattern สำหรับตรวจ field ที่เป็นรูปภาพ (case-insensitive regex ฝั่ง JS)
            'imageFieldPattern' => 'image|imageurl|img|photo|thumbnail|rawimage',
        ]) . ';</script>';
    }
}

// ===========================================================
// SECTION 3: AJAX HANDLERS
// ===========================================================

add_action('wp_ajax_ds_admin_fetch_sheet',  'ds_ajax_fetch_sheet');
add_action('wp_ajax_ds_admin_save_sheet',   'ds_ajax_save_sheet');
add_action('wp_ajax_ds_admin_clear_cache',  'ds_ajax_clear_cache');
add_action('wp_ajax_ds_admin_get_log',      'ds_ajax_get_log');
add_action('wp_ajax_ds_admin_rollback',     'ds_ajax_rollback');
add_action('wp_ajax_ds_admin_clear_log',    'ds_ajax_clear_log');

function ds_ajax_fetch_sheet() {
    check_ajax_referer('ds_admin_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');

    $sheet_name = sanitize_text_field($_POST['sheet'] ?? '');
    $cache_key  = 'ds_sheet_' . strtolower($sheet_name);
    $cached     = get_transient($cache_key);

    if ($cached !== false && empty($_POST['force_refresh'])) {
        wp_send_json_success(['data' => $cached, 'from_cache' => true]);
    }

    $response = wp_remote_get(
        add_query_arg(['action' => 'admin_meta', 'token' => DS_ADMIN_TOKEN], DS_ADMIN_API_URL),
        ['timeout' => 20, 'sslverify' => false]
    );

    if (is_wp_error($response)) wp_send_json_error($response->get_error_message());

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body['ok'])) wp_send_json_error($body['error'] ?? 'Unknown API error');

    $sheet_data = $body['sheets'][$sheet_name] ?? null;
    if (!$sheet_data) wp_send_json_error("Sheet '{$sheet_name}' not found");

    foreach (($body['sheets'] ?? []) as $sname => $sdata) {
        set_transient('ds_sheet_' . strtolower($sname), $sdata, DS_ADMIN_CACHE_TTL);
    }

    wp_send_json_success(['data' => $sheet_data, 'from_cache' => false]);
}

function ds_ajax_save_sheet() {
    check_ajax_referer('ds_admin_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');

    $sheet     = sanitize_text_field($_POST['sheet']     ?? '');
    $operation = sanitize_text_field($_POST['operation'] ?? 'upsert');
    $row_json  = wp_unslash($_POST['row_data'] ?? '{}');
    $row_data  = json_decode($row_json, true);

    // --- บันทึก Audit Log ---
    $old_json = wp_unslash($_POST['old_data'] ?? '{}');
    $old_data = json_decode($old_json, true);
    ds_write_audit_log($sheet, $operation, $old_data, $row_data);
    // -------------------------

    $payload = [
        'action'    => 'update_sheet',
        'token'     => DS_ADMIN_TOKEN,
        'sheet'     => $sheet,
        'operation' => $operation,
    ];

    if ($operation === 'full_replace') {
        $payload['headers'] = $row_data['headers'] ?? [];
        $payload['rows']    = $row_data['rows']    ?? [];
    } elseif ($operation === 'delete') {
        $payload['key'] = sanitize_text_field($_POST['row_key'] ?? '');
    } else {
        $payload['row'] = $row_data;
    }

    $body_json = wp_json_encode($payload);
    $response  = wp_remote_post(DS_ADMIN_API_URL, [
        'timeout'     => 30,
        'redirection' => 0,
        'headers'     => ['Content-Type' => 'application/json', 'Content-Length' => strlen($body_json)],
        'body'        => $body_json,
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error('เซิร์ฟเวอร์เชื่อมต่อไม่ได้: ' . $response->get_error_message());
    }

    $code     = wp_remote_retrieve_response_code($response);
    $raw_body = wp_remote_retrieve_body($response);

    if (in_array($code, [301, 302, 303, 307])) {
        $location = wp_remote_retrieve_header($response, 'location');
        if ($location) {
            $response = wp_remote_get($location, ['timeout' => 30]);
            $raw_body = wp_remote_retrieve_body($response);
        }
    }

    $body = json_decode($raw_body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $preview = mb_substr(strip_tags($raw_body), 0, 150);
        wp_send_json_error("API Error (Code $code): " . ($preview ?: 'ไม่มีข้อความตอบกลับ'));
    }

    if (!empty($body['ok'])) {
        delete_transient('ds_sheet_' . strtolower($sheet));
        wp_send_json_success($body);
    } else {
        wp_send_json_error($body['error'] ?? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

function ds_ajax_clear_cache() {
    check_ajax_referer('ds_admin_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');

    $sheets = ['colors', 'legs', 'edges', 'options', 'remote', 'models', 'prices', 'adminmodels'];
    foreach ($sheets as $s) delete_transient('ds_sheet_' . $s);
    delete_transient('deskspace_proposal_builder_meta_v1');

    wp_send_json_success(['message' => 'Cache cleared successfully']);
}

function ds_ajax_get_log() {
    check_ajax_referer('ds_admin_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');

    $logs   = get_option(DS_AUDIT_LOG_OPTION, []);
    $filter = sanitize_text_field($_POST['filter_sheet'] ?? '');
    if ($filter) {
        $logs = array_values(array_filter($logs, fn($l) => ($l['sheet'] ?? '') === $filter));
    }
    wp_send_json_success(['logs' => array_reverse($logs)]);
}

function ds_ajax_rollback() {
    check_ajax_referer('ds_admin_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');

    $log_id = sanitize_text_field($_POST['log_id'] ?? '');
    $logs   = get_option(DS_AUDIT_LOG_OPTION, []);
    $entry  = null;

    foreach ($logs as $l) {
        if (($l['id'] ?? '') === $log_id) { $entry = $l; break; }
    }

    if (!$entry || empty($entry['old_data']) || empty($entry['sheet'])) {
        wp_send_json_error('ไม่พบข้อมูล Snapshot หรือไม่สามารถ Rollback ได้');
    }

    $sheet    = $entry['sheet'];
    $old_data = $entry['old_data'];

    // ส่ง upsert กลับด้วยข้อมูลเดิม
    $payload = wp_json_encode([
        'action'    => 'update_sheet',
        'token'     => DS_ADMIN_TOKEN,
        'sheet'     => $sheet,
        'operation' => 'upsert',
        'row'       => $old_data,
    ]);

    $response = wp_remote_post(DS_ADMIN_API_URL, [
        'timeout' => 30, 'redirection' => 0,
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => $payload,
    ]);

    if (is_wp_error($response)) wp_send_json_error($response->get_error_message());

    $code     = wp_remote_retrieve_response_code($response);
    $raw_body = wp_remote_retrieve_body($response);
    if (in_array($code, [301, 302, 303, 307])) {
        $loc = wp_remote_retrieve_header($response, 'location');
        if ($loc) $raw_body = wp_remote_retrieve_body(wp_remote_get($loc, ['timeout' => 30]));
    }

    $body = json_decode($raw_body, true);
    if (!empty($body['ok'])) {
        // บันทึก log ว่า rollback แล้ว
        ds_write_audit_log($sheet, 'rollback', $entry['new_data'] ?? [], $old_data, $log_id);
        delete_transient('ds_sheet_' . strtolower($sheet));
        wp_send_json_success(['message' => "Rollback สำเร็จ — Sheet: {$sheet}"]);
    } else {
        wp_send_json_error($body['error'] ?? 'Rollback ล้มเหลว');
    }
}

function ds_ajax_clear_log() {
    check_ajax_referer('ds_admin_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');
    delete_option(DS_AUDIT_LOG_OPTION);
    wp_send_json_success(['message' => 'Log cleared']);
}

// ===========================================================
// SECTION 3b: AUDIT LOG WRITER
// ===========================================================

function ds_write_audit_log(string $sheet, string $operation, $old_data, $new_data, string $rollback_ref = '') {
    $user  = wp_get_current_user();
    $ip    = sanitize_text_field(
        $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['HTTP_X_REAL_IP']
        ?? $_SERVER['REMOTE_ADDR']
        ?? 'unknown'
    );
    // ถ้ามีหลาย IP ให้เอาตัวแรก
    $ip = trim(explode(',', $ip)[0]);

    $entry = [
        'id'           => uniqid('ds_', true),
        'time'         => current_time('mysql'),
        'time_ts'      => time(),
        'sheet'        => $sheet,
        'operation'    => $operation,
        'user_id'      => $user->ID,
        'user_login'   => $user->user_login,
        'user_display' => $user->display_name,
        'user_email'   => $user->user_email,
        'ip'           => $ip,
        'user_agent'   => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
        'old_data'     => $old_data,
        'new_data'     => $new_data,
        'rollback_ref' => $rollback_ref,
    ];

    $logs = get_option(DS_AUDIT_LOG_OPTION, []);
    $logs[] = $entry;
    // จำกัดขนาด log
    if (count($logs) > DS_AUDIT_LOG_MAX) {
        $logs = array_slice($logs, -DS_AUDIT_LOG_MAX);
    }
    update_option(DS_AUDIT_LOG_OPTION, $logs, false);
}

// ===========================================================
// SECTION 4: ADMIN PAGE RENDERERS
// ===========================================================

function ds_admin_page_main() { ?>
<div class="wrap ds-wrap">
    <div class="ds-hero">
        <div class="ds-hero-badge">ADMIN DASHBOARD</div>
        <h1 class="ds-hero-title">DESKSPACE <span>CONFIG</span></h1>
        <p class="ds-hero-sub">จัดการข้อมูลทั้งหมดสำหรับ Desk Configurator — เชื่อมต่อ Google Sheet แบบ Real-time</p>
    </div>

    <div class="ds-section-label">DATA SHEETS</div>
    <div class="ds-grid">
        <?php
        $tiles = [
            ['deskspace-sheet-models',       '📐', 'Models',          'กำหนดขนาดและ constraints',         'SHEET'],
            ['deskspace-sheet-admin_models', '🔐', 'Admin Models',    'ขนาดพิเศษสำหรับ Admin Mode',        'SHEET'],
            ['deskspace-sheet-colors',       '🎨', 'Colors',          'สีแผ่นท็อปและหมวดหมู่สี',           'SHEET'],
            ['deskspace-sheet-prices',       '💰', 'Prices',          'ราคาตาม Model + Color combination', 'SHEET'],
            ['deskspace-sheet-legs',         '🦿', 'Legs',            'ประเภทขาโต๊ะและ priceDelta',        'SHEET'],
            ['deskspace-sheet-edges',        '🔲', 'Edges',           'ประเภทขอบโต๊ะ (edge banding)',      'SHEET'],
            ['deskspace-sheet-options',      '🔧', 'Options',         'อุปกรณ์เสริม Add-ons',              'SHEET'],
            ['deskspace-sheet-remote',       '📡', 'Remote',          'ตัวเลือกรีโมทควบคุม',              'SHEET'],
        ];
        foreach ($tiles as [$slug, $icon, $label, $desc, $type]) : ?>
            <a href="<?= admin_url('admin.php?page=' . $slug) ?>" class="ds-card">
                <div class="ds-card-icon"><?= $icon ?></div>
                <div class="ds-card-body">
                    <div class="ds-card-tag"><?= $type ?></div>
                    <div class="ds-card-title"><?= $label ?></div>
                    <div class="ds-card-desc"><?= $desc ?></div>
                </div>
                <div class="ds-card-arrow">→</div>
            </a>
        <?php endforeach; ?>
    </div>

    <div class="ds-section-label" style="margin-top:32px">TOOLS</div>
    <div class="ds-grid ds-grid-2">
        <a href="<?= admin_url('admin.php?page=deskspace-sync') ?>" class="ds-card ds-card-tool">
            <div class="ds-card-icon">🔄</div>
            <div class="ds-card-body">
                <div class="ds-card-tag">TOOL</div>
                <div class="ds-card-title">Cache & Sync</div>
                <div class="ds-card-desc">จัดการ Cache และ Force Sync จาก Google Sheet</div>
            </div>
            <div class="ds-card-arrow">→</div>
        </a>
        <a href="<?= admin_url('admin.php?page=deskspace-audit') ?>" class="ds-card ds-card-tool">
            <div class="ds-card-icon">📋</div>
            <div class="ds-card-body">
                <div class="ds-card-tag">LOG</div>
                <div class="ds-card-title">Audit Log & Rollback</div>
                <div class="ds-card-desc">ดูประวัติการแก้ไขทั้งหมด พร้อมย้อนกลับเวอร์ชั่นก่อนหน้า</div>
            </div>
            <div class="ds-card-arrow">→</div>
        </a>
    </div>
</div>
<?php }

// -----------------------------------------------------------

function ds_render_sheet_page($sheet_name) {
    $labels = [
        'Models'      => ['โมเดลโต๊ะ',      'กำหนดค่า min/max ของความกว้าง/ยาวสำหรับโต๊ะแต่ละแบบ ผู้ใช้จะถูกจำกัดให้กรอกค่าในช่วงนี้'],
        'AdminModels' => ['Admin Models',    'ค่า min/max พิเศษที่ใช้เมื่อ Admin กดเปิด Admin Mode — ข้ามข้อจำกัดปกติได้'],
        'Colors'      => ['สีโต๊ะ',         'รายการสีแผ่นท็อปโต๊ะ พร้อม URL รูปภาพและหมวดหมู่'],
        'Prices'      => ['ราคา',            'ราคาฐานของโต๊ะตาม Model + Color combination'],
        'Legs'        => ['ขาโต๊ะ',         'ประเภทขาโต๊ะ พร้อม priceDelta ที่บวกเพิ่มจากราคาฐาน'],
        'Edges'       => ['ขอบโต๊ะ',        'ประเภทขอบโต๊ะ (edge banding)'],
        'Options'     => ['อุปกรณ์เสริม',   'อุปกรณ์เสริม เช่น Keyboard Tray, Monitor Arm ฯลฯ'],
        'Remote'      => ['รีโมท',          'ตัวเลือกรีโมทควบคุมโต๊ะ'],
    ];
    [$title, $desc] = $labels[$sheet_name] ?? [$sheet_name, ''];
    ?>
<div class="wrap ds-wrap">

    <div class="ds-page-header">
        <div class="ds-page-header-left">
            <a href="<?= admin_url('admin.php?page=deskspace-config') ?>" class="ds-back-link">← กลับหน้าหลัก</a>
            <h1 class="ds-page-title"><?= esc_html($title) ?></h1>
            <p class="ds-page-desc"><?= esc_html($desc) ?></p>
        </div>
        <div class="ds-page-actions">
            <button class="ds-btn ds-btn-ghost" id="ds-refresh-btn" data-sheet="<?= esc_attr($sheet_name) ?>">
                <span class="ds-btn-icon-wrap">↺</span> Refresh
            </button>
            <button class="ds-btn ds-btn-outline" id="ds-add-row-btn" style="display:none">
                + เพิ่มแถว
            </button>
            <button class="ds-btn ds-btn-gold" id="ds-save-all-btn" style="display:none">
                💾 บันทึกทั้งหมด
            </button>
        </div>
    </div>

    <div id="ds-sheet-status" class="ds-notice" style="display:none"></div>

    <div id="ds-loading" class="ds-loading-state">
        <div class="ds-spinner"></div>
        <div>
            <div class="ds-loading-title">กำลังโหลดข้อมูล</div>
            <div class="ds-loading-sub">เชื่อมต่อ Google Sheet...</div>
        </div>
    </div>

    <div id="ds-sheet-container" style="display:none">
        <div class="ds-table-meta">
            <span id="ds-row-count" class="ds-meta-badge"></span>
            <span id="ds-cache-badge"></span>
            <div style="margin-left:auto">
                <input type="text" id="ds-search" class="ds-search-input" placeholder="🔍 ค้นหาในตาราง...">
            </div>
        </div>
        <div id="ds-table-wrapper" class="ds-table-wrapper"></div>
        <div class="ds-table-footer">
            <span id="ds-footer-info" class="ds-footer-info"></span>
        </div>
    </div>

    <!-- EDIT MODAL -->
    <div id="ds-row-modal" class="ds-modal" style="display:none" role="dialog" aria-modal="true">
        <div class="ds-modal-overlay" onclick="dsCloseModal()"></div>
        <div class="ds-modal-box">
            <div class="ds-modal-header">
                <div>
                    <div class="ds-modal-sheet-tag"><?= esc_html($sheet_name) ?></div>
                    <h3 id="ds-modal-title" class="ds-modal-title">แก้ไขข้อมูล</h3>
                </div>
                <button class="ds-modal-close-btn" onclick="dsCloseModal()" aria-label="ปิด">✕</button>
            </div>
            <div class="ds-modal-body" id="ds-modal-fields"></div>
            <div class="ds-modal-footer">
                <button class="ds-btn ds-btn-ghost" onclick="dsCloseModal()">ยกเลิก</button>
                <button class="ds-btn ds-btn-gold" id="ds-modal-save-btn">💾 บันทึก</button>
            </div>
        </div>
    </div>

    <!-- DELETE CONFIRM MODAL -->
    <div id="ds-confirm-modal" class="ds-modal" style="display:none">
        <div class="ds-modal-overlay"></div>
        <div class="ds-modal-box ds-modal-box-sm">
            <div class="ds-modal-header">
                <h3 class="ds-modal-title" style="color:#dc2626">⚠️ ยืนยันการลบ</h3>
            </div>
            <div class="ds-modal-body">
                <p style="color:#555;line-height:1.7">คุณกำลังจะ<strong>ลบแถวนี้</strong>ออกจาก Google Sheet<br>การกระทำนี้จะถูกบันทึกใน Audit Log และสามารถ Rollback ได้</p>
            </div>
            <div class="ds-modal-footer">
                <button class="ds-btn ds-btn-ghost" id="ds-confirm-cancel">ยกเลิก</button>
                <button class="ds-btn ds-btn-danger" id="ds-confirm-ok">🗑 ยืนยันลบ</button>
            </div>
        </div>
    </div>

</div>

<script>
(function($) {
    const SHEET = '<?= esc_js($sheet_name) ?>';
    let currentData = null;
    let filteredRows = [];
    let editingRowIndex = -1;
    let pendingDeleteIdx = -1;
    let dsAdmin = window.dsAdmin || {};

    // ===== Load =====
    function loadSheetData(forceRefresh = false) {
        $('#ds-loading').show();
        $('#ds-sheet-container').hide();
        $('#ds-add-row-btn, #ds-save-all-btn').hide();
        $.ajax({
            url: dsAdmin.ajaxUrl, method: 'POST',
            data: { action: 'ds_admin_fetch_sheet', nonce: dsAdmin.nonce, sheet: SHEET, force_refresh: forceRefresh ? 1 : 0 },
            success(res) {
                if (res.success) {
                    currentData = res.data.data;
                    filteredRows = [...(currentData.rows || [])];
                    renderTable(filteredRows);
                    const badge = res.data.from_cache
                        ? '<span class="ds-badge ds-badge-cache">📦 Cached</span>'
                        : '<span class="ds-badge ds-badge-fresh">✅ Fresh</span>';
                    $('#ds-cache-badge').html(badge);
                    updateRowCount();
                    showStatus('โหลดข้อมูลสำเร็จ', 'success', 2500);
                } else {
                    showStatus('❌ ' + (res.data || 'เกิดข้อผิดพลาด'), 'error');
                }
            },
            error() { showStatus('❌ ไม่สามารถเชื่อมต่อได้', 'error'); },
            complete() {
                $('#ds-loading').hide();
                $('#ds-sheet-container').show();
                $('#ds-add-row-btn, #ds-save-all-btn').show();
            }
        });
    }

    // ===== Render Table =====
    // ตรวจว่า header นี้เป็น image field หรือไม่
    function isImageField(h) {
        return new RegExp(dsAdmin.imageFieldPattern, 'i').test(h);
    }

    function renderTable(rows) {
        if (!currentData || !currentData.headers || !currentData.headers.length) {
            $('#ds-table-wrapper').html('<div class="ds-empty-state"><div class="ds-empty-icon">📭</div><div>ไม่มีข้อมูลใน Sheet นี้</div></div>');
            return;
        }
        const headers = currentData.headers;
        let html = '<table class="ds-table"><thead><tr>';
        html += '<th class="ds-th-num">#</th>';
        headers.forEach(h => { html += `<th>${escHtml(h)}</th>`; });
        html += '<th class="ds-th-actions">Actions</th></tr></thead><tbody>';

        if (!rows || !rows.length) {
            html += `<tr><td colspan="${headers.length + 2}" class="ds-no-results">ไม่พบผลการค้นหา</td></tr>`;
        } else {
            rows.forEach((row, display_idx) => {
                const real_idx = currentData.rows.indexOf(row);
                html += `<tr class="ds-tr" data-idx="${real_idx}">`;
                html += `<td class="ds-td-num">${display_idx + 1}</td>`;
                headers.forEach(h => {
                    const val    = row[h] !== undefined ? row[h] : '';
                    const valStr = String(val);
                    const isImg  = isImageField(h);
                    // ตรวจสอบว่าเป็น multi-image (comma-separated URLs ที่เป็น http)
                    const imgUrls = isImg ? valStr.split(',').map(u => u.trim()).filter(u => u.startsWith('http')) : [];
                    const isMultiImg = imgUrls.length > 1;
                    const isSingleImg = imgUrls.length === 1;
                    const isUrl  = !isImg && valStr.startsWith('http');
                    html += `<td title="${escHtml(valStr)}">`;
                    if (isMultiImg) {
                        // แสดง thumbnail หลายรูปเรียงกัน
                        html += `<div class="ds-multi-thumb-wrap">`;
                        imgUrls.forEach((u, ui) => {
                            html += `<a href="${escHtml(u)}" target="_blank" class="ds-img-thumb-wrap" title="รูป ${ui+1}: ${escHtml(u)}">
                                <img src="${escHtml(u)}" class="ds-img-thumb" alt="${escHtml(h)} ${ui+1}"
                                     onerror="this.closest('.ds-img-thumb-wrap').innerHTML='<span class=\\'ds-url-link\\'>🔗</span>'">
                            </a>`;
                        });
                        html += `<span class="ds-multi-count">${imgUrls.length}</span></div>`;
                    } else if (isSingleImg) {
                        html += `<a href="${escHtml(imgUrls[0])}" target="_blank" class="ds-img-thumb-wrap">
                            <img src="${escHtml(imgUrls[0])}" class="ds-img-thumb" alt="${escHtml(h)}"
                                 onerror="this.closest('.ds-img-thumb-wrap').innerHTML='<span class=\\'ds-url-link\\'>🔗 Link</span>'">
                        </a>`;
                    } else if (isUrl) {
                        html += `<a href="${escHtml(valStr)}" target="_blank" class="ds-url-link">🔗 Link</a>`;
                    } else {
                        const display = valStr.length > 55 ? valStr.slice(0, 55) + '…' : valStr;
                        html += `<span class="ds-cell-val">${escHtml(display)}</span>`;
                    }
                    html += '</td>';
                });
                html += `<td class="ds-td-actions">
                    <button class="ds-action-btn ds-btn-edit" data-idx="${real_idx}" title="แก้ไข">✏️</button>
                    <button class="ds-action-btn ds-btn-delete" data-idx="${real_idx}" title="ลบ">🗑</button>
                </td></tr>`;
            });
        }
        html += '</tbody></table>';
        $('#ds-table-wrapper').html(html);
        updateFooterInfo(rows.length);
    }

    function updateRowCount() {
        const total = currentData?.rows?.length ?? 0;
        $('#ds-row-count').text(`${total} รายการ`);
    }

    function updateFooterInfo(showing) {
        const total = currentData?.rows?.length ?? 0;
        const text = showing < total ? `แสดง ${showing} จาก ${total} รายการ` : `${total} รายการทั้งหมด`;
        $('#ds-footer-info').text(text);
    }

    // ===== Search =====
    $('#ds-search').on('input', function() {
        const q = $(this).val().toLowerCase().trim();
        if (!currentData) return;
        if (!q) {
            filteredRows = [...currentData.rows];
        } else {
            filteredRows = currentData.rows.filter(row =>
                Object.values(row).some(v => String(v).toLowerCase().includes(q))
            );
        }
        renderTable(filteredRows);
    });

    // ===== Open Edit Modal =====
    function openEditModal(idx) {
        if (!currentData) return;
        editingRowIndex = idx;
        const isNew   = idx === -1;
        const row     = isNew ? {} : (currentData.rows[idx] || {});
        const headers = currentData.headers;

        $('#ds-modal-title').text(isNew ? '+ เพิ่มแถวใหม่' : '✏️ แก้ไขข้อมูล');
        let html = '<div class="ds-form-grid">';
        headers.forEach(h => {
            if (h === '_rowIndex') return;
            const val    = row[h] !== undefined ? String(row[h]) : '';
            const isImg  = isImageField(h);
            const isWide = isImg || /url|description|nameth|note/i.test(h);
            const isNum  = /price|delta|min_|max_|width|length|weight/i.test(h);

            html += `<div class="ds-form-field ${isWide ? 'ds-field-wide' : ''}" data-field="${escHtml(h)}">`;
            html += `<label class="ds-field-label">${escHtml(h)}`;
            if (isImg)      html += ' <span class="ds-field-hint ds-field-hint-img">🖼 image URL</span>';
            else if (isNum) html += ' <span class="ds-field-hint">numeric</span>';
            html += '</label>';

            if (isImg) {
                // ─── Multi-Image Field ────────────────────────────────────────
                const imgList = val ? val.split(',').map(u => u.trim()).filter(Boolean) : [''];
                html += `<div class="ds-multi-img-editor" data-field="${escHtml(h)}" id="ds-multi-img-${escHtml(h)}">`;
                imgList.forEach((u, i) => {
                    const safeU = u.replace(/"/g, '&quot;');
                    html += `<div class="ds-multi-img-item" data-index="${i}">
                        <div class="ds-multi-img-item-header">
                            <span class="ds-multi-img-label">รูปที่ ${i + 1}</span>
                            <button type="button" class="ds-btn ds-btn-danger-outline ds-btn-sm ds-multi-img-remove" data-field="${escHtml(h)}" data-index="${i}" ${imgList.length <= 1 ? 'style="display:none"' : ''}>✕ ลบ</button>
                        </div>
                        <div class="ds-img-preview-wrap ds-multi-img-preview" id="ds-preview-${escHtml(h)}-${i}">`;
                    if (u && u.startsWith('http')) {
                        html += `<img src="${safeU}" class="ds-img-preview-img" alt="preview"
                                     onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                                 <div class="ds-img-preview-empty" style="display:none">⚠️ โหลดรูปไม่ได้</div>`;
                    } else {
                        html += `<div class="ds-img-preview-empty">ยังไม่มีรูปภาพ</div>`;
                    }
                    html += `</div>
                        <div class="ds-img-field-controls">
                            <input class="ds-field-input ds-multi-img-url-input" type="text"
                                   data-field="${escHtml(h)}" data-index="${i}"
                                   value="${safeU}" placeholder="https://...">
                            <div class="ds-img-btn-row">
                                <button type="button" class="ds-btn ds-btn-outline ds-btn-sm ds-wp-media-multi-btn"
                                        data-field="${escHtml(h)}" data-index="${i}" data-preview="ds-preview-${escHtml(h)}-${i}">
                                    📁 Media Library
                                </button>
                                <button type="button" class="ds-btn ds-btn-ghost ds-btn-sm ds-multi-img-preview-btn"
                                        data-field="${escHtml(h)}" data-index="${i}" data-preview="ds-preview-${escHtml(h)}-${i}">
                                    👁 Preview
                                </button>
                            </div>
                        </div>
                    </div>`;
                });
                html += `<button type="button" class="ds-btn ds-btn-ghost ds-btn-sm ds-multi-img-add" data-field="${escHtml(h)}" style="margin-top:8px">
                            + เพิ่มรูปภาพ
                         </button>`;
                html += `<input type="hidden" name="${escHtml(h)}" class="ds-multi-img-combined" value="${val.replace(/"/g, '&quot;')}">`;
                html += `</div>`;
            } else if (/description|nameth|note/i.test(h)) {
                html += `<textarea class="ds-field-input" name="${escHtml(h)}" rows="2">${escHtml(val)}</textarea>`;
            } else {
                html += `<input class="ds-field-input" type="text" name="${escHtml(h)}" value="${escHtml(val)}">`;
            }
            html += '</div>';
        });
        html += '</div>';
        $('#ds-modal-fields').html(html);
        $('#ds-row-modal').show();
        $('#ds-modal-fields [name]').first().focus();

        // ── WordPress Media Library picker (Multi-Image) ──────────────────
        $('#ds-modal-fields').off('click.dsmedia').on('click.dsmedia', '.ds-wp-media-multi-btn', function() {
            const fieldName  = $(this).data('field');
            const idx        = parseInt($(this).data('index'));
            const previewId  = $(this).data('preview');

            const frame = wp.media({
                title:    'เลือกหรืออัพโหลดรูปภาพ',
                button:   { text: 'ใช้รูปภาพนี้' },
                multiple: false,
            });

            frame.on('select', function() {
                const attachment = frame.state().get('selection').first().toJSON();
                const url = attachment.url;
                $(`[data-field="${CSS.escape(fieldName)}"][data-index="${idx}"].ds-multi-img-url-input`).val(url);
                updateImgPreview(previewId, url);
                syncMultiImgCombined(fieldName);
            });

            frame.open();
        });

        // ── Manual Preview button (multi) ────────────────────────────────
        $('#ds-modal-fields').off('click.dspreview').on('click.dspreview', '.ds-multi-img-preview-btn', function() {
            const fieldName = $(this).data('field');
            const idx       = parseInt($(this).data('index'));
            const previewId = $(this).data('preview');
            const url       = $(`[data-field="${CSS.escape(fieldName)}"][data-index="${idx}"].ds-multi-img-url-input`).val().trim();
            updateImgPreview(previewId, url);
        });

        // ── URL input change → preview + sync combined ────────────────────
        $('#ds-modal-fields').off('input.dsurlpreview').on('input.dsurlpreview', '.ds-multi-img-url-input', function() {
            const fieldName = $(this).data('field');
            const idx       = parseInt($(this).data('index'));
            const previewId = `ds-preview-${fieldName}-${idx}`;
            const url       = $(this).val().trim();
            clearTimeout($(this).data('previewTimer'));
            $(this).data('previewTimer', setTimeout(() => {
                updateImgPreview(previewId, url);
                syncMultiImgCombined(fieldName);
            }, 600));
        });

        // ── Add new image slot ────────────────────────────────────────────
        $('#ds-modal-fields').off('click.dsmultiadd').on('click.dsmultiadd', '.ds-multi-img-add', function() {
            const fieldName = $(this).data('field');
            const $editor   = $(`#ds-multi-img-${CSS.escape(fieldName)}`);
            const newIdx    = $editor.find('.ds-multi-img-item').length;
            const previewId = `ds-preview-${fieldName}-${newIdx}`;
            const itemHtml  = `<div class="ds-multi-img-item" data-index="${newIdx}">
                <div class="ds-multi-img-item-header">
                    <span class="ds-multi-img-label">รูปที่ ${newIdx + 1}</span>
                    <button type="button" class="ds-btn ds-btn-danger-outline ds-btn-sm ds-multi-img-remove" data-field="${fieldName}" data-index="${newIdx}">✕ ลบ</button>
                </div>
                <div class="ds-img-preview-wrap ds-multi-img-preview" id="${previewId}">
                    <div class="ds-img-preview-empty">ยังไม่มีรูปภาพ</div>
                </div>
                <div class="ds-img-field-controls">
                    <input class="ds-field-input ds-multi-img-url-input" type="text"
                           data-field="${fieldName}" data-index="${newIdx}" value="" placeholder="https://...">
                    <div class="ds-img-btn-row">
                        <button type="button" class="ds-btn ds-btn-outline ds-btn-sm ds-wp-media-multi-btn"
                                data-field="${fieldName}" data-index="${newIdx}" data-preview="${previewId}">
                            📁 Media Library
                        </button>
                        <button type="button" class="ds-btn ds-btn-ghost ds-btn-sm ds-multi-img-preview-btn"
                                data-field="${fieldName}" data-index="${newIdx}" data-preview="${previewId}">
                            👁 Preview
                        </button>
                    </div>
                </div>
            </div>`;
            $(this).before(itemHtml);
            $editor.find('.ds-multi-img-remove').show();
            syncMultiImgCombined(fieldName);
        });

        // ── Remove image slot ─────────────────────────────────────────────
        $('#ds-modal-fields').off('click.dsmultiremove').on('click.dsmultiremove', '.ds-multi-img-remove', function() {
            const fieldName = $(this).data('field');
            $(this).closest('.ds-multi-img-item').remove();
            const $editor = $(`#ds-multi-img-${CSS.escape(fieldName)}`);
            $editor.find('.ds-multi-img-item').each(function(i) {
                $(this).attr('data-index', i);
                $(this).find('.ds-multi-img-label').text(`รูปที่ ${i + 1}`);
                $(this).find('[data-index]').attr('data-index', i);
                const newPreviewId = `ds-preview-${fieldName}-${i}`;
                $(this).find('.ds-multi-img-preview').attr('id', newPreviewId);
                $(this).find('.ds-wp-media-multi-btn').attr('data-preview', newPreviewId);
                $(this).find('.ds-multi-img-preview-btn').attr('data-preview', newPreviewId);
            });
            if ($editor.find('.ds-multi-img-item').length <= 1) {
                $editor.find('.ds-multi-img-remove').hide();
            }
            syncMultiImgCombined(fieldName);
        });

    } // end openEditModal

    function syncMultiImgCombined(fieldName) {
        const $editor = $(`#ds-multi-img-${CSS.escape(fieldName)}`);
        const urls = [];
        $editor.find('.ds-multi-img-url-input').each(function() {
            const u = $(this).val().trim();
            if (u) urls.push(u);
        });
        $editor.find('.ds-multi-img-combined').val(urls.join(','));
    }

    function updateImgPreview(previewId, url) {
        const $wrap = $(`#${CSS.escape(previewId)}`);
        if (!url || !url.startsWith('http')) {
            $wrap.html('<div class="ds-img-preview-empty">ยังไม่มีรูปภาพ</div>');
            return;
        }
        $wrap.html(`<img src="${url.replace(/"/g,'&quot;')}" class="ds-img-preview-img" alt="preview"
                         onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=\\'ds-img-preview-empty\\'>⚠️ โหลดรูปไม่ได้</div>')">`);
    }

    // ===== Save Row =====
    function saveRow() {
        if (!currentData) return;
        const fields  = {};
        const headers = currentData.headers;
        $('#ds-modal-fields [name]').each(function() {
            fields[$(this).attr('name')] = $(this).val();
        });

        const old_data = (editingRowIndex >= 0) ? {...currentData.rows[editingRowIndex]} : {};

        if (editingRowIndex >= 0 && editingRowIndex < currentData.rows.length) {
            Object.assign(currentData.rows[editingRowIndex], fields);
        } else {
            currentData.rows.push(fields);
        }
        filteredRows = [...currentData.rows];
        renderTable(filteredRows);
        updateRowCount();
        sendToSheet('upsert', fields, '', old_data);
        dsCloseModal();
    }

    // ===== Delete Row =====
    function deleteRow(idx) {
        pendingDeleteIdx = idx;
        $('#ds-confirm-modal').show();
    }

    $('#ds-confirm-ok').on('click', function() {
        $('#ds-confirm-modal').hide();
        const idx     = pendingDeleteIdx;
        const row     = currentData.rows[idx];
        const keyVal  = row ? String(row[currentData.headers[0]] || '') : '';
        const old_row = {...row};
        currentData.rows.splice(idx, 1);
        filteredRows = [...currentData.rows];
        renderTable(filteredRows);
        updateRowCount();
        if (keyVal) sendToSheet('delete', null, keyVal, old_row);
        pendingDeleteIdx = -1;
    });

    $('#ds-confirm-cancel').on('click', function() {
        $('#ds-confirm-modal').hide();
        pendingDeleteIdx = -1;
    });

    // ===== Send to Sheet =====
    function sendToSheet(operation, rowData, keyVal = '', oldData = {}) {
        showStatus('⏳ กำลังบันทึก...', 'info');
        const postData = {
            action: 'ds_admin_save_sheet',
            nonce: dsAdmin.nonce,
            sheet: SHEET,
            operation: operation,
            old_data: JSON.stringify(oldData),
        };
        if (operation === 'upsert')       postData.row_data = JSON.stringify(rowData);
        else if (operation === 'delete')  postData.row_key  = keyVal;

        $.ajax({
            url: dsAdmin.ajaxUrl, method: 'POST', data: postData,
            success(res) {
                if (res.success) showStatus('✅ บันทึกสำเร็จ! ข้อมูลอัพเดทใน Google Sheet แล้ว', 'success', 5000);
                else             showStatus('❌ Error: ' + (res.data || 'Save failed'), 'error');
            },
            error() { showStatus('❌ เชื่อมต่อ API ไม่สำเร็จ', 'error'); }
        });
    }

    // ===== Save All =====
    function saveAll() {
        if (!currentData || !confirm('บันทึกทั้งหมดไปยัง Google Sheet? (จะแทนที่ข้อมูลทั้งหมดใน Sheet)')) return;
        const headers = currentData.headers;
        const rows    = currentData.rows.map(r => headers.map(h => r[h] !== undefined ? r[h] : ''));
        showStatus('⏳ กำลังบันทึกทั้งหมด...', 'info');
        $.ajax({
            url: dsAdmin.ajaxUrl, method: 'POST',
            data: { action: 'ds_admin_save_sheet', nonce: dsAdmin.nonce, sheet: SHEET,
                    operation: 'full_replace', row_data: JSON.stringify({ headers, rows }),
                    old_data: JSON.stringify({}) },
            success(res) {
                if (res.success) showStatus('✅ บันทึกทั้งหมดสำเร็จ!', 'success', 5000);
                else             showStatus('❌ ' + (res.data || 'Failed'), 'error');
            },
            error() { showStatus('❌ เชื่อมต่อ API ไม่สำเร็จ', 'error'); }
        });
    }

    // ===== Helpers =====
    function showStatus(msg, type = 'info', autohide = 0) {
        const $el = $('#ds-sheet-status');
        $el.removeClass('ds-notice-success ds-notice-error ds-notice-info')
           .addClass('ds-notice-' + type).html(msg).show();
        if (autohide) setTimeout(() => $el.slideUp(300), autohide);
    }

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ===== Bindings =====
    $('#ds-refresh-btn').on('click', () => loadSheetData(true));
    $('#ds-add-row-btn').on('click', () => openEditModal(-1));
    $('#ds-save-all-btn').on('click', saveAll);
    $(document).on('click', '.ds-btn-edit',   function() { openEditModal(parseInt($(this).data('idx'))); });
    $(document).on('click', '.ds-btn-delete', function() { deleteRow(parseInt($(this).data('idx'))); });
    $('#ds-modal-save-btn').on('click', saveRow);
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') { dsCloseModal(); $('#ds-confirm-modal').hide(); }
    });

    window.dsCloseModal = function() { $('#ds-row-modal').hide(); editingRowIndex = -1; };

    loadSheetData();
})(jQuery);
</script>
    <?php
}

// -----------------------------------------------------------

function ds_admin_page_sync() { ?>
<div class="wrap ds-wrap">
    <div class="ds-page-header">
        <div class="ds-page-header-left">
            <a href="<?= admin_url('admin.php?page=deskspace-config') ?>" class="ds-back-link">← กลับหน้าหลัก</a>
            <h1 class="ds-page-title">🔄 Cache & Sync</h1>
            <p class="ds-page-desc">จัดการ Cache และบังคับ Sync ข้อมูลจาก Google Sheet</p>
        </div>
    </div>
    <div id="ds-sync-status" class="ds-notice" style="display:none"></div>
    <div class="ds-info-grid">
        <div class="ds-info-card">
            <div class="ds-info-card-header">🗑️ Clear All Cache</div>
            <p class="ds-info-card-desc">ล้าง cache ทั้งหมดเพื่อให้เว็บโหลดข้อมูลใหม่จาก Google Sheet ในครั้งถัดไป</p>
            <button class="ds-btn ds-btn-gold" id="ds-clear-cache-btn">Clear Cache ทั้งหมด</button>
        </div>
        <div class="ds-info-card">
            <div class="ds-info-card-header">📊 Cache Status</div>
            <div class="ds-stat-row"><span class="ds-stat-label">Sheet Cache TTL</span><span class="ds-stat-val"><?= DS_ADMIN_CACHE_TTL / 60 ?> นาที</span></div>
            <div class="ds-stat-row"><span class="ds-stat-label">Frontend Meta Cache</span><span class="ds-stat-val">15 นาที</span></div>
            <div class="ds-stat-row"><span class="ds-stat-label">API URL</span><span class="ds-stat-val ds-stat-url">Apps Script</span></div>
            <div class="ds-note-box">💡 หลังแก้ไขข้อมูลในชีต ควร Clear Cache เพื่อให้เว็บแสดงข้อมูลล่าสุด</div>
        </div>
    </div>
</div>
<script>
(function($) {
    let dsAdmin = window.dsAdmin || {};
    $('#ds-clear-cache-btn').on('click', function() {
        const $btn = $(this).prop('disabled', true).text('⏳ Clearing...');
        $.ajax({
            url: dsAdmin.ajaxUrl, method: 'POST',
            data: { action: 'ds_admin_clear_cache', nonce: dsAdmin.nonce },
            success(res) {
                const type = res.success ? 'success' : 'error';
                const msg  = res.success ? '✅ Cache cleared successfully!' : '❌ ' + (res.data || 'Failed');
                const $st  = $('#ds-sync-status');
                $st.removeClass('ds-notice-success ds-notice-error ds-notice-info')
                   .addClass('ds-notice-' + type).html(msg).show();
                setTimeout(() => $st.slideUp(300), 4000);
            },
            complete() { $btn.prop('disabled', false).text('Clear Cache ทั้งหมด'); }
        });
    });
})(jQuery);
</script>
<?php }

// -----------------------------------------------------------

function ds_admin_page_audit() { ?>
<div class="wrap ds-wrap">
    <div class="ds-page-header">
        <div class="ds-page-header-left">
            <a href="<?= admin_url('admin.php?page=deskspace-config') ?>" class="ds-back-link">← กลับหน้าหลัก</a>
            <h1 class="ds-page-title">📋 Audit Log & Rollback</h1>
            <p class="ds-page-desc">ประวัติการแก้ไขข้อมูลทั้งหมด — สามารถกด Rollback เพื่อย้อนกลับได้</p>
        </div>
        <div class="ds-page-actions">
            <button class="ds-btn ds-btn-danger-outline" id="ds-clear-log-btn">🗑 ล้าง Log ทั้งหมด</button>
        </div>
    </div>

    <div id="ds-audit-status" class="ds-notice" style="display:none"></div>

    <div class="ds-log-filter-bar">
        <label class="ds-filter-label">กรองตาม Sheet:</label>
        <select id="ds-log-filter" class="ds-select">
            <option value="">— ทั้งหมด —</option>
            <option>Models</option><option>AdminModels</option><option>Colors</option>
            <option>Prices</option><option>Legs</option><option>Edges</option>
            <option>Options</option><option>Remote</option>
        </select>
        <button class="ds-btn ds-btn-ghost" id="ds-log-refresh-btn">↺ โหลดใหม่</button>
        <span id="ds-log-count" class="ds-meta-badge" style="margin-left:auto"></span>
    </div>

    <div id="ds-log-loading" class="ds-loading-state">
        <div class="ds-spinner"></div>
        <div><div class="ds-loading-title">กำลังโหลด Log</div></div>
    </div>

    <div id="ds-log-container" style="display:none">
        <div class="ds-log-list" id="ds-log-list"></div>
    </div>

    <!-- Diff Modal -->
    <div id="ds-diff-modal" class="ds-modal" style="display:none">
        <div class="ds-modal-overlay" onclick="$('#ds-diff-modal').hide()"></div>
        <div class="ds-modal-box ds-modal-box-lg">
            <div class="ds-modal-header">
                <h3 class="ds-modal-title">🔍 ดู Diff — การเปลี่ยนแปลง</h3>
                <button class="ds-modal-close-btn" onclick="$('#ds-diff-modal').hide()">✕</button>
            </div>
            <div class="ds-modal-body" id="ds-diff-content"></div>
            <div class="ds-modal-footer">
                <button class="ds-btn ds-btn-ghost" onclick="$('#ds-diff-modal').hide()">ปิด</button>
                <button class="ds-btn ds-btn-gold" id="ds-do-rollback-btn">↩️ Rollback เป็นค่านี้</button>
            </div>
        </div>
    </div>

</div>

<script>
(function($) {
    let pendingRollbackId = null;
    let dsAdmin = window.dsAdmin || {};

    function loadLog() {
        $('#ds-log-loading').show();
        $('#ds-log-container').hide();
        const filter = $('#ds-log-filter').val();
        $.ajax({
            url: dsAdmin.ajaxUrl, method: 'POST',
            data: { action: 'ds_admin_get_log', nonce: dsAdmin.nonce, filter_sheet: filter },
            success(res) {
                if (res.success) renderLog(res.data.logs);
                else             showAuditStatus('❌ โหลด Log ไม่สำเร็จ', 'error');
            },
            complete() {
                $('#ds-log-loading').hide();
                $('#ds-log-container').show();
            }
        });
    }

    function renderLog(logs) {
        $('#ds-log-count').text(logs.length + ' รายการ');
        if (!logs.length) {
            $('#ds-log-list').html('<div class="ds-empty-state"><div class="ds-empty-icon">📭</div><div>ยังไม่มีประวัติการแก้ไข</div></div>');
            return;
        }

        const opLabels = { upsert: '✏️ แก้ไข/เพิ่ม', delete: '🗑 ลบ', full_replace: '🔁 Replace ทั้งหมด', rollback: '↩️ Rollback' };
        const opColors = { upsert: '#d1fae5:#065f46', delete: '#fee2e2:#991b1b', full_replace: '#eff6ff:#1e40af', rollback: '#fef9c3:#854d0e' };

        let html = '';
        logs.forEach(log => {
            const [bgCol, fgCol] = (opColors[log.operation] || '#f3f4f6:#374151').split(':');
            const opLabel = opLabels[log.operation] || log.operation;
            const date    = new Date(log.time.replace(' ', 'T'));
            const dateStr = isNaN(date) ? log.time : date.toLocaleString('th-TH', { dateStyle:'medium', timeStyle:'short' });

            const keyField = log.new_data && typeof log.new_data === 'object'
                ? Object.values(log.new_data)[0] ?? '—'
                : (log.old_data && typeof log.old_data === 'object' ? Object.values(log.old_data)[0] ?? '—' : '—');

            html += `<div class="ds-log-entry" data-id="${escHtml(log.id)}">
                <div class="ds-log-entry-left">
                    <span class="ds-log-op-badge" style="background:${bgCol};color:${fgCol}">${opLabel}</span>
                    <span class="ds-log-sheet-tag">${escHtml(log.sheet)}</span>
                    <span class="ds-log-key-preview">${escHtml(String(keyField).slice(0,40))}</span>
                </div>
                <div class="ds-log-entry-right">
                    <div class="ds-log-meta">
                        <span title="User">👤 ${escHtml(log.user_login)}</span>
                        <span title="IP">🌐 ${escHtml(log.ip)}</span>
                        <span title="เวลา">🕐 ${escHtml(dateStr)}</span>
                    </div>
                    <div class="ds-log-actions">
                        <button class="ds-btn ds-btn-ghost ds-btn-sm ds-log-diff-btn" data-id="${escHtml(log.id)}">🔍 Diff</button>
                        ${log.operation !== 'rollback' && log.old_data && typeof log.old_data === 'object' && Object.keys(log.old_data).length
                            ? `<button class="ds-btn ds-btn-gold ds-btn-sm ds-log-rollback-btn" data-id="${escHtml(log.id)}">↩️ Rollback</button>`
                            : '<span class="ds-log-no-rollback">—</span>'
                        }
                    </div>
                </div>
            </div>`;
        });

        $('#ds-log-list').html(html);
        logs.forEach(log => {
            $(`.ds-log-entry[data-id="${log.id}"]`).data('log', log);
        });
    }

    // Diff viewer
    $(document).on('click', '.ds-log-diff-btn', function() {
        const log = $(this).closest('.ds-log-entry').data('log');
        if (!log) return;
        pendingRollbackId = log.id;

        const oldD = log.old_data && typeof log.old_data === 'object' ? log.old_data : {};
        const newD = log.new_data && typeof log.new_data === 'object' ? log.new_data : {};
        const allKeys = [...new Set([...Object.keys(oldD), ...Object.keys(newD)])];

        let html = '<div class="ds-diff-table-wrap"><table class="ds-diff-table"><thead><tr><th>Field</th><th>ก่อน</th><th>หลัง</th></tr></thead><tbody>';
        let hasChanges = false;
        allKeys.forEach(k => {
            const ov = String(oldD[k] ?? '—'), nv = String(newD[k] ?? '—');
            const changed = ov !== nv;
            if (changed) hasChanges = true;
            html += `<tr class="${changed ? 'ds-diff-changed' : ''}">
                <td class="ds-diff-key">${escHtml(k)}</td>
                <td class="ds-diff-old">${escHtml(ov)}</td>
                <td class="ds-diff-new">${escHtml(nv)}</td>
            </tr>`;
        });
        if (!hasChanges && !allKeys.length) html += '<tr><td colspan="3" style="text-align:center;color:#999">ไม่มีข้อมูล Diff</td></tr>';
        html += '</tbody></table></div>';

        const canRollback = log.operation !== 'rollback' && Object.keys(oldD).length > 0;
        $('#ds-do-rollback-btn').toggle(canRollback).data('log-id', log.id);
        $('#ds-diff-content').html(html);
        $('#ds-diff-modal').show();
    });

    $(document).on('click', '.ds-log-rollback-btn', function() {
        const log = $(this).closest('.ds-log-entry').data('log');
        if (!log || !confirm(`Rollback Sheet "${log.sheet}" ไปเป็นค่าก่อนหน้า?\nLog ID: ${log.id}`)) return;
        doRollback(log.id);
    });

    $('#ds-do-rollback-btn').on('click', function() {
        const logId = $(this).data('log-id');
        if (!logId || !confirm('ยืนยัน Rollback ไปเป็นค่าก่อนหน้า?')) return;
        $('#ds-diff-modal').hide();
        doRollback(logId);
    });

    function doRollback(logId) {
        showAuditStatus('⏳ กำลัง Rollback...', 'info');
        $.ajax({
            url: dsAdmin.ajaxUrl, method: 'POST',
            data: { action: 'ds_admin_rollback', nonce: dsAdmin.nonce, log_id: logId },
            success(res) {
                if (res.success) {
                    showAuditStatus('✅ ' + (res.data.message || 'Rollback สำเร็จ'), 'success', 5000);
                    loadLog();
                } else {
                    showAuditStatus('❌ Rollback ล้มเหลว: ' + (res.data || ''), 'error');
                }
            },
            error() { showAuditStatus('❌ เชื่อมต่อ API ไม่สำเร็จ', 'error'); }
        });
    }

    $('#ds-clear-log-btn').on('click', function() {
        if (!confirm('ล้าง Audit Log ทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
        $.ajax({
            url: dsAdmin.ajaxUrl, method: 'POST',
            data: { action: 'ds_admin_clear_log', nonce: dsAdmin.nonce },
            success(res) {
                if (res.success) { showAuditStatus('✅ ล้าง Log เรียบร้อย', 'success', 3000); loadLog(); }
            }
        });
    });

    $('#ds-log-refresh-btn').on('click', loadLog);
    $('#ds-log-filter').on('change', loadLog);

    function showAuditStatus(msg, type, autohide = 0) {
        const $el = $('#ds-audit-status');
        $el.removeClass('ds-notice-success ds-notice-error ds-notice-info')
           .addClass('ds-notice-' + type).html(msg).show();
        if (autohide) setTimeout(() => $el.slideUp(300), autohide);
    }

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    loadLog();
})(jQuery);
</script>
<?php }

// ===========================================================
// SECTION 5: CSS
// ===========================================================

function ds_admin_css() {
    return '
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;500;600;700&family=Prompt:wght@100;200;300;400;500;600;700;800;900&display=swap");

:root {
    --gold:        #b69652;
    --gold-light:  #d4b97a;
    --gold-pale:   #f5edd9;
    --gold-hover:  #9d7f40;
    --dark:        #1a1714;
    --dark-2:      #2d2520;
    --white:       #ffffff;
    --off-white:   #fdfcfa;
    --border:      #ede5d8;
    --border-2:    #e0d5c5;
    --text-main:   #2a2420;
    --text-sub:    #7a6f65;
    --text-muted:  #a89e94;
    --radius:      10px;
    --radius-lg:   14px;
    --shadow:      0 2px 12px rgba(26,23,20,0.08);
    --shadow-lg:   0 8px 40px rgba(26,23,20,0.15);
}

/* ─── Base ────────────────────────────────── */
.ds-wrap {
    font-family: "Prompt", "IBM Plex Sans Thai", sans-serif;
    color: var(--text-main);
    max-width: 100%;
}
.ds-wrap * { box-sizing: border-box; }
.ds-wrap a { text-decoration: none; }

/* ─── Hero ────────────────────────────────── */
.ds-hero {
    background: var(--dark);
    border-radius: var(--radius-lg);
    padding: 44px 48px;
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
    border: 1px solid #2e2924;
}
.ds-hero::before {
    content: "";
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.ds-hero::after {
    content: "";
    position: absolute; bottom: -60px; right: -60px;
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(182,150,82,0.12) 0%, transparent 70%);
    pointer-events: none;
}
.ds-hero-badge {
    display: inline-block;
    font-size: 10px; letter-spacing: 0.18em; font-weight: 600;
    color: var(--gold); border: 1px solid rgba(182,150,82,0.35);
    padding: 3px 10px; border-radius: 20px; margin-bottom: 14px;
}
.ds-hero-title {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 40px; font-weight: 600;
    color: #fff; margin: 0 0 10px;
    letter-spacing: 0.08em;
}
.ds-hero-title span { color: var(--gold); }
.ds-hero-sub { color: #8a8178; margin: 0; font-size: 14px; font-weight: 300; line-height: 1.6; }

/* ─── Section Label ───────────────────────── */
.ds-section-label {
    font-size: 10px; letter-spacing: 0.2em; font-weight: 600;
    color: var(--text-muted); margin-bottom: 14px; padding-left: 2px;
    text-transform: uppercase;
}

/* ─── Grid Cards ──────────────────────────── */
.ds-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    gap: 14px;
}
.ds-grid-2 { grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); }

.ds-card {
    display: flex; align-items: center; gap: 16px;
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 18px 20px;
    color: var(--text-main); cursor: pointer;
    transition: all 0.2s ease;
    position: relative; overflow: hidden;
}
.ds-card::before {
    content: ""; position: absolute;
    left: 0; top: 0; bottom: 0; width: 3px;
    background: transparent; transition: background 0.2s;
}
.ds-card:hover { border-color: var(--gold); box-shadow: var(--shadow); transform: translateY(-1px); color: var(--text-main); }
.ds-card:hover::before { background: var(--gold); }
.ds-card-tool { background: var(--off-white); }
.ds-card-icon { font-size: 26px; width: 46px; text-align: center; flex-shrink: 0; }
.ds-card-body { flex: 1; min-width: 0; }
.ds-card-tag { font-size: 9px; letter-spacing: 0.15em; font-weight: 700; color: var(--gold); margin-bottom: 2px; }
.ds-card-title { font-weight: 600; font-size: 14px; margin-bottom: 3px; }
.ds-card-desc { font-size: 11.5px; color: var(--text-sub); line-height: 1.4; }
.ds-card-arrow { color: var(--border-2); font-size: 18px; flex-shrink: 0; transition: color 0.2s; }
.ds-card:hover .ds-card-arrow { color: var(--gold); }

/* ─── Page Header ─────────────────────────── */
.ds-page-header {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 16px;
    margin-bottom: 24px; flex-wrap: wrap;
}
.ds-back-link {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 12px; color: var(--text-muted);
    margin-bottom: 8px; transition: color 0.15s;
}
.ds-back-link:hover { color: var(--gold); }
.ds-page-title {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 26px; font-weight: 600;
    margin: 0 0 6px; color: var(--dark);
}
.ds-page-desc { color: var(--text-sub); margin: 0; font-size: 13px; line-height: 1.5; }
.ds-page-actions { display: flex; gap: 10px; align-items: center; flex-shrink: 0; padding-top: 28px; }

/* ─── Buttons ─────────────────────────────── */
.ds-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 7px;
    font-family: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.15s; border: 1px solid transparent;
    white-space: nowrap;
}
.ds-btn-gold { background: var(--gold); color: #fff; border-color: var(--gold); }
.ds-btn-gold:hover { background: var(--gold-hover); border-color: var(--gold-hover); }
.ds-btn-ghost { background: #fff; color: var(--text-main); border-color: var(--border-2); }
.ds-btn-ghost:hover { border-color: var(--gold); color: var(--gold); }
.ds-btn-outline { background: #fff; color: var(--gold); border-color: var(--gold); }
.ds-btn-outline:hover { background: var(--gold-pale); }
.ds-btn-danger { background: #dc2626; color: #fff; border-color: #dc2626; }
.ds-btn-danger:hover { background: #b91c1c; }
.ds-btn-danger-outline { background: #fff; color: #dc2626; border-color: #fca5a5; }
.ds-btn-danger-outline:hover { background: #fef2f2; }
.ds-btn-sm { padding: 5px 12px; font-size: 12px; }
.ds-btn-icon-wrap { font-size: 15px; }

/* ─── Notice ──────────────────────────────── */
.ds-notice {
    padding: 12px 18px; border-radius: 8px; margin-bottom: 20px;
    font-size: 13px; font-weight: 500; border: 1px solid transparent;
}
.ds-notice-success { background: #f0fdf4; border-color: #86efac; color: #166534; }
.ds-notice-error   { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
.ds-notice-info    { background: #fefce8; border-color: #fde68a; color: #92400e; }

/* ─── Loading ─────────────────────────────── */
.ds-loading-state {
    display: flex; align-items: center; gap: 20px;
    padding: 48px 24px; color: var(--text-sub);
}
.ds-loading-title { font-size: 14px; font-weight: 500; color: var(--text-main); margin-bottom: 2px; }
.ds-loading-sub   { font-size: 12px; color: var(--text-muted); }
.ds-spinner {
    width: 30px; height: 30px; flex-shrink: 0;
    border: 3px solid var(--border);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: ds-spin 0.75s linear infinite;
}
@keyframes ds-spin { to { transform: rotate(360deg); } }

/* ─── Table Meta ──────────────────────────── */
.ds-table-meta {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 12px; flex-wrap: wrap;
}
.ds-search-input {
    padding: 7px 14px; border: 1px solid var(--border-2);
    border-radius: 6px; font-family: inherit; font-size: 13px;
    width: 240px; transition: border-color 0.15s; color: var(--text-main);
    background: #fff;
}
.ds-search-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(182,150,82,0.1); }
.ds-meta-badge {
    background: var(--gold-pale); color: var(--gold-hover);
    font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 20px;
}

/* ─── Badge ───────────────────────────────── */
.ds-badge {
    display: inline-block; font-size: 11px; font-weight: 600;
    padding: 2px 8px; border-radius: 4px;
}
.ds-badge-cache { background: #fff3cd; color: #856404; }
.ds-badge-fresh { background: #d1fae5; color: #065f46; }

/* ─── Table ───────────────────────────────── */
.ds-table-wrapper {
    border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    overflow-x: auto;
    box-shadow: var(--shadow);
}
.ds-table {
    width: 100%; border-collapse: collapse;
    font-size: 13px; min-width: 600px;
}
.ds-table thead tr {
    background: var(--dark);
}
.ds-table thead th {
    color: var(--gold-light); padding: 12px 14px;
    text-align: left; font-weight: 600; font-size: 11.5px;
    letter-spacing: 0.08em; text-transform: uppercase;
    white-space: nowrap; border-bottom: 1px solid #2e2924;
}
.ds-th-num, .ds-td-num { width: 44px; text-align: center !important; }
.ds-th-actions, .ds-td-actions { width: 90px; text-align: center !important; white-space: nowrap; }
.ds-table tbody .ds-tr { border-bottom: 1px solid var(--border); transition: background 0.12s; }
.ds-table tbody .ds-tr:last-child { border-bottom: none; }
.ds-table tbody .ds-tr:hover { background: #fffbf4; }
.ds-td-num { color: var(--text-muted); font-size: 12px; }
.ds-table tbody td { padding: 10px 14px; color: var(--text-main); vertical-align: middle; }
.ds-cell-val { display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ds-url-link { color: var(--gold); font-size: 12px; }
.ds-url-link:hover { color: var(--gold-hover); text-decoration: underline; }
.ds-empty-state { padding: 56px 20px; text-align: center; color: var(--text-muted); }
.ds-empty-icon { font-size: 40px; margin-bottom: 12px; }
.ds-no-results { padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px; }

/* ─── Action Buttons ──────────────────────── */
.ds-action-btn {
    background: none; border: 1px solid transparent;
    border-radius: 5px; cursor: pointer;
    font-size: 14px; padding: 4px 7px;
    transition: all 0.12s; line-height: 1;
}
.ds-btn-edit:hover  { background: var(--gold-pale); border-color: var(--gold); }
.ds-btn-delete:hover { background: #fef2f2; border-color: #fca5a5; }

/* ─── Table Footer ────────────────────────── */
.ds-table-footer {
    padding: 10px 14px; border-top: 1px solid var(--border);
    font-size: 12px; color: var(--text-muted); background: var(--off-white);
    border-radius: 0 0 var(--radius) var(--radius);
}

/* ─── Modal ───────────────────────────────── */
.ds-modal {
    position: fixed; inset: 0; z-index: 999999;
    display: flex; align-items: center; justify-content: center;
}
.ds-modal-overlay {
    position: absolute; inset: 0;
    background: rgba(26,23,20,0.55); backdrop-filter: blur(2px);
}
.ds-modal-box {
    position: relative; background: #fff;
    border-radius: var(--radius-lg);
    width: 92%; max-width: 720px; max-height: 88vh;
    overflow-y: auto; box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
}
.ds-modal-box-sm { max-width: 440px; }
.ds-modal-box-lg { max-width: 860px; }
.ds-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: #fff; z-index: 1;
}
.ds-modal-sheet-tag {
    font-size: 10px; letter-spacing: 0.15em; font-weight: 700;
    color: var(--gold); margin-bottom: 3px;
}
.ds-modal-title {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 19px; font-weight: 600; margin: 0; color: var(--dark);
}
.ds-modal-close-btn {
    background: none; border: none; font-size: 18px;
    cursor: pointer; color: var(--text-muted); padding: 6px 8px;
    border-radius: 5px; transition: all 0.12s; line-height: 1;
}
.ds-modal-close-btn:hover { background: #f5f5f5; color: var(--text-main); }
.ds-modal-body  { padding: 24px; }
.ds-modal-footer {
    padding: 16px 24px; border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 10px;
    background: var(--off-white); border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

/* ─── Form ────────────────────────────────── */
.ds-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ds-field-wide { grid-column: 1 / -1; }
.ds-form-field { display: flex; flex-direction: column; gap: 5px; }
.ds-field-label {
    font-size: 11px; font-weight: 600; color: var(--text-sub);
    text-transform: uppercase; letter-spacing: 0.08em;
}
.ds-field-hint { font-size: 9px; color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
.ds-field-input {
    padding: 9px 12px; border: 1px solid var(--border-2);
    border-radius: 6px; font-family: inherit; font-size: 13px;
    color: var(--text-main); background: #fff;
    transition: all 0.15s; width: 100%;
}
.ds-field-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(182,150,82,0.12); }
textarea.ds-field-input { resize: vertical; min-height: 60px; }

/* ─── Sync / Info Cards ───────────────────── */
.ds-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px,1fr)); gap: 20px; }
.ds-info-card {
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius); padding: 24px;
}
.ds-info-card-header { font-weight: 600; font-size: 15px; margin-bottom: 12px; color: var(--dark); }
.ds-info-card-desc { font-size: 13px; color: var(--text-sub); line-height: 1.6; margin-bottom: 18px; }
.ds-stat-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px;
}
.ds-stat-row:last-of-type { border-bottom: none; margin-bottom: 12px; }
.ds-stat-label { color: var(--text-sub); }
.ds-stat-val { font-weight: 600; color: var(--dark); }
.ds-note-box {
    background: var(--gold-pale); border: 1px solid #e8d5a3;
    border-radius: 6px; padding: 10px 14px;
    font-size: 12px; color: #7a5c1e; line-height: 1.5;
    margin-top: 10px;
}

/* ─── Audit Log ───────────────────────────── */
.ds-log-filter-bar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 16px; flex-wrap: wrap;
}
.ds-filter-label { font-size: 13px; color: var(--text-sub); font-weight: 500; }
.ds-select {
    padding: 7px 12px; border: 1px solid var(--border-2);
    border-radius: 6px; font-family: inherit; font-size: 13px;
    color: var(--text-main); background: #fff;
    cursor: pointer;
}
.ds-select:focus { outline: none; border-color: var(--gold); }

.ds-log-list { display: flex; flex-direction: column; gap: 8px; }
.ds-log-entry {
    background: #fff; border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 18px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
    transition: border-color 0.15s;
}
.ds-log-entry:hover { border-color: var(--gold-light); }
.ds-log-entry-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1; min-width: 0; }
.ds-log-entry-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.ds-log-op-badge {
    display: inline-block; font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 5px; white-space: nowrap;
}
.ds-log-sheet-tag {
    font-size: 11px; font-weight: 700; color: var(--gold);
    background: var(--gold-pale); padding: 2px 8px; border-radius: 4px;
}
.ds-log-key-preview {
    font-size: 12.5px; color: var(--text-main); font-weight: 500;
    max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ds-log-meta {
    display: flex; gap: 14px; font-size: 11.5px; color: var(--text-sub);
    flex-wrap: wrap; justify-content: flex-end;
}
.ds-log-actions { display: flex; gap: 8px; }
.ds-log-no-rollback { font-size: 11px; color: var(--text-muted); }

/* ─── Diff Table ──────────────────────────── */
.ds-diff-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); }
.ds-diff-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ds-diff-table thead th {
    background: var(--dark); color: var(--gold-light);
    padding: 10px 14px; text-align: left;
    font-size: 11px; letter-spacing: 0.07em; text-transform: uppercase;
}
.ds-diff-table tbody tr { border-bottom: 1px solid var(--border); }
.ds-diff-table tbody td { padding: 9px 14px; color: var(--text-main); }
.ds-diff-key { font-weight: 600; font-size: 12px; color: var(--text-sub); width: 160px; }
.ds-diff-old { color: #991b1b; background: #fff5f5; }
.ds-diff-new { color: #065f46; background: #f0fdf4; }
.ds-diff-changed .ds-diff-key { color: var(--text-main); }

/* ─── Multi-Image Thumb (Table) ───────────────────────────────── */
.ds-multi-thumb-wrap { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.ds-multi-count {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--gold-pale); color: var(--gold-hover);
    font-size: 10px; font-weight: 700;
    width: 20px; height: 20px; border-radius: 50%;
    border: 1px solid var(--gold-light);
}

/* ─── Multi-Image Editor (Modal) ──────────────────────────────── */
.ds-multi-img-editor { display: flex; flex-direction: column; gap: 12px; }
.ds-multi-img-item {
    border: 1px solid var(--border-2);
    border-radius: 8px; padding: 12px;
    background: var(--off-white);
}
.ds-multi-img-item-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
}
.ds-multi-img-label {
    font-size: 11px; font-weight: 700; color: var(--gold);
    text-transform: uppercase; letter-spacing: 0.1em;
}
.ds-multi-img-preview { height: 130px; margin-bottom: 10px; }

/* ─── Image Fields ────────────────────────── */
/* Thumbnail ในตาราง */
.ds-img-thumb-wrap { display: inline-block; line-height: 0; }
.ds-img-thumb {
    width: 48px; height: 36px;
    object-fit: cover; border-radius: 4px;
    border: 1px solid var(--border);
    transition: transform 0.15s, box-shadow 0.15s;
    cursor: pointer;
}
.ds-img-thumb:hover {
    transform: scale(2.8); z-index: 10;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    border-color: var(--gold); position: relative;
}

/* Image field ใน Modal */
.ds-field-hint-img { color: var(--gold); text-transform: none; letter-spacing: 0; font-weight: 500; }

.ds-img-field-wrap {
    display: flex; flex-direction: column; gap: 10px;
}
.ds-img-preview-wrap {
    width: 100%; height: 160px;
    background: var(--off-white);
    border: 1px solid var(--border);
    border-radius: 8px; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    position: relative;
}
.ds-img-preview-img {
    max-width: 100%; max-height: 100%;
    width: auto; height: auto;
    object-fit: contain;
    display: block;
}
.ds-img-preview-empty {
    color: var(--text-muted); font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    height: 100%; width: 100%;
    flex-direction: column; gap: 6px;
}
.ds-img-field-controls { display: flex; flex-direction: column; gap: 8px; }
.ds-img-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
';
}

// ===========================================================
// SECTION 6: ADMIN MODE (Frontend)
// ===========================================================

add_action('wp_head', function() {
    if (!current_user_can('administrator')) return;
    ?>
    <script>
    window.dsAdminMode = window.dsAdminMode || {
        active: false,
        token:  '<?= esc_js(DS_ADMIN_TOKEN) ?>',
        apiUrl: '<?= esc_js(DS_ADMIN_API_URL) ?>',
    };
    </script>
    <?php
}, 5);

add_action('wp_ajax_ds_get_admin_models', 'ds_ajax_get_admin_models');
function ds_ajax_get_admin_models() {
    check_ajax_referer('ds_admin_mode_nonce', 'security');
    if (!current_user_can('administrator')) wp_send_json_error('Unauthorized');

    $cache_key = 'ds_sheet_adminmodels';
    $cached    = get_transient($cache_key);
    if ($cached !== false && empty($_POST['force_refresh'])) {
        wp_send_json_success(['models' => $cached, 'from_cache' => true]);
    }

    $response = wp_remote_get(
        add_query_arg(['action' => 'admin_meta', 'token' => DS_ADMIN_TOKEN], DS_ADMIN_API_URL),
        ['timeout' => 60, 'redirection' => 5, 'sslverify' => false]
    );

    if (is_wp_error($response)) wp_send_json_error($response->get_error_message());

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body['ok'])) wp_send_json_error($body['error'] ?? 'API error');

    $admin_models = array_map(fn($r) => [
        'model'  => trim($r['model']  ?? ''),
        'name'   => trim($r['name']   ?? ''),
        'min_w'  => (float)($r['min_w']  ?? 0),
        'max_w'  => (float)($r['max_w']  ?? 0),
        'min_l'  => (float)($r['min_l']  ?? 0),
        'max_l'  => (float)($r['max_l']  ?? 0),
        'min_aw' => (float)($r['min_aw'] ?? 0),
        'max_aw' => (float)($r['max_aw'] ?? 0),
        'min_al' => (float)($r['min_al'] ?? 0),
        'max_al' => (float)($r['max_al'] ?? 0),
    ], $body['sheets']['AdminModels']['rows'] ?? []);

    set_transient($cache_key, $admin_models, DS_ADMIN_CACHE_TTL);
    wp_send_json_success(['models' => $admin_models, 'from_cache' => false]);
}
