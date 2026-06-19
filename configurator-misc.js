const dsAuthModal = {
    el: document.getElementById('ds-auth-modal'),
    
    // [แก้ไข 1] เช็คสถานะ Login จาก PHP โดยตรง (ไม่ต้องรอตัวแปร global)
    isLogged: (typeof ds_auth_vars !== 'undefined') ? ds_auth_vars.is_logged : false,
    
    // [แก้ไข 2] ดึงข้อมูล User จาก PHP โดยตรง
    currentUser: (typeof ds_auth_vars !== 'undefined') ? ds_auth_vars.current_user : {},
    
    // [แก้ไข 3] สร้าง Nonce และ URL ตรงนี้เลย
    ajaxUrl: (typeof ds_auth_vars !== 'undefined') ? ds_auth_vars.ajax_url : '',
    nonce: (typeof ds_auth_vars !== 'undefined') ? ds_auth_vars.nonce : '',
    logoutUrl: (typeof ds_auth_vars !== 'undefined') ? ds_auth_vars.logout_url : '',

    // --- ส่วน Logic ด้านล่างเหมือนเดิม ไม่ต้องแก้ไข ---
    open: function() {
        this.el.classList.add('open');
        this.resetMsg();
        if(this.isLogged) {
            this.switchView('profile');
            // เช็คว่ามีข้อมูล User จริงไหม ป้องกัน Error
            let displayName = 'User';
            if (this.currentUser && (this.currentUser.display_name || this.currentUser.user_login)) {
                displayName = this.currentUser.display_name || this.currentUser.user_login;
            }
            document.getElementById('ds-profile-name').innerText = displayName;
            
            let roleName = 'Member';
            if (this.currentUser && this.currentUser.roles && this.currentUser.roles.length > 0) {
                roleName = this.currentUser.roles[0];
            }
            document.getElementById('ds-profile-role').innerText = roleName.charAt(0).toUpperCase() + roleName.slice(1);
        } else {
            this.switchView('login');
        }
    },
    
    close: function() { this.el.classList.remove('open'); },

    switchView: function(viewName) {
        document.querySelectorAll('.ds-view').forEach(el => el.style.display = 'none');
        document.getElementById('ds-view-' + viewName).style.display = 'block';
        this.resetMsg();
        const title = document.getElementById('ds-modal-title');
        const desc = document.getElementById('ds-modal-desc');
        
        // เช็คว่า element มีอยู่จริงไหมก่อน set innerText เพื่อป้องกัน error ในบางหน้า
        if(title) {
             if(viewName === 'login') { title.innerText='เข้าสู่ระบบ'; desc.innerText='เข้าสู่ระบบเพื่อดำเนินการต่อ'; }
             else if(viewName === 'register') { title.innerText='สมัครสมาชิก'; desc.innerText='สร้างบัญชีใหม่เพื่อเริ่มออกแบบ'; }
             else if(viewName === 'forgot') { title.innerText='ลืมรหัสผ่าน?'; desc.innerText='ระบุอีเมลเพื่อตั้งรหัสใหม่'; }
             else if(viewName === 'profile') { title.innerText='ข้อมูลบัญชี'; desc.innerText='จัดการข้อมูลของคุณ'; }
             else if(viewName === 'logout-confirm') { 
                 title.innerText='ออกจากระบบ'; 
                 if(desc) desc.innerText=''; 
             }
        }
    },

    confirmLogout: function() {
        this.showMsg('กำลังออกจากระบบ...', 'success');
        
        let fd = new FormData();
        fd.append('action', 'ds_ajax_logout');
        fd.append('security', this.nonce);

        fetch(this.ajaxUrl, { method: 'POST', body: fd })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                window.location.reload();
            } else {
                window.location.href = this.logoutUrl;
            }
        })
        .catch(err => {
            console.error(err);
            window.location.reload();
        });
    },

    togglePwd: function(btn) {
        const input = btn.previousElementSibling;
        if(input.type === 'password'){ 
            input.type = 'text'; 
            btn.style.opacity = '1'; 
        } else { 
            input.type = 'password'; 
            btn.style.opacity = '0.4'; 
        }
    },

    resetMsg: function() {
        const msg = document.getElementById('ds-msg-box');
        if(msg) { msg.style.display = 'none'; msg.className = ''; msg.innerText = ''; }
    },
    showMsg: function(text, type) {
        const msg = document.getElementById('ds-msg-box');
        if(msg) {
            msg.innerText = text;
            msg.className = (type === 'error') ? 'ds-msg-error' : 'ds-msg-success';
            msg.style.display = 'block';
        }
    },

    _send: function(action, formData, callback) {
        formData.append('action', action);
        formData.append('security', this.nonce);
        const btn = document.querySelector('.ds-view[style*="block"] button[type="submit"]');
        const originalText = btn ? btn.innerText : '';
        if(btn) { btn.disabled = true; btn.innerText = 'กำลังประมวลผล...'; }

        fetch(this.ajaxUrl, { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if(btn) { btn.disabled = false; btn.innerText = originalText; }
            if (data.success) {
                callback({ success: true, data: data.data });
            } else {
                callback({ success: false, data: data.data });
            }
        })
        .catch(err => {
            console.error(err);
            if(btn) { btn.disabled = false; btn.innerText = originalText; }
            this.showMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ (Server Error)', 'error');
        });
    },

    submitLogin: function(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        this._send('ds_ajax_login', fd, (res) => {
            if(res.success) {
                this.showMsg('เข้าสู่ระบบสำเร็จ! กำลังรีโหลด...', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else { 
                this.showMsg(res.data || 'Login Failed', 'error'); 
            }
        });
    },
    submitRegister: function(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        this._send('ds_ajax_register', fd, (res) => {
            if(res.success) {
                this.showMsg('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else { 
                this.showMsg(res.data || 'Register Failed', 'error'); 
            }
        });
    },
    submitForgot: function(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        this._send('ds_ajax_forgot', fd, (res) => {
            if(res.success) {
                this.showMsg('ส่งลิงก์รีเซ็ตไปทางอีเมลแล้ว', 'success');
                e.target.reset();
            } else { 
                this.showMsg(res.data || 'Error', 'error'); 
            }
        });
    }
};

(function () {
    'use strict';

    /* ─── URL Query String Helpers ─── */
    function getQueryLang() {
        var params = new URLSearchParams(window.location.search);
        return params.get('lang'); // 'en', 'th', หรือ null
    }

    function setQueryLang(lang) {
        var url = new URL(window.location.href);
        if (lang === 'th' || !lang) {
            url.searchParams.delete('lang');
        } else {
            url.searchParams.set('lang', lang);
        }
        return url.toString();
    }

    /* ─── Cookie Helpers ─── */
    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    }

    function clearGoogleTranslateCookies() {
        var host     = window.location.hostname;
        var hostNaked = host.replace(/^www\./, '');
        var domains  = [host, '.' + host, hostNaked, '.' + hostNaked];
        var paths    = ['/', '/configurator/', '/configurator'];
        domains.forEach(function (d) {
            paths.forEach(function (p) {
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=' + p + '; domain=' + d + ';';
            });
        });
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    function setGoogleTranslateCookie(from, to) {
        var val       = '/' + from + '/' + to;
        var host      = window.location.hostname;
        var hostNaked = host.replace(/^www\./, '');
        document.cookie = 'googtrans=' + val + '; path=/; domain=' + host + ';';
        document.cookie = 'googtrans=' + val + '; path=/; domain=.' + hostNaked + ';';
        document.cookie = 'googtrans=' + val + '; path=/;';
    }

    /* ─── Browser Language ─── */
    function browserIsNonThai() {
        var lang = (navigator.language || navigator.userLanguage || 'th').substring(0, 2).toLowerCase();
        return lang !== 'th';
    }

    /* ─── ตรรกะกำหนดภาษาเริ่มต้น ───
       Priority: ?lang= query > browser language > default TH
    ─── */
    function getInitialLang() {
        var q = getQueryLang();
        if (q === 'en') return 'en';
        if (q === 'th') return 'th';
        // ไม่มี query → ดูภาษา browser
        if (browserIsNonThai()) return 'en';
        return 'th';
    }

    /* ─── Google Translate ─── */
    function loadGoogleTranslateScript(callback) {
        if (window.__dsGTLoaded) {
            if (callback) callback();
            return;
        }
        window.googleTranslateElementInit = function () {
            new google.translate.TranslateElement({
                pageLanguage: 'th',
                autoDisplay: false
            }, 'google_translate_element');
            window.__dsGTLoaded = true;
            if (callback) setTimeout(callback, 400);
        };
        var s = document.createElement('script');
        s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        s.async = true;
        document.head.appendChild(s);
    }

    function triggerGoogleTranslate(langCode) {
        var sel = document.querySelector('select.goog-te-combo');
        if (sel) {
            sel.value = langCode;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    /* ─── Main ─── */
    document.addEventListener('DOMContentLoaded', function () {
        var container = document.getElementById('ds-header-lang-toggle');
        if (!container) return;

        var initLang = getInitialLang();
        container.setAttribute('data-active', initLang);

        if (initLang === 'en') {
            /* EN: set cookie แล้วโหลด GT */
            setGoogleTranslateCookie('th', 'en');
            loadGoogleTranslateScript(function () {
                triggerGoogleTranslate('en');
            });
        } else {
            /* TH: ล้าง cookie ให้สะอาด + preload GT เงียบๆ */
            clearGoogleTranslateCookies();
            window.googleTranslateElementInit = function () {
                new google.translate.TranslateElement({ pageLanguage: 'th', autoDisplay: false }, 'google_translate_element');
                window.__dsGTLoaded = true;
            };
            var s = document.createElement('script');
            s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            s.async = true;
            document.head.appendChild(s);
        }

        /* ─── Button Clicks ─── */
        container.querySelectorAll('.ds-lang-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var target  = this.getAttribute('data-lang');
                var current = container.getAttribute('data-active');
                if (target === current) return;

                if (target === 'th') {
                    /*
                     * กลับ TH:
                     * 1. ล้าง cookie
                     * 2. เปลี่ยน URL → ลบ ?lang= ออก
                     * 3. Reload → ได้ content ต้นฉบับ 100%
                     */
                    clearGoogleTranslateCookies();
                    window.location.href = setQueryLang('th'); // ← URL ไม่มี ?lang= แล้ว

                } else {
                    /*
                     * ไปเป็น EN (หรือภาษาอื่น):
                     * 1. เปลี่ยน URL → ?lang=en
                     * 2. set cookie
                     * 3. Reload → Google Translate รับ cookie แล้วแปลทันที
                     */
                    setGoogleTranslateCookie('th', target);
                    window.location.href = setQueryLang(target); // ← URL มี ?lang=en
                }
            });
        });
    });
})();

// --- UTM & Engagement Tracking ---
(function() {
    // 1. Capture UTM from URL
    const urlParams = new URLSearchParams(window.location.search);
    const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
    utms.forEach(param => {
        const val = urlParams.get(param);
        if (val) {
            sessionStorage.setItem('ds_' + param, val);
        }
    });

    // 2. Click Heatmap Tracking setup
    window.DSLOG_Heatmap = {};
    document.addEventListener('click', function(e) {
        const target = e.target;
        // Check top color tiles
        const colorTile = target.closest('#dpb-top-color-tiles .dpb-tile, .dpb-color-tiles button');
        if (colorTile) {
            const val = colorTile.getAttribute('data-value') || colorTile.innerText || 'Color';
            trackClick('top_color', val.trim());
        }
        // Check leg tiles
        const legTile = target.closest('#dpb-legs-tiles .dpb-tile, #dpb-legs-tiles button');
        if (legTile) {
            const val = legTile.getAttribute('data-value') || legTile.innerText || 'Leg';
            trackClick('legs', val.trim());
        }
        // Check option cards
        const optCard = target.closest('.dpb-opt-card, .dpb-body-option button');
        if (optCard) {
            const titleEl = optCard.querySelector('.dpb-opt-title') || optCard;
            const val = titleEl.innerText || 'Option';
            trackClick('options', val.trim());
        }
    });

    function trackClick(category, name) {
        if (!window.DSLOG_Heatmap[category]) window.DSLOG_Heatmap[category] = {};
        window.DSLOG_Heatmap[category][name] = (window.DSLOG_Heatmap[category][name] || 0) + 1;
    }

    // 3. Time spent per section setup
    window.DSLOG_CurrentSection = 'general';
    window.DSLOG_SectionTimes = {
        general: 0,
        dimensions: 0,
        top_color: 0,
        legs: 0,
        corners: 0,
        options: 0,
        customer_info: 0
    };
    let lastTime = Date.now();
    setInterval(() => {
        const now = Date.now();
        const elapsed = Math.round((now - lastTime) / 1000);
        if (elapsed > 0) {
            window.DSLOG_SectionTimes[window.DSLOG_CurrentSection] = (window.DSLOG_SectionTimes[window.DSLOG_CurrentSection] || 0) + elapsed;
        }
        lastTime = now;
    }, 1000);

    const updateSection = (target) => {
        if (target.closest('#dpb-mw, #dpb-ml, #dpb-aw, #dpb-al')) {
            window.DSLOG_CurrentSection = 'dimensions';
        } else if (target.closest('#dpb-top-color-tiles, #dpb-top-color')) {
            window.DSLOG_CurrentSection = 'top_color';
        } else if (target.closest('#dpb-legs-tiles, #dpb-legs, #dpb-leggap-fields')) {
            window.DSLOG_CurrentSection = 'legs';
        } else if (target.closest('#dpb-edge-tiles, #dpb-edge, #dpb-r-rect, #dpb-r-ldesk')) {
            window.DSLOG_CurrentSection = 'corners';
        } else if (target.closest('.dpb-body-option, #dpb-opt-list')) {
            window.DSLOG_CurrentSection = 'options';
        } else if (target.closest('#dpb-form')) {
            window.DSLOG_CurrentSection = 'customer_info';
        }
    };
    document.addEventListener('focusin', e => updateSection(e.target));
    document.addEventListener('click', e => updateSection(e.target));

})();

window.DSLOG_Traffic_Info = {
    source: 'Direct',
    device: 'Desktop'
};

(function() {
    if (typeof window.DSLOG_V7_Config === 'undefined') return;

    const ref = document.referrer ? document.referrer.toLowerCase() : '';
    let source = 'Direct / None';
    if (ref.includes('google')) source = 'Google';
    else if (ref.includes('facebook') || ref.includes('fbclid')) source = 'Facebook';
    else if (ref.includes('line')) source = 'Line';
    else if (ref.includes('deskspace.in.th')) source = 'Internal';
    else if (ref.length > 5) {
        try { source = new URL(ref).hostname; } catch(e) { source = 'Other Web'; }
    }

    const ua = navigator.userAgent;
    let device = 'Desktop';
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        device = 'Mobile';
    }

    window.DSLOG_Traffic_Info = { source, device };

    // ── Record Visit ─────────────────────────────────────────────────────────
    const visitFd = new FormData();
    visitFd.append('action', 'DSLOG_Deskspace_record_visit');
    visitFd.append('nonce',  window.DSLOG_V7_Config.nonce);
    visitFd.append('source', source);
    visitFd.append('device', device);
    visitFd.append('utm_source', sessionStorage.getItem('ds_utm_source') || '');
    visitFd.append('utm_medium', sessionStorage.getItem('ds_utm_medium') || '');
    visitFd.append('utm_campaign', sessionStorage.getItem('ds_utm_campaign') || '');
    visitFd.append('utm_content', sessionStorage.getItem('ds_utm_content') || '');
    visitFd.append('referrer', document.referrer || '');

    fetch(window.DSLOG_V7_Config.url, {
        method: 'POST',
        body:   visitFd
    }).catch(e => console.log('Visit Log Error:', e));
})();


