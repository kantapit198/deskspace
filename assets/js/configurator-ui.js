(function(){
  const $btn  = document.getElementById('dpb-leggap-toggle');
  const $wrap = document.getElementById('dpb-leggap-fields');
  if(!$btn || !$wrap) return;
  $btn.addEventListener('click', ()=>{
    const open = !$wrap.classList.contains('is-open');
    $wrap.classList.toggle('is-open', open);
    const caret = $btn.querySelector('.dpb-caret');
    if(caret) caret.classList.toggle('is-open', open);
    $btn.setAttribute('aria-expanded', open?'true':'false');
    $wrap.setAttribute('aria-hidden', open?'false':'true');
  });
})();

(function(){
  const $gapA = byId('dpb-gapA');
  const $gapB = byId('dpb-gapB');
  const $gapALabel = byId('dpb-gapA-label');
  const $gapBLabel = byId('dpb-gapB-label');
  const $wrap = byId('dpb-leggap-fields');
  window.__dpb_legGapPrefs = window.__dpb_legGapPrefs || {
    useDefaultsCustom: false,
    useDefaultsL2:      true,
    useDefaultsL3:      false
  };

  function _setFieldError(el, msg){
    el.classList.toggle('dpb-invalid', !!msg);
    const note = el.parentElement.querySelector('.dpb-field-note');
    if(note){
      note.textContent = msg || '';
      note.style.display = msg ? '' : 'none';
    }
  }

  function dpb_legGap_min5_guard(){
    [$gapA,$gapB].forEach($in=>{
      if(!$in) return;
      const v = +($in.value||0);
      if (v<5){
        _setFieldError($in, 'แนะนำให้ขอบโต๊ะมีระยะห่าง 5cm ขึ้นไป');
      } else {
        _setFieldError($in, '');
      }
    });
  }

  function dpb_syncLegGapUIVisibility(){
    const t = (byId('dpb-type')?.value||'').trim();
    const side = (byId('dpb-aside')?.value||'right').trim();

    const show = (t==='custom' || t==='custom_manual' || t==='custom_single' || t==='l2' || t==='l3' || t==='custom_workspace') && t!=='single';
    
    if($wrap) $wrap.style.display = show ? '' : 'none';
    if(!show) return;

    if(t==='custom' || t==='custom_manual' || t==='custom_workspace' || t==='custom_single'){
      $gapALabel.textContent = 'ขาซ้าย (cm)';
      $gapBLabel.textContent = 'ขาขวา (cm)';
    }else if(t==='l2'){
      if(side==='right'){
        $gapALabel.textContent = 'ขาซ้าย (cm)';
        $gapBLabel.textContent = 'ขาขวาแอล (cm)';
      }else{
        $gapALabel.textContent = 'ขาซ้ายแอล (cm)';
        $gapBLabel.textContent = 'ขาขวา (cm)';
      }
    }else if(t==='l3'){
      if(side==='right'){
        $gapALabel.textContent = 'ขาซ้าย (cm)';
        $gapBLabel.textContent = 'ขาล่างขวา (cm)';
      }else{
        $gapALabel.textContent = 'ขาขวา (cm)';
        $gapBLabel.textContent = 'ขาล่างซ้าย (cm)';
      }
    }
  }

  function dpb_applyL2DefaultsIfNeeded(){
    if(!window.__dpb_legGapPrefs.useDefaultsL2) return;
    const t = (byId('dpb-type')?.value||'').trim();
    if(t!=='l2') return;
    const Lcm = +byId('dpb-ml').value || 0;
    let def = 5;
    if(Lcm>=120 && Lcm<=180) def=5;
    else if(Lcm>=181 && Lcm<=190) def=15;
    else if(Lcm>=191 && Lcm<=200) def=25;
    if(byId('dpb-gapA') && byId('dpb-gapB')){
      byId('dpb-gapA').value = def;
      byId('dpb-gapB').value = def;
    }
  }

  function dpb_resetGapsWhenLeavingL2(prevType){
    const now = (byId('dpb-type')?.value||'').trim();
    if(prevType==='l2' && (now==='custom' || now==='custom_manual' || now==='custom_workspace' || now==='custom_single' || now==='l3')){
      if($gapA) $gapA.value = 5;
      if($gapB) $gapB.value = 5;
    }
  }

  (function dpb_initLegGaps(){
    if($gapA && !$gapA.dataset.__inited){ $gapA.value = 5; $gapA.dataset.__inited = '1'; }
    if($gapB && !$gapB.dataset.__inited){ $gapB.value = 5; $gapB.dataset.__inited = '1'; }
    dpb_legGap_min5_guard();
    dpb_syncLegGapUIVisibility();
    dpb_applyL2DefaultsIfNeeded();
  })();

  let __prevType = (byId('dpb-type')?.value||'').trim();
  ['change','input'].forEach(ev=>{
    if($gapA) $gapA.addEventListener(ev, dpb_legGap_min5_guard);
    if($gapB) $gapB.addEventListener(ev, dpb_legGap_min5_guard);
  });
  ['dpb-type','dpb-aside','dpb-ml'].forEach(id=>{
    const el = byId(id);
    if(!el) return;
    el.addEventListener('change', ()=>{
      dpb_syncLegGapUIVisibility();
      dpb_applyL2DefaultsIfNeeded();
      dpb_resetGapsWhenLeavingL2(__prevType);
      __prevType = (byId('dpb-type')?.value||'').trim();
      if(typeof window.scheduleRedraw === 'function'){
        scheduleRedraw();
      }
    });
  });

  window.dpb_getLegGaps = function(){
    const A = Math.max(5, +(byId('dpb-gapA')?.value||5));
    const B = Math.max(5, +(byId('dpb-gapB')?.value||5));
    return { A, B };
  };
})();

(function(){
  function setErr(el, msg){
    el.classList.toggle('dpb-invalid', !!msg);
    let note = el.parentElement.querySelector('.dpb-field-note');
    if(!note){ note = document.createElement('div'); note.className='dpb-field-note'; el.parentElement.appendChild(note); }
    note.textContent = msg||''; note.style.display = msg ? '' : 'none';
  }

function _checkOverlap_Custom(Lcm, gapL, gapR){
  const res = dpb_calcCustomOverlap(Lcm, gapL, gapR, 4);
  if (!res.ok){
    return {
      ok:false,
      msgA:`กรุณาลดระยะห่างลงอีก ${res.overCm} cm (ห้ามเกิน ${res.maxA} cm)`,
      msgB:`กรุณาลดระยะห่างลงอีก ${res.overCm} cm (ห้ามเกิน ${res.maxB} cm)`
    };
  }
  return { ok:true };
}

function _checkOverlap_L2(side, Lcm, gapA, gapB){
  const allow = 4;
  let wA, wB;
  if (String(side).toLowerCase()==='right'){
    wA = LEG_DIMS_L2_CM.left.w;
    wB = LEG_DIMS_L2_CM.rightL.w;
  }else{
    wA = LEG_DIMS_L2_CM.leftL.w;
    wB = LEG_DIMS_L2_CM.right.w;
  }
  const threshold = Lcm - (wA + wB) + allow;
  const over = (gapA + gapB) - threshold;
  if (over > 0){
    const overStr = over.toFixed(1);
    const maxA = Math.max(5, Math.round(gapA - over));
    const maxB = Math.max(5, Math.round(gapB - over));
    return {
      ok:false,
      msgA:`กรุณาลดระยะห่างลงอีก ${overStr} cm (ห้ามเกิน ${maxA} cm)`,
      msgB:`กรุณาลดระยะห่างลงอีก ${overStr} cm (ห้ามเกิน ${maxB} cm)`
    };
  }
  return { ok:true };
}

  function _checkL3_Rules(t, side, gapA, gapB){
    const res = { ok:true, msgA:'', msgB:'' };
    const minOKA = gapA>=5, minOKB=gapB>=5;
    if(!minOKA){ res.ok=false; res.msgA='แนะนำให้ขอบโต๊ะมีระยะห่าง5cmขึ้นไป'; }
    if(!minOKB){ res.ok=false; res.msgB='แนะนำให้ขอบโต๊ะมีระยะห่าง5cmขึ้นไป'; }
    if(!res.ok) return res;
    if(side==='left'){
      const allowA = 11.5;
      if(gapA > (50 + allowA)){ res.ok=false; res.msgA = 'กรุณาลดระยะห่างลงเพื่อไม่ให้ซ้อนเกิน 11.5 ซม.'; }
      if(gapB > 50){ res.ok=false; res.msgB = 'ขาล่างซ้ายกับขาบนซ้ายห้ามซ้อนกัน'; }
      return res;
    }else{
      const allowA = 11.5;
      if(gapA > (50 + allowA)){ res.ok=false; res.msgA = 'กรุณาลดระยะห่างลงเพื่อไม่ให้ซ้อนเกิน 11.5 ซม.'; }
      if(gapB > 50){ res.ok=false; res.msgB = 'ขาล่างขวากับขาบนขวาห้ามซ้อนกัน'; }
      return res;
    }
  }

  window.dpb_validateLegGaps = function(){
    const t    = (byId('dpb-type')?.value||'').trim();
    if(!t || t==='single') return { ok:true, messages:[] };
    const side = (byId('dpb-aside')?.value||'right').trim();
    const Lcm  = +byId('dpb-ml').value || 0;
    const $A = byId('dpb-gapA'), $B = byId('dpb-gapB');
    const gapA = Math.max(5, +($A?.value||5));
    const gapB = Math.max(5, +($B?.value||5));
    let ok = true, msgs = [];
    if($A) setErr($A,''); if($B) setErr($B,'');
    
    if(t==='custom' || t==='custom_manual' || t==='custom_single' || t==='custom_workspace'){
      const chk = _checkOverlap_Custom(Lcm, gapA, gapB);
      if(!chk.ok){ ok=false; if($A) setErr($A, chk.msgA||''); if($B) setErr($B, chk.msgB||''); msgs.push(chk.msgA||chk.msgB); }
    } else if(t==='l2'){
      const chk = _checkOverlap_L2(side, Lcm, gapA, gapB);
      if(!chk.ok){ ok=false; if($A) setErr($A, chk.msgA||''); if($B) setErr($B, chk.msgB||''); msgs.push(chk.msgA||chk.msgB); }
    } else if(t==='l3'){
      const chk = _checkL3_Rules(t, side, gapA, gapB);
      if(!chk.ok){ ok=false; if($A) setErr($A, chk.msgA||''); if($B) setErr($B, chk.msgB||''); msgs.push(chk.msgA||chk.msgB); }
    }
    try{
      document.dispatchEvent(new CustomEvent('dpb:validation-changed',{
        detail:{ ok, messages: msgs.slice() }
      }));
    }catch(_){}
    return { ok, messages: msgs };
  };

  document.addEventListener('dpb:validation-changed', function(e){
  });
})();

(function(){
  function _q(id){ return document.getElementById(id); }

  function dpb_getGapInputs(){
    var ids = ['dpb-gapA','dpb-gapB','dpb-gap-left','dpb-gap-right','dpb-gapL','dpb-gapR'];
    var a=null,b=null;
    for(var i=0;i<ids.length;i++){
      var el=_q(ids[i]);
      if(el && el.offsetParent!==null){
        if(!a) a=el; else if(!b && el!==a) { b=el; break; }
      }
    }
    return {a:a,b:b};
  }

  function dpb_resetGapsToDefaults(){
    var type = (_q('dpb-type')?.value || '').trim().toLowerCase();
    var pair = dpb_getGapInputs(); if(!pair.a || !pair.b) return;
    if (type === 'l2'){
      var done = false;
      try{
        if (typeof window.dpb_applyL2DefaultsIfNeeded === 'function'){
          window.dpb_applyL2DefaultsIfNeeded(true);
          done = true;
        }
      }catch(_){}
      if(!done){
        var Lcm = +(_q('dpb-ml')?.value || 0);
        var def = (Lcm>=191 && Lcm<=200)?25 : (Lcm>=181 && Lcm<=190)?15 : 5;
        pair.a.value = String(def);
        pair.b.value = String(def);
      }
    }else{
      pair.a.value = '5';
      pair.b.value = '5';
    }
    if (typeof setFieldError === 'function'){
      setFieldError(pair.a, '');
      setFieldError(pair.b, '');
    }
    try{
      pair.a.dispatchEvent(new Event('input',{bubbles:true}));
      pair.b.dispatchEvent(new Event('input',{bubbles:true}));
    }catch(_){}
    try{ scheduleRedraw(); }catch(_){}
  }

  function dpb_centerGaps(){
    var type = (_q('dpb-type')?.value || '').trim().toLowerCase();
    if (type === 'l3') return;
    var pair = dpb_getGapInputs(); if(!pair.a || !pair.b) return;
    var vA = +((pair.a.value||'').toString().trim()||0);
    var vB = +((pair.b.value||'').toString().trim()||0);
    if (isNaN(vA)) vA = 0; if (isNaN(vB)) vB = 0;
    var avg = (vA + vB)/2;
    if (avg < 5) avg = 5;
    pair.a.value = String(avg);
    pair.b.value = String(avg);
    if (typeof setFieldError === 'function'){
      setFieldError(pair.a, '');
      setFieldError(pair.b, '');
    }
    try{
      pair.a.dispatchEvent(new Event('input',{bubbles:true}));
      pair.b.dispatchEvent(new Event('input',{bubbles:true}));
    }catch(_){}
    try{ scheduleRedraw(); }catch(_){}
  }

  function dpb_updateGapButtonsVisibility(){
    var type = (_q('dpb-type')?.value || '').trim().toLowerCase();
    var centerBtn = _q('dpb-gap-center');
    if (centerBtn){
      centerBtn.style.display = (type==='custom' || type==='custom_manual' || type==='custom_single' || type==='l2' || type==='custom_workspace') ? '' : 'none';
    }
  }

  function dpb_bindGapButtons(){
    var resetBtn  = _q('dpb-gap-reset');
    var centerBtn = _q('dpb-gap-center');
    if (resetBtn && !resetBtn._dpbBound){
      resetBtn._dpbBound = true;
      resetBtn.addEventListener('click', dpb_resetGapsToDefaults);
    }
    if (centerBtn && !centerBtn._dpbBound){
      centerBtn._dpbBound = true;
      centerBtn.addEventListener('click', dpb_centerGaps);
    }
    dpb_updateGapButtonsVisibility();
  }

  dpb_bindGapButtons();
  try{
    var tSel = _q('dpb-type'); if (tSel) tSel.addEventListener('change', dpb_updateGapButtonsVisibility);
    var aSel = _q('dpb-aside'); if (aSel) aSel.addEventListener('change', dpb_updateGapButtonsVisibility);
  }catch(_){}

  window.dpb_resetGapsToDefaults = dpb_resetGapsToDefaults;
  window.dpb_centerGaps = dpb_centerGaps;
  window.dpb_updateGapButtonsVisibility = dpb_updateGapButtonsVisibility;
})();

function optionPositionChoices(){
  return [
    { value:'main',  label:'ท็อปด้านบน' },
    { value:'left',  label:'ท็อปฝั่งซ้าย' },
    { value:'right', label:'ท็อปฝั่งขวา' }
  ];
}

function placementLabelPack({ pos }){
  const p = (pos || 'main').toLowerCase();
  const yName = 'ระยะห่าง (cm)';
  const xName = 'ระยะห่าง (cm)';
  if(p === 'main'){
    return {
      vLabel: 'การจัดวางแนวตั้ง',
      vChoices: [
        { value:'top',    label:'ด้านบน' },
        { value:'bottom', label:'ด้านล่าง' }
      ],
      yName,
      hLabel: 'การจัดวางแนวนอน',
      hChoices: [
        { value:'left',   label:'ด้านซ้าย' },
        { value:'center', label:'ตรงกลาง' },
        { value:'right',  label:'ด้านขวา' }
      ],
      xName
    };
  }
  if(p === 'left'){
    return {
      vLabel: 'การจัดวางแนวตั้งจาก',
      vChoices: [
        { value:'left',   label:'ด้านซ้าย' }
      ],
      yName,
      hLabel: 'การจัดวางแนวนอน',
      hChoices: [
        { value:'left',   label:'ด้านล่าง' },
        { value:'center', label:'ตรงกลาง' },
        { value:'right',  label:'ด้านบน' }
      ],
      xName
    };
  }
  if(p === 'right'){
    return {
      vLabel: 'การจัดวางแนวตั้งจาก',
      vChoices: [
        { value:'right',  label:'ด้านขวา' }
      ],
      yName,
      hLabel: 'การจัดวางแนวนอน',
      hChoices: [
        { value:'left',   label:'ด้านบน' },
        { value:'center', label:'ตรงกลาง' },
        { value:'right',  label:'ด้านล่าง' }
      ],
      xName
    };
  }
  return {};
}

function optsHtml(choices, selectedValue){
  return choices.map(c=>`<option value="${c.value}" ${String(selectedValue)===String(c.value)?'selected':''}>${c.label}</option>`).join('');
}

function applyPackToCard(card, cfg){
  const pack = placementLabelPack({ pos: cfg.pos || 'main' });
  const labV = card.querySelector('[data-role="label-v"]');
  const labVLen = card.querySelector('[data-role="label-vlen"]');
  const labH = card.querySelector('[data-role="label-h"]');
  const labHLen = card.querySelector('[data-role="label-hlen"]');
  const selFrom = card.querySelector('select[name="from"]');
  const selPlace = card.querySelector('select[name="place"]');
  if(labV)    labV.textContent = pack.vLabel;
  if(labVLen) labVLen.textContent = pack.yName;
  if(labH)    labH.textContent = pack.hLabel;
  if(labHLen) labHLen.textContent = pack.xName;
  if(selFrom){
    const have = pack.vChoices.some(x=>x.value===cfg.from);
    selFrom.innerHTML = optsHtml(pack.vChoices, have?cfg.from:pack.vChoices[0].value);
    if(!have) cfg.from = pack.vChoices[0].value;
  }
  if(selPlace){
    const have = pack.hChoices.some(x=>x.value===cfg.place);
    selPlace.innerHTML = optsHtml(pack.hChoices, have?cfg.place:pack.hChoices[0].value);
    if(!have) cfg.place = pack.hChoices[0].value;
  }
}

function rebuildPosSelectInCard(card, cfg){
  const posWrap = card.querySelector('select[name="pos"]');
  if(!posWrap) return;
  const list = optionPositionChoices();
  const have = list.some(x=>x.value===cfg.pos);
  posWrap.innerHTML = list.map(p=>`<option value="${p.value}" ${have && cfg.pos===p.value ? 'selected':''}>${p.label}</option>`).join('');
  if(!have){
    cfg.pos = 'main';
    posWrap.value = 'main';
  }
}

function refreshAllCartForms(){
  const cards = cartBody.querySelectorAll('.dpb-cart-item');
  cards.forEach(card=>{
    const key = card.dataset.key;
    const index = Number(card.dataset.index);
    const cfg = state.optConfig[key]?.[index];
    if(!cfg) return;
    rebuildPosSelectInCard(card, cfg);
    applyPackToCard(card, cfg);
  });
  validateOptionPlacements();
  scheduleRedraw();
}

const $rmModal     = document.getElementById('dpb-remove-confirm');
const $rmBackdrop  = document.getElementById('dpb-remove-confirm-backdrop');
const $rmTitle     = document.getElementById('dpb-remove-confirm-title');
const $rmNo        = $rmModal?.querySelector('.dpb-mini-confirm__no');
const $rmYes       = $rmModal?.querySelector('.dpb-mini-confirm__yes');

function showRemoveGroupConfirm(onYes){
  if(window.confirm('คุณต้องการลบรายการนี้ทั้งหมดหรือไม่?')){
    if(typeof onYes === 'function') onYes();
  }
}

let _rmOnYes = null;
let _rmOnNo  = null;

function showMiniRemoveConfirm({ title, onYes, onNo }){
  if(!$rmModal) return;
  if($rmTitle && title) $rmTitle.textContent = String(title);
  _rmOnYes = typeof onYes === 'function' ? onYes : null;
  _rmOnNo  = typeof onNo  === 'function' ? onNo  : null;
  $rmModal.setAttribute('aria-hidden','false');
  $rmModal.classList.add('is-open');
}

function hideMiniRemoveConfirm(){
  if(!$rmModal) return;
  $rmModal.classList.remove('is-open');
  $rmModal.setAttribute('aria-hidden','true');
  _rmOnYes = null; _rmOnNo = null;
}

$rmBackdrop?.addEventListener('click', hideMiniRemoveConfirm);
$rmNo?.addEventListener('click', ()=>{ try{ _rmOnNo?.(); }finally{ hideMiniRemoveConfirm(); } });
$rmYes?.addEventListener('click', ()=>{ try{ _rmOnYes?.(); }finally{ hideMiniRemoveConfirm(); } });
document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape' && $rmModal?.classList.contains('is-open')) hideMiniRemoveConfirm();
});

// ============================================================
// [PART 3 MODIFIED] Validation Logic (ส่งข้อความ 2 แบบ)
// ============================================================
function validateOptionPlacements(){
  state.validation = state.validation || { ok:true, messages:[] };
  let ok = true;
  
  Object.keys(state.optConfig).forEach(key => {
    const arr = state.optConfig[key] || [];
    const op = (state.meta.options || []).find(o => o.key === key) || {};
    const baseName = op.name || key;

    arr.forEach((cfg, index) => {
      const card = cartBody.querySelector(`.dpb-cart-item[data-key="${CSS.escape(key)}"][data-index="${index}"]`);
      if(!card) return;

      const vSel = card.querySelector('select[name="from"]');
      const yInp = card.querySelector('input[name="offsetY"]');
      const hSel = card.querySelector('select[name="place"]');
      const xInp = card.querySelector('input[name="offsetX"]');
      
      // เคลียร์ Error
      [yInp, xInp].forEach(el => { if(el) setFieldError(el, ''); });
      
      if(!yInp || !xInp || !vSel || !hSel) return;

      const {minYTop, minYBottom, minXLeft, minXRight} = minOffsetsFor(cfg);
      
      // ชื่อสินค้าสำหรับ Popup (แบบละเอียด)
      const variantStr = cfg.variant ? ` (${cfg.variant})` : '';
      const itemLabel = `${baseName}${variantStr} #${index + 1}`;

      // --- ตรวจสอบแกนตั้ง (Y) ---
      if (vSel.value !== 'center') {
          const yVal = +yInp.value || 0;
          const needY = (vSel.value === 'top') ? minYTop : minYBottom;
          
          if(yVal < needY){
            // [1] ข้อความสั้น (สำหรับ Panel)
            const shortMsg = `ต้องห่าง ${needY} cm ขึ้นไป`;

            // [2] ข้อความยาว (สำหรับ Popup)
            const dirTxt = (vSel.value === 'top') ? 'ขอบโต๊ะด้านบน' : 
                           (vSel.value === 'bottom') ? 'ขอบโต๊ะด้านล่าง' : 'จุดอ้างอิง';
            const longMsg = `${itemLabel} ต้องห่างจาก ${dirTxt} ${needY} cm ขึ้นไป`;
            
            // เรียก setFieldError(element, shortMsg, isMirror, longMsg)
            setFieldError(yInp, shortMsg, false, longMsg);
            
            ok = false;
            state.validation.ok = false;
            state.validation.messages.push({ field:`${key}[${index}].offsetY`, message:longMsg });
          }
      }

      // --- ตรวจสอบแกนนอน (X) ---
      if (hSel.value !== 'center') {
          const xVal = +xInp.value || 0;
          const needX = (hSel.value === 'left') ? minXLeft : minXRight;
          
          if(xVal < needX){
            // [1] ข้อความสั้น (สำหรับ Panel)
            const shortMsg = `ต้องห่าง ${needX} cm ขึ้นไป`;

            // [2] ข้อความยาว (สำหรับ Popup)
            const dirTxt = (hSel.value === 'left') ? 'ขอบโต๊ะด้านซ้าย' : 
                           (hSel.value === 'right') ? 'ขอบโต๊ะด้านขวา' : 'จุดอ้างอิง';
            const longMsg = `${itemLabel} ต้องห่างจาก ${dirTxt} ${needX} cm ขึ้นไป`;

            // เรียก setFieldError(element, shortMsg, isMirror, longMsg)
            setFieldError(xInp, shortMsg, false, longMsg);

            ok = false;
            state.validation.ok = false;
            state.validation.messages.push({ field:`${key}[${index}].offsetX`, message:longMsg });
          }
      }
    });
  });
  
  return ok;
}

    function persistMetaCache(meta){
      if(typeof window === 'undefined' || !window.localStorage) return;
      try {
        const payload = { savedAt: Date.now(), data: meta };
        localStorage.setItem(META_CACHE_KEY, JSON.stringify(payload));
      } catch(err){}
    }

    function readMetaCache(){
      if(typeof window === 'undefined' || !window.localStorage) return null;
      try {
        const raw = localStorage.getItem(META_CACHE_KEY);
        if(!raw) return null;
        
        // Dynamically rewrite cached localhost URLs to current host (fixes CORS & Mixed Content on cache loads)
        let cleanedRaw = raw;
        if (cleanedRaw.includes('localhost')) {
            cleanedRaw = cleanedRaw.replace(/https?:\/\/localhost/ig, window.location.origin);
        }
        
        let ajaxUrl = (typeof window.dsAdminMode !== 'undefined' && window.dsAdminMode.ajaxUrl) 
          ? window.dsAdminMode.ajaxUrl 
          : (typeof AJAX_URL !== 'undefined' ? AJAX_URL : (window.location.origin + '/test-site/wp-admin/admin-ajax.php'));
        
        if (ajaxUrl.includes('localhost')) {
          ajaxUrl = ajaxUrl.replace(/https?:\/\/localhost/ig, window.location.origin);
        }
        
        const proxyBase = ajaxUrl + '?action=ds_image_proxy&url=';
        cleanedRaw = cleanedRaw.replace(/\"(https?:\/\/(?:www\.)?deskspace\.in\.th\/wp-content\/uploads\/[^\"]+)\"/g, (match, url) => {
          return `"${proxyBase}${encodeURIComponent(url)}"`;
        });
        
        const parsed = JSON.parse(cleanedRaw);
        if(parsed && parsed.data && typeof parsed.data === 'object'){
          return parsed.data;
        }
      } catch(err){}
      return null;
    }

    function showStatusMessage(text, color){
      const el = byId('dpb-msg');
      if(!el) return;
      if(!text){
        el.textContent='';
        el.removeAttribute('style');
        return;
      }
      el.textContent = text;
      el.style.color = color || '#6b7280';
    }

function parseNumberList(input){
  if (input == null) return [];
  if (Array.isArray(input)) {
    return input
      .map(n => (typeof n === 'string' ? parseFloat(n.trim()) : Number(n)))
      .filter(n => Number.isFinite(n));
  }
  if (typeof input === 'number') return Number.isFinite(input) ? [input] : [];
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return [];
    return s.split(',').map(t => parseFloat(t.trim())).filter(Number.isFinite);
  }
  return [];
}

function minOffsetsFor(cfg){
  const pos = (cfg.pos || 'main').toLowerCase();
  const isRotated = !!cfg.rotate; 
  const typeEl  = document.getElementById('dpb-type');
  const asideEl = document.getElementById('dpb-aside');
  const type  = (typeEl ? typeEl.value : '').toLowerCase();
  const aside = (asideEl ? asideEl.value : 'right').toLowerCase();
  let minYTop = 5, minYBottom = 5;
  let minXLeft = 10, minXRight = 10;
  if (pos === 'main') {
    if (isRotated) {
       minXLeft = 5;
       minXRight = 5;
    } else {
       if (type === 'l3') {
           if (aside === 'right') {
               minXRight = 5;
               minXLeft  = 10;
           } else {
               minXLeft  = 5;
               minXRight = 10;
           }
       } else {
           minXLeft = 10;
           minXRight = 10;
       }
    }
    return { minYTop, minYBottom, minXLeft, minXRight };
  }
  if (pos === 'left' || pos === 'right' || pos === 'arm') {
     minYBottom = 5; 
     minYTop    = 5;
     minXLeft   = 5;
     minXRight  = 5;
  }
  return { minYTop, minYBottom, minXLeft, minXRight };
}

function enrichOptionVariantDefaults(){
  const opts = (state?.meta?.options || []);
  opts.forEach(opt=>{
    const vList = Array.isArray(opt.variants) ? opt.variants : [];
    if(!vList.length) return;
    const wArr = parseNumberList(opt.defaultWcm);
    const hArr = parseNumberList(opt.defaultHcm);
    vList.forEach((v, i)=>{
      if(!Number.isFinite(v.defaultWcm) && Number.isFinite(wArr[i])) v.defaultWcm = wArr[i];
      if(!Number.isFinite(v.defaultHcm) && Number.isFinite(hArr[i])) v.defaultHcm = hArr[i];
    });
  });
}


    function hidePreloadNow(){
      try{
        const preload = document.getElementById('preload');
        if(!preload) return;
        preload.classList.add('is-ready');
        setTimeout(()=>{ preload.style.display = 'none'; }, 350);
      }catch(_){}
    }

async function loadMeta(){
  const endpoint = `${AJAX_URL}?action=dpb_meta&ts=${Date.now()}`;
  let metaData = null;
  let usedCache = false;
  try {
    const res = await fetch(endpoint, { credentials:'same-origin', cache:'no-store' });
    let payload = null;
    try { payload = await res.json(); } catch(parseErr) { payload = null; }
    if(!res.ok){
      const errMsg = payload && payload.data && payload.data.message ? payload.data.message : `HTTP ${res.status}`;
      throw new Error(errMsg);
    }
    if(payload && typeof payload.success === 'boolean'){
      if(payload.success){
        metaData = payload.data;
      } else {
        const errMsg = payload.data && payload.data.message ? payload.data.message : 'ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์';
        throw new Error(errMsg);
      }
    } else {
      metaData = payload;
    }
    if(!metaData || typeof metaData !== 'object'){
      throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
    }
    
    // Clean/Rewrite cached/live localhost URLs to current host (fixes CORS & Mixed Content on cache loads)
    try {
      let metaStr = JSON.stringify(metaData);
      if (metaStr.includes('localhost')) {
        metaStr = metaStr.replace(/https?:\/\/localhost/ig, window.location.origin);
      }
      
      let ajaxUrl = (typeof window.dsAdminMode !== 'undefined' && window.dsAdminMode.ajaxUrl) 
        ? window.dsAdminMode.ajaxUrl 
        : (typeof AJAX_URL !== 'undefined' ? AJAX_URL : (window.location.origin + '/test-site/wp-admin/admin-ajax.php'));
      
      if (ajaxUrl.includes('localhost')) {
        ajaxUrl = ajaxUrl.replace(/https?:\/\/localhost/ig, window.location.origin);
      }
      
      const proxyBase = ajaxUrl + '?action=ds_image_proxy&url=';
      metaStr = metaStr.replace(/\"(https?:\/\/(?:www\.)?deskspace\.in\.th\/wp-content\/uploads\/[^\"]+)\"/g, (match, url) => {
        return `"${proxyBase}${encodeURIComponent(url)}"`;
      });
      
      metaData = JSON.parse(metaStr);
    } catch(cleanErr) {
      console.warn('[DPB] Failed to rewrite/proxy URLs in meta:', cleanErr);
    }

    persistMetaCache(metaData);
  } catch(err){
    const cached = readMetaCache();
    if(cached){
      metaData = cached;
      usedCache = true;
      console.warn('[DPB] meta fallback to cache:', err);
    } else {
      console.error('[DPB] meta load failed:', err);
      throw err;
    }
  }
  const normalised = {
    colors:  Array.isArray(metaData?.colors)  ? metaData.colors  : [],
    legs:    Array.isArray(metaData?.legs)    ? metaData.legs    : [],
    options: Array.isArray(metaData?.options) ? metaData.options : [],
    models:  Array.isArray(metaData?.models)  ? metaData.models  : [],
    edges:   Array.isArray(metaData?.edges)   ? metaData.edges   : [],
  };
  state.meta = normalised;
  enrichOptionVariantDefaults?.();
  fillSelects?.();

  if (typeof buildTopColorTilesGroupedSafe === 'function') {
    buildTopColorTilesGroupedSafe();
  }
  if (typeof initEdgeAndLegTiles === 'function') {
    try { initEdgeAndLegTiles(); } catch(e){ console.warn('[DPB] initEdgeAndLegTiles threw:', e); }
  }
  try { rebuildLegTilesFromSheet(); } catch(e){ console.warn('[DPB] rebuildLegTilesFromSheet failed:', e); }
  buildOptions?.();
  buildOptConfig?.();
  bindCartEvents?.();
  syncRBlocks?.(true);
  setTimeout(()=>{
    try { hidePreloadNow(); } catch(_){}
    try { drawFooter(); }catch(_){}
    try { measureInfoGrid(); }catch(_){}
    scheduleRedraw?.();
  }, 100);
  console.log('[DPB] meta loaded', {
    colors: state.meta.colors?.length||0,
    legs:   state.meta.legs?.length||0,
    edges:  state.meta.edges?.length||0,
    options:state.meta.options?.length||0,
    cache:  usedCache
  });
  return { usedCache };
}

function fillSelects() {
    const selColor = byId('dpb-top-color');
    selColor.innerHTML = '';
    const tileWrap = byId('dpb-top-color-tiles');
    if (tileWrap) tileWrap.innerHTML = '';
    
    // เตรียมตัวแปร cache สำหรับรูป 3D (ถ้ายังไม่มีให้สร้าง object ว่างรอไว้)
    state.colorImg3DCache = state.colorImg3DCache || {}; 

    const colors = (state.meta.colors || []);
    colors.forEach(c => {
        const o = document.createElement('option');
        o.value = c.key;
        o.textContent = `${c.name} (${c.key})`;
        selColor.appendChild(o);

        // 1. โหลดรูป 2D (ของเดิม)
        if (c.imageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = c.imageUrl;
            img.onload = () => {
                state.colorImgCache[c.key] = img;
                scheduleRedraw();
            };
            state.colorImgCache[c.key] = img;
        }

        // ============================================================
        // [NEW] 2. โหลดรูป 3D (ส่วนที่เพิ่มใหม่)
        // เช็คว่ามีลิ้งก์ imagetop3d จาก API หรือไม่
        // ============================================================
        if (c.imagetop3d) {
            const img3d = new Image();
            img3d.crossOrigin = 'anonymous';
            img3d.src = c.imagetop3d;
            // เมื่อโหลดเสร็จ ให้สั่งวาดใหม่เหมือนกัน
            img3d.onload = () => {
                state.colorImg3DCache[c.key] = img3d; 
                scheduleRedraw();
            };
            // เก็บลง Cache ตัวใหม่ ชื่อ state.colorImg3DCache
            state.colorImg3DCache[c.key] = img3d;
        }
    });

    if (selColor.options.length > 0 && !selColor.value) {
        selColor.value = selColor.options[0].value;
    }

    const selLegs = byId('dpb-legs');
    if (selLegs) {
        selLegs.innerHTML = '';
        (state.meta.legs || []).forEach(v => {
            const o = document.createElement('option');
            o.value = v.key;
            o.textContent = v.name;
            selLegs.appendChild(o);
            if (v.imageUrl) {
                state.legImgCache = state.legImgCache || {};
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = v.imageUrl;
                img.onload = () => { state.legImgCache[v.key] = img; };
                state.legImgCache[v.key] = img;
            }
        });
        if (selLegs.options.length > 0 && !selLegs.value) {
            selLegs.value = selLegs.options[0].value;
        }
    }
}

function rebuildLegSelectFromSheet(){
  const legsSel = document.getElementById('dpb-legs');
  if (!legsSel) return;
  const raw = Array.isArray(state?.meta?.legs) ? state.meta.legs : [];
  const isL = isLDeskType();
  let filtered = raw.filter(x => x && String(x.key||'').trim() !== '');
  if (isL){
    filtered = filtered.filter(x => isLegAllowedForLDesk(x.key, x.name));
  }
  const prevKeys = Array.from(legsSel.options).map(o=>o.value);
  const newKeys  = filtered.map(i=>String(i.key));
  const needRebuild = (prevKeys.length !== newKeys.length) ||
                      prevKeys.some((k,idx)=>k!==newKeys[idx]);
  if (needRebuild){
    const current = legsSel.value;
    legsSel.innerHTML = '';
    filtered.forEach(it=>{
      const opt = document.createElement('option');
      opt.value = String(it.key);
      opt.text  = String(it.name || it.key);
      legsSel.appendChild(opt);
    });
    let next = current;
    if (!filtered.some(i=>String(i.key)===current)){
      next = filtered.find(i=>i.key==='square-white')?.key
          || filtered.find(i=>i.key==='square-black')?.key
          || (filtered[0]?.key || '');
    }
    if (next) legsSel.value = next;
  }else{
    const val = legsSel.value;
    if (isL && !filtered.some(i=>i.key===val)){
      const fallback = filtered.find(i=>i.key==='square-white')?.key
                    || filtered.find(i=>i.key==='square-black')?.key
                    || (filtered[0]?.key || '');
      if (fallback) legsSel.value = fallback;
    }
  }
}

function rebuildLegTilesFromSheet(){
  const legsSel  = document.getElementById('dpb-legs');
  const legsHost = document.getElementById('dpb-legs-tiles');
  if (!legsSel || !legsHost) return;
  const deskType = getDeskType();
  const rawLegs = Array.isArray(state?.meta?.legs) ? state.meta.legs : [];
  const filteredLegs = rawLegs.filter(row => {
    if (!row) return false;
    if (!String(row.key||'').trim()) return false;
    return isLegAllowedForType(row, deskType);
  });
  const prevVal = legsSel.value;
  let needBuildSelect = false;
  if (legsSel.options.length !== filteredLegs.length) {
    needBuildSelect = true;
  } else {
    const selKeys  = Array.from(legsSel.options).map(o=>o.value);
    const listKeys = filteredLegs.map(i=>String(i.key));
    needBuildSelect = selKeys.some((k,idx)=>k!==listKeys[idx]);
  }
  if (needBuildSelect){
    legsSel.innerHTML = '';
    filteredLegs.forEach(item=>{
      const opt = document.createElement('option');
      opt.value = String(item.key);
      opt.text  = String(item.name || item.key);
      legsSel.appendChild(opt);
    });
  }
  const coerced = coerceLegSelectionToAllowed(prevVal || legsSel.value, filteredLegs, deskType);
  if (legsSel.value !== coerced) {
    legsSel.value = coerced;
    try{ drawFooter(); }catch(_){}
    try{ measureInfoGrid(); }catch(_){}
    legsSel.dispatchEvent(new Event('change', { bubbles:true }));
    if (typeof scheduleRedraw === 'function') scheduleRedraw();
  }
  legsHost.innerHTML = '';
  legsHost.classList.add('dpb-type-tiles');
  legsHost.setAttribute('aria-label', 'เลือกโครงขา');
  const selectedVal = legsSel.value;
  const onPick = (val)=>{
    if (legsSel.value !== val){
      legsSel.value = val;
      try{ drawFooter(); }catch(_){}
      try{ measureInfoGrid(); }catch(_){}
      legsSel.dispatchEvent(new Event('change', { bubbles:true }));
      if (typeof scheduleRedraw==='function') scheduleRedraw();
    }
  };
  filteredLegs.forEach(item=>{
    const value = String(item.key);
    const label = String(item.name || item.key);
    const img   = String(item.imageUrl || '');
    const isActive = (value === selectedVal);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dpb-type-card';
    btn.setAttribute('data-value', value);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
    btn.innerHTML = `
      <span class="dpb-type-card__chip">
        ${img
          ? `<img decoding="async" loading="lazy" alt="${escapeHtml(label)}" src="${escapeAttr(img)}">`
          : `<span class="dpb-type-card__chip--placeholder">No Image</span>`}
      </span>
      <span class="dpb-type-card__name">${escapeHtml(label)}</span>
    `;
    btn.addEventListener('click', ()=>{
      Array.from(legsHost.querySelectorAll('.dpb-type-card')).forEach(el=>{
        const on = el === btn;
        el.setAttribute('aria-selected', on ? 'true' : 'false');
        el.setAttribute('tabindex', on ? '0' : '-1');
      });
      onPick(value);
      btn.focus();
    });
    btn.addEventListener('keydown', (ev)=>{
      const cards = Array.from(legsHost.querySelectorAll('.dpb-type-card'));
      const i = cards.indexOf(btn);
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault(); btn.click();
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault(); cards[(i+1)%cards.length]?.focus();
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault(); cards[(i-1+cards.length)%cards.length]?.focus();
      }
    });
    legsHost.appendChild(btn);
  });
  if (!legsSel.__dpbLegTilesBound) {
    legsSel.addEventListener('change', ()=>{
      const val = legsSel.value;
      const cards = Array.from(legsHost.querySelectorAll('.dpb-type-card'));
      cards.forEach(el=>{
        const on = (el.getAttribute('data-value') === val);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
        el.setAttribute('tabindex', on ? '0' : '-1');
      });
      try{ drawFooter(); }catch(_){}
      try{ measureInfoGrid(); }catch(_){}
      if (typeof scheduleRedraw==='function') scheduleRedraw();
    });
    legsSel.__dpbLegTilesBound = true;
  }
  if (window.DPB_DEBUG){
    console.log('[DPB][DBG] rebuildLegTilesFromSheet()', {
      deskType,
      total: rawLegs.length,
      allowed: filteredLegs.length,
      selected: legsSel.value
    });
  }
}

(function bindTypeWatcherForLegTiles(){
  const typeSel = document.getElementById('dpb-type');
  if (!typeSel) return;
  if (typeSel.__dpbLegFilterBound) return;
  typeSel.addEventListener('change', ()=>{
    rebuildLegTilesFromSheet();
  });
  typeSel.__dpbLegFilterBound = true;
})();

rebuildLegSelectFromSheet();
rebuildLegTilesFromSheet();

byId('dpb-type')?.addEventListener('change', ()=>{
  rebuildLegSelectFromSheet();
  rebuildLegTilesFromSheet();
  if (typeof scheduleRedraw==='function') scheduleRedraw();
});

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

function escapeAttr(s){
  return String(s).replace(/["'<>\s]/g, c=>({'"':'&quot;', "'":'&#39;', '<':'%3C', '>':'%3E', ' ':'%20'}[c]||c));
}

function getVariantDefaults(optKey, variantName){
  try{
    const opt = (state?.meta?.options||[]).find(o=>o.key===optKey);
    if(!opt) return null;
    const baseW = Number(opt.defaultWcm||0);
    const baseH = Number(opt.defaultHcm||0);
    if(!variantName){
      return { wcm: baseW, hcm: baseH, source: 'option' };
    }
    const vList = Array.isArray(opt.variants)? opt.variants : [];
    const v = vList.find(v=>String(v.name).trim() === String(variantName).trim());
    if(v && (Number.isFinite(v.defaultWcm) || Number.isFinite(v.defaultHcm))){
      const w = Number.isFinite(v.defaultWcm) ? v.defaultWcm : baseW;
      const h = Number.isFinite(v.defaultHcm) ? v.defaultHcm : baseH;
      return { wcm: w, hcm: h, source: 'variant' };
    }
    return { wcm: baseW, hcm: baseH, source: 'option' };
  }catch(_){
    return null;
  }
}

function applyVariantToOptConfig(optKey, cartItemEl, wcm, hcm){
  if(!state || !state.optConfig) return;
  const bucket = state.optConfig[optKey];
  if(!Array.isArray(bucket) || bucket.length===0) return;
  let foundIdx = -1;
  const uidFromDom = cartItemEl?.dataset?.uid || '';
  if(uidFromDom){
    foundIdx = bucket.findIndex(it => String(it?.uid||'') === String(uidFromDom));
  }
  if(foundIdx < 0){
    const siblings = Array.from(cartItemEl?.parentElement?.querySelectorAll('.dpb-cart-item[data-opt-key="'+optKey+'"]') || []);
    const guessIdx = siblings.indexOf(cartItemEl);
    if(guessIdx >= 0 && guessIdx < bucket.length){
      foundIdx = guessIdx;
    }
  }
  if(foundIdx < 0) foundIdx = 0;
  const cfg = bucket[foundIdx];
  if(!cfg || typeof cfg !== 'object') return;
  const w_cm = Number.isFinite(+wcm) ? +wcm : undefined;
  const h_cm = Number.isFinite(+hcm) ? +hcm : undefined;
  const toMm = v => Number.isFinite(v) ? Math.round(v*10*1000)/1000 : undefined;
  if(Number.isFinite(w_cm)) cfg.wcm = w_cm;
  if(Number.isFinite(h_cm)) cfg.hcm = h_cm;
  const dia_cm = Number.isFinite(w_cm) ? w_cm : (Number.isFinite(h_cm) ? h_cm : undefined);
  const dia_mm = toMm(dia_cm);
  const rad_cm = Number.isFinite(dia_cm) ? (dia_cm/2) : undefined;
  const rad_mm = toMm(rad_cm);
  if(Number.isFinite(dia_cm)){
    cfg.diameterCm        = dia_cm;
    cfg.hole_diameter_cm = dia_cm;
    cfg.sizeCm            = dia_cm;
    cfg.d                 = dia_cm;
    cfg.radiusCm          = rad_cm;
    cfg.r                 = rad_cm;
  }
  if(Number.isFinite(dia_mm)){
    cfg.diameterMm        = dia_mm;
    cfg.hole_diameter_mm = dia_mm;
    cfg.d_mm              = dia_mm;
    cfg.size              = dia_mm;
  }
  if(Number.isFinite(rad_mm)){
    cfg.radiusMm          = rad_mm;
    cfg.r_mm              = rad_mm;
  }
  if(!cfg.type){
    if(/grommet|hole|วงกลม|กลม/i.test(optKey)) cfg.type = 'circle';
  }
  const activeSel = cartItemEl?.querySelector('select.dpb-variant-select, input.dpb-variant-radio:checked');
  if(activeSel) cfg.variantName = activeSel.value;
}

function applyVariantDefaultsToCard(optKey, card, variantName){
  if(!card) return;
  const index = Number(card.dataset.index);
  const cfg   = state.optConfig?.[optKey]?.[index];
  if(!cfg) return;
  const d = getVariantDefaults(optKey, variantName);
  if(!d) return;
  const wcm = Number.isFinite(+d.wcm) ? +d.wcm : 0;
  const hcm = Number.isFinite(+d.hcm) ? +d.hcm : 0;
  cfg.w = wcm;
  cfg.h = hcm;
  const inpW = card.querySelector('input[name="w"]');
  const inpH = card.querySelector('input[name="h"]');
  if(inpW) inpW.value = String(wcm);
  if(inpH) inpH.value = String(hcm);
  applyVariantToOptConfig(optKey, card, wcm, hcm);
}

function buildTopColorTilesGroupedSafe(){
    const wrap = document.getElementById('dpb-top-color-tiles');
    const sel  = document.getElementById('dpb-top-color');
    if(!wrap || !sel) return;
    
    wrap.innerHTML = '';
    const colors = Array.isArray(state?.meta?.colors) ? state.meta.colors : [];
    if(!colors.length) return;

    // 1. เพิ่ม key 'whiteboard' เข้าไปใน object เก็บกลุ่มข้อมูล
    const groups = { laminate: [], solid: [], solidwood: [], whiteboard: [] };

    colors.forEach(c=>{
        const g = String(c.group||'').trim().toLowerCase();
        // 2. เพิ่ม Logic การเช็ค group ที่เป็น 'whiteboard'
        if(g==='laminate') groups.laminate.push(c);
        else if(g==='solid') groups.solid.push(c);
        else if(g==='solidwood') groups.solidwood.push(c);
        else if(g==='whiteboard') groups.whiteboard.push(c);
    });

    // 3. เพิ่ม 'whiteboard' เข้าไปในลำดับการแสดงผล (Order)
    const order  = ['laminate','solid','solidwood', 'whiteboard'];

    // 4. กำหนดชื่อหัวข้อที่จะแสดงบนหน้าเว็บ
    const titles = {
        laminate:  'Particle+Laminate',
		whiteboard: 'Particle+Whiteboard',
        solid:     'Solid',
        solidwood: 'Solid Wood (ไม้แท้)'
        
    };

    order.forEach(key=>{
        const list = groups[key];
        if(!list?.length) return;

        const section = document.createElement('section');
        section.className = 'dpb-color-section';
        section.innerHTML = `
          <h4 class="dpb-color-section__title">${titles[key]}</h4>
          <div class="dpb-color-grid"></div>
        `;
        
        const grid = section.querySelector('.dpb-color-grid');
        
        list.forEach(c=>{
            // เช็คและเพิ่ม option ใน select หากยังไม่มี
            if(!Array.from(sel.options).some(o=>o.value===c.key)){
                const opt = document.createElement('option');
                opt.value = c.key;
                opt.textContent = `${c.name} (${c.key})`;
                sel.appendChild(opt);
            }

            const chip = c.iconUrl || c.imageUrl || '';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dpb-top-swatch';
            btn.dataset.key = c.key;
            // set aria-selected
            btn.setAttribute('aria-selected', (sel.value === c.key) ? 'true' : 'false');
            
            btn.innerHTML = `
              <div class="dpb-top-swatch__chip" style="${chip ? `background-image:url('${chip.replace(/"/g,'&quot;')}')` : ''}"></div>
              <div class="dpb-top-swatch__name">${c.name}</div>
            `;
            grid.appendChild(btn);
        });
        wrap.appendChild(section);
    });

    // Event Listener (ส่วนนี้เหมือนเดิม ไม่มีการแก้ไข Logic)
    if(!wrap.dataset.bound){
        wrap.addEventListener('click', (e)=>{
            const btn = e.target.closest('.dpb-top-swatch');
            if(!btn || !wrap.contains(btn)) return;
            
            const key = btn.dataset.key;
            if(!key) return;

            if(!Array.from(sel.options).some(o=>o.value===key)){
                const found = colors.find(c => c.key === key);
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = found ? `${found.name} (${found.key})` : key;
                sel.appendChild(opt);
            }

            sel.value = key;
            sel.dispatchEvent(new Event('input',  { bubbles:true }));
            sel.dispatchEvent(new Event('change', { bubbles:true }));

            wrap.querySelectorAll('.dpb-top-swatch').forEach(el=>{
                el.setAttribute('aria-selected', el.dataset.key===key ? 'true' : 'false');
            });
            
            if(typeof scheduleRedraw === 'function') scheduleRedraw();
        });
        wrap.dataset.bound = '1';
    }
    
    // Update active state based on current select value
    wrap.querySelectorAll('.dpb-top-swatch').forEach(el=>{
        el.setAttribute('aria-selected', el.dataset.key===sel.value ? 'true' : 'false');
    });
}

    function changeCount(key, delta){
      const item = state.selectedOptions[key] || {count:0};
      const after = Math.max(0, (item.count||0) + delta);
      item.count = after; state.selectedOptions[key]=item;
      ensureOptConfig(key);
      const arr = state.optConfig[key];
      while(arr.length < after){ arr.push(defaultCfgFor(key)); }
      while(arr.length > after){ arr.pop(); }
      if(after === 0){ delete state.uiExpanded[key]; }
      updateCartBadge();
    }

function toggleLDeskExtra(){
  const type = byId('dpb-type').value;
  if(type === 'l2' || type === 'l3'){
    byId('dpb-ldesk-extra').style.display = '';
  }else{
    byId('dpb-ldesk-extra').style.display = 'none';
  }
}

byId('dpb-type').addEventListener('change', toggleLDeskExtra);

toggleLDeskExtra();

    function reflectCard(card){
      const k = card.dataset.key;
      const count = state.selectedOptions[k]?.count || 0;
      const countEl = card.querySelector('.dpb-opt-count');
      if(countEl) countEl.textContent = `${count} ชิ้น`;
      card.classList.toggle('active', count > 0);
    }

function toggleAside(){
  const aside = byId('dpb-aside').value;
  const lowerLeft   = byId('ld_r_step').closest('div');
  const lowerRight  = byId('ld_r_br').closest('div');
  const armLeft     = byId('ld_r_armbl').closest('div');
  const armRight    = byId('ld_r_armbr') ? byId('ld_r_armbr').closest('div') : null;
  if(aside === 'right'){
    lowerLeft.style.display  = '';
    lowerRight.style.display = 'none';
    armLeft.style.display    = '';
    if(armRight) armRight.style.display = '';
  }else{
    lowerLeft.style.display  = 'none';
    lowerRight.style.display = '';
    armLeft.style.display    = '';
    if(armRight) armRight.style.display = '';
  }
}

byId('dpb-aside').addEventListener('change', ()=>{
  toggleAside();
  buildOptConfig();
  refreshAllCartForms();
  scheduleRedraw();
});

toggleAside();

function resetLDeskOnAsideChange(){
  const type = byId('dpb-type').value;
  if (type !== 'l2' && type !== 'l3') return;
  [
    'ld_r_tl',
    'ld_r_tr',
    'ld_r_step',
    'ld_r_br',
    'ld_r_armbl',
    'ld_r_armbr'
  ].forEach(id=>{
    const el = byId(id);
    if (el) el.value = '50';
  });
  const inner = byId('dpb-rInner');
  if (inner) inner.value = '150';
  if (typeof validateInputs === 'function') validateInputs();
  if (typeof scheduleRedraw === 'function') scheduleRedraw();
}

    function updateOptCardCount(key){
      const card = document.querySelector(`.dpb-opt-item[data-key="${CSS.escape(key)}"]`);
      if(!card) return;
      const count = state.selectedOptions[key]?.count || 0;
      const countEl = card.querySelector('.dpb-opt-count');
      if(countEl) countEl.textContent = `${count} ชิ้น`;
      card.classList.toggle('active', count > 0);
    }

function refreshAllOptionCardCounters(){
  const wrap = byId('dpb-opt-list');
  if(!wrap) return;
  wrap.querySelectorAll('.dpb-opt-item').forEach(card=>{
    const key = card.dataset.key;
    const count = state.selectedOptions[key]?.count || 0;
    const countEl = card.querySelector('.dpb-opt-count');
    if(countEl) countEl.textContent = `${count} ชิ้น`;
    card.classList.toggle('active', count > 0);
  });
}

function scrollToTopSmooth(){
  try{
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }catch(_){
    window.scrollTo(0, 0);
  }
}

function bindCartEvents(){
  if(!cartBody){ console.error('[DPB] cartBody missing'); return; }
  if(cartBody.dataset.bound === '1') return;
  cartBody.dataset.bound = '1';
  cartBody.addEventListener('click', (e)=>{
    const rotateBtn = e.target.closest('.dpb-btn-rotate');
    if (rotateBtn) {
        e.preventDefault(); e.stopPropagation();
        const card = rotateBtn.closest('.dpb-cart-item');
        const key = card?.dataset.key;
        const index = Number(card?.dataset.index||0);
        const cfg = state.optConfig[key]?.[index];
        if(cfg) {
            cfg.rotate = !cfg.rotate;
            applyPlacementConstraints(card, cfg);
            if(typeof autoResetMinOffset==='function'){
                autoResetMinOffset(card, cfg, 'x');
                autoResetMinOffset(card, cfg, 'y');
            }
            buildOptConfig(); 
            scheduleRedraw();
        }
        return;
    }
    if(e.target.closest('.dpb-cart-remove')){
      const card = e.target.closest('.dpb-cart-item');
      const key = card.dataset.key;
      const index = Number(card.dataset.index);
      const op = (state.meta.options||[]).find(o=>o.key===key)||{};
      const grouped = card.dataset.grouped === '1';
      const variant = card.dataset.variant || '';
      showMiniRemoveConfirm({
        title: grouped ? `ลบ ${op.name||key} ทั้งหมด?` : `ลบรายการนี้?`,
        onYes: ()=>{
          if(grouped && String(op.type).toLowerCase()==='attach'){
             const bucket = state.optConfig[key]||[];
             let removed=0;
             for(let i=bucket.length-1;i>=0;i--){
               if(String(bucket[i]?.variant)===variant){ bucket.splice(i,1); removed++; }
             }
             const sel = state.selectedOptions[key];
             if(sel) sel.count = Math.max(0, (sel.count||0)-removed);
          }else{
             (state.optConfig[key]||=[]).splice(index,1);
             const sel = state.selectedOptions[key];
             if(sel) sel.count = Math.max(0,(sel.count||0)-1);
          }
          updateCartBadge?.(); buildOptConfig?.(); postProcessCartOrder?.(); scheduleRedraw?.();
        }
      });
      return;
    }
    const qtyBtn = e.target.closest('.dpb-qty__btn');
    if(qtyBtn){
       const card = qtyBtn.closest('.dpb-cart-item');
       const key = card.dataset.key;
       const index = Number(card.dataset.index);
       const action = qtyBtn.dataset.act;
       const op = (state.meta.options||[]).find(o=>o.key===key)||{};
       const grouped = card.dataset.grouped === '1';
       const variant = card.dataset.variant || '';
       const qtyInput = card.querySelector('input[type="number"]');
       const current = Number(qtyInput?.value || 1);
       if(action==='inc'){
          if(grouped) window.incAttachVariantCount(key, variant, op);
          else { 
             state.selectedOptions[key] = state.selectedOptions[key] || { count: 0 };
             state.optConfig[key] = state.optConfig[key] || [];
             state.selectedOptions[key].count += 1;
             state.optConfig[key].push(defaultCfgFor(key));
          }
       } else if(action==='dec'){
          if(grouped){
             if(current<=1) {  }
             else window.decAttachVariantCount(key, variant, op);
          } else {
             showMiniRemoveConfirm({ title:'ลบรายการนี้?', onYes:()=>{
                (state.optConfig[key]||=[]).splice(index,1);
                updateCartBadge?.(); buildOptConfig?.(); scheduleRedraw?.();
             }});
          }
       }
       updateCartBadge?.(); buildOptConfig?.(); scheduleRedraw?.();
    }
  }, true);
  cartBody.addEventListener('input', handleCartInput, true);
  cartBody.addEventListener('change', handleCartInput, true);
}

function ensureOptConfig(key){
  const op = (state.meta.options||[]).find(o=>o.key===key);
  if(!op) return;
  if(!state.optConfig[key]) state.optConfig[key]=[];
  if(state.optConfig[key].length===0) state.optConfig[key].push(defaultCfgFor(key));
}

function defaultCfgFor(key){
  const op = (state.meta.options||[]).find(o=>o.key===key) || {};
  return {
    type: op.type||'hole_rect',
    w: op.defaultWcm||0,
    h: op.defaultHcm||0,
    from:'top', offsetY:5,
    place:'left', offsetX:10,
    variant:(op.variants&&op.variants[0]) ? op.variants[0].name : ''
  };
}

function totalSelectedCount(){
  return Object.values(state.selectedOptions).reduce((sum,item)=>sum + (item?.count||0), 0);
}

function updateCartBadge(){
  const total = totalSelectedCount();
  const desktopBadge = document.getElementById('dpb-cart-count');
  const desktopBtn   = document.getElementById('dpb-cart-button');
  if (desktopBadge) {
      desktopBadge.textContent = total;
      desktopBadge.style.display = (total === 0) ? 'none' : 'flex';
  }
  if (desktopBtn) {
      desktopBtn.classList.toggle('is-empty', total === 0);
  }
  const footerBadge = document.getElementById('dpb-footer-count');
  if (footerBadge) {
      footerBadge.textContent = total;
      footerBadge.style.display = (total === 0) ? 'none' : 'flex';
  }
}

function normVariantName(v){ return String(v||'').trim().toLowerCase(); }

function findVariant(op, name){
  const n = normVariantName(name);
  return (op.variants||[]).find(v => normVariantName(v.name) === n) || null;
}

function getAttachVariantCount(optKey, variantName){
  const bucket = state.optConfig[optKey] || [];
  const N = v => String(v||'').trim().toLowerCase();
  const target = N(variantName);
  let count = 0;
  for (const cfg of bucket){
    if (N(cfg?.variant) === target) count++;
}
  return count;
}

function bindCartEventsOnce(){
  if (cartBody.dataset.boundEditToggle === '1') return;
  cartBody.dataset.boundEditToggle = '1';
  cartBody.addEventListener('click', (e)=>{
    const editBtn = e.target.closest('.dpb-cart-edit');
    if(!editBtn) return;
    const cardEl = editBtn.closest('.dpb-cart-item');
    if(!cardEl) return;
    const key   = cardEl.dataset.key;
    const index = Number(cardEl.dataset.index || 0);
    const ex = cardEl.classList.toggle('is-expanded');
    const form = cardEl.querySelector('.dpb-cart-form');
    if(form){
      form.style.removeProperty('display');
      form.hidden = !ex;
      if(ex){
        const placement = form.querySelector('[data-role="placement"]');
        if(placement){ placement.hidden = false; }
      }
    }
    (state.uiExpanded || (state.uiExpanded = {}));
    (state.uiExpanded[key] || (state.uiExpanded[key] = {}));
    state.uiExpanded[key][index] = ex;
  });
}

function buildOptions(){
  const wrap = document.getElementById('dpb-opt-list');
  if(!wrap){ 
    console.warn('[DPB] #dpb-opt-list not found; skip buildOptions()'); 
    return; 
  }
  wrap.innerHTML = '';
  const opts = (state.meta.options || []);
  opts.forEach(op=>{
    const firstImg = (String(op.imageUrl||'')
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean)[0]) || '';
    const card = document.createElement('div');
    card.className = 'dpb-opt-item';
    card.dataset.key = op.key;
    const qty = state.selectedOptions[op.key]?.count || 0;
    card.innerHTML = `
      <div class="dpb-opt-imgwrap ratio-4-3">
        ${firstImg ? `<img src="${firstImg}" alt="">` : `<div class="noimg">ไม่มีรูป</div>`}
      </div>
      <div class="dpb-opt-name">${op.name}</div>
      <div class="dpb-opt-footer">
        <span class="dpb-opt-count">${qty} ชิ้น</span>
        <button type="button" class="dpb-opt-fab" aria-label="เพิ่ม ${op.name}" title="เพิ่ม ${op.name}">+</button>
      </div>
    `;
    state.selectedOptions[op.key] = state.selectedOptions[op.key] || { count: 0 };
    if(qty > 0) card.classList.add('active');
    wrap.appendChild(card);
  });
  if(!wrap.dataset.bound){
    wrap.dataset.bound = '1';
    wrap.addEventListener('click', e=>{
      const card = e.target.closest('.dpb-opt-item');
      if(!card || !wrap.contains(card)) return;
      const key = card.dataset.key;
      if(typeof window.openVariantModalForOption === 'function'){
          window.openVariantModalForOption(key, { cardEl: card });
      }
    }, true);
  }
}

function buildOptConfig(){
  cartBody.innerHTML='';
  const items = [];
  const ROTATE_SVG = `<svg class="rotate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1959.64 2200"><path d="M407.19,356.87c15.92-24.37,33.42-47.49,52.36-69.2l14.63-15.88c1.23-1.3,2.39-2.68,3.69-3.92l3.84-3.78,7.67-7.55,7.66-7.52,8.02-7.16,8-7.15,3.99-3.57,4.16-3.38,16.61-13.46c5.7-4.28,11.48-8.44,17.19-12.66,5.62-4.33,11.7-8.06,17.57-12.02l8.85-5.87c1.45-1.01,2.99-1.89,4.51-2.79l4.56-2.71,9.11-5.42,4.54-2.71,2.28-1.35,2.34-1.24,18.66-9.93,2.33-1.24c.78-.4,1.59-.76,2.38-1.14l4.78-2.25,9.53-4.5,4.76-2.25c1.59-.74,3.15-1.53,4.79-2.17l9.72-4.03c12.82-5.63,26.11-10.09,39.2-14.81l19.98-6.1,4.98-1.53,5.06-1.28,10.09-2.56c26.91-6.64,54.13-11.61,81.51-13.88,54.66-5.14,109.51-1.67,162.2-9.64,52.77-11.13,103.3-30.23,149.21-56.09,45.96,25.83,87.45,58.43,122.85,96.09,27.55,29.28,51.41,61.62,71.1,95.97l-144.47,83.58,344.46,91.88,92.01-344.39-145.71,84.3c-33.14-45.65-71.75-86.87-114.64-122.42-51.44-42.69-109.03-77.21-169.93-102.15-60.91-25.01-125-40.37-189.34-45.91-64.37-5.74-129.19-1.7-191.34,11.93-31.14,6.52-61.5,15.98-90.94,27.2l-11.01,4.28-5.49,2.14-5.4,2.4-21.52,9.59c-14.04,7.05-28.14,13.84-41.61,21.81l-10.18,5.77c-1.71.93-3.34,2.01-5,3.04l-4.95,3.12-9.88,6.24-4.93,3.12c-.82.53-1.65,1.02-2.45,1.57l-2.39,1.67-19.09,13.37-2.38,1.67-2.31,1.77-4.61,3.56-9.19,7.12-4.59,3.56c-1.53,1.19-3.07,2.35-4.52,3.63l-8.83,7.53c-5.84,5.06-11.85,9.89-17.38,15.3-5.61,5.3-11.26,10.53-16.8,15.86l-16.03,16.59-3.98,4.15-3.8,4.33-7.58,8.65-7.56,8.63-7.16,8.97-7.13,8.97-3.56,4.48c-1.2,1.48-2.26,3.08-3.39,4.62l-13.33,18.57c-17.1,25.21-32.33,51.49-45.64,78.57-12.96,27.28-23.86,55.33-32.85,83.84-8.65,28.65-15.05,57.77-19.72,87.02,8.19-28.5,18.01-56.36,29.84-83.24,12.17-26.74,26.03-52.52,41.6-77.09Z"/><path d="M1552.45,1843.13c-15.92,24.37-33.42,47.49-52.36,69.2l-14.63,15.88c-1.23,1.3-2.39,2.68-3.69,3.92l-3.84,3.78-7.67,7.55-7.66,7.52-8.02,7.16-8,7.15-3.99,3.57-4.16,3.38-16.61,13.46c-5.7,4.28-11.48,8.44-17.19,12.66-5.62,4.33-11.7,8.06-17.57,12.02l-8.85,5.87c-1.45,1.01-2.99,1.89-4.51,2.79l-4.56,2.71-9.11,5.42-4.54,2.71-2.28,1.35-2.34,1.24-18.66,9.93-2.33,1.24c-.78.4-1.59.76-2.38,1.14l-4.78,2.25-9.53,4.5-4.76,2.25c-1.59.74-3.15,1.53-4.79,2.17l-9.72,4.03c-12.82,5.63-26.11,10.09-39.2,14.81l-19.98,6.1-4.98,1.53-5.06,1.28-10.09,2.56c-26.91,6.64-54.13,11.61-81.51,13.88-54.66,5.14-109.51,1.67-162.2-9.64-52.77-11.13-103.3-30.23-149.21-56.09-45.97-25.83-87.45-58.43-122.85-96.09-27.55-29.28-51.41-61.62-71.1-95.97l144.47-83.58-344.46-91.88-92.01,344.39,145.71-84.3c33.14,45.65,71.75,86.87,114.64,122.42,51.44,42.69,109.03,77.21,169.93,102.15,60.91,25.01,124.99,40.37,189.34,45.91,64.37,5.74,129.19,1.7,191.34-11.93,31.14-6.52,61.5-15.98,90.94-27.2l11.01-4.28,5.49-2.14,5.4-2.4,21.52-9.59c14.04-7.05,28.14-13.84,41.61-21.81l10.18-5.77c1.71-.93,3.34-2.01,5-3.04l4.95-3.12,9.88-6.24,4.93-3.12c.82-.53,1.65-1.02,2.45-1.57l2.39-1.67,19.09-13.37,2.38-1.67,2.31-1.77,4.61-3.56,9.19-7.12,4.59-3.56c1.53-1.19,3.07-2.35,4.52-3.63l8.83-7.53c5.84-5.06,11.85-9.89,17.38-15.3,5.61-5.3,11.26-10.53,16.8-15.86l16.03-16.59,3.98-4.15,3.8-4.33,7.58-8.65,7.56-8.63,7.16-8.97,7.13-8.97-3.56,4.48c1.2-1.48,2.26-3.08,3.39-4.62l13.33-18.57c17.1-25.21,32.33-51.49,45.64-78.57,12.96-27.28,23.86-55.33,32.85-83.84,8.65-28.65,15.05-57.77,19.72-87.02-8.19-28.5-18.01-56.36,29.84-83.24-12.17-26.74-26.03-52.52-41.6,77.09Z"/><path d="M52.16,643.64h1855.33c28.79,0,52.16,23.37,52.16,52.16v808.4c0,28.79-23.37,52.16-52.16,52.16H52.16c-28.79,0-52.16-23.37-52.16-52.16v-808.4c0-28.79,23.37-52.16,52.16-52.16Z"/></svg>`;
  Object.keys(state.selectedOptions).forEach(key=>{
    const sel = state.selectedOptions[key];
    if(!sel || sel.count<=0) return;
    const op  = (state.meta.options||[]).find(o=>o.key===key) || {};
    const arr = state.optConfig[key] || [];
    for(let i=0;i<sel.count;i++){
      const cfg = arr[i] || defaultCfgFor(key);
      items.push({ key, index:i, op, cfg });
    }
  });
  if(items.length === 0){
    cartEmpty.style.display='block';
    cartBody.style.display='none';
    return;
  }
  cartEmpty.style.display='none';
  cartBody.style.display='flex';
  const nonAttach = [];
  const attachMap = new Map();
  items.forEach(item=>{
    const { key, op, cfg } = item;
    const isAttach = String(op.type||'').toLowerCase()==='attach';
    const variant  = String(cfg.variant||'').trim();
    if(isAttach){
      const gKey = `${key}::${variant}`;
      if(!attachMap.has(gKey)) attachMap.set(gKey, { key, op, variant, items:[item] });
      else attachMap.get(gKey).items.push(item);
    }else{
      nonAttach.push(item);
    }
  });
  attachMap.forEach(entry=>{
    const { key, op, variant } = entry;
    const vImg = findVariant(op, variant)?.imageUrl || (String(op.imageUrl||'').split(',').map(s=>s.trim()).filter(Boolean)[0]) || '';
    const countNow = getAttachVariantCount(key, variant);
    const card = document.createElement('div');
    card.className = 'dpb-cart-item is-expanded';
    card.dataset.key = key;
    card.dataset.index = '0'; 
    card.dataset.variant = variant;
    card.dataset.grouped = '1';
    card.innerHTML = `
      <div class="dpb-cart-item-header">
        <div class="dpb-cart-thumb">${vImg ? `<img src="${vImg}" alt="">` : '<span>ไม่มีรูป</span>'}</div>
        <div class="dpb-cart-mid">
          <div class="dpb-cart-name">${op.name || key}${(Array.isArray(op.variants)&&op.variants.length>0 && variant) ? ` (${variant})` : ''}</div>
          <div class="dpb-cart-actions">
            <button type="button" class="dpb-cart-edit" disabled style="opacity:0;cursor:not-allowed; display: none;">แก้ไขข้อมูล</button>
            <div class="dpb-qty-mini">
              <button type="button" class="dpb-qty__btn" data-act="dec">−</button>
              <input type="number" value="${countNow}" min="0" inputmode="numeric">
              <button type="button" class="dpb-qty__btn" data-act="inc">+</button>
            </div>
          </div>
        </div>
        <button type="button" class="dpb-cart-remove">${TRASH_SVG}</button>
      </div>
      <div class="dpb-cart-form"></div>`;
    cartBody.appendChild(card);

  });
  nonAttach.forEach(item=>{
    const {key,index,op,cfg} = item;
    const firstImg = (()=>{
      if(cfg.variant){ const match = findVariant(op, cfg.variant); if(match && match.imageUrl) return match.imageUrl; }
      return (String(op.imageUrl||'').split(',').map(s=>s.trim()).filter(Boolean)[0]) || '';
    })();
    const hasVariant = (op.variants && op.variants.length > 0);
    const variantLabel = hasVariant ? (cfg.variant ? ` (${cfg.variant})` : '') : '';
    const showPlacement = true; 
    const card = document.createElement('div');
    card.className = 'dpb-cart-item';
    card.dataset.key = key;
    card.dataset.index = index;
    const placementForm = showPlacement ? `
      <div class="dpb-cart-placement" data-role="placement">
        <div class="dpb-form-row">
          <div>
            <label data-role="label-v">การจัดวางแนวตั้ง</label>
            <select name="from" data-key="${key}" data-index="${index}"></select>
          </div>
          <div>
            <label data-role="label-vlen">ระยะห่าง (cm)</label>
            <input name="offsetY" type="number" step="0.1" value="${Number.isFinite(cfg.offsetY)? cfg.offsetY : 5}" data-key="${key}" data-index="${index}">
          </div>
        </div>
        <div class="dpb-form-row">
          <div>
            <label data-role="label-h">การจัดวางแนวนอน</label>
            <select name="place" data-key="${key}" data-index="${index}"></select>
          </div>
          <div>
            <label data-role="label-hlen">ระยะห่าง (cm)</label>
            <input name="offsetX" type="number" step="0.1" value="${(String(cfg.place).toLowerCase()==='center')? '' : (Number.isFinite(cfg.offsetX)? cfg.offsetX : 10)}" data-key="${key}" data-index="${index}">
          </div>
        </div>
      </div>` : ``;
    const isRotated = !!cfg.rotate;
    const rotateBtnClass = isRotated ? 'dpb-btn-rotate is-active' : 'dpb-btn-rotate';
    const rotateIconClass = isRotated ? 'rotate-icon is-rotated' : 'rotate-icon'; 
    const rotateTitle = isRotated ? 'กลับไปวางท็อปหลัก' : 'หมุนไปวางด้านข้าง';
    const rotateLabel = isRotated ? 'แนวตั้ง' : 'แนวนอน'; 
    const rotateSvgHtml = ROTATE_SVG.replace('class="rotate-icon"', `class="${rotateIconClass}"`);
    const btnHtml = `
       <button type="button" class="${rotateBtnClass}" title="${rotateTitle}" data-act="rotate" style="width:100%;">
          ${rotateSvgHtml} ${rotateLabel}
       </button>
    `;
    const topRow = `
      <div class="dpb-form-row dpb-form-row--2">
        <input type="hidden" name="pos" value="${cfg.pos || 'main'}" data-key="${key}" data-index="${index}">
        ${hasVariant ? `
        <div>
          <label>ตัวเลือก</label>
          <select name="variant" data-key="${key}" data-index="${index}" style="width:100%;">
             ${(op.variants||[]).map(v=>`<option value="${v.name}">${v.name}</option>`).join('')}
          </select>
        </div>
        <div>
           <label>หมุนทิศทาง</label>
           ${btnHtml}
        </div>
        ` : `
        <div style="grid-column: span 2;">
           <label>หมุนทิศทาง</label>
           ${btnHtml}
        </div>
        `}
      </div>
    `;
// --- แก้ไข Logic Admin และ Toggle ใหม่ ---
        const isAdmin = window.wpData && window.wpData.isAdmin;
        let hideDimToggle = '';
        if (isAdmin) {
            const isHideDim = !!cfg.hideDim;
            hideDimToggle = `
            <div class="dpb-hide-dim-wrap" style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" name="hideDim" id="hideDim-${key}-${index}" 
                       data-key="${key}" data-index="${index}" ${isHideDim ? 'checked' : ''} 
                       style="width: 16px; height: 16px; cursor: pointer;">
                <label for="hideDim-${key}-${index}" style=" font-size: 10px; cursor: pointer; color: #d63031; line-height: 1; margin-bottom: 0px; font-weight: 300;">
                    ซ่อนเส้น
                </label>
            </div>`;
        }

        card.innerHTML = `
      <div class="dpb-cart-item-header">
        <div class="dpb-cart-thumb">${firstImg ? `<img decoding="async" src="${firstImg}" alt="">` : '<span>ไม่มีรูป</span>'}</div>
        <div class="dpb-cart-mid">
          <div class="dpb-cart-name">${(op.name || key)}${variantLabel} #${index + 1}</div>
          <div class="dpb-cart-actions">
            ${(hasVariant || showPlacement) ? `<button type="button" class="dpb-cart-edit">แก้ไขข้อมูล</button>` : `<span class="dpb-cart-edit-placeholder"></span>`}
            ${hideDimToggle}
            <div class="dpb-qty-mini dpb-qty-mini--hidden"></div>
          </div>
        </div>
        <button type="button" class="dpb-cart-remove">${TRASH_SVG}</button>
      </div>
      ${(hasVariant || showPlacement) ? `<div class="dpb-cart-form">${topRow}${placementForm}</div>` : ``}
    `;

        const variantSel = card.querySelector('select[name="variant"]');
        if (variantSel) variantSel.value = String(cfg.variant || (op.variants?.[0]?.name || '')).trim();
        if (showPlacement) applyPlacementConstraints(card, cfg);

        const expanded = !!(state.uiExpanded?.[key]?.[index]);
        const form = card.querySelector('.dpb-cart-form');
        if (expanded) {
            card.classList.add('is-expanded');
            if (form) { form.style.removeProperty('display'); form.hidden = false; }
        } else {
            if (form) form.style.display = 'none';
        }

        // Event: แก้ไขข้อมูล
        const btnEdit = card.querySelector('.dpb-cart-edit');
        if (btnEdit) {
            btnEdit.addEventListener('click', (ev) => {
                ev.preventDefault(); ev.stopPropagation();
                const willExpand = !card.classList.contains('is-expanded');
                card.classList.toggle('is-expanded', willExpand);
                const f = card.querySelector('.dpb-cart-form');
                if (f) f.style.removeProperty('display');
                if (willExpand) {
                    try {
                        const currCfg = (state.optConfig[key] || [])[index] || defaultCfgFor(key);
                        applyPlacementConstraints(card, currCfg);
                    } catch (e) { }
                }
                state.uiExpanded[key] = state.uiExpanded[key] || {};
                state.uiExpanded[key][index] = willExpand;
            }, true);
        }

        const hideDimCb = card.querySelector('input[name="hideDim"]');
        if (hideDimCb) {
            hideDimCb.addEventListener('change', (e) => {
                const k = e.target.dataset.key;
                const idx = parseInt(e.target.dataset.index);
                if (state.optConfig[k] && state.optConfig[k][idx]) {
                    state.optConfig[k][idx].hideDim = e.target.checked;
                    if (typeof scheduleRedraw === 'function') scheduleRedraw();
                }
            });
        }

        cartBody.appendChild(card);

['offsetY', 'offsetX'].forEach(fieldName => {
    const inp = card.querySelector(`input[name="${fieldName}"]`);
    if (!inp) return;
    inp.addEventListener('focus', () => {
        window._dpbOptFocus = { key, index, field: fieldName };
        startDimPulse('__opt__');
    });
    inp.addEventListener('blur', () => {
        window._dpbOptFocus = null;
        stopDimPulse();
    });
});
    });

    // ส่วนที่อยู่นอก Loop
    bindCartEventsOnce();
    refreshAllOptionCardCounters();
    if (typeof syncAllVariantDefaultsOnce === 'function') syncAllVariantDefaultsOnce();
    if (typeof scheduleRedraw === 'function') scheduleRedraw();
}

function syncAllVariantDefaultsOnce(){
  document.querySelectorAll('.dpb-cart-item').forEach(item=>{
    const optKey = item?.dataset?.key || '';
    const sel = item.querySelector('select[name="variant"]') 
              || item.querySelector('input.dpb-variant-radio:checked');
    const variantName = sel ? sel.value : '';
    if(!optKey) return;
    applyVariantDefaultsToCard(optKey, item, variantName);
  });
  if(typeof validateInputs==='function') validateInputs();
  if(typeof scheduleRedraw==='function') scheduleRedraw();
}

if (typeof window.incAttachVariantCount !== 'function'){
  window.incAttachVariantCount = function incAttachVariantCount(optKey, variantName, op){
    state.selectedOptions[optKey] = state.selectedOptions[optKey] || { count: 0 };
    state.selectedOptions[optKey].count += 1;
    state.optConfig[optKey] = state.optConfig[optKey] || [];
    state.optConfig[optKey].push({
      ...(typeof defaultCfgFor==='function' ? defaultCfgFor(optKey) : {}),
      type: String(op.type||'attach'),
      variant: Array.isArray(op.variants) && op.variants.length > 0 ? (variantName || '') : '',
      addedAt: Date.now()
    });
    updateCartBadge?.();
    buildOptConfig?.();
    postProcessCartOrder?.();
    scheduleRedraw?.();
  };
}

if (typeof window.decAttachVariantCount !== 'function'){
  window.decAttachVariantCount = function decAttachVariantCount(optKey, variantName, op){
    const bucket = state.optConfig[optKey] || [];
    const nvar = String(variantName||'').trim().toLowerCase();
    for(let i=bucket.length-1;i>=0;i--){
      const bvar = String(bucket[i]?.variant||'').trim().toLowerCase();
      if(bvar === nvar){
        bucket.splice(i,1);
        break;
      }
    }
    const sel = state.selectedOptions[optKey];
    if(sel){
      sel.count = Math.max(0, (sel.count||0)-1);
      if(sel.count===0){ delete state.optConfig[optKey]; delete state.uiExpanded[optKey]; }
    }
    updateCartBadge?.();
    buildOptConfig?.();
    postProcessCartOrder?.();
    scheduleRedraw?.();
  };
}

function moveAttachGroupVariant(optKey, oldVariant, newVariant, op){
  if(oldVariant === newVariant) return;
  const bucket = state.optConfig[optKey] || [];
  bucket.forEach(cfg=>{
    if(String(cfg?.variant||'') === String(oldVariant||'')){
      cfg.variant = newVariant;
    }
  });
  buildOptConfig();
  scheduleRedraw?.();
}

function handleCartClick(e){
  const card  = e.target.closest('.dpb-cart-item');
  if(!card) return;
  const key   = card.dataset.key;
  const index = Number(card.dataset.index || 0);
  const op    = (state.meta.options||[]).find(o=>o.key===key) || {};
  const grouped = card.dataset.grouped === '1';
  const hasVariants = Array.isArray(op.variants) && op.variants.length > 0;
  const variant = String(card.dataset.variant||'').trim();
  if(e.target.closest('.dpb-cart-remove')){
    showMiniRemoveConfirm({
      title: (()=> {
        if(grouped && String(op.type||'').toLowerCase()==='attach'){
          return hasVariants && variant
            ? `ลบ ${op.name || key} (${variant}) ทั้งหมดหรือไม่?`
            : `ลบ ${op.name || key} ทั้งหมดหรือไม่?`;
        }else{
          return hasVariants && variant
            ? `ลบ ${op.name || key} (${variant}) หรือไม่?`
            : `ลบ ${op.name || key} หรือไม่?`;
        }
      })(),
      onYes: ()=>{
        if(grouped && String(op.type||'').toLowerCase()==='attach'){
          const bucket = state.optConfig[key] || [];
          let removed = 0;
          for(let i=bucket.length-1;i>=0;i--){
            if(String(bucket[i]?.variant||'') === String(variant||'')){
              bucket.splice(i,1);
              removed++;
            }
          }
          const sel = state.selectedOptions[key];
          if(sel){
            sel.count = Math.max(0,(sel.count||0) - removed);
            if(sel.count===0){ delete state.optConfig[key]; delete state.uiExpanded[key]; }
          }
        }else{
          (state.optConfig[key] ||= []).splice(index,1);
          const sel = state.selectedOptions[key];
          if(sel){
            sel.count = Math.max(0,(sel.count||0)-1);
            if(sel.count===0){ delete state.optConfig[key]; delete state.uiExpanded[key]; }
          }
        }
        updateCartBadge?.();
        buildOptConfig?.();
        postProcessCartOrder?.();
        scheduleRedraw?.();
      },
      onNo: ()=>{}
    });
    return;
  }
}

function handleCartInput(e){
  const target = e.target;
  if(!target.dataset.key) {
    const card = target.closest('.dpb-cart-item');
    if(card && target.name === 'variant'){
       const key = card.dataset.key;
       const op  = (state.meta.options||[]).find(o=>o.key===key) || {};
       const isAttach = String(op.type||'').toLowerCase()==='attach';
       const grouped = card.dataset.grouped === '1';
       if(isAttach && grouped){
          const oldVariant = card.dataset.variant || '';
          const newVariant = target.value || '';
          if(oldVariant !== newVariant){
             if(typeof moveAttachGroupVariant === 'function'){
                moveAttachGroupVariant(key, oldVariant, newVariant, op);
             }
          }
          return;
       }
    }
    return;
  }
  const key = target.dataset.key;
  const index = Number(target.dataset.index);
  const cfg = state.optConfig[key]?.[index];
  if(!cfg) return;
  const op = (state.meta.options||[]).find(o=>o.key===key) || {};
  const card = cartBody.querySelector(`.dpb-cart-item[data-key="${CSS.escape(key)}"][data-index="${index}"]`);
  if(!card) return;
  switch(target.name){
    case 'w': 
        cfg.w = +target.value || 0; 
        break;
    case 'h': 
        cfg.h = +target.value || 0; 
        break;
    case 'offsetY': 
        cfg.offsetY = +target.value || 0; 
        break;
    case 'offsetX': 
        if(cfg.place !== 'center') cfg.offsetX = +target.value || 0; 
        break;
    case 'variant':
        cfg.variant = target.value;
        updateCartThumbVariant(card, op, cfg);
        if(typeof applyVariantDefaultsToCard === 'function'){
            applyVariantDefaultsToCard(key, card, cfg.variant);
        }
        applyPlacementConstraints(card, cfg);
        scheduleRedraw();
        break;
    case 'from':
        cfg.from = target.value;
        applyPlacementConstraints(card, cfg); 
        scheduleRedraw();
        break;
    case 'place':
        cfg.place = target.value;
        applyPlacementConstraints(card, cfg);
        scheduleRedraw();
        break;
    case 'pos':
        cfg.pos = target.value;
        applyPlacementConstraints(card, cfg);
        scheduleRedraw();
        break;
  }
  if(typeof syncCartItemState === 'function') syncCartItemState(card, cfg, op);
  if(typeof scheduleRedraw === 'function') scheduleRedraw();
}

function autoResetMinOffset(card, cfg, axis){
  const mins = (typeof minOffsetsFor === 'function') 
    ? minOffsetsFor(cfg) 
    : { minYTop:5, minYBottom:5, minXLeft:10, minXRight:10 };
  if(axis === 'y'){
    const f = String(cfg.from || '').toLowerCase();
    const isStart = (f === 'top' || f === 'left');
    const val = isStart ? mins.minYTop : mins.minYBottom;
    cfg.offsetY = val;
    const input = card.querySelector('input[name="offsetY"]');
    if(input) input.value = String(val);
  }
  if(axis === 'x'){
    const p = String(cfg.place || '').toLowerCase();
    if(p === 'center') return;
    const isStart = (p === 'left' || p === 'top');
    const val = isStart ? mins.minXLeft : mins.minXRight;
    cfg.offsetX = val;
    const input = card.querySelector('input[name="offsetX"]');
    if(input) input.value = String(val);
  }
}

function refreshAllCartPlacementForms(){
  const cards = cartBody.querySelectorAll('.dpb-cart-item');
  cards.forEach(card=>{
    const key = card.dataset.key;
    const index = Number(card.dataset.index);
    const cfg = state.optConfig[key]?.[index];
    if(!cfg) return;
    applyPlacementConstraints(card, cfg);
  });
}

function updateCartThumbVariant(card, op, cfg){
  const img = (()=>{
    if(cfg.variant){
      const match = findVariant(op, cfg.variant);
      if(match && match.imageUrl) return match.imageUrl;
    }
    return (String(op.imageUrl||'').split(',').map(s=>s.trim()).filter(Boolean)[0]) || '';
  })();
  const th = card.querySelector('.dpb-cart-thumb img');
  if(th && img){ th.src = img; }
}

function syncCartItemState(card, cfg, op){
  var placement = card.querySelector('[data-role="placement"]');
  var note = card.querySelector('[data-role="note"]');
  var ready = (typeof window.isPlacementReady === 'function')
    ? window.isPlacementReady(cfg, op)
    : true;
  if (placement) placement.hidden = !ready;
  if (note) note.style.display = ready ? 'none' : '';
}

    function rebuildOptionCardsAfterChange(key){
      if(!state.selectedOptions[key] || state.selectedOptions[key].count<=0){
        state.selectedOptions[key] = {count:0};
      }
      updateOptCardCount(key);
      updateCartBadge();
      buildOptConfig();
      postProcessCartOrder?.(); 
      scheduleRedraw();
    }

    function animateOptionToCart(card){
      const img = card.querySelector('.dpb-opt-imgwrap img');
      if(!img) return;
      const clone = img.cloneNode(true);
      const imgRect = img.getBoundingClientRect();
      const cartRect = cartButton.getBoundingClientRect();
      clone.style.position = 'fixed';
      clone.style.left = imgRect.left + 'px';
      clone.style.top = imgRect.top + 'px';
      clone.style.width = imgRect.width + 'px';
      clone.style.height = imgRect.height + 'px';
      clone.style.borderRadius = '12px';
      clone.style.zIndex = '10010';
      clone.style.pointerEvents = 'none';
      clone.style.transition = 'transform .55s ease, opacity .55s ease, left .55s ease, top .55s ease, width .55s ease, height .55s ease';
      document.body.appendChild(clone);
      requestAnimationFrame(()=>{
        const targetX = cartRect.left + cartRect.width/2 - imgRect.width*0.2;
        const targetY = cartRect.top + cartRect.height/2 - imgRect.height*0.2;
        clone.style.left = targetX + 'px';
        clone.style.top = targetY + 'px';
        clone.style.width = imgRect.width*0.4 + 'px';
        clone.style.height = imgRect.height*0.4 + 'px';
        clone.style.opacity = '0';
      });
      clone.addEventListener('transitionend', ()=> clone.remove(), {once:true});
    }

    const canvas = byId('dpb-canvas');
    const ctx = canvas.getContext('2d');

    function patFor(key){
      const img=state.colorImgCache[key];
      if(!img || !img.complete) return null;
      try{return ctx.createPattern(img,'repeat');}catch(e){return null;}
    }

function getDeskBottomPaddingCm(){
  const t = document.getElementById('dpb-type')?.value;
  if(t === 'custom_manual') return 7.35;
  return 0;
}

function measureTotalHeight() {
    // [FIX PART 1] กำหนดความสูงสำหรับ 3D ให้ชัดเจน
    if (window.dpbViewMode === '3d') {
        // คืนค่าความสูงที่ต้องการสำหรับ 3D (1200px กำลังสวยสำหรับจอส่วนใหญ่)
        return 1000; 
    }

    // --- ส่วนล่างนี้เป็น Logic เดิมสำหรับ 2D (ห้ามแก้) ---
    const byId = function(id) { return document.getElementById(id); };
    const t = byId('dpb-type')?.value || 'rect';
    
    let deskH = (t==='l2'||t==='l3') ? (typeof ldeskHeight === 'function' ? ldeskHeight() : 500) : (typeof rectDeskHeight === 'function' ? rectDeskHeight() : 500);
    
    if (!isFinite(deskH) || deskH < 0) deskH = 0;
    const MAX_DESK_H = (typeof RAW_MAX_DESK_H !== 'undefined') ? RAW_MAX_DESK_H : 4096;
    deskH = Math.min(deskH, MAX_DESK_H);
    
    const HEADER_RESERVED_HEIGHT = 150; 
    const DESK_BOTTOM_SPACE      = 80; 
    const GAP_BETWEEN_OPTS       = 0; 
    const BOTTOM_PADDING_FINAL   = 40;  

    const sc = (typeof deskScale === 'function') ? deskScale() : 1;
    const extraCm = (typeof getDeskBottomPaddingCm === 'function') ? getDeskBottomPaddingCm() : 0;
    const extraPx = extraCm * sc;

    let optH = 0;
    const items = (typeof getItems === 'function') ? getItems() : [];
    
    if (items.length > 0) {
        const canvas = document.getElementById('dpb-canvas') || document.querySelector('canvas');
        if(canvas) {
            const totalInnerW = canvas.width - ((typeof PAD !== 'undefined' && PAD.left ? PAD.left : 0) + (typeof PAD !== 'undefined' && PAD.right ? PAD.right : 0));
            const cw  = Math.max(1, (typeof CARD!=='undefined'?CARD.cardW:160)|0);
            const cgap = Math.max(0, (typeof CARD!=='undefined'?CARD.gap:0)|0);
            const ch  = Math.max(0, (typeof CARD!=='undefined'?CARD.imgH:120)|0);
            const textH = (typeof OPTCARD!=='undefined'?OPTCARD.textH:44);
            
            let perRow = Math.max(1, Math.floor((totalInnerW + cgap) / (cw + cgap)));
            perRow = Math.min(perRow, items.length);
            const rows = Math.ceil(items.length / perRow);
            
            optH = rows * (ch + textH) + Math.max(0, rows-1) * cgap;
            
            const MAX_OPT_H = (typeof RAW_MAX_OPT_H !== 'undefined') ? RAW_MAX_OPT_H : 6000;
            optH = Math.min(optH, MAX_OPT_H);
        }
    }
    
    let total = HEADER_RESERVED_HEIGHT + deskH + extraPx + DESK_BOTTOM_SPACE + GAP_BETWEEN_OPTS + optH + BOTTOM_PADDING_FINAL;
    
    const MAX_CANVAS = (typeof GLOBAL_MAX_CANVAS !== 'undefined') ? GLOBAL_MAX_CANVAS : 12000;
    return Math.min(MAX_CANVAS, Math.ceil(total));
}


function drawOptionsGridInBox(x, y, boxW){
  const items = (typeof getItems === 'function') ? getItems() : [];
  if(items.length === 0) return {h: 0, rows:0};
  const cw  = Math.max(1, (typeof CARD!=='undefined'?CARD.cardW:160)|0);
  const ch  = Math.max(0, (typeof CARD!=='undefined'?CARD.imgH:120)|0);
  const gap = Math.max(0, (typeof CARD!=='undefined'?CARD.gap:0)|0);
  const textH = (typeof OPTCARD!=='undefined'?OPTCARD.textH:44);
  const cardH = ch + textH;
  if(boxW < cw) return {h: 0, rows:0};
  let perRow = Math.max(1, Math.floor((boxW + gap) / (cw + gap)));
  perRow = Math.min(perRow, items.length);
  const rows = Math.ceil(items.length / perRow);
  let idx = 0;
  let yCursor = y;
  const getImg = (url)=>{
    if(!url) return null;
    window.state = window.state || {};
    state.optImgCache = state.optImgCache || {};
    const cache = state.optImgCache[url];
    if(cache && cache.complete) return cache;
    if(!cache){
      const im = new Image(); im.crossOrigin = 'anonymous'; im.src = url;
      im.onload = ()=>{ if(typeof scheduleRedraw==='function') scheduleRedraw(); };
      state.optImgCache[url] = im;
    }
    return state.optImgCache[url].complete ? state.optImgCache[url] : null;
  };
  for(let r=0; r<rows; r++){
    const countThisRow = Math.min(perRow, items.length - idx);
    const rowWidth = countThisRow * cw + (countThisRow - 1) * gap;
    const startX = x + Math.max(0, (boxW - rowWidth) / 2);
    for(let i=0; i<countThisRow; i++){
      const it = items[idx++];
      const cx = startX + i*(cw+gap);
      const cy = yCursor;
      ctx.save();
      if(typeof CARD !== 'undefined' && CARD.shadow){
          ctx.shadowColor = CARD.shadow; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      }
      ctx.fillStyle = '#ffffff';
      const rad = (typeof CARD!=='undefined'?CARD.radius:14);
      if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(cx, cy, cw, cardH, rad); ctx.fill(); } 
      else { ctx.fillRect(cx, cy, cw, cardH); }
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + rad, cy);
      ctx.lineTo(cx + cw - rad, cy);
      ctx.quadraticCurveTo(cx + cw, cy, cx + cw, cy + rad);
      ctx.lineTo(cx + cw, cy + ch);
      ctx.lineTo(cx,        cy + ch);
      ctx.lineTo(cx,        cy + rad);
      ctx.quadraticCurveTo(cx, cy, cx + rad, cy);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(cx, cy, cw, ch);
      const im = getImg(it.img);
      if(im && typeof drawImageCover === 'function'){ drawImageCover(im, cx, cy, cw, ch); }
      ctx.restore();
      if((it.count||0) > 0){
        const pad = (typeof OPTCARD!=='undefined'?OPTCARD.badgePad:8);
        const R   = (typeof OPTCARD!=='undefined'?OPTCARD.badgeR:11);
        const bx = cx + cw - pad - R, by = cy + pad + R;
        ctx.save();
        ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI*2);
        ctx.fillStyle = '#000'; ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '400 12px Prompt, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(it.count), bx, by + 0.5);
        ctx.restore();
      }
      ctx.save();
      ctx.textAlign = 'center';
      const textAreaTop = cy + ch;
      const textAreaCenter = textAreaTop + (textH / 2);
      const hasVariant = (it.detail || '').trim().length > 0;
      if (hasVariant) {
          ctx.font = (typeof OPTCARD!=='undefined'?OPTCARD.nameFont:'400 13px Prompt, sans-serif');
          ctx.fillStyle = (typeof UI_INK!=='undefined'?UI_INK:'#a37d13');
          ctx.textBaseline = 'bottom'; 
          ctx.fillText(it.name || '', cx + cw/2, textAreaCenter - 1);
          ctx.font = (typeof OPTCARD!=='undefined'?OPTCARD.variantFont:'400 12px Prompt, sans-serif');
          ctx.fillStyle = '#000';
          ctx.textBaseline = 'top';
          ctx.fillText(it.detail, cx + cw/2, textAreaCenter + 1);
      } else {
          ctx.font = (typeof OPTCARD!=='undefined'?OPTCARD.nameFont:'400 13px Prompt, sans-serif');
          ctx.fillStyle = (typeof UI_INK!=='undefined'?UI_INK:'#a37d13');
          ctx.textBaseline = 'middle';
          ctx.fillText(it.name || '', cx + cw/2, textAreaCenter);
      }
      ctx.restore();
    }
    yCursor += (cardH + gap);
  }
  const totalH = rows * cardH + Math.max(0, rows-1) * gap;
  return { h: totalH, rows };
}

state.theme = state.theme || {};
if (typeof state.theme.userPickedIn  === 'undefined') state.theme.userPickedIn  = false;
if (typeof state.theme.userPickedOut === 'undefined') state.theme.userPickedOut = false;

function DPB_detectTopName(){
  try{
    const elC = document.getElementById('dpb-top-color');
    if (elC){
      const opt = elC.selectedOptions && elC.selectedOptions[0];
      if (opt && opt.text) return String(opt.text);
      if (elC.value) return String(elC.value);
    }
    const el = document.getElementById('dpb-top');
    if (el){
      const opt = el.selectedOptions && el.selectedOptions[0];
      if (opt && opt.text) return String(opt.text);
      if (el.value) return String(el.value);
    }
    if (state?.theme?.topName) return String(state.theme.topName);
    if (state?.selection?.top?.name) return String(state.selection.top.name);
    if (Array.isArray(state?.meta?.tops)){
      const row = state.meta.tops.find(r => r?.selected || r?.active);
      if (row?.name) return String(row.name);
    }
  }catch(_){}
  return '';
}



function computeAutoInColorFromTop(){
  const rawName = DPB_detectTopName();
  if (!rawName) return '#000000';
  const key = rawName.toLowerCase()
    .replace(/\(.*?\)/g,'')
    .replace(/\s+/g,' ')
    .trim();
  let pick = WM_TOP_COLOR_MAP[key];
  if(!pick){
    for (const w of Object.keys(WM_TOP_COLOR_MAP)){
      if (key.includes(w)) { pick = WM_TOP_COLOR_MAP[w]; break; }
    }
  }
  return (pick === 'white') ? '#ffffff' : '#000000';
}

function setColorGroupSelection(id, value){
  const group = document.getElementById(id);
  if(!group) return;
  const buttons = group.querySelectorAll('button');
  buttons.forEach(b=>{
    const on = (b.dataset.value === value);
    b.classList.toggle('active', on);
  });
  group.dataset.selected = value;
}

function DPB_syncColorGroup(id, hex){
  const g = document.getElementById(id); if (!g) return;
  const btns = g.querySelectorAll('button');
  btns.forEach(b=>b.classList.remove('active'));
  const match = Array.from(btns).find(b => (b.dataset.value||'').toLowerCase() === String(hex).toLowerCase());
  if (match){ match.classList.add('active'); g.dataset.selected = hex; }
}

function getInColor(){
  if (state?.theme?.userPickedIn) {
    return state.theme.colorIn
        || document.getElementById('dpb-color-in')?.dataset.selected
        || '#000000';
  }
  return computeAutoInColorFromTop();
}

function getOutColor(){
  return state?.theme?.colorOut
      || document.getElementById('dpb-color-out')?.dataset.selected
      || '#000000';
}

function applyAutoInColorIfNeeded(){
  if (state?.theme?.userPickedIn) return;
  const auto = computeAutoInColorFromTop();
  setColorGroupSelection('dpb-color-in', auto);
  state.theme = state.theme || {};
  state.theme.colorIn = auto;
}

(function wrapScheduleRedrawOnce(){
  if (window.__WRAPPED_SREDRAW) return;
  window.__WRAPPED_SREDRAW = true;
  const _orig = scheduleRedraw;
  window.scheduleRedraw = function(){
    try{ applyAutoInColorIfNeeded(); }catch(_){}
    _orig();
  };
})();

(function attachColorInPickHandler(){
  const group = document.getElementById('dpb-color-in');
  if (!group) return;
  group.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.theme = state.theme || {};
      state.theme.userPickedIn = true;
      state.theme.colorIn = btn.dataset.value || '#000000';
      if (typeof scheduleRedraw === 'function') scheduleRedraw();
    });
  });
})();

(function attachTopChangeAuto(){
  const el = document.getElementById('dpb-top-color') || document.getElementById('dpb-top');
  if (!el) return;
  el.addEventListener('change', ()=>{
    if (!state?.theme?.userPickedIn){
      applyAutoInColorIfNeeded();
      if (typeof scheduleRedraw === 'function') scheduleRedraw();
    }else{
      if (typeof scheduleRedraw === 'function') scheduleRedraw();
    }
  });
})();

window.__DPB_WM__ = window.__DPB_WM__ || {
  anchor: null,
  sc: 1,
  opts: {
    enabled:   true,
    opacity:   0.28,
    original:  false,
    black:     true,
    white:     false,
    scaleRatio: 0.40,
    debug:     false,
    autoColor: true
  },
  img: null,
  loading: false
};

function DPB__loadWMImage(onload){
  const S = window.__DPB_WM__;
  
  const topKey = document.getElementById('dpb-top-color')?.value || '';
  const colorObj = (state?.meta?.colors || []).find(c => c.key === topKey);
  const isWhiteboard = String(colorObj?.group || '').trim().toLowerCase() === 'whiteboard';
  
  // เก็บสถานะไว้ใน Object Global เพื่อให้ฟังก์ชันวาดนำไปใช้
  if (S) S.isWhiteboardMode = isWhiteboard;

  let targetLogoUrl = isWhiteboard 
    ? 'https://www.deskspace.in.th/wp-content/uploads/2026/02/Logo-DeskSpace-WhiteBoard.png' 
    : BRAND_LOGO_URL;

  // Proxy the logo image through the local AJAX proxy to bypass CORS
  const ajaxUrl = (typeof window.dsAdminMode !== 'undefined' && window.dsAdminMode.ajaxUrl) 
    ? window.dsAdminMode.ajaxUrl 
    : (typeof AJAX_URL !== 'undefined' ? AJAX_URL : (window.location.origin + '/test-site/wp-admin/admin-ajax.php'));

  let cleanAjaxUrl = ajaxUrl;
  if (cleanAjaxUrl.includes('localhost')) {
    cleanAjaxUrl = cleanAjaxUrl.replace(/https?:\/\/localhost/ig, window.location.origin);
  }
  
  if (targetLogoUrl && targetLogoUrl.includes('deskspace.in.th')) {
    targetLogoUrl = cleanAjaxUrl + '?action=ds_image_proxy&url=' + encodeURIComponent(targetLogoUrl);
  }

  if (S.img && S.img.complete && S.img.getAttribute('data-current-url') === targetLogoUrl) return S.img;
  if (S.loading && S.img.getAttribute('data-current-url') === targetLogoUrl) return S.img;

  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.setAttribute('data-current-url', targetLogoUrl);
  
  im.onload = function(){ 
    S.loading = false; 
    if(typeof onload==='function') onload(); 
  };
  im.onerror = function(){ S.loading = false; };
  
  S.loading = true;
  im.src = targetLogoUrl;
  S.img = im;
  return im;
}

function DPB_setWatermarkAnchor(rect1, sc){
  try{
    if (!rect1 || !isFinite(rect1.x) || !isFinite(rect1.y) || !isFinite(rect1.w) || !isFinite(rect1.h)) return;
    window.__DPB_WM__.anchor = { x: rect1.x, y: rect1.y, w: rect1.w, h: rect1.h };
    window.__DPB_WM__.sc = +sc || 1;
  }catch(_){}
}

function DPB_setWatermarkOptions({ enabled, opacity, original, black, white, scaleRatio, debug } = {}){
  const S = window.__DPB_WM__.opts;
  if (typeof enabled    === 'boolean') S.enabled    = enabled;
  if (typeof opacity    === 'number')  S.opacity    = Math.max(0, Math.min(1, opacity));
  if (typeof scaleRatio === 'number')  S.scaleRatio = Math.max(0.05, Math.min(1, scaleRatio));
  if (typeof debug      === 'boolean') S.debug      = debug;
  const flags = { original, black, white };
  const asked = Object.keys(flags).filter(k => typeof flags[k] === 'boolean');
  if (asked.length){
    S.original = false; S.black = false; S.white = false;
    for (const k of asked){ if (flags[k]) { S[k] = true; } }
    if (!S.original && !S.black && !S.white) S.original = true;
  }
}

function DPB_toggleWatermark(on){ DPB_setWatermarkOptions({ enabled: !!on }); }

function DPB_debugWatermark(on){  DPB_setWatermarkOptions({ debug: !!on });  }

function DPB_applyWatermarkAutoColor(){
  try{
    if (!window.__DPB_WM__?.opts?.autoColor) return;
    const rawName = DPB_detectTopName();
    if (!rawName) return;
    const key = rawName.toLowerCase().replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim();
    let pick = WM_TOP_COLOR_MAP[key];
    if (!pick){
      for (const k of Object.keys(WM_TOP_COLOR_MAP)){
        if (key.includes(k)) { pick = WM_TOP_COLOR_MAP[k]; break; }
      }
    }
    if (!pick) return;
    if (pick === 'black'){
      DPB_setWatermarkOptions({ original:false, black:true,  white:false });
    }else{
      DPB_setWatermarkOptions({ original:false, black:false, white:true  });
    }
  }catch(_){}
}

function DPB_drawBrandWatermark_OnTop() {
    // 1. ตรวจสอบตัวแปร Global
    const WM = window.__DPB_WM__;
    if (!WM) return; 

    const A = WM.anchor;
    if (!WM?.opts?.enabled || !A) return;

    // 2. โหลดภาพ (ซึ่งตอนนี้ DPB__loadWMImage จะเลือกรูปตามประเภทท็อปให้เราแล้ว)
    const im = DPB__loadWMImage(() => {
        try { scheduleRedraw(); } catch (_) { }
    });
    if (!im || !im.complete) return;

    // 3. คำนวณขนาดภาพ
    const ratio = Math.max(0.05, Math.min(1, WM.opts.scaleRatio || 0.3));
    let w = A.w * ratio;
    let h = w * (im.naturalHeight / Math.max(1, im.naturalWidth));

    // ปรับขนาดถ้าสูงเกินพื้นที่
    if (h > A.h) {
        h = A.h;
        w = h * (im.naturalWidth / Math.max(1, im.naturalHeight));
    }

    const x = A.x + (A.w - w) / 2;
    const y = A.y + (A.h - h) / 2;

    // 4. จัดการเรื่องสีของ Logo (Black / White / Original)
    let srcCanvas = im;
    if (!WM.opts.original) {
        const off = document.createElement('canvas');
        off.width = Math.max(1, Math.round(w));
        off.height = Math.max(1, Math.round(h));
        const octx = off.getContext('2d');
        octx.drawImage(im, 0, 0, off.width, off.height);
        octx.globalCompositeOperation = 'source-atop';
        octx.fillStyle = WM.opts.white ? '#fff' : '#000';
        octx.fillRect(0, 0, off.width, off.height);
        octx.globalCompositeOperation = 'source-over';
        srcCanvas = off;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // --- [ส่วนที่แก้ไข: แยกความจางของ Whiteboard] ---
    // ดึงค่าปกติจากระบบมาก่อน (เช่น 0.8 หรือ 1.0)
    let finalOpacity = Math.max(0, Math.min(1, WM.opts.opacity)); 

    // ถ้าตรวจพบว่าเป็นโหมด Whiteboard ให้ใช้ค่าความจางที่ต้องการแยกต่างหาก
    if (WM.isWhiteboardMode) {
        finalOpacity = 0.8; // <--- แก้ไขความจางของ Logo Whiteboard ได้ที่นี่ (0.0 - 1.0)
    }
    
    ctx.globalAlpha = finalOpacity;
    // ----------------------------------------------

    ctx.drawImage(srcCanvas, x, y, w, h);

    // 5. ส่วน Debug สำหรับตรวจสอบ (ถ้าเปิดไว้)
    if (WM.opts.debug) {
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff2d55';
        ctx.strokeRect(A.x, A.y, A.w, A.h);
        ctx.strokeStyle = '#007aff';
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#007aff';
        ctx.font = '500 12px Prompt,sans-serif';
        ctx.fillText(
            `WM ${Math.round(finalOpacity * 100)}% • ${WM.isWhiteboardMode ? 'Whiteboard-Mode' : 'Normal-Mode'}`,
            x, y - 6
        );
    }
    ctx.restore();
}

window.state = window.state || {};
state.ui = state.ui || {};

function dpbResetInfoDrawn(){ state.ui._infoDrawn = false; }

function dpbMarkInfoDrawn(){ state.ui._infoDrawn = true; }

function dpbWasInfoDrawn(){ return !!state.ui._infoDrawn; }

function dpb_drawStatusIndicatorDots() {

  if (typeof ctx === 'undefined' || !canvas) return;

  let typeCount = 0;


  if (window.state && window.state.selectedOptions) {
      // กรองเอาเฉพาะตัวเลือกที่มี count > 0 แล้วนับว่ามีกี่ "รายการ" (เช่น เลือกปลั๊ก(5) + ขาจอ(1) = 2 ชนิด)
      typeCount = Object.values(window.state.selectedOptions).filter(item => (item?.count || 0) > 0).length;
  }

  // เตรียมวาด
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); 
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0; 

  const DOT_SIZE = 6; 
  const COLOR_LEFT  = '#eeede4'; 
  const COLOR_RIGHT = '#e4ecee'; 

  // 3. ใช้ตัวแปร typeCount ในการเช็คเงื่อนไข
  // หมายเหตุ: คุณอาจต้องปรับเลข 8 ลง หากชนิดของสินค้ามีไม่ถึง 8 ชนิด
  if (typeCount >= 8) { 
      ctx.fillStyle = COLOR_LEFT;
      ctx.fillRect(0, 0, DOT_SIZE, DOT_SIZE);
      
      ctx.fillStyle = COLOR_RIGHT;
      ctx.fillRect(canvas.width - DOT_SIZE, 0, DOT_SIZE, DOT_SIZE);

  } else if (typeCount > 0) {
      ctx.fillStyle = COLOR_LEFT;
      ctx.fillRect(0, 0, DOT_SIZE, DOT_SIZE);

  } else {
      ctx.fillStyle = COLOR_RIGHT;
      ctx.fillRect(canvas.width - DOT_SIZE, 0, DOT_SIZE, DOT_SIZE);
  }

  ctx.restore();
}

// ========================================================
// [CORRECTED] Helper Function: วาดกล่อง 3D (Standard Logic)
// ฟังก์ชันนี้รองรับการ Zoom และ Perspective ที่ถูกต้อง
// ========================================================
window.DPB_drawCuboid3Faces = function(ctx, imgs, baseP, w, h, d, projectFn) {
    // baseP: จุดเริ่มต้น {x, y} ในหน่วย CM (Logical Coordinate)
    // w, h, d: ขนาด กว้าง, สูง, ลึก ในหน่วย CM
    // projectFn: ฟังก์ชันแปลงจาก CM -> Pixel (Screen Coordinate)

    // 1. กำหนดจุดมุมทั้ง 4 บนพื้น (Logical Points - CM)
    const l_BL = { x: baseP.x,     y: baseP.y };
    const l_BR = { x: baseP.x + w, y: baseP.y };
    const l_FR = { x: baseP.x + w, y: baseP.y + d };
    const l_FL = { x: baseP.x,     y: baseP.y + d };

    // 2. แปลงจุดบนพื้นเป็นพิกัดหน้าจอ (Project to Screen Points - Floor)
    const p_BL_Floor = projectFn(l_BL.x, l_BL.y);
    const p_BR_Floor = projectFn(l_BR.x, l_BR.y);
    const p_FR_Floor = projectFn(l_FR.x, l_FR.y);
    const p_FL_Floor = projectFn(l_FL.x, l_FL.y);

    // 3. คำนวณความสูงที่จะยกขึ้น (Ceiling Points - Lift Logic)
    // 3.1 หาความกว้างจริงบนหน้าจอ (Pixel) ระหว่างจุดซ้ายล่างกับขวาล่าง
    const screenW = Math.hypot(p_BR_Floor.x - p_BL_Floor.x, p_BR_Floor.y - p_BL_Floor.y);
    
    // 3.2 คำนวณอัตราส่วน Scale (1 CM เท่ากับกี่ Pixel ณ ขณะนั้น)
    // ป้องกันการหารด้วย 0 โดยใช้ (w || 1)
    const scaleFactor = screenW / (w || 1); 
    
    // 3.3 แปลงความสูง (h) จาก CM เป็น Pixel ตาม Scale ที่ได้
    const liftPx = h * scaleFactor; 

    // ฟังก์ชันย่อยสำหรับยกจุดขึ้นตามแกน Y (Screen Y)
    const toTop = (p) => ({ x: p.x, y: p.y - liftPx });
    
    const p_BL_Top = toTop(p_BL_Floor);
    const p_BR_Top = toTop(p_BR_Floor);
    const p_FR_Top = toTop(p_FR_Floor);
    const p_FL_Top = toTop(p_FL_Floor);

    // 4. วาดพื้นผิว (Draw Faces) เรียงลำดับจากหลังมาหน้า (Painters Algorithm)
    // หมายเหตุ: ลำดับการวาดอาจต้องปรับตามมุมมอง แต่โดยทั่วไปสำหรับ Top-Down View ลำดับนี้ใช้ได้ครับ
    
    // ด้านขวา (Right Face)
    if (imgs[1]) {
        window.DPB_drawTexturedQuad(ctx, imgs[1], p_FR_Top, p_BR_Top, p_BR_Floor, p_FR_Floor); 
    }
    
    // ด้านหน้า (Front Face)
    if (imgs[0]) {
        window.DPB_drawTexturedQuad(ctx, imgs[0], p_FL_Top, p_FR_Top, p_FR_Floor, p_FL_Floor); 
    }
    
    // ด้านบน (Top Face)
    if (imgs[2]) {
        window.DPB_drawTexturedQuad(ctx, imgs[2], p_FL_Top, p_FR_Top, p_BR_Top, p_BL_Top);       
    }
};

window.drawOptionsIn3D = function(ctx, L, W, projectFn) {

    const DEBUG_MODE = false; 

    // [CONFIG] เป็น 1.0 ทั้งหมด (ปิดการบิดภายใน)
    const P_STRENGTH_X = 1.0; 
    const P_STRENGTH_Y = 1.0; 

    // ฟังก์ชันนี้จะคืนค่าเดิมกลับไป (Linear)
    const mapToVisual = (val, maxVal, pStrength) => {
        return val; 
    };

    try {
        const byId = (id) => document.getElementById(id);
        const modelType = (byId('dpb-type')?.value || 'custom').toLowerCase();
        const isLDesk = (modelType === 'l2' || modelType === 'l3');
        const side = (byId('dpb-aside')?.value || 'right').toLowerCase();

        const ML = +(byId('dpb-ml')?.value || 190);
        const MW = +(byId('dpb-mw')?.value || 60);
        const AL = +(byId('dpb-al')?.value || 60);
        const AW = +(byId('dpb-aw')?.value || 120);

        let rectMain, rectArm;
        if (!isLDesk) {
            rectMain = { x: 0, y: 0, w: ML, h: MW };
            rectArm = null;
        } else {
            if (side === 'right') {
                rectMain = { x: 0, y: 0, w: ML, h: MW }; 
                rectArm  = { x: ML - AL, y: 0, w: AL, h: AW };
            } else {
                rectArm  = { x: 0, y: 0, w: AL, h: AW };
                rectMain = { x: 0, y: 0, w: ML, h: MW };
            }
        }

        if (DEBUG_MODE) {
            const drawDebugRect = (r, color) => {
                if(!r) return;
                const p1 = projectFn(r.x, r.y);
                const p2 = projectFn(r.x + r.w, r.y);
                const p3 = projectFn(r.x + r.w, r.y + r.h);
                const p4 = projectFn(r.x, r.y + r.h);
                
                ctx.save();
                ctx.strokeStyle = color; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
                ctx.closePath(); ctx.stroke();
                ctx.fillStyle = color; ctx.font = "20px Arial";
                ctx.fillText(color === 'lime' ? "MAIN" : "ARM", p1.x + 10, p1.y + 30);
                ctx.restore();
            };
            drawDebugRect(rectMain, 'lime');
            if(rectArm) drawDebugRect(rectArm, 'red');
            
            // ========================================================
            // [UPDATED] Draw Ruler Function (Fix Perspective Mismatch)
            // ========================================================
            const drawRuler = (r, type, otherRect = null) => {
                if (!r) return;
                const OFFSET_X = 0; const OFFSET_Y = 0;
                const GLOBAL_STR_X = (typeof P_STRENGTH_X !== 'undefined') ? P_STRENGTH_X : 1.0;
                const GLOBAL_STR_Y = (typeof P_STRENGTH_Y !== 'undefined') ? P_STRENGTH_Y : 1.0;

                const drawEdgeTick = (val, maxVal, edge) => {
                    let currentStrength = (edge === 'top' || edge === 'bottom') ? GLOBAL_STR_X : GLOBAL_STR_Y;
                    let drawPos = 0;

                    // [FIX START] Logic L-Right Arm
                    if (type === 'arm' && side === 'right' && (edge === 'top' || edge === 'bottom')) {
                        const startGlobal = ML - AL;
                        const currentGlobal = startGlobal + val; 
                        const vStart = mapToVisual(startGlobal, ML, currentStrength);
                        const vCurrent = mapToVisual(currentGlobal, ML, currentStrength);
                        drawPos = vCurrent - vStart;
                    } else {
                        let ratio = val / maxVal;
                        let visualRatio = Math.pow(ratio, currentStrength);
                        drawPos = visualRatio * maxVal;
                    }
                    // [FIX END]

                    let lx = r.x + OFFSET_X; let ly = r.y + OFFSET_Y;
                    let dirX = 0; let dirY = 0;

                    if (edge === 'top') { lx += drawPos; ly += 0; dirY = -1; } 
                    else if (edge === 'bottom') { lx += drawPos; ly += r.h; dirY = 1; } 
                    else if (edge === 'left') { lx += 0; ly += drawPos; dirX = -1; } 
                    else if (edge === 'right') { lx += r.w; ly += drawPos; dirX = 1; }

                    if (type === 'main' && otherRect) {
                        if (edge !== 'top') {
                            const inX = (lx >= otherRect.x && lx <= otherRect.x + otherRect.w);
                            const inY = (ly >= otherRect.y && ly <= otherRect.y + otherRect.h);
                            if (inX && inY) return;
                        }
                    }

                    let lx2 = lx + (0 * dirX); let ly2 = ly + (0 * dirY);
                    const isTen = (val % 10 === 0);
                    const isCenter = (Math.abs(val - maxVal / 2) < 0.1);
                    const len = isCenter ? 14 : (isTen ? 8 : 4);

                    lx2 += (len * dirX); ly2 += (len * dirY);

                    const p1 = projectFn(lx, ly); const p2 = projectFn(lx2, ly2);

                    ctx.save(); ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                    if (isCenter) { ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = 2.5; } 
                    else if (isTen) { ctx.strokeStyle = 'rgba(0,0,0,1.0)'; ctx.lineWidth = 1.5; } 
                    else { ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; }
                    ctx.stroke();

                    if (isTen || isCenter) {
                        const txt = isCenter ? "CNTR" : Math.round(val);
                        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
                        const angle = Math.atan2(dy, dx); const textDist = 14; 
                        ctx.fillStyle = isCenter ? '#D32F2F' : '#000000';
                        ctx.font = "bold 15px Arial";
                        ctx.textAlign = "center"; ctx.textBaseline = "middle";
                        ctx.fillText(txt, p2.x + Math.cos(angle)*textDist, p2.y + Math.sin(angle)*textDist);
                    }
                    ctx.restore();
                };

                for (let i = 0; i <= r.w; i += 2) {
                    if (type === 'main') { drawEdgeTick(i, r.w, 'top'); drawEdgeTick(i, r.w, 'bottom'); } 
                    else { drawEdgeTick(i, r.w, 'bottom'); }
                }
                for (let j = 0; j <= r.h; j += 2) {
                    if (type === 'main') { drawEdgeTick(j, r.h, 'left'); drawEdgeTick(j, r.h, 'right'); } 
                    else {
                        let isArmRight = (typeof side !== 'undefined' && side === 'right');
                        if (isArmRight) drawEdgeTick(j, r.h, 'right'); else drawEdgeTick(j, r.h, 'left'); 
                    }
                }
            };
            drawRuler(rectMain, 'main', rectArm); 
            if (rectArm) drawRuler(rectArm, 'arm');
        }

        // [3] Loop Options
        if (!window.state || !window.state.selectedOptions) return;
        const opts = window.state.selectedOptions;
        const optConfig = window.state.optConfig || {};
        const metaOpts = window.state.meta.options || [];
        const TRACK_KEY = 'power_track';

        let drawQueue = [];
        let trackInfo = null;
        let sockets = [];

        Object.keys(opts).forEach(key => {
            const sel = opts[key];
            if (!sel || !sel.count) return;
            const configArr = optConfig[key] || [];
            const isSocket = (key === 'power_socket' || key === 'usb_charger');

            for (let i = 0; i < sel.count; i++) {
                const cfg = configArr[i] || {};
                const opData = metaOpts.find(o => o.key === key);
                const isCircle = (opData && opData.type === 'hole_circle');

                let vIndex = 0;
                if (typeof cfg.variantIndex !== 'undefined') vIndex = Number(cfg.variantIndex);
                else if (cfg.variant && opData && opData.variants) {
                    const foundIdx = opData.variants.findIndex(v => v.name === cfg.variant);
                    if (foundIdx !== -1) vIndex = foundIdx;
                }
                
                let imgUrlStr = null;
                if (isSocket && opData?.rawImageUrl3d?.includes(',')) imgUrlStr = opData.rawImageUrl3d;
                else {
                    const variantObj = (opData?.variants) ? opData.variants[vIndex] : null;
                    imgUrlStr = variantObj?.imageUrl3d || opData?.imageUrl3d || variantObj?.imageUrl || opData?.imageUrl;
                }

                let imgUrls = [];
                if (imgUrlStr && typeof imgUrlStr === 'string') imgUrls = imgUrlStr.split(',').map(s => s.trim());
                if (imgUrls.length === 0 && !isSocket) continue;

                let mainImgUrl = imgUrls[0];
                if (!window.DPB_IMG_CACHE) window.DPB_IMG_CACHE = {};
                if (!window.DPB_IMG_CACHE[mainImgUrl]) {
                    const im = new Image(); im.crossOrigin = "Anonymous"; im.src = mainImgUrl;
                    im.onload = () => { if (window.drawDesk3D) window.drawDesk3D(); };
                    window.DPB_IMG_CACHE[mainImgUrl] = im;
                }
                let mainImgObj = window.DPB_IMG_CACHE[mainImgUrl];
                
                let imgObjs = imgUrls.map(url => {
                    if (!window.DPB_IMG_CACHE[url]) {
                        const im = new Image(); im.crossOrigin = "Anonymous"; im.src = url;
                        window.DPB_IMG_CACHE[url] = im;
                    }
                    return window.DPB_IMG_CACHE[url];
                });

                // --- Base Dimensions ---
                let baseW = Number(cfg.w) || 10;
                let baseH = Number(cfg.h) || 10;
                const fromRaw = String(cfg.from || '').toLowerCase();
                const placeRaw = String(cfg.place || '').toLowerCase();
                const posMode = (cfg.pos || 'main').toLowerCase();
                let offX = Number(cfg.offsetX || 0);
                let offY = Number(cfg.offsetY || 0);
                
                if (key === TRACK_KEY) {
                    let pMode = 'center';
                    if (['left', 'ซ้าย'].some(s => placeRaw.includes(s))) pMode = 'left';
                    else if (['right', 'ขวา'].some(s => placeRaw.includes(s))) pMode = 'right';
                    const isWide = baseW >= 85; 
                    const POS_ADJ  = isWide ? { 'left': 0.0, 'center': 0.0, 'right': 0.0 } : { 'left': 0.0, 'center': 0.0, 'right': 0.0 };
                    offX += POS_ADJ[pMode];
                }

                const isRotated = !!cfg.rotate;
                let rawW = isCircle ? baseW : (isRotated ? baseH : baseW);
                let rawH = isCircle ? baseW : (isRotated ? baseW : baseH);

                // --- Zone Selection ---
                let boxUse = rectMain;
                // ตรวจสอบทิศทางวาง (Placement)
                let isRightSide = ['right', 'ขวา', 'ด้านขวา'].some(s => placeRaw.includes(s));
                let isLeftSide = ['left', 'ซ้าย', 'ด้านซ้าย'].some(s => placeRaw.includes(s));

                if (isLDesk) {
                    let useArm = false;
                    if (posMode === 'arm') {
                        useArm = true;
                        // ถ้าวางบน Arm จะบังคับทิศทางการหมุนตาม Side ของโต๊ะ
                        if (side === 'right') { isRightSide = true; isLeftSide = false; }
                        else { isLeftSide = true; isRightSide = false; }
                    }
                    // ถ้า L-Right และวางขวา -> ลง Arm
                    if (side === 'right' && isRightSide) useArm = true;
                    // ถ้า L-Left และวางซ้าย -> ลง Arm
                    if (side === 'left' && isLeftSide) useArm = true;

                    if (useArm && rectArm) boxUse = rectArm;
                }

                // --- Linear Calculation (ตำแหน่ง) ---
                let linearL = 0; let linearT = 0; 
                // ใช้ค่าจาก Config (placeRaw) โดยตรงเพื่อคำนวณตำแหน่ง
                if (['left', 'ซ้าย'].some(s => placeRaw.includes(s))) {
                    linearL = offX;
                } else if (['center', 'ตรงกลาง', 'กลาง'].some(s => placeRaw.includes(s))) {
                    linearL = (boxUse.w - rawW) / 2 + offX;
                } else { 
                    linearL = boxUse.w - rawW - offX;
                }

                if (['top', 'บน'].some(s => fromRaw.includes(s))) {
                    linearT = offY;
                } else if (['center', 'ตรงกลาง'].some(s => fromRaw.includes(s))) {
                    linearT = (boxUse.h - rawH) / 2 + offY; 
                } else {
                    linearT = boxUse.h - rawH - offY;
                }

                let linearR = linearL + rawW;
                let linearB = linearT + rawH;

                const visL = mapToVisual(linearL, boxUse.w, P_STRENGTH_X);
                const visR = mapToVisual(linearR, boxUse.w, P_STRENGTH_X);
                const visT = mapToVisual(linearT, boxUse.h, P_STRENGTH_Y);
                const visB = mapToVisual(linearB, boxUse.h, P_STRENGTH_Y);

                let localX = visL; let localY = visT;
                let logicW = visR - visL; let logicH = visB - visT; 

                const globalX = boxUse.x + localX;
                const globalY = boxUse.y + localY;

                const pTL = projectFn(globalX, globalY);
                const pTR = projectFn(globalX + logicW, globalY);
                const pBR = projectFn(globalX + logicW, globalY + logicH);
                const pBL = projectFn(globalX, globalY + logicH);
                
                const pCenter = projectFn(globalX + logicW/2, globalY + logicH/2);
                const screenW = Math.hypot(pTR.x - pTL.x, pTR.y - pTL.y);
                const scaleFactor = screenW / (logicW || 1); 
                const BASE_THICK = 0.3; 
                const liftY = scaleFactor * BASE_THICK * (isRotated ? 1.0 : 1.2);

                // ========================================================
                // [UPDATED v5.2] Sliding Socket Lid (Vector Extension Fix)
                // ========================================================
                if (key === 'sliding_socket') {
                    const LID_URLS = { white: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Sliding-Socket_White1.webp', black: 'https://www.deskspace.in.th/wp-content/uploads/2026/01/Sliding-Socket_Black1.webp' };
                    let lidUrl = LID_URLS.black; const vName = (cfg.variant || '').toLowerCase();
                    if (vName.includes('white') || vName.includes('ขาว')) lidUrl = LID_URLS.white;
                    if (!window.DPB_IMG_CACHE[lidUrl]) { const im = new Image(); im.crossOrigin = "Anonymous"; im.src = lidUrl; im.onload = () => { if (window.drawDesk3D) window.drawDesk3D(); }; window.DPB_IMG_CACHE[lidUrl] = im; }
                    const lidImg = window.DPB_IMG_CACHE[lidUrl];

                    if (lidImg && lidImg.complete && lidImg.naturalWidth > 0) {
                        const imgRatio = lidImg.naturalHeight / lidImg.naturalWidth;
                        const refDim = isRotated ? rawH : rawW;
                        const lidLinearSize = refDim * imgRatio; 
                        let pLidTL, pLidTR, pLidBR, pLidBL;

                        if (!isRotated) {
                            // --- ปกติ: ฝาเปิดขึ้นด้านบน ---
                            pLidBL = { x: pTL.x, y: pTL.y }; pLidBR = { x: pTR.x, y: pTR.y };
                            const lidLinearTop = linearT - lidLinearSize;
                            const gLidTopY = boxUse.y + mapToVisual(lidLinearTop, boxUse.h, P_STRENGTH_Y);
                            pLidTL = projectFn(boxUse.x + visL, gLidTopY); pLidTR = projectFn(boxUse.x + visR, gLidTopY);
                        } else {
                            // --- หมุน: ใช้ Vector Extension เพื่อความแม่นยำ ---
                            // คำนวณอัตราส่วนความยาวฝาต่อความกว้างเต้า (แกนสไลด์)
                            const linearRatio = lidLinearSize / rawW;

                            if (isRightSide) {
                                // Right Side: ยืด Vector ออกไปทางขวา (จาก TL->TR และ BL->BR)
                                // Snap anchors: ฝาซ้าย = เต้าขวา
                                pLidTL = { x: pTR.x, y: pTR.y }; 
                                pLidBL = { x: pBR.x, y: pBR.y }; 

                                // Vector Top & Bottom
                                const vTopX = pTR.x - pTL.x; const vTopY = pTR.y - pTL.y;
                                const vBotX = pBR.x - pBL.x; const vBotY = pBR.y - pBL.y;

                                // Extend outwards
                                pLidTR = { x: pTR.x + vTopX * linearRatio, y: pTR.y + vTopY * linearRatio };
                                pLidBR = { x: pBR.x + vBotX * linearRatio, y: pBR.y + vBotY * linearRatio };

                            } else {
                                // Left Side: ยืด Vector ย้อนไปทางซ้าย (จาก TL<-TR และ BL<-BR)
                                // Snap anchors: ฝาขวา = เต้าซ้าย
                                pLidTR = { x: pTL.x, y: pTL.y }; 
                                pLidBR = { x: pBL.x, y: pBL.y }; 

                                // Vectors (ทิศทางเดิม TL->TR)
                                const vTopX = pTR.x - pTL.x; const vTopY = pTR.y - pTL.y;
                                const vBotX = pBR.x - pBL.x; const vBotY = pBR.y - pBL.y;

                                // Extend backwards (ลบ vector)
                                pLidTL = { x: pTL.x - vTopX * linearRatio, y: pTL.y - vTopY * linearRatio };
                                pLidBL = { x: pBL.x - vBotX * linearRatio, y: pBL.y - vBotY * linearRatio };
                            }
                        }
                        drawQueue.push({ 
                            imgObj: lidImg, pTL: pLidTL, pTR: pLidTR, pBR: pLidBR, pBL: pLidBL, 
                            liftY, isRotated, placeRaw, 
                            zIndex: pCenter.y, // [FIX] ใช้ Z เดียวกับเต้า ไม่ -1
                            isCircle: false 
                        });
                    }
                }

                // [IMPORTANT] Pass isRightSide / isLeftSide for Rotation Logic
                const drawData = {
                    imgObj: mainImgObj,
                    pTL, pTR, pBR, pBL, liftY,
                    isRotated, placeRaw,
                    zIndex: pCenter.y, 
                    isCircle,
                    isRightSide, isLeftSide 
                };

                if (key === TRACK_KEY) {
                    trackInfo = { globalX, globalY, logicW, logicH, zIndex: pCenter.y, placeRaw, isRotated, isRightSide, isLeftSide };
                    drawQueue.push(drawData);
                } else if (isSocket && (opts[TRACK_KEY] && opts[TRACK_KEY].count > 0)) {
                    let sW = 4.2, sL = 3.4, sH = 8.0; if (key === 'usb_charger') { sW = 4.5; sL = 3.2; sH = 6.6; }
                    sockets.push({ key, imgObjs, dims: { w: sW, l: sL, h: sH } });
                } else {
                    drawQueue.push(drawData);
                }
            } 
        });

        // ========================================================
        // [UPDATED] Power Track Logic (Rotation + Side Direction)
        // ========================================================
        if (trackInfo && sockets.length > 0) {
             const isWide = (trackInfo.isRotated ? trackInfo.logicH : trackInfo.logicW) >= 85; 
             const maxSockets = isWide ? 8 : 5; if (sockets.length > maxSockets) sockets = sockets.slice(0, maxSockets);
             const GAP = 3.0; let totalSocketLen = 0;
             sockets.forEach((s, i) => { totalSocketLen += s.dims.w; if (i < sockets.length - 1) totalSocketLen += GAP; });
             const trackCenterX = trackInfo.globalX + (trackInfo.logicW / 2);
             const trackCenterY = trackInfo.globalY + (trackInfo.logicH / 2);
             let currentPos = trackInfo.isRotated ? (trackCenterY - (totalSocketLen / 2)) : (trackCenterX - (totalSocketLen / 2));

             sockets.forEach((s, index) => {
                 let socketX, socketY, socketW, socketL; const MANUAL_OFFSET = -0.65; 
                 let drawImgs = [...s.imgObjs];
                 if (trackInfo.isRotated) {
                     socketX = trackCenterX - (s.dims.l / 2) + MANUAL_OFFSET; socketY = currentPos;
                     socketW = s.dims.l; socketL = s.dims.w; 
                     drawImgs[0] = s.imgObjs[1]; drawImgs[1] = s.imgObjs[0];
                 } else {
                     socketX = currentPos; socketY = trackCenterY - (s.dims.l / 2) + MANUAL_OFFSET;
                     socketW = s.dims.w; socketL = s.dims.l; 
                 }
                 
                 drawQueue.push({
                    zIndex: trackInfo.zIndex + 10 + index, 
                    customDraw: (ctx) => {
                        const baseP = { x: socketX, y: socketY }; const w = socketW; const d = socketL; const h = s.dims.h;
                        const l_BL = { x: baseP.x, y: baseP.y }; const l_BR = { x: baseP.x + w, y: baseP.y };
                        const l_FR = { x: baseP.x + w, y: baseP.y + d }; const l_FL = { x: baseP.x, y: baseP.y + d };
                        const p_BL_Floor = projectFn(l_BL.x, l_BL.y); const p_BR_Floor = projectFn(l_BR.x, l_BR.y);
                        const p_FR_Floor = projectFn(l_FR.x, l_FR.y); const p_FL_Floor = projectFn(l_FL.x, l_FL.y);
                        const screenW = Math.hypot(p_BR_Floor.x - p_BL_Floor.x, p_BR_Floor.y - p_BL_Floor.y);
                        const scaleFactor = screenW / (w || 1); const liftPx = h * scaleFactor; 
                        const toTop = (p) => ({ x: p.x, y: p.y - liftPx });
                        const p_BL_Top = toTop(p_BL_Floor); const p_BR_Top = toTop(p_BR_Floor);
                        const p_FR_Top = toTop(p_FR_Floor); const p_FL_Top = toTop(p_FL_Floor);

                        if (drawImgs[1]) window.DPB_drawTexturedQuad(ctx, drawImgs[1], p_FR_Top, p_BR_Top, p_BR_Floor, p_FR_Floor); 
                        if (drawImgs[0]) window.DPB_drawTexturedQuad(ctx, drawImgs[0], p_FL_Top, p_FR_Top, p_FR_Floor, p_FL_Floor); 
                        if (drawImgs[2]) {
                            if (trackInfo.isRotated) {
                                if (trackInfo.isRightSide) window.DPB_drawTexturedQuad(ctx, drawImgs[2], p_FR_Top, p_BR_Top, p_BL_Top, p_FL_Top); // CW
                                else window.DPB_drawTexturedQuad(ctx, drawImgs[2], p_BL_Top, p_FL_Top, p_FR_Top, p_BR_Top); // CCW
                            } else { window.DPB_drawTexturedQuad(ctx, drawImgs[2], p_FL_Top, p_FR_Top, p_BR_Top, p_BL_Top); }
                        }
                    }
                });
                currentPos += s.dims.w + GAP; 
            });
        }

        // --- Generic Draw Loop ---
        drawQueue.sort((a, b) => a.zIndex - b.zIndex);
        drawQueue.forEach(item => {
             if (item.customDraw) { item.customDraw(ctx); } 
             else {
                const { imgObj, pTL, pTR, pBR, pBL, liftY, isRotated, placeRaw, isCircle, isRightSide, isLeftSide } = item;
                const SIDE_BRIGHTNESS = 0.9;
                
                // [FIXED] Universal Rotation Logic
                const getRotatedPoints = (p1, p2, p3, p4) => {
                    if (!isRotated) return [p1, p2, p3, p4];
                    if (isRightSide) return [p2, p3, p4, p1]; // CW
                    if (isLeftSide) return [p4, p1, p2, p3]; // CCW
                    return [p4, p1, p2, p3]; 
                };

                if (imgObj && imgObj.complete && imgObj.naturalWidth > 0 && typeof window.DPB_drawTexturedQuad === 'function') {
                    const steps = Math.ceil(liftY);
                    ctx.save(); ctx.filter = `brightness(${SIDE_BRIGHTNESS})`;
                    for (let k = 0; k < steps; k++) {
                        const curY = k; const vanishingX = (pTL.x + pTR.x) / 2; const centerX = 500; 
                        const dist = vanishingX - centerX; const skewFactor = (dist === 0) ? 0.2 : (dist * 0.002); const shiftX = k * -skewFactor;
                        const layer = [ { x: pTL.x + shiftX, y: pTL.y - curY }, { x: pTR.x + shiftX, y: pTR.y - curY }, { x: pBR.x + shiftX, y: pBR.y - curY }, { x: pBL.x + shiftX, y: pBL.y - curY } ];
                        const quad = getRotatedPoints(...layer);
                        window.DPB_drawTexturedQuad(ctx, imgObj, quad[0], quad[1], quad[2], quad[3], isCircle);
                    }
                    ctx.restore();
                    const vanishingX = (pTL.x + pTR.x) / 2; const centerX = 500; 
                    const dist = vanishingX - centerX; const skewFactor = (dist === 0) ? 0.2 : (dist * 0.002); const topShiftX = steps * -skewFactor;
                    const topPoints = [ { x: pTL.x + topShiftX, y: pTL.y - liftY }, { x: pTR.x + topShiftX, y: pTR.y - liftY }, { x: pBR.x + topShiftX, y: pBR.y - liftY }, { x: pBL.x + topShiftX, y: pBL.y - liftY } ];
                    const topQuad = getRotatedPoints(...topPoints);
                    window.DPB_drawTexturedQuad(ctx, imgObj, topQuad[0], topQuad[1], topQuad[2], topQuad[3], isCircle);
                }
            }
        });
    } catch(e) { console.error("DPB 3D Draw Error:", e); }
};

window.getParamsForLegs = function() {
    const byId = (id) => document.getElementById(id);
    let model = (byId('dpb-type')?.value || 'custom').toLowerCase();
    
    // [NEW] ดึงค่า Side (ทิศทางโต๊ะ)
    const sideRaw = (byId('dpb-aside')?.value || 'right').toLowerCase(); // 'left' or 'right'

    if (!LEG_3D_ASSETS[model]) model = 'custom';

    // ... (Logic หา legTypeRaw เหมือนเดิม) ...
    let legTypeRaw = 'square_white'; 
    const legInput = byId('dpb-legs'); 
    if (legInput && legInput.value) {
        legTypeRaw = legInput.value;
    } else {
        const activeTile = document.querySelector('#dpb-legs-tiles .active');
        if (activeTile && activeTile.dataset.value) legTypeRaw = activeTile.dataset.value;
    }

    let finalLegKey = legTypeRaw;
    if (model === 'single') {
        if (legTypeRaw.includes('black')) finalLegKey = 'black';
        else finalLegKey = 'white';
    } else {
        if (!finalLegKey.includes('_')) {
             if (finalLegKey.includes('white')) finalLegKey = 'square_white';
             else if (finalLegKey.includes('black')) finalLegKey = 'square_black';
             else finalLegKey = 'square_white';
        }
    }

    // [UPDATED] Logic การเลือก Assets
    let assets = LEG_3D_ASSETS[model]?.[finalLegKey];

    // กรณีที่เป็น L2 หรือ L3 เราต้องเจาะจงลงไปเลือก sub-object ตาม Side
    if (assets && (model === 'l2' || model === 'l3')) {
        // ถ้ามี key 'right' หรือ 'left' อยู่ข้างใน ให้เลือกตาม sideRaw
        if (assets[sideRaw]) {
            assets = assets[sideRaw];
        } else {
            // Fallback กรณีหาไม่เจอ ให้ใช้ตัวแรกที่มี
            assets = assets['right'] || assets;
        }
    }

    // Fallbacks (เหมือนเดิม)
    if (!assets) {
        const firstKey = Object.keys(LEG_3D_ASSETS[model])[0];
        assets = LEG_3D_ASSETS[model][firstKey];
        if (model === 'l2' || model === 'l3') assets = assets['right'] || assets; // Fallback side
    }
    if (!assets) assets = LEG_3D_ASSETS['custom']['square_white'];

    return { model, assets };
};


(function initEdgeAndLegTiles() {
  const EDGE_ASSETS = {
    standard: [
      { value:'rounded', label:'มุมมน',      img:'https://www.deskspace.in.th/wp-content/uploads/2025/10/RoundEdge.png', trim: null },
      { value:'square',  label:'มุมเหลี่ยม',  img:'https://www.deskspace.in.th/wp-content/uploads/2025/10/SquareEdge.png', trim: null },
    ],
    solid: [
      { value:'rounded', trim:'untrim', label:'มุมมน (ขอบตัดตรง)',      img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/RoundEdgeUnTrim.png' },
      { value:'rounded', trim:'trim',   label:'มุมมน (ขอบลบคม)',       img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/RoundEdgeTrim.png' },
      { value:'square',  trim:'untrim', label:'มุมเหลี่ยม (ขอบตัดตรง)', img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/SquareEdgeUnTrim.png' },
      { value:'square',  trim:'trim',   label:'มุมเหลี่ยม (ขอบลบคม)',   img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/SquareEdgeTrim.png' }
    ]
  };

  const edgeSel = document.getElementById('dpb-edge');
  const edgeHost = document.getElementById('dpb-edge-tiles');
  const topSel = document.getElementById('dpb-top-color');
  const trimInput = document.getElementById('dpb-solid-trim');

  function syncEdgeTilesActiveState() {
    if (!edgeHost) return;
    
    const isVirtualSquare = document.body.classList.contains('dpb-virtual-square');
    const targetShape = isVirtualSquare ? 'square' : edgeSel.value;
    const targetTrim = trimInput ? trimInput.value : 'untrim';
    const topKey = topSel ? topSel.value : '';
    const isSolid = (typeof DPB_SOLID_KEYS !== 'undefined') ? DPB_SOLID_KEYS.includes(String(topKey)) : false;
    const cards = edgeHost.querySelectorAll('.dpb-type-card');
    cards.forEach(card => {
      const cardVal = card.getAttribute('data-value');
      const cardTrim = card.getAttribute('data-trim');

      let isActive = false;
      if (isSolid) {
        isActive = (cardVal === targetShape && cardTrim === targetTrim);
      } else {
        isActive = (cardVal === targetShape);
      }
      
      card.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if(isActive) card.classList.add('is-active');
      else card.classList.remove('is-active');
    });
  }

function updateEdgeTilesForTop() {
    if (!edgeHost || !edgeSel) return;

    const topKey = topSel ? topSel.value : '';
    const isSolid = (typeof DPB_SOLID_KEYS !== 'undefined') ? DPB_SOLID_KEYS.includes(String(topKey)) : false;
    const items = isSolid ? EDGE_ASSETS.solid : EDGE_ASSETS.standard;

    edgeHost.innerHTML = '';
    items.forEach((it, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'dpb-type-card';
      card.setAttribute('data-value', it.value);
      if (it.trim) card.setAttribute('data-trim', it.trim);

      card.innerHTML = `
        <span class="dpb-type-card__chip"><img loading="lazy" alt="${escapeHtml(it.label)}" src="${it.img}"></span>
        <span class="dpb-type-card__name">${escapeHtml(it.label)}</span>
      `;
      
      card.addEventListener('click', () => {
        document.body.classList.remove('dpb-virtual-square');

        if (edgeSel.value !== it.value) {
          edgeSel.value = it.value;
          edgeSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (trimInput && it.trim) {
          trimInput.value = it.trim;
        }
        syncEdgeTilesActiveState();
        if (typeof scheduleRedraw === 'function') scheduleRedraw();
      });
      
      edgeHost.appendChild(card);
    });

    syncEdgeTilesActiveState();
  }
  function checkRadiusInputs() {
    const inputs = [
      'r_rect_tl', 'r_rect_tr', 'r_rect_bl', 'r_rect_br',
      'ld_r_tl', 'ld_r_tr', 'ld_r_step', 'ld_r_br', 'ld_r_armbl', 'ld_r_armbr'
    ];
    
    let allZero = true;
    let hasVisibleInputs = false;

    inputs.forEach(id => {
      const el = document.getElementById(id);
      // เช็คเฉพาะ Input ที่มองเห็นอยู่ (ไม่ถูกซ่อน)
      if (el && el.offsetParent !== null) {
        hasVisibleInputs = true;
        const val = parseFloat(el.value);
        if (!isNaN(val) && val > 0) {
          allZero = false;
        }
      }
    });

    if (!hasVisibleInputs) return;

    const wasVirtual = document.body.classList.contains('dpb-virtual-square');

    if (allZero) {
        if (!wasVirtual) {
            document.body.classList.add('dpb-virtual-square');
            syncEdgeTilesActiveState();
        }
    } else {
        if (wasVirtual) {
            document.body.classList.remove('dpb-virtual-square');
            if (edgeSel.value === 'square') {
                edgeSel.value = 'rounded';
            }
            syncEdgeTilesActiveState();
        }
    }
  }

  document.addEventListener('input', (e) => {
    if (e.target && e.target.id && (e.target.id.startsWith('r_rect_') || e.target.id.startsWith('ld_r_'))) {
        checkRadiusInputs();
    }
  });

  if (edgeSel) {
    edgeSel.addEventListener('change', () => {
      syncEdgeTilesActiveState();
      if(typeof syncRBlocks === 'function') syncRBlocks();
      if(typeof scheduleRedraw === 'function') scheduleRedraw();
    });
  }

  if (topSel) {
    topSel.addEventListener('change', updateEdgeTilesForTop);
  }

  setTimeout(updateEdgeTilesForTop, 100);
  setTimeout(checkRadiusInputs, 200);

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  const legsSel = document.getElementById('dpb-legs');
  const legsHost = document.getElementById('dpb-legs-tiles');
  if (legsSel && !legsSel.options.length) {
     (state.meta.legs||[]).forEach(o=>{ const opt=document.createElement('option'); opt.value=o.key; opt.text=o.name; legsSel.appendChild(opt); });
     if(!legsSel.value && legsSel.options.length) legsSel.value = legsSel.options[0].value;
  }
  if (legsSel && legsHost) {
     const LEGS_LIST = (state.meta.legs||[]).map(item=>({ value: item.key, img: item.imageUrl || '', label: item.name || item.key }));
     
     legsHost.innerHTML = '';
     LEGS_LIST.forEach((it, idx) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'dpb-type-card';
        card.setAttribute('data-value', it.value);
        card.innerHTML = `<span class="dpb-type-card__chip"><img loading="lazy" alt="${escapeHtml(it.label)}" src="${it.img}"></span><span class="dpb-type-card__name">${escapeHtml(it.label)}</span>`;
        card.addEventListener('click', () => {
            if (legsSel.value !== it.value){ 
                legsSel.value = it.value; 
                try{drawFooter();}catch(_){} try{measureInfoGrid();}catch(_){} 
                legsSel.dispatchEvent(new Event('change', {bubbles:true})); 
                if(typeof scheduleRedraw==='function') scheduleRedraw(); 
            }
        });
        legsHost.appendChild(card);
     });

     legsSel.addEventListener('change', ()=>{
        [...legsHost.querySelectorAll('.dpb-type-card')].forEach(el=> el.setAttribute('aria-selected', el.dataset.value===legsSel.value?'true':'false'));
        try{drawFooter();}catch(_){} try{measureInfoGrid();}catch(_){} if(typeof scheduleRedraw==='function') scheduleRedraw();
     });
  }

})();

window.getLegColorFromSelection = getLegColorFromSelection;

window.getLegShapeFromSelection = window.getLegShapeFromSelection || function(){
  const t = getDeskType();
  if (isLType(t) || isSingleType(t)) return 'square';
  const v = (document.getElementById('dpb-legs')?.value || '').toLowerCase();
  if (/\bcircle\b|กลม/.test(v)) return 'circle';
  return 'square';
};

(function initMasterLegsSystem(){
  const origId   = 'dpb-show-legs';          
  const footerId = 'dpb-show-legs-footer';   
  const getOrig = () => document.getElementById(origId);
  const getFoot = () => document.getElementById(footerId);
  const getType = () => (document.getElementById('dpb-type')?.value || '').toLowerCase();
  const setLegsState = (isShow, skipSyncDOM = false) => {
      window.state = window.state || {};
      window.state.flags = window.state.flags || {};
      window.state.flags.showLegs = isShow;
      const o = getOrig();
      const f = getFoot();
      if (o && o.checked !== isShow) o.checked = isShow;
      if (f && f.checked !== isShow) f.checked = isShow;
      if (typeof scheduleRedraw === 'function') scheduleRedraw();
  };
  const FORCE_HIDE_ON_L3 = false; 
  let _prevLegsState = true;      
  const checkEnforcement = () => {
      if (!FORCE_HIDE_ON_L3) return; 
      const isL3 = (getType() === 'l3');
      const o = getOrig();
      const f = getFoot();
      const wraps = document.querySelectorAll('.dpb-switch-legs');
      if (isL3) {
          if (_prevLegsState === null) _prevLegsState = state.flags.showLegs;
          setLegsState(false);
          wraps.forEach(w => w.style.opacity = '0.5');
          if(o) o.disabled = true;
          if(f) f.disabled = true;
      } else {
          if (_prevLegsState !== null) {
              setLegsState(_prevLegsState);
              _prevLegsState = null;
          }
          wraps.forEach(w => w.style.opacity = '1');
          if(o) o.disabled = false;
          if(f) f.disabled = false;
      }
  };
  const bindToggle = (el) => {
      if (!el) return;
      el.addEventListener('change', (e) => {
          if (!el.disabled) {
              setLegsState(e.target.checked);
              _prevLegsState = e.target.checked; 
          }
      });
  };
  setTimeout(() => {
      const o = getOrig();
      const f = getFoot();
      let initVal = true;
      if (window.state?.flags?.showLegs !== undefined) initVal = window.state.flags.showLegs;
      else if (o) initVal = o.checked;
      setLegsState(initVal); 
      bindToggle(o);
      bindToggle(f);
      const typeSel = document.getElementById('dpb-type');
      if (typeSel) {
          typeSel.addEventListener('change', checkEnforcement);
      }
      checkEnforcement();
  }, 100);
})();

(function initDeskTypeTiles(){
  const sel = document.getElementById('dpb-type');
  const host = document.getElementById('dpb-type-tiles');
  if(!sel || !host) return;
  const TYPES = [
    { value:'custom', label:'Custom Desk<br> (Dual Motor)', img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/CardCustomDeskDuoMotor.png' },
	{ value:'custom_single', label:'Custom Desk<br> (Single Motor)', img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/CardCustomDeskSingleMotor.png' },
    { value:'custom_manual', label:'Custom Desk<br> (Manual)</span>', img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/CardCustomDeskManual.png' },
	{ value:'single', label:'Custom Desk<br> (Single Leg)',  img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/CardSingleLeg.png' },
    { value:'l2',     label:'Custom L-Desk<br> (2 Legs)', img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/CardDeskL2Leg.png' },
    { value:'l3',     label:'Custom L-Desk<br> (3 Legs)', img:'https://www.deskspace.in.th/wp-content/uploads/2025/12/CardDeskL3Leg.png' },
	{ value:'custom_workspace', label:'Dual Workspace', img:'https://www.deskspace.in.th/wp-content/uploads/2026/01/CardCustomDeskDualWorkSpace.png' },
  ];
  host.innerHTML = '';
  TYPES.forEach(t=>{
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'dpb-type-card';
    card.setAttribute('data-value', t.value);
    card.setAttribute('aria-selected', sel.value === t.value ? 'true' : 'false');
    card.innerHTML = `
      <span class="dpb-type-card__chip"><img loading="lazy" alt="${t.label}" src="${t.img}"></span>
      <span class="dpb-type-card__name">${t.label}</span>
    `;
    card.addEventListener('click', ()=>{
      if(sel.value !== t.value){
        sel.value = t.value;
        [...host.querySelectorAll('.dpb-type-card')].forEach(el=>el.setAttribute('aria-selected','false'));
        card.setAttribute('aria-selected','true');
        sel.dispatchEvent(new Event('change', { bubbles:true }));
      }
    });
    host.appendChild(card);
  });
  sel.addEventListener('change', ()=>{
    const v = sel.value;
    [...host.querySelectorAll('.dpb-type-card')].forEach(el=>{
      el.setAttribute('aria-selected', el.getAttribute('data-value') === v ? 'true' : 'false');
    });
  });
  sel.dispatchEvent(new Event('change', { bubbles:false }));
})();

byId('wm-enable')?.addEventListener('change', e=>{
  DPB_toggleWatermark(e.target.checked);
  scheduleRedraw();
});

byId('wm-opacity')?.addEventListener('input', e=>{
  DPB_setWatermarkOptions({ opacity: +e.target.value });
  scheduleRedraw();
});

byId('wm-color-orig')?.addEventListener('click', ()=>{
  DPB_setWatermarkOptions({ original:true, black:false, white:false,  autoColor:false });
  scheduleRedraw();
});

byId('wm-color-black')?.addEventListener('click', ()=>{
  DPB_setWatermarkOptions({ original:false, black:true,  white:false, autoColor:false });
  scheduleRedraw();
});

byId('wm-color-white')?.addEventListener('click', ()=>{
  DPB_setWatermarkOptions({ original:false, black:false, white:true,  autoColor:false });
  scheduleRedraw();
});

byId('wm-debug')?.addEventListener('change', e=>{
  DPB_debugWatermark(e.target.checked);
  scheduleRedraw();
});

byId('dpb-form').addEventListener('input',  ()=>{ 
  validateInputs(); 
  try{ drawFooter(); }catch(_){}
  try{ measureInfoGrid(); }catch(_){}
  scheduleRedraw(); 
}, true);

byId('dpb-form').addEventListener('change', ()=>{ 
  validateInputs(); 
  try{ drawFooter(); }catch(_){}
  try{ measureInfoGrid(); }catch(_){}
  scheduleRedraw(); 
}, true);

byId('dpb-legs')?.addEventListener('change', ()=>{ 
  try{ drawFooter(); }catch(_){}
  try{ measureInfoGrid(); }catch(_){}
  scheduleRedraw(); 
});

document.querySelector('.dpb-wrap')
  .addEventListener('input',  ()=>{ validateInputs(); scheduleRedraw(); }, true);

document.querySelector('.dpb-wrap')
  .addEventListener('change', ()=>{ validateInputs(); scheduleRedraw(); }, true);

byId('dpb-preview-btn').addEventListener('click', ()=>{
  if(!validateInputs()) return;
  const targetH = measureTotalHeight();
  if(canvas.height !== targetH){ canvas.height = targetH; }
  draw(); drawFooter();
});

byId('dpb-download').addEventListener('click', (e)=>{
  e.preventDefault();
  if (!validateInputs()) return;
  const fname = buildCustomerDateFilename() + '.png';
  if (canvas.toBlob) {
    canvas.toBlob((blob)=>{
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  } else {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
});

cartBody.addEventListener('scroll', ()=>{});

function buildCustomerDateFilename(){
  const sanitizeFilename = (name) => {
      return (name || '').replace(/[^a-z0-9\u0E00-\u0E7F\-_]/gi, '_');
  };

  const typeSel = document.getElementById('dpb-type');
  let typeName = 'Desk';
  if (typeSel && typeSel.selectedOptions[0]) {
      typeName = typeSel.selectedOptions[0].text;
  }
  typeName = typeName.replace(/\s*\(.*?\)/g, '').trim();
  const safeType = sanitizeFilename(typeName);
  
  const topKey = document.getElementById('dpb-top-color')?.value;
  let topName = topKey || 'Color';
  if (window.state && window.state.meta && window.state.meta.colors) {
      const colorObj = window.state.meta.colors.find(c => c.key === topKey);
      if (colorObj && colorObj.name) {
          topName = colorObj.name;
      }
  }
  const safeColor = sanitizeFilename(topName);

  let optPart = '';
  if (typeof totalSelectedCount === 'function') {
      if (totalSelectedCount() > 0) {
          optPart = '_Opt';
      }
  } else if (window.state && window.state.selectedOptions) {
      const total = Object.values(window.state.selectedOptions).reduce((sum, item) => sum + (item?.count || 0), 0);
      if (total > 0) optPart = '_Opt';
  }

  let yyyy, mm, dd;
  const d = document.getElementById('dpb-date').value;
   
  if (d) {
    [yyyy, mm, dd] = d.split('-');
  } else {
    const t = new Date();
    yyyy = String(t.getFullYear());
    mm   = String(t.getMonth()+1).padStart(2,'0');
    dd   = String(t.getDate()).padStart(2,'0');
  }
  const prettyDate = `${dd}-${mm}-${yyyy}`;
  
  return `${safeType}_${safeColor}${optPart}_${prettyDate}`;
}
function sanitizeFilename(name){
  return String(name)
    .replace(/[\\/:*?"<>|]+/g, '')   
    .replace(/\s+/g, '_')            
    .replace(/_+/g, '_')             
    .replace(/^_+|_+$/g, '')         
    .substring(0, 100);              
}

(function(){
  function dpb_updateLOnlyVisibility(){
    var tSel = byId && byId('dpb-type');
    var box  = byId && byId('dpb-l-only');
    if (!tSel || !box) return;
    var tval = (tSel.value || '').trim().toLowerCase();
    box.style.display = (tval === 'l2' || tval === 'l3') ? '' : 'none';
  }
  try{
    var tSel = byId && byId('dpb-type');
    if (tSel){
      tSel.addEventListener('change', dpb_updateLOnlyVisibility);
    }
  }catch(_){}
  try{ dpb_updateLOnlyVisibility(); }catch(_){}
  window.dpb_updateLOnlyVisibility = dpb_updateLOnlyVisibility;
})();

document.addEventListener('input',  ()=>{ try{ scheduleRedraw(); }catch(_){ } }, true);
document.addEventListener('change', ()=>{ try{ scheduleRedraw(); }catch(_){ } }, true);

(function wireActionsIntoCartMobileOnly(){
  function whenReady(selectors, cb){
    const ok = selectors.every(sel => document.querySelector(sel));
    if (ok) return void cb();
    requestAnimationFrame(()=> whenReady(selectors, cb));
  }
  whenReady(['#dpb-cart-panel', '#dpb-cart-panel .dpb-cart-footer', '.dpb-actions'], () => {
    const cartPanel   = document.getElementById('dpb-cart-panel');
    const cartFooter  = document.querySelector('#dpb-cart-panel .dpb-cart-footer');
    const actionsBar  = document.querySelector('.dpb-actions');
    const confirmBtn  = document.getElementById('dpb-cart-confirm');
    if(!cartPanel || !cartFooter || !actionsBar){
      console.warn('[DPB] wireActionsIntoCartMobileOnly: required elements not found');
      return;
    }
    let actionsHome = document.getElementById('dpb-actions-home');
    if(!actionsHome){
      actionsHome = document.createElement('div');
      actionsHome.id = 'dpb-actions-home';
      actionsBar.parentNode.insertBefore(actionsHome, actionsBar);
    }
    const mq = window.matchMedia('(max-width: 900px)');
    const isMobile = () => mq.matches;
    function scheduleCartHeightAfterDom(){
      requestAnimationFrame(()=> requestAnimationFrame(()=>{
        if (typeof requestMobileCartHeightUpdate === 'function'){
          requestMobileCartHeightUpdate();
        }
      }));
    }
    function moveActionsToCart(){
      if (!isMobile()) return;
      if (!cartPanel.classList.contains('is-open')) return;
      if (!cartFooter.contains(actionsBar)){
        cartFooter.appendChild(actionsBar);
        actionsBar.classList.add('dpb-actions--in-cart');
        confirmBtn?.classList.add('is-hidden');
        window.dispatchEvent(new CustomEvent('dpb:actions-moved-into-cart'));
      }else{
        confirmBtn?.classList.add('is-hidden');
      }
      scheduleCartHeightAfterDom();
    }
    function moveActionsBack(){
      if (actionsHome && actionsHome.parentNode && actionsHome.nextSibling !== actionsBar){
        actionsHome.parentNode.insertBefore(actionsBar, actionsHome.nextSibling);
        actionsBar.classList.remove('dpb-actions--in-cart');
      }
      confirmBtn?.classList.remove('is-hidden');
    }
    const onCartClassChange = () => {
      if (cartPanel.classList.contains('is-open') && isMobile()){
        moveActionsToCart();
      } else {
        moveActionsBack();
      }
    };
    const mo = new MutationObserver(onCartClassChange);
    mo.observe(cartPanel, { attributes:true, attributeFilter:['class'] });
    mq.addEventListener?.('change', onCartClassChange);
    window.addEventListener('dpb:actions-moved-into-cart', () => {
      scheduleCartHeightAfterDom();
    });
    onCartClassChange();
  });
})();

window.DPB_TYPE_DEFAULTS = window.DPB_TYPE_DEFAULTS || {
  custom: { mw: 70, ml: 180, aw: null, al: null, aside: 'right' }, 
  custom_single: { mw: 60, ml: 160, aw: null, al: null, aside: 'right' },
  custom_manual: { mw: 60, ml: 120, aw: null, al: null, aside: 'right' },
  single: { mw: 60,  ml: 100, aw: null, al: null, aside: 'right' }, 
  l2:     { mw: 70,  ml: 180, aw: 110, al: 70,   aside: 'right' }, 
  l3:     { mw: 80,  ml: 200, aw: 150, al: 80,   aside: 'right' }, 
    custom_workspace: { mw: 70, ml: 180, aw: null, al: null, aside: 'right' },
};

function getTypeDefaults(typeKey){
  const k = String(typeKey||'custom').toLowerCase();
  return DPB_TYPE_DEFAULTS[k] || DPB_TYPE_DEFAULTS.custom;
}

function getNumOrDefault(id, key){
  const el = byId(id);
  const v = Number(el?.value);
  if (Number.isFinite(v)) return v;
  const def = getTypeDefaults();
  return Number(def?.[key]);
}

function getAsideOrDefault(){
  const el = byId('dpb-aside');
  const val = (el?.value || '').toLowerCase();
  if (val === 'left' || val === 'right') return val;
  const def = getTypeDefaults();
  return (def?.aside || 'right');
}

// ============================================================
// [PART 6 MODIFIED] applyTypeDefaultsAndRefresh (เพิ่ม Flag Mute)
// ============================================================

function applyTypeDefaultsAndRefresh(typeKey) {
  // [NEW] เริ่มต้นการสลับ Type -> สั่ง Mute Popup
  window.__isSwitchingType = true;

  const d = getTypeDefaults(typeKey);
  const sel = document.getElementById('dpb-type');
  if (sel && sel.value !== typeKey) sel.value = typeKey;

  const setNum = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val == null) ? '' : String(val);
  };
  setNum('dpb-mw', d.mw);
  setNum('dpb-ml', d.ml);
  setNum('dpb-aw', d.aw);
  setNum('dpb-al', d.al);
  const aside = document.getElementById('dpb-aside');
  if (aside && d.aside) aside.value = d.aside;
  if (aside) aside.dispatchEvent(new Event('change', { bubbles: true }));
  const isL = (typeKey === 'l2' || typeKey === 'l3');
  const awWrap = document.querySelector('[for="dpb-aw"]')?.closest('div') || null;
  const alWrap = document.querySelector('[for="dpb-al"]')?.closest('div') || null;
  if (awWrap) awWrap.style.display = isL ? '' : 'none';
  if (alWrap) alWrap.style.display = isL ? '' : 'none';
  const edgeSel = document.getElementById('dpb-edge');
  if (edgeSel) edgeSel.value = 'rounded';
  
  document.body.classList.remove('dpb-virtual-square');

  const allRadiusInputs = [
    'r_rect_tl', 'r_rect_tr', 'r_rect_bl', 'r_rect_br',
    'ld_r_tl', 'ld_r_tr', 'ld_r_step', 'ld_r_br', 'ld_r_armbl', 'ld_r_armbr',
    'dpb-rInner'
  ];
  allRadiusInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = ''; 
  });
  if (typeof syncEdgeTilesActiveState === 'function') syncEdgeTilesActiveState();
  if (typeof syncRBlocks === 'function') syncRBlocks();
  if (typeof buildOptions === 'function') buildOptions();
  if (typeof buildOptConfig === 'function') buildOptConfig();
  if (typeof scheduleRedraw === 'function') scheduleRedraw();

  // [NEW] คืนค่า Flag หลังจากผ่านไป 500ms (เพื่อให้แน่ใจว่าค่าทุกอย่างนิ่งแล้ว)
  if (window._typeSwitchTimer) clearTimeout(window._typeSwitchTimer);
  window._typeSwitchTimer = setTimeout(() => {
      window.__isSwitchingType = false;
      // Optional: สั่ง Validate อีกรอบหลังคืนค่าเผื่อมี Error จริงๆ ที่ค้างอยู่
      if(typeof validateInputs === 'function') validateInputs();
  }, 1000);
}
	
function syncTypeTilesActive(typeKey){
  const host = document.getElementById('dpb-type-tiles');
  if(!host) return;
  host.querySelectorAll('.dpb-type-card[aria-selected="true"]').forEach(n=>{
    n.setAttribute('aria-selected','false');
    n.classList.remove('is-active');
  });
  const card = host.querySelector(`.dpb-type-card[data-type="${CSS.escape(typeKey)}"]`);
  if (card){
    card.setAttribute('aria-selected','true');
    card.classList.add('is-active');
  }
}

(function ensureTypeDefaultBinding(){
  const sel = document.getElementById('dpb-type');
  if(!sel || sel.dataset.bound === '1') return;
  sel.dataset.bound = '1';
  sel.addEventListener('change', ()=>{
    const key = sel.value;
    syncTypeTilesActive(key);
    applyTypeDefaultsAndRefresh(key);
  });
})();

(function bindTypeTiles(){
  const host = document.getElementById('dpb-type-tiles');
  const sel  = document.getElementById('dpb-type');
  if(!host || !sel || host.dataset.bound === '1') return;
  host.dataset.bound = '1';
  const activate = (card)=>{
    const key = card?.dataset?.type;
    if(!key) return;
    if (sel.value !== key){
      sel.value = key;
    }
    sel.dispatchEvent(new Event('change', { bubbles:true }));
  };
  host.addEventListener('click', (e)=>{
    const card = e.target.closest('.dpb-type-card');
    if(!card || !host.contains(card)) return;
    activate(card);
  }, true);
  host.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.dpb-type-card');
    if(!card || !host.contains(card)) return;
    e.preventDefault();
    activate(card);
  }, true);
})();

	function getTypeOptionsMeta(){
 const sel = document.getElementById('dpb-type');
 if(!sel) return { order:[], byValue:new Map(), byLabel:new Map() };
 const order = [...sel.options].map(o => ({
  value: o.value,
 label: (o.textContent || '').trim()
  }));
  const byValue = new Map(order.map(o => [o.value.toLowerCase(), o]));
  const byLabel = new Map(order.map(o => [o.label.toLowerCase(), o]));
 return { order, byValue, byLabel };
}

function renderOrSyncTypeTiles(){
  const host = document.getElementById('dpb-type-tiles');
  const sel  = document.getElementById('dpb-type');
  if(!host || !sel) return;
  const { order, byValue, byLabel } = getTypeOptionsMeta();
  if (host.children.length === 0){
    host.innerHTML = order.map(e=>`
      <div class="dpb-type-card" data-type="${e.value}" aria-selected="false" tabindex="0">
        <span class="dpb-type-card__chip"></span>
        <span class="dpb-type-card__name">${e.label}</span>
      </div>
    `).join('');
  }else{
    const cards = [...host.querySelectorAll('.dpb-type-card')];
    cards.forEach(card=>{
      let t = (card.dataset.type || '').trim().toLowerCase();
      const nameEl = card.querySelector('.dpb-type-card__name');
      const labelText = (nameEl?.textContent || '').trim();
      if (t && byValue.has(t)) {
        if (nameEl && !labelText) nameEl.textContent = byValue.get(t).label;
        return;
      }
      if (labelText) {
        const hit = byLabel.get(labelText.toLowerCase());
        if (hit){
          card.dataset.type = hit.value;   
          return;
        }
      }
      card.dataset.type = sel.value || 'custom';
      if (nameEl && !labelText) {
        const meta = byValue.get((sel.value||'custom').toLowerCase());
        if (meta) nameEl.textContent = meta.label;
      }
    });
  }
  syncTypeTilesActive(sel.value || 'custom');
}

(function bootTypeTilesOnce(){
  renderOrSyncTypeTiles();
  const sel = document.getElementById('dpb-type');
  if (sel && !sel.dataset._typeBootDone){
    sel.dataset._typeBootDone = '1';
    sel.dispatchEvent(new Event('change', { bubbles:true }));
  }
})();

(async function initConfigurator() {
  try {
    // Dynamically proxy static leg image assets to bypass CORS blocks on mobile/localhost
    try {
      const ajaxUrl = (typeof window.dsAdminMode !== 'undefined' && window.dsAdminMode.ajaxUrl) 
        ? window.dsAdminMode.ajaxUrl 
        : (typeof AJAX_URL !== 'undefined' ? AJAX_URL : (window.location.origin + '/test-site/wp-admin/admin-ajax.php'));

      let cleanAjaxUrl = ajaxUrl;
      if (cleanAjaxUrl.includes('localhost')) {
        cleanAjaxUrl = cleanAjaxUrl.replace(/https?:\/\/localhost/ig, window.location.origin);
      }
      const proxyBase = cleanAjaxUrl + '?action=ds_image_proxy&url=';

      const proxyObjectUrls = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (let key in obj) {
          if (typeof obj[key] === 'string' && obj[key].includes('deskspace.in.th')) {
            obj[key] = proxyBase + encodeURIComponent(obj[key]);
          } else if (typeof obj[key] === 'object') {
            proxyObjectUrls(obj[key]);
          }
        }
      };

      [
        typeof LEG_ASSETS !== 'undefined' ? LEG_ASSETS : null,
        typeof SINGLE_LEG_ASSETS !== 'undefined' ? SINGLE_LEG_ASSETS : null,
        typeof LEG_ASSETS_L2 !== 'undefined' ? LEG_ASSETS_L2 : null,
        typeof LEG_ASSETS_L3 !== 'undefined' ? LEG_ASSETS_L3 : null,
        typeof LEG_3D_ASSETS !== 'undefined' ? LEG_3D_ASSETS : null
      ].forEach(obj => {
        if (obj) proxyObjectUrls(obj);
      });
    } catch(proxyErr) {
      console.warn('[DPB] Failed to proxy static leg assets:', proxyErr);
    }

    const metaStatus = await loadMeta();
    applyTypeDefaults();
    validateInputs();
    const chkShowLegs = document.getElementById('dpb-show-legs');
    state.flags = state.flags || {}; 
    window.state = state; 
    if (chkShowLegs) {
        if (typeof state.flags.showLegs !== 'undefined') {
          chkShowLegs.checked = !!state.flags.showLegs;
        } else {
          state.flags.showLegs = !!chkShowLegs.checked;
        }
    }
    scheduleRedraw();
    if(metaStatus && metaStatus.usedCache){
      showStatusMessage('ใช้ข้อมูลล่าสุดที่บันทึกไว้ (ไม่สามารถเชื่อมต่อ API ได้)', '#b45309');
    } else {
      showStatusMessage('');
    }
  } catch(err) {
    console.error('[Deskspace Proposal Builder] Metadata request failed', err);
    showStatusMessage('โหลดข้อมูลไม่สำเร็จ: '+err.message, '#b91c1c');
  }
})();


function hidePreloadWhenMetaReady(meta){
  if(!PRELOAD_EL) return;
  const ok = meta
    && Array.isArray(meta.colors) && meta.colors.length > 0
    && Array.isArray(meta.options) && meta.options.length > 0;
  if(ok) hidePreloadNow();
}


byId('dpb-top-color')?.addEventListener('change', ()=>{
  if (!state?.theme?.userPickedIn){
    applyAutoInColorIfNeeded();
  }
  if(typeof scheduleRedraw==='function') scheduleRedraw();
});

function scheduleRedraw(){
  if (window._rafRedraw) return;
  window._rafRedraw = requestAnimationFrame(()=>{
    window._rafRedraw = null;
    const okInputs = validateInputs();
    const okPlace  = validateOptionPlacements();
    const isOK     = !!(okInputs && okPlace);
    state.validation = state.validation || { ok:true, messages:[] };
    state.validation.ok = isOK;
    if (isOK){
      try{ dpb_applyAutoInColorIfNeeded(); }catch(_){}
      const targetH = measureTotalHeight();
      if (canvas.height !== targetH){ canvas.height = targetH; }
      draw();
      try{ DPB_applyWatermarkAutoColor(); }catch(_){}
      try{ DPB_drawBrandWatermark_OnTop(); }catch(_){}
    }
    try{ drawFooter(); }catch(e){}
  });
}

(function(){
  var a = document.getElementById('dpb-gapA');
  var b = document.getElementById('dpb-gapB');
  function kick(){
    if (typeof window.scheduleRedraw === 'function') {
      scheduleRedraw();
    }
  }
  ['input','change'].forEach(function(ev){
    if (a) a.addEventListener(ev, kick);
    if (b) b.addEventListener(ev, kick);
  });
})();

window.DPB_DEBUG = window.DPB_DEBUG ?? false;

(function initStickyFooter(){
    const btnDown = document.getElementById('dpb-footer-download');
    if(btnDown){
        btnDown.addEventListener('click', (e)=>{
            const origBtn = document.getElementById('dpb-download');
            if(origBtn) origBtn.click();
            else alert('Function Download not found');
        });
    }
    const btnTheme = document.getElementById('dpb-footer-theme');
    if(btnTheme){
        btnTheme.addEventListener('click', ()=>{
             if(typeof openTheme === 'function') openTheme();
             else {
                 const panel = document.getElementById('dpb-theme-panel');
                 if(panel) panel.classList.add('is-open');
             }
        });
    }
    const btnCart = document.getElementById('dpb-footer-cart-btn');
    if(btnCart){
        btnCart.addEventListener('click', ()=>{
             if(typeof openCart === 'function') openCart();
             else {
                 const cart = document.getElementById('dpb-cart-panel');
                 if(cart) cart.classList.add('is-open');
             }
        });
    }
    const origBadge = document.getElementById('dpb-cart-count'); 
    const footerBadge = document.getElementById('dpb-footer-count');
    if(origBadge && footerBadge){
        const obs = new MutationObserver(()=>{
            footerBadge.textContent = origBadge.textContent;
            footerBadge.style.display = (origBadge.textContent === '0') ? 'none' : 'flex';
        });
        obs.observe(origBadge, { childList: true, characterData: true, subtree: true });
        footerBadge.textContent = origBadge.textContent;
        footerBadge.style.display = (origBadge.textContent === '0') ? 'none' : 'flex';
    }
})();
(function initCompleteImagePopupSystem() {
    const isMobileScreen = () => window.matchMedia("(max-width: 768px)").matches;
    const canvas = document.getElementById('dpb-canvas');
    if (!canvas) return;
    const wrapper = canvas.closest('.dpb-canvas-wrap') || document.querySelector('.dpb-canvas-wrap') || canvas.parentElement;

    // --- ตัวแปรสำหรับระบบ Zoom ---
    let currentScale = 1;
    let currentTranslateX = 0;
    let currentTranslateY = 0;
    
    function resetZoomState(img) {
        currentScale = 1;
        currentTranslateX = 0;
        currentTranslateY = 0;
        if(img) img.style.transform = `translate(0px, 0px) scale(1)`;
    }

    function openImageModal() {
        const modal = document.getElementById('dpb-image-modal');
        const img = modal?.querySelector('img');
        if (!canvas || !img || !modal) return;
        
        img.src = canvas.toDataURL('image/png');
        resetZoomState(img);

        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });
        document.body.style.overflow = 'hidden';
    }

    if (!document.getElementById('dpb-image-modal')) {
        const modal = document.createElement('div');
        modal.id = 'dpb-image-modal';
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: '999999999', display: 'none',
            justifyContent: 'center', alignItems: 'center', opacity: '0', transition: 'opacity 0.3s ease',
            overflow: 'hidden',
            touchAction: 'none' 
        });

        // ==========================================
        // [เพิ่มใหม่] : ป้องกันคลิกขวาที่ตัว Modal
        // ==========================================
        modal.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });

        const img = document.createElement('img');
        Object.assign(img.style, {
            maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', 
            transformOrigin: 'center center',
            cursor: 'grab',
            touchAction: 'none',
            transition: 'transform 0.1s ease-out',
            // ป้องกัน User ลากรูปออกไปวางข้างนอก (Drag & Drop image)
            userSelect: 'none',
            webkitUserDrag: 'none' 
        });
        
        // เพิ่มป้องกันคลิกขวาที่ตัวรูปด้วย (เพื่อความชัวร์)
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });

        modal.appendChild(img);

        // --- Logic การ Zoom และ Pan (เหมือนเดิม) ---
        let startDist = 0;
        let startScale = 1;
        let startX = 0;
        let startY = 0;
        let isDragging = false;

        const getDistance = (touches) => {
            return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
        };

        img.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                startDist = getDistance(e.touches);
                startScale = currentScale;
            } else if (e.touches.length === 1 && currentScale > 1) {
                isDragging = true;
                startX = e.touches[0].pageX - currentTranslateX;
                startY = e.touches[0].pageY - currentTranslateY;
                img.style.cursor = 'grabbing';
                img.style.transition = 'none';
            }
        });

        img.addEventListener('touchmove', (e) => {
            if(e.cancelable) e.preventDefault(); 

            if (e.touches.length === 2) {
                const dist = getDistance(e.touches);
                let newScale = (dist / startDist) * startScale;
                newScale = Math.min(Math.max(1, newScale), 5); 
                currentScale = newScale;
                
                if (currentScale === 1) {
                    currentTranslateX = 0;
                    currentTranslateY = 0;
                }
                img.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;

            } else if (e.touches.length === 1 && isDragging && currentScale > 1) {
                currentTranslateX = e.touches[0].pageX - startX;
                currentTranslateY = e.touches[0].pageY - startY;
                img.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
            }
        });

        img.addEventListener('touchend', () => {
            isDragging = false;
            img.style.cursor = 'grab';
            img.style.transition = 'transform 0.1s ease-out';
            if (currentScale < 1) {
                currentScale = 1;
                currentTranslateX = 0;
                currentTranslateY = 0;
                img.style.transform = `translate(0px, 0px) scale(1)`;
            }
        });
        // -----------------------------------------------------

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        Object.assign(closeBtn.style, {
            position: 'absolute', top: '20px', left: '20px',
            background: 'none', border: 'none',
            color: '#fff', fontSize: '25px', cursor: 'pointer', zIndex: '1000000'
        });

        const saveBtn = document.createElement('button');
        saveBtn.id = 'dpb-popup-save-btn'; 
        saveBtn.innerHTML = '<i class="fas fa-download"></i>';
        Object.assign(saveBtn.style, {
            position: 'absolute', top: '20px', right: '20px',
            background: 'none', border: 'none',
            color: '#fff', fontSize: '20px', cursor: 'pointer', zIndex: '1000000'
        });

        modal.appendChild(closeBtn);
        modal.appendChild(saveBtn);
        document.body.appendChild(modal);

        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                resetZoomState(img);
            }, 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            } else if (e.target === img && currentScale === 1 && !isDragging) {
                closeModal(); 
            }
        });

        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const link = document.createElement('a');
            const fname = (typeof buildCustomerDateFilename === 'function') ? buildCustomerDateFilename() : 'deskspace-layout';
            link.download = fname + '.png';
            link.href = img.src;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    let btn = wrapper.querySelector('.dpb-btn-popup');
    if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dpb-btn-popup';
        btn.title = 'ขยายภาพ';
        const isMobile = isMobileScreen();
        Object.assign(btn.style, {
            position: 'absolute', bottom: '12px', right: '12px', zIndex: '100',
            width: isMobile ? '22px' : '36px', height: isMobile ? '22px' : '36px',
            padding: isMobile ? '3px' : '8px',
            background: 'rgba(0, 0, 0, 0.6)', color: '#fff', border: 'none',
            borderRadius: '6px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s'
        });
        btn.onmouseenter = () => { btn.style.background = 'rgba(0, 0, 0, 0.8)'; };
        btn.onmouseleave = () => { btn.style.background = 'rgba(0, 0, 0, 0.6)'; };
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
        if (getComputedStyle(wrapper).position === 'static') { wrapper.style.position = 'relative'; }
        wrapper.appendChild(btn);
    }

    const finalBtn = wrapper.querySelector('.dpb-btn-popup');
    const newBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newBtn, finalBtn);

    newBtn.addEventListener('click', () => {
        openImageModal();
    }, false);
})();

			
(function initRadiusAutoSwitcher() {
  const inputsToCheck = [
    'r_rect_tl', 'r_rect_tr', 'r_rect_bl', 'r_rect_br',
    'ld_r_tl', 'ld_r_tr', 'ld_r_step', 'ld_r_br', 'ld_r_armbl', 'ld_r_armbr'
  ];

  function handleInput(e) {
    if (!inputsToCheck.includes(e.target.id)) return;
    let allZero = true;
    let hasVisibleInputs = false;

    inputsToCheck.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.offsetParent !== null) {
        hasVisibleInputs = true;
        const val = parseFloat(el.value);
        if (!isNaN(val) && val > 0) {
          allZero = false;
        }
      }
    });

    if (!hasVisibleInputs) return;

    const body = document.body;
    const wasVirtual = body.classList.contains('dpb-virtual-square');

    if (allZero) {
      if (!wasVirtual) {
        body.classList.add('dpb-virtual-square');
        if (typeof syncEdgeTilesActiveState === 'function') syncEdgeTilesActiveState();
      }
    } else {
      if (wasVirtual) {
        body.classList.remove('dpb-virtual-square');
       
        const edgeSel = document.getElementById('dpb-edge');
        if (edgeSel && edgeSel.value === 'square') {
            edgeSel.value = 'rounded';
        }
        
        if (typeof syncEdgeTilesActiveState === 'function') syncEdgeTilesActiveState();
      }
    }
  }

  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleInput);
  
  setTimeout(() => {
      const firstInput = document.getElementById(inputsToCheck[0]);
      if(firstInput) handleInput({ target: firstInput });
  }, 500);
})();

			
(function fixFooterCartAction(){
  const footerBtn = document.getElementById('dpb-footer-cart-btn');
  if(footerBtn){
      const newBtn = footerBtn.cloneNode(true);
      footerBtn.parentNode.replaceChild(newBtn, footerBtn);

      newBtn.addEventListener('click', (e)=>{
          e.preventDefault();
          e.stopPropagation();
          if (typeof scrollToTopSmooth === 'function') {
              scrollToTopSmooth();
          } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          if(typeof buildOptConfig === 'function') {
              buildOptConfig();
          }
          if(typeof openCart === 'function'){
              openCart();
          } else if(typeof window.openCart === 'function'){
              window.openCart();
          } else {
              const panel = document.getElementById('dpb-cart-panel');
              const empty = document.getElementById('dpb-cart-empty');
              const body  = document.getElementById('dpb-cart-body');
              if(panel) {
                  panel.classList.add('is-open');
                  if(body && empty){
                      const hasItems = body.children.length > 0;
                      empty.style.display = hasItems ? 'none' : 'block';
                      body.style.display  = hasItems ? 'flex' : 'none';
                  }
                  document.body.classList.add('dpb-cart-lock');
              }
          }
      });
      console.log(' Footer Cart Button Linked (With Scroll)');
  }
})();

document.addEventListener('DOMContentLoaded', function() {
    // 1. เช็คขนาดหน้าจอ
    if (window.innerWidth > 991) return;

    const ptrWrap = document.getElementById('ptr-spinner');
    if (!ptrWrap) return;

    // --- [เพิ่ม] ระบุตัว Sidebar ที่เราต้องการเช็คค่า Scroll ---
    const targetSidebar = document.querySelector('.dpb-sidebar-panel');

    const config = {
        ptrThreshold: 120
    };

    let state = {
        startY: 0,
        startX: 0,
        isPulling: false,
        isRefreshing: false,
        isTouching: false,
        isAngleLocked: false
    };

    const getScrollParent = (node) => {
        if (node == null) return null;
        if (node === document.body || node === document.documentElement) return null;
        const style = window.getComputedStyle(node);
        const overflowY = style.getPropertyValue('overflow-y');
        const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
        if (isScrollable && node.scrollHeight > node.clientHeight) {
            return node;
        }
        return getScrollParent(node.parentNode);
    };

    const resetState = () => {
        state.isPulling = false;
        state.isTouching = false;
        state.isAngleLocked = false;
        
        ptrWrap.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)';
        ptrWrap.style.transform = 'translate(-50%, -50px) scale(0)';
        ptrWrap.classList.remove('is-ready');
        ptrWrap.classList.remove('is-loading');
    };

    // --- Touch Start ---
    document.addEventListener('touchstart', function(e) {
        if (state.isRefreshing) return;

        // 1. เช็คว่าจุดที่นิ้วแตะ อยู่ในกล่องย่อยที่มี Scroll หรือไม่
        const scrollParent = getScrollParent(e.target);
        if (scrollParent && scrollParent.scrollTop > 0) {
            state.isTouching = false;
            return;
        }

        // 2. [สำคัญมาก] เช็ค Sidebar เป้าหมายของคุณ
        // ถ้า Sidebar ยังเลื่อนลงมาอยู่ (scrollTop > 0) ให้ "ยกเลิก" การรีเฟรช
        // เพื่อให้คุณสามารถเลื่อน stage-panel เพื่อดัน sidebar ขึ้นไปได้
        if (targetSidebar && targetSidebar.scrollTop > 0) {
            state.isTouching = false;
            return;
        }

        // 3. เช็ค Scroll หลักของหน้าเว็บ
        if (window.scrollY > 0) {
            state.isTouching = false;
            return;
        }

        state.isTouching = true;
        state.startY = e.touches[0].clientY;
        state.startX = e.touches[0].clientX;
        state.isPulling = false;
        state.isAngleLocked = false;
        
        ptrWrap.style.transition = 'none';
    }, { passive: true });

    // --- Touch Move ---
    document.addEventListener('touchmove', function(e) {
        if (!state.isTouching) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = currentY - state.startY;
        const diffX = Math.abs(currentX - state.startX);

        // เช็คซ้ำอีกรอบ: ถ้า Sidebar ขยับลงมาแล้ว ให้ยกเลิกการดึง
        if (targetSidebar && targetSidebar.scrollTop > 0) {
            state.isTouching = false;
            resetState(); // ดีดลูกศรกลับทันที
            return;
        }

        if (window.scrollY > 0) {
            state.isTouching = false;
            return;
        }

        // ล็อคทิศทาง
        if (!state.isAngleLocked) {
            if (diffX > Math.abs(diffY)) {
                state.isTouching = false; 
                return;
            }
            state.isAngleLocked = true;
        }

        // ดึงลง (diffY > 0) และ Sidebar ต้องอยู่บนสุด (scrollTop 0)
        if (diffY > 0) { 
            if(e.cancelable) e.preventDefault();

            state.isPulling = true;
            
            const moveY = Math.pow(diffY, 0.85) * 0.6; 
            const limitY = Math.min(moveY, config.ptrThreshold + 50);

            ptrWrap.style.transform = `translate(-50%, ${limitY}px) scale(1)`;

            const icon = ptrWrap.querySelector('.ptr-icon');
            if(!ptrWrap.classList.contains('is-ready')) {
                 if(icon) icon.style.transform = `rotate(${Math.min(diffY * 1.5, 360)}deg)`;
            }

            if (diffY > config.ptrThreshold) {
                ptrWrap.classList.add('is-ready');
            } else {
                ptrWrap.classList.remove('is-ready');
            }
        } 
    }, { passive: false });

    // --- Touch End ---
    document.addEventListener('touchend', function(e) {
        if (!state.isTouching) return;
        
        const currentY = e.changedTouches[0].clientY;
        const totalDiff = currentY - state.startY;

        // เงื่อนไขสุดท้ายก่อนรีเฟรช: ต้องดึงถึงระยะ และ Sidebar ต้องอยู่บนสุดจริงๆ
        const isSidebarTop = targetSidebar ? targetSidebar.scrollTop <= 0 : true;

        if (state.isPulling && totalDiff > config.ptrThreshold && isSidebarTop) {
            state.isRefreshing = true;
            
            ptrWrap.classList.add('is-loading');
            ptrWrap.style.transition = 'transform 0.3s ease';
            ptrWrap.style.transform = `translate(-50%, 60px) scale(1)`;
            
            setTimeout(() => {
                window.location.reload(); 
            }, 600);
            
        } else {
            resetState();
        }
        state.isTouching = false;
    });

    document.addEventListener('touchcancel', resetState);
});

document.addEventListener('DOMContentLoaded', function() {

    // =======================================================
    // ส่วนที่ 1: ปิดการคลิกขวา (คงเดิม)
    // =======================================================
    var canvasElement = document.getElementById('dpb-canvas');
    if (canvasElement) {
        canvasElement.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
    }

});

document.addEventListener('DOMContentLoaded', function() {
    const stagePanel = document.querySelector('.dpb-stage-panel');
    const sidebarPanel = document.querySelector('.dpb-sidebar-panel');

    if (!stagePanel || !sidebarPanel) return;

    // --- Configuration ---
    const friction = 0.96; 
    const multiplier = 1.2; 

    // --- State Variables ---
    let isDragging = false;
    let startY = 0;
    let lastY = 0;
    let currentScrollTop = 0;
    let velocity = 0;
    let rafId = null;
    let lastTime = 0;
    let maxScroll = 0; 

    // ฟังก์ชันหยุดทุกการเคลื่อนไหวทันที (Kill Switch)
    const stopMomentum = () => {
        if(rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        velocity = 0;
        isDragging = false;
    };

    // ฟังก์ชันอัปเดตหน้าจอ (Render Loop)
    const updateScroll = () => {
        if (Math.abs(velocity) > 0.1) {
            currentScrollTop -= velocity;
            
            // Limit ขอบเขต
            if (currentScrollTop < 0) {
                currentScrollTop = 0;
                velocity = 0; 
            } else if (currentScrollTop > maxScroll) {
                currentScrollTop = maxScroll;
                velocity = 0; 
            }

            sidebarPanel.scrollTop = currentScrollTop;

            if (!isDragging) {
                velocity *= friction;
                rafId = requestAnimationFrame(updateScroll);
            }
        } else {
            stopMomentum();
        }
    };

    // ============================================================
    // 1. จัดการ Event บน Stage Panel (พื้นที่โมเดล)
    // ============================================================
    
    stagePanel.addEventListener('touchstart', function(e) {
        stopMomentum(); // หยุดของเก่าก่อนเสมอ
        
        isDragging = true;
        startY = e.touches[0].clientY;
        lastY = startY;
        lastTime = performance.now();
        
        // Update ค่าล่าสุดจาก Sidebar จริงๆ (เผื่อมีการเลื่อนที่ Sidebar มาก่อน)
        currentScrollTop = sidebarPanel.scrollTop;
        maxScroll = sidebarPanel.scrollHeight - sidebarPanel.clientHeight;

    }, { passive: true });

    stagePanel.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();

        const currentY = e.touches[0].clientY;
        const now = performance.now();
        const dt = now - lastTime;
        const deltaY = (currentY - lastY) * multiplier;

        currentScrollTop -= deltaY;

        // Clamp
        if (currentScrollTop < 0) currentScrollTop = 0;
        if (currentScrollTop > maxScroll) currentScrollTop = maxScroll;
        
        sidebarPanel.scrollTop = currentScrollTop;

        if (dt > 0) {
            const newVelocity = deltaY; 
            velocity = (velocity * 0.2) + (newVelocity * 0.8);
        }

        lastY = currentY;
        lastTime = now;
    }, { passive: false });

    stagePanel.addEventListener('touchend', function(e) {
        isDragging = false;
        if (Math.abs(velocity) > 0.5) {
            updateScroll();
        }
    });

    stagePanel.addEventListener('touchcancel', stopMomentum);

    // ============================================================
    // 2. [สำคัญ] แก้ปัญหาจอสั่น (เพิ่ม Event ที่ Sidebar)
    // ============================================================
    
    // เมื่อนิ้วแตะที่ Sidebar Panel (ตัวมันเอง)
    // ให้สั่งหยุด Momentum ที่มาจาก Stage Panel ทันที!
    sidebarPanel.addEventListener('touchstart', function() {
        stopMomentum();
        // อัปเดตค่า currentScrollTop ให้ตรงกับปัจจุบัน 
        // เผื่อผู้ใช้สลับกลับไปลากที่ Stage Panel จะได้ต่อเนื่อง
        currentScrollTop = sidebarPanel.scrollTop;
    }, { passive: true });

    // รองรับ Wheel บน Sidebar ด้วย (เผื่อใช้เมาส์เบรค)
    sidebarPanel.addEventListener('wheel', function() {
        stopMomentum();
        currentScrollTop = sidebarPanel.scrollTop;
    }, { passive: true });


    // ============================================================
    // 3. Wheel Support บน Stage Panel (Desktop)
    // ============================================================
    stagePanel.addEventListener('wheel', function(e) {
        if (sidebarPanel.scrollHeight > sidebarPanel.clientHeight) {
            e.preventDefault();
            stopMomentum(); // ใช้เมาส์ก็ต้องหยุด Momentum เก่า
            sidebarPanel.scrollTop += e.deltaY;
            currentScrollTop = sidebarPanel.scrollTop;
        }
    }, { passive: false });
});

// =========================================
// STATE
// =========================================
let dpbCurrentIntent = null; // 'quote' | 'inquiry'

// =========================================
// OPEN / CLOSE
// =========================================
function dpbOpenModal() {
  const modal = document.getElementById('dpbModal');
  if (!modal) return;
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add('visible'));
  });

  // Reset to step 1
  dpbShowView('intent');

  // Load canvas preview
  const canvas = document.querySelector('canvas');
  const img = document.getElementById('dpb_preview_img');
  const placeholder = document.getElementById('dpb_preview_placeholder');
  if (canvas && img) {
    try {
      img.src = canvas.toDataURL('image/png');
      img.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    } catch(e) { console.warn('Canvas preview error:', e); }
  }
}

function dpbCloseModal() {
  const modal = document.getElementById('dpbModal');
  if (!modal) return;
  modal.classList.remove('visible');
  setTimeout(() => { modal.style.display = 'none'; }, 350);
}

// Close on overlay click
document.getElementById('dpbModal').addEventListener('click', function(e) {
  if (e.target === this) dpbCloseModal();
});

// =========================================
// NAVIGATION
// =========================================
function dpbSelectIntent(intent) {
  dpbCurrentIntent = intent;
  dpbShowView(intent === 'quote' ? 'quoteForm' : 'inquiryForm');
}

function dpbGoBack() {
  dpbCurrentIntent = null;
  dpbShowView('intent');
}

function dpbShowView(view) {
  const intentView   = document.getElementById('dpbIntentView');
  const quoteView    = document.getElementById('dpbQuoteView');
  const inquiryView  = document.getElementById('dpbInquiryView');
  const successView  = document.getElementById('dpbSuccessView');
  const privacyView  = document.getElementById('dpbPrivacyView');
  const footer       = document.getElementById('dpbFooter');
  const title        = document.getElementById('dpbModalTitle');
  const dot1         = document.getElementById('dpbDot1');
  const dot2         = document.getElementById('dpbDot2');
  const progress     = document.getElementById('dpbProgress');
  const scrollArea   = document.querySelector('.dpb-modal-scroll');

  // Hide all
  [intentView, quoteView, inquiryView].forEach(v => { if(v) v.style.display = 'none'; });
  successView.style.display  = 'none';
  privacyView.style.display  = 'none';
  footer.style.display       = 'none';
  progress.style.display     = 'flex';
  if (scrollArea) scrollArea.style.overflow = 'auto';

  if (view === 'intent') {
    intentView.style.display = 'block';
    title.textContent = 'ติดต่อเรา';
    dot1.classList.add('active'); dot2.classList.remove('active');

  } else if (view === 'quoteForm') {
    quoteView.style.display = 'block';
    footer.style.display = 'flex';
    title.textContent = 'ขอใบเสนอราคา';
    dot1.classList.remove('active'); dot2.classList.add('active');
    // Reset checkbox state
    dpbResetPrivacyCheckbox();

  } else if (view === 'inquiryForm') {
    inquiryView.style.display = 'block';
    footer.style.display = 'flex';
    title.textContent = 'สอบถามข้อมูลเพิ่มเติม';
    dot1.classList.remove('active'); dot2.classList.add('active');
    // Reset checkbox state
    dpbResetPrivacyCheckbox();

  } else if (view === 'success') {
    successView.style.display = 'block';
    progress.style.display = 'none';

  } else if (view === 'privacy') {
    privacyView.style.display = 'flex';
    progress.style.display = 'none';
    if (scrollArea) scrollArea.style.overflow = 'hidden';
  }
}

// =========================================
// PRIVACY VIEW FUNCTIONS
// =========================================
function dpbOpenPrivacyView() {
  dpbShowView('privacy');
}

function dpbClosePrivacyView() {
  // กลับไป view ที่เหมาะสมตาม intent ปัจจุบัน
  if (dpbCurrentIntent === 'quote') {
    dpbShowView('quoteForm');
  } else if (dpbCurrentIntent === 'inquiry') {
    dpbShowView('inquiryForm');
  } else {
    dpbShowView('intent');
  }
}

function dpbResetPrivacyCheckbox() {
  const checkbox = document.getElementById('dpbPrivacyCheckbox');
  const submitBtn = document.getElementById('dpbSubmitBtn');
  if (checkbox) checkbox.checked = false;
  if (submitBtn) submitBtn.disabled = true;
}

// =========================================
// PRIVACY CHECKBOX — toggle submit button
// =========================================
document.addEventListener('DOMContentLoaded', function() {
  const checkbox  = document.getElementById('dpbPrivacyCheckbox');
  const submitBtn = document.getElementById('dpbSubmitBtn');
  if (checkbox && submitBtn) {
    checkbox.addEventListener('change', function() {
      submitBtn.disabled = !this.checked;
    });
  }
});


// =========================================
// VALIDATION HELPER
// =========================================
function dpbValidateField(id) {
  const el = document.getElementById(id);
  if (!el) return true;
  const val = el.value.trim();
  if (!val) {
    el.classList.add('dpb-error');
    return false;
  }
  el.classList.remove('dpb-error');
  return true;
}
function dpbClearErrors(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('dpb-error');
  });
}


// =========================================
// SUBMIT
// =========================================
function dpbSubmitForm() {
  const btn = document.getElementById('dpbSubmitBtn');

  if (dpbCurrentIntent === 'quote') {
    dpbClearErrors(['dpb_q_name','dpb_q_email','dpb_q_tel']);
    const valid = dpbValidateField('dpb_q_name') &
                  dpbValidateField('dpb_q_email') &
                  dpbValidateField('dpb_q_tel');
    if (!valid) return;
    dpbDoSubmit({
      name:    document.getElementById('dpb_q_name').value.trim(),
      email:   document.getElementById('dpb_q_email').value.trim(),
      tel:     document.getElementById('dpb_q_tel').value.trim(),
      line_id: document.getElementById('dpb_q_line').value.trim(),
    }, document.getElementById('dpb_q_note').value.trim(), btn); // <-- [แก้ไขจุดนี้] ดึงค่าจาก dpb_q_note ส่งเป็นพารามิเตอร์ที่ 2 (question)

  } else if (dpbCurrentIntent === 'inquiry') {
    dpbClearErrors(['dpb_i_name','dpb_i_email','dpb_i_tel','dpb_i_question']);
    const valid = dpbValidateField('dpb_i_name') &
                  dpbValidateField('dpb_i_email') &
                  dpbValidateField('dpb_i_tel') &
                  dpbValidateField('dpb_i_question');
    if (!valid) return;
    dpbDoSubmit({
      name:    document.getElementById('dpb_i_name').value.trim(),
      email:   document.getElementById('dpb_i_email').value.trim(),
      tel:     document.getElementById('dpb_i_tel').value.trim(),
      line_id: document.getElementById('dpb_i_line').value.trim(),
    }, document.getElementById('dpb_i_question').value.trim(), btn);
  }
}

function dpbDoSubmit(contactInfo, question, btn) {
  btn.disabled = true;
  btn.classList.add('loading');

  // --- Build summary (same logic as original, keep your existing getVal/getTxt helpers) ---
  // This section mirrors your original summary_data builder
  const getEl  = id => document.getElementById(id);
  const getVal = id => { const el = getEl(id); return (el && el.value) ? el.value : ''; };
  const getNum = id => { const val = getVal(id); return (val===''||val===null) ? '-' : val; };
  const getTxt = id => { const el = getEl(id); return (el && el.selectedOptions && el.selectedOptions[0]) ? el.selectedOptions[0].text.trim() : ''; };

  const deskTypeVal = getVal('dpb-type');
  const deskTypeTxt = getTxt('dpb-type') || deskTypeVal;
  const isLShape = /(L2|L3|L-Shape)/i.test(deskTypeTxt) || /(L2|L3|L-Shape)/i.test(deskTypeVal);

  let desk_spec = {
    "รุ่นโต๊ะ": deskTypeTxt || '-',
    "สีท็อป": getTxt('dpb-top-color') || '-',
    "ขาโต๊ะ": getTxt('dpb-legs') || '-',
    "รูปแบบขอบ": (getVal('dpb-edge') === 'rounded') ? 'มุมมน' : 'มุมเหลี่ยม'
  };

  if (isLShape) {
    desk_spec["ขนาด Main (กว้างxยาว)"] = `${getNum('dpb-mw')} x ${getNum('dpb-ml')} cm`;
    desk_spec["ขนาด L-Side (กว้างxยาว)"] = `${getNum('dpb-aw')} x ${getNum('dpb-al')} cm`;
    const asideVal = getVal('dpb-aside');
    desk_spec["ฝั่งตัว L"] = (asideVal==='left') ? 'อยู่ทางซ้าย' : (asideVal==='right' ? 'อยู่ทางขวา' : '-');
  } else {
    desk_spec["ขนาดโต๊ะ (กว้างxยาว)"] = `${getNum('dpb-mw')} x ${getNum('dpb-ml')} cm`;
  }

  const options_list = [];
  const globalState = (typeof state !== 'undefined') ? state : {};
  if (globalState.optConfig) {
    Object.keys(globalState.optConfig).forEach(key => {
      const configs = globalState.optConfig[key];
      if (Array.isArray(configs) && configs.length > 0) {
        const nameCounts = {};
        configs.forEach(item => {
          let displayName = item.nameth || item.name || key;
          let vName = item.variantName || item.variant || item.variant_name || '';
          if (vName && vName !== '-' && vName !== 'Default') displayName += ` (${vName})`;
          nameCounts[displayName] = (nameCounts[displayName] || 0) + 1;
        });
        Object.keys(nameCounts).forEach(n => options_list.push({ "รายการ": n, "จำนวน": nameCounts[n] + ' ชิ้น' }));
      }
    });
  }

  // Canvas image
  const canvas = document.querySelector('canvas');
  let mimeType = 'image/jpeg', quality = 0.9;
  const activeBtn = document.querySelector('#dpb-bg button.active') || document.querySelector('#dpb-bg button.selected');
  if (activeBtn && activeBtn.getAttribute('data-value') === 'rgba(0,0,0,0)') { mimeType = 'image/png'; quality = 1.0; }
  const imgData = canvas ? canvas.toDataURL(mimeType, quality) : '';

  const ajaxEndpoint = (typeof dpb_ajax !== 'undefined') ? dpb_ajax.url : '';
  const nonce        = (typeof dpb_ajax !== 'undefined') ? dpb_ajax.nonce : '';

const privacyCheckbox = document.getElementById('dpbPrivacyCheckbox');
  const privacyAccepted = privacyCheckbox ? privacyCheckbox.checked : false;

  const postData = {
    action: 'dpb_send_proposal_v5',
    nonce: nonce,
    intent: dpbCurrentIntent,
    contact_info: contactInfo,
    question: question || '',
    image_data: imgData,
    summary_data: JSON.stringify({ "สเปคโต๊ะ": desk_spec, "รายการ_Options": options_list }),
    privacy_accepted: privacyAccepted ? '1' : '0'
  };

  // For demo purposes (no WordPress):
  if (!ajaxEndpoint) {
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove('loading');
      dpbShowSuccess();
    }, 1500);
    return;
  }

  jQuery.post(ajaxEndpoint, postData, function(response) {
    if (response.success) {
      dpbShowSuccess();
      
      // [แก้ไขจุดนี้] สั่งให้ระบบเก็บ Log (ตัว Snapshot เต็ม) ทันทีที่อีเมลถูกส่งสำเร็จ
      if (typeof DSLOG_Deskspace_collectAndSave === 'function') {
          DSLOG_Deskspace_collectAndSave();
      }

    } else {
      alert('เกิดข้อผิดพลาด: ' + (response.data || 'Unknown error'));
    }
  }).fail(function(xhr, status, error) {
    alert('Error: ' + error);
  }).always(function() {
    btn.disabled = false;
    btn.classList.remove('loading');
  });
}

function dpbShowSuccess() {
  const msgEl = document.getElementById('dpbSuccessMsg');
  if (dpbCurrentIntent === 'quote') {
    msgEl.innerHTML = 'ทีมงานได้รับคำขอใบเสนอราคาของคุณแล้ว<br>จะประเมินราคาและติดต่อกลับทาง <strong>Line หรืออีเมล</strong> โดยเร็วที่สุดค่ะ';
  } else {
    msgEl.innerHTML = 'ทีมงานได้รับข้อความของคุณแล้ว<br>เราจะรีบติดต่อกลับเพื่อดูแลและให้คำแนะนำ ภายใน 24 ชั่วโมงทำการค่ะ';
  }
  dpbShowView('success');
}

// Mobile button
document.addEventListener('DOMContentLoaded', function() {
  const mobileBtn = document.getElementById('dpb-mobile-quote-btn');
  if (mobileBtn) {
    mobileBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      dpbOpenModal();
    }, { passive: false });
    mobileBtn.addEventListener('click', function(e) {
      e.preventDefault();
      dpbOpenModal();
    });
  }
});

/* ====================================================
   DPB POSITION PICKER v3.2
   
   FIX LOG:
   #1  offsetX reset ตอนเพิ่มชิ้นที่ 3+
       → set ค่าหลัง buildOptConfig() เสร็จ โดยใช้ pending queue
   #2  top-center indicator อยู่ซ้าย
       → คำนวณ sx จากกึ่งกลาง zone ที่ถูกต้อง (cx=220)
       → สลับ: i=0 กลาง, i=1 ขวา +step, i=2 ซ้าย -step, ...
   #3  top-right indicator อยู่ซ้าย
       → slot[0] ชิดขวาสุด: sx = zd.x+zd.w-IND_PAD-IND_W = 418-6-32 = 380
       → slot[i] เรียงไปซ้าย
   #4  wrap ขึ้น row ใหม่เมื่อ sx ออกนอก boundary ของ zone
   #5  pp3-zlbl ไม่อยู่กึ่งกลาง Y
       → dominant-baseline:middle + JS set y = zd.y + zd.h/2
==================================================== */
(function(){
'use strict';

/* ================================================================
   ZONE GEOMETRY (SVG coordinates)
   top-left  : x=22,  w=124  → rightEdge=146  divider at x=151
   top-center: x=156, w=128  → cx=220         dividers at 151,289
   top-right : x=294, w=124  → rightEdge=418  divider at x=289
================================================================ */
const ZONE_DEF = {
  'top-left':   { x:22,  y:22, w:124, h:135, place:'left',   from:'top', defaultOx:10, defaultOy:5 },
  'top-center': { x:156, y:22, w:128, h:135, place:'center', from:'top', defaultOx:0,  defaultOy:5 },
  'top-right':  { x:294, y:22, w:124, h:135, place:'right',  from:'top', defaultOx:10, defaultOy:5 },
};

/*
  ขอบซ้าย/ขวาของแต่ละ zone ที่ indicator ห้ามเกิน
  (ใช้ขอบ zone จริงๆ ไม่ใช่ divider เพราะ indicator อยู่ภายใน zone เท่านั้น)
*/
const ZONE_LIMIT = {
  'top-left':   { xMin: 22,  xMax: 146 },   /* x + w - 0 */
  'top-center': { xMin: 156, xMax: 284 },   /* x + w - 0 */
  'top-right':  { xMin: 294, xMax: 418 },   /* x + w - 0 */
};

/* indicator slot dimensions */
const IND_W       = 32;   /* ความกว้าง rect ต่อ slot */
const IND_H       = 17;   /* ความสูง rect */
const IND_GAP     = 3;    /* ช่องว่างระหว่าง slot แนวนอน */
const IND_PAD     = 5;    /* padding ด้านข้างจากขอบ zone */
const IND_TOP     = 4;    /* ห่างจากขอบบนของ zone (y) */
const IND_ROW_GAP = 4;    /* ช่องว่างระหว่าง row */

const HOLE_TYPES  = ['hole_rect','hole_circle','track'];
const MIN_X = 10;
const MIN_Y = 5;
const GAP   = 5;

/* ================================================================
   DOM
================================================================ */
const $       = id => document.getElementById(id);
const modal   = $('dpb-pp3');
const bd      = $('dpb-pp3__bd');
const xBtn    = $('pp3-x');
const backBtn = $('pp3-back');
const okBtn   = $('pp3-ok');
const okLbl   = $('pp3-ok-lbl');
const imgEl   = $('pp3-img');
const nameEl  = $('pp3-name');
const dimEl   = $('pp3-dim');
const badgeEl = $('pp3-badge');
const pieceEl = $('pp3-piece');
const pnEl    = $('pp3-pn');
const ptEl    = $('pp3-pt');
const warnEl  = $('pp3-warn');
const warnTxt = $('pp3-warn-txt');
const offEl   = $('pp3-off');
const boxOx   = $('pp3-box-ox');
const boxOy   = $('pp3-box-oy');
const oxInput = $('pp3-ox-input');
const oyInput = $('pp3-oy-input');
const oxLbl   = $('pp3-ox-lbl');
const oyLbl   = $('pp3-oy-lbl');
const infoAuto= $('pp3-info-auto');
const zones   = document.querySelectorAll('.pp3-zone');

if (!modal) return;

/* ================================================================
   STATE
================================================================ */
let S = {};

function resetState(opts) {
  S = {
    open:    false,
    optKey:  opts.optKey,
    opMeta:  opts.opMeta,
    variant: opts.variant || '',
    qty:     opts.qty || 1,
    origFn:  opts.origFn,
    cbDone:  opts.cbDone,
    cbBack:  opts.cbBack,
    done:    [],
    cur:     0,
    zone:    null,
  };
}

/* ================================================================
   SVG HELPER
================================================================ */
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, text) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (text !== undefined) el.textContent = text;
  return el;
}

/* ================================================================
   ABBREVIATION  "Popup Socket (Wireless)" → "PSW"
================================================================ */
function makeAbbr(name) {
  const cleaned = String(name || '').replace(/[()[\]{}&]/g, ' ');
  const words   = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    /* 1-2 คำ: เอาหัวทุกคำ เช่น Soft Close → SC */
    return words.map(w => w[0].toUpperCase()).join('');
  }
  /* 3+ คำ: เอาแค่คำแรกกับคำสุดท้าย เช่น Mini Soft Close → MC */
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
/* totalInKey = จำนวนทั้งหมดของ option นั้น (existing + session)
   ถ้า totalInKey === 1 ไม่ต้องมีเลข */
function makeLabel(abbr, idx, totalInKey) {
  if (totalInKey <= 1) return abbr;
  return abbr + idx;
}
/* ================================================================
   BUILD INDICATOR ITEMS สำหรับ zone หนึ่งๆ
   รวม: existing (optConfig) + session done + current active slot
   *** แต่ละ item จะมี ox (offsetX จริง cm) และ w (กว้าง cm) ด้วย
       เพื่อให้ render indicator ตามตำแหน่งจริงบนท็อปโต๊ะ ***
================================================================ */
function buildIndicatorItems(zone) {
  const zd    = ZONE_DEF[zone];
  const gs    = window.state;
  const items = [];

  /* 1. existing จาก optConfig */
  if (gs && gs.optConfig) {
    let globalIdx = 0;
    Object.entries(gs.optConfig).forEach(([key, arr]) => {
      const op     = ((gs.meta && gs.meta.options) || []).find(o => o.key === key) || {};
      const abbr   = makeAbbr(op.name || key);
      const opType = String(op.type || '').toLowerCase();
      if (!HOLE_TYPES.includes(opType)) {
        globalIdx += (arr || []).length;
        return;
      }
      const totalInKey = (arr || []).length; /* จำนวนทั้งหมดของ key นี้ */
      (arr || []).forEach((cfg, localIdx) => {
        globalIdx++;
        if (cfg.place === zd.place && cfg.from === zd.from) {
          items.push({
            label: makeLabel(abbr, localIdx + 1, totalInKey),
            isExisting: true,
            ox: Number(cfg.offsetX) || MIN_X,
            w:  Number(cfg.w) || Number(op.defaultWcm) || 10,
            type: opType,
            key:  key,
            variant: cfg.variant || '',
          });
        }
      });
    });
  }

  /* 2. session done */
  const sessAbbr = makeAbbr((S.opMeta && S.opMeta.name) || S.optKey || '');
  let existingBase = 0;
  if (gs && gs.optConfig && gs.optConfig[S.optKey]) {
    existingBase = (gs.optConfig[S.optKey] || []).length;
  }
  /* totalInKey สำหรับ session = existing + qty ที่จะเพิ่ม */
  const sessTotalInKey = existingBase + S.qty;

  S.done.forEach((d, idx) => {
    if (d.zone === zone) {
      const op = S.opMeta || {};
      items.push({
        label: makeLabel(sessAbbr, existingBase + idx + 1, sessTotalInKey),
        isExisting: false,
        ox: Number(d.ox) || MIN_X,
        w:  Number(op.defaultWcm) || 10,
        type: String(op.type || '').toLowerCase(),
        key:  S.optKey,
        variant: S.variant || '',
      });
    }
  });

  /* 3. current slot */
  if (S.zone === zone) {
    const currentOx = (zone !== 'top-center') ? (parseFloat(document.getElementById('pp3-ox-input')?.value) || MIN_X) : 0;
    const op = S.opMeta || {};
    items.push({
      label: makeLabel(sessAbbr, existingBase + S.cur + 1, sessTotalInKey),
      isExisting: false,
      isCurrent: true,
      ox: currentOx,
      w:  Number(op.defaultWcm) || 10,
      type: String(op.type || '').toLowerCase(),
      key:  S.optKey,
      variant: S.variant || '',
    });
  }

  return items;
}

/* SVG desk boundaries (ท็อปโต๊ะทั้งหมด) */
const DESK_LEFT  = 22;   /* x ซ้ายสุดของท็อปโต๊ะ */
const DESK_RIGHT = 418;  /* x ขวาสุดของท็อปโต๊ะ */
const DESK_TOP_Y = 22;   /* y ของ indicator row แรก (zone y) */

/* x ที่ label ของแต่ละ zone เริ่ม (indicator ห้ามทับ label) */
/* label อยู่กึ่งกลาง zone → indicator ต้องหยุดก่อน zone ถัดไปเริ่ม
   ถ้า zone ถัดไปมี item: ใช้ divider เป็น barrier
   ถ้า zone ถัดไปว่าง: ข้ามผ่านได้ */
const ZONE_DIVIDERS = {
  'top-left':   { right: 151 },  /* divider ระหว่าง left กับ center */
  'top-center': { left: 151, right: 289 },
  'top-right':  { left: 289 },
};
/* ================================================================
   SHAPE SIZE — ย้ายออกนอก renderAllIndicators
================================================================ */
function getShapeSize(item) {
  if (item.key === 'mini_soft_close') return { w: 15, h: 15, shape: 'rect' };
  if (item.type === 'track' && item.key === 'power_track') {
    if (item.variant === '100cm') return { w: 120, h: 10, shape: 'rect' };
    return { w: 100, h: 10, shape: 'rect' };
  }
  switch (item.type) {
    case 'hole_rect':   return { w: 50, h: 20, shape: 'rect' };
    case 'hole_circle': return { w: 20, h: 20, shape: 'circle' };
    case 'track':       return { w: 100, h: 10, shape: 'rect' };
    default:            return { w: IND_W, h: IND_H, shape: 'rect' };
  }
}

function renderAllIndicators() {
  const allItems = {};
  Object.keys(ZONE_DEF).forEach(z => {
    allItems[z] = buildIndicatorItems(z);
  });

  Object.keys(ZONE_DEF).forEach(zone => {
    const zd    = ZONE_DEF[zone];
    const indG  = $('pp3-zind-' + zone);
    const zbgEl = $('pp3-zbg-' + zone);
    const lblEl = $('pp3-zlbl-' + zone);
    if (!indG || !zbgEl) return;

    indG.innerHTML = '';

    const items = allItems[zone];
    const count = items.length;

    if (count === 0) {
      if (lblEl) {
        lblEl.setAttribute('x', zd.x + zd.w / 2);
        lblEl.setAttribute('y', zd.y + zd.h / 2);
      }
      return;
    }

    /* ========== barrier ========== */
    let rightBarrier = DESK_RIGHT - IND_PAD;
    if (zone === 'top-left') {
      if (allItems['top-center'].length > 0)
        rightBarrier = ZONE_DIVIDERS['top-left'].right - IND_PAD;
      else if (allItems['top-right'].length > 0)
        rightBarrier = ZONE_DIVIDERS['top-center'].right - IND_PAD;
    } else if (zone === 'top-center') {
      if (allItems['top-right'].length > 0)
        rightBarrier = ZONE_DIVIDERS['top-center'].right - IND_PAD;
    }

    const y0   = zd.y + IND_TOP;
    const rowH = IND_H + IND_ROW_GAP;

    /* positions เก็บ { sx, sy, row, shapeW, shapeH, shape, cx }
       sx/sy = ตำแหน่งจริงของ shape (ไม่ใช่ slot อีกต่อไป)
       cx    = x กึ่งกลางสำหรับวาง text
    */
    const positions = [];

    /* ---- helper: clamp shape ไม่ให้ทะลุขอบโต๊ะ ---- */
    function clampX(rx, shapeW) {
      const minRx = DESK_LEFT + IND_PAD;
      const maxRx = DESK_RIGHT - IND_PAD - shapeW;
      return Math.max(minRx, Math.min(maxRx, rx));
    }

    /* ---------- top-left: ซ้าย→ขวา, step = shapeW จริง ---------- */
    if (zone === 'top-left') {
      let row = 0;
      let sx  = DESK_LEFT + IND_PAD;

      items.forEach((it, i) => {
        const size = getShapeSize(it);
        if (sx + size.w > rightBarrier && i > 0) {
          row++;
          sx = DESK_LEFT + IND_PAD;
        }
        const sy  = y0 + row * rowH;
        const rxC = clampX(sx, size.w);
        positions[i] = { sx: rxC, sy, row, shapeW: size.w, shapeH: size.h, shape: size.shape, cx: rxC + size.w / 2 };
        sx += size.w + IND_GAP;
      });
    }

    /* ---------- top-center: จากกลางออก ---------- */
else if (zone === 'top-center') {
  const cx0 = zd.x + zd.w / 2;

  /* แต่ละ item วางที่กึ่งกลาง แล้วลงแถวถัดไปเลย */
  items.forEach((it, i) => {
    const size = getShapeSize(it);
    const sx   = cx0 - size.w / 2;
    const sy   = y0 + i * rowH;
    const rxC  = clampX(sx, size.w);
    positions[i] = {
      sx: rxC, sy, row: i,
      shapeW: size.w, shapeH: size.h, shape: size.shape,
      cx: rxC + size.w / 2,
    };
  });
}

    /* ---------- top-right: ขวา→ซ้าย, step = shapeW จริง ---------- */
    else {
      let leftBarrier = DESK_LEFT + IND_PAD;
      if (allItems['top-center'].length > 0)
        leftBarrier = ZONE_DIVIDERS['top-right'].left + IND_PAD;
      else if (allItems['top-left'].length > 0)
        leftBarrier = ZONE_DIVIDERS['top-center'].left + IND_PAD;

      let row = 0;
      let sx  = DESK_RIGHT - IND_PAD; /* จะลบ shapeW ก่อนวาง */

      items.forEach((it, i) => {
        const size = getShapeSize(it);
        sx -= size.w; /* ขยับซ้ายก่อน */
        if (sx < leftBarrier && i > 0) {
          row++;
          sx = DESK_RIGHT - IND_PAD - size.w;
        }
        const sy  = y0 + row * rowH;
        const rxC = clampX(sx, size.w);
        positions[i] = { sx: rxC, sy, row, shapeW: size.w, shapeH: size.h, shape: size.shape, cx: rxC + size.w / 2 };
        sx -= IND_GAP; /* gap ก่อน item ถัดไป */
      });
    }

    /* ========== label Y ========== */
    const validPos  = positions.filter(Boolean);
    const maxRow    = validPos.length > 0 ? Math.max(...validPos.map(p => p.row)) : -1;
    const indBottom = maxRow >= 0
      ? (zd.y + IND_TOP) + (maxRow + 1) * IND_H + maxRow * IND_ROW_GAP
      : zd.y;

    if (lblEl) {
  lblEl.setAttribute('x', zd.x + zd.w / 2);
  lblEl.setAttribute('y', zd.y + zd.h / 2);  /* อยู่กึ่งกลาง zone เสมอ */
}

    /* ========== วาด shape + text ========== */
    items.forEach((item, i) => {
      if (!positions[i]) return;
      const { sx, sy, shapeW, shapeH, shape, cx } = positions[i];
      const cls = 'pp3-zi-rect'
        + (item.isExisting ? ' is-existing' : '')
        + (item.isCurrent  ? ' is-current'  : '');

      const cy = sy + IND_H / 2;  /* กึ่งกลาง Y ของ slot row */

      if (shape === 'circle') {
        indG.appendChild(svgEl('circle', {
          cx: cx,
          cy: cy,
          r:  shapeW / 2,
          class: cls,
        }));
      } else {
        indG.appendChild(svgEl('rect', {
          x:      sx,
          y:      cy - shapeH / 2,
          width:  shapeW,
          height: shapeH,
          rx: 2,
          class: cls,
        }));
      }

      /* text อยู่กึ่งกลาง shape จริง */
      indG.appendChild(svgEl('text', {
        x: cx,
        y: cy,
        class: 'pp3-zi-text' + (item.isExisting ? ' is-existing' : ''),
        'text-anchor':      'middle',
        'dominant-baseline':'central',
      }, item.label));
    });
  });
}

/* ================================================================
   GET EXISTING ITEMS — สำหรับ collision detection ใน offset
================================================================ */
function getExistingItems(zone, upToIdx) {
  const zd    = ZONE_DEF[zone];
  const items = [];
  const gs    = window.state;

  if (gs && gs.optConfig) {
    Object.entries(gs.optConfig).forEach(([key, arr]) => {
      const op = ((gs.meta && gs.meta.options) || []).find(o => o.key === key) || {};
      (arr || []).forEach(cfg => {
        if (cfg.place === zd.place && cfg.from === zd.from) {
          items.push({
            name: op.name || key,
            ox:   Number(cfg.offsetX) || MIN_X,
            w:    Number(cfg.w) || Number(op.defaultWcm) || 10,
          });
        }
      });
    });
  }

  S.done.slice(0, upToIdx).forEach(d => {
    if (d.zone === zone) {
      const op = S.opMeta || {};
      items.push({ name: op.name || S.optKey, ox: Number(d.ox) || MIN_X, w: Number(op.defaultWcm) || 10 });
    }
  });
  return items;
}

/* ================================================================
   GET EXISTING ITEMS CENTER — สำหรับคำนวณ offsetY ของ top-center
================================================================ */
function getExistingItemsCenter(upToIdx) {
  const items = [];
  const gs    = window.state;

  /* จาก optConfig ที่ save แล้ว */
  if (gs && gs.optConfig) {
    Object.entries(gs.optConfig).forEach(([key, arr]) => {
      const op = ((gs.meta && gs.meta.options) || []).find(o => o.key === key) || {};
      (arr || []).forEach(cfg => {
        if (cfg.place === 'center' && cfg.from === 'top') {
          items.push({
            name: op.name || key,
            oy:   Number(cfg.offsetY) || MIN_Y,
            h:    Number(cfg.h) || Number(op.defaultHcm) || 10,
          });
        }
      });
    });
  }

  /* จาก session done */
  S.done.slice(0, upToIdx).forEach(d => {
    if (d.zone === 'top-center') {
      const op = S.opMeta || {};
      items.push({
        name: op.name || S.optKey,
        oy:   Number(d.oy) || MIN_Y,
        h:    Number(op.defaultHcm) || 10,
      });
    }
  });

  return items;
}
/* ================================================================
   VALIDATE PLACEMENT
================================================================ */
function validatePlacement() {
  if (!S.zone) return;
  const valOx = S.zone === 'top-center' ? 0 : (parseFloat(oxInput.value) || 0);
  const valOy = parseFloat(oyInput.value) || 0;
  let warningMsg = null;
  let isError    = false;

  if (valOy < MIN_Y) {
    warningMsg = `ระยะห่างจากขอบบน ต้องไม่น้อยกว่า ${MIN_Y} cm`;
    isError = true;
  } else if (S.zone !== 'top-center' && valOx < MIN_X) {
    warningMsg = `ระยะห่างจากขอบซ้าย/ขวา ต้องไม่น้อยกว่า ${MIN_X} cm`;
    isError = true;
  }

  if (!isError && S.zone !== 'top-center') {
    const items = getExistingItems(S.zone, S.cur);
    const myW   = S.opMeta ? (Number(S.opMeta.defaultWcm) || 10) : 10;
    let overlapNames  = [];
    let recommendedOx = MIN_X;

    items.forEach(e => {
      const exStart = e.ox;
      const exEnd   = e.ox + e.w;
      const tStart  = valOx;
      const tEnd    = valOx + myW;
      if (!(tEnd <= exStart - GAP || tStart >= exEnd + GAP)) {
        if (!overlapNames.includes(e.name)) overlapNames.push(e.name);
      }
      recommendedOx = Math.max(recommendedOx, exEnd + GAP);
    });

    if (overlapNames.length > 0) {
      const dir      = S.zone === 'top-right' ? 'ขอบขวา' : 'ขอบซ้าย';
      const namesStr = overlapNames.map(n => `"${n}"`).join(', ');
      warningMsg = `ตำแหน่งทับซ้อนกับ ${namesStr} — แนะนำให้ขยับระยะห่างจาก${dir}เป็น ${Math.ceil(recommendedOx)} cm ขึ้นไป`;
      isError = true;
    }
  }

  if (isError) {
    warnEl.classList.add('show');
    warnTxt.textContent = warningMsg;
    okBtn.disabled = true;
  } else {
    warnEl.classList.remove('show');
    okBtn.disabled = false;
  }
}

/* ================================================================
   PICK ZONE
================================================================ */
function pickZone(zone) {
  S.zone = zone;
  zones.forEach(b => b.setAttribute('aria-pressed', b.dataset.zone === zone ? 'true' : 'false'));
  const zd = ZONE_DEF[zone];

  offEl.classList.add('show');

  if (zone === 'top-center') {
  boxOx.style.display = 'none';
  boxOy.style.display = 'flex';
  oyLbl.textContent   = 'จากขอบบน:';

  /* หา existing items ใน top-center ทั้งหมด (ไม่รวม current) */
  const centerItems = getExistingItemsCenter(S.cur);

  if (centerItems.length === 0) {
    /* อันแรก → ใช้ค่า default */
    oyInput.value = MIN_Y;
    infoAuto.classList.remove('show');
  } else {
    /* หา item สุดท้ายที่วางไว้ แล้วคำนวณ oy ถัดไป */
    const last   = centerItems[centerItems.length - 1];
    const safeOy = Math.ceil(last.oy + last.h + GAP);
    oyInput.value = safeOy;
    infoAuto.classList.add('show');
  }
	} else {
    boxOx.style.display = 'flex';
    boxOy.style.display = 'flex';

    const items = getExistingItems(zone, S.cur);
    const myW   = S.opMeta ? (Number(S.opMeta.defaultWcm) || 10) : 10;

    /* === First-Fit Gap Algorithm ===
       หาช่องว่างแรกจากขอบซ้าย (หรือขอบขวาสำหรับ top-right)
       ที่ item ใหม่ (กว้าง myW) วางได้โดยไม่ทับกับใคร (gap ≥ GAP cm)
       ถ้าไม่มีช่องว่างพอ → ต่อท้ายตามเดิม
    */
    let safeOx;
    if (items.length === 0) {
      safeOx = MIN_X;
    } else {
      /* เรียง items ตาม ox */
      const sorted = items.slice().sort((a, b) => a.ox - b.ox);

      /* ลองวางที่ MIN_X ก่อน */
      safeOx = null;
      const candidates = [MIN_X];
      /* เพิ่ม candidate หลังจบแต่ละ item */
      sorted.forEach(e => candidates.push(e.ox + e.w + GAP));

      for (const cOx of candidates) {
        if (cOx < MIN_X) continue;
        /* ตรวจว่าวางที่ cOx ได้โดยไม่ทับใคร */
        const tStart = cOx;
        const tEnd   = cOx + myW;
        const clash  = sorted.some(e => {
          const exStart = e.ox;
          const exEnd   = e.ox + e.w;
          return !(tEnd <= exStart - GAP || tStart >= exEnd + GAP);
        });
        if (!clash) { safeOx = cOx; break; }
      }

      /* ถ้าไม่มีช่อง → ต่อท้าย */
      if (safeOx === null) {
        safeOx = sorted.reduce((acc, e) => Math.max(acc, e.ox + e.w + GAP), MIN_X);
      }
    }
    safeOx = Math.ceil(safeOx);

    oxInput.value       = safeOx;
    oyInput.value       = Math.max(zd.defaultOy, MIN_Y);
    oxLbl.textContent   = zone === 'top-right' ? 'จากขอบขวา:' : 'จากขอบซ้าย:';
    oyLbl.textContent   = 'จากขอบบน:';

    if (safeOx > MIN_X) infoAuto.classList.add('show');
    else                 infoAuto.classList.remove('show');
  }

  okLbl.textContent = (S.cur < S.qty - 1) ? 'ยืนยัน — ชิ้นถัดไป' : 'ยืนยัน & เพิ่มลงโต๊ะ';
  renderAllIndicators();
  validatePlacement();
}

/* ================================================================
   OPEN MODAL
================================================================ */
function openPP(opts) {
  resetState(opts);

  const op   = S.opMeta || {};
  const imgs = String(op.imageUrl || '').split(',').map(s => s.trim()).filter(Boolean);
  let thumb  = imgs[0] || '';
  if (S.variant && Array.isArray(op.variants)) {
    const v = op.variants.find(vv => vv.name === S.variant);
    if (v && v.imageUrl) thumb = String(v.imageUrl).split(',')[0].trim();
  }
  imgEl.src           = thumb;
  nameEl.textContent  = op.name || S.optKey;
  dimEl.textContent   = [S.variant, op.defaultWcm ? `${op.defaultWcm}×${op.defaultHcm} cm` : ''].filter(Boolean).join(' · ') || '—';
  badgeEl.textContent = S.qty;

  if (S.qty > 1) { pieceEl.style.display = ''; pnEl.textContent = 1; ptEl.textContent = S.qty; }
  else             pieceEl.style.display = 'none';

  zones.forEach(b => b.setAttribute('aria-pressed', 'false'));
  okBtn.disabled = true;
  warnEl.classList.remove('show');
  infoAuto.classList.remove('show');
  offEl.classList.remove('show');

  renderAllIndicators();

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  S.open = true;
}

/* ================================================================
   CLOSE MODAL
================================================================ */
function closePP() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  S.open = false;
}

/* ================================================================
   CONFIRM PIECE
================================================================ */
function confirmPiece() {
  const zone  = S.zone; if (!zone) return;
  const zd    = ZONE_DEF[zone];
  const valOx = zone === 'top-center' ? 0 : (parseFloat(oxInput.value) || 0);
  const valOy = parseFloat(oyInput.value) || 0;

  S.done.push({ zone, place: zd.place, from: zd.from, ox: valOx, oy: valOy });

  const next = S.cur + 1;
  if (next < S.qty) {
    S.cur  = next;
    S.zone = null;
    pnEl.textContent = next + 1;
    zones.forEach(b => b.setAttribute('aria-pressed', 'false'));
    okBtn.disabled = true;
    warnEl.classList.remove('show');
    infoAuto.classList.remove('show');
    offEl.classList.remove('show');
    renderAllIndicators();
  } else {
    const sel     = [...S.done];
    const origFn  = S.origFn;
    const cbDone  = S.cbDone;
    const optKey  = S.optKey;
    const variant = S.variant;
    closePP();
    if (typeof cbDone === 'function') cbDone(sel, origFn, optKey, variant);
  }
}

/* ================================================================
   EVENTS
================================================================ */
zones.forEach(btn => {
  btn.addEventListener('click', e => {
    const zone = btn.dataset.zone; if (!zone) return;
    const rip = document.createElement('div');
    rip.className  = 'pp3-rip';
    rip.style.left = e.clientX + 'px';
    rip.style.top  = e.clientY + 'px';
    document.body.appendChild(rip);
    setTimeout(() => rip.remove(), 600);
    pickZone(zone);
  });
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
  });
});

oxInput.addEventListener('input', () => { validatePlacement(); renderAllIndicators(); });
oyInput.addEventListener('input', validatePlacement);
okBtn.addEventListener('click', confirmPiece);
backBtn.addEventListener('click', () => { const cb = S.cbBack; closePP(); if (typeof cb === 'function') cb(); });
xBtn.addEventListener('click', closePP);
bd.addEventListener('click', closePP);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.open) closePP(); });

let _tries = 0;
function installIntercept() {
  _tries++;
  const fn = window.addOptionWithVariantAndQty;
  if (typeof fn !== 'function') {
    if (_tries < 30) setTimeout(installIntercept, _tries < 10 ? 300 : 800);
    return;
  }
  if (fn.__pp3) return;
  const origFn = fn;

  window.addOptionWithVariantAndQty = function pp3_intercept(optKey, variantName, qty) {
    const gs = window.state;
    if (!gs) return origFn(optKey, variantName, qty);

    const op = ((gs.meta && gs.meta.options) || []).find(o => o.key === optKey) || {};
    const t  = String(op.type || '').toLowerCase();
    if (!HOLE_TYPES.includes(t)) return origFn(optKey, variantName, qty);

    openPP({
      optKey,
      variant: variantName || '',
      qty:     qty || 1,
      opMeta:  op,
      origFn:  origFn,
      cbBack: function() {
        const card = document.querySelector(`.dpb-opt-item[data-key="${CSS.escape(optKey)}"]`);
        if (card) card.click();
      },


      cbDone: function(selections, origFn2, oKey, oVariant) {

        /* --- helper: เซ็ต position บน entry โดย uid --- */
        function applyByUid(arr, uid, pos) {
          if (!arr || !uid) return;
          const ent = arr.find(e => e && e.uid === uid);
          if (ent) {
            ent.place   = pos.place;
            ent.from    = pos.from;
            ent.offsetX = pos.ox;
            ent.offsetY = pos.oy;
          }
        }

        /* --- helper: snapshot uid+position ของทุก entry ปัจจุบัน --- */
        function snapshotPositions(arr) {
          const map = new Map();
          (arr || []).forEach(e => {
            if (e && e.uid) {
              map.set(e.uid, {
                place:   e.place,
                from:    e.from,
                ox:      e.offsetX,
                oy:      e.offsetY,
              });
            }
          });
          return map;
        }

        /* 1. Snapshot ค่าเก่าทั้งหมดก่อน loop */
        const oldSnapshot = snapshotPositions(gs.optConfig[oKey]);

        /* uid ของ entry ใหม่แต่ละชิ้น (จะเก็บหลัง origFn2) */
        const newEntries = []; /* [{ uid, sel }] */

        selections.forEach(sel => {

          /* Snapshot ก่อน call เพื่อหา uid ใหม่ */
          const uidsBefore = new Set((gs.optConfig[oKey] || []).map(e => e && e.uid).filter(Boolean));

          origFn2(oKey, oVariant || '', 1);

          /* หา uid ใหม่ = uid ที่ไม่เคยมีก่อน */
          const arr = gs.optConfig[oKey] || [];
          let newUid = null;
          for (const e of arr) {
            if (e && e.uid && !uidsBefore.has(e.uid)) { newUid = e.uid; break; }
          }
          /* fallback: index สุดท้าย (push) */
          if (!newUid && arr[arr.length - 1]) newUid = arr[arr.length - 1].uid || null;

          newEntries.push({ uid: newUid, sel });

          /* เซ็ตทันทีหลัง origFn2 (ก่อน origFn2 ของชิ้นถัดไป) */
          applyByUid(arr, newUid, sel);

          /* Restore ค่าเก่าที่ origFn2 อาจ rebuild ทิ้ง */
          oldSnapshot.forEach((pos, uid) => applyByUid(arr, uid, pos));
        });

        /* 4. หลัง loop ทั้งหมด: เรียก buildOptConfig อีกครั้งเพื่อ render UI
              แล้ว restore ทุกค่าอีกรอบด้วย uid */
        if (typeof window.buildOptConfig === 'function') window.buildOptConfig();

        const arrFinal = gs.optConfig && gs.optConfig[oKey];
        newEntries.forEach(({ uid, sel }) => applyByUid(arrFinal, uid, sel));
        oldSnapshot.forEach((pos, uid) => applyByUid(arrFinal, uid, pos));

        if (typeof window.scheduleRedraw === 'function') window.scheduleRedraw();
			const pp3Thumb = document.getElementById('pp3-img');
		if (pp3Thumb && typeof window.flyBitmapToCart === 'function') {
			const r = pp3Thumb.getBoundingClientRect();
		if (r.width > 0 && r.height > 0) {
    window.flyBitmapToCart(pp3Thumb.currentSrc || pp3Thumb.src, r);
			}
		}
		
      }
    });
  };

  window.addOptionWithVariantAndQty.__pp3 = true;
  window.__dpbPP3 = { open: openPP, close: closePP };
}
setTimeout(installIntercept, 200);

})();

// ============================================================
// DS ADMIN MODE — Toggle + Override desk size constraints (V3 - Deep State Swap)
// ============================================================
;(function() {

  document.addEventListener('DOMContentLoaded', function() {
      
      // ----- State -----
      window.dsAdminModeState = {
        active:      false,
        models:      null,   
        loading:     false,
        originalModels: null // ใช้เก็บ Backup ตารางโมเดลปกติ
      };

      const $btn    = document.getElementById('ds-admin-mode-btn');
      const $badge  = document.getElementById('ds-admin-mode-badge');

      if (!$btn) return;

      // ----- Toast Helper -----
      let $toast;
      function showToast(msg, duration = 3000) {
        if (!$toast) {
          $toast = document.createElement('div');
          $toast.className = 'ds-admin-toast';
          document.body.appendChild($toast);
        }
        $toast.innerHTML = msg;
        $toast.classList.add('is-visible');
        clearTimeout($toast._tid);
        $toast._tid = setTimeout(() => $toast.classList.remove('is-visible'), duration);
      }

      // ----- Fetch AdminModels from WP AJAX -----
      function fetchAdminModels() {
        return new Promise((resolve, reject) => {
          const fd = new FormData();
          fd.append('action', 'ds_get_admin_models');
          
          const securityNonce = (typeof window.dsAdminMode !== 'undefined' && window.dsAdminMode.nonce) ? window.dsAdminMode.nonce : '';
          fd.append('security', securityNonce);
          fd.append('force_refresh', '1');

          const ajaxUrl = (typeof window.dsAdminMode !== 'undefined' && window.dsAdminMode.ajaxUrl) 
            ? window.dsAdminMode.ajaxUrl 
            : (typeof AJAX_URL !== 'undefined' ? AJAX_URL : (window.location.origin + '/test-site/wp-admin/admin-ajax.php'));

          fetch(ajaxUrl, { 
            method: 'POST', 
            body: fd,
            credentials: 'same-origin'
          })
          .then(async r => {
            const text = await r.text();
            try { return JSON.parse(text); } 
            catch(e) { throw new Error('Server returned invalid JSON.'); }
          })
          .then(res => {
            if (res && res.success && res.data && res.data.models) {
              window.dsAdminModeState.models = res.data.models;
              resolve(res.data.models);
            } else {
              reject(res?.data || 'Failed to load AdminModels');
            }
          })
          .catch(err => reject(err.message || 'Network Error'));
        });
      }

      // ----- DEEP SWAP STATE (สับเปลี่ยนหน่วยความจำของสคริปต์หลัก) -----
      function swapGlobalModels(newModels) {
        let foundObj = null;
        let foundKey = null;

        // ฟังก์ชันช่วยค้นหา Array ตารางโต๊ะที่ซ่อนอยู่ในตัวแปรหลัก
        function search(obj, depth) {
          if (depth > 4 || !obj) return;
          for (let k in obj) {
            if (k === 'dsAdminModeState' || k === 'ds_auth_vars' || k === 'wpData') continue;
            try {
              let val = obj[k];
              // ตรวจสอบว่านี่คือ Array ของ Models ใช่หรือไม่ (ต้องมี min_w, max_w)
              if (Array.isArray(val) && val.length > 0 && val[0].hasOwnProperty('min_w') && val[0].hasOwnProperty('max_w') && val[0].hasOwnProperty('model')) {
                foundObj = obj;
                foundKey = k;
                return;
              }
              if (typeof val === 'object' && val !== null) {
                search(val, depth + 1);
              }
            } catch(e) {}
            if (foundObj) break;
          }
        }

        // 1. เล็งเป้าหมายหลักที่ใช้บ่อยใน DeskSpace
        if (window.state && window.state.models) {
          foundObj = window.state; foundKey = 'models';
        } else if (window.state && window.state.meta && window.state.meta.models) {
          foundObj = window.state.meta; foundKey = 'models';
        } else {
          // 2. ถ้าไม่เจอ ให้ค้นหาทั่วทั้งระบบ (window)
          search(window, 0); 
        }

        if (foundObj && foundKey) {
          // ถ้ายังไม่มี Backup ของเก่า ให้เก็บไว้ก่อน
          if (!window.dsAdminModeState.originalModels) {
            window.dsAdminModeState.originalModels = JSON.parse(JSON.stringify(foundObj[foundKey]));
          }
          // เขียนทับตารางด้วยข้อมูลใหม่
          foundObj[foundKey] = newModels;
          console.log(`[AdminMode] ✅ สับเปลี่ยนตารางข้อจำกัดสำเร็จที่ตัวแปร: .${foundKey}`);
          return true;
        } else {
          console.warn('[AdminMode] ❌ ไม่พบตารางข้อจำกัดในหน่วยความจำ สคริปต์หลักอาจจะซ่อนตัวแปรไว้');
          return false;
        }
      }

      // ----- Apply Admin Constraints -----
      function applyAdminConstraints(adminModels) {
        const type = document.getElementById('dpb-type')?.value || '';
        
        // 1. สับเปลี่ยนหน่วยความจำของสคริปต์ 16,000 บรรทัด
        swapGlobalModels(adminModels);

        const model = adminModels.find(m => m.model === type);
        if (!model) return;

        // 2. เปลี่ยน Attributes ของ HTML เผื่อไว้
        const fieldMap = {
          'dpb-ml':  { min: 'min_l',  max: 'max_l'  },
          'dpb-mw':  { min: 'min_w',  max: 'max_w'  },
          'dpb-al':  { min: 'min_al', max: 'max_al' },
          'dpb-aw':  { min: 'min_aw', max: 'max_aw' },
        };

        Object.entries(fieldMap).forEach(([inputId, keys]) => {
          const el = document.getElementById(inputId);
          if (!el) return;

          if (!el.dataset.origMin) el.dataset.origMin = el.min;
          if (!el.dataset.origMax) el.dataset.origMax = el.max;

          if (model[keys.min] !== undefined) el.min = model[keys.min];
          if (model[keys.max] !== undefined) el.max = model[keys.max];

          el.style.borderColor  = '#b69652';
          el.style.boxShadow    = '0 0 0 2px rgba(182,150,82,0.2)';
        });

        triggerRevalidate();
      }

      // ----- Restore Original Constraints -----
      function restoreConstraints() {
        // 1. คืนค่าหน่วยความจำเดิมให้สคริปต์หลัก
        if (window.dsAdminModeState.originalModels) {
           swapGlobalModels(window.dsAdminModeState.originalModels);
        }

        // 2. คืนค่า HTML
        ['dpb-ml','dpb-mw','dpb-al','dpb-aw'].forEach(inputId => {
          const el = document.getElementById(inputId);
          if (!el) return;
          if (el.dataset.origMin !== undefined) el.min = el.dataset.origMin;
          if (el.dataset.origMax !== undefined) el.max = el.dataset.origMax;
          el.style.borderColor = '';
          el.style.boxShadow   = '';
        });

        triggerRevalidate();
      }

      // ----- Trigger DPB Revalidate & Redraw -----
      function triggerRevalidate() {
        if (typeof window.validateInputs === 'function') {
          setTimeout(() => window.validateInputs(), 50);
        }
        if (typeof window.scheduleRedraw === 'function') {
          setTimeout(() => window.scheduleRedraw(), 100);
        }
      }

      // ----- Toggle Admin Mode -----
      async function toggleAdminMode() {
        if (window.dsAdminModeState.loading) return;

        const willActivate = !window.dsAdminModeState.active;

        if (willActivate) {
          window.dsAdminModeState.loading = true;
          $btn.disabled = true;
          $btn.querySelector('.ds-admin-mode-label').innerHTML = '<span class="ds-desktop-label">กำลังโหลด...</span><span class="ds-mobile-label">โหลด...</span>';

          try {
            const adminModels = await fetchAdminModels();
            window.dsAdminModeState.active = true;

            $btn.classList.add('is-active');
            $btn.setAttribute('aria-pressed', 'true');
            $btn.querySelector('.ds-admin-mode-label').innerHTML = '<span class="ds-desktop-label">โหมดปลดล็อกขนาดโต๊ะ</span><span class="ds-mobile-label">ปลดล็อก</span>';
            if ($badge) $badge.style.display = 'flex';

            applyAdminConstraints(adminModels);
            showToast('🔐 โหมดปลดล็อกขนาดโต๊ะเปิดอยู่ — ขนาดโต๊ะใช้ค่า AdminModels');

            document.getElementById('dpb-type')?.addEventListener('change', onDeskTypeChange);
          } catch (e) {
            showToast('❌ โหลด Admin Models ไม่สำเร็จ: ' + String(e));
            $btn.querySelector('.ds-admin-mode-label').innerHTML = '<span class="ds-desktop-label">โหมดปลดล็อกขนาดโต๊ะ</span><span class="ds-mobile-label">ปลดล็อก</span>';
          } finally {
            window.dsAdminModeState.loading = false;
            $btn.disabled = false;
          }

        } else {
          window.dsAdminModeState.active = false;
          $btn.classList.remove('is-active');
          $btn.setAttribute('aria-pressed', 'false');
          if ($badge) $badge.style.display = 'none';

          restoreConstraints();
          document.getElementById('dpb-type')?.removeEventListener('change', onDeskTypeChange);
          showToast('🔓 ปิดโหมดปลดล็อกขนาดโต๊ะแล้ว — กลับสู่ค่าขนาดปกติ');
        }
      }

      function onDeskTypeChange() {
        if (!window.dsAdminModeState.active || !window.dsAdminModeState.models) return;
        setTimeout(() => applyAdminConstraints(window.dsAdminModeState.models), 150);
      }

      $btn.addEventListener('click', toggleAdminMode);

  }); // ปิด DOMContentLoaded
})();

// Expose core UI functions to global window scope so that HTML inline event handlers can access them
window.dpbOpenModal = dpbOpenModal;
window.dpbCloseModal = dpbCloseModal;
window.dpbSelectIntent = dpbSelectIntent;
window.dpbGoBack = dpbGoBack;
window.dpbOpenPrivacyView = dpbOpenPrivacyView;
window.dpbClosePrivacyView = dpbClosePrivacyView;
window.dpbSubmitForm = dpbSubmitForm;

// Expose key cart functions globally
window.buildOptConfig = buildOptConfig;
window.buildOptions = buildOptions;
window.refreshAllCartForms = refreshAllCartForms;
window.showMiniRemoveConfirm = showMiniRemoveConfirm;
window.hideMiniRemoveConfirm = hideMiniRemoveConfirm;

// Bind custom cart button (outside the configurator, e.g. in theme menu) to open the cart panel
document.addEventListener('DOMContentLoaded', function() {
    const customCartBtn = document.getElementById('dpb-custom-cart-btn');
    if (customCartBtn) {
        customCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof buildOptConfig === 'function') {
                buildOptConfig();
            }
            const cartPanel = document.getElementById('dpb-cart-panel');
            const backdrop = document.getElementById('dpb-cart-backdrop');
            if (cartPanel) {
                cartPanel.classList.add('is-open');
                if (typeof window.openCart === 'function') {
                    window.openCart();
                } else {
                    const empty = document.getElementById('dpb-cart-empty');
                    const body  = document.getElementById('dpb-cart-body');
                    if (body && empty) {
                        const hasItems = body.children.length > 0;
                        empty.style.display = hasItems ? 'none' : 'block';
                        body.style.display  = hasItems ? 'flex' : 'none';
                    }
                    document.body.classList.add('dpb-cart-lock');
                }
            }
            if (backdrop) backdrop.classList.add('is-active');
        });
    }

    const originalBadge = document.getElementById('dpb-cart-count');
    const newBadge = document.getElementById('dpb-custom-cart-count');
    if (originalBadge && newBadge) {
        const observer = new MutationObserver(function() {
            const count = originalBadge.innerText || '0';
            newBadge.innerText = count;
            newBadge.style.display = (count !== '0') ? 'inline-block' : 'none';
        });
        observer.observe(originalBadge, { childList: true, subtree: true, characterData: true });
        
        // Initial sync
        const count = originalBadge.innerText || '0';
        newBadge.innerText = count;
        newBadge.style.display = (count !== '0') ? 'inline-block' : 'none';
    }
});