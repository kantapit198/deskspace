<?php
if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('ds_escape_js_non_ascii')) {
    function ds_escape_js_non_ascii($js) {
        return preg_replace_callback('/[^\x00-\x7F]/u', function($m) {
            return sprintf('\u%04x', mb_ord($m[0], 'UTF-8'));
        }, $js);
    }
}

add_shortcode('deskspace_proposal_builder10', 'ds_configurator_shortcode_callback');

add_action('wp', function() {
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'deskspace_proposal_builder10')) {
        add_filter('body_class', function($classes) {
            $classes[] = 'ds-configurator-active';
            return $classes;
        });
    }
});

function ds_configurator_shortcode_callback() {
    ob_start();

    // 1. Authorization checks
    $current_user_dpb = wp_get_current_user();
    $is_kantapit_admin = ($current_user_dpb->exists() && $current_user_dpb->user_login === 'kantapit' && current_user_can('administrator'));
    $canShow3D_PHP = $is_kantapit_admin;

    $admin_display_style = current_user_can('administrator') ? '' : 'style="display:none !important;"';

    // 2. Enqueue the registered style
    wp_enqueue_style('ds-google-fonts-prompt');
    wp_enqueue_style('ds-font-awesome');
    wp_enqueue_style('ds-configurator-style');
    wp_enqueue_script('jquery');

    // 3. Register footer script output to prevent WordPress from auto-formatting & escaping ampersands inside scripts
    add_action('wp_footer', 'ds_configurator_print_footer_scripts', 100);


    ?>
<script>
document.body.classList.add('ds-configurator-active');
document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('.ds-header');
    const wrap = document.querySelector('.dpb-wrap');
    const preload = document.getElementById('preload');
    
    const elementsToMove = [
        'dpb-theme-panel',
        'dpb-cart-panel',
        'dpb-confirm',
        'dpb-variant-modal',
        'dpb-remove-confirm',
        'dpbModal',
        'ds-auth-modal',
        'dpb-pp3'
    ];
    
    if (preload) document.body.appendChild(preload);
    if (header) document.body.appendChild(header);
    if (wrap) document.body.appendChild(wrap);
    
    const floatingCart = document.querySelector('.dpb-floating-cart');
    if (floatingCart) document.body.appendChild(floatingCart);
    
    const stickyFooter = document.querySelector('.dpb-sticky-footer');
    if (stickyFooter) document.body.appendChild(stickyFooter);
    
    elementsToMove.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            document.body.appendChild(el);
        }
    });
});
</script>
<div id="preload">
  <div class="wrap">
<div class="ring"></div>
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" class="deskspace-logo-svg">
      <path d="M0.5,20.5L6,25c0.4,0.3,1,0,1-0.5v-8.4L0.5,12V20.5z"/>
      <path d="M18,16.2l10.6,6.3c0.5,0.3,1.1-0.1,1.1-0.6v-10L18,13.8V16.2z"/>
      <path d="M29.7,9.8L18,4.2C17.6,4,17.2,4,16.8,4l-6.7,1.1C9.6,5.2,9.5,5.8,9.9,6l3.1,1.7c0.3,0.1,0.2,0.5-0.1,0.5 C10.4,8.5,3.4,9.4,0.6,9.6C0,9.7-0.2,10.5,0.3,10.9l6.4,3.9c0.2,0.1,0.4,0.1,0.6,0.1l22.2-4C30.1,10.8,30.2,10.1,29.7,9.8z"/>
    </svg>
  </div>
</div>

    <?php
    $ds_is_logged    = is_user_logged_in();
    $ds_current_user = wp_get_current_user();
    $ds_is_admin     = current_user_can('administrator');
    ?>

<header class="ds-header">
    <?php if (!$ds_is_admin) : ?>
    <a href="https://www.deskspace.in.th/" class="ds-header-logo">
        <img src="https://www.deskspace.in.th/wp-content/uploads/2022/05/logo.png" alt="DeskSpace Logo">
    </a>
    <?php endif; ?>
 
    <div class="ds-header-actions" style="display:flex; align-items:center; gap:10px; margin-left:auto; margin-right:0px;">
 
        <!-- Language Toggle -->
        <div id="ds-header-lang-toggle" class="ds-header-lang-container">
            <div class="ds-lang-slider"></div>
            <button class="ds-lang-btn" data-lang="th">TH</button>
            <button class="ds-lang-btn" data-lang="en">EN</button>
        </div>
 
        <div id="google_translate_element" style="display:none;visibility:hidden;position:absolute;"></div>
 
        <!-- Mobile Quote Button -->
        <button type="button" id="dpb-mobile-quote-btn" class="dpb-trigger-btn-mobile">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>ขอใบเสนอราคา</span>
        </button>
 
        <!-- ADMIN MODE TOGGLE BUTTON — เฉพาะ Administrator -->
        <?php if ($ds_is_admin) : ?>
        <div id="ds-admin-mode-wrapper" class="ds-admin-mode-wrapper">
            <button
                type="button"
                id="ds-admin-mode-btn"
                class="ds-admin-mode-btn"
                title="Admin Mode — ข้ามข้อจำกัดขนาดโต๊ะปกติ"
                aria-pressed="false"
            >
                <span class="ds-admin-mode-icon">🔐</span>
                <span class="ds-admin-mode-label">
                    <span class="ds-desktop-label">โหมดปลดล็อกขนาดโต๊ะ</span>
                    <span class="ds-mobile-label">ปลดล็อก</span>
                </span>
                <span class="ds-admin-mode-indicator"></span>
            </button>
 
            <!-- Tooltip / Status Badge -->
            <div id="ds-admin-mode-badge" class="ds-admin-mode-badge" style="display:none">
                <span class="ds-admin-badge-dot"></span>
                Admin Mode ON
            </div>
        </div>
        <?php endif; ?>
        <!-- END ADMIN MODE BUTTON -->
 
        <!-- User Button -->
        <button type="button" class="dpb-user-btn" onclick="dsAuthModal.open()" title="<?php echo $ds_is_logged ? 'ข้อมูลส่วนตัว' : 'เข้าสู่ระบบ / สมัครสมาชิก'; ?>">
            <?php if ($ds_is_logged) : ?>
                <span class="ds-user-avatar"><?php echo get_avatar($ds_current_user->ID, 24); ?></span>
            <?php else : ?>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            <?php endif; ?>
        </button>
 
        <!-- Quote Button -->
        <button type="button" class="dpb-trigger-btn" onclick="dpbOpenModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>ขอใบเสนอราคา / ติดต่อเรา</span>
        </button>
 
    </div>
</header>
 
<div class="dpb-wrap dpb-fullscreen-mode">
    <div class="dpb-stage-panel">
        <div class="dpb-card-canvas">
            <div class="dpb-preview">
                <div class="dpb-canvas-wrap">
                    <canvas id="dpb-canvas" width="1300" height="1202"></canvas>
                    <button type="button" class="dpb-btn-popup" title="ขยายภาพ">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                    </button>
                </div>

                <div id="dpb-result" class="dpb-help">
                    <div id="dpb-actions-home"></div>
                    <div class="dpb-actions">
                        <button id="dpb-download" class="dpb-btn dpb-btn-ghost" title="บันทึกเป็น PNG">
                            <i class="fas fa-download"></i> <span>บันทึกภาพ</span>
                        </button>

                        <button id="dpb-theme-btn" class="dpb-btn dpb-btn-ghost">
                            <i class="fas fa-paint-brush"></i> <span>ธีม</span>
                        </button>

                        <div class="checkbox-wrapper-34 dpb-switch-legs">
                            <input class="tgl tgl-ios" id="dpb-show-legs" type="checkbox" checked="">
                            <label class="tgl-btn" for="dpb-show-legs" data-on="แสดงขา" data-off="ซ่อนขา"></label>
                        </div>
                        <button type="button" id="dpb-hidden-save-btn" style="display:none !important;" aria-hidden="true" title="Force Save Log"></button>

                        <button id="dpb-preview-btn" class="dpb-btn" title="Refresh">ดูตัวอย่าง</button>
                    </div>
                    
                    <span id="dpb-msg"></span>
                </div>
            </div>
        </div>
    </div>

    <div class="dpb-sidebar-panel">
        <div class="dpb-card">
            <div class="dpb-body">
                <h2>Desk Configurator</h2>
                <div class="dpb-row">
                    <div>
                        <select id="dpb-type" style="display:none">
                          <option value="custom">Custom Desk<br> (Dual Motor)</option>
                          <option value="custom_single">Custom Desk<br> (Single Motor)</option>
                          <option value="custom_manual">Custom Desk<br> (Manual)</option>
                          <option value="single">Custom Desk<br> (Single leg)</option>
                          <option value="l2">Custom L-Desk<br> (2 Legs)</option>
                          <option value="l3">Custom L-Desk<br> (3 Legs)</option>
                          <option value="custom_workspace">Dual Workspace</option>
                        </select>
                        <div id="dpb-type-tiles" class="dpb-type-tiles" aria-label="เลือกประเภทโต๊ะ"></div>
                    </div>
                </div>
                
                <h3>ขนาดโต๊ะ</h3>
                <div class="dpb-row-3">
                    <div><label>ความกว้าง (cm)</label><input id="dpb-mw" type="number" value="60" inputmode="decimal"></div>
                    <div><label>ความยาว (cm)</label><input id="dpb-ml" type="number" value="160" inputmode="decimal"></div>
                </div>
                
                <div id="dpb-ldesk-extra" style="display:none">
                    <div class="dpb-row-3">
                        <div><label>ความกว้างด้าน L (cm)</label><input id="dpb-aw" type="number" value="120" inputmode="decimal"></div>
                        <div><label>ความยาวด้าน L (cm)</label><input id="dpb-al" type="number" value="60"  inputmode="decimal"></div>
                    </div>
                </div>

                <h3>สีท็อปโต๊ะ</h3>
                <div id="dpb-top-color-tiles" class="dpb-color-tiles"></div>
                <select id="dpb-top-color" style="display:none"></select>

                <div class="dpb-row">
                    <div>
                        <h3>ขาโต๊ะ</h3>
                        <select id="dpb-legs" style="display:none"></select> <div id="dpb-legs-tiles" class="dpb-type-tiles" aria-label="เลือกโครงขา"></div>
                        <div class="dpb-legs-head" style="justify-content: center;display:flex;align-items:center;gap:8px">
                            <button type="button" id="dpb-leggap-toggle" class="dpb-link-btn" aria-expanded="false">
                                แก้ไขระยะห่างขาโต๊ะ <i class="dpb-caret" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div id="dpb-leggap-fields" class="dpb-leggap" aria-hidden="true">
                            <div class="dpb-row-2">
                                <div>
                                    <label id="dpb-gapA-label" for="dpb-gapA">ขาซ้าย (cm)</label>
                                    <input id="dpb-gapA" type="number" min="5" step="1" value="5" inputmode="decimal" />
                                </div>
                                <div>
                                    <label id="dpb-gapB-label" for="dpb-gapB">ขาขวา (cm)</label>
                                    <input id="dpb-gapB" type="number" min="5" step="1" value="5" inputmode="decimal" />
                                </div>
                            </div>
                            <div class="dpb-hintbar">
                                <button type="button" id="dpb-gap-reset"  class="dpb-linkbtn">Reset</button>
                                <button type="button" id="dpb-gap-center" class="dpb-linkbtn">Center</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dpb-row">
                    <div>
                        <h3>ขอบมุมโต๊ะ</h3>
                        <select id="dpb-edge" style="display:none">
                            <option value="rounded" selected>มุมมน</option>
                            <option value="square">มุมเหลี่ยม</option>
                        </select>
                        <input type="hidden" id="dpb-solid-trim" value="untrim">
                        <div id="dpb-edge-tiles" class="dpb-type-tiles" aria-label="เลือกมุมโต๊ะ"></div>
                    </div>
                </div>

                <div id="dpb-l-only" style="display:none">
                    <div class="dpb-row">
                        <div>
                            <label>ทิศตัว L</label>
                            <select id="dpb-aside" style="display:none">
                                <option value="left">ซ้าย</option>
                                <option value="right">ขวา</option>
                            </select>
                            <div id="dpb-aside-tiles" class="dpb-type-tiles" aria-label="เลือกทิศตัว L"></div>
                        </div>
                    </div>
                </div>
                
                <div id="dpb-r-rect" class="dpb-row-3" style="display:none">
                    <div><label>มุมบนซ้าย</label><input id="r_rect_tl" type="number" value="50"></div>
                    <div><label>มุมบนขวา</label><input id="r_rect_tr" type="number" value="50"></div>
                    <div><label>มุมล่างซ้าย</label><input id="r_rect_bl" type="number" value="50"></div>
                    <div><label>มุมล่างขวา</label><input id="r_rect_br" type="number" value="50"></div>
                </div>
                <div id="dpb-r-ldesk" style="display:none">
                    <div class="dpb-row-3">
                        <div><label>มุมบนซ้าย (mm)</label><input id="ld_r_tl" type="number" value="50" inputmode="numeric"></div>
                        <div><label>มุมบนขวา (mm)</label><input id="ld_r_tr" type="number" value="50" inputmode="numeric"></div>
                        <div><label>มุมด้านใน (mm)</label><input id="dpb-rInner" type="number" value="150" inputmode="numeric"></div>
                        <div><label>มุมล่างซ้าย (mm)</label><input id="ld_r_step" type="number" value="50"></div>
                        <div><label>มุมล่างขวา (mm)</label><input id="ld_r_br" type="number" value="50"></div>
                        <div><label>มุม L ล่างซ้าย (mm)</label><input id="ld_r_armbl" type="number" value="50"></div>
                        <div><label>มุม L ล่างขวา (mm)</label><input id="ld_r_armbr" type="number" value="50"></div>
                    </div>
                </div>
            </div>
        </div>
                                            
        <div class="dpb-card">
            <h3>ข้อมูลลูกค้า</h3>
            <div class="dpb-body" id="dpb-form">
                <div class="dpb-row">
                    <div><label>ชื่อลูกค้า / โครงการ</label><input id="dpb-customer" placeholder="ระบุชื่อ..." /></div>
                    
                    <div class="dpb-platforms" id="dpb-platforms-admin" <?php echo $admin_display_style; ?>>
                            <label>Platform</label>
                            <select id="dpb-platforms">
                                <option value="">เลือก Platform</option>
                                <option>Facebook</option><option>Line</option><option>Shopee</option><option>Lazada</option>
                                <option>Central</option><option>The Mall</option><option>HomePro</option><option>NocNoc</option>
                                <option>Tiktok</option><option>Shop24</option><option>Mercular</option><option>Betrend</option>
                                <option>Gump</option><option>หน้าร้าน</option><option>Website(DeskSpace)</option>
                            </select>
                    </div>
                </div>
                <div class="dpb-row">
                    <div><label>วันที่</label><input id="dpb-date" type="date"></div>
                    <div style="display:none;"><input id="dpb-filename"></div>
                </div>
            </div>
        </div>
                                            
        <div class="dpb-card">
            <h3>ตัวเลือกเสริม (Options)</h3>
            <div class="dpb-body-option">
                <div id="dpb-opt-list" class="dpb-opt-grid"></div>
                <div class="dpb-sep" style="height:1px;background:var(--line);margin:10px 0"></div>
                <p class="dpb-help" style="text-align:left;"></p>
            </div>
        </div>
    </div>
</div>

<div id="dpb-theme-backdrop" class="dpb-theme-backdrop"></div>
<div id="dpb-theme-panel" class="dpb-theme-panel" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="dpb-theme-panel__inner">
      <header class="dpb-cart-header">
       <button type="button" id="dpb-theme-close" class="dpb-cart-back" aria-label="ย้อนกลับ">
         <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 6l-6 6 6 6" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
       </button>
       <div class="dpb-cart-title">ตั้งค่าการแสดงผล </div>
    </header>
    <div class="dpb-theme-body">
      <div class="dpb-row">
        <div>
          <label>สีพื้นหลัง/Background</label>
          <div class="dpb-color-group" id="dpb-bg">
            <button type="button" data-value="#ffffff" style="--c:#ffffff"></button>
            <button type="button" data-value="#f3f4f6" style="--c:#f3f4f6"></button>
            <button type="button" data-value="#a9a9a9" style="--c:#a9a9a9"></button>
            <button type="button" data-value="#212121" style="--c:#212121"></button>
            <button type="button" data-value="rgba(0,0,0,0)" style="--c:url('https://www.deskspace.in.th/wp-content/uploads/2025/12/transparent.png')"></button>
          </div>
        </div>
      </div>
      <div class="dpb-row">
        <div>
             <label>สีข้อความ/เส้น "ในโต๊ะ"</label>
          <div class="dpb-color-group" id="dpb-color-in">
            <button type="button" data-value="#000000" style="--c:#000000"></button>
            <button type="button" data-value="#ffffff" style="--c:#ffffff"></button>
          </div>
        </div>
      </div>
      <div class="dpb-row">
        <div>
          <label>สีข้อความ/เส้น "นอกโต๊ะ"</label>
          <div class="dpb-color-group" id="dpb-color-out">
            <button type="button" data-value="#000000" style="--c:#000000"></button>
            <button type="button" data-value="#ffffff" style="--c:#ffffff"></button>
          </div>
        </div>
      </div>
    </div>
    <footer class="dpb-theme-footer">
      <button type="button" id="dpb-theme-confirm" class="dpb-btn">ยืนยัน</button>
    </footer>
  </div>
</div>

<div id="dpb-cart-backdrop" class="dpb-cart-backdrop"></div>
<div id="dpb-cart-panel" class="dpb-cart-panel" role="dialog" aria-modal="true" aria-labelledby="dpb-cart-title" aria-hidden="true">
  <div class="dpb-cart-panel__inner">
    <header class="dpb-cart-header">
      <button type="button" id="dpb-cart-close-mobile" class="dpb-cart-back" aria-label="ย้อนกลับ">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 6l-6 6 6 6" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button type="button" id="dpb-cart-close-desktop" class="dpb-cart-close" aria-label="ปิด">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6l12 12M18 6L6 18" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="dpb-cart-title" id="dpb-cart-title">ตั้งค่า Option</div>
      <div class="dpb-cart-header-actions">
        <button type="button" id="dpb-cart-clear" class="dpb-cart-clear" aria-label="ลบ Option ทั้งหมด">
            <svg width="18" height="18" viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M402.06,53.33H339.77l-3.71-8.12C332.32,37,324.54,20,305.08,20H206.61c-19.35,0-27,16.86-30.68,25l-3.8,8.37H109.94a62.11,62.11,0,0,0-62,62,12,12,0,0,0,12,12H452.09a12,12,0,0,0,12-12A62.11,62.11,0,0,0,402.06,53.33Z" fill="#111827" fill-rule="evenodd"/>
              <defs>
                <mask id="bin-holes" maskUnits="userSpaceOnUse">
                  <rect x="96.75" y="143.36" width="318.49" height="348" rx="24" ry="24" fill="#fff"/>
                  <rect class="hole" x="165" y="235" width="36" height="210" rx="28" ry="28" fill="#000"/> 
                  <rect class="hole" x="299" y="235" width="36" height="210" rx="28" ry="28" fill="#000"/> 
                </mask>
              </defs>
              <rect x="96.75" y="143.36" width="318.49" height="348" rx="24" ry="24" fill="#111827" mask="url(#bin-holes)"/>
            </svg>
        </button>
      </div>
    </header>
    <div id="dpb-cart-empty" class="dpb-cart-empty">คุณยังไม่ได้เลือก Option</div>
    <div id="dpb-cart-body" class="dpb-cart-body"></div>
    <div class="dpb-cart-footer">
      <button type="button" id="dpb-cart-confirm" class="dpb-cart-confirm">ยืนยัน</button>
    </div>
  </div>
</div>

<div id="dpb-pp3" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pp3-title">
  <div id="dpb-pp3__bd"></div>
  <div id="dpb-pp3__panel">

    <div class="pp3-hd">
      <div>
        <div class="pp3-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Step 2 — เลือกตำแหน่ง
        </div>
        <h2 class="pp3-title" id="pp3-title">วางตำแหน่งบนโต๊ะ</h2>
        <p class="pp3-sub">แตะโซนที่ต้องการบนท็อปโต๊ะด้านล่าง</p>
      </div>
      <button class="pp3-x" id="pp3-x" type="button" aria-label="ปิด">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="pp3-body">
      <div class="pp3-card">
        <div class="pp3-thumb"><img id="pp3-img" src="" alt=""></div>
        <div>
          <p class="pp3-cname" id="pp3-name">—</p>
          <p class="pp3-cdim"  id="pp3-dim">—</p>
        </div>
        <div class="pp3-cbadge" id="pp3-badge">1</div>
      </div>

      <div class="pp3-piece" id="pp3-piece" style="display:none">
        กำลังเลือกตำแหน่ง ชิ้นที่ <strong id="pp3-pn">1</strong> / <span id="pp3-pt">1</span>
      </div>

      <svg class="pp3-desk" id="pp3-desk-svg" viewBox="0 0 440 210" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pp3-dg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--desk-top-1)"/>
            <stop offset="100%" stop-color="var(--desk-top-2)"/>
          </linearGradient>
          <filter id="pp3-sh"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="rgba(0,0,0,.1)"/></filter>
          <clipPath id="pp3-clip"><rect x="18" y="18" width="404" height="145" rx="10"/></clipPath>
        </defs>

        <rect x="18" y="18" width="404" height="145" rx="10" fill="#b69652" stroke="var(--desk-border)" stroke-width="1.5"/>


        <!-- ZONE: top-left  x=22  w=124  rightEdge=146 -->
        <g class="pp3-zone" id="pp3-zone-top-left" data-zone="top-left" role="button" tabindex="0" aria-pressed="false">
          <rect class="pp3-zbg" id="pp3-zbg-top-left" x="22" y="22" width="124" height="135" rx="8"/>
          <g id="pp3-zind-top-left"></g>
          <text class="pp3-zlbl" id="pp3-zlbl-top-left"   x="84"  y="89.5">บนซ้าย</text>
        </g>

        <!-- ZONE: top-center  x=156  w=128  cx=220 -->
        <g class="pp3-zone" id="pp3-zone-top-center" data-zone="top-center" role="button" tabindex="0" aria-pressed="false">
          <rect class="pp3-zbg" id="pp3-zbg-top-center" x="156" y="22" width="128" height="135" rx="8"/>
          <g id="pp3-zind-top-center"></g>
          <text class="pp3-zlbl" id="pp3-zlbl-top-center" x="220" y="89.5">บนกลาง</text>
        </g>

        <!-- ZONE: top-right  x=294  w=124  rightEdge=418  cx=356 -->
        <g class="pp3-zone" id="pp3-zone-top-right" data-zone="top-right" role="button" tabindex="0" aria-pressed="false">
          <rect class="pp3-zbg" id="pp3-zbg-top-right" x="294" y="22" width="124" height="135" rx="8"/>
          <g id="pp3-zind-top-right"></g>
          <text class="pp3-zlbl" id="pp3-zlbl-top-right"  x="356" y="89.5">บนขวา</text>
        </g>

        <line x1="151" y1="28" x2="151" y2="148" stroke="rgba(182,150,82,.2)" stroke-width="1" stroke-dasharray="4 3"/>
        <line x1="289" y1="28" x2="289" y2="148" stroke="rgba(182,150,82,.2)" stroke-width="1" stroke-dasharray="4 3"/>

        <text x="220" y="10"  text-anchor="middle" font-size="11.5" fill="#aaa" font-family="Prompt,sans-serif">ด้านบน (ติดผนัง)</text>
        <text x="220" y="202" text-anchor="middle" font-size="10"   fill="#aaa" font-family="Prompt,sans-serif">หากต้องการเลือกตำแหน่งอื่นนอกเหนือจากนี้ กรุณาตั้งค่าที่ปุ่ม ตั้งค่าตำแหน่ง Options</text>
      </svg>

      <div class="pp3-warn" id="pp3-warn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span id="pp3-warn-txt"></span>
      </div>

      <div class="pp3-off" id="pp3-off">
        <div class="pp3-off-ttl">กำหนดระยะห่าง (Offset)</div>
        <div id="pp3-info-auto" class="pp3-info-auto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="10" x2="12" y2="18"></line><line x1="12" y1="5" x2="12.01" y2="8"></line></svg>
          <span>ระบบได้คำนวณและเว้นระยะห่างให้อัตโนมัติ</span>
        </div>
        <div class="pp3-off-row">
          <div class="pp3-off-item" id="pp3-box-ox">
            <span id="pp3-ox-lbl">จากขอบซ้าย:</span>
            <input type="number" id="pp3-ox-input" class="pp3-num-input" min="0" step="1">
            <span>cm</span>
          </div>
          <div class="pp3-off-item" id="pp3-box-oy">
            <span id="pp3-oy-lbl">จากขอบบน:</span>
            <input type="number" id="pp3-oy-input" class="pp3-num-input" min="0" step="1">
            <span>cm</span>
          </div>
        </div>
      </div>

    </div>

    <div class="pp3-ft">
      <button type="button" class="pp3-back" id="pp3-back">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        ย้อนกลับ
      </button>
      <button type="button" class="pp3-ok" id="pp3-ok" disabled>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span id="pp3-ok-lbl">ยืนยัน & เพิ่มลงโต๊ะ</span>
      </button>
    </div>

  </div>
</div>

<div id="dpb-confirm" class="dpb-confirm" role="alertdialog" aria-modal="true" aria-hidden="true">
  <div class="dpb-confirm__box">
    <div class="dpb-confirm__title">คุณต้องการลบ Option ทั้งหมดใช่หรือไม่</div>
    <div class="dpb-confirm__actions">
      <button type="button" data-confirm="no">ยกเลิก</button>
      <button type="button" data-confirm="yes">ยืนยัน</button>
    </div>
  </div>
</div>

<div id="dpb-variant-modal" class="dpb-modal" aria-hidden="true" role="dialog" aria-modal="true">
  <div class="dpb-modal__backdrop" id="dpb-variant-backdrop"></div>
  <div class="dpb-modal__panel" role="document">
    <button type="button" class="dpb-modal__close" id="dpb-variant-close" aria-label="ปิด">✕</button>
    <div class="dpb-modal__header">
      <div class="dpb-modal__thumb"><img id="dpb-variant-thumb" alt=""></div>
      <div class="dpb-modal__title-group"></div>
    </div>
    <div class="dpb-modal__body"></div>
    <div class="dpb-modal__footer">
      <button type="button" class="dpb-btn dpb-btn-primary" id="dpb-variant-confirm">ยืนยัน</button>
    </div>
  </div>
</div>

<div id="dpb-remove-confirm" class="dpb-modal dpb-mini-confirm" aria-hidden="true" role="dialog" aria-modal="true">
  <div class="dpb-modal__backdrop" id="dpb-remove-confirm-backdrop"></div>
  <div class="dpb-modal__panel dpb-mini-confirm__panel" role="document" aria-labelledby="dpb-remove-confirm-title">
    <div class="dpb-modal__body dpb-mini-confirm__body">
      <div id="dpb-remove-confirm-title" class="dpb-mini-confirm__title">
        ต้องการลบรายการนี้ออกจากตะกร้าหรือไม่?
      </div>
      <div class="dpb-mini-confirm__actions">
        <button type="button" class="dpb-btn dpb-btn-ghost dpb-mini-confirm__no">ยกเลิก</button>
        <button type="button" class="dpb-btn dpb-btn-danger dpb-mini-confirm__yes">ยืนยัน</button>
      </div>
    </div>
  </div>
</div>

<div class="dpb-floating-cart" aria-live="polite">
    <div class="dpb-cart-tooltip">
        ตั้งค่าตำแหน่ง Options
        <div class="dpb-tooltip-arrow"></div>
    </div>
    <button type="button" id="dpb-cart-button" class="dpb-cart-fab is-empty" aria-haspopup="dialog" aria-expanded="false">
        <span class="dpb-cart-icon">
            <svg width="30" height="30" viewBox="0 0 473 473" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                <path d="M472.614,264.846v-57.072l-51.8-8.824c-4.879-24.233-14.438-46.753-27.654-66.645l30.42-42.911l-40.358-40.358 l-42.911,30.421C320.419,66.24,297.901,56.679,273.667,51.8L264.843,0h-57.074l-8.82,51.8 c-24.234,4.88-46.754,14.44-66.647,27.657L89.39,49.036L49.034,89.394l30.421,42.911c-13.216,19.892-22.776,42.411-27.657,66.645 l-51.797,8.824v57.072l51.797,8.822c4.881,24.233,14.441,46.755,27.657,66.644l-30.421,42.913l40.356,40.356l42.914-30.421 c19.889,13.216,42.409,22.776,66.644,27.656l8.82,51.799h57.074l8.824-51.799c24.234-4.88,46.752-14.439,66.644-27.656 l42.911,30.421l40.358-40.356l-30.42-42.913c13.215-19.889,22.775-42.41,27.654-66.644L472.614,264.846z M236.308,333.1 c-53.458,0-96.794-43.334-96.794-96.793c0-53.457,43.336-96.792,96.794-96.792c53.457,0,96.793,43.335,96.793,96.792 C333.1,289.766,289.764,333.1,236.308,333.1z"/>
            </svg>
        </span>
        <span id="dpb-cart-count" class="dpb-cart-badge" style="display: none;">0</span>
    </button>
</div>

<div class="dpb-sticky-footer">
    <div class="dpb-footer-tools">
        <button type="button" class="dpb-tool-btn" id="dpb-footer-download">
        <i class="fas fa-download"></i>
        <span>บันทึก</span>
        </button>
        <button type="button" class="dpb-tool-btn" id="dpb-footer-theme">
        <i class="fas fa-paint-brush"></i>
        <span>ธีม</span>
        </button>
        <div class="dpb-tool-item dpb-tool-legs-wrap">
            <div class="checkbox-wrapper-34 dpb-switch-legs">
                <input class="tgl tgl-ios" id="dpb-show-legs-footer" type="checkbox" checked>
                <label class="tgl-btn" for="dpb-show-legs-footer" data-on="แสดงขา" data-off="ซ่อนขา"></label>
            </div>
        </div>
        <button type="button" id="dpb-footer-cart-btn" class="dpb-footer-main-btn">
            <div class="dpb-footer-cart-icon">
                <svg width="24" height="24" viewBox="0 0 473 473" fill="#fff">
                <path d="M472.614,264.846v-57.072l-51.8-8.824c-4.879-24.233-14.438-46.753-27.654-66.645l30.42-42.911l-40.358-40.358 l-42.911,30.421C320.419,66.24,297.901,56.679,273.667,51.8L264.843,0h-57.074l-8.82,51.8 c-24.234,4.88-46.754,14.44-66.647,27.657L89.39,49.036L49.034,89.394l30.421,42.911c-13.216,19.892-22.776,42.411-27.657,66.645 l-51.797,8.824v57.072l51.797,8.822c4.881,24.233,14.441,46.755,27.657,66.644l-30.421,42.913l40.356,40.356l42.914-30.421 c19.889,13.216,42.409,22.776,66.644,27.656l8.82,51.799h57.074l8.824-51.799c24.234-4.88,46.752-14.439,66.644-27.656 l42.911,30.421l40.358-40.356l-30.42-42.913c13.215-19.889,22.775-42.41,27.654-66.644L472.614,264.846z M236.308,333.1 c-53.458,0-96.794-43.334-96.794-96.793c0-53.457,43.336-96.792,96.794-96.792c53.457,0,96.793,43.335,96.793,96.792 C333.1,289.766,289.764,333.1,236.308,333.1z"></path>
                </svg>
                <span id="dpb-footer-count" class="dpb-footer-badge">0</span>
            </div>
            <span class="dpb-footer-label">ตั้งค่าตัวเลือก</span>
        </button>
    </div>
</div>

<div id="dpbModal" class="dpb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dpbModalTitle">
  <div class="dpb-modal-box">
    <div class="dpb-modal-header">
      <div class="dpb-header-left">
        <h2 class="dpb-modal-title" id="dpbModalTitle">ติดต่อเรา</h2>
        <div class="dpb-progress" id="dpbProgress">
          <div class="dpb-progress-dot active" id="dpbDot1"></div>
          <div class="dpb-progress-dot" id="dpbDot2"></div>
        </div>
      </div>
      <button class="dpb-close-btn" onclick="dpbCloseModal()" aria-label="ปิด">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="dpb-modal-scroll">
      <div id="dpbIntentView" class="dpb-view">
        <div class="dpb-preview-wrap">
          <img id="dpb_preview_img" src="" alt="Design Preview" style="display:none;">
          <span id="dpb_preview_placeholder" style="font-size:12px; color:#9a9590; letter-spacing:0.06em;">กำลังโหลดภาพแบบ...</span>
        </div>

        <div class="dpb-intent-cards">
          <button class="dpb-intent-card" onclick="dpbSelectIntent('quote')" type="button">
            <div class="dpb-intent-icon">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
              <path d="M10 9H8"></path>
             </svg>            
            </div>
            <div>
              <div class="dpb-intent-label">ขอใบเสนอราคา</div>
              <div class="dpb-intent-desc">รับใบเสนอราคาจากแบบที่คุณออกแบบไว้</div>
            </div>
          </button>

          <button class="dpb-intent-card" onclick="dpbSelectIntent('inquiry')" type="button">
            <div class="dpb-intent-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
                  <path d="M8 12h.01"></path>
                  <path d="M12 12h.01"></path>
                  <path d="M16 12h.01"></path>
                </svg>
            </div>
            <div>
              <div class="dpb-intent-label">สอบถามข้อมูล</div>
              <div class="dpb-intent-desc">สอบถามรายละเอียดของแบบโต๊ะเพิ่มเติม</div>
            </div>
          </button>
        </div>
      </div>

      <div id="dpbQuoteView" class="dpb-form-view dpb-view" style="display:none;">
        <div class="dpb-section-label">ข้อมูลติดต่อ</div>
        <div class="dpb-grid-row">
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_q_name">ชื่อ / บริษัท <span class="dpb-req">*</span></label>
            <input type="text" id="dpb_q_name" class="dpb-input" placeholder="Name or Company">
            <span class="dpb-error-msg">กรุณากรอกชื่อ</span>
          </div>
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_q_email">อีเมล <span class="dpb-req">*</span></label>
            <input type="email" id="dpb_q_email" class="dpb-input" placeholder="name@example.com">
            <span class="dpb-error-msg">กรุณากรอกอีเมล</span>
          </div>
        </div>
        <div class="dpb-grid-row">
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_q_tel">เบอร์โทร <span class="dpb-req">*</span></label>
            <input type="tel" id="dpb_q_tel" class="dpb-input" placeholder="08x-xxx-xxxx">
            <span class="dpb-error-msg">กรุณากรอกเบอร์โทร</span>
          </div>
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_q_line">Line <span class="dpb-opt">(ไม่บังคับ)</span></label>
            <input type="text" id="dpb_q_line" class="dpb-input" placeholder="Line ID or Number">
          </div>
        </div>

        <div class="dpb-form-group">
          <label class="dpb-label" for="dpb_q_note">รายละเอียดที่ต้องการแจ้งเพิ่มเติม <span class="dpb-opt">(ไม่บังคับ)</span></label>
          <textarea id="dpb_q_note" class="dpb-textarea" placeholder="พิมพ์รายละเอียดเพิ่มเติมที่นี่ (ถ้ามี)..."></textarea>
        </div>
      </div>
      
      <div id="dpbInquiryView" class="dpb-form-view dpb-view" style="display:none;">
        <div class="dpb-section-label">Contact Information</div>
        <div class="dpb-grid-row">
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_i_name">ชื่อ / บริษัท <span class="dpb-req">*</span></label>
            <input type="text" id="dpb_i_name" class="dpb-input" placeholder="Name or Company">
            <span class="dpb-error-msg">กรุณากรอกชื่อ</span>
          </div>
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_i_email">อีเมล <span class="dpb-req">*</span></label>
            <input type="email" id="dpb_i_email" class="dpb-input" placeholder="name@example.com">
            <span class="dpb-error-msg">กรุณากรอกอีเมล</span>
          </div>
        </div>
        <div class="dpb-grid-row">
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_i_tel">เบอร์โทร <span class="dpb-req">*</span></label>
            <input type="tel" id="dpb_i_tel" class="dpb-input" placeholder="08x-xxx-xxxx">
            <span class="dpb-error-msg">กรุณากรอกเบอร์โทร</span>
          </div>
          <div class="dpb-form-group">
            <label class="dpb-label" for="dpb_i_line">Line <span class="dpb-opt">(ไม่บังคับ)</span></label>
            <input type="text" id="dpb_i_line" class="dpb-input" placeholder="Line ID or Number">
          </div>
        </div>

        <div class="dpb-section-label" style="margin-top:8px;">Message</div>
        <div class="dpb-form-group">
          <label class="dpb-label" for="dpb_i_question">รายละเอียดที่ต้องการสอบถาม <span class="dpb-req">*</span></label>
          <textarea id="dpb_i_question" class="dpb-textarea" placeholder="พิมพ์รายละเอียดสินค้าที่สนใจ หรือข้อสงสัยของคุณที่นี่..."></textarea>
          <span class="dpb-error-msg">กรุณากรอกข้อความ</span>
        </div>
        <div style="height:24px;"></div>
      </div>

      <div id="dpbSuccessView" style="display:none;">
        <div class="dpb-success-burst">
          <div class="dpb-success-burst-ring"></div>
          <div class="dpb-success-burst-ring"></div>
          <div class="dpb-spark"></div>
          <div class="dpb-spark"></div>
          <div class="dpb-spark"></div>
          <div class="dpb-spark"></div>
          <div class="dpb-spark"></div>
          <div class="dpb-spark"></div>
          <div class="dpb-success-icon-wrap">
            <svg class="dpb-success-svg" width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path class="dpb-check-stroke" d="M30 50 L43 63 L70 35" stroke="#b69652" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </div>
        </div>

        <h3 class="dpb-success-title">ส่งข้อมูลเรียบร้อยแล้ว</h3>
        <div class="dpb-success-divider"></div>
        <p class="dpb-success-body" id="dpbSuccessMsg">
          ทีมงานได้รับข้อมูลของคุณแล้ว<br>และจะติดต่อกลับโดยเร็วที่สุด
        </p>
        <button onclick="dpbCloseModal()" class="dpb-trigger-btn" style="margin: 0 auto; font-size:13px; animation: dpbFadeUp 0.5s 0.9s ease both; opacity:0;" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>ปิดหน้าต่าง</span>
        </button>
      </div>

      <div id="dpbPrivacyView" style="display:none; flex-direction:column; overflow:hidden; height:100%;">
        <div class="dpb-privacy-scroll-box">
          <h2>Privacy Policy</h2>
          <span class="dpb-prv-brand">นโยบายการคุ้มครองข้อมูลส่วนบุคคล</span>
          <p class="dpb-prv-intro">
            แบรนด์ DeskSpace ภายใต้การดูแลของ บริษัท บ็อกซ์ บิลเลี่ยน จำกัด ("บริษัทฯ") ตระหนักถึงความสำคัญของข้อมูลส่วนบุคคลของคุณ เราจัดทำนโยบายฉบับนี้เพื่อให้คุณมั่นใจว่าข้อมูลของคุณจะได้รับการดูแลและรักษาความปลอดภัยอย่างสูงสุด ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>

          <div class="dpb-prv-section">
            <div class="dpb-prv-section-title">1. วัตถุประสงค์ในการเก็บรวบรวมข้อมูล</div>
            <div class="dpb-prv-section-body">
              บริษัทฯ จะเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของคุณเฉพาะเท่าที่จำเป็นภายใต้วัตถุประสงค์ดังต่อไปนี้:
              <ul class="dpb-prv-list">
                <li>ติดต่อกลับ ให้คำปรึกษา และตอบข้อซักถามเกี่ยวกับสินค้าและบริการ</li>
                <li>จัดทำและนำส่งใบเสนอราคาตามที่คุณร้องขอ</li>
                <li>ดำเนินการรับคำสั่งซื้อและประสานงานการจัดส่งสินค้า</li>
                <li>การบริการหลังการขายและการรับประกันสินค้า</li>
              </ul>
            </div>
          </div>

          <div class="dpb-prv-section">
            <div class="dpb-prv-section-title">2. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม</div>
            <div class="dpb-prv-section-body">
              ในการส่งข้อมูลผ่านแบบฟอร์มนี้ บริษัทฯ จะเก็บรวบรวมข้อมูลดังต่อไปนี้:
              <ul class="dpb-prv-list">
                <li>ชื่อ - นามสกุล หรือ ชื่อบริษัท</li>
                <li>หมายเลขโทรศัพท์</li>
                <li>ที่อยู่อีเมล (Email)</li>
                <li>Line ID (ถ้ามี)</li>
                <li>ข้อมูลรายละเอียดสเปคสินค้าที่คุณเลือก</li>
              </ul>
            </div>
          </div>

          <div class="dpb-prv-section">
            <div class="dpb-prv-section-title">3. การเปิดเผยข้อมูลส่วนบุคคล</div>
            <div class="dpb-prv-section-body">
              <div class="dpb-prv-highlight">
                บริษัทฯ ขอยืนยันว่า จะไม่มีการนำข้อมูลส่วนบุคคลของคุณไปขาย แลกเปลี่ยน หรือเผยแพร่ให้กับบุคคลภายนอกโดยเด็ดขาด
              </div>
              ข้อมูลของคุณจะถูกเข้าถึงและประมวลผลโดยทีมงานภายในของบริษัทฯ ที่มีหน้าที่เกี่ยวข้องกับการให้บริการคุณเท่านั้น ยกเว้นในกรณีที่มีความจำเป็นต้องปฏิบัติตามกฎหมาย หรือตามคำสั่งของหน่วยงานรัฐที่มีอำนาจ
            </div>
          </div>

          <div class="dpb-prv-section">
            <div class="dpb-prv-section-title">4. การเก็บรักษาและระยะเวลา</div>
            <div class="dpb-prv-section-body">
              บริษัทฯ จะจัดเก็บข้อมูลส่วนบุคคลของคุณในระบบที่มีมาตรการรักษาความปลอดภัยทางอิเล็กทรอนิกส์ที่ได้มาตรฐาน และจะเก็บรักษาข้อมูลไว้ตามระยะเวลาที่จำเป็นต่อการบรรลุวัตถุประสงค์ข้างต้น หรือจนกว่าคุณจะมีการร้องขอให้ลบข้อมูล
            </div>
          </div>

          <div class="dpb-prv-section">
            <div class="dpb-prv-section-title">5. สิทธิของเจ้าของข้อมูลส่วนบุคคล</div>
            <div class="dpb-prv-section-body">
              ในฐานะเจ้าของข้อมูล คุณมีสิทธิตามกฎหมายดังต่อไปนี้:
              <ul class="dpb-prv-list">
                <li>สิทธิในการขอเข้าถึง ขอรับสำเนา หรือขอแก้ไขข้อมูลให้ถูกต้อง</li>
                <li>สิทธิในการขอให้ระงับการใช้ หรือลบข้อมูลส่วนบุคคลของคุณออกจากระบบ</li>
                <li>สิทธิในการเพิกถอนความยินยอมที่คุณได้ให้ไว้กับบริษัทฯ ได้ตลอดเวลา</li>
              </ul>
            </div>
          </div>

          <div class="dpb-prv-section">
            <div class="dpb-prv-section-title">6. ช่องทางการติดต่อ</div>
            <div class="dpb-prv-section-body">
              หากคุณมีข้อสงสัยเกี่ยวกับนโยบายฉบับนี้ หรือต้องการใช้สิทธิของเจ้าของข้อมูล สามารถติดต่อเราได้ที่:
              <div class="dpb-prv-contact-row" style="margin-top:10px;">
                <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"></path></svg>
                team@boxbillion.com
              </div>
              <div class="dpb-prv-contact-row">
                <svg viewBox="0 0 64 64"><path d="M64 27.487c0-14.32-14.355-25.97-32-25.97S0 13.168 0 27.487c0 12.837 11.384 23.588 26.762 25.62 1.042.225 2.46.688 2.82 1.578.322.81.21 2.076.103 2.894l-.457 2.74c-.14.81-.643 3.164 2.772 1.725s18.428-10.852 25.143-18.58h-.001C61.78 38.38 64 33.218 64 27.487" fill="#b69652"></path><g fill="#fff"><path d="M25.498 20.568h-2.245c-.344 0-.623.28-.623.623v13.943a.62.62 0 0 0 .623.62h2.245a.62.62 0 0 0 .623-.62V21.2c0-.343-.28-.623-.623-.623"></path><path d="M40.948 20.558h-2.244c-.345 0-.624.28-.624.623v8.284l-6.4-8.63a.6.6 0 0 0-.158-.154.62.62 0 0 0-.168-.022h-2.244c-.344 0-.623.28-.623.623V35.13a.62.62 0 0 0 .623.62h2.244c.344 0 .624-.278.624-.62v-8.28l6.397 8.64a.62.62 0 0 0 .203.184.62.62 0 0 0 .168.022h2.244a.62.62 0 0 0 .623-.62V21.2c0-.343-.28-.623-.623-.623"></path><path d="M20.087 32.264h-6.1V21.2c0-.344-.28-.623-.623-.623H11.12c-.344 0-.623.28-.623.623v13.942a.62.62 0 0 0 .174.431.62.62 0 0 0 .43.174h8.968c.344 0 .623-.28.623-.623v-2.245c0-.344-.278-.623-.623-.623"></path><path d="M53.345 20.558h-8.968a.62.62 0 0 0-.432.176.62.62 0 0 0-.173.43v13.943a.62.62 0 0 0 .174.431.62.62 0 0 0 .431.174h8.968c.344 0 .623-.28.623-.623v-2.246c0-.344-.278-.623-.623-.623h-6.098v-2.357h6.098a.62.62 0 0 0 .623-.623V27.04c0-.344-.278-.624-.623-.624h-6.098V24.06h6.098c.344 0 .623-.28.623-.623V21.2c0-.343-.278-.623-.623-.623"></path></g></svg>
                Line Official: @deskspace
              </div>
            </div>
          </div>
        </div>
        <div class="dpb-privacy-header-bar">
          <span class="dpb-privacy-view-title" onclick="dpbClosePrivacyView()">ย้อนกลับ</span>
        </div>
      </div>
    </div>

    <div class="dpb-modal-footer" id="dpbFooter">
      <div id="dpbPrivacyConsentRow" style="width:100%; margin-bottom:12px;">
        <div class="dpb-privacy-wrap">
          <input type="checkbox" class="dpb-privacy-checkbox" id="dpbPrivacyCheckbox">
          <label class="dpb-privacy-label" for="dpbPrivacyCheckbox">
            ฉันได้อ่านและยอมรับ
            <button type="button" class="dpb-privacy-link" onclick="dpbOpenPrivacyView()">นโยบายการคุ้มครองข้อมูลส่วนบุคคล</button>
            ของ DeskSpace แล้ว
          </label>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px; width:100%;">
        <button onclick="dpbGoBack()" class="dpb-btn-cancel" type="button">ย้อนกลับ</button>
        <button onclick="dpbSubmitForm()" id="dpbSubmitBtn" class="dpb-btn-submit" type="button" disabled>
          <span class="dpb-btn-text">ยืนยันการส่งข้อมูล</span>
          <div class="dpb-btn-spinner"></div>
        </button>
      </div>
    </div>
  </div>
</div>

<div id="ds-auth-modal" class="ds-modal" aria-hidden="true">
    <div class="ds-modal-backdrop" onclick="dsAuthModal.close()"></div>
    <div class="ds-modal-panel">
        <button type="button" class="ds-modal-close" onclick="dsAuthModal.close()">✕</button>
        
        <div class="ds-modal-header">
            <h2 id="ds-modal-title">เข้าสู่ระบบ</h2>
            <p id="ds-modal-desc">เข้าสู่ระบบเพื่อบันทึกและจัดการแบบของคุณ</p>
        </div>

        <div class="ds-modal-body">
            <div id="ds-view-login" class="ds-view">
                <form id="ds-form-login" onsubmit="dsAuthModal.submitLogin(event)">
                    <div class="ds-input-group">
                        <label>อีเมล หรือ ชื่อผู้ใช้</label>
                        <input type="text" name="log" required placeholder="Email or Username">
                    </div>
                    <div class="ds-input-group">
                        <label>รหัสผ่าน</label>
                        <div class="ds-pwd-wrap">
                            <input type="password" name="pwd" required placeholder="Password">
                            <span class="ds-toggle-eye" onclick="dsAuthModal.togglePwd(this)">👁️</span>
                        </div>
                    </div>
                    <div class="ds-actions">
                        <label class="ds-check"><input type="checkbox" name="rememberme" value="forever"> จดจำฉันไว้</label>
                        <a href="#" onclick="dsAuthModal.switchView('forgot'); return false;">ลืมรหัสผ่าน?</a>
                    </div>
                    <button type="submit" class="ds-btn-primary">เข้าสู่ระบบ</button>
                </form>
                <div class="ds-footer-text">
                    ยังไม่มีบัญชี? <a href="#" onclick="dsAuthModal.switchView('register'); return false;">สมัครสมาชิก</a>
                </div>
            </div>

            <div id="ds-view-register" class="ds-view" style="display:none;">
                <form id="ds-form-register" onsubmit="dsAuthModal.submitRegister(event)">
                    <div class="ds-input-group">
                        <label>ชื่อผู้ใช้ (ภาษาอังกฤษ)</label>
                        <input type="text" name="reg_user" required placeholder="Username">
                    </div>
                    <div class="ds-input-group">
                        <label>อีเมล</label>
                        <input type="email" name="reg_email" required placeholder="your@email.com">
                    </div>
                    <div class="ds-row">
                        <div class="ds-input-group">
                            <label>รหัสผ่าน</label>
                            <div class="ds-pwd-wrap">
                                <input type="password" name="reg_pass1" required placeholder="Password">
                                <span class="ds-toggle-eye" onclick="dsAuthModal.togglePwd(this)">👁️</span>
                            </div>
                        </div>
                        <div class="ds-input-group">
                            <label>ยืนยันรหัสผ่าน</label>
                            <div class="ds-pwd-wrap">
                                <input type="password" name="reg_pass2" required placeholder="Confirm">
                                <span class="ds-toggle-eye" onclick="dsAuthModal.togglePwd(this)">👁️</span>
                            </div>
                        </div>
                    </div>
                    <input type="text" name="ds_hp" style="display:none;" tabindex="-1">
                    <button type="submit" class="ds-btn-primary">สมัครสมาชิก</button>
                </form>
                <div class="ds-footer-text">
                    มีบัญชีอยู่แล้ว? <a href="#" onclick="dsAuthModal.switchView('login'); return false;">เข้าสู่ระบบ</a>
                </div>
            </div>

            <div id="ds-view-forgot" class="ds-view" style="display:none;">
                <form id="ds-form-forgot" onsubmit="dsAuthModal.submitForgot(event)">
                    <div class="ds-input-group">
                        <label>อีเมลที่ใช้สมัคร</label>
                        <input type="text" name="forgot_login" required placeholder="Enter your email">
                    </div>
                    <input type="text" name="ds_hp" style="display:none;" tabindex="-1">
                    <button type="submit" class="ds-btn-primary">ส่งลิงก์รีเซ็ต</button>
                </form>
                <div class="ds-footer-text">
                    <a href="#" onclick="dsAuthModal.switchView('login'); return false;">&larr; กลับหน้าเข้าสู่ระบบ</a>
                </div>
            </div>

            <div id="ds-view-profile" class="ds-view" style="display:none; text-align:center;">
                <div class="ds-profile-avatar">
                    <div class="ds-avatar-placeholder">
                        <?php echo get_avatar(get_current_user_id(), 80); ?>
                    </div>
                </div>
                <h3 id="ds-profile-name" style="margin:15px 0 5px 0; color:#333; font-size:20px;">User</h3>
                <span id="ds-profile-role" style="display: inline-block; background: #f3f4f6; color: #666; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; text-transform: uppercase; margin-bottom: 25px;">Customer</span>
                <button type="button" class="ds-btn-primary" style="background:#dc2626; border-color:#dc2626;" onclick="dsAuthModal.switchView('logout-confirm')">ออกจากระบบ</button>
            </div>
            <div id="ds-view-logout-confirm" class="ds-view" style="display:none; text-align:center;">
                <div class="ds-logout-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </div>
                
                <h3 style="margin:10px 0 5px 0; color:#333; font-size:22px;">ออกจากระบบ?</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px;">คุณต้องการออกจากระบบ Deskspace ใช่หรือไม่</p>
                
                <div class="ds-row">
                    <button type="button" class="ds-btn-ghost" onclick="dsAuthModal.switchView('profile')">ยกเลิก</button>
                    <button type="button" class="ds-btn-primary" style="background:#dc2626; border-color:#dc2626;" onclick="dsAuthModal.confirmLogout()">ยืนยัน</button>
                </div>
            </div>

            <div id="ds-msg-box" style="display:none; margin-top:15px; padding:10px; border-radius:8px; font-size:14px; text-align:center;"></div>
        </div>
    </div>
</div>

<div id="ptr-spinner" class="ptr-wrap">
    <svg class="ptr-icon" viewBox="0 0 24 24">
        <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M4.93 4.93L3.51 3.51M20.49 20.49l-1.42-1.42M4.93 19.07l-1.42 1.42M20.49 3.51l-1.42 1.42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
</div>
    <?php
    return ob_get_clean();
}

function ds_configurator_print_footer_scripts() {
    $current_user_dpb = wp_get_current_user();
    $is_kantapit_admin = ($current_user_dpb->exists() && $current_user_dpb->user_login === 'kantapit' && current_user_can('administrator'));
    $canShow3D_PHP = $is_kantapit_admin;

    $user_data = [];
    if ($current_user_dpb->exists()) {
        $user_data = [
            'ID' => $current_user_dpb->ID,
            'user_login' => $current_user_dpb->user_login,
            'display_name' => $current_user_dpb->display_name,
            'user_email' => $current_user_dpb->user_email,
            'roles' => $current_user_dpb->roles,
        ];
    }
    ?>
<script>
window.dsConfiguratorVars = <?php echo json_encode([
    'apiUrl' => EC_DRAW_API_URL,
    'ajaxUrl' => admin_url('admin-ajax.php'),
    'canShow3D' => $canShow3D_PHP,
    'brandLogoUrl' => 'https://www.deskspace.in.th/wp-content/uploads/2025/10/Logo_DeskSpace_Config-1.webp'
]); ?>;

window.ds_auth_vars = <?php echo json_encode([
    'is_logged' => is_user_logged_in(),
    'current_user' => $user_data,
    'ajax_url' => admin_url('admin-ajax.php'),
    'nonce' => wp_create_nonce('ds_auth_nonce'),
    'logout_url' => esc_js(wp_logout_url(home_url()))
]); ?>;

<?php if (current_user_can('administrator')) : ?>
window.dsAdminMode = {
    active: false,
    token: '<?= defined('DS_ADMIN_TOKEN') ? esc_js(DS_ADMIN_TOKEN) : '' ?>',
    apiUrl: '<?= defined('DS_ADMIN_API_URL') ? esc_js(DS_ADMIN_API_URL) : '' ?>',
    ajaxUrl: '<?= admin_url('admin-ajax.php') ?>',
    nonce: '<?= wp_create_nonce('ds_admin_mode_nonce') ?>'
};
<?php endif; ?>
</script>

<script>
(async function(){
    <?php
    $core_path = DS_CONFIGURATOR_PATH . 'assets/js/configurator-core.js';
    $drawing_path = DS_CONFIGURATOR_PATH . 'assets/js/configurator-drawing.js';
    $ui_path = DS_CONFIGURATOR_PATH . 'assets/js/configurator-ui.js';

    if (file_exists($core_path)) {
        echo ds_escape_js_non_ascii(file_get_contents($core_path)) . "\n\n";
    }
    if (file_exists($drawing_path)) {
        echo ds_escape_js_non_ascii(file_get_contents($drawing_path)) . "\n\n";
    }
    if (file_exists($ui_path)) {
        echo ds_escape_js_non_ascii(file_get_contents($ui_path)) . "\n\n";
    }
    ?>
})();
</script>

<script>
<?php
$ai_path = DS_CONFIGURATOR_PATH . 'assets/js/configurator-ai.js';
if (file_exists($ai_path)) {
    echo ds_escape_js_non_ascii(file_get_contents($ai_path));
}
?>
</script>

<script>
<?php
$misc_path = DS_CONFIGURATOR_PATH . 'assets/js/configurator-misc.js';
if (file_exists($misc_path)) {
    echo ds_escape_js_non_ascii(file_get_contents($misc_path));
}
?>
</script>
    <?php
}