// ─────────────────────────────────────────────────────────────────────────────
async function DSLOG_Deskspace_collectAndSave() {
    if (typeof window.DSLOG_V7_Config === 'undefined') return;

    try {
        

        const getEl      = (id) => document.getElementById(id);
        const getVal     = (id) => { const el = getEl(id); return (el && el.value) ? el.value : ''; };
        const getTxt     = (id) => { const el = getEl(id); return (el && el.selectedOptions && el.selectedOptions[0]) ? el.selectedOptions[0].text.trim() : ''; };
        const getNum     = (id) => { const val = getVal(id); return val === '' ? '-' : val; };
        const getLabelTxt= (id) => { const el = getEl(id); return (el) ? el.innerText.trim() : ''; };

        function checkLegGapModified() {
            const type = getVal('dpb-type').trim();
            const len  = parseFloat(getVal('dpb-ml')) || 0;
            const valA = parseFloat(getVal('dpb-gapA')) || 0;
            const valB = parseFloat(getVal('dpb-gapB')) || 0;
            let def = 5;
            if (type === 'l2') {
                if (len >= 120 && len <= 180) def = 5;
                else if (len >= 181 && len <= 190) def = 15;
                else if (len >= 191 && len <= 200) def = 25;
            }
            const isChanged = (Math.abs(valA - def) > 0.1) || (Math.abs(valB - def) > 0.1);
            if (isChanged) console.log("DSLOG: Gap Changed Detected", {valA, valB, def});
            return isChanged;
        }

        function checkLegCollisionWarning() {
            const notes = document.querySelectorAll('.dpb-field-note, .dpb-error-msg, .dpb-warning-text');
            for (let note of notes) {
                const txt = (note.textContent || '').toLowerCase();
                if (txt.includes('ขาโต๊ะ') || txt.includes('ทับ') || txt.includes('ชน')) {
                    return true;
                }
            }
            const toasts = document.querySelectorAll('.dpb-toast-msg, .dpb-alert-box');
            for (let t of toasts) {
                const txt = (t.textContent || '').toLowerCase();
                if (txt.includes('ขาโต๊ะ') || txt.includes('ทับ') || txt.includes('ชน')) {
                    return true;
                }
            }
            return false;
        }

        const leg_spacing = {};
        const valA = getNum('dpb-gapA');
        const valB = getNum('dpb-gapB');
        if (valA !== '-') leg_spacing[getLabelTxt('dpb-gapA-label') || 'ระยะ A'] = valA;
        if (valB !== '-') leg_spacing[getLabelTxt('dpb-gapB-label') || 'ระยะ B'] = valB;

        const customer = {
            "ชื่อ":         getVal('dpb-customer') || 'ไม่ระบุ',
            "แพลตฟอร์ม":    getVal('dpb-platforms') || 'ไม่ระบุ',
            "เบอร์โทร":     getVal('dpb-phone') || '-',
            "วันที่เลือก":  getVal('dpb-date') || '-'
        };

        const desk_spec = {
            "ประเภท":              getTxt('dpb-type'),
            "สีท็อป":              getTxt('dpb-top-color'),
            "รุ่นขาโต๊ะ":         getTxt('dpb-legs'),
            "ความกว้าง_Main_cm":  getNum('dpb-mw'),
            "ความยาว_Main_cm":    getNum('dpb-ml'),
            "ความกว้าง_L_cm":     getNum('dpb-aw'),
            "ความยาว_L_cm":       getNum('dpb-al'),
            "ทิศด้าน_L":          getVal('dpb-aside') === 'left' ? 'ซ้าย' : (getVal('dpb-aside') === 'right' ? 'ขวา' : '-'),
            "รูปแบบขอบ":          getVal('dpb-edge') === 'rounded' ? 'มุมมน' : 'มุมเหลี่ยม',
            "ทริมเมอร์_ไม้แท้":   getVal('dpb-solid-trim') === 'trim' ? 'Yes' : 'No'
        };

        const corners = {
            "Rect_บนซ้าย_mm":   getNum('r_rect_tl'),  "Rect_บนขวา_mm":   getNum('r_rect_tr'),
            "Rect_ล่างซ้าย_mm": getNum('r_rect_bl'),  "Rect_ล่างขวา_mm": getNum('r_rect_br'),
            "L_บนซ้าย_mm":      getNum('ld_r_tl'),    "L_บนขวา_mm":      getNum('ld_r_tr'),
            "L_ด้านใน_mm":      getNum('dpb-rInner'),
            "L_ล่างซ้าย_mm":    getNum('ld_r_armbl'), "L_ล่างขวา_mm":    getNum('ld_r_armbr'),
            "L_จุดหัก_Step_mm": getNum('ld_r_step')
        };

        const options_list = [];
        const globalState = window.state || {};
        if (!globalState.optConfig) {
        }
        if (globalState.optConfig) {
            const mapVert = (v) => { v=String(v||'').toLowerCase(); return (v==='top'||v==='บน')?'บน':(v==='bottom'||v==='ล่าง')?'ล่าง':(v==='center'||v==='กลาง')?'กลาง':v||'-'; };
            const mapHorz = (v) => { v=String(v||'').toLowerCase(); return (v==='left'||v==='ซ้าย')?'ซ้าย':(v==='right'||v==='ขวา')?'ขวา':(v==='center'||v==='กลาง')?'กลาง':v||'-'; };
            Object.keys(globalState.optConfig).forEach(key => {
                const configs = globalState.optConfig[key];
                if (Array.isArray(configs)) {
                    configs.forEach(cfg => {
                        let p = cfg.pos;
                        if (p==='left') p='ซ้าย';
                        else if (p==='right') p='ขวา';
                        else if (p==='main') p='หลัก';
                        options_list.push({
                            "ชื่อ":           key,
                            "ตำแหน่ง_Zone":   p||'-',
                            "จัดวาง_แนวตั้ง": mapVert(cfg.from),
                            "จัดวาง_แนวนอน":  mapHorz(cfg.place),
                            "ระยะX":          cfg.offsetX||0,
                            "ระยะY":          cfg.offsetY||0,
                            "หมุน":           cfg.rotate?'Yes':'No',
                            "Variant":        cfg.variant||'-'
                        });
                    });
                }
            });
        }

        const mainCanvas    = getEl('dpb-canvas');
        const legCheckbox   = getEl('dpb-show-legs');
        const legSwitchWrap = document.querySelector('.dpb-switch-legs');

        let needRestore = false;
        let overlayImg  = null;

        const isGapChanged        = checkLegGapModified();
        const hasLegCollision     = checkLegCollisionWarning();
        const isHidden            = legCheckbox && !legCheckbox.checked;
        const shouldForceShowLegs = isHidden && (isGapChanged || hasLegCollision);

        if (mainCanvas && legCheckbox && shouldForceShowLegs) {
            needRestore = true;
            try {
                const currentImgData = mainCanvas.toDataURL();
                overlayImg = document.createElement('img');
                overlayImg.src = currentImgData;
                const canvasRect = mainCanvas.getBoundingClientRect();
                const parent     = mainCanvas.parentNode;
                const parentRect = parent.getBoundingClientRect();
                const relTop     = canvasRect.top  - parentRect.top;
                const relLeft    = canvasRect.left - parentRect.left;
                overlayImg.style.position      = 'absolute';
                overlayImg.style.top           = relTop + 'px';
                overlayImg.style.left          = relLeft + 'px';
                overlayImg.style.width         = canvasRect.width + 'px';
                overlayImg.style.height        = canvasRect.height + 'px';
                overlayImg.style.zIndex        = '9999';
                overlayImg.style.pointerEvents = 'none';
                const parentStyle = window.getComputedStyle(parent);
                if (parentStyle.position === 'static') parent.style.position = 'relative';
                parent.appendChild(overlayImg);
            } catch(e) { console.warn("Overlay Fail", e); }

            if (legSwitchWrap) legSwitchWrap.classList.add('frozen');
            legCheckbox.checked = true;
            const legChangeEvent = new Event('change', { bubbles: true });
            legCheckbox.dispatchEvent(legChangeEvent);

            await new Promise(r => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(r, 150);
                    });
                });
            });
        }

        let imageSnapshot = '';
        if (mainCanvas) {
            try {
                const targetWidth  = 600;
                const scale        = targetWidth / mainCanvas.width;
                const targetHeight = mainCanvas.height * scale;
                const tmpCanvas    = document.createElement('canvas');
                tmpCanvas.width    = targetWidth;
                tmpCanvas.height   = targetHeight;
                const ctx          = tmpCanvas.getContext('2d');
                ctx.drawImage(mainCanvas, 0, 0, targetWidth, targetHeight);
                imageSnapshot = tmpCanvas.toDataURL('image/jpeg', 0.7);
            } catch (imgErr) {
                imageSnapshot = 'Error capturing image';
            }
        }

        if (needRestore) {
            if (legCheckbox) {
                legCheckbox.checked = false;
                const event = new Event('change', { bubbles: true });
                legCheckbox.dispatchEvent(event);
            }
            await new Promise(r => setTimeout(r, 100));
            if (legSwitchWrap) legSwitchWrap.classList.remove('frozen');
            if (overlayImg) overlayImg.remove();
        }

        let warningCode    = null;
        let warningMessage = '';

        if (hasLegCollision) {
            warningCode    = 'collision';
            warningMessage = 'ตำแหน่งของรู Option ตรงกับขาโต๊ะ';
        } else if (isGapChanged) {
            warningCode    = 'gap_changed';
            warningMessage = 'มีการปรับเปลี่ยนตำแหน่งของขา';
        }
        if (shouldForceShowLegs) {
            warningMessage += ' (System Forced Legs Show)';
        }

        // [FIX B] ดึง User Info จาก PHP
        let log_user_status = 'Guest';
        let log_username    = 'guest';

        if (typeof window.DSLOG_User_Info !== 'undefined' && window.DSLOG_User_Info.is_logged) {
            log_user_status = window.DSLOG_User_Info.user_status;
            log_username    = window.DSLOG_User_Info.user_login;
        } else if (typeof window.ds_auth_vars !== 'undefined' && window.ds_auth_vars.is_logged) {
            log_user_status = 'Logged In';
            const u = window.ds_auth_vars.current_user;
            if (u) log_username = u.user_login || u.display_name || 'unknown_user';
        } else if (document.body.classList.contains('logged-in')) {
            log_user_status = 'Logged In';
            log_username    = 'wp-user';
        }

        const _privacyCb       = document.getElementById('dpbPrivacyCheckbox');
        const _privacyAccepted = _privacyCb ? _privacyCb.checked : false;
        const _isAdminModeOn = !!(window.dsAdminModeState && window.dsAdminModeState.active);
        const payload = {
            "User_Status":          log_user_status,
            "Account_Name":         log_username,
            "ข้อมูลลูกค้า":          customer,
            "สเปคโต๊ะ":              desk_spec,
            "ระยะห่างขาโต๊ะ":        leg_spacing,
            "รายละเอียดมุมโต๊ะ":     corners,
            "รายการ_Options":        options_list,
            "จำนวน_Options":         options_list.length,
            "Warning_Code":          warningCode,
            "Note_System":           warningMessage,
            "Admin_Mode":            _isAdminModeOn,
            "รูปภาพ_Snapshot":       imageSnapshot,
            "traffic_source":        window.DSLOG_Traffic_Info.source,
            "device_type":           window.DSLOG_Traffic_Info.device,
            "Privacy_Consent":       _privacyAccepted ? "Accepted" : "Not Accepted",
            "Privacy_Consent_Time":  _privacyAccepted ? new Date().toISOString() : null,
            "utm_source":            sessionStorage.getItem('ds_utm_source') || '',
            "utm_medium":            sessionStorage.getItem('ds_utm_medium') || '',
            "utm_campaign":          sessionStorage.getItem('ds_utm_campaign') || '',
            "utm_content":           sessionStorage.getItem('ds_utm_content') || '',
            "referrer":              document.referrer || '',
            "time_spent":            window.DSLOG_SectionTimes || {},
            "heatmap_clicks":        window.DSLOG_Heatmap || {},
            "dropoff_step":          window.DSLOG_CurrentSection || 'general'
        };

        // [FIX MAIN] ใช้ FormData — ส่ง action ใน body เพื่อให้ WordPress route ถูกต้อง
        const finalPayload = Object.assign({}, payload);
        window.DSLOG_pendingPayload = finalPayload;

        const fd = new FormData();
        fd.append('action', 'DSLOG_Deskspace_save_log');
        fd.append('nonce',  window.DSLOG_V7_Config.nonce);
        fd.append('data',   JSON.stringify(finalPayload));

        const saveRes  = await fetch(window.DSLOG_V7_Config.url, {
            method: 'POST',
            body:   fd
        });
        const saveJson = await saveRes.json();

        if (saveJson.success) {
            window.DSLOG_pendingPayload = null;
            if (saveJson.data && saveJson.data.id) {
                document.cookie = "ds_last_log_id=" + saveJson.data.id + "; path=/; max-age=604800";
            }
        } else {
        }

    } catch (err) {
        // ← try...catch ปิดถูกต้อง ครอบทั้งฟังก์ชัน
        console.error("DSLOG Error:", err);
    }
}
// ← ปิดฟังก์ชัน DSLOG_Deskspace_collectAndSave


// ─────────────────────────────────────────────────────────────────────────────
// Click Listener
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, a, .dpb-btn-ghost, #dpb-download');
    if (!btn) return;
	
	  // [FIX] เพิ่ม blacklist — ปุ่มที่มี log ของตัวเองอยู่แล้ว ไม่ต้อง trigger DSLOG ซ้ำ
    const blacklist = ['dpbSubmitBtn'];
    if (blacklist.includes(btn.id)) return;

    const btnText = btn.innerText ? btn.innerText.toLowerCase() : '';
    const isTarget =
        btn.id === 'dpb-download'        ||
        btn.id === 'dpb-footer-download' ||
        btn.id === 'dpb-popup-save-btn'  ||
        btnText.includes('บันทึก')        ||
        btnText.includes('download');

    if (isTarget) {
        if (window.DSLOG_saveTimer) {
            clearTimeout(window.DSLOG_saveTimer);
        }
        window.DSLOG_saveTimer = setTimeout(DSLOG_Deskspace_collectAndSave, 1000);
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// Pagehide — ส่ง beacon ถ้ายังมี pending payload
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('pagehide', function() {
    if (window.DSLOG_pendingPayload) {
        const params = new URLSearchParams();
        params.append('action', 'DSLOG_Deskspace_save_log');
        params.append('nonce',  window.DSLOG_V7_Config.nonce);
        params.append('data',   JSON.stringify(window.DSLOG_pendingPayload));

        navigator.sendBeacon(
            window.DSLOG_V7_Config.url,
            new Blob([params.toString()], {
                type: 'application/x-www-form-urlencoded'
            })
        );
        window.DSLOG_pendingPayload = null;
    }
});