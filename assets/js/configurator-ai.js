(function() {
    // --- Configuration ---
    const CONFIG = {
        canShow: dsConfiguratorVars.canShow3D,
        webhookUrl: 'https://horrifically-interlinear-nola.ngrok-free.dev/webhook-test/generate-desk', 
        user: (typeof ds_auth_vars !== "undefined" && ds_auth_vars.current_user && ds_auth_vars.current_user.user_login) ? ds_auth_vars.current_user.user_login : "guest",
        chairImage: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Nebula_Back_ISO3.png'
    };

    // --- State Management ---
    let state = {
        style: 'minimal',
        element: [],
        isLoading: false,
        timer: null,
        credits: '-',
        history: [] 
    };

    // --- SVG Icons ---
    const ICONS = {
        magic: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`,
        minimal: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
        nature: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`,
        exec: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
        gamer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M6 12h4m-2-2v4m9-2h.01"></path></svg>`,
        check: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`
    };

    // --- Initialization ---
    function init() {
        if (!CONFIG.canShow) return;
        if (document.getElementById('ai-dpb-ai-btn')) return;

        const btn = document.createElement('div');
        btn.id = 'ai-dpb-ai-btn';
        btn.innerHTML = ICONS.magic;
        btn.onclick = openModal;
        document.body.appendChild(btn);

        createModalHTML();
    }

    function createModalHTML() {
        // [MODIFIED] Added ai- prefix to all classes and IDs
        const html = `
        <div id="ai-dpb-modal-v2">
            <div class="ai-dpb-main-card" onclick="event.stopPropagation()">
                <div class="ai-dpb-modal-close" onclick="closeModal()">✕</div>

                <div class="ai-dpb-panel-left">
                    <div class="ai-dpb-header-title">
                        ${ICONS.magic} DeskSpace AI
                    </div>

                    <div class="ai-dpb-section-label">1. เลือกสไตล์ห้อง (Background)</div>
                    <div class="ai-dpb-style-grid">
                        <div class="ai-dpb-style-card ai-active" onclick="selectStyle('minimal', this)">
                            <div class="ai-dpb-style-img">${ICONS.minimal}</div>
                            <div class="ai-dpb-style-name">Minimal</div>
                        </div>
                        <div class="ai-dpb-style-card" onclick="selectStyle('nature', this)">
                            <div class="ai-dpb-style-img">${ICONS.nature}</div>
                            <div class="ai-dpb-style-name">Nature</div>
                        </div>
                        <div class="ai-dpb-style-card" onclick="selectStyle('executive', this)">
                            <div class="ai-dpb-style-img">${ICONS.exec}</div>
                            <div class="ai-dpb-style-name">Executive</div>
                        </div>
                        <div class="ai-dpb-style-card" onclick="selectStyle('gamer', this)">
                            <div class="ai-dpb-style-img">${ICONS.gamer}</div>
                            <div class="ai-dpb-style-name">Gamer</div>
                        </div>
                    </div>

                    <div class="ai-dpb-section-label">2. เพิ่มอุปกรณ์</div>
                    <div class="ai-dpb-element-list">
                        <div class="ai-dpb-element-item" onclick="selectElement('nebula', this)">
                            <span>Chair</span>
                        </div>
                        <div class="ai-dpb-element-item" onclick="selectElement('pc', this)">
                            <span>Computer Set</span>
                        </div>
                        <div class="ai-dpb-element-item" onclick="selectElement('laptop', this)">
                            <span>Laptop Set</span>
                        </div>
                    </div>

                    <div class="ai-dpb-history-section" id="ai-history-section" style="display:none;">
                        <div class="ai-dpb-section-label">History</div>
                        <div class="ai-dpb-history-grid" id="ai-history-grid">
                            </div>
                    </div>
                    
                    <div class="ai-dpb-action-area">
                        <button id="ai-btn-generate" class="ai-dpb-btn-gen" onclick="startGeneration()">
                            ${ICONS.magic} Generate Image
                        </button>
                    </div>
                    
                </div>

                <div class="ai-dpb-panel-right">
                    <div class="ai-dpb-credit-badge">Credits: <span id="ai-txt-credit" class="ai-dpb-credit-val">-</span></div>
                    
                    <div class="ai-dpb-display-box" id="ai-dpb-display-box">
                        <img id="ai-dpb-preview-img" class="ai-dpb-display-img" src="" alt="Preview">
                        <div class="ai-dpb-loading-overlay" id="ai-loading-overlay">
                            <div class="ai-dpb-scan-line"></div>
                            <div class="ai-dpb-progress-container">
                                <div class="ai-dpb-status-text" id="ai-status-text">Preparing...</div>
                                <div class="ai-dpb-progress-bg"><div class="ai-dpb-progress-fill" id="ai-progress-fill" ></div></div>
                            </div>
                        </div>
                    </div>

                    <div id="ai-dpb-error-msg" class="ai-dpb-error-container"></div>

                    <div class="ai-dpb-result-controls">
                        <button class="ai-dpb-btn-secondary" onclick="resetUI()">
                            ${ICONS.refresh} ลองใหม่
                        </button>
                        <a id="ai-link-download" href="#" target="_blank" class="ai-dpb-btn-gen-download" style="padding: 10px 25px;">
                            ${ICONS.download} ดาวน์โหลด
                        </a>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        
        document.getElementById('ai-dpb-modal-v2').addEventListener('click', (e) => {
            if (e.target.id === 'ai-dpb-modal-v2') closeModal();
        });
    }

    window.selectStyle = function(styleName, el) {
        if(state.isLoading) return; 
        state.style = styleName;
        document.querySelectorAll('.ai-dpb-style-card').forEach(c => c.classList.remove('ai-active'));
        el.classList.add('ai-active');
    };

    window.selectElement = function(elemName, el) {
        if(state.isLoading) return; 

        // [LOGIC FIX] ตรวจสอบว่ามี element ที่ขัดแย้งกันหรือไม่ (PC <-> Laptop)
        const conflictMap = {
            'pc': 'laptop',
            'laptop': 'pc'
        };

        const index = state.element.indexOf(elemName);

        // กรณี: ต้องการ "ยกเลิก" ตัวที่เลือกอยู่แล้ว
        if (index > -1) {
            state.element.splice(index, 1);
            el.classList.remove('ai-active');
        } 
        // กรณี: ต้องการ "เลือก" ตัวใหม่
        else {
            const conflictName = conflictMap[elemName];

            // ถ้าตัวที่เลือกมีคู่ขัดแย้ง (เช่น เลือก pc แล้วคู่ขัดแย้งคือ laptop)
            if (conflictName) {
                const conflictIndex = state.element.indexOf(conflictName);
                
                // ถ้าคู่ขัดแย้งถูกเลือกอยู่ ให้เอาออกทั้งจาก State และ UI
                if (conflictIndex > -1) {
                    // 1. เอาออกจาก State
                    state.element.splice(conflictIndex, 1);

                    // 2. เอา class ai-active ออกจากปุ่มของคู่ขัดแย้ง
                    // ค้นหาปุ่มที่มี onclick ตรงกับชื่อคู่ขัดแย้ง
                    const allButtons = document.querySelectorAll('.ai-dpb-element-item');
                    allButtons.forEach(btn => {
                        const onclickVal = btn.getAttribute('onclick');
                        if (onclickVal && onclickVal.includes(`'${conflictName}'`)) {
                            btn.classList.remove('ai-active');
                        }
                    });
                }
            }

            // เพิ่มตัวใหม่เข้าไป
            state.element.push(elemName);
            el.classList.add('ai-active');
        }
    };

    // [MODIFIED] Helper to reset using ai- prefix
    window.openModal = function() {
        if(!document.getElementById('ai-dpb-modal-v2')) createModalHTML();
        
        renderHistory();
        resetToCanvasOriginal();
        
        const errDiv = document.getElementById('ai-dpb-error-msg');
        if(errDiv) {
            errDiv.innerText = '';
            errDiv.classList.remove('ai-visible');
        }

        if(!state.isLoading) {
             const btn = document.getElementById('ai-btn-generate');
             btn.disabled = false;
             btn.innerHTML = `${ICONS.magic} Generate Image`;
        }
        
        updateCredit();
        const modal = document.getElementById('ai-dpb-modal-v2');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('ai-dpb-show'), 10);
    };

    window.closeModal = function() {
        const modal = document.getElementById('ai-dpb-modal-v2');
        if(modal) {
            modal.classList.remove('ai-dpb-show');
            setTimeout(() => { modal.style.display = 'none'; }, 300);
        }
    };

    function getResizedDataURL(canvas, targetWidth, targetHeight) {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        
        return tempCanvas.toDataURL('image/png');
    }

    function resetToCanvasOriginal() {
        try {
            // [NOTE] dpb-canvas is EXTERNAL ID, DO NOT CHANGE
            const canvas = document.getElementById('dpb-canvas');
            if (canvas) {
                const dataUrl = getResizedDataURL(canvas, 1920, 1477);
                
                const img = document.getElementById('ai-dpb-preview-img');
                img.src = dataUrl;
                img.classList.remove('ai-dpb-blur-loading');
            }
        } catch(e) { console.warn("Canvas capture error", e); }
    }

    window.resetUI = function() {
        state.isLoading = false;
        clearInterval(state.timer);
        document.getElementById('ai-loading-overlay').classList.remove('ai-active');
        document.getElementById('ai-dpb-display-box').classList.remove('ai-finished');
        
        const errDiv = document.getElementById('ai-dpb-error-msg');
        errDiv.innerText = '';
        errDiv.classList.remove('ai-visible');

        const btnGen = document.getElementById('ai-btn-generate');
        btnGen.disabled = false;
        btnGen.innerHTML = `${ICONS.magic} Generate Image`;
        
        resetToCanvasOriginal();
    };

    // [NEW] History Functions (Updated IDs)
    function addToHistory(url) {
        state.history.unshift(url); 
        if(state.history.length > 6) state.history.pop(); 
        renderHistory();
    }

    function renderHistory() {
        const grid = document.getElementById('ai-history-grid');
        const section = document.getElementById('ai-history-section');
        
        if(!grid || !section) return;

        if(state.history.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = state.history.map(url => `
            <div class="ai-dpb-history-card" onclick="viewHistoryImage('${url}')">
                <img src="${url}" loading="lazy">
            </div>
        `).join('');
    }

    window.viewHistoryImage = function(url) {
        if(state.isLoading) return;
        const img = document.getElementById('ai-dpb-preview-img');
        img.src = url;
        img.classList.remove('ai-dpb-blur-loading');
        
        document.getElementById('ai-dpb-display-box').classList.add('ai-finished');
        const dl = document.getElementById('ai-link-download');
        dl.href = url;
        dl.download = `DeskSpace-History-${Date.now()}.png`;
    };

   // --- Core Logic ---
    window.startGeneration = async function() {
        // [NOTE] External ID, DO NOT CHANGE
        const canvas = document.getElementById('dpb-canvas');
        if(!canvas) { alert('ไม่พบ Canvas 3D'); return; }

        const errDiv = document.getElementById('ai-dpb-error-msg');
        errDiv.innerText = '';
        errDiv.classList.remove('ai-visible');

        state.isLoading = true;
        document.getElementById('ai-btn-generate').disabled = true;
        
        const overlay = document.getElementById('ai-loading-overlay');
        overlay.classList.add('ai-active'); 
        
        const mainImg = document.getElementById('ai-dpb-preview-img');
        mainImg.classList.add('ai-dpb-blur-loading');

        document.getElementById('ai-btn-generate').innerText = "กำลังประมวลผล...";

        // 1. Get Attributes (External IDs)
        const getTxt = (id) => { 
            const el = document.getElementById(id); 
            return (el && el.selectedOptions && el.selectedOptions[0]) ? el.selectedOptions[0].text.trim() : 'Wood'; 
        };
        const material = getTxt('dpb-top-color'); // External ID
        const legs = getTxt('dpb-legs'); // External ID
       
        // 2. Construct Prompts
        let styleDescription = "";
        let elemPrompt = "";
     
        switch(state.style) {
            case 'nature':
                styleDescription = `a modern home office with nature integration, view of a beautiful lush green garden through a window on the left, indoor potted plants, soft natural daylight, serene atmosphere`;
                break;
            case 'executive':
                styleDescription = `a luxury executive office corner, built-in wooden bookshelves filled with books and premium decor, sophisticated atmosphere, warm lighting`;
                break;
            case 'gamer':
                styleDescription = `A cinematic photograph of a cozy gamer room setup. Dim and moody environment. Diffused RGB LED strips hidden behind the desk, casting soft indirect glow. Warm neon ambient lighting. High contrast, deep shadows, immersive vibe`;
                break;
            case 'minimal':
            default:
                styleDescription = `a minimalist room corner, flooring made of ${material} vinyl planks arranged in a staggered pattern, white walls. Lighting: Soft natural light coming from the left, filtered through sheer curtains (not visible), casting gentle soft shadows on the floor`;
                break;
        }

        const selectedElem = state.element || []; 

        // [LOGIC FIX APPLIED] Separation of checks + concatenation
        if (selectedElem.includes('nebula')) {
            elemPrompt += ", add a Nebula Chair(Nebula_Back_ISO2.png) in front the desk";
        }
        
        if (selectedElem.includes('pc')) {
            elemPrompt += ", add a Desktop PC setup on the table, widescreen monitor black screen, bluetooth mechanical keyboard wireless, bluetooth gaming mouse wireless with mouse pad, and a computer tower case under the desk without wire.";
        } 
        
        if (selectedElem.includes('laptop')) {
             elemPrompt += ", add a Productivity setup on the table, open laptop computer black screen, iPad tablet, Iphone 17 pro max, bluetooth mechanical keyboard wireless, bluetooth gaming mouse wireless with mouse pad";
        }

        const basePrompt = `Based on (input_desk_render.png). Change the background to ${styleDescription}${elemPrompt}. High quality, photorealistic, deep depth of field, sharp focus everywhere, everything in focus, crystal clear background, Shot on Phase One XF IQ4 150MP.`.replace(/\n/g, " ");
        const negPrompt = `(change perspective), (change angle), (zoom out), (alter desk shape), window frame, floating objects, galaxy pattern, space theme, low resolution, bad reflection, distorted textures, noise, grain, watermark, text, signature, bad geometry, extra legs, cartoon, painting`.replace(/\n/g, " ");

        // 3. Simulation
        let p = 0;
        const pBar = document.getElementById('ai-progress-fill');
        const pTxt = document.getElementById('ai-status-text');
        
        pBar.style.width = '0%';
        pTxt.style.color = 'var(--ai-dpb-gold)';

        state.timer = setInterval(() => {
            if(p < 90) {
                p += Math.random() * 2;
                pBar.style.width = p + '%';
                if(p < 30) pTxt.innerText = "Analyzing 3D Model...";
                else if(p < 60) pTxt.innerText = "Generating " + state.style + " Environment...";
                else pTxt.innerText = "Finalizing Details...";
            }
        }, 300);

        try {
            // 4. API Call
            const response = await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: getResizedDataURL(canvas, 1920, 1477),
                    prompt_details: basePrompt,
                    negative_prompt: negPrompt,
                    style_selected: state.style,
                    element_selected: selectedElem,
                    ref_image_url: selectedElem.includes('nebula') ? CONFIG.chairImage : '',
                    user: CONFIG.user
                })
            });

            clearInterval(state.timer);

            if(!response.ok) throw new Error("Connection Failed");

            const blob = await response.blob(); 
            const finalUrl = URL.createObjectURL(blob); 

            // 5. Success Handling
            pBar.style.width = '100%';
            pTxt.innerText = "Completed!";
            
            const img = new Image();
            img.onload = () => {
                const displayImg = document.getElementById('ai-dpb-preview-img');
                displayImg.src = finalUrl;
                displayImg.classList.remove('ai-dpb-blur-loading'); 

                document.getElementById('ai-loading-overlay').classList.remove('ai-active');
                document.getElementById('ai-dpb-display-box').classList.add('ai-finished');
                
                const dl = document.getElementById('ai-link-download');
                dl.href = finalUrl;
                dl.download = `DeskSpace-${state.style}-${Date.now()}.png`;

                updateCredit(); 
                addToHistory(finalUrl);

                state.isLoading = false; 
                document.getElementById('ai-btn-generate').disabled = false;
                document.getElementById('ai-btn-generate').innerHTML = `${ICONS.magic} Generate Image`;
            };
            img.onerror = () => { throw new Error("Image Load Failed"); };
            img.src = finalUrl;

        } catch(e) {
            console.error(e);
            clearInterval(state.timer);
            
            document.getElementById('ai-loading-overlay').classList.remove('ai-active');
            resetToCanvasOriginal();

            const errArea = document.getElementById('ai-dpb-error-msg');
            errArea.innerText = "Error: " + e.message + " (Please try again)";
            errArea.classList.add('ai-visible');

            state.isLoading = false;
            document.getElementById('ai-btn-generate').disabled = false;
            document.getElementById('ai-btn-generate').innerHTML = `${ICONS.refresh} Try Again`;
        }
    };

    async function updateCredit() {
        try {
            const res = await fetch('https://api.kie.ai/api/v1/chat/credit');
            if(res.ok) {
                const data = await res.json();
                updateCreditDisplay(data.data || data.credit);
            }
        } catch(e){}
    }

    function updateCreditDisplay(val) {
        if(val) {
             const remaining = Math.floor(parseInt(val) / 4);
             document.getElementById('ai-txt-credit').innerText = remaining;
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();