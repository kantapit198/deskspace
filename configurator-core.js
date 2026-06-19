const API = dsConfiguratorVars.apiUrl;
    const AJAX_URL = dsConfiguratorVars.ajaxUrl;
    const META_CACHE_KEY = 'dpb_meta_cache_v1';
    const byId = id => document.getElementById(id);
    const FIXED_DRAW_LEN = 1050;
    const GAP = 0;
    const DESK_TOP_SPACE = 55;
    const DESK_BOTTOM_SPACE = 68; 
    const PAD = { left:0, right:0, top:32, bottom:-45 };
    const UI_INK = '#111827';
    const BRAND_LOGO_URL = dsConfiguratorVars.brandLogoUrl;
    const WM_TOP_COLOR_MAP = {
      'beech':'black',
      'maple':'black',
      'vintage oak':'white',
      'cherry':'white',
      'cherry capucino':'white',
      'bark walnut':'white',
      'oak':'black',
      'natural oak':'black',
      'modioak':'white',
      'white solid':'black',
      'grey':'black',
      'graphite':'white',
      'black solid':'white',
	  'whiteboard':'black',
      'radiata pine':'black',
      'rubber':'black'
    };
    const MIN_LEN_CM        = 100;
    const MIN_W_CM          = 45;
    const MIN_AW_CM         = 90;
    const RAW_MAX_DESK_H    = 4096;
    const RAW_MAX_OPT_H     = 6000;
    const GLOBAL_MAX_CANVAS = 12000;
    const TRASH_SVG = `<svg width="18" height="18" viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M402.06,53.33H339.77l-3.71-8.12C332.32,37,324.54,20,305.08,20H206.61c-19.35,0-27,16.86-30.68,25l-3.8,8.37H109.94a62.11,62.11,0,0,0-62,62,12,12,0,0,0,12,12H452.09a12,12,0,0,0,12-12A62.11,62.11,0,0,0,402.06,53.33Z" fill="#111827" fill-rule="evenodd"/>
  <defs>
    <mask id="bin-holes" maskUnits="userSpaceOnUse">
      <rect x="96.75" y="143.36" width="318.49" height="348" rx="24" ry="24" fill="#fff"/>
      <rect class="hole" x="175" y="235" width="36" height="210" rx="18" ry="18" fill="#000"/>
      <rect class="hole" x="309" y="235" width="36" height="210" rx="18" ry="18" fill="#000"/>
    </mask>
  </defs>
  <rect x="96.75" y="143.36" width="318.49" height="348" rx="24" ry="24" fill="#111827" mask="url(#bin-holes)"/>
</svg>
`;
    const BOTTOM_GAP_AFTER_INFO = 0;
    const INFO = {boxPadX:20, boxPadY:18, colGap:50, rowGap:6,
      radius:16,
      shadow:{ blur:24, color:'rgba(0,0,0,.08)'},
      bg:'#ffffff',
      ink:'#000000',
      topic:'#a37d13',
      headFont:'400 20px Prompt, sans-serif',
      rowFont:'300 18px Prompt, sans-serif',
      headLH:24, rowLH:22
    };
    const CARD = { cardW:160, imgH:100, gap:8, radius:14, shadow:'rgba(0,0,0,0.08)' };
    const OPTCARD = {
      textH:44,
      nameFont:'400 13px Prompt, sans-serif',
      variantFont:'400 12px Prompt, sans-serif',
      nameYGap:12,
      variantYGap:30,
      badgePad:8,
      badgeR:11
    };
    const state = {
      meta:{colors:[],legs:[],options:[],models:[]},
      selectedOptions:{},
      optConfig:{},
      colorImgCache:{},
      optImgCache:{},
      prevR:{rect:{tl:50,tr:50,bl:50,br:50}, l:{tl:50,tr:50,step:90,arm:150,br:50,in:150}},
      uiExpanded:{},
      desktopCartOpen:false
    };
    const DPB_SOLID_KEYS = ['Radiata', 'Rubber'];
	
	// --- [ส่วนที่ 2] รับค่า PHP และสร้างปุ่ม Toggle ---
    // รับค่าจาก PHP
    var canShow3DButton = (typeof dsConfiguratorVars !== 'undefined' && dsConfiguratorVars.canShow3D);
    
    // กำหนดค่าเริ่มต้นของโหมดมุมมอง
    if (typeof window.dpbViewMode === 'undefined') {
        window.dpbViewMode = 'top'; 
    }

    // สร้างปุ่มเมื่อโหลดหน้าเว็บ
    if (canShow3DButton && !document.getElementById('dpb-3d-toggle-btn')) {
        const btn = document.createElement('div');
        btn.id = 'dpb-3d-toggle-btn';
        // ไอคอน 3D Cube
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
        
        // สไตล์ปุ่ม (มุมล่างซ้าย)
        Object.assign(btn.style, {
            position: 'fixed', bottom: '90px', left: '20px', 
            width: '50px', height: '50px',
            background: 'white', borderRadius: '50%', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            cursor: 'pointer', zIndex: '9999999', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            transition: 'all 0.2s', color: '#333'
        });
        
        // ฟังก์ชันเมื่อกดปุ่ม
        btn.onclick = function() {
            window.dpbViewMode = (window.dpbViewMode === 'top') ? '3d' : 'top';
            // เปลี่ยนสีปุ่มเมื่อ Active
            this.style.color = (window.dpbViewMode === '3d') ? '#007bff' : '#333';
            this.style.background = (window.dpbViewMode === '3d') ? '#e6f0ff' : 'white';
            // สั่งวาดใหม่
            if(typeof draw === 'function') draw();
        };
        document.body.appendChild(btn);
    }
    // ----------------------------------------------
	
const LEG_ASSETS = {
      white: {
        left:  "https://www.deskspace.in.th/wp-content/uploads/2025/10/LegLeft-White3.5.png",
        center:"https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-Center-White.png",
        right: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-right-White3.5.png",
      },
      black: {
        left:  "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-left-Black3.5.png",
        center:"https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-Center-Black.png",
        right: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-right-Black3.5.png",
      }
    };

const SINGLE_MOTOR_ASSETS = {
  white: {
    right:  "https://www.deskspace.in.th/wp-content/uploads/2026/03/Leg-SingleMotor-Right-White.png",
    left:   "https://www.deskspace.in.th/wp-content/uploads/2026/03/Leg-SingleMotor-left-White.png",
    center: "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-SingleMotor-center-White.webp"
  },
  black: {
    right:  "https://www.deskspace.in.th/wp-content/uploads/2026/03/Leg-SingleMotor-Right-Black.png",
    left:   "https://www.deskspace.in.th/wp-content/uploads/2026/03/Leg-SingleMotor-left-Black.png",
    center: "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-SingleMotor-center-Black.webp"
  }
};

const WORKSPACE_ASSETS = {
  white: {
    right:  "",
    left:   "",
    center: ""
  },
  black: {
    right:  "",
    left:   "",
    center: ""
  },
  grey: {
    right:  "",
    left:   "",
    center: ""
  },
};
	
const MANUAL_DESK_ASSETS = {
  white: {
    right:     "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-CDManual-right-White.png",
    left:      "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-CDManual-left-White.png",
    center:    "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-CDManual-Center-White.png",
    connector: "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-Manual-Connect-White.png",
    crank:     "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-Manual-HandCrank.png" 
  },
  black: {
    right:     "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-CDManual-right-Black.png",
    left:      "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-CDManual-left-Black.png",
    center:    "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-CDManual-Center-Black.png",
    connector: "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-Manual-Connect-Black.png",
    crank:     "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-Manual-HandCrank.png" 
  }
};

const SINGLE_LEG_ASSETS = {
  white: {
    leg:   "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-1Leg-White.png",
    cable: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-1Leg-cable.png"
  },
  black: {
    leg:   "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-1Leg-Black.png",
    cable: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-1Leg-cable.png"
  }
};

const LEG_ASSETS_L2 = {
  white: {
    left:   "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-left-White4.3.png",
    right:  "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-right-White4.3.png",
    leftL:  "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-L-left-White4.3.png",
    rightL: "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-L-right-White4.3.png",
    center: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-Center-White.png",
  },
  black: {
    left:   "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-left-Black4.3.png",
    right:  "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-right-Black4.3.png",
    leftL:  "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-L-left-Black4.3.png",
    rightL: "https://www.deskspace.in.th/wp-content/uploads/2025/12/Leg-L-right-Black4.3.png",
    center: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Leg-Center-Black.png",
  }
};

const LEG_ASSETS_L3 = {
  white: {
    left: {
      centerLeft: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Center-Left-White.png",
      topCenter:  "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Top-Center-White.png",
      bottomLeft: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Bottom-Left-White.png",
      topLeft:    "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Top-Left-White.png",
      right:      "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Right-White.png",
    },
    right: {
      centerRight:"https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Center-Right-White.png",
      topCenter:  "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Top-Center-White.png",
      bottomRight:"https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Bottom-Right-White.png",
      topRight:   "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Top-Right-White.png",
      left:       "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Left-White.png",
    }
  },
  black: {
    left: {
      centerLeft: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Center-Left-Black.png",
      topCenter:  "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Top-Center-Black.png",
      bottomLeft: "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Bottom-Left-Black.png",
      topLeft:    "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Top-Left-Black.png",
      right:      "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Right-Black.png",
    },
    right: {
      centerRight:"https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Center-Right-Black.png",
      topCenter:  "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Top-Center-Black.png",
      bottomRight:"https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Bottom-Right-Black.png",
      topRight:   "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Top-Right-Black.png",
      left:       "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Left-Black.png",
    }
  }
};
	
// ============================================================================
// LEG ASSETS (ลิ้งค์รูปภาพขาโต๊ะ)3D
// ============================================================================

const LEG_3D_ASSETS = {
    // 1. Model: Custom (Dual Motor)
    'custom': {
        'square_white': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Left-White.webp',
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Right-White.webp'
                  },
        'square_black': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Left-Black.webp',
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Right-Black.webp'
        },
        'round_white': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Right.webp'
        },
        'round_black': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Right.webp'
        }
    },
    // 2. Model: Custom Manual
    'custom_manual': {
        'square_white': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Right.webp' 
        },
        'square_black': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Right.webp' 
        }
    },
    // 3. Model: Custom Single Motor
    'custom_single': {
        'square_white': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Right.webp' 
        },
        'square_black': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Right.webp' 
        }
    },
	
    // 4. Model: Single Leg (ขาเดียว)
    'single': {
        'white': { leg: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Left.webp' }, // ใช้ภาพแทนไปก่อน
        'black': { leg: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-Square-White_Right.webp' }
    },
	
   'l2': {
        'square_white': { 
            // กรณีหันทิศ L ไปทางขวา (Side Right)
            'right': {
                left:  'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Left-White.webp',  // ขาซ้ายปกติ
                right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-L-Leg-Square-Right-White.webp'   // ขาขวา (ทรง L)
            },
            // กรณีหันทิศ L ไปทางซ้าย (Side Left)
            'left': {
                left:  'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-L-Leg-Square-Left-White.webp',    // ขาซ้าย (ทรง L)
                right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Right-White.webp'  // ขาขวาปกติ
            }
        },
        'square_black': { 
            'right': {
                left:  'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Left-Black.webp',  // ขาซ้ายปกติ
                right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-L-Leg-Square-Right-Black.webp' 
            },
            'left': {
                left:  'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-L-Leg-Square-Left-Black.webp',    // ขาซ้าย (ทรง L)
                right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/CTD-Leg-Square-Right-Black.webp' 
            }
        }
    },

    'l3': {
        'square_white': { 
            // กรณีหันทิศ L ไปทางขวา (Side Right)
            'right': {
                left:   'LINK_L3_WHITE_RIGHTSIDE_LEFT',       // ขาซ้าย
                center: 'LINK_L3_WHITE_RIGHTSIDE_CENTER_TOP', // ขาขวาบน (Center)
                right:  'LINK_L3_WHITE_RIGHTSIDE_RIGHT_LOW'   // ขาขวาล่าง
            },
            // กรณีหันทิศ L ไปทางซ้าย (Side Left)
            'left': {
                left:   'LINK_L3_WHITE_LEFTSIDE_LEFT_LOW',    // ขาซ้ายล่าง
                center: 'LINK_L3_WHITE_LEFTSIDE_CENTER_TOP',  // ขาซ้ายบน (Center)
                right:  'LINK_L3_WHITE_LEFTSIDE_RIGHT'        // ขาขวา
            }
        },
        'square_black': { 
             'right': {
                left:   'LINK_L3_BLACK_RIGHTSIDE_LEFT',
                center: 'LINK_L3_BLACK_RIGHTSIDE_CENTER_TOP',
                right:  'LINK_L3_BLACK_RIGHTSIDE_RIGHT_LOW'
            },
            'left': {
                left:   'LINK_L3_BLACK_LEFTSIDE_LEFT_LOW',
                center: 'LINK_L3_BLACK_LEFTSIDE_CENTER_TOP',
                right:  'LINK_L3_BLACK_LEFTSIDE_RIGHT'
            }
        }
    },
	// 5. Model: Dual WorkSpace
    'custom_workspace': {
        'circle_grey': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Right.webp' 
        },
        'dual_circle_grey': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Right.webp' 
        },
		'circle_black': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Right.webp' 
        },
        'dual_circle_black': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Right.webp' 
        },
		'circle_white': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Right.webp' 
        },
        'dual_circle_white': { 
            left: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Left.webp', 
            right: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Leg-circle-Grey_Right.webp' 
        },
    }
	
};


	
    let _isAddAnimating = false;
    function getVisibleCartTarget() {
      const footerBtn = document.getElementById('dpb-footer-cart-btn');
      if (footerBtn && footerBtn.offsetParent !== null) {
          const footer = footerBtn.closest('.dpb-sticky-footer');
          if (footer && getComputedStyle(footer).display !== 'none') {
              return footerBtn;
          }
      }
      const floatBtn = document.getElementById('dpb-cart-button');
      if (floatBtn && floatBtn.offsetParent !== null) {
          return floatBtn;
      }
      return null;
    }

    function flyImageToCartFrom(el){
      if(!el || _isAddAnimating) return Promise.resolve();
      const targetBtn = getVisibleCartTarget();
      if(!targetBtn) return Promise.resolve();
      const srcRect  = el.getBoundingClientRect();
      const cartRect = targetBtn.getBoundingClientRect();
      const ghost = el.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = srcRect.left + 'px';
      ghost.style.top = srcRect.top + 'px';
      ghost.style.width = srcRect.width + 'px';
      ghost.style.height = srcRect.height + 'px';
      ghost.style.borderRadius = '12px';
      ghost.style.zIndex = '10020';
      ghost.style.pointerEvents = 'none';
      ghost.style.transition = 'transform .55s ease, opacity .55s ease';
      ghost.style.willChange = 'transform, opacity';
      document.body.appendChild(ghost);
      const finalScale = 0.4;
      const toX = (cartRect.left + cartRect.width/2) - (srcRect.left + srcRect.width/2);
      const toY = (cartRect.top  + cartRect.height/2) - (srcRect.top  + srcRect.height/2);
      _isAddAnimating = true;
      return new Promise(resolve=>{
        ghost.getBoundingClientRect();
        requestAnimationFrame(()=>{
          ghost.style.transform = `translate(${toX}px, ${toY}px) scale(${finalScale})`;
          ghost.style.opacity = '0';
        });
        const done = ()=>{
          if(ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
          _isAddAnimating = false;
          resolve();
        };
        ghost.addEventListener('transitionend', done, { once:true });
        setTimeout(done, 900);
      });
    }
	 function flyBitmapToCart(imgSrc, rect){
      if(!imgSrc || !rect) return Promise.resolve();
      const targetBtn = getVisibleCartTarget();
      if(!targetBtn || _isAddAnimating) return Promise.resolve();
      const ghost = document.createElement('img');
      ghost.src = imgSrc;
      ghost.alt = '';
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.borderRadius = '12px';
      ghost.style.zIndex = '10020';
      ghost.style.pointerEvents = 'none';
      ghost.style.objectFit = 'cover';
      ghost.style.transition = 'transform .55s ease, opacity .55s ease';
      ghost.style.willChange = 'transform, opacity';
      document.body.appendChild(ghost);
      const cartRect = targetBtn.getBoundingClientRect();
      const finalScale = 0.4;
      const toX = (cartRect.left + cartRect.width/2) - (rect.left + rect.width/2);
      const toY = (cartRect.top  + cartRect.height/2) - (rect.top  + rect.height/2);
      _isAddAnimating = true;
      return new Promise(resolve=>{
        const kick = ()=>{
          ghost.getBoundingClientRect();
          requestAnimationFrame(()=>{
            ghost.style.transform = `translate(${toX}px, ${toY}px) scale(${finalScale})`;
            ghost.style.opacity = '0';
          });
        };
        if(ghost.complete){ kick(); } else { ghost.onload = kick; ghost.onerror = kick; }
        const done = ()=>{
          if(ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
          _isAddAnimating = false;
          resolve();
        };
        ghost.addEventListener('transitionend', done, { once:true });
        setTimeout(done, 950);
      });
    }

    window.flyImageToCartFrom = flyImageToCartFrom;
    window.flyBitmapToCart = flyBitmapToCart;

    function buildVariantModalUI(modal, op){
      const back    = modal.querySelector('.dpb-modal__backdrop');
      const closeB  = modal.querySelector('.dpb-modal__close');
      const thumb   = modal.querySelector('.dpb-modal__thumb img');
      const body    = modal.querySelector('.dpb-modal__body');
      let headerDiv = modal.querySelector('.dpb-modal__header');
      let titleGroup = headerDiv.querySelector('.dpb-modal__title-group');
      if (!titleGroup) {
        const oldTitle = headerDiv.querySelector('.dpb-modal__title');
        if(oldTitle) oldTitle.remove();
        titleGroup = document.createElement('div');
        titleGroup.className = 'dpb-modal__title-group';
        headerDiv.appendChild(titleGroup);
      }
      const nameEn = op.name || op.key || '-';
      const nameTh = op.nameth || ''; 
      titleGroup.innerHTML = `
        <div class="dpb-modal__title-main">${nameEn}</div>
        ${nameTh ? `<div class="dpb-modal__title-sub">${nameTh}</div>` : ''}
      `;
      const headImg = (String(op.imageUrl||'').split(',').map(s=>s.trim()).filter(Boolean)[0]) || '';
      if (thumb){ thumb.src = headImg; thumb.alt = nameEn; }
      body.innerHTML = '';
      if (op.description) {
        const descEl = document.createElement('div');
        descEl.className = 'dpb-modal__desc';
        descEl.innerHTML = op.description.replace(/\n/g, '<br>'); 
        body.appendChild(descEl);
      }
      const wrap = document.createElement('div');
      wrap.style.display = 'grid';
      wrap.style.gap = '12px';
      const realVariants = Array.isArray(op.variants) ? op.variants : [];
const hasVariants  = realVariants.length > 0;
let variants = hasVariants ? realVariants : [{
    name: 'Standard',
    img: headImg,
    isDummy: true
}];
      const getVarImg = (v) => v.img || v.image || v.imageUrl || (Array.isArray(v.images)&&v.images[0]) || headImg || '';
      let selectedVariant = ''; 
      if (hasVariants){
        const varGrp = document.createElement('div');
        varGrp.className = 'dpb-form-group';
        varGrp.innerHTML = `<label class="dpb-form-label" style="font-weight:600; display:block; margin-bottom:8px;">ตัวเลือก</label>`;
        const grid = document.createElement('div');
        grid.className = 'dpb-variant-tiles';
        varGrp.appendChild(grid);
        variants.forEach((v, idx)=>{
          let label = String(v.name ?? v.label ?? '').trim();
          if(!label || label === '-') label = nameEn; 
          const img  = getVarImg(v);
          const tile = document.createElement('button');
          tile.type = 'button';
          tile.className = 'dpb-variant-tile';
          tile.setAttribute('role','radio');
          tile.setAttribute('aria-checked','false');
          tile.innerHTML = `
            <span class="dpb-variant-tile__chip">${img ? `<img src="${img}" alt="${label}">` : ''}</span>
            <span class="dpb-variant-tile__name">${label}</span>
          `;
          const selectTile = (el, variantObj)=>{
            [...grid.querySelectorAll('.dpb-variant-tile')].forEach(t => t.setAttribute('aria-checked','false'));
            el.setAttribute('aria-checked','true');
            selectedVariant = el.querySelector('.dpb-variant-tile__name')?.textContent?.trim() || '';
            if(variantObj && variantObj.isDummy) selectedVariant = '';
            const newImg = getVarImg(variantObj || {});
            if (thumb && newImg) thumb.src = newImg;
          };
          tile.addEventListener('click', ()=> selectTile(tile, v));
          grid.appendChild(tile);
          if (idx === 0) setTimeout(()=> selectTile(tile, v), 0);
        });
        wrap.appendChild(varGrp);
      }

      // =====================================================================
      // [ส่วนที่เพิ่มใหม่] Notification Banner สำหรับลิ้นชัก (Drawer)
      // =====================================================================
      const currentWidthInput = document.getElementById('dpb-mw');
      const currentTableWidth = currentWidthInput ? parseFloat(currentWidthInput.value) : 0;
      
      let isDrawerDisabled = false; // สร้างตัวแปรเก็บสถานะการปิดปุ่ม
      
      if (op.key && op.key.toLowerCase() === 'drawer' && currentTableWidth < 80) {
        isDrawerDisabled = true; // เปลี่ยนสถานะเป็น true เมื่อเข้าเงื่อนไข

        const drawerAlert = document.createElement('div');
        drawerAlert.className = 'dpb-drawer-alert';
        drawerAlert.style.display = 'flex';
        drawerAlert.style.alignItems = 'flex-start';
        drawerAlert.style.gap = '12px';
        drawerAlert.style.padding = '12px 16px';
        drawerAlert.style.backgroundColor = '#f9f3f3'; 
        drawerAlert.style.borderRadius = '8px';
        drawerAlert.style.color = '#c51515'; 
        drawerAlert.style.fontSize = '14px';
        drawerAlert.style.lineHeight = '1.5';
        drawerAlert.innerHTML = `
          <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: #c51515; margin-top: 2px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div>
            <strong style="display: block; font-weight: 600; margin-bottom: 2px;">ข้อแนะนำ</strong>
            Drawer (ลิ้นชัก) รองรับการติดตั้งกับโต๊ะที่มีความกว้าง 80 cm ขึ้นไปเท่านั้น
          </div>
        `;
        wrap.appendChild(drawerAlert);
      }
      // =====================================================================

      const qtyGrp = document.createElement('div');
      qtyGrp.className = 'dpb-form-group dpb-form-group--qty';
      qtyGrp.innerHTML = `
        <span class="dpb-form-label" style="font-weight:600;">จำนวน</span>
        <div class="dpb-qty">
          <button type="button" class="dpb-qty__btn" data-act="dec">−</button>
          <input id="dpb-qty-input" type="number" min="1" value="1" readonly />
          <button type="button" class="dpb-qty__btn" data-act="inc">+</button>
        </div>
      `;
      const qtyInput = qtyGrp.querySelector('#dpb-qty-input');
      qtyGrp.addEventListener('click', (ev)=>{
        const b = ev.target.closest('.dpb-qty__btn');
        if(!b) return;
        const act = b.dataset.act;
        let val = parseInt(qtyInput.value) || 1;
        if(act === 'inc') val++;
        else val = Math.max(1, val - 1);
        qtyInput.value = val;
      });
      wrap.appendChild(qtyGrp);
      body.appendChild(wrap);
      
      return {
        back, closeB,
        getVariant: ()=> selectedVariant,
        getQty: ()=> Math.max(1, +qtyInput.value||1),
        hasVariants,
        isDrawerDisabled // <--- เพิ่มการส่งค่าสถานะออกไปตรงนี้
      };
    }

    (function initMiniRemoveConfirm(){
      const modal   = document.getElementById('dpb-remove-confirm');
      if (!modal) return;
      const backdrop = modal.querySelector('#dpb-remove-confirm-backdrop');
      const btnNo    = modal.querySelector('.dpb-mini-confirm__no');
      const btnYes   = modal.querySelector('.dpb-mini-confirm__yes');
      const titleEl  = modal.querySelector('#dpb-remove-confirm-title');
      let onYesCb = null, onNoCb = null;
      window.showMiniRemoveConfirm = function({ title, onYes, onNo }){
        if (titleEl && title) titleEl.textContent = title;
        onYesCb = typeof onYes === 'function' ? onYes : null;
        onNoCb  = typeof onNo  === 'function' ? onNo  : null;
        modal.setAttribute('aria-hidden','false');
        modal.classList.add('is-open');
      };
      window.hideMiniRemoveConfirm = function(){
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden','true');
        onYesCb = null; onNoCb = null;
      };
      backdrop?.addEventListener('click', ()=>{ onNoCb?.(); hideMiniRemoveConfirm(); });
      btnNo?.addEventListener('click',    ()=>{ onNoCb?.(); hideMiniRemoveConfirm(); });
      btnYes?.addEventListener('click',   ()=>{ onYesCb?.(); });
    })();

    const cartBackdrop = byId('dpb-cart-backdrop');
    const cartPanel = byId('dpb-cart-panel');
    const cartBody = byId('dpb-cart-body');
    const cartEmpty = byId('dpb-cart-empty');
    const cartClear = byId('dpb-cart-clear');
    const cartCloseMobile = byId('dpb-cart-close-mobile');
    const cartCloseDesktop = byId('dpb-cart-close-desktop');
    const cartConfirm = byId('dpb-cart-confirm');
    const confirmDialog = byId('dpb-confirm');
    const confirmYes = confirmDialog.querySelector('[data-confirm="yes"]');
    const confirmNo = confirmDialog.querySelector('[data-confirm="no"]');
    const mainWrap = document.querySelector('.dpb-wrap');
    const supportsInert = 'inert' in HTMLElement.prototype;
    const supportsHistory = typeof window !== 'undefined' && !!(window.history && window.history.pushState);
	const PRELOAD_EL = (typeof document !== 'undefined') ? document.getElementById('preload') : null;

    function loadBrandLogo(onload){
      const key = BRAND_LOGO_URL;
      window.__desk_img_cache = window.__desk_img_cache || {};
      const cached = window.__desk_img_cache[key];
      if (cached && cached.complete) return cached;
      const im = new Image();
      im.crossOrigin = 'anonymous';
      if (typeof onload === 'function') im.onload = onload;
      im.src = key;
      window.__desk_img_cache[key] = im;
      return im;
    }

    let cartHistoryToken = null;
    let suppressPopstate = false;
    window.__dpb_legGapPrefs = {
      useDefaultsCustom: false,
      useDefaultsL2:      true,
      useDefaultsL3:      false
    };
    const cartButton = byId('dpb-cart-button');
    const cartCount = byId('dpb-cart-count');

    function getOptionMeta(key){
      return (state.meta.options || []).find(o=>o.key===key) || null;
    }

    (function(){
      if (typeof window.scheduleRedraw === 'function') {
        var __origScheduleRedraw = window.scheduleRedraw;
        window.scheduleRedraw = function(){
          if (typeof window.dpb_validateLegGaps === 'function') {
            var g = dpb_validateLegGaps();
            if (!g.ok) return;
          }
          return __origScheduleRedraw.apply(this, arguments);
        };
      }
    })();

    const LEG_DIMS_CM = {
      left:  { w: 50.5, h: 57.5 },
      center:{ w:110.0, h: 13.1 },
      right: { w: 54.5, h: 57.5 }
    };



    const LEG_IMG_CACHE = Object.create(null);

    function dpb_calcCustomOverlap(Lcm, gapL, gapR, allowCm = 4){
      const wL = LEG_DIMS_CM.left.w;
      const wR = LEG_DIMS_CM.right.w;
      const threshold = Lcm - (wL + wR) + allowCm;
      const over = (gapL + gapR) - threshold;
      const overInt = cmOverToInt(over);
      if (overInt > 0){
        const maxA = Math.max(5, Math.round(gapL - overInt));
        const maxB = Math.max(5, Math.round(gapR - overInt));
        return { ok:false, overCm:overInt, maxA, maxB };
      }
      return { ok:true, overCm:0, maxA:gapL, maxB:gapR };
    }

function getLegColorFromSelection(){
  const sel = document.getElementById('dpb-legs');
  const val = (sel && sel.value) ? String(sel.value) : '';
  const legs = (state && state.meta && Array.isArray(state.meta.legs)) ? state.meta.legs : [];
  const row  = legs.find(x => String(x.key) === val) || null;
  const haystack = [
    val,
    row && row.name,
    row && row.imageUrl
  ].filter(Boolean).join(' ').toLowerCase();
  if (/\bblack\b|ดำ|black\.|_black|\/black|black3|bk\b|blk\b/.test(haystack)) return 'black';
  if (/\bwhite\b|ขาว|white\.|_white|\/white|white3|wh\b|wht\b/.test(haystack)) return 'white';
  if (/\bgrey\b|เทา|grey\.|_grey|\/grey|grey3|gy\b|gry\b/.test(haystack)) return 'grey';
  if (val.toLowerCase().includes('black')) return 'black';
  if (val.toLowerCase().includes('white')) return 'white';
  if (val.toLowerCase().includes('grey')) return 'grey';
  return 'white';
}

function getLegAssetsBySelection(){
  const colorRaw = getLegColorFromSelection();
  const color = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
  return LEG_ASSETS[color] || LEG_ASSETS.white;
}

window.__desk_img_cache = window.__desk_img_cache || {};

function loadLegImage(url, onload){
  if (!url) return null;
  const key = String(url);
  const cached = window.__desk_img_cache[key];
  if (cached && cached.complete) return cached;
  const im = new Image();
  im.crossOrigin = 'anonymous';
  if (typeof onload === 'function') im.onload = onload;
  im.src = key;
  window.__desk_img_cache[key] = im;
  return im;
}

function computeLegLayoutRectDesk(args){
  const { x, y, w, h, sc, Lcm, Wcm } = args;
  const gaps = (typeof window.dpb_getLegGaps==='function') ? window.dpb_getLegGaps() : {A:5,B:5};
  const leftOffsetCm  = Math.max(5, gaps.A);
  const rightOffsetCm = Math.max(5, gaps.B);
  const leftW   = LEG_DIMS_CM.left.w   * sc;
  const leftH   = LEG_DIMS_CM.left.h   * sc;
  const rightW  = LEG_DIMS_CM.right.w  * sc;
  const rightH  = LEG_DIMS_CM.right.h  * sc;
  const centerW = LEG_DIMS_CM.center.w * sc;
  const centerH = LEG_DIMS_CM.center.h * sc;
  const leftX  = x + (leftOffsetCm * sc);
  const leftY  = y + (h - leftH) / 2;
  const rightX = x + w - (rightOffsetCm * sc) - rightW;
  const rightY = y + (h - rightH) / 2;
  const centerX = x + (w - centerW) / 2;
  const centerY = y + (h - centerH) / 2;
  const cropLeftCm  = leftOffsetCm + LEG_DIMS_CM.left.w;
  const cropRightCm = Lcm - (rightOffsetCm + (LEG_DIMS_CM.right.w - 4.0));
  const cropLeftX  = x + cropLeftCm * sc;
  const cropRightX  = x + cropRightCm * sc;
  return {
    leftRect:  { x:leftX,  y:leftY,  w:leftW,    h:leftH    },
    rightRect: { x:rightX, y:rightY, w:rightW,  h:rightH  },
    centerRect: { x:centerX,y:centerY,w:centerW, h:centerH },
    crop:        { leftX:cropLeftX, rightX:cropRightX }
  };
}