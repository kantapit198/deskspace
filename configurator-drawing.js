function drawCustomDeskLegsLayer({ x, y, w, h, sc, topClip, alphaOverride }){
  if (state?.flags?.showLegs === false) return;
  const type = byId('dpb-type')?.value;
  if(type !== 'custom') return;
  const Lcm = +byId('dpb-ml').value || 0;
  const Wcm = +byId('dpb-mw').value || 0;
  const legAssetsSel = getLegAssetsBySelection();
  const imgL = loadLegImage(legAssetsSel.left,    scheduleRedraw);
  const imgC = loadLegImage(legAssetsSel.center, scheduleRedraw);
  const imgR = loadLegImage(legAssetsSel.right,  scheduleRedraw);
  if(!imgL || !imgC || !imgR) return;
  const layout = computeLegLayoutRectDesk({ x, y, w, h, sc, Lcm, Wcm });
  const elA = byId('dpb-gapA'), elB = byId('dpb-gapB');
  if (elA) setFieldError(elA, '');
  if (elB) setFieldError(elB, '');
  const valA = elA ? (+String(elA.value||'').trim() || 0) : 0;
  const valB = elB ? (+String(elB.value||'').trim() || 0) : 0;
  let okMin = true;
  if (elA && valA < 5){ setFieldError(elA, 'แนะนำให้ขอบโต๊ะมีระยะห่าง 5 cm ขึ้นไป'); okMin=false; }
  if (elB && valB < 5){ setFieldError(elB, 'แนะนำให้ขอบโต๊ะมีระยะห่าง 5 cm ขึ้นไป'); okMin=false; }
  if (!okMin) return;
  const { ok, overCm, maxA, maxB } = dpb_calcCustomOverlap(Lcm, valA, valB, 4);
  if (!ok){
    if (elA) setFieldError(elA, `กรุณาลดระยะห่างลงอีก ${overCm} cm (ห้ามเกิน ${maxA} cm)`);
    if (elB) setFieldError(elB, `กรุณาลดระยะห่างลงอีก ${overCm} cm (ห้ามเกิน ${maxB} cm)`);
    return;
  }
  ctx.save();
  if(topClip && topClip.enable){
    ctx.beginPath();
    if (ctx.roundRect){
      ctx.roundRect(topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii);
    } else {
      roundedPath(ctx, topClip.x, topClip.y, topClip.w, topClip.h,
        topClip.radii[0], topClip.radii[1], topClip.radii[2], topClip.radii[3]);
    }
    ctx.clip();
  }
  const colorRaw = getLegColorFromSelection();
  const legColor = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
  let alpha = (legColor === 'black') ? 1.00 : 1.00;
  if (typeof alphaOverride === 'number') alpha = alphaOverride;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  try{ ctx.drawImage(imgR, layout.rightRect.x, layout.rightRect.y, layout.rightRect.w, layout.rightRect.h); }catch(e){}
  ctx.save();
  const cropW = Math.max(0, layout.crop.rightX - layout.crop.leftX);
  if(cropW > 0){
    ctx.beginPath();
    ctx.rect(layout.crop.leftX, y, cropW, h);
    ctx.clip();
    try{ ctx.drawImage(imgC, layout.centerRect.x, layout.centerRect.y, layout.centerRect.w, layout.centerRect.h); }catch(e){}
  }
  ctx.restore();
  try{ ctx.drawImage(imgL, layout.leftRect.x, layout.leftRect.y, layout.leftRect.w, layout.leftRect.h); }catch(e){}
  ctx.restore();
}

function cmOverToInt(over){
  if (over <= 0) return 0;
  return (over < 0.5) ? 0 : Math.ceil(over);
}

function l3_pxToCm(px){ return px / 10; }

function l3_cmToPx(cm, sc){ return cm * sc; }

const LEG_DIMS_L3_LEFT_CM = {
  centerLeft: { w: 13.1, h: 110.0 },
  topCenter:  { w: 110.0, h: 13.1 },
  bottomLeft: { w: 57.5, h: 51.0 },
  topLeft:    { w: 98.0,  h: 83.0 },
  right:      { w: 62.5,  h: 57.5 },
};

const LEG_DIMS_L3_RIGHT_CM = {
  centerRight:{ w: 13.1, h: 110.0 },
  topCenter:  { w: 110.0, h: 13.1 },
  bottomRight:{ w: 57.5, h: 51.0 },
  topRight:   { w: 98.0,  h: 83.0 },
  left:       { w: 62.5,  h: 57.5 },
};



const LEG_DIMS_L3_TOP_V3_CM = { w: 83.0, h: 98.0 };

LEG_ASSETS_L3.white.left.topLeft_v3    = "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Top-Left-White-v3.png";
LEG_ASSETS_L3.white.right.topRight_v3  = "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Top-Right-White-v3.png";
LEG_ASSETS_L3.black.left.topLeft_v3    = "https://www.deskspace.in.th/wp-content/uploads/2025/10/Left-3-Leg-Top-Left-Black-v3.png";
LEG_ASSETS_L3.black.right.topRight_v3  = "https://www.deskspace.in.th/wp-content/uploads/2025/10/Right-3-Leg-Top-Right-Black-v3.png";

function getL3AssetsAndDims(side){
  const color = (getLegColorFromSelection() || 'white').toLowerCase();
  const pal = LEG_ASSETS_L3[color] || LEG_ASSETS_L3.white;
  if (String(side).toLowerCase()==='left') {
    return { A: pal.left, D: LEG_DIMS_L3_LEFT_CM, side: 'left' };
  } else {
    return { A: pal.right, D: LEG_DIMS_L3_RIGHT_CM, side: 'right' };
  }
}

function computeLegLayoutL3Rects({ rect1, rect2, sc, Lcm, side }){
  const gaps = (typeof window.dpb_getLegGaps==='function') ? window.dpb_getLegGaps() : {A:5,B:5};
  if (side==='left'){
    const rightW = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.right.w, sc);
    const rightH = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.right.h, sc);
    const rightX = rect1.x + rect1.w - l3_cmToPx(Math.max(5,gaps.A), sc) - rightW;
    const rightY = rect1.y + (rect1.h - rightH)/2;
    const blW = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.bottomLeft.w, sc);
    const blH = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.bottomLeft.h, sc);
    const blX = rect2.x + (rect2.w - blW)/2;
    const blY = rect2.y + rect2.h - l3_cmToPx(Math.max(5,gaps.B), sc) - blH;
    const tlW = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.topLeft.w, sc);
    const tlH = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.topLeft.h, sc);
    const tlX = blX;
    const tlY = rightY;
    const tcW = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.topCenter.w, sc);
    const tcH = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.topCenter.h, sc);
    const tcX = rect1.x + (rect1.w - tcW)/2;
    const tcY = rect1.y + (rect1.h - tcH)/2;
    const clW = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.centerLeft.w, sc);
    const clH = l3_cmToPx(LEG_DIMS_L3_LEFT_CM.centerLeft.h, sc);
    const clX = rect2.x + (rect2.w - clW)/2;
    const clY = rect2.y + (rect2.h - clH)/2;
    const topLeftLeftInsetCm = (tlX - rect1.x) / sc;
    const cropLeftX  = rect1.x + l3_cmToPx(topLeftLeftInsetCm + 98.0, sc);
    const cropRightX = rect1.x + rect1.w - l3_cmToPx(Math.max(5,gaps.A) + 51.0, sc);
    const cropTopY   = rect1.y + l3_cmToPx(((tlY - rect1.y)/sc) + 83.0, sc);
    const cropBotY   = rect2.y + rect2.h - l3_cmToPx(56.0, sc);
    return {
      side:'left',
      rightRect:{ x:rightX, y:rightY, w:rightW, h:rightH },
      bottomLeft:{ x:blX, y:blY, w:blW, h:blH },
      topLeft:{ x:tlX, y:tlY, w:tlW, h:tlH },
      topCenter:{ x:tcX, y:tcY, w:tcW, h:tcH },
      centerLeft:{ x:clX, y:clY, w:clW, h:clH },
      cropTopCenterX:{ leftX: cropLeftX, rightX: cropRightX },
      cropCenterLeftY:{ topY: cropTopY, botY: cropBotY },
    };
  } else {
    const leftW = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.left.w, sc);
    const leftH = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.left.h, sc);
    const leftX = rect1.x + l3_cmToPx(Math.max(5,gaps.A), sc);
    const leftY = rect1.y + (rect1.h - leftH)/2;
    const brW = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.bottomRight.w, sc);
    const brH = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.bottomRight.h, sc);
    const brX = rect2.x + (rect2.w - brW)/2;
    const brY = rect2.y + rect2.h - l3_cmToPx(Math.max(5,gaps.B), sc) - brH;
    const trW = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.topRight.w, sc);
    const trH = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.topRight.h, sc);
    const trX = brX + (brW - trW);
    const trY = leftY;
    const tcW = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.topCenter.w, sc);
    const tcH = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.topCenter.h, sc);
    const tcX = rect1.x + (rect1.w - tcW)/2;
    const tcY = rect1.y + (rect1.h - tcH)/2;
    const crW = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.centerRight.w, sc);
    const crH = l3_cmToPx(LEG_DIMS_L3_RIGHT_CM.centerRight.h, sc);
    const crX = brX + (brW - crW)/2;
    const crY = rect2.y + (rect2.h - crH)/2;
    const rightInsetPx = (rect1.x + rect1.w) - (trX + trW);
    const cropTopCenterX = {
      leftX : rect1.x + l3_cmToPx(Math.max(5,gaps.A) + 51.0, sc),
      rightX: (rect1.x + rect1.w) - (rightInsetPx + l3_cmToPx(98.0, sc)),
    };
    const cropCenterRightY = {
      topY: rect1.y + ((trY - rect1.y) + l3_cmToPx(83.0, sc)),
      botY: rect2.y + rect2.h - l3_cmToPx(56.0, sc),
    };
    return {
      side:'right',
      leftRect:{ x:leftX, y:leftY, w:leftW, h:leftH },
      bottomRight:{ x:brX, y:brY, w:brW, h:brH },
      topRight:{ x:trX, y:trY, w:trW, h:trH },
      topCenter:{ x:tcX, y:tcY, w:tcW, h:tcH },
      centerRight:{ x:crX, y:crY, w:crW, h:crH },
      cropTopCenterX,
      cropCenterRightY,
    };
  }
}

if (typeof window.cmOverToInt !== 'function'){
  window.cmOverToInt = function cmOverToInt(over){
    if (over <= 0) return 0;
    return (over < 0.5) ? 0 : Math.ceil(over);
  };
}

function drawL3LegsLayer(args){
  if (state?.flags?.showLegs === false) return;
  if ((byId('dpb-type')?.value || '').trim() !== 'l3') return;
  const rect1 = args.rect1, rect2 = args.rect2, sc = args.sc;
  if (!rect1 || !rect2 || !sc) return;
  const sideSel = (args.side || byId('dpb-aside')?.value || 'right').toLowerCase();
  const Awcm    = +byId('dpb-aw')?.value || 0;
  const useV3   = Awcm >= 160;
  const pack = getL3AssetsAndDims(sideSel);
  const A = pack.A;
  const img = {};
  for (const k in A){ img[k] = loadLegImage(A[k], scheduleRedraw); }
  if (useV3){
    if (sideSel==='left'  && A.topLeft_v3)  img.topLeft_v3  = loadLegImage(A.topLeft_v3,  scheduleRedraw);
    if (sideSel==='right' && A.topRight_v3) img.topRight_v3 = loadLegImage(A.topRight_v3, scheduleRedraw);
  }
  if (!img.topCenter) return;
  const Lcm = +byId('dpb-ml')?.value || 0;
  const layout = computeLegLayoutL3Rects_SMART({ rect1, rect2, sc, Lcm, side:sideSel });
  if (!layout) return;
  const elGapA = byId('dpb-gapA'); if (elGapA) setFieldError(elGapA, '');
  const elGapB = byId('dpb-gapB'); if (elGapB) setFieldError(elGapB, '');
  const cm2px = (cm)=> cm*sc;
  const hasHOverlap = (a,b)=> Math.max(0, Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))>0;
  const vOverlapH   = (a,b)=> Math.max(0, Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  const hOverlapW   = (a,b)=> Math.max(0, Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
  const valA = elGapA ? (+String(elGapA.value||'').trim() || 0) : 0;
  const valB = elGapB ? (+String(elGapB.value||'').trim() || 0) : 0;
  if (elGapB && valB < 5){ setFieldError(elGapB, 'แนะนำให้ขอบโต๊ะมีระยะห่าง 5 cm ขึ้นไป'); return; }
  if (elGapA && valA < 5){ setFieldError(elGapA, 'แนะนำให้ขอบโต๊ะมีระยะห่าง 5 cm ขึ้นไป'); return; }
  const ALLOW_BOTTOM_TOP_CM = (Awcm >= 135 && Awcm <= 144) ? 10 : 0;
  const ALLOW_BOTTOM_TOP_PX = cm2px(ALLOW_BOTTOM_TOP_CM);
  if (sideSel==='right'){
    if (layout.bottomRight && layout.topRight && elGapB){
      if (hasHOverlap(layout.bottomRight, layout.topRight)){
        const vpx = vOverlapH(layout.bottomRight, layout.topRight);
        if (vpx > ALLOW_BOTTOM_TOP_PX){
          const overInt = cmOverToInt((vpx - ALLOW_BOTTOM_TOP_PX)/sc);
          if (overInt > 0){
            const maxB = Math.max(5, Math.round(valB - overInt));
            setFieldError(elGapB, `กรุณาลดระยะห่างลงอีก ${overInt} cm (ห้ามเกิน ${maxB} cm)`);
            return;
          }
        }
      }
    }
  } else {
    if (layout.bottomLeft && layout.topLeft && elGapB){
      if (hasHOverlap(layout.bottomLeft, layout.topLeft)){
        const vpx = vOverlapH(layout.bottomLeft, layout.topLeft);
        if (vpx > ALLOW_BOTTOM_TOP_PX){
          const overInt = cmOverToInt((vpx - ALLOW_BOTTOM_TOP_PX)/sc);
          if (overInt > 0){
            const maxB = Math.max(5, Math.round(valB - overInt));
            setFieldError(elGapB, `กรุณาลดระยะห่างลงอีก ${overInt} cm (ห้ามเกิน ${maxB} cm)`);
            return;
          }
        }
      }
    }
  }
  const MAX_MAIN_TOP_OVERLAP_CM = 11.5;
  const maxMainTopOverlapPx     = cm2px(MAX_MAIN_TOP_OVERLAP_CM);
  if (sideSel === 'right'){
    const mainRect = layout.leftRect;
    const topRect  = layout.topRight;
    if (mainRect && topRect && elGapA){
      const ovpx = hOverlapW(mainRect, topRect);
      if (ovpx > maxMainTopOverlapPx){
        const excessInt = cmOverToInt((ovpx - maxMainTopOverlapPx)/sc);
        if (excessInt > 0){
          const maxA = Math.max(5, Math.round(valA - excessInt));
          setFieldError(elGapA, `กรุณาลดระยะห่างลงอีก ${excessInt} cm (ห้ามเกิน ${maxA} cm)`);
          return;
        }
      }
    }
  } else {
    const mainRect = layout.rightRect;
    const topRect  = layout.topLeft;
    if (mainRect && topRect && elGapA){
      const ovpx = hOverlapW(mainRect, topRect);
      if (ovpx > maxMainTopOverlapPx){
        const excessInt = cmOverToInt((ovpx - maxMainTopOverlapPx)/sc);
        if (excessInt > 0){
          const maxA = Math.max(5, Math.round(valA - excessInt));
          setFieldError(elGapA, `กรุณาลดระยะห่างลงอีก ${excessInt} cm (ห้ามเกิน ${maxA} cm)`);
          return;
        }
      }
    }
  }
  const alpha = (typeof args.alphaOverride === 'number') ? args.alphaOverride : 1.0;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  try{
    if (sideSel === 'left'){
      if (img.right)       ctx.drawImage(img.right,       layout.rightRect.x,        layout.rightRect.y,        layout.rightRect.w,        layout.rightRect.h);
      if (img.bottomLeft) ctx.drawImage(img.bottomLeft, layout.bottomLeft.x,       layout.bottomLeft.y,       layout.bottomLeft.w,       layout.bottomLeft.h);
      ctx.save();
      const lX = Math.max(layout.cropTopCenterX.leftX,  rect1.x);
      const rX = Math.min(layout.cropTopCenterX.rightX, rect1.x + rect1.w);
      const cw = Math.max(0, rX - lX);
      if (cw>0){
        ctx.beginPath(); ctx.rect(lX, rect1.y, cw, rect1.h); ctx.clip();
        ctx.drawImage(img.topCenter, layout.topCenter.x, layout.topCenter.y, layout.topCenter.w, layout.topCenter.h);
      }
      ctx.restore();
      if (img.centerLeft){
        ctx.save();
        const tY = Math.max(layout.cropCenterLeftY.topY, rect2.y);
        const bY = Math.min(layout.cropCenterLeftY.botY, rect2.y + rect2.h);
        const ch = Math.max(0, bY - tY);
        if (ch>0){
          ctx.beginPath(); ctx.rect(rect2.x, tY, rect2.w, ch); ctx.clip();
          ctx.drawImage(img.centerLeft, layout.centerLeft.x, layout.centerLeft.y, layout.centerLeft.w, layout.centerLeft.h);
        }
        ctx.restore();
      }
      if (useV3 && img.topLeft_v3){
        ctx.drawImage(img.topLeft_v3, layout.topLeft.x, layout.topLeft.y, layout.topLeft.w, layout.topLeft.h);
      }else if (img.topLeft){
        ctx.drawImage(img.topLeft,    layout.topLeft.x, layout.topLeft.y, layout.topLeft.w, layout.topLeft.h);
      }
    }else{
      if (img.left)        ctx.drawImage(img.left,        layout.leftRect.x,        layout.leftRect.y,        layout.leftRect.w,        layout.leftRect.h);
      if (img.bottomRight) ctx.drawImage(img.bottomRight,layout.bottomRight.x,    layout.bottomRight.y,     layout.bottomRight.w,     layout.bottomRight.h);
      ctx.save();
      const lX2 = Math.max(layout.cropTopCenterX.leftX,  rect1.x);
      const rX2 = Math.min(layout.cropTopCenterX.rightX, rect1.x + rect1.w);
      const cw2 = Math.max(0, rX2 - lX2);
      if (cw2>0){
        ctx.beginPath(); ctx.rect(lX2, rect1.y, cw2, rect1.h); ctx.clip();
        ctx.drawImage(img.topCenter, layout.topCenter.x, layout.topCenter.y, layout.topCenter.w, layout.topCenter.h);
      }
      ctx.restore();
      if (img.centerRight){
        ctx.save();
        const tY2 = Math.max(layout.cropCenterRightY.topY, rect2.y);
        const bY2 = Math.min(layout.cropCenterRightY.botY, rect2.y + rect2.h);
        const ch2 = Math.max(0, bY2 - tY2);
        if (ch2>0){
          ctx.beginPath(); ctx.rect(rect2.x, tY2, rect2.w, ch2); ctx.clip();
          ctx.drawImage(img.centerRight, layout.centerRight.x, layout.centerRight.y, layout.centerRight.w, layout.centerRight.h);
        }
        ctx.restore();
      }
      if (useV3 && img.topRight_v3){
        ctx.drawImage(img.topRight_v3, layout.topRight.x, layout.topRight.y, layout.topRight.w, layout.topRight.h);
      }else if (img.topRight){
        ctx.drawImage(img.topRight,    layout.topRight.x, layout.topRight.y, layout.topRight.w, layout.topRight.h);
      }
    }
  }catch(_){}
  ctx.restore();
  if (window.DPB_DEBUG){
    if (sideSel==='left'){
      l3_drawDebugRect(layout.rightRect,  '#4caf50','main');
      l3_drawDebugRect(layout.bottomLeft,  '#4caf50','bottom');
      l3_drawDebugRect(layout.topLeft,     '#4caf50','top');
      l3_drawDebugRect(layout.centerLeft,  '#ff9800','v-beam');
      l3_drawDebugRect(layout.topCenter,   '#ff9800','h-beam');
      if (layout.cropTopCenterX)  l3_drawDebugCropX(rect1, layout.cropTopCenterX.leftX,  layout.cropTopCenterX.rightX);
      if (layout.cropCenterLeftY) l3_drawDebugCropY(rect2, layout.cropCenterLeftY.topY,    layout.cropCenterLeftY.botY);
    }else{
      l3_drawDebugRect(layout.leftRect,    '#4caf50','main');
      l3_drawDebugRect(layout.bottomRight, '#4caf50','bottom');
      l3_drawDebugRect(layout.topRight,    '#4caf50','top');
      l3_drawDebugRect(layout.centerRight, '#ff9800','v-beam');
      l3_drawDebugRect(layout.topCenter,   '#ff9800','h-beam');
      if (layout.cropTopCenterX)    l3_drawDebugCropX(rect1, layout.cropTopCenterX.leftX,  layout.cropTopCenterX.rightX);
      if (layout.cropCenterRightY) l3_drawDebugCropY(rect2, layout.cropCenterRightY.topY, layout.cropCenterRightY.botY);
    }
  }
}

(function(){
  function readRectR(){
    return {
      tl: +byId('r_rect_tl')?.value || 0,
      tr: +byId('r_rect_tr')?.value || 0,
      bl: +byId('r_rect_bl')?.value || 0,
      br: +byId('r_rect_br')?.value || 0
    };
  }

  function writeRectR(r){
    if (byId('r_rect_tl')) byId('r_rect_tl').value = r.tl;
    if (byId('r_rect_tr')) byId('r_rect_tr').value = r.tr;
    if (byId('r_rect_bl')) byId('r_rect_bl').value = r.bl;
    if (byId('r_rect_br')) byId('r_rect_br').value = r.br;
  }

  function readLdeskR(){
    return {
      tl:   +byId('ld_r_tl')?.value   || 0,
      tr:   +byId('ld_r_tr')?.value   || 0,
      step: +byId('ld_r_step')?.value || 0,
      arm:  +byId('ld_r_armbl')?.value|| 0,
      br:   +byId('ld_r_br')?.value   || 0,
      in:   +byId('dpb-rInner')?.value|| 0
    };
  }

  function writeLdeskR(r){
    if (byId('ld_r_tl'))      byId('ld_r_tl').value = r.tl;
    if (byId('ld_r_tr'))      byId('ld_r_tr').value = r.tr;
    if (byId('ld_r_step'))    byId('ld_r_step').value = r.step;
    if (byId('ld_r_armbl'))   byId('ld_r_armbl').value = r.arm;
    if (byId('ld_r_br'))      byId('ld_r_br').value = r.br;
    if (byId('dpb-rInner'))   byId('dpb-rInner').value = r.in;
  }

  window.state = window.state || {};
  state.prevR = state.prevR || {
    rect: { tl:50, tr:50, bl:50, br:50 },
    l:    { tl:50, tr:50, step:90, arm:150, br:50, in:150 }
  };
  var edgeSel = byId('dpb-edge');
  if (!edgeSel) return;
  edgeSel.addEventListener('change', function(){
    var val = (edgeSel.value || '').toLowerCase();
    if (val === 'square'){
      try{ state.prevR.rect = readRectR(); }catch(_){}
      try{ state.prevR.l    = readLdeskR(); }catch(_){}
      if (byId('dpb-type')?.value === 'l2' || byId('dpb-type')?.value === 'l3'){
        writeLdeskR({ tl:0,tr:0,step:0,arm:0,br:0,in:0 });
      }else{
        writeRectR({ tl:0,tr:0,bl:0,br:0 });
      }
    }
    if (val === 'rounded'){
      if (byId('dpb-type')?.value === 'l2' || byId('dpb-type')?.value === 'l3'){
        writeLdeskR(state.prevR.l);
      }else{
        writeRectR(state.prevR.rect);
      }
    }
    if (typeof scheduleRedraw === 'function') scheduleRedraw();
  });
})();

function l3_drawDebugRect(r, color = '#ff2d2d', label = ''){
  if (!r) return;
  try{
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setLineDash([6,4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (label){
      ctx.font = '500 12px Prompt,sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(label, r.x + 4, r.y - 6);
    }
    ctx.restore();
  }catch(_){}
}

function l3_drawDebugCropX(rect1, leftX, rightX, color = '#0099ff'){
  try{
    ctx.save();
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(leftX, rect1.y); ctx.lineTo(leftX, rect1.y + rect1.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightX, rect1.y); ctx.lineTo(rightX, rect1.y + rect1.h); ctx.stroke();
    ctx.restore();
  }catch(_){}
}

function l3_drawDebugCropY(rect2, topY, botY, color = '#00aa66'){
  try{
    ctx.save();
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rect2.x, topY); ctx.lineTo(rect2.x + rect2.w, topY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rect2.x, botY); ctx.lineTo(rect2.x + rect2.w, botY); ctx.stroke();
    ctx.restore();
  }catch(_){}
}

function l3_rectsOverlap(a,b){
  return !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y);
}

function computeLegLayoutL3Rects_V2({ rect1, rect2, sc, Lcm, side }){
  const base = computeLegLayoutL3Rects({ rect1, rect2, sc, Lcm, side });
  const MIN_TOP_CM    = 5;
  const STEP_CM       = 0.5;
  const MAX_SHIFT_CM = 30;
  const SIDE_GUARD_CM= 5;
  const EPS_PX       = 0.25;
  const px = (cm)=> cm*sc;
  const hOverlap = (a,b)=> Math.max(0, Math.min(a.x+a.w,b.x+b.w) - Math.max(a.x,b.x));
  const isOverlap= (a,b)=> !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y);
  const clamp    = (v,lo,hi)=> Math.max(lo, Math.min(hi, v));
  const gaps = (typeof window.dpb_getLegGaps==='function') ? window.dpb_getLegGaps() : {A:5,B:5};
  const gapA = Math.max(5, gaps.A);
  const isLeft = String(side).toLowerCase()==='left';
  if (isLeft){
    let rightRect    = base.rightRect    && {...base.rightRect};
    let topLeft      = base.topLeft      && {...base.topLeft};
    let bottomLeft  = base.bottomLeft  && {...base.bottomLeft};
    let topCenter    = base.topCenter    && {...base.topCenter};
    let centerLeft  = base.centerLeft  && {...base.centerLeft};
    let cropX        = base.cropTopCenterX ? {...base.cropTopCenterX} : null;
    if (!rightRect||!topLeft||!bottomLeft||!topCenter||!centerLeft||!cropX) return base;
    (function(){
      if (!isOverlap(topLeft, bottomLeft)) return;
      const need    = (topLeft.y + topLeft.h) - bottomLeft.y + EPS_PX;
      const topGuard= rect1.y + px(MIN_TOP_CM);
      const canRaise= Math.max(0, topLeft.y - topGuard);
      const raise   = Math.min(need, canRaise);
      if (raise > 0){
        topLeft.y   -= raise;
        topCenter.y -= raise;
        rightRect.y -= raise;
      }
      if (isOverlap(topLeft, bottomLeft)){
        const extra = Math.min((topLeft.y + topLeft.h) - bottomLeft.y + EPS_PX,
                               Math.max(0, topLeft.y - topGuard));
        if (extra > 0){
          topLeft.y   -= extra;
          topCenter.y -= extra;
          rightRect.y -= extra;
        }
      }
    })();
    (function(){
      if (!isOverlap(rightRect, topLeft)) return;
      const step = px(STEP_CM), max = px(MAX_SHIFT_CM);
      let moved = 0;
      const leftGuard = rect1.x + px(SIDE_GUARD_CM);
      function canMoveLeft(dx){
        return (topLeft.x+dx)    >= leftGuard &&
              (bottomLeft.x+dx)>= leftGuard &&
              (centerLeft.x+dx)>= leftGuard &&
              (topCenter.x+dx) >= leftGuard;
      }
      while (moved <= max && isOverlap(rightRect, topLeft)){
        const dx = -Math.min(step, max - moved);
        if (!canMoveLeft(dx)) break;
        topLeft.x    += dx;
        bottomLeft.x += dx;
        centerLeft.x += dx;
        topCenter.x  += dx;
        moved += Math.abs(dx);
      }
      if (isOverlap(rightRect, topLeft)){
        const need = hOverlap(rightRect, topLeft) + EPS_PX;
        const dx   = -Math.min(need, (topLeft.x - leftGuard));
        if (dx < 0){
          topLeft.x    += dx;
          bottomLeft.x += dx;
          centerLeft.x += dx;
          topCenter.x  += dx;
        }
      }
      const topLeftInsetCm = (topLeft.x - rect1.x) / sc;
      cropX.leftX  = rect1.x + l3_cmToPx(topLeftInsetCm + 98.0, sc);
      cropX.rightX = rect1.x + rect1.w - l3_cmToPx(gapA + 51.0, sc);
    })();
    return {
      side: 'left',
      rightRect,
      bottomLeft,
      topLeft,
      topCenter,
      centerLeft,
      cropTopCenterX:  cropX,
      cropCenterLeftY: base.cropCenterLeftY
    };
  }
  let leftRect      = base.leftRect      && {...base.leftRect};
  let topRight      = base.topRight      && {...base.topRight};
  let bottomRight  = base.bottomRight  && {...base.bottomRight};
  let topCenter    = base.topCenter    && {...base.topCenter};
  let centerRight  = base.centerRight  && {...base.centerRight};
  let cropX        = base.cropTopCenterX    ? {...base.cropTopCenterX}    : null;
  if (!leftRect||!topRight||!bottomRight||!topCenter||!centerRight||!cropX) return base;
  (function(){
    if (!isOverlap(topRight, bottomRight)) return;
    const need     = (topRight.y + topRight.h) - bottomRight.y + EPS_PX;
    const topGuard = rect1.y + px(MIN_TOP_CM);
    const canRaise = Math.max(0, topRight.y - topGuard);
    const raise    = Math.min(need, canRaise);
    if (raise > 0){
      topRight.y   -= raise;
      topCenter.y  -= raise;
      leftRect.y   -= raise;
    }
    if (isOverlap(topRight, bottomRight)){
      const extra = Math.min((topRight.y + topRight.h) - bottomRight.y + EPS_PX,
                             Math.max(0, topRight.y - topGuard));
      if (extra > 0){
        topRight.y   -= extra;
        topCenter.y  -= extra;
        leftRect.y   -= extra;
      }
    }
  })();
  (function(){
    if (!isOverlap(leftRect, topRight)) return;
    const step = px(STEP_CM), max = px(MAX_SHIFT_CM);
    let moved = 0;
    const rightGuard = rect1.x + rect1.w - px(SIDE_GUARD_CM);
    function canMoveRight(dx){
      return (topRight.x+topRight.w+dx)    <= rightGuard &&
            (bottomRight.x+bottomRight.w+dx)<= rightGuard &&
            (centerRight.x+centerRight.w+dx)<= rightGuard &&
            (topCenter.x+topCenter.w+dx) <= rightGuard;
    }
    while (moved <= max && isOverlap(leftRect, topRight)){
      const dx = Math.min(step, max - moved);
      if (!canMoveRight(dx)) break;
      topRight.x    += dx;
      bottomRight.x += dx;
      centerRight.x += dx;
      topCenter.x   += dx;
      moved += dx;
    }
    if (isOverlap(leftRect, topRight)){
      const need = hOverlap(leftRect, topRight) + EPS_PX;
      const dx   = Math.min(need, rightGuard - (topRight.x + topRight.w));
      if (dx > 0){
        topRight.x    += dx;
        bottomRight.x += dx;
        centerRight.x += dx;
        topCenter.x   += dx;
      }
    }
    const rightInsetPx = (rect1.x + rect1.w) - (topRight.x + topRight.w);
    cropX.leftX  = rect1.x + l3_cmToPx(gapA + 51.0, sc);
    cropX.rightX = (rect1.x + rect1.w) - (rightInsetPx + l3_cmToPx(98.0, sc));
  })();
  return {
    side: 'right',
    leftRect,
    bottomRight,
    topRight,
    topCenter,
    centerRight,
    cropTopCenterX:  cropX,
    cropCenterRightY: base.cropCenterRightY
  };
}

function computeLegLayoutL3Rects_V3({ rect1, rect2, sc, Lcm, side }){
  const v1 = computeLegLayoutL3Rects({ rect1, rect2, sc, Lcm, side });
  const MIN_TOP_CM    = 5;
  const STEP_CM       = 0.5;
  const MAX_SHIFT_CM = 30;
  const SIDE_GUARD_CM= 5;
  const H_ALLOW_CM    = 11.5;
  const EPS_PX       = 0.25;
  const px = (cm)=> cm*sc;
  const isLeft = (String(side).toLowerCase()==='left');
  const gaps = (typeof window.dpb_getLegGaps==='function') ? window.dpb_getLegGaps() : {A:5,B:5};
  const gapA = Math.max(5, gaps.A);
  const hOverlapW = (a,b)=> Math.max(0, Math.min(a.x+a.w,b.x+b.w) - Math.max(a.x,b.x));
  const isOverlap = (a,b)=> !(b.x >= a.x + a.w || b.x + b.w <= a.x || b.y >= a.y + a.h || b.y + b.h <= a.y);
  if (isLeft){
    let rightRect    = v1.rightRect    && {...v1.rightRect};
    let bottomLeft  = v1.bottomLeft  && {...v1.bottomLeft};
    let topLeft      = v1.topLeft      && {...v1.topLeft};
    let topCenter    = v1.topCenter    && {...v1.topCenter};
    let centerLeft  = v1.centerLeft  && {...v1.centerLeft};
    let cropX        = v1.cropTopCenterX ? {...v1.cropTopCenterX} : null;
    let cropY        = v1.cropCenterLeftY? {...v1.cropCenterLeftY}: null;
    if (!rightRect||!bottomLeft||!topLeft||!topCenter||!centerLeft||!cropX||!cropY) return v1;
    const newW = px(LEG_DIMS_L3_TOP_V3_CM.w), newH = px(LEG_DIMS_L3_TOP_V3_CM.h);
    topLeft = { x: topLeft.x, y: rightRect.y, w: newW, h: newH };
    (function recalcCropX(){
      const insetCm = (topLeft.x - rect1.x) / sc;
      cropX.leftX  = rect1.x + l3_cmToPx(insetCm + 83.0, sc);
      cropX.rightX = rect1.x + rect1.w - l3_cmToPx(gapA + 51.0, sc);
    })();
    (function(){
      const vertOverlap = isOverlap(topLeft, bottomLeft);
      if (!vertOverlap) return;
      const need     = (topLeft.y + topLeft.h) - bottomLeft.y + EPS_PX;
      const topGuard = rect1.y + px(MIN_TOP_CM);
      const canRaise = Math.max(0, topLeft.y - topGuard);
      const raise    = Math.min(need, canRaise);
      if (raise > 0){ topLeft.y -= raise; topCenter.y -= raise; rightRect.y -= raise; }
      if ((topLeft.y + topLeft.h) > bottomLeft.y){
        const extra = Math.min((topLeft.y + topLeft.h) - bottomLeft.y + EPS_PX,
                               Math.max(0, topLeft.y - topGuard));
        if (extra > 0){ topLeft.y -= extra; topCenter.y -= extra; rightRect.y -= extra; }
      }
    })();

(function(){
      const allowPx = px(H_ALLOW_CM);
      let hov = hOverlapW(rightRect, topLeft);
      if (hov <= allowPx) return;
      const step = px(STEP_CM), max = px(MAX_SHIFT_CM);
      let moved = 0;
      const leftGuard = rect1.x + px(SIDE_GUARD_CM);
      const canMoveLeft = (dx)=>
        (topLeft.x+dx)    >= leftGuard &&
        (bottomLeft.x+dx)>= leftGuard &&
        (centerLeft.x+dx)>= leftGuard &&
        (topCenter.x+dx) >= leftGuard;
      while (moved <= max && hov > allowPx){
        const dx = -Math.min(step, max - moved);
        if (!canMoveLeft(dx)) break;
        topLeft.x    += dx;
        bottomLeft.x += dx;
        centerLeft.x += dx;
        topCenter.x  += dx;
        moved += Math.abs(dx);
        hov = hOverlapW(rightRect, topLeft);
      }
      if (hov > allowPx){
        const room = topLeft.x - leftGuard;
        const dx   = -Math.min(hov - allowPx, room);
        if (dx < 0){
          topLeft.x    += dx;
          bottomLeft.x += dx;
          centerLeft.x += dx;
          topCenter.x  += dx;
          hov = hOverlapW(rightRect, topLeft);
        }
      }
      const insetCm = (topLeft.x - rect1.x) / sc;
      cropX.leftX  = rect1.x + l3_cmToPx(insetCm + 83.0, sc);
      cropX.rightX = rect1.x + rect1.w - l3_cmToPx(gapA + 51.0, sc);
    })();
    return { side:'left', rightRect, bottomLeft, topLeft, topCenter, centerLeft,
            cropTopCenterX:  cropX, cropCenterLeftY:  cropY };
  }

  let leftRect      = v1.leftRect      && {...v1.leftRect};
  let bottomRight  = v1.bottomRight  && {...v1.bottomRight};
  let topRight      = v1.topRight      && {...v1.topRight};
  let topCenter    = v1.topCenter    && {...v1.topCenter};
  let centerRight  = v1.centerRight  && {...v1.centerRight};
  let cropX        = v1.cropTopCenterX    ? {...v1.cropTopCenterX}    : null;
  let cropY        = v1.cropCenterRightY ? {...v1.cropCenterRightY} : null;
  if (!leftRect||!bottomRight||!topRight||!topCenter||!centerRight||!cropX||!cropY) return v1;
  const newW = px(LEG_DIMS_L3_TOP_V3_CM.w), newH = px(LEG_DIMS_L3_TOP_V3_CM.h);
  const rEdge = topRight.x + topRight.w;
  topRight = { x: rEdge - newW, y: leftRect.y, w: newW, h: newH };

  (function recalcCropX(){
    const rightInsetPx = (rect1.x + rect1.w) - (topRight.x + topRight.w);
    cropX.leftX  = rect1.x + l3_cmToPx(gapA + 51.0, sc);
    cropX.rightX = (rect1.x + rect1.w) - (rightInsetPx + l3_cmToPx(83.0, sc));
  })();

  (function(){
    const vertOverlap = isOverlap(topRight, bottomRight);
    if (!vertOverlap) return;
    const need     = (topRight.y + topRight.h) - bottomRight.y + EPS_PX;
    const topGuard = rect1.y + px(MIN_TOP_CM);
    const canRaise = Math.max(0, topRight.y - topGuard);
    const raise    = Math.min(need, canRaise);
    if (raise > 0){ topRight.y -= raise; topCenter.y -= raise; leftRect.y -= raise; }
    if ((topRight.y + topRight.h) > bottomRight.y){
      const extra = Math.min((topRight.y + topRight.h) - bottomRight.y + EPS_PX,
                             Math.max(0, topRight.y - topGuard));
      if (extra > 0){ topRight.y -= extra; topCenter.y -= extra; leftRect.y -= extra; }
    }
  })();

  (function(){
    const allowPx = px(H_ALLOW_CM);
    let hov = hOverlapW(leftRect, topRight);
    if (hov <= allowPx) return;
    const step = px(STEP_CM), max = px(MAX_SHIFT_CM);
    let moved = 0;
    const rightGuard = rect1.x + rect1.w - px(SIDE_GUARD_CM);
    const canMoveRight = (dx)=>
      (topRight.x+topRight.w+dx)    <= rightGuard &&
      (bottomRight.x+bottomRight.w+dx)<= rightGuard &&
      (centerRight.x+centerRight.w+dx)<= rightGuard &&
      (topCenter.x+topCenter.w+dx)    <= rightGuard;
    while (moved <= max && hov > allowPx){
      const dx = Math.min(step, max - moved);
      if (!canMoveRight(dx)) break;
      topRight.x    += dx;
      bottomRight.x += dx;
      centerRight.x += dx;
      topCenter.x   += dx;
      moved += dx;
      hov = hOverlapW(leftRect, topRight);
    }
    if (hov > allowPx){
      const room = rightGuard - (topRight.x + topRight.w);
      const dx   = Math.min(hov - allowPx, room);
      if (dx > 0){
        topRight.x    += dx;
        bottomRight.x += dx;
        centerRight.x += dx;
        topCenter.x   += dx;
        hov = hOverlapW(leftRect, topRight);
      }
    }
    const rightInsetPx = (rect1.x + rect1.w) - (topRight.x + topRight.w);
    cropX.leftX  = rect1.x + l3_cmToPx(gapA + 51.0, sc);
    cropX.rightX = (rect1.x + rect1.w) - (rightInsetPx + l3_cmToPx(83.0, sc));
  })();

  return { side:'right', leftRect, bottomRight, topRight, topCenter, centerRight,
            cropTopCenterX:  cropX, cropCenterRightY: cropY };
}

function l3_layoutHasConflict(layout, rect1, rect2, side){
  let conflict = false;
  if (side === 'left'){
    const overlapLegs = (layout.topLeft && layout.bottomLeft)
      ? l3_rectsOverlap(layout.topLeft, layout.bottomLeft)
      : false;
    let cropH = Infinity;
    if (layout.cropCenterLeftY){
      const tY = Math.max(layout.cropCenterLeftY.topY, rect2.y);
      const bY = Math.min(layout.cropCenterLeftY.botY, rect2.y + rect2.h);
      cropH = Math.max(0, bY - tY);
      if (cropH < 1) conflict = true;
    }
    if (overlapLegs) conflict = true;
    if (window.DPB_DEBUG){
      console.groupCollapsed('%c[L3 Debug] Conflict check — side:left', 'color:#09f');
      console.log('topLeft:', layout.topLeft);
      console.log('bottomLeft:', layout.bottomLeft);
      console.log('overlapLegs:', overlapLegs);
      console.log('cropCenterLeftY:', layout.cropCenterLeftY, 'cropH(px):', cropH);
      console.groupEnd();
    }
  } else {
    const overlapLegs = (layout.topRight && layout.bottomRight)
      ? l3_rectsOverlap(layout.topRight, layout.bottomRight)
      : false;
    let cropH = Infinity;
    if (layout.cropCenterRightY){
      const tY = Math.max(layout.cropCenterRightY.topY, rect2.y);
      const bY = Math.min(layout.cropCenterRightY.botY, rect2.y + rect2.h);
      cropH = Math.max(0, bY - tY);
      if (cropH < 1) conflict = true;
    }
    if (overlapLegs) conflict = true;
    if (window.DPB_DEBUG){
      console.groupCollapsed('%c[L3 Debug] Conflict check — side:right', 'color:#09f');
      console.log('topRight:', layout.topRight);
      console.log('bottomRight:', layout.bottomRight);
      console.log('overlapLegs:', overlapLegs);
      console.log('cropCenterRightY:', layout.cropCenterRightY, 'cropH(px):', cropH);
      console.groupEnd();
    }
  }
  return conflict;
}

function computeLegLayoutL3Rects_SMART({ rect1, rect2, sc, Lcm, side }){
  const v1 = computeLegLayoutL3Rects({ rect1, rect2, sc, Lcm, side });
  const Awcm = +byId('dpb-aw')?.value || 0;
  if (Awcm >= 160){
    const v3 = computeLegLayoutL3Rects_V3({ rect1, rect2, sc, Lcm, side });
    if (window.DPB_DEBUG){
      console.group('%c[L3 Debug] Use Layout V3 (Awcm≥160)', 'color:#a0f;font-weight:bold');
      console.log('rect1:', rect1, 'rect2:', rect2, 'side:', side, 'Awcm:', Awcm);
      console.log('Layout V3:', v3);
      console.groupEnd();
    }
    return v3;
  }
  const hasConflict = l3_layoutHasConflict(v1, rect1, rect2, side);
  if (hasConflict){
    const v2 = computeLegLayoutL3Rects_V2({ rect1, rect2, sc, Lcm, side });
    if (window.DPB_DEBUG){
      console.group('%c[L3 Debug] Switch to Layout V2 (anti-overlap)', 'color:#f33;font-weight:bold');
      console.log('Layout V1:', v1);
      console.log('Layout V2:', v2);
      console.groupEnd();
    }
    return v2;
  }
  if (window.DPB_DEBUG){
    console.groupCollapsed('%c[L3 Debug] Keep Layout V1', 'color:#3a3');
    console.log('Layout V1:', v1);
    console.groupEnd();
  }
  return v1;
}

const LEG_DIMS_L2_CM = {
  left:   { w: 50.5, h: 57.5 },
  right:  { w: 54.5, h: 57.5 },
  leftL:  { w: 50.5, h: 90.0 },
  rightL: { w: 54.5, h: 90.0 },
  center: { w:110.0, h: 13.1 },
};

function getL2Assets(side){
  const colorRaw = getLegColorFromSelection();
  const color = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
  const a = LEG_ASSETS_L2[color] || LEG_ASSETS_L2.white;
  if(side === 'right'){
    return { left:a.left, right:a.rightL, center:a.center, leftL:a.leftL, rightL:a.rightL, rightNormal:a.right };
  }else{
    return { left:a.leftL, right:a.right, center:a.center, leftL:a.leftL, rightL:a.rightL, leftNormal:a.left };
  }
}

function clipRoundedRect(ctx, rect, r){
  if (ctx.roundRect){
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, [r.tl,r.tr,r.br,r.bl]);
    ctx.clip();
  }else{
    roundedPath(ctx, rect.x, rect.y, rect.w, rect.h, r.tl,r.tr,r.br,r.bl);
    ctx.clip();
  }
}

function computeLegLayoutL2Rect1({ x, y, w, h, sc, Lcm, side, dims }) {
  const gaps = (typeof window.dpb_getLegGaps==='function') ? window.dpb_getLegGaps() : {A:5,B:5};
  let leftOffsetCm, rightOffsetCm;
  if (side==='right'){ leftOffsetCm=Math.max(5,gaps.A); rightOffsetCm=Math.max(5,gaps.B); }
  else                { leftOffsetCm=Math.max(5,gaps.A); rightOffsetCm=Math.max(5,gaps.B); }
  const leftW   = dims.left.w   * sc, leftH   = dims.left.h   * sc;
  const rightW  = dims.right.w  * sc, rightH  = dims.right.h  * sc;
  const leftLW  = dims.leftL.w  * sc, leftLH  = dims.leftL.h  * sc;
  const rightLW = dims.rightL.w * sc, rightLH = dims.rightL.h * sc;
  const centW   = dims.center.w * sc, centH   = dims.center.h * sc;
  const leftY = y + (h - leftH)/2;
  const rightY= y + (h - rightH)/2;
  const centerX = x + (w - centW)/2;
  const centerY = y + (h - centH)/2;
  if (side === 'right') {
    const leftX   = x + leftOffsetCm * sc;
    const rightLX = x + w - rightOffsetCm * sc - rightLW;
    const rightLY = leftY;
    const cropLeftX  = x + (leftOffsetCm + dims.left.w) * sc;
    const cropRightX = x + (Lcm - (rightOffsetCm + dims.rightL.w - 4.0)) * sc;
    return {
      leftRect:  { x:leftX,  y:leftY,  w:leftW,  h:leftH  },
      rightRect: { x:rightLX,y:rightLY,w:rightLW,h:rightLH },
      centerRect: { x:centerX,y:centerY,w:centW,  h:centH  },
      crop:        { leftX: cropLeftX, rightX: cropRightX }
    };
  } else {
    const leftLX = x + leftOffsetCm * sc;
    const leftLY = rightY;
    const rightX = x + w - rightOffsetCm * sc - rightW;
    const rightY2= rightY;
    const cropLeftX  = x + (leftOffsetCm + dims.leftL.w) * sc;
    const cropRightX = x + (Lcm - (rightOffsetCm + dims.right.w - 4.0)) * sc;
    return {
      leftRect:  { x:leftLX,y:leftLY,w:leftLW,h:leftLH },
      rightRect: { x:rightX,y:rightY2,w:rightW,h:rightH },
      centerRect: { x:centerX,y:centerY,w:centW,h:centH },
      crop:        { leftX: cropLeftX, rightX: cropRightX }
    };
  }
}

function l2_legOverflowsRect2(layout, rect2, side){
  if (!rect2 || !layout) return false;
  var L = (String(side).toLowerCase()==='right') ? layout.rightRect : layout.leftRect;
  if (!L) return false;
  var topOk    = (L.y >= rect2.y);
  var bottomOk = (L.y + L.h <= rect2.y + rect2.h);
  return !(topOk && bottomOk);
}

function l2_overflowInfo(layout, rect2, side){
  if (!rect2 || !layout) return {overflow:false, top:0, bottom:0};
  var L = (String(side).toLowerCase()==='right') ? layout.rightRect : layout.leftRect;
  if (!L) return {overflow:false, top:0, bottom:0};
  var topOver = Math.max(0, (rect2.y - L.y));
  var botOver = Math.max(0, (L.y + L.h) - (rect2.y + rect2.h));
  return {overflow: (topOver>0 || botOver>0), top:topOver, bottom:botOver};
}

function l2_clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }

function computeLegLayoutL2_V2(args){
  var rect1=args.rect1, rect2=args.rect2, sc=args.sc, Lcm=args.Lcm;
  var side=(args.side||'right').toLowerCase();
  var dims=args.dims;
  var leftOff = args.offsets.leftCm, rightOff = args.offsets.rightCm;
  var leftW   = dims.left.w   * sc, leftH   = dims.left.h   * sc;
  var rightW  = dims.right.w  * sc, rightH  = dims.right.h  * sc;
  var leftLW  = dims.leftL.w  * sc, leftLH  = dims.leftL.h  * sc;
  var rightLW = dims.rightL.w * sc, rightLH = dims.rightL.h * sc;
  var centW   = dims.center.w * sc, centH   = dims.center.h * sc;
  var cropLeftX, cropRightX;
  if (side==='right'){
    var rX = rect2.x + (rect2.w - rightLW)/2;
    var rY = rect2.y + (rect2.h - rightLH)/2;
    rY = l2_clamp(rY, rect2.y, rect2.y + rect2.h - rightLH);
    var lX = rect1.x + (leftOff * sc);
    var lY = rY;
    var cX = lX + (leftW - centW)/2;
    var cY = lY + (leftH/2) - (centH/2);
    cropLeftX  = rect1.x + ((leftOff + dims.left.w) * sc);
    cropRightX = rect1.x + (Lcm * sc) - ((rightOff + dims.rightL.w - 4.0) * sc);
    return {
      leftRect:{x:lX,y:lY,w:leftW,h:leftH},
      rightRect:{x:rX,y:rY,w:rightLW,h:rightLH},
      centerRect:{x:cX,y:cY,w:centW,h:centH},
      crop:{ leftX: cropLeftX, rightX: cropRightX },
      _mode:'V2-right'
    };
  }
  var lLX = rect2.x + (rect2.w - leftLW)/2;
  var lLY = rect2.y + (rect2.h - leftLH)/2;
  lLY = l2_clamp(lLY, rect2.y, rect2.y + rect2.h - leftLH);
  var rX2 = rect1.x + rect1.w - (rightOff * sc) - rightW;
  var rY2 = lLY;
  var cX2 = rX2 + (rightW - centW)/2;
  var cY2 = rY2 + (rightH/2) - (centH/2);
  cropLeftX  = rect1.x + ((leftOff + dims.leftL.w) * sc);
  cropRightX = rect1.x + (Lcm * sc) - ((rightOff + dims.right.w - 4.0) * sc);
  return {
    leftRect:{x:lLX,y:lLY,w:leftLW,h:leftLH},
    rightRect:{x:rX2,y:rY2,w:rightW,h:rightH},
    centerRect:{x:cX2,y:cY2,w:centW,h:centH},
    crop:{ leftX: cropLeftX, rightX: cropRightX },
    _mode:'V2-left'
  };
}

function l2_dbgHLine(x1,y,x2,color){
  if (!window.DPB_DEBUG) return;
  try{
    ctx.save();
    ctx.setLineDash([4,4]); ctx.strokeStyle=color||'#0099ff'; ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke(); ctx.restore();
  }catch(_){}
}

function drawL2LegsLayer(args){
  if (state?.flags?.showLegs === false) return;
  if ((byId('dpb-type')?.value || '').trim() !== 'l2') return;
  let rect1, rect2, sc, sideSel, yCrop, hCrop;
  sc = args.sc;
  sideSel = (args.side || byId('dpb-aside')?.value || 'right').toLowerCase();
  if (args.rect1 && args.rect2){
    rect1 = args.rect1;
    rect2 = args.rect2;
    const yMin = Math.min(rect1.y, rect2.y);
    const yMax = Math.max(rect1.y + rect1.h, rect2.y + rect2.h);
    yCrop = yMin; hCrop = (yMax - yMin);
  } else {
    rect1 = { x: args.x, y: args.y, w: args.w, h: args.h };
    rect2 = args.rect2 || null;
    yCrop = (typeof args.yCrop === 'number') ? args.yCrop : rect1.y;
    hCrop = (typeof args.hCrop === 'number') ? args.hCrop : rect1.h;
  }
  const Lcm = +byId('dpb-ml').value || 0;
  const colorRaw = getLegColorFromSelection();
  const color = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
  const A = LEG_ASSETS_L2[color] || LEG_ASSETS_L2.white;
  const l2Assets = (sideSel === 'right')
    ? { left:A.left, right:A.rightL, leftL:A.leftL, rightL:A.rightL, center:A.center }
    : { left:A.leftL, right:A.right, leftL:A.leftL, rightL:A.rightL, center:A.center };
  const img = {
    left:   loadLegImage(l2Assets.left,   scheduleRedraw),
    right:  loadLegImage(l2Assets.right,  scheduleRedraw),
    leftL:  loadLegImage(l2Assets.leftL,  scheduleRedraw),
    rightL: loadLegImage(l2Assets.rightL, scheduleRedraw),
    center: loadLegImage(l2Assets.center, scheduleRedraw),
  };
  const dims = LEG_DIMS_L2_CM;
  const baseLayout = computeLegLayoutL2Rect1({
    x: rect1.x, y: rect1.y, w: rect1.w, h: rect1.h, sc, Lcm, side: sideSel, dims
  });
  let layout = baseLayout;
  const needV2 = l2_needsV2(baseLayout, rect2, sideSel);
  if (needV2){
    layout = computeLegLayoutL2Rect1_V2({
      x: rect1.x, y: rect1.y, w: rect1.w, h: rect1.h,
      sc, Lcm, side: sideSel, dims, rect2, baseCrop: baseLayout.crop
    });
    if (window.DPB_DEBUG){
      console.group('%c[L2] Switch to V2 (L-leg overflow rect2)', 'color:#e91e63;font-weight:bold');
      console.log('side:', sideSel, 'rect2:', rect2);
      console.log('V1 layout:', baseLayout);
      console.log('V2 layout:', layout);
      console.groupEnd();
    }
  }else if (window.DPB_DEBUG){
    console.groupCollapsed('%c[L2] Keep V1', 'color:#3a3');
    console.log('side:', sideSel, 'rect2:', rect2);
    console.log('V1 layout:', baseLayout);
    console.groupEnd();
  }

(function(){
    const elA = byId('dpb-gapA'), elB = byId('dpb-gapB');
    if (elA) setFieldError(elA, '');
    if (elB) setFieldError(elB, '');
    const gapA = elA ? (+String(elA.value||'').trim() || 0) : 0;
    const gapB = elB ? (+String(elB.value||'').trim() || 0) : 0;
    let okMin = true;
    if (elA && gapA < 5){ setFieldError(elA, 'แนะนำให้ขอบโต๊ะมีระยะห่าง 5 cm ขึ้นไป'); okMin=false; }
    if (elB && gapB < 5){ setFieldError(elB, 'แนะนำให้ขอบโต๊ะมีระยะห่าง 5 cm ขึ้นไป'); okMin=false; }
    if(!okMin) return;
    const Lrect = layout.leftRect;
    const Rrect = layout.rightRect;
    const allowPx = 4 * sc;
    const vOverlap = (a,b)=> !(a.y + a.h <= b.y || a.y >= b.y + b.h);
    if (Lrect && Rrect){
      const vert = vOverlap(Lrect, Rrect);
      const hOverlapPx = Math.max(0, Math.min(Lrect.x+Lrect.w, Rrect.x+Rrect.w) - Math.max(Lrect.x, Rrect.x));
      if (vert && hOverlapPx > allowPx){
        const overCmRaw = (hOverlapPx - allowPx)/sc;
        const overInt    = cmOverToInt(overCmRaw);
        if (overInt > 0){
          const maxA = Math.max(5, Math.round(gapA - overInt));
          const maxB = Math.max(5, Math.round(gapB - overInt));
          if (elA) setFieldError(elA, `กรุณาลดระยะห่างลงอีก ${overInt} cm (ห้ามเกิน ${maxA} cm)`);
          if (elB) setFieldError(elB, `กรุณาลดระยะห่างลงอีก ${overInt} cm (ห้ามเกิน ${maxB} cm)`);
          return;
        }
      }
    }
  })();

  function drawCenterCropped(){
    if (!img.center || !layout.centerRect || !layout.crop) return;
    let lX = Math.max(layout.crop.leftX,  rect1.x);
    let rX = Math.min(layout.crop.rightX, rect1.x + rect1.w);
    let beamX = layout.centerRect.x;
    let beamW = layout.centerRect.w;
    if (needV2){
      const innerLeft  = Math.min(rect1.x + rect1.w, layout.leftRect.x + layout.leftRect.w);
      const innerRight = Math.max(rect1.x, layout.rightRect.x + 4*sc);
      lX = Math.max(lX, innerLeft);
      rX = Math.min(rX, innerRight);
      beamX = rect1.x;
      beamW = rect1.w;
    }
    const cw = Math.max(0, rX - lX);
    if (cw <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(lX, yCrop, cw, hCrop);
    ctx.clip();
    try{
      ctx.drawImage(img.center, beamX, layout.centerRect.y, beamW, layout.centerRect.h);
    }catch(_){}
    ctx.restore();
  }

  const alpha = (typeof args.alphaOverride === 'number') ? args.alphaOverride : 1.0;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  try{
    drawCenterCropped();
    if (img.right && layout.rightRect){
      ctx.drawImage(img.right, layout.rightRect.x, layout.rightRect.y, layout.rightRect.w, layout.rightRect.h);
    }
    if (img.left && layout.leftRect){
      ctx.drawImage(img.left,  layout.leftRect.x,  layout.leftRect.y,  layout.leftRect.w,  layout.leftRect.h);
    }
  }catch(_){}
  ctx.restore();
  if (window.DPB_DEBUG){
    l2_dbgRect(layout.leftRect,  '#4caf50', 'left');
    l2_dbgRect(layout.rightRect, '#4caf50', 'right');
    l2_dbgRect(layout.centerRect,'#ff9800', 'beam');
    if (rect2) l2_dbgRect(rect2, '#f06292', 'rect2');
    try{
      ctx.save();
      ctx.setLineDash([4,4]); ctx.lineWidth = 2; ctx.strokeStyle = '#00aaff';
      const showCrop = ()=>{
        if (!layout.crop){ ctx.restore(); return; }
        let lX = Math.max(layout.crop.leftX, rect1.x);
        let rX = Math.min(layout.crop.rightX, rect1.x + rect1.w);
        if (needV2){
          const innerLeft  = Math.min(rect1.x + rect1.w, layout.leftRect.x + layout.leftRect.w);
          const innerRight = Math.max(rect1.x, layout.rightRect.x + 4*sc);
          lX = Math.max(lX, innerLeft);
          rX = Math.min(rX, innerRight);
        }
        if (rX > lX){
          ctx.beginPath(); ctx.moveTo(lX, yCrop); ctx.lineTo(lX, yCrop + hCrop); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(rX, yCrop); ctx.lineTo(rX, yCrop + hCrop); ctx.stroke();
        }
      };
      showCrop();
      ctx.restore();
    }catch(_){}
  }
}

function l2_needsV2(layout, rect2, side){
  if (!rect2 || !layout) return false;
  var Lrect = (side === 'right') ? layout.rightRect : layout.leftRect;
  if (!Lrect) return false;
  const topOverflow    = (Lrect.y < rect2.y - 0.5);
  const bottomOverflow = (Lrect.y + Lrect.h > rect2.y + rect2.h + 0.5);
  return (topOverflow || bottomOverflow);
}

function computeLegLayoutL2Rect1_V2({ x, y, w, h, sc, Lcm, side, dims, rect2, baseCrop }){
  // เรียกคำนวณแบบ V1 เพื่อเอาค่าพื้นฐาน
  const base = computeLegLayoutL2Rect1({ x, y, w, h, sc, Lcm, side, dims });
  
  // ดึงค่าระยะห่าง (Gap) มาใช้ เพื่อไม่ให้ขาหลุดออกนอกท็อป
  const gaps = (typeof window.dpb_getLegGaps === 'function') ? window.dpb_getLegGaps() : {A:5, B:5};
  
  const centW = dims.center.w * sc, centH = dims.center.h * sc;
  
  if (side === 'right'){
    const rLW = dims.rightL.w * sc, rLH = dims.rightL.h * sc;
    const gapRight = Math.max(5, gaps.B);

    // [แก้จุดที่ 1] ตำแหน่งขาขวา: ให้คำนวณจากขอบขวาของ rect2 เข้ามาตามระยะ Gap (ไม่ใช้สูตร Center)
    // สูตร: ขอบขวาของไม้ L - ระยะห่าง - ความกว้างขา
    const rightLX = rect2 
      ? (rect2.x + rect2.w - (gapRight * sc) - rLW) 
      : base.rightRect.x;
      
    const rightLY = rect2 ? (rect2.y + (rect2.h - rLH)/2) : base.rightRect.y;

    const leftW = dims.left.w * sc, leftH = dims.left.h * sc;
    const leftX = base.leftRect.x;
    const leftY = rightLY;

    // [แก้จุดที่ 2] ตำแหน่งคานกลาง: ให้กลับมาอิงกึ่งกลางโต๊ะหลัก (Rect1) เหมือน V1
    // ของเดิม (ผิด): leftX + (leftW - centW)/2;  <-- อันนี้มันไปอิงขาซ้าย
    // ของใหม่ (ถูก): x + (w - centW)/2;          <-- อิงกึ่งกลางโต๊ะหลัก
    const centerX = x + (w - centW)/2;
    const centerY = leftY + (leftH - centH)/2;

    return {
      leftRect:   { x:leftX,  y:leftY,  w:leftW,   h:leftH  },
      rightRect:  { x:rightLX,y:rightLY,w:rLW,     h:rLH    },
      centerRect: { x:centerX,y:centerY,w:centW,   h:centH  },
      crop: baseCrop || base.crop
    };

  } else { 
    // ฝั่งซ้าย (Left Side) ก็ต้องแก้เหมือนกัน
    const lLW = dims.leftL.w * sc, lLH = dims.leftL.h * sc;
    const gapLeft = Math.max(5, gaps.A);

    // [แก้จุดที่ 1] ตำแหน่งขาซ้าย: อิงขอบซ้ายของ rect2 + ระยะ Gap
    const leftLX = rect2 
      ? (rect2.x + (gapLeft * sc)) 
      : base.leftRect.x;

    const leftLY = rect2 ? (rect2.y + (rect2.h - lLH)/2) : base.leftRect.y;

    const rightW = dims.right.w * sc, rightH = dims.right.h * sc;
    const rightX = base.rightRect.x;
    const rightY = leftLY;

    // [แก้จุดที่ 2] ตำแหน่งคานกลาง: อิงกึ่งกลางโต๊ะหลัก
    const centerX = x + (w - centW)/2;
    const centerY = rightY + (rightH - centH)/2;

    return {
      leftRect:   { x:leftLX, y:leftLY, w:lLW,   h:lLH    },
      rightRect:  { x:rightX, y:rightY, w:rightW,h:rightH },
      centerRect: { x:centerX,y:centerY,w:centW, h:centH  },
      crop: baseCrop || base.crop
    };
  }
}

function l2_dbgRect(r, color='#00bcd4', label=''){
  if (!r || !window.DPB_DEBUG) return;
  try{
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.setLineDash([6,4]); ctx.lineWidth = 2; ctx.strokeStyle = color;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (label){
      ctx.font = '500 12px Prompt, sans-serif';
      ctx.fillStyle = color; ctx.fillText(label, r.x + 4, r.y - 6);
    }
    ctx.restore();
  }catch(_){}
}

function isLDeskType(){
  const t = (byId('dpb-type')?.value || '').trim().toLowerCase();
  return (t === 'l2' || t === 'l3');
}

const L_ALLOWED_LEG_KEYS = ['square-white','square-black'];

function isLegAllowedForLDesk(key, name){
  const k = String(key||'').toLowerCase();
  const n = String(name||'').toLowerCase();
  if (L_ALLOWED_LEG_KEYS.includes(k)) return true;
  if (/\bsquare\b|เหลี่ยม/.test(k) || /\bsquare\b|เหลี่ยม/.test(n)) return true;
  return false;
}

function isLegAllowedForType(legRow, t){
  const key   = String(legRow?.key||'').toLowerCase();
  const name  = String(legRow?.name||'').toLowerCase();
  const label = (key + ' ' + name);

  // ตัวช่วยเช็ค: เป็นขากลม? เป็นสีเทา?
  const isCircle = label.includes('circle') || label.includes('กลม');
  const isGrey   = label.includes('grey') || label.includes('gray') || label.includes('เทา');

  // --- 1. กลุ่ม custom_workspace ---
  // กฎ: ให้เห็นแค่ 3 ตัวนี้เท่านั้น (dual_circle_grey, dual_circle_white, dual_circle_black)
  if (t === 'custom_workspace') {
    if (label.includes('dual_circle_grey')) return true;
    if (label.includes('dual_circle_white')) return true;
    if (label.includes('dual_circle_black')) return true;
    return false; // ตัวอื่นห้ามเห็น
  }

  // --- 2. กลุ่ม custom (ชื่อ type 'custom' เพียวๆ) ---
  // กฎ: เห็น Square ได้, เห็น Circle (ขาว/ดำ) ได้, ห้ามเห็น Grey, และ **ห้ามเห็น Dual**
  if (t === 'custom') {
    // [เพิ่มใหม่] ถ้าเจอคำว่า dual ให้บล็อกทันที (เพื่อกัน dual_circle ของ workspace หลุดมา)
    if (label.includes('dual')) return false;

    if (isCircle) {
      // ถ้าเป็นขากลม ห้ามสีเทา (เหลือแค่ ขาว/ดำ)
      if (isGrey) return false;
      return true;
    }
    // ถ้าเป็น Square ผ่านปกติ
    return true;
  }

  // --- 3. กลุ่ม custom_single, custom_manual และโต๊ะปกติ ---
  // กฎ: ไม่เห็น Circle เลย (เห็นแค่ Square)
  if (t === 'custom_single' || t === 'custom_manual' || isLType(t) || isSingleType(t)){
    // ถ้าเจอขากลม ปัดตกทันที (ซึ่ง dual_circle ก็จะโดนปัดตกตรงนี้ด้วยเพราะมีคำว่า circle)
    if (isCircle) return false;
  }

  // Default: กรณี type อื่นๆ ที่ไม่ได้ระบุ ให้ผ่านหมด
  return true;
}

function coerceLegSelectionToAllowed(currentKey, list, t){
  const allowed = list.filter(row => isLegAllowedForType(row, t));
  if (!allowed.length) return currentKey;
  const ok = allowed.some(r => String(r.key) === String(currentKey));
  if (ok) return currentKey;
  const pickSQW = allowed.find(r => String(r.key).toLowerCase().includes('square-white'));
  return (pickSQW ? pickSQW.key : allowed[0].key);
}

function getDeskType(){
  const el = document.getElementById('dpb-type');
  return el ? String(el.value).trim().toLowerCase() : '';
}

function isLType(t){ t = t || getDeskType(); return t === 'l2' || t === 'l3'; }

function isSingleType(t){ t = t || getDeskType(); return t === 'single'; }

function getLAside(){
  const el = document.getElementById('dpb-aside');
  return el ? el.value : 'right';
}



const LEG_DIMS_MANUAL_CM = {
  right:     { w: 49.3, h: 45.0 }, 
  left:      { w: 49.3, h: 45.0 }, 
  center:    { w: 140.0,h: 11.2 }, 
  connector: { w: 4.3,  h: 0.5  }, 
  crank:     { w: 4.3,  h: 20.0 } 
};


function drawManualDeskLegsLayer({ x, y, w, h, sc, topClip, alphaOverride }) {
  if (state?.flags?.showLegs === false) return;

  const colorRaw = getLegColorFromSelection();
  const legColor = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
  const A = MANUAL_DESK_ASSETS[legColor] || MANUAL_DESK_ASSETS.white;
  
  const imgR = loadLegImage(A.right, scheduleRedraw);
  const imgL = loadLegImage(A.left, scheduleRedraw);
  const imgC = loadLegImage(A.center, scheduleRedraw);
  const imgConn = loadLegImage(A.connector, scheduleRedraw);
  const imgCrank = loadLegImage(A.crank, scheduleRedraw);

  if (!imgR || !imgL || !imgC || !imgConn || !imgCrank) {
     return;
  }

  const gaps = (typeof window.dpb_getLegGaps === 'function') ? window.dpb_getLegGaps() : { A: 5, B: 5 };
  const gapLeft = Math.max(5, gaps.A);
  const gapRight = Math.max(5, gaps.B);

  const dims = LEG_DIMS_MANUAL_CM;
  const rW = dims.right.w * sc, rH = dims.right.h * sc;
  const lW = dims.left.w * sc,  lH = dims.left.h * sc;
  const cW = dims.center.w * sc,cH = dims.center.h * sc;
  const connW = dims.connector.w * sc, connH = dims.connector.h * sc;
  const crankW = dims.crank.w * sc,    crankH = dims.crank.h * sc;

  const leftX  = x + (gapLeft * sc);
  const leftY  = y + (h - lH) / 2;
  
  const rightX = x + w - (gapRight * sc) - rW;
  const rightY = y + (h - rH) / 2;
  
  const centerX = x + (w - cW) / 2;
  const centerY = y + (h - cH) / 2;

  const connX = (rightX + rW) - connW;
  const connY = rightY + rH;

  const tableBottom = y + h; 
  const distFromTableBottom = 7.35 * sc;
  const crankBottomY = tableBottom + distFromTableBottom;
  const crankY = crankBottomY - crankH;
  const crankX = (rightX + rW) - crankW; 

  let alpha = (legColor === 'black') ? 1.00 : 1.00;
  if (typeof alphaOverride === 'number') alpha = alphaOverride;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

 
  ctx.drawImage(imgCrank, crankX, crankY, crankW, crankH);

  if (topClip && topClip.enable) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii);
    } else {
      roundedPath(ctx, topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii[0], topClip.radii[1], topClip.radii[2], topClip.radii[3]);
    }
    ctx.clip();
  }

  ctx.save();
  const clipL = leftX;
  const clipR = rightX + rW;
  const clipW = clipR - clipL;
  if(clipW > 0){
      ctx.beginPath();
      ctx.rect(clipL, y, clipW, h); 
      ctx.clip(); 
      ctx.drawImage(imgC, centerX, centerY, cW, cH);
  }
  ctx.restore();
  ctx.drawImage(imgL, leftX, leftY, lW, lH);
  ctx.drawImage(imgR, rightX, rightY, rW, rH);
  ctx.drawImage(imgConn, connX, connY, connW, connH);
  ctx.restore();
}




const LEG_DIMS_SINGLE_MOTOR_CM = {
  right:  { w: 92.6, h: 50.0 }, 
  left:   { w: 50.0, h: 50.0 }, 
  center: { w: 124.4, h: 13.9 } 
};

function drawSingleMotorLegsLayer({ x, y, w, h, sc, topClip, alphaOverride }) {
  if (state?.flags?.showLegs === false) return;
  
  const type = byId('dpb-type')?.value;
  if (type !== 'custom_single') return;

  const colorRaw = getLegColorFromSelection(); 
  const legColor = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
  const A = SINGLE_MOTOR_ASSETS[legColor] || SINGLE_MOTOR_ASSETS.white;
  
  const imgR = loadLegImage(A.right, scheduleRedraw);
  const imgL = loadLegImage(A.left, scheduleRedraw);
  const imgC = loadLegImage(A.center, scheduleRedraw);

  if (!imgR || !imgL || !imgC) return;

  const gaps = (typeof window.dpb_getLegGaps === 'function') ? window.dpb_getLegGaps() : { A: 5, B: 5 };
  const gapLeft = Math.max(5, gaps.A);
  const gapRight = Math.max(5, gaps.B);

  const dims = LEG_DIMS_SINGLE_MOTOR_CM;
  
  const rW = dims.right.w * sc;
  const rH = dims.right.h * sc;
  const lW = dims.left.w * sc;
  const lH = dims.left.h * sc;
  const cW = dims.center.w * sc;
  const cH = dims.center.h * sc;

  const leftX  = x + (gapLeft * sc);
  const rightX = x + w - (gapRight * sc) - rW;
  const centerX = x + (w - cW) / 2;

  const leftY   = y + (h - lH) / 2;
  const rightY  = y + (h - rH) / 2;
  const centerY = y + (h - cH) / 2;

  let alpha = (legColor === 'black') ? 1.00 : 1.00;
  if (typeof alphaOverride === 'number') alpha = alphaOverride;

  ctx.save();
  
  if (topClip && topClip.enable) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii);
    } else {
      roundedPath(ctx, topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii[0], topClip.radii[1], topClip.radii[2], topClip.radii[3]);
    }
    ctx.clip();
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.save();
  const clipLeft = leftX;
  const clipWidth = (rightX + rW) - leftX;
  
  if (clipWidth > 0) {
    ctx.beginPath();
    ctx.rect(clipLeft, y, clipWidth, h); 
    ctx.clip();
    ctx.drawImage(imgC, centerX, centerY, cW, cH);
  }
  ctx.restore();
  ctx.drawImage(imgL, leftX, leftY, lW, lH);
  ctx.drawImage(imgR, rightX, rightY, rW, rH);
  ctx.restore();
}



const LEG_DIMS_WORKSPACE_CM = {
  right:  { w: 92.6, h: 50.0 }, 
  left:   { w: 50.0, h: 50.0 }, 
  center: { w: 124.4, h: 13.9 } 
};

function drawWorkSpaceLegsLayer({ x, y, w, h, sc, topClip, alphaOverride }) {
  if (state?.flags?.showLegs === false) return;
  
  const type = byId('dpb-type')?.value;
  if (type !== 'custom_workspace') return;

  const colorRaw = getLegColorFromSelection(); 
  const legColor = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
  const A = WORKSPACE_ASSETS[legColor] || WORKSPACE_ASSETS.white || WORKSPACE_ASSETS.grey;
  if (!A) return;
  
  const imgR = A.right ? loadLegImage(A.right, scheduleRedraw) : null;
  const imgL = A.left ? loadLegImage(A.left, scheduleRedraw) : null;
  const imgC = A.center ? loadLegImage(A.center, scheduleRedraw) : null;

  if (!imgR || !imgL || !imgC) return;

  const gaps = (typeof window.dpb_getLegGaps === 'function') ? window.dpb_getLegGaps() : { A: 5, B: 5 };
  const gapLeft = Math.max(5, gaps.A);
  const gapRight = Math.max(5, gaps.B);

  const dims = LEG_DIMS_WORKSPACE_CM;
  
  const rW = dims.right.w * sc;
  const rH = dims.right.h * sc;
  const lW = dims.left.w * sc;
  const lH = dims.left.h * sc;
  const cW = dims.center.w * sc;
  const cH = dims.center.h * sc;

  const leftX  = x + (gapLeft * sc);
  const rightX = x + w - (gapRight * sc) - rW;
  const centerX = x + (w - cW) / 2;

  const leftY   = y + (h - lH) / 2;
  const rightY  = y + (h - rH) / 2;
  const centerY = y + (h - cH) / 2;

  let alpha = (legColor === 'black') ? 1.00 : 1.00;
  if (typeof alphaOverride === 'number') alpha = alphaOverride;

  ctx.save();
  
  if (topClip && topClip.enable) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii);
    } else {
      roundedPath(ctx, topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii[0], topClip.radii[1], topClip.radii[2], topClip.radii[3]);
    }
    ctx.clip();
  }

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.save();
  const clipLeft = leftX;
  const clipWidth = (rightX + rW) - leftX;
  
  if (clipWidth > 0) {
    ctx.beginPath();
    ctx.rect(clipLeft, y, clipWidth, h); 
    ctx.clip();
    ctx.drawImage(imgC, centerX, centerY, cW, cH);
  }
  ctx.restore();
  ctx.drawImage(imgL, leftX, leftY, lW, lH);
  ctx.drawImage(imgR, rightX, rightY, rW, rH);
  ctx.restore();
}

function pxToCm(px){ return px / 10; }

function cmToPx(cm, sc){ return cm * sc; }

function drawSingleLegLayer({ x, y, w, h, sc, topClip, alphaOverride }){
  if (state?.flags?.showLegs === false) return;
  const type = byId('dpb-type')?.value || '';
  if (type !== 'single') return;
const colorRaw = getLegColorFromSelection();
const color = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
 const A = SINGLE_LEG_ASSETS[color] || SINGLE_LEG_ASSETS.white;
  const imgLeg   = loadLegImage(A.leg,   scheduleRedraw);
  if(!imgLeg) return;
  const legWcm   = pxToCm(imgLeg.naturalWidth);
  const legHcm   = pxToCm(imgLeg.naturalHeight);
  const legW   = cmToPx(legWcm, sc);
  const legH   = cmToPx(legHcm, sc);
  const legX = x + (w - legW)/2;
  const legY = y + (h - legH)/2;
  ctx.save();
  if(topClip && topClip.enable){
    ctx.beginPath();
    if (ctx.roundRect){
      ctx.roundRect(topClip.x, topClip.y, topClip.w, topClip.h, topClip.radii);
    }else{
      roundedPath(ctx, topClip.x, topClip.y, topClip.w, topClip.h,
        topClip.radii[0], topClip.radii[1], topClip.radii[2], topClip.radii[3]);
    }
    ctx.clip();
  }
  let alpha = (color === 'black') ? 1.00 : 1.00;
  if (typeof alphaOverride === 'number') alpha = alphaOverride;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  try { ctx.drawImage(imgLeg,   legX,   legY,   legW,   legH); }   catch(e){}
  ctx.restore();
}

function drawImageCover(img, x, y, w, h){
      const ir = img.width / img.height;
      const r = w / h;
      let dw, dh;
      if(ir > r){ dh = h; dw = h * ir; }
      else { dw = w; dh = w / ir; }
      const dx = x + (w - dw)/2;
      const dy = y + (h - dh)/2;
      try{ ctx.drawImage(img, dx, dy, dw, dh); }catch(e){}
    }

    function endDot(x, y, color, r = 2.5){
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

function deskScale(){
  const Lraw = +byId('dpb-ml')?.value || 0;
  const L    = Math.max(MIN_LEN_CM, Lraw);
  const sc   = FIXED_DRAW_LEN / L;
  return (isFinite(sc) && sc > 0) ? sc : 1;
}

function rectDeskHeight(){
  const sc  = deskScale();
  const Wcm = Math.max(MIN_W_CM, +byId('dpb-mw')?.value || 0);
  return Wcm * sc;
}

function ldeskHeight(){
  const sc   = deskScale();
  const AWcm = Math.max(MIN_AW_CM, +byId('dpb-aw')?.value || 0);
  return AWcm * sc;
}

   function getItems(){
  const itemsMap = new Map();
  Object.keys(state.selectedOptions).forEach(k=>{
    const sel = state.selectedOptions[k];
    if(!sel || sel.count<=0) return;
    const op = (state.meta.options||[]).find(o=>o.key===k) || {};
    const cfgArr = state.optConfig[k] || [];
    for(let i=0; i<sel.count; i++){
      const cfg = cfgArr[i] || defaultCfgFor(k);
      const variantNameRaw = (cfg.variant || '').trim();
      const hasVariants = Array.isArray(op.variants) && op.variants.length > 0;
      const variantName = hasVariants ? variantNameRaw : '';
      let img = '';
      if(variantName){
        const vv = (op.variants||[]).find(v=>v.name===variantName);
        img = vv?.imageUrl || '';
      }
      if(!img){
        img = (String(op.imageUrl||'').split(',').map(s=>s.trim()).filter(Boolean)[0]) || '';
      }
      const key2 = `${k}__${variantName || '_'}`;
      if(!itemsMap.has(key2)){
        itemsMap.set(key2, {
          name: op.name || k,
          img,
          detail: hasVariants ? variantName : '', 
          count: 0
        });
      }
      itemsMap.get(key2).count += 1;
    }
  });
  return Array.from(itemsMap.values());
}

function animateElementToCart(el){
  const cartBtn = document.getElementById('dpb-cart-button');
  if(!el || !cartBtn) return;
  const rect = el.getBoundingClientRect();
  const cartRect = cartBtn.getBoundingClientRect();
  const clone = el.cloneNode(true);
  if(clone.tagName.toLowerCase() === 'img'){
    clone.loading = 'eager';
    clone.decoding = 'sync';
  }
  clone.style.position = 'fixed';
  clone.style.left = rect.left + 'px';
  clone.style.top = rect.top + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.borderRadius = '12px';
  clone.style.zIndex = '10020';
  clone.style.pointerEvents = 'none';
  clone.style.transition = 'transform .55s ease, opacity .55s ease, left .55s ease, top .55s ease, width .55s ease, height .55s ease';
  document.body.appendChild(clone);
  requestAnimationFrame(()=>{
    const targetX = cartRect.left + cartRect.width/2 - rect.width*0.2;
    const targetY = cartRect.top  + cartRect.height/2 - rect.height*0.2;
    clone.style.left = targetX + 'px';
    clone.style.top  = targetY + 'px';
    clone.style.width  = rect.width*0.4 + 'px';
    clone.style.height = rect.height*0.4 + 'px';
    clone.style.opacity = '0';
  });
  clone.addEventListener('transitionend', ()=> clone.remove(), {once:true});
}

function getPreferredVariantImageAndRect({ modal, cardEl } = {}){
  const headImg = modal?.querySelector('.dpb-modal__thumb img');
  if (headImg) {
    const r = headImg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { src: headImg.currentSrc || headImg.src, rect: r };
    }
  }

  /* fallback: ภาพจาก card */
  const cardImg = cardEl?.querySelector('.dpb-opt-imgwrap img') || cardEl?.querySelector('img');
  if (cardImg) {
    const r = cardImg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { src: cardImg.currentSrc || cardImg.src, rect: r };
    }
  }
  return null;
}

function ensureVariantModalDOM(){
  let modal = document.getElementById('dpb-variant-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'dpb-variant-modal';
  modal.className = 'dpb-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML = `
    <div class="dpb-modal__backdrop"></div>
    <div class="dpb-modal__panel" role="dialog" aria-modal="true">
      <button class="dpb-modal__close" aria-label="Close">✕</button>
      <div class="dpb-modal__header">
        <div class="dpb-modal__thumb"><img alt="" /></div>
        <div class="dpb-modal__title-group"></div>
      </div>
      <div class="dpb-modal__body"></div>
      <div class="dpb-modal__footer">
        <button class="dpb-btn dpb-btn-primary" data-role="confirm" id="dpb-variant-confirm">ยืนยัน</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}


function ensureVariantConfirmButton(modal){
  if (!modal) return null;
  let btn =
    modal.querySelector('[data-role="confirm"]') ||
    modal.querySelector('#dpb-variant-confirm') ||
    modal.querySelector('#variant-confirm');
  if (!btn) {
    let footer =
      modal.querySelector('.dpb-modal__footer') ||
      (() => {
        const f = document.createElement('div');
        f.className = 'dpb-modal__footer';
        modal.querySelector('.dpb-modal__panel')?.appendChild(f);
        return f;
      })();
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dpb-btn dpb-btn-primary';
    btn.setAttribute('data-role','confirm');
    btn.id = 'dpb-variant-confirm';
    btn.textContent = 'ยืนยัน';
    footer.appendChild(btn);
  }
  return btn;
}

function openVariantModalForOption(key, { cardEl } = {}){
  const modal = ensureVariantModalDOM();
  const btnOk = ensureVariantConfirmButton(modal);
  const back    = modal.querySelector('.dpb-modal__backdrop');
  const closeB  = modal.querySelector('.dpb-modal__close');
  const op = (state.meta.options||[]).find(o=>o.key===key) || { key, type:'attach', variants:[] };
  
  // รับค่า isDrawerDisabled เข้ามา
  const { back:bk, closeB:cb, getVariant, getQty, isDrawerDisabled } = buildVariantModalUI(modal, op);
  
  const close = ()=>{
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown', onEsc, true);
  };
  const onEsc = (e)=>{
    if(e.key === 'Escape' && modal.classList.contains('is-open')) close();
  };
  (bk || back)?.addEventListener('click', close);
  (cb || closeB)?.addEventListener('click', close);
  document.addEventListener('keydown', onEsc, true);
  
  btnOk.replaceWith(btnOk.cloneNode(true));
  const freshOk = ensureVariantConfirmButton(modal); 

  // ===================================================
  // [ส่วนที่แก้ไข] แยก Logic การคลิกปุ่มยืนยัน
  // ===================================================
  if (isDrawerDisabled) {
    // 1. ปรับแต่งปุ่มให้ดูเหมือนถูกปิดใช้งาน
    freshOk.style.opacity = '0.5';
    freshOk.style.cursor = 'not-allowed';
    
    // 2. เมื่อปุ่มถูกคลิก ให้ไปเล่น Animation ที่ป้ายแจ้งเตือนแทน
    freshOk.addEventListener('click', ()=>{
      const alertBox = modal.querySelector('.dpb-drawer-alert');
      if (alertBox) {
        // ใช้ Web Animations API เพื่อทำเอฟเฟกต์สั่น (Shake) โดยไม่ต้องเขียน CSS เพิ่ม
        alertBox.animate([
          { transform: 'translateX(0)' },
          { transform: 'translateX(-8px)' },
          { transform: 'translateX(8px)' },
          { transform: 'translateX(-8px)' },
          { transform: 'translateX(8px)' },
          { transform: 'translateX(0)' }
        ], { 
          duration: 400, 
          easing: 'ease-in-out' 
        });
      }
    });
    // หมายเหตุ: สังเกตว่าเราไม่ได้ใส่ { once:true } เพื่อให้ผู้ใช้กดกี่ครั้งก็เด้งเตือนทุกครั้ง
    
  } else {
    // 1. คืนค่าสไตล์ปุ่มให้เป็นปกติ
    freshOk.style.opacity = '1';
    freshOk.style.cursor = 'pointer';
    
    // 2. เมื่อปุ่มถูกคลิก ให้ทำงานตามระบบเพิ่มลงตะกร้าแบบเดิม
    freshOk.addEventListener('click', ()=>{
      const qty      = getQty();
      const variant  = getVariant();
      const pick     = typeof getPreferredVariantImageAndRect === 'function'
        ? getPreferredVariantImageAndRect({ modal, cardEl })
        : null;

      const op     = (window.state?.meta?.options || []).find(o => o.key === key) || {};
      const oType  = String(op.type || '').toLowerCase();
      const isHole = ['hole_rect','hole_circle','track'].includes(oType);

      /* เปิด pp3 / call addOption ก่อน */
      if (typeof window.addOptionWithVariantAndQty === 'function') {
        window.addOptionWithVariantAndQty(key, variant, qty);
      }

      /* แล้วค่อยปิด modal เก่าหลัง 100ms */
      setTimeout(() => {
        close();
      }, 0);

      if (!isHole && pick && pick.src && pick.rect && typeof window.flyBitmapToCart === 'function') {
        window.flyBitmapToCart(pick.src, pick.rect);
      }

    }, { once:true });
  }
  
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
}

(function ensureAddOptionWithVariantAndQty(){
  if (typeof window.addOptionWithVariantAndQty === 'function') return;
  window.addOptionWithVariantAndQty = function addOptionWithVariantAndQty(optKey, variantName, qty){
    const op = (state.meta.options||[]).find(o=>o.key===optKey) || { key:optKey, type:'attach', variants:[] };
    const vName = String(variantName||'').trim();
    const now = Date.now();
    const isAttach = String(op.type||'').toLowerCase()==='attach';
    const hasVariants = Array.isArray(op.variants) && op.variants.length > 0;
    state.selectedOptions[optKey] = state.selectedOptions[optKey] || { count: 0 };
    state.optConfig[optKey]       = state.optConfig[optKey]       || [];
    for(let i=0; i<qty; i++){
      state.selectedOptions[optKey].count += 1;
      const cfg = {
        ...(typeof defaultCfgFor==='function' ? defaultCfgFor(optKey) : {}),
        type: isAttach ? 'attach' : String(op.type||'hole_rect'),
        variant: hasVariants ? vName : '',
        addedAt: now + i,
        uid: `uid_${optKey}_${now}_${i}_${Math.random().toString(36).slice(2,7)}`
      };
      state.optConfig[optKey].push(cfg);
    }
    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof buildOptConfig === 'function') buildOptConfig();
    if (typeof postProcessCartOrder === 'function') postProcessCartOrder(); 
    if (typeof scheduleRedraw === 'function') scheduleRedraw();
    console.log(`Added ${qty} x ${optKey} (${vName}) to cart.`); 
  };
})();

(function forceModalOnOptionClicks(){
  if (window.__dpbForceModalBound) return;
  window.__dpbForceModalBound = true;
  document.addEventListener('click', function(e){
    const card = e.target.closest('.dpb-opt-item');
    if (!card) return;
    const host = document.getElementById('dpb-opt-list');
    if (!host || !host.contains(card)) return;
    if (e.button !== 0) return;
    const modal = document.getElementById('dpb-variant-modal');
    if (modal && modal.classList.contains('is-open')) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const key = card.dataset.key;
    if (!key) return;
    if (typeof window.openVariantModalForOption === 'function') {
      window.openVariantModalForOption(key, { cardEl: card });
    } else if (typeof window.openVariantModalFor === 'function') {
      window.openVariantModalFor(key, { cardEl: card });
    }
  }, true); 
})();

window.openVariantModalForOption = openVariantModalForOption;
if (typeof window.openVariantModalFor !== 'function') {
  window.openVariantModalFor = function(key, opts){
    return openVariantModalForOption(key, opts);
  };
}


(function ensureCompatForOldBindings(){
  if (typeof window.ensureVariantModalBindings === 'function') return;
  window.ensureVariantModalBindings = function(){};
})();

(function bindOptionGridToVariantModal(){
  const optHost = document.getElementById('dpb-opt-list');
  if(!optHost) return;
  if (optHost.dataset.modalBound === '1') return;
  optHost.dataset.modalBound = '1';
  optHost.addEventListener('click', (e)=>{
    const card = e.target.closest('.dpb-opt-item');
    if(!card || !optHost.contains(card)) return;
    const key = card.dataset.key;
    if(!key) return;
    openVariantModalForOption(key, { cardEl: card });
  }, true);
})();

if (typeof window.isPlacementReady !== 'function'){
window.isPlacementReady = function isPlacementReady(cfg, op){
    cfg = cfg || {};
    op  = op  || {};
    var type = String(op.type || '').toLowerCase();
    if (type === 'attach') return true;
    var isCircle = (op.type === 'hole_circle');
    var wOk = Number(cfg.w) > 0;
    var hOk = isCircle ? true : (Number(cfg.h) > 0);
    var from = String(cfg.from || 'top').toLowerCase();
    var place = String(cfg.place || 'left').toLowerCase();
    var fromOk  = (from === 'top' || from === 'bottom' || from === 'left' || from === 'right' || from === 'center');
    var placeOk = (place === 'left' || place === 'right' || place === 'center' || place === 'top' || place === 'bottom');
    return !!(wOk && hOk && fromOk && placeOk);
};
}

function applyPlacementConstraints(card, cfg){
  const fromSel       = card.querySelector('select[name="from"]');
  const placeSel      = card.querySelector('select[name="place"]');
  const offsetXInput = card.querySelector('input[name="offsetX"]');
  const offsetYInput = card.querySelector('input[name="offsetY"]');
  if(!fromSel || !placeSel) return;
  const pos = (cfg.pos || 'main').toLowerCase();
  const isRotated = !!cfg.rotate; 
  let fromOpts = [];
  let placeOpts = [];
  if(pos === 'main'){
    if (isRotated) {
        fromOpts = [{v:'top', t:'ด้านบน'}, {v:'center', t:'ตรงกลาง'}, {v:'bottom', t:'ด้านล่าง'}];
    } else {
        fromOpts = [{v:'top', t:'ด้านบน'}, {v:'bottom', t:'ด้านล่าง'}];
    }
    placeOpts = [{v:'left', t:'ด้านซ้าย'}, {v:'center', t:'ตรงกลาง'}, {v:'right', t:'ด้านขวา'}];
  } else if (pos === 'left') {
    fromOpts = [{v:'left', t:'ด้านซ้าย'}];
    placeOpts = [{v:'bottom', t:'ด้านล่าง'},{v:'center', t:'ตรงกลาง'},{v:'top', t:'ด้านบน'}];
    cfg.from = 'left';
  } else if (pos === 'right') {
    fromOpts = [{v:'right', t:'ด้านขวา'}];
    placeOpts = [{v:'top', t:'ด้านบน'},{v:'center', t:'ตรงกลาง'},{v:'bottom', t:'ด้านล่าง'}];
    cfg.from = 'right';
  }
  const renderOpts = (sel, opts, currentVal) => {
     const exists = opts.some(o => o.v === currentVal);
     sel.innerHTML = opts.map(o => `<option value="${o.v}">${o.t}</option>`).join('');
     if(exists) sel.value = currentVal;
     else {
         sel.value = opts[0].v;
         return opts[0].v;
     }
     return currentVal;
  };
  cfg.from  = renderOpts(fromSel, fromOpts, String(cfg.from||''));
  cfg.place = renderOpts(placeSel, placeOpts, String(cfg.place||''));
  if(offsetXInput){
    const isCenterX = (cfg.place === 'center');
    offsetXInput.disabled = isCenterX;
    if(isCenterX){
      offsetXInput.value = '';
      cfg.offsetX = 0;
      setFieldError(offsetXInput, '');
    } else {
      let v = parseFloat(offsetXInput.value);
      if(isNaN(v)) v = cfg.offsetX || (isRotated ? 5 : 10);
      offsetXInput.value = String(v);
      cfg.offsetX = v;
    }
  }
  if(offsetYInput){
    const isCenterY = (cfg.from === 'center');
    offsetYInput.disabled = isCenterY;
    if(isCenterY){
      offsetYInput.value = '';
      cfg.offsetY = 0;
      setFieldError(offsetYInput, '');
    } else {
      let v = parseFloat(offsetYInput.value);
      if(isNaN(v)) v = cfg.offsetY || 5;
      offsetYInput.value = String(v);
      cfg.offsetY = v;
    }
  }
}

function postProcessCartOrder(){
  const list = document.querySelector('.dpb-cart-body');
  if(!list) return;
  const items = Array.from(list.querySelectorAll('.dpb-cart-item'));
  if(items.length <= 1) return;
  const getMeta = (key)=> (state.meta.options||[]).find(o=>o.key===key) || {};
  const getCfg  = (key, idx)=> (state.optConfig?.[key]||[])[idx];
  const PENALTY_NO_VARIANT_ATTACH = 1e15;
  const scored = items.map(el=>{
    const key = el.dataset.key;
    const index = Number(el.dataset.index||0);
    const cfg = getCfg(key, index) || {};
    const op  = getMeta(key);
    let w = -(cfg.addedAt || 0);
    const hasVariants = Array.isArray(op.variants) && op.variants.length > 0;
    const isAttachNoVar = String(op.type||'').toLowerCase()==='attach' && !hasVariants;
    if(isAttachNoVar) w += PENALTY_NO_VARIANT_ATTACH;
    return {el, weight: w};
  });
  scored.sort((a,b)=> a.weight - b.weight);
  const frag = document.createDocumentFragment();
  scored.forEach(s=> frag.appendChild(s.el));
  list.appendChild(frag);
}

    function roundedPath(target, x,y,w,h, rTL,rTR,rBR,rBL){
      const tl=Math.min(rTL,w/2,h/2), tr=Math.min(rTR,w/2,h/2),
            br=Math.min(rBR,w/2,h/2), bl=Math.min(rBL,w/2,h/2);
      target.beginPath();
      target.moveTo(x+tl,y); target.lineTo(x+w-tr,y); target.quadraticCurveTo(x+w,y,x+w,y+tr);
      target.lineTo(x+w,y+h-br); target.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
      target.lineTo(x+bl,y+h); target.quadraticCurveTo(x,y+h,x,y+h-bl);
      target.lineTo(x,y+tl); target.quadraticCurveTo(x,y,x+tl,y); target.closePath();
    }

function roundedPathNoClamp(ctx, x, y, w, h, rtl, rtr, rbr, rbl){
  const tl = Math.max(0, Math.min(rtl, w, h));
  const tr = Math.max(0, Math.min(rtr, w, h));
  const br = Math.max(0, Math.min(rbr, w, h));
  const bl = Math.max(0, Math.min(rbl, w, h));
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr); else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br);
  if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br); else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl); else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl);
  if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl); else ctx.lineTo(x, y);
  ctx.closePath();
}

    function fillRoundedRect(x,y,w,h,rTL,rTR,rBR,rBL, style){
      if(style) ctx.fillStyle=style;
      roundedPath(ctx,x,y,w,h,rTL,rTR,rBR,rBL);
      ctx.fill();
    }
	function fillSmartRoundedRect(ctx, x, y, w, h, tl, tr, br, bl) {
  // คำนวน Limit ตามขนาดจริงของด้าน (ไม่ใช่แค่ครึ่งเดียวแบบเดิม)
  // ตรวจสอบด้านซ้าย (Left Edge)
  if (tl + bl > h) {
    const scale = h / (tl + bl);
    tl *= scale; bl *= scale;
  }
  // ตรวจสอบด้านขวา (Right Edge)
  if (tr + br > h) {
    const scale = h / (tr + br);
    tr *= scale; br *= scale;
  }
  // ตรวจสอบด้านบน (Top Edge)
  if (tl + tr > w) {
    const scale = w / (tl + tr);
    tl *= scale; tr *= scale;
  }
  // ตรวจสอบด้านล่าง (Bottom Edge)
  if (bl + br > w) {
    const scale = w / (bl + br);
    bl *= scale; br *= scale;
  }

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
  ctx.fill();
}

    function drawTicksH(x1,x2,y,color){
      ctx.strokeStyle=color; ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
      endDot(x1, y, color); endDot(x2, y, color);
    }

    function drawTicksV(y1,y2,x,color){
      ctx.strokeStyle=color; ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2); ctx.stroke();
      endDot(x, y1, color); endDot(x, y2, color);
    }

function dimH(x1, x2, yWanted, label, dir, textPos = 'on', opts = {}){
  if(x2 < x1){ const t = x1; x1 = x2; x2 = t; }
  const c = getOutColor();
  let auto = (label === '' || label === null || typeof label === 'undefined' || label === true);
  if(auto){
    const sc = (typeof deskScale === 'function') ? deskScale() : 1;
    const cm = Math.round((Math.abs(x2 - x1) / sc) * 10) / 10;
    label = `${cm} cm`;
  }
  const SAFE_TOP    = (typeof PAD?.top === 'number' ? PAD.top : 20) + 8;
  const SAFE_BOTTOM = canvas.height - ((typeof PAD?.bottom === 'number' ? PAD.bottom : 20) + 5);
  let y = yWanted;
  if(dir === 'up'   && y < SAFE_TOP)    y = SAFE_TOP;
  if(dir === 'down' && y > SAFE_BOTTOM) y = SAFE_BOTTOM;
  const tick  = 8;
  const gapPx = Number.isFinite(opts.gapPx) ? opts.gapPx : 18;
  let textDy = 0;
  if(textPos === 'above') textDy = -gapPx;
  if(textPos === 'below') textDy = +gapPx;

/* pulse */
const isActive = !!(opts.dimKey && window._dpbDimFocus === opts.dimKey);
const pulse    = isActive ? (window._dpbDimPulse ?? 1) : 1;

ctx.save();
ctx.globalAlpha = isActive ? (0.5 + 0.5 * pulse) : 1;
ctx.globalCompositeOperation = 'source-over';
ctx.strokeStyle = isActive ? '#e7b93b' : c;
ctx.fillStyle   = isActive ? '#e7b93b' : c;
ctx.lineWidth   = isActive ? (3.5 + 2.5 * (1 - pulse)) : 1.3;
ctx.shadowColor = isActive ? '#e7b93b' : 'transparent';
ctx.shadowBlur  = isActive ? (14 * (1 - pulse)) : 0;

  ctx.beginPath();
  ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1, y - tick); ctx.lineTo(x1, y + tick);
  ctx.moveTo(x2, y - tick); ctx.lineTo(x2, y + tick);
  ctx.stroke();

  const midX = (x1 + x2) / 2;
  ctx.font         = '400 18px Prompt, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth    = 0;
  ctx.shadowBlur   = isActive ? (10 * (1 - pulse)) : 0;
  ctx.fillText(label, midX, y + textDy);

  ctx.restore();
}


function dimV(y1, y2, xWanted, label, xOffset = 0, textPos = 'center', opts = {}) {
  if (y2 < y1) { const t = y1; y1 = y2; y2 = t; }
  const c = getOutColor?.() || '#000';
  const SAFE_LEFT  = (typeof PAD?.left  === 'number' ? PAD.left  : 20) + 8;
  const SAFE_RIGHT = canvas.width - ((typeof PAD?.right === 'number' ? PAD.right : 20) + 8);
  let x = xWanted;
  if (x < SAFE_LEFT)  x = SAFE_LEFT;
  if (x > SAFE_RIGHT) x = SAFE_RIGHT;
  const tick = 8;

/* pulse */
const isActive = !!(opts.dimKey && window._dpbDimFocus === opts.dimKey);
const pulse    = isActive ? (window._dpbDimPulse ?? 1) : 1;

ctx.save();
ctx.globalAlpha = isActive ? (0.5 + 0.5 * pulse) : 1;
ctx.strokeStyle = isActive ? '#e7b93b' : c;
ctx.lineWidth   = isActive ? (3.5 + 2.5 * (1 - pulse)) : 1.3;
ctx.shadowColor = isActive ? '#e7b93b' : 'transparent';
ctx.shadowBlur  = isActive ? (22 * (1 - pulse)) : 0;

  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - tick, y1); ctx.lineTo(x + tick, y1);
  ctx.moveTo(x - tick, y2); ctx.lineTo(x + tick, y2);
  ctx.stroke();
  ctx.restore();

const { rotateText = false, clockwise = true, textDx = 0, textDy = 0 } = opts;
  const midY = (y1 + y2) / 2;
  const tx   = x + xOffset;
  const ty   = midY;

  ctx.save();
  ctx.fillStyle    = isActive ? '#e7b93b' : c;       /* ← สีแดงเมื่อ active */
  ctx.font         = '400 18px Prompt, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha  = isActive ? (0.5 + 0.5 * pulse) : 1;
  ctx.shadowColor  = isActive ? '#e7b93b' : 'transparent';
  ctx.shadowBlur   = isActive ? (14 * (1 - pulse)) : 0;

  if (rotateText) {
    ctx.translate(tx, ty);
    ctx.rotate(clockwise ? Math.PI / 2 : -Math.PI / 2);
    ctx.fillText(String(label), textDx, textDy);
  } else {
    ctx.fillText(String(label), tx + textDx, ty + textDy);
  }
  ctx.restore();
}

function dimV_opt(y1, y2, xWanted, label, xOffset = 0, opts = {}) {
  if (y2 < y1) { const t=y1; y1=y2; y2=t; }
  const c = getOutColor?.() || '#000';
  const tick = 8;
  ctx.save();
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(xWanted,y1); ctx.lineTo(xWanted,y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xWanted-tick,y1); ctx.lineTo(xWanted+tick,y1);
  ctx.moveTo(xWanted-tick,y2); ctx.lineTo(xWanted+tick,y2);
  ctx.stroke();
  ctx.restore();
  const raw = String(label || '');
  const [num, unit] = raw.split(' ');
  const midY = (y1+y2)/2;
  const tx = xWanted + xOffset;
  const gap = 14;
  ctx.save();
  ctx.fillStyle = c;
  ctx.font = '400 16px Prompt,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num || raw,  tx, midY - gap/2);
  ctx.fillText(unit || '',  tx, midY + gap/2);
  ctx.restore();
}

(function setDefaultToday(){
  var el = document.getElementById('dpb-date');
  if (!el || el.value) return; 
  var tzNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  var yyyy = tzNow.getFullYear();
  var mm   = String(tzNow.getMonth() + 1).padStart(2, '0');
  var dd   = String(tzNow.getDate()).padStart(2, '0');
  el.value = `${yyyy}-${mm}-${dd}`;
})();

function measureInfoGrid(){
  const name = document.getElementById('dpb-customer').value || '-';
  const platform = document.getElementById('dpb-platforms').value || '-';

  const d = document.getElementById('dpb-date').value;
  const prettyDate = d
    ? (()=>{ const [yy,mm,dd]=d.split('-'); return `${dd}/${mm}/${String(yy).slice(2)}`; })()
    : (()=>{ const t=new Date(); const dd=String(t.getDate()).padStart(2,'0'); const mm=String(t.getMonth()+1).padStart(2,'0'); const yy=String(t.getFullYear()).slice(2); return `${dd}/${mm}/${yy}`; })();
  
  const typeText = document.getElementById('dpb-type').selectedOptions[0]?.text || '-';
  const topKey = document.getElementById('dpb-top-color').value;
  const colorObj = (state.meta.colors||[]).find(c=>c.key===topKey);
  let topName = colorObj?.name || topKey;
  
  // Logic เดิมในการจัดการ Solid Trim
  if (typeof DPB_SOLID_KEYS !== 'undefined' && DPB_SOLID_KEYS.includes(String(topKey))) {
      const trimVal = document.getElementById('dpb-solid-trim')?.value || 'untrim';
      const trimLabel = (trimVal === 'trim') ? '(ทริมเมอร์สันขอบ)' : '(ไม่ทริมเมอร์สันขอบ)';
      topName += ` ${trimLabel}`;
  } else {
      if (topKey && topName.trim().toLowerCase() !== topKey.trim().toLowerCase()) {
          topName += ` (${topKey})`;
      } else if (!colorObj) {
          topName = topKey;
      }
  }

  // --- ส่วนที่เพิ่ม/แก้ไข: Logic สำหรับเปลี่ยน Whiteboard เป็น White บน Canvas ---
  // ใช้ Regular Expression เพื่อเปลี่ยนคำว่า Whiteboard เป็น White (ไม่สนใจตัวพิมพ์เล็ก-ใหญ่)
  let displayTopName = topName.replace(/Whiteboard/gi, 'White');
  // -----------------------------------------------------------------------

  const legKey = document.getElementById('dpb-legs').value;
  const legName = (state.meta.legs||[]).find(c=>c.key===legKey)?.name||legKey;
  
  const headerItems = [
    { label: 'Name:', value: name },
    { label: 'Platform:', value: platform },
    { label: 'Date:', value: prettyDate },
    { label: 'Type:', value: typeText },
    { label: 'Leg:', value: legName }
  ];

  // เปลี่ยนจาก topName เป็น displayTopName ที่เราแก้คำแล้ว
  const topItem = { label: 'Top:', value: displayTopName };

  ctx.font = INFO.rowFont;
  let totalHeaderWidth = 0;
  const GAP = 25; 
  
  headerItems.forEach((item, idx) => {
      const wLabel = ctx.measureText(item.label).width;
      const wValue = ctx.measureText(' ' + item.value).width;
      item.width = wLabel + wValue;
      totalHeaderWidth += item.width;
      if (idx < headerItems.length - 1) totalHeaderWidth += GAP;
  });

  const topInfoWidth = ctx.measureText(topItem.label).width + ctx.measureText(' ' + topItem.value).width;

  return {
    headerItems,
    totalHeaderWidth,
    headerGap: GAP,
    topItem,
    topInfoWidth,
    height: INFO.rowLH 
  };
}

function drawInfoOverlayOnDesk(meas, coords){
  ctx.font = INFO.rowFont;
  const ink = getOutColor(); 
  if (coords.headerY !== undefined && coords.headerCenterX !== undefined) {
      let currentX = coords.headerCenterX - (meas.totalHeaderWidth / 2);
      const y = coords.headerY;

      meas.headerItems.forEach((item, idx) => {
          ctx.textBaseline = 'top'; 
          ctx.fillStyle = INFO.topic || '#a37d13';
          ctx.textAlign = 'left';
          ctx.fillText(item.label, currentX, y);
          const wLabel = ctx.measureText(item.label).width;
          ctx.fillStyle = ink;
          ctx.fillText(' ' + item.value, currentX + wLabel, y);
          currentX += item.width + meas.headerGap;
      });
  }

  if (coords.topY !== undefined && coords.topCenterX !== undefined) {
      const item = meas.topItem;
      const startX = coords.topCenterX - (meas.topInfoWidth / 2);
      const y = coords.topY;

      ctx.textBaseline = 'top';
      
      ctx.fillStyle = INFO.topic || '#a37d13';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, startX, y);

      const wLabel = ctx.measureText(item.label).width;
      
      ctx.fillStyle = ink;
      ctx.fillText(' ' + item.value, startX + wLabel, y);
  }
}

function dpb_computeInfoOverlayXY(meas){
  const typeNow = (byId('dpb-type')?.value || '').toLowerCase();
  const sc      = deskScale();
  const px      = v => v*sc;
  const rect1 = state?.boxes?.main; 
  const rect2 = state?.boxes?.arm;  
  if ((typeNow==='l2' || typeNow==='l3') && rect1 && rect2 && isFinite(meas?.colsWidth)){
    const side = (byId('dpb-aside')?.value || 'right').toLowerCase();
    const y = Math.round(rect1.y + rect1.h + px(20));
    const centerOffset = (rect1.w - rect2.w) / 2;
    const centerX = (side === 'left')
      ? (rect2.x + rect2.w - centerOffset) 
      : (rect2.x + centerOffset);          
    const x = Math.round(centerX - (meas.colsWidth / 2));
    return { x, y };
  }
  if (rect1 && isFinite(meas?.colsWidth) && isFinite(meas?.height)){
    const x = Math.round(rect1.x + (rect1.w - meas.colsWidth)/2);
    const y = Math.round(rect1.y + rect1.h - meas.height);
    return { x, y };
  }
  return { x: 0, y: 0 };
}

window.DPB_drawTexturedQuad = function(ctx, img, pTL, pTR, pBR, pBL, isCircle = false) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.globalAlpha = 1.0;
    const dx = pTL.x;
    const dy = pTL.y;

    const m11 = (pTR.x - pTL.x) / iw;
    const m12 = (pTR.y - pTL.y) / iw;
    const m21 = (pBL.x - pTL.x) / ih;
    const m22 = (pBL.y - pTL.y) / ih;

    ctx.transform(m11, m12, m21, m22, dx, dy);

    if (isCircle) {
        ctx.beginPath();
        ctx.arc(iw / 2, ih / 2, iw / 2, 0, Math.PI * 2);
        ctx.clip();
    }

    ctx.drawImage(img, 0, 0);
    ctx.restore();
};



// ============================================================================
// [MATH HELPER] ฟังก์ชันช่วยคำนวณ Geometry 2D เพื่อ Project เป็น 3D
// ============================================================================
const Math3DHelper = {
    // คำนวณระยะห่างระหว่างจุด 2 จุด
    dist: (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y),

    // จำลอง logic ctx.arcTo แต่ส่งคืนเป็น array ของจุด 3D แทนการวาดเลย
    // current2D: จุดปัจจุบันในระนาบ 2D (Logical)
    // p1, p2: จุด control points (มุมแหลม) และจุดปลายทาง
    // radius: รัศมี
    // projectFn: ฟังก์ชันแปลง 2D -> 3D
    calculateArcTo3D: (current2D, p1, p2, radius, projectFn) => {
        const p0 = current2D;
        
        // 1. Vector คำนวณทิศทาง
        const v01 = { x: p0.x - p1.x, y: p0.y - p1.y };
        const v21 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const len01 = Math.hypot(v01.x, v01.y);
        const len21 = Math.hypot(v21.x, v21.y);

        // Normalize
        const d01 = { x: v01.x / len01, y: v01.y / len01 };
        const d21 = { x: v21.x / len21, y: v21.y / len21 };

        // มุมระหว่างเส้น
        const angle = Math.acos(d01.x * d21.x + d01.y * d21.y);
        const halfTan = Math.tan((Math.PI - angle) / 2);
        
        // ระยะจากมุม (p1) ไปยังจุดสัมผัส (Tangent Start/End)
        let segLen = radius / halfTan;

        // Safety: ถ้ารัศมีใหญ่เกินความยาวเส้น ให้ลดลงมา
        if (segLen > len01) segLen = len01;
        if (segLen > len21) segLen = len21;

        // จุดสัมผัส (Tangent Points) ใน 2D
        const tStart = { x: p1.x + d01.x * segLen, y: p1.y + d01.y * segLen };
        const tEnd   = { x: p1.x + d21.x * segLen, y: p1.y + d21.y * segLen };

        // จุดศูนย์กลางวงกลม (หาจากการ Cross vector หรือ Perpendicular)
        // เพื่อความง่าย เราใช้วิธี Interpolate มุมเอา
        // หามุมของเส้นสัมผัสเทียบกับแกนโลก
        const angleStart = Math.atan2(tStart.y - p1.y, tStart.x - p1.x); // มุมเส้นขาเข้า
        const angleEnd   = Math.atan2(tEnd.y - p1.y, tEnd.x - p1.x);     // มุมเส้นขาออก

        // คำนวณจุดศูนย์กลางโค้ง (Center)
        // ข้ามการหา Center ที่แม่นยำ แล้วใช้ Quadratic Bezier หรือ Subdivision
        // ในที่นี้ใช้ Subdivision (ซอยเส้น) เพื่อความเนียนใน 3D
        
        const segments = 6; // ความละเอียดของมุมโค้ง
        const points3D = [];

        // 1. เส้นตรงจากจุดปัจจุบัน ไปยังจุดเริ่มโค้ง
        points3D.push({ type: 'line', p3d: projectFn(tStart.x, tStart.y) });

        // 2. ส่วนโค้ง (Curve)
        // เราใช้ Quadratic Bezier ใน 2D แล้ว Project จุด Control ไป 3D
        // หรือคำนวณจุดบนเส้นโค้งจริงๆ
        // เพื่อความแม่นยำสูงสุดใน L-Shape ใช้ Quadratic Bezier โดยใช้ p1 เป็น Control Point
        // *หมายเหตุ* arcTo จริงๆ คือส่วนหนึ่งของวงกลม แต่ Quadratic คือ Parabola
        // แต่ในงานเฟอร์นิเจอร์ 3D Web การใช้ Quadratic Curve โดยใช้มุมเป็น Control Point 
        // ให้ผลลัพธ์ที่สวยและเร็วกว่าการคำนวณวงกลมเป๊ะๆ
        
        const cp = projectFn(p1.x, p1.y); // Control Point (Corner)
        const ep = projectFn(tEnd.x, tEnd.y); // End Point

        points3D.push({ type: 'curve', cp: cp, end: ep });

        return {
            points: points3D,
            newCurrent2D: tEnd // คืนค่าจุดปลาย เพื่อใช้เป็นจุดเริ่มของเส้นถัดไป
        };
    }
};

window.createDynamicDeskPath = function(L, W, radii, options = {}) {
    const path = new Path2D();
    const orgX = 616.9; 
    const orgY = 153.9;
    
    const vL_x = 4.5855, vL_y = 2.469; 
    const vW_start_x = -7.000, vW_start_y = 1.000;
    const vW_end_x   = -8.453, vW_end_y   = 2.865;
    
    // [CONFIG] ค่าอ้างอิงและค่าความแรง Perspective
    const REF_L = 200.0;
    const REF_W = 100.0; // ค่าอ้างอิงความลึก (Standard Depth)
    
    const P_DEPTH = 0.0005; 
    const P_STRENGTH_X = 1.20; // บิดแกน X (ซ้ายขวา)
    const P_STRENGTH_Y = 1.10; // บิดแกน Y (บนล่าง) <-- เพิ่มตามที่ขอ

    // Projection Function (Full Warp X & Y)
    const project = (l, w) => {
        // --- 1. Warp Length (X) ---
        let ratioL = l / REF_L;
        let warpedRatioL = Math.pow(Math.abs(ratioL), P_STRENGTH_X);
        if (ratioL < 0) warpedRatioL = -warpedRatioL;
        let warpedL = warpedRatioL * REF_L;

        // --- 2. Warp Width/Depth (Y) ---
        // บิดให้ด้านบน(0) ถี่กว่าด้านล่าง(W)
        let ratioW = w / REF_W;
        let warpedRatioW = Math.pow(Math.abs(ratioW), P_STRENGTH_Y);
        if (ratioW < 0) warpedRatioW = -warpedRatioW;
        let warpedW = warpedRatioW * REF_W;

        // --- 3. Interpolate ---
        const t = warpedRatioL; 
        const curr_vW_x = vW_start_x + (vW_end_x - vW_start_x) * t;
        const curr_vW_y = vW_start_y + (vW_end_y - vW_start_y) * t;

        const depthScale = 1 + (warpedW * P_DEPTH);

        return { 
            // ใช้ warpedL และ warpedW ในการคำนวณพิกัด
            x: orgX + (warpedL * vL_x * depthScale) + (warpedW * curr_vW_x), 
            y: orgY + (warpedL * vL_y * depthScale) + (warpedW * curr_vW_y) 
        };
    };

    const { isLDesk, side, AL, AW, l_radii } = options;
    const rBack = radii[0], rRight = radii[1], rFront = radii[2], rLeft = radii[3]; 

    let pen2D = { x: 0, y: 0 };
    const movePenTo = (x, y) => { pen2D = { x, y }; const p3d = project(x, y); path.moveTo(p3d.x, p3d.y); };
    const lineTo = (x, y) => { pen2D = { x, y }; const p3d = project(x, y); path.lineTo(p3d.x, p3d.y); };

    const arcTo3D = (x1, y1, x2, y2, radius) => {
        const p1 = {x: x1, y: y1}; const p2 = {x: x2, y: y2};
        if (radius <= 0) { lineTo(x1, y1); return; }
        const result = Math3DHelper.calculateArcTo3D(pen2D, p1, p2, radius, project);
        result.points.forEach(pt => {
            if (pt.type === 'line') path.lineTo(pt.p3d.x, pt.p3d.y);
            else if (pt.type === 'curve') path.quadraticCurveTo(pt.cp.x, pt.cp.y, pt.end.x, pt.end.y);
        });
        pen2D = result.newCurrent2D;
    };

    // --- CASE 1: RECTANGULAR ---
    if (!isLDesk) {
        movePenTo(0, rBack);
        arcTo3D(0, 0, L, 0, rBack); arcTo3D(L, 0, L, W, rRight);
        arcTo3D(L, W, 0, W, rFront); arcTo3D(0, W, 0, 0, rLeft);
        path.closePath();
        const legR_Anchor = project(L, W / 2); const legL_Anchor = project(0, W / 2); const legC_Anchor = project(L/2, W/2); 
        return { path, legR_Anchor, legL_Anchor, legC_Anchor };
    } 
    // --- CASE 2: L-SHAPE ---
    else {
        const { r_tl, r_tr, r_br, r_step, r_arm_bl, r_arm_br, r_in } = l_radii;
        if (side === 'right') {
            movePenTo(0, r_tl); arcTo3D(0, 0, L, 0, r_tl); arcTo3D(L, 0, L, AW, r_tr);
            arcTo3D(L, AW, L - AL, AW, r_arm_br); arcTo3D(L - AL, AW, L - AL, W, r_arm_bl);
            arcTo3D(L - AL, W, 0, W, r_in); arcTo3D(0, W, 0, 0, r_step);
            path.closePath();
        } else {
            movePenTo(0, r_tl); arcTo3D(0, 0, L, 0, r_tl); arcTo3D(L, 0, L, W, r_tr);
            arcTo3D(L, W, AL, W, r_br); arcTo3D(AL, W, AL, AW, r_in);
            arcTo3D(AL, AW, 0, AW, r_arm_br); arcTo3D(0, AW, 0, 0, r_arm_bl);
            path.closePath();
        }
        let legL_Anchor, legR_Anchor, legC_Anchor;
        if (side === 'right') {
            legL_Anchor = project(0, W/2); legR_Anchor = project(L, AW/2); legC_Anchor = project(L - AL + (AL/2), W/2); 
        } else {
            legL_Anchor = project(0, AW/2); legR_Anchor = project(L, W/2); legC_Anchor = project(AL/2, W/2);           
        }
        return { path, legR_Anchor, legL_Anchor, legC_Anchor };
    }
};

// ============================================================================
// 3. Main Draw Function (Updated for L-Desk Radii)
// ============================================================================
window.drawDesk3D = function() {
    const byId = function(id) { return document.getElementById(id); };
    const canvas = document.getElementById('dpb-canvas') || document.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- Input & Config ---
    const modelType = (byId('dpb-type')?.value || 'custom').toLowerCase();
    const isLDesk = (modelType === 'l2' || modelType === 'l3');
    
    const L = +(byId('dpb-ml')?.value || 190);
    const W = +(byId('dpb-mw')?.value || 60);
    
    // L-Desk Params
    const AL = +(byId('dpb-al')?.value || 60); 
    const AW = +(byId('dpb-aw')?.value || 120); 
    const side = (byId('dpb-aside')?.value || 'right').toLowerCase();

    // Helper ดึงค่า R (เหมือนใน 2D)
    const getNum = (id, fb=0) => {
        const el = byId(id); const v = el ? Number(el.value) : fb;
        return Number.isFinite(v) ? v : fb;
    };

    // Radii for Rect Desk (mm -> cm)
    const rTL = getNum('r_rect_tl', 0) / 10;
    const rTR = getNum('r_rect_tr', 0) / 10;
    const rBR = getNum('r_rect_br', 0) / 10;
    const rBL = getNum('r_rect_bl', 0) / 10;

    // Radii for L-Desk (mm -> cm)
    // เก็บใส่ Object เพื่อส่งไปให้ createDynamicDeskPath
    const l_radii = {
        r_tl: getNum('ld_r_tl', 0) / 10,
        r_tr: getNum('ld_r_tr', 0) / 10,
        r_step: getNum('ld_r_step', 0) / 10,  // มุมล่างของแผ่นหลัก
        r_br: getNum('ld_r_br', 0) / 10,      // มุมขวาล่างแผ่นหลัก (สำหรับ L-Left)
        r_arm_bl: getNum('ld_r_armbl', 0) / 10,
        r_arm_br: getNum('ld_r_armbr', 0) / 10,
        r_in: getNum('dpb-rInner', 0) / 10    // มุมฉากด้านใน
    };

// --- Prepare Leg Assets (FIXED: Auto Load & Cache) ---
    const legData = window.getParamsForLegs(); 
    const legAssets = legData.assets;

    // 1. สร้างตัวแปรเก็บ Cache (ถ้ายังไม่มี) เพื่อไม่ให้โหลดซ้ำ
    if (!window.DPB_LEG_CACHE) window.DPB_LEG_CACHE = {};

    // 2. ฟังก์ชันช่วยโหลดรูป: ถ้าไม่มีใน Cache ให้โหลดใหม่ + สั่งวาดซ้ำเมื่อเสร็จ
    const loadLegImg = (url) => {
        if (!url) return new Image(); // กัน Error กรณีไม่มี URL
        if (!window.DPB_LEG_CACHE[url]) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => { 
                // *** จุดสำคัญ: เมื่อโหลดรูปเสร็จ ให้เรียกฟังก์ชันวาดใหม่อีกรอบ ***
                if (window.drawDesk3D) requestAnimationFrame(window.drawDesk3D); 
            };
            window.DPB_LEG_CACHE[url] = img;
        }
        return window.DPB_LEG_CACHE[url];
    };
    
    // 3. เรียกใช้ผ่านฟังก์ชันโหลด
    const imgLegLeft   = loadLegImg(legAssets.left || legAssets.leg);
    const imgLegRight  = loadLegImg(legAssets.right || legAssets.leg);
    const imgLegCenter = loadLegImg(legAssets.center || legAssets.left);

    // Helper ดูดสี
    const getAverageColor = (imgEl) => {
        try {
            const c = document.createElement('canvas');
            c.width = 1; c.height = 1;
            const cx = c.getContext('2d');
            cx.drawImage(imgEl, 0, 0, 1, 1);
            const p = cx.getImageData(0, 0, 1, 1).data;
            return `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
        } catch(e) { return '#5a4a3e'; }
    };

    // สร้าง Path
    const data = window.createDynamicDeskPath(L, W, [rTL, rTR, rBR, rBL], { 
        isLDesk, 
        side, 
        AL, 
        AW, 
        l_radii: l_radii // ส่งค่า R ของ L-Desk ไปด้วย
    });
    const shapePath = data.path;

    // --- Drawing Context Setup ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bg = (window.state && window.state.theme && window.state.theme.bg) || '#ffffff';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Auto Zoom ---
    const maxDimL = isLDesk ? L : L;
    const maxDimW = isLDesk ? Math.max(W, AW) : W;
    const currMaxX = 616.9 + (maxDimL * 4.585);
    const currMinX = 616.9 + (maxDimW * -7.191);
    const tZoom = maxDimL / 200.0;
    const vw_end_y_est = 1.028 + (2.865 - 1.028) * tZoom;
    const currMaxY = 153.9 + (maxDimL * 2.469) + (maxDimW * vw_end_y_est);
    const LEG_LOGICAL_HEIGHT = 450; 
    const objectWidthLogic = currMaxX - currMinX;
    const objectHeightLogic = (currMaxY - 153.9) + LEG_LOGICAL_HEIGHT;
    const PADDING_X = 60; 
    const PADDING_Y = 100;
    const availableW = canvas.width - PADDING_X;
    const availableH = canvas.height - PADDING_Y;
    const scaleW = availableW / objectWidthLogic;
    const scaleH = availableH / objectHeightLogic;
    let sc3d = Math.min(scaleW, scaleH);

    const objCenterX = (currMinX + currMaxX) / 2;
    const objCenterY = (153.9 + (currMaxY + LEG_LOGICAL_HEIGHT)) / 2;
    const VISUAL_OFFSET_Y = -20; 
    const drawOffsetX = (canvas.width / 2) - (objCenterX * sc3d);
    const drawOffsetY = (canvas.height / 2) - (objCenterY * sc3d) + VISUAL_OFFSET_Y;

    // --- Shadow ---
    ctx.save();
    const SH_OFFSET_X = 150; const SH_OFFSET_Y = 380;    
    const SH_SCALE_X  = 1.02; const SH_SCALE_Y  = 1.05;    
    const SH_SKEW_X   = -0.3; const SH_SKEW_Y   = 0.11;    
    const SH_ROTATE   = -05; const SH_BLUR     = 25;       
    const SH_OPACITY  = 0.15;   
    const shadowX = drawOffsetX + (SH_OFFSET_X * sc3d);
    const shadowY = drawOffsetY + (SH_OFFSET_Y * sc3d);
    ctx.translate(shadowX, shadowY);
    ctx.rotate(SH_ROTATE * Math.PI / 180);
    ctx.transform(sc3d * SH_SCALE_X, SH_SKEW_Y, SH_SKEW_X, sc3d * SH_SCALE_Y, 0, 0);
    ctx.filter = `blur(${SH_BLUR}px)`;
    const shadowGrad = ctx.createLinearGradient(0, -100, 0, 200);
    shadowGrad.addColorStop(0.0, `rgba(0,0,0, ${SH_OPACITY * 0.1})`); 
    shadowGrad.addColorStop(0.5, `rgba(0,0,0, ${SH_OPACITY})`);        
    shadowGrad.addColorStop(1.0, `rgba(0,0,0, ${SH_OPACITY * 0.3})`); 
    ctx.fillStyle = shadowGrad;
    ctx.fill(shapePath);
    ctx.restore();

    // --- Legs (UPDATED: Configurable XY & Size) ---
    const UNIT_CONVERSION = 4.5855; 

    // ========================================================================
    // [CONFIG] LEG ADJUSTMENTS
    // ปรับแต่งขนาดและตำแหน่งขาแต่ละรุ่นได้ที่นี่
    // size: ขนาดความกว้างขา (cm)
    // moveX: เลื่อนซ้ายขวา (ค่าบวก = ขวา, ค่าลบ = ซ้าย)
    // moveUp: เลื่อนขึ้น (ค่าบวก = ขึ้น, ค่าลบ = ลง)
    // ========================================================================
    const LEG_CONFIG = {
        // รุ่น Custom (ขาคู่ทั่วไป)
        'custom': {
            left:   { size: 75, moveX: 10, moveUp: 60 },
            right:  { size: 90, moveX: 10, moveUp: 70 }

        },
        // รุ่น Single (ขาเดียว)
        'single': {
            center: { size: 80, moveX: 0, moveUp: 50 } 
        },
        // รุ่น L2 (2 ขา)
        'l2': {
            // กรณีหันขวา (Side Right)
            'right': {
                left:  { size: 75.0, moveX: 10, moveUp: 60 }, // ขาซ้าย
                right: { size: 116.0, moveX: 63.4, moveUp: 114.2 }  // ขาขวา (L)
            },
            // กรณีหันซ้าย (Side Left)
            'left': {
                left:  { size: 100.0, moveX: 63.4, moveUp: 90 }, // ขาซ้าย (L)
                right: { size: 90.0, moveX: 10, moveUp: 70 }  // ขาขวา
            }
        },
        // รุ่น L3 (3 ขา)
        'l3': {
            // กรณีหันขวา (Side Right)
            'right': {
                left:   { size: 64.7, moveX: 10, moveUp: 30 }, // ขาซ้าย
                center: { size: 64.7, moveX: 15, moveUp: 50 }, // ขาขวาบน (Center)
                right:  { size: 90.0, moveX: 20, moveUp: 70 }  // ขาขวาล่าง
            },
            // กรณีหันซ้าย (Side Left)
            'left': {
                left:   { size: 64.7, moveX: 10, moveUp: 30 }, // ขาซ้ายล่าง
                center: { size: 64.7, moveX: 15, moveUp: 50 }, // ขาซ้ายบน (Center)
                right:  { size: 90.0, moveX: 20, moveUp: 70 }  // ขาขวา
            }
        }
    };
    // กรณี Default หรือหาไม่เจอ
    const DEFAULT_LEG_CFG = { size: 80, moveX: 0, moveUp: 0 };


    // ฟังก์ชันวาดขาที่รองรับ Config
    const drawLeg = (img, pos, cfg) => {
        if (!img.complete || !pos || img.naturalWidth === 0) return;
        const config = cfg || DEFAULT_LEG_CFG;
        const LEG_SCALE_BOOST = 1.5; 
        
        const legW_Px = config.size * UNIT_CONVERSION * sc3d * LEG_SCALE_BOOST;
        const ratio = img.height / img.width;
        const legH_Px = legW_Px * ratio;

        // คำนวณตำแหน่ง (Apply moveX, moveUp)
        const posX = drawOffsetX + (pos.x * sc3d) - (legW_Px/2) + config.moveX;
        const posY = drawOffsetY + (pos.y * sc3d) - config.moveUp;

        ctx.drawImage(img, posX, posY, legW_Px, legH_Px);
    };

    // --- EXECUTE DRAWING ---
    // เลือกว่าจะใช้ Config ชุดไหน
    let currentCfg = LEG_CONFIG[modelType] || LEG_CONFIG['custom'];
    
    // ถ้าเป็น L2/L3 ต้องเจาะจง Side เข้าไปอีกชั้น
    if (modelType === 'l2' || modelType === 'l3') {
        currentCfg = currentCfg[side] || currentCfg['right'];
    }

    if (modelType === 'single') {
        drawLeg(imgLegLeft, data.legC_Anchor, currentCfg.center); 
    } 
    else if (modelType === 'l3') {
        // L3 วาด 3 ขา: Left, Center, Right
        // (ซึ่งเรา map รูปภาพใน assets ไว้ตรงกับตำแหน่งแล้ว)
        drawLeg(imgLegLeft,   data.legL_Anchor, currentCfg.left);
        drawLeg(imgLegCenter, data.legC_Anchor, currentCfg.center);
        drawLeg(imgLegRight,  data.legR_Anchor, currentCfg.right);
    }
    else if (modelType === 'l2') {
        // L2 วาด 2 ขา: Left, Right
        drawLeg(imgLegLeft,   data.legL_Anchor, currentCfg.left);
        drawLeg(imgLegRight,  data.legR_Anchor, currentCfg.right);
    }
    else {
        // Custom อื่นๆ
        drawLeg(imgLegLeft,   data.legL_Anchor, currentCfg.left);
        drawLeg(imgLegRight,  data.legR_Anchor, currentCfg.right);
    }

    // --- Texture ---
    let finalFillStyle = '#1a1a1a'; 
    let sideBaseColor = '#3d2e24';  
    const topColorVal = byId('dpb-top-color') ? byId('dpb-top-color').value : null;

    try {
        if (topColorVal) {
            let img = null;
            if (window.state && window.state.colorImg3DCache && window.state.colorImg3DCache[topColorVal]) {
                img = window.state.colorImg3DCache[topColorVal];
            }
            if (!img || !img.complete || img.naturalWidth === 0) {
                 if (window.DPB_TEXTURES && window.DPB_TEXTURES[topColorVal]) {
                     img = window.DPB_TEXTURES[topColorVal];
                 } else if (window.state && window.state.colorImgCache && window.state.colorImgCache[topColorVal]) {
                     img = window.state.colorImgCache[topColorVal];
                 }
            }
            if (img && img.complete && img.naturalWidth > 0) {
                 const p = ctx.createPattern(img, 'repeat');
                 const m = new DOMMatrix();
                 m.translateSelf(drawOffsetX, drawOffsetY);
                 m.scaleSelf(sc3d * 0.4, sc3d * 0.4); 
                 p.setTransform(m);
                 finalFillStyle = p;
                 sideBaseColor = getAverageColor(img);
            }
        } 
    } catch (e) { console.warn(e); }

    const thicknessPx = 4.0 * UNIT_CONVERSION * sc3d; 
    const layers = 55;
    const EXCLUDED_KEYS = ['MK630N', 'MK203', 'MK3200', 'MK260_AT1'];
    let isPlywoodMode = true; 
    if (EXCLUDED_KEYS.includes(topColorVal)) isPlywoodMode = false;
    else if (window.state?.meta?.colors) {
        const cData = window.state.meta.colors.find(c => c.key === topColorVal);
        if (cData && cData.group === 'solidwood') isPlywoodMode = false;
    }

    const gX1 = drawOffsetX + (currMinX * sc3d), gY1 = drawOffsetY + (153.9 * sc3d);
    const gX2 = drawOffsetX + (currMaxX * sc3d), gY2 = drawOffsetY + (currMaxY * sc3d);
    const layerShadowGradient = ctx.createLinearGradient(gX1, gY1, gX2, gY2);
    layerShadowGradient.addColorStop(0.0, "rgba(0, 0, 0, 0.00)"); 
    layerShadowGradient.addColorStop(0.6, "rgba(0, 0, 0, 0.00)"); 
    layerShadowGradient.addColorStop(1.0, "rgba(0, 0, 0, 0.15)");      

    const BAND_SIZE = 5; 
    ctx.save();
    for (let i = 0; i <= layers; i++) {
        let yShift = (thicknessPx * (layers - i)) / layers;
        ctx.setTransform(sc3d, 0, 0, sc3d, drawOffsetX, drawOffsetY + yShift);
        if (isPlywoodMode) {
            ctx.fillStyle = sideBaseColor; ctx.fill(shapePath);
            const isDarkBand = Math.floor(i / BAND_SIZE) % 2 === 0;
            ctx.fillStyle = isDarkBand ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            ctx.fill(shapePath);
        } else {
            ctx.fillStyle = finalFillStyle; ctx.fill(shapePath);
        }
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light'; 
        ctx.fillStyle = layerShadowGradient;
        ctx.fill(shapePath);
        ctx.restore(); 
    }
    ctx.restore();

    // --- Top Face ---
    ctx.save();
    ctx.setTransform(sc3d, 0, 0, sc3d, drawOffsetX, drawOffsetY);
    ctx.clip(shapePath); 

    let fullImg3D = null;
    if (topColorVal && window.state?.colorImg3DCache?.[topColorVal]) {
        fullImg3D = window.state.colorImg3DCache[topColorVal];
    }
    if (fullImg3D && fullImg3D.complete && fullImg3D.naturalWidth > 0) {
        const boxX = currMinX, boxY = 153.9;
        const boxW = currMaxX - currMinX, boxH = currMaxY - 153.9;
        const cx = boxX + (boxW / 2), cy = boxY + (boxH / 2); 
        ctx.save(); ctx.translate(cx, cy);
        ctx.drawImage(fullImg3D, -boxW/2, -boxH/2, boxW, boxH);
        ctx.restore(); 
        ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fill(shapePath);
    } else {
        ctx.fillStyle = finalFillStyle; ctx.fill(shapePath);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2.5; ctx.stroke(shapePath);
    ctx.restore(); 

    ctx.save();
    ctx.setTransform(sc3d, 0, 0, sc3d, drawOffsetX, drawOffsetY);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    if (typeof window.drawOptionsIn3D === 'function') {
        const orgX = 616.9; 
        const orgY = 153.9;
        const vL_x = 4.5855, vL_y = 2.469; 
        const vW_start_x = -7.000, vW_start_y = 1.000;
        const vW_end_x   = -8.453, vW_end_y   = 2.865;
        
        const REF_L = 200.0;
        const REF_W = 100.0; // เพิ่มค่าอ้างอิงความลึก

        const P_DEPTH = 0.0005; 
        const P_STRENGTH_X = 1.20; 
        const P_STRENGTH_Y = 1.10; // <-- เพิ่มค่านี้ให้เท่ากับ createDynamicDeskPath

        const projectFn = (l, w) => {
            // 1. Warp Length (X)
            let ratioL = l / REF_L;
            let warpedRatioL = Math.pow(Math.abs(ratioL), P_STRENGTH_X);
            if (ratioL < 0) warpedRatioL = -warpedRatioL;
            let warpedL = warpedRatioL * REF_L;

            // 2. Warp Width/Depth (Y) <-- เพิ่ม Logic นี้
            let ratioW = w / REF_W;
            let warpedRatioW = Math.pow(Math.abs(ratioW), P_STRENGTH_Y);
            if (ratioW < 0) warpedRatioW = -warpedRatioW;
            let warpedW = warpedRatioW * REF_W;

            // 3. Interpolate
            const t = warpedRatioL; 
            const curr_vW_x = vW_start_x + (vW_end_x - vW_start_x) * t;
            const curr_vW_y = vW_start_y + (vW_end_y - vW_start_y) * t;

            const depthScale = 1 + (warpedW * P_DEPTH);

            return { 
                // ใช้ warpedL และ warpedW
                x: orgX + (warpedL * vL_x * depthScale) + (warpedW * curr_vW_x), 
                y: orgY + (warpedL * vL_y * depthScale) + (warpedW * curr_vW_y) 
            };
        };

        window.drawOptionsIn3D(ctx, L, W, projectFn);
    }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
};



// ============================================================================
// [INIT] Re-run draw when leg assets are loaded
// ============================================================================
(function preloadLegAssets() {
    const allUrls = [];
    Object.values(LEG_3D_ASSETS).forEach(modelObj => {
        Object.values(modelObj).forEach(colorObj => {
            Object.values(colorObj).forEach(url => allUrls.push(url));
        });
    });
    
    let loaded = 0;
    allUrls.forEach(url => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            loaded++;
            if (loaded === allUrls.length && typeof window.draw === 'function') {
                window.draw(); // Refresh canvas when assets ready
            }
        };
    });
})();

window._dpbDimFocus = null;
window._dpbDimPulse = 1;
let _pulseRaf = null;
window._dpbOptFocus = null;  /* ← เพิ่มบรรทัดนี้ */


function startDimPulse(dimKey) {
  window._dpbDimFocus = dimKey;
  if (_pulseRaf) return;
  let t = 0;
  function loop() {
    t += 0.05;
    window._dpbDimPulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * Math.PI));
    scheduleRedraw();
    _pulseRaf = requestAnimationFrame(loop);
  }
  _pulseRaf = requestAnimationFrame(loop);
}

function stopDimPulse() {
  if (_pulseRaf) { cancelAnimationFrame(_pulseRaf); _pulseRaf = null; }
  window._dpbDimPulse  = 1;
  window._dpbDimFocus  = null;
  scheduleRedraw();
}

const dimInputMap = {
  'dpb-ml': 'length',   /* ความยาว → dimH บน */
  'dpb-mw': 'width',    /* ความกว้าง → dimV ขวา */
  'dpb-al': 'al',       /* ความยาวแขน L */
  'dpb-aw': 'aw',       /* ความกว้างแขน L */
};

Object.entries(dimInputMap).forEach(([id, key]) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('focus', () => startDimPulse(key));
  el.addEventListener('blur',  () => stopDimPulse());
});

function draw() {
    if (!state?.validation?.ok) return;
    const requiredHeight = measureTotalHeight();

    if (canvas.height !== requiredHeight) {
        canvas.height = requiredHeight;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1;

    // --- [จุดสำคัญ 1] เช็คโหมด 3D ---
    // ถ้าเป็น 3D ให้วาดแล้วจบฟังก์ชันเลย (Watermark ข้างล่างจะไม่ถูกเรียก)
    if (window.dpbViewMode === '3d') {
        window.drawDesk3D();
        return; 
    }

    // --- โหมด 2D ---
    
    // 1. เคลียร์จอ
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setBoxes(null);

    // 2. ลงสีพื้นหลัง
    const bg = state?.theme?.bg || document.getElementById('dpb-bg')?.dataset.selected || '#ffffff';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. เตรียมตัวแปร
    const byId = function (id) { return document.getElementById(id); };
    const t = byId('dpb-type').value;
    const sc = deskScale();
    const wDesk = (typeof FIXED_DRAW_LEN !== 'undefined') ? FIXED_DRAW_LEN : 600;
    const xDesk = (canvas.width - wDesk) / 2;
    const yDesk = 150;
    let hDesk = 0;

    // 4. วาดโต๊ะ 2D (และคำนวณ hDesk ที่ถูกต้อง)
    if (t === 'l2' || t === 'l3') {
        hDesk = ldeskHeight(); // ความสูงสำหรับโต๊ะ L
        if (typeof drawLDeskAt === 'function') drawLDeskAt(xDesk, yDesk, sc, bg);
    } else {
        hDesk = rectDeskHeight(); // ความสูงสำหรับโต๊ะตรง
        if (typeof drawRectAt === 'function') drawRectAt(xDesk, yDesk, sc, bg);
    }

    // 5. [จุดสำคัญ 2] Watermark 2D Setup
    // แก้ไข: ใช้ตัวแปร hDesk ที่คำนวณมาแล้วจากข้อ 4 เพื่อความชัวร์
    try {
        const boxes = (typeof getBoxes === 'function') ? getBoxes() : (state && state.boxes);
        const r1 = boxes?.rect1 || boxes?.main;

        if (r1 && isFinite(r1.x)) {
            // กรณีมีข้อมูล Box ชัดเจน
            DPB_setWatermarkAnchor({ x: r1.x, y: r1.y, w: r1.w, h: r1.h }, sc);
        } else {
            // กรณี Fallback: ใช้ hDesk ที่เราคำนวณไว้แล้ว (แก้ปัญหา Watermark หายในโต๊ะ L)
            DPB_setWatermarkAnchor({ x: xDesk, y: yDesk, w: wDesk, h: hDesk }, sc);
        }
    } catch (_) { }

    // 6. วาด Options Grid (เฉพาะ 2D)
    const extraCm = (typeof getDeskBottomPaddingCm === 'function') ? getDeskBottomPaddingCm() : 0;
    const extraPx = extraCm * sc;
    const DESK_BOTTOM_SPACE = 80;
    const GAP_BETWEEN_OPTS = 0;
    const totalInnerW = canvas.width - (typeof PAD !== 'undefined' ? PAD.left : 20) - (typeof PAD !== 'undefined' ? PAD.right : 20);
    const optionsX = (typeof PAD !== 'undefined' ? PAD.left : 20);
    const optionsY = yDesk + hDesk + extraPx + DESK_BOTTOM_SPACE + GAP_BETWEEN_OPTS;

    if (typeof drawOptionsGridInBox === 'function') {
        drawOptionsGridInBox(optionsX, optionsY, totalInnerW);
    }

    if (typeof canShow3DButton !== 'undefined' && canShow3DButton === true && window.dpbViewMode !== '3d') {

        const sc_debug = (typeof deskScale === 'function') ? deskScale() : 1;
        const wDesk_debug = (typeof FIXED_DRAW_LEN !== 'undefined') ? FIXED_DRAW_LEN : 600;
        const xDesk_debug = (canvas.width - wDesk_debug)/2;
        const yDesk_debug = 150; 

        // 2. ดึงค่า Config โต๊ะ

        const byId = (id) => document.getElementById(id);
        const modelType = (byId('dpb-type')?.value || 'custom').toLowerCase();
        const isLDesk = (modelType === 'l2' || modelType === 'l3');
        const side = (byId('dpb-aside')?.value || 'right').toLowerCase();
        const ML = +(byId('dpb-ml')?.value || 180);
        const MW = +(byId('dpb-mw')?.value || 70);
        const AL = +(byId('dpb-al')?.value || 70);
        const AW = +(byId('dpb-aw')?.value || 110);



        // 3. เรียกวาด Main Table

       // if (typeof window.draw2DDebugRuler === 'function') {

        //    window.draw2DDebugRuler(ctx, xDesk_debug, yDesk_debug, ML, MW, sc_debug, 'MAIN');

        //}



        // 4. เรียกวาด Arm (ถ้ามี)

       // if (isLDesk && typeof window.draw2DDebugRuler === 'function') {

        //    let armX = xDesk_debug;

            // คำนวณตำแหน่ง Arm สำหรับ L-Right

        //    if (side === 'right') {

         //       armX = xDesk_debug + ((ML - AL) * sc_debug);

         //   }

         //   window.draw2DDebugRuler(ctx, armX, yDesk_debug, AL, AW, sc_debug, 'ARM');

        //}

    }


    try { DPB_applyWatermarkAutoColor(); } catch (_) { }
    try { DPB_drawBrandWatermark_OnTop(); } catch (_) { }
    try { dpb_drawStatusIndicatorDots(); } catch (_) { }
}


function drawOptions(box, bgColor, sc) {
    const cIn = getInColor();
    const toPx = v => v * sc;
    const TH_PX = 5 * sc;
    const RED = '#ff2d2d';
    const typeNow = (byId('dpb-type')?.value || '').toLowerCase();
    const aside = (byId('dpb-aside')?.value || 'right').toLowerCase();
    const IS_LDESK = (typeNow === 'l2' || typeNow === 'l3');
    const DBG = !!window.DPB_DEBUG;

    window.state = window.state || {};
    window.state.hitRegions = [];

    const buckets = { main: [], arm: [] };
    let rectMain = box;
    let rectArm = null;

    if (IS_LDESK) {
        const lStruct = ensureL3Rects({ box }, sc);
        rectMain = lStruct.rect1 || state.boxes?.main || box;
        rectArm = lStruct.rect2 || state.boxes?.arm || null;
        if (!rectArm) {
            const def = getTypeDefaults(typeNow);
            const AL = Number(byId('dpb-al')?.value || def.al || 60) * sc;
            const AW = Number(byId('dpb-aw')?.value || def.aw || 120) * sc;
            const L = Number(byId('dpb-ml')?.value || def.ml || 180) * sc;
            rectArm = (aside === 'right') ? { x: rectMain.x + L - AL, y: rectMain.y, w: AL, h: AW } : { x: rectMain.x, y: rectMain.y, w: AL, h: AW };
        }
    } else {
        rectMain = state.boxes?.main || box;
    }

    let shadowCtx = null;
    try {
        const shadowCv = document.createElement('canvas');
        shadowCv.width = ctx.canvas.width;
        shadowCv.height = ctx.canvas.height;
        shadowCtx = shadowCv.getContext('2d', { willReadFrequently: true });
        if (typeof window.drawLegsForScan === 'function') {
            window.drawLegsForScan(shadowCtx, sc, rectMain, rectArm);
        }
    } catch (e) {
        console.warn('Shadow Canvas Error', e);
    }

    function pathHole(d) {
        ctx.beginPath();
        if (d.isCircle) {
            const r = d.rw / 2;
            ctx.arc(d.leftX + r, d.topY + r, r, 0, Math.PI * 2);
        } else {
            ctx.rect(d.leftX, d.topY, d.rw, d.rh);
        }
    }

    function drawArrowTip(x, y, angle, color) {
        const size = 6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size / 1.8);
        ctx.lineTo(-size, size / 1.8);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    function drawPlainLineH(x1, x2, y, c) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.4;
        ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        ctx.restore();
    }

    function isOptActive(recKey, recIndex, field) {
        const f = window._dpbOptFocus;
        if (!f) return false;
        if (f.key !== recKey || f.index !== recIndex) return false;
        if (field && f.field !== field) return false;
        return true;
    }

    function applyOptFill(recKey, recIndex, field) {
        const active = isOptActive(recKey, recIndex, field);
        const pulse = active ? (window._dpbDimPulse ?? 1) : 1;
        ctx.fillStyle = active ? '#ff2020' : cIn;
        ctx.globalAlpha = active ? (0.5 + 0.5 * pulse) : 1;
        ctx.shadowColor = active ? '#ff0000' : 'transparent';
        ctx.shadowBlur = active ? (10 * (1 - pulse)) : 0;
    }

    function resetCtxFx() {
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }

    function drawDimLineH(x1, x2, y, c, recKey, recIndex) {
        const active = isOptActive(recKey, recIndex, 'offsetX');
        const pulse = active ? (window._dpbDimPulse ?? 1) : 1;
        ctx.save();
        ctx.strokeStyle = active ? '#e7b93b' : c;
        ctx.lineWidth = active ? (1.4 + 2 * (1 - pulse)) : 1.4;
        ctx.globalAlpha = active ? (0.5 + 0.5 * pulse) : 1;
        ctx.shadowColor = active ? '#e7b93b' : 'transparent';
        ctx.shadowBlur = active ? (16 * (1 - pulse)) : 0;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y - 4); ctx.lineTo(x2, y + 4); ctx.stroke();
        ctx.restore();
    }

    function drawDimLineV(y1, y2, x, c, recKey, recIndex) {
        const active = isOptActive(recKey, recIndex, 'offsetY');
        const pulse = active ? (window._dpbDimPulse ?? 1) : 1;
        ctx.save();
        ctx.strokeStyle = active ? '#e7b93b' : c;
        ctx.lineWidth = active ? (1.4 + 2 * (1 - pulse)) : 1.4;
        ctx.globalAlpha = active ? (0.5 + 0.5 * pulse) : 1;
        ctx.shadowColor = active ? '#e7b93b' : 'transparent';
        ctx.shadowBlur = active ? (16 * (1 - pulse)) : 0;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 4, y1); ctx.lineTo(x + 4, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 4, y2); ctx.lineTo(x + 4, y2); ctx.stroke();
        ctx.restore();
    }

    function drawArrowH(x1, x2, y, color, recKey, recIndex) {
        if (x2 < x1) { const t = x1; x1 = x2; x2 = t; }
        const active = isOptActive(recKey, recIndex, 'offsetX');
        const pulse = active ? (window._dpbDimPulse ?? 1) : 1;
        const drawC = active ? '#e7b93b' : color;
        ctx.save();
        ctx.strokeStyle = drawC;
        ctx.lineWidth = active ? (1.4 + 2 * (1 - pulse)) : 1.4;
        ctx.globalAlpha = active ? (0.5 + 0.5 * pulse) : 1;
        ctx.shadowColor = active ? '#e7b93b' : 'transparent';
        ctx.shadowBlur = active ? (16 * (1 - pulse)) : 0;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        drawArrowTip(x1, y, Math.PI, drawC);
        drawArrowTip(x2, y, 0, drawC);
        ctx.restore();
    }

    function drawArrowV(y1, y2, x, color, recKey, recIndex) {
        if (y2 < y1) { const t = y1; y1 = y2; y2 = t; }
        const active = isOptActive(recKey, recIndex, 'offsetY');
        const pulse = active ? (window._dpbDimPulse ?? 1) : 1;
        const drawC = active ? '#e7b93b' : color;
        ctx.save();
        ctx.strokeStyle = drawC;
        ctx.lineWidth = active ? (1.4 + 2 * (1 - pulse)) : 1.4;
        ctx.globalAlpha = active ? (0.5 + 0.5 * pulse) : 1;
        ctx.shadowColor = active ? '#e7b93b' : 'transparent';
        ctx.shadowBlur = active ? (16 * (1 - pulse)) : 0;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        drawArrowTip(x, y1, -Math.PI / 2, drawC);
        drawArrowTip(x, y2, Math.PI / 2, drawC);
        ctx.restore();
    }

    Object.keys(state.selectedOptions).forEach(key => {
        const sel = state.selectedOptions[key]; if (!sel || !sel.count) return;
        const arr = state.optConfig[key] || [];
        for (let i = 0; i < sel.count; i++) {
            const cfg = arr[i]; if (!cfg) continue;
            const op = (state.meta.options || []).find(o => o.key === key) || { type: 'hole_rect' };
            if (String(op.type || '').toLowerCase() === 'attach') continue;

            let finalImgUrl = op.imageUrl;
            if (op.variants && typeof cfg.variantIndex !== 'undefined') {
                const v = op.variants[cfg.variantIndex];
                if (v && v.imageUrl) {
                    finalImgUrl = v.imageUrl;
                }
            }
            if (finalImgUrl && typeof finalImgUrl === 'string' && finalImgUrl.includes(',')) {
                finalImgUrl = finalImgUrl.split(',')[0].trim();
            }

            const posMode = (cfg.pos || 'main').toLowerCase();
            const placeRaw = String(cfg.place || '').toLowerCase();
            const isCircle = (op.type === 'hole_circle');
            const isRotated = !!cfg.rotate && !isCircle;

            let boxUse = rectMain;
            if (IS_LDESK) {
                if (isRotated || (isCircle && !!cfg.rotate)) {
                    const isArmSide = (aside === 'right' && ['right', 'ขวา', 'ด้านขวา'].includes(placeRaw)) ||
                        (aside === 'left' && ['left', 'ซ้าย', 'ด้านซ้าย'].includes(placeRaw));
                    if (isArmSide) boxUse = rectArm || rectMain;
                }
                if ((posMode === 'left' || posMode === 'right') && posMode === aside) {
                    boxUse = rectArm || rectMain;
                }
            }

            const { x, y, w, h } = boxUse;
            let rw = isRotated ? toPx(cfg.h) : toPx(cfg.w);
            let rh = isRotated ? toPx(cfg.w) : toPx(cfg.h);
            if (isCircle) { rw = toPx(cfg.w); rh = toPx(cfg.w); }

            if (!(cfg.w > 0) || (!isCircle && !(cfg.h > 0))) continue;

            const fromRaw = String(cfg.from || '').toLowerCase();
            const isBottomFrom = ['bottom', 'ด้านล่าง', 'down', 'below'].includes(fromRaw);
            const isLRight_Corner = (IS_LDESK && aside === 'right' && isBottomFrom && ['right', 'ขวา'].includes(placeRaw) && posMode === 'main');
            const isLLeft_Corner = (IS_LDESK && aside === 'left' && isBottomFrom && ['left', 'ซ้าย'].includes(placeRaw) && posMode === 'main');
            const USE_ARM_BOTTOM = isLRight_Corner || isLLeft_Corner;

            let refBottomY;
            if (boxUse === rectArm) refBottomY = rectArm.y + rectArm.h;
            else if (USE_ARM_BOTTOM) refBottomY = rectArm ? (rectArm.y + rectArm.h) : (y + h);
            else refBottomY = rectMain.y + rectMain.h;

            let topY, leftX;
            if (['top', 'บน'].includes(fromRaw)) topY = y + toPx(cfg.offsetY || 0);
            else if (['center', 'ตรงกลาง'].includes(fromRaw)) topY = y + (h - rh) / 2;
            else topY = refBottomY - toPx(cfg.offsetY || 0) - rh;

            if (['left', 'ซ้าย', 'ด้านซ้าย'].includes(placeRaw)) leftX = x + toPx(cfg.offsetX || 0);
            else if (['right', 'ขวา', 'ด้านขวา'].includes(placeRaw)) leftX = x + w - toPx(cfg.offsetX || 0) - rw;
            else leftX = x + (w - rw) / 2;

            const bk = (IS_LDESK && boxUse === rectArm) ? 'arm' : 'main';
            const drawPayload = { leftX, topY, rw, rh, isCircle, isRotated, USE_ARM_BOTTOM, refBottomY, boxUsed: boxUse, cfgSnapshot: { ...cfg }, fromRaw, placeRaw, posMode, imgUrl: finalImgUrl };

            if (isCircle) buckets[bk].push({ key, index: i, cfg, op, box: boxUse, shape: 'circle', cx: leftX + rw / 2, cy: topY + rh / 2, r: rw / 2, draw: drawPayload, imgUrl: finalImgUrl });
            else buckets[bk].push({ key, index: i, cfg, op, box: boxUse, shape: 'rect', x: leftX, y: topY, w: rw, h: rh, draw: drawPayload, imgUrl: finalImgUrl });
        }
    });

    const violIdx = { main: new Set(), arm: new Set() };
    ['main', 'arm'].forEach(bk => {
        const arr = buckets[bk];
        const sortedArr = [...arr].sort((a, b) => a.draw.leftX - b.draw.leftX);

        function _minGapPx(a, b) {
            const A = a.draw, B = b.draw;
            const xA1 = A.leftX, xA2 = A.leftX + A.rw;
            const xB1 = B.leftX, xB2 = B.leftX + B.rw;
            const yA1 = A.topY, yA2 = A.topY + A.rh;
            const yB1 = B.topY, yB2 = B.topY + B.rh;
            const gapX = Math.max(xB1 - xA2, xA1 - xB2, 0);
            const gapY = Math.max(yB1 - yA2, yA1 - yB2, 0);
            if (gapX === 0 && gapY === 0) return 0;
            if (gapX === 0) return gapY;
            if (gapY === 0) return gapX;
            return Math.sqrt(gapX * gapX + gapY * gapY);
        }

        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                const gap = _minGapPx(arr[i], arr[j]);
                if (gap < TH_PX) {
                    violIdx[bk].add(i);
                    violIdx[bk].add(j);
                    [arr[i], arr[j]].forEach(rec => {
                        const card = document.querySelector(`.dpb-cart-item[data-key="${CSS.escape(rec.key)}"][data-index="${rec.index}"]`);
                        const inputEl = card ? (card.querySelector('input[name="offsetX"]') || card.querySelector('input[name="offsetY"]')) : null;
                        function getFullLabel(rec) {
                            const op = rec.op || {};
                            const cfg = rec.cfg || {};
                            const name = op.name || rec.key;
                            const variant = String(cfg.variant || '').trim();
                            const num = rec.index + 1;
                            return variant ? `${name} (${variant}) #${num}` : `${name} #${num}`;
                        }
                        const labelA = getFullLabel(arr[i]);
                        const labelB = getFullLabel(arr[j]);
                        const gapCm = (gap / sc).toFixed(1);
                        const msg = gap === 0
                            ? `${labelA} และ ${labelB} ทับซ้อนกัน - กรุณาขยับระยะห่าง`
                            : `${labelA} และ ${labelB} ใกล้กันเกินไป (${gapCm} cm) — แนะนำให้ห่างอย่างน้อย 5 cm`;
                        if (inputEl) setFieldError(inputEl, msg, false, msg);
                    });
                }
            }
        }

        arr.forEach((rec, i) => {
            if (!violIdx[bk].has(i)) {
                const card = document.querySelector(`.dpb-cart-item[data-key="${CSS.escape(rec.key)}"][data-index="${rec.index}"]`);
                const inputEl = card ? (card.querySelector('input[name="offsetX"]') || card.querySelector('input[name="offsetY"]')) : null;
                if (inputEl) setFieldError(inputEl, '', false);
            }
        });

        arr.forEach((rec, i) => {
            const d = rec.draw;
            ctx.save(); pathHole(d); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
            if (typeof paintRedLegsInsideHole === 'function') paintRedLegsInsideHole(rec);
            ctx.save(); pathHole(d); ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
            ctx.strokeStyle = violIdx[bk].has(i) ? RED : cIn;
            ctx.lineWidth = violIdx[bk].has(i) ? 2.5 : 2;
            ctx.stroke(); ctx.restore();
            window.state.hitRegions.push({ key: rec.key, index: rec.index, rect: { x: d.leftX, y: d.topY, w: d.rw, h: d.rh }, refBox: d.boxUsed, cfg: rec.cfg });

            if (shadowCtx) {
                const foundRedLeg = scanLegColors(shadowCtx, d.leftX, d.topY, d.rw, d.rh, d.isCircle);
                if (foundRedLeg) {
                    const inputId = `dpb-opt-val-${rec.key}-${rec.index}`;
                    let inputEl = document.getElementById(inputId);
                    if (!inputEl) {
                        const card = document.querySelector(`.dpb-cart-item[data-key="${CSS.escape(rec.key)}"][data-index="${rec.index}"]`);
                        if (card) inputEl = card.querySelector('input[name="offsetY"]');
                    }
                    if (inputEl) setFieldError(inputEl, 'กรุณาขยับ Option ให้ไม่อยู่บนขาโต๊ะ', false, 'กรุณาขยับ Option ให้ไม่อยู่บนขาโต๊ะ');
                }
            }
        });

        arr.forEach((rec) => {
            const d = rec.draw;
            const { leftX, topY, rw, rh, isCircle, isRotated, fromRaw, placeRaw, USE_ARM_BOTTOM, refBottomY, boxUsed } = d;
            const { cfg } = rec;

            const myRank = sortedArr.indexOf(rec);
            const totalItems = sortedArr.length;

            let prevItem = null, nextItem = null;
            for (let k = myRank - 1; k >= 0; k--) { if (sortedArr[k].draw.fromRaw === fromRaw) { prevItem = sortedArr[k]; break; } }
            for (let k = myRank + 1; k < totalItems; k++) { if (sortedArr[k].draw.fromRaw === fromRaw) { nextItem = sortedArr[k]; break; } }

           // --- [จุดแก้ไข 1] เพิ่มให้ระบบรับรู้ถึง Option ที่อยู่ "ตรงกลาง" เพื่อเตรียมการหลบเส้น ---
            const isSameColAlign = (p) => ['right', 'ขวา', 'ด้านขวา', 'left', 'ซ้าย', 'ด้านซ้าย', 'center', 'ตรงกลาง'].includes(p);

            let neighborAbove = arr.find(o => o !== rec && isSameColAlign(o.draw.placeRaw) && o.draw.placeRaw === placeRaw && o.draw.topY < topY);
            if (!neighborAbove && bk === 'arm' && buckets['main']) {
                neighborAbove = buckets['main'].find(o => isSameColAlign(o.draw.placeRaw) && o.draw.placeRaw === placeRaw && o.draw.topY < topY);
            }
            const neighborBelow = arr.find(o => o !== rec && isSameColAlign(o.draw.placeRaw) && o.draw.placeRaw === placeRaw && o.draw.topY > topY);
            // ---------------------------------------------------------------------------------
			const hasNeighborAbove = !!neighborAbove;
            const hasNeighborBelow = !!neighborBelow;
            const isSandwiched = hasNeighborAbove && hasNeighborBelow;

            const isRightSide = ['right', 'ขวา', 'ด้านขวา'].includes(placeRaw);
            const isLeftSide = ['left', 'ซ้าย', 'ด้านซ้าย'].includes(placeRaw);
            const isTopFrom = ['top', 'บน'].includes(fromRaw);
            const isCenterFrom = ['center', 'ตรงกลาง'].includes(fromRaw);

            let measureYDir = 'bottom';
            if (isTopFrom) {
                measureYDir = 'top';
            } else if (isCenterFrom) {
                if (isSandwiched) {
                    if (isRightSide) {
                        const leftX_Above = neighborAbove.draw.leftX;
                        const leftX_Below = neighborBelow.draw.leftX;
                        if (leftX_Below >= leftX_Above) measureYDir = 'bottom';
                        else measureYDir = 'top';
                    } else if (isLeftSide) {
                        const rightEdge_Above = neighborAbove.draw.leftX + neighborAbove.draw.rw;
                        const rightEdge_Below = neighborBelow.draw.leftX + neighborBelow.draw.rw;
                        if (rightEdge_Below <= rightEdge_Above) measureYDir = 'bottom';
                        else measureYDir = 'top';
                    } else {
                        measureYDir = 'bottom';
                    }
                } else if (hasNeighborBelow && !hasNeighborAbove) {
                    measureYDir = 'top';
                } else {
                    measureYDir = 'bottom';
                }
            } else {
                measureYDir = 'bottom';
            }

            let measureDir = 'auto';
            let targetLineY = topY + rh / 2;
            let showLeaderLine = false;
            let isDodging = false;

            const distToLeftEdge = leftX - boxUsed.x;
            const distToRightEdge = (boxUsed.x + boxUsed.w) - (leftX + rw);

            let maxBottomLeft = -Infinity;
            for (let k = 0; k < myRank; k++) {
                const nb = sortedArr[k];
                const nbBottom = Math.max(nb.draw.topY + nb.draw.rh, (nb.draw.targetLineY || 0));
                if (isTopFrom && ['top', 'บน'].includes(nb.draw.fromRaw)) maxBottomLeft = Math.max(maxBottomLeft, nbBottom);
                else if (!isTopFrom) maxBottomLeft = Math.max(maxBottomLeft, nbBottom);
            }

            let maxBottomRight = -Infinity;
            for (let k = myRank + 1; k < totalItems; k++) {
                const nb = sortedArr[k];
                const nbBottom = Math.max(nb.draw.topY + nb.draw.rh, (nb.draw.targetLineY || 0));
                if (isTopFrom && ['top', 'บน'].includes(nb.draw.fromRaw)) maxBottomRight = Math.max(maxBottomRight, nbBottom);
                else if (!isTopFrom) maxBottomRight = Math.max(maxBottomRight, nbBottom);
            }

            const baseLineY = topY + rh / 2;
            const costLeft = (maxBottomLeft === -Infinity) ? baseLineY : maxBottomLeft + TH_PX;
            const costRight = (maxBottomRight === -Infinity) ? baseLineY : maxBottomRight + TH_PX;

            const isUserRight = ['right', 'ขวา', 'ด้านขวา'].includes(placeRaw);
            const isUserLeft = ['left', 'ซ้าย', 'ด้านซ้าย'].includes(placeRaw);

            if (isUserRight) {
                measureDir = 'right';
            } else if (isUserLeft) {
                measureDir = 'left';
            // --- [จุดแก้ไข 2] บังคับให้การจัดวางตรงกลาง เส้นโยงบอกระยะชี้ไปทางซ้ายเสมอ ---
            } else if (['center', 'ตรงกลาง'].includes(placeRaw)) {
                measureDir = 'left';
            } else {
            // ------------------------------------------------------------------
                measureDir = (distToRightEdge < distToLeftEdge) ? 'right' : 'left';
            }

            if (measureDir === 'right' && !isUserRight) {
                const rightCrowd = sortedArr.slice(myRank + 1).find(it => {
                    const targetBot = it.draw.topY + it.draw.rh;
                    const targetTop = it.draw.topY;
                    return ['right', 'ขวา', 'ด้านขวา'].includes(it.draw.placeRaw) &&
                        (baseLineY < targetBot + toPx(5) && baseLineY > targetTop - toPx(5));
                });
                if (rightCrowd) measureDir = 'left';
            }

            const allowDodgeLeft = ['center', 'ตรงกลาง', 'left', 'ซ้าย', 'ด้านซ้าย'].includes(placeRaw);
            const allowDodgeRight = ['center', 'ตรงกลาง', 'right', 'ขวา', 'ด้านขวา'].includes(placeRaw);

            if (measureDir === 'left') {
                if (myRank === 0) {
                    targetLineY = baseLineY;
                    showLeaderLine = false;
                    isDodging = false;
                } else if (costLeft > baseLineY && ['center', 'ตรงกลาง', 'left', 'ซ้าย'].includes(placeRaw)) {
                    targetLineY = costLeft + toPx(5);
                    showLeaderLine = true;
                    isDodging = true;
                }
            } else if (measureDir === 'right') {
                if (myRank === totalItems - 1) {
                    targetLineY = baseLineY;
                    showLeaderLine = false;
                    isDodging = false;
                } else if (costRight > baseLineY && ['center', 'ตรงกลาง', 'right', 'ขวา'].includes(placeRaw)) {
                    targetLineY = costRight + toPx(5);
                    showLeaderLine = true;
                    isDodging = true;
                }
            }

            if (IS_LDESK && boxUsed === rectArm) {
                if (aside === 'right') measureDir = 'right';
                else if (aside === 'left') measureDir = 'left';
            }

            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.setLineDash([]);

            let wyLineY;
            if (measureYDir === 'bottom') wyLineY = topY - 6;
            else wyLineY = topY + rh + 6;

            let sizeLineSide = (measureDir === 'left') ? 'right' : 'left';
            if (isRightSide) sizeLineSide = 'left';

            if (isCircle) {
                const wyTextY = (measureYDir === 'bottom') ? (wyLineY - 8) : (wyLineY + 16);
                drawDimLineH(leftX, leftX + rw, wyLineY, cIn);
                ctx.fillStyle = cIn;
                ctx.font = '400 13px Prompt,sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
                ctx.fillText(`${cfg.w} cm`, leftX + rw / 2, wyTextY);

            } else if (isRotated) {
                let wxLineX, wxAlign;
                if (sizeLineSide === 'right') { wxLineX = leftX + rw + 6; wxAlign = 'left'; }
                else { wxLineX = leftX - 6; wxAlign = 'right'; }

                drawDimLineV(topY, topY + rh, wxLineX, cIn);
                ctx.save();
                ctx.translate(wxLineX, topY + rh / 2);
                ctx.rotate(wxAlign === 'right' ? -Math.PI / 2 : Math.PI / 2);
                ctx.fillStyle = cIn;
                ctx.font = '400 13px Prompt,sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${cfg.w} cm`, 0, -10);
                ctx.restore();

                const finalHyTextY = (measureYDir === 'bottom') ? (wyLineY - 8) : (wyLineY + 16);
                drawDimLineH(leftX, leftX + rw, wyLineY, cIn);
                ctx.fillStyle = cIn;
                ctx.font = '400 13px Prompt,sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
                ctx.fillText(`${cfg.h} cm`, leftX + rw / 2, finalHyTextY);

            } else {
                const wyTextY = (measureYDir === 'bottom') ? (wyLineY - 8) : (wyLineY + 16);
                drawDimLineH(leftX, leftX + rw, wyLineY, cIn);
                ctx.fillStyle = cIn;
                ctx.font = '400 13px Prompt,sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
                ctx.fillText(`${cfg.w} cm`, leftX + rw / 2, wyTextY);

                let hxLineX, hxAlign;
                if (sizeLineSide === 'right') { hxLineX = leftX + rw + 6; hxAlign = 'left'; }
                else { hxLineX = leftX - 6; hxAlign = 'right'; }

                drawDimLineV(topY, topY + rh, hxLineX, cIn);
                ctx.save();
                ctx.translate(hxLineX, topY + rh / 2);
                ctx.rotate(hxAlign === 'right' ? -Math.PI / 2 : Math.PI / 2);
                ctx.fillStyle = cIn;
                ctx.font = '400 13px Prompt,sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${cfg.h} cm`, 0, -10);
                ctx.restore();
            }

            function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
            let valY = num(cfg.offsetY);
            let valX = num(cfg.offsetX);

            // --- [เริ่มการแก้ไข] ดึงค่า Width/Height จริงจาก Input แทน Canvas สเกล ---
            let realW_cm = boxUsed.w / sc;
            let realH_cm = boxUsed.h / sc;

            try {
                if (bk === 'main') {
                    const ml = document.getElementById('dpb-ml')?.value;
                    const mw = document.getElementById('dpb-mw')?.value;
                    if (ml && Number(ml) > 0) realW_cm = Number(ml);
                    if (mw && Number(mw) > 0) realH_cm = Number(mw);
                } else if (bk === 'arm') {
                    const al = document.getElementById('dpb-al')?.value;
                    const aw = document.getElementById('dpb-aw')?.value;
                    if (al && Number(al) > 0) realW_cm = Number(al);
                    if (aw && Number(aw) > 0) realH_cm = Number(aw);
                }
            } catch(e) {}

            // คำนวณแกน Y (ความลึก) กรณีจัดกึ่งกลาง
            if (isCenterFrom || ['center', 'ตรงกลาง'].includes(fromRaw)) {
                const centerCm = (realH_cm - (rh / sc)) / 2;
                valY = Math.round(centerCm * 10) / 10;
            }

            // คำนวณแกน X (ความยาว) กรณีจัดกึ่งกลาง
            if (['center', 'ตรงกลาง'].includes(placeRaw)) {
                const centerCm = (realW_cm - (rw / sc)) / 2;
                valX = Math.round(centerCm * 10) / 10;
            }
            // --- [จบการแก้ไข] ---

            if (valY != null && !cfg.hideDim) {
                const arrowX = leftX + rw / 2;
                const spaceLeft = arrowX - boxUsed.x;
                const spaceRight = (boxUsed.x + boxUsed.w) - arrowX;
                const textOnRight = spaceLeft < spaceRight;

                const drawYText = (txt, yPos) => {
                    ctx.save();
                    applyOptFill(rec.key, rec.index, 'offsetY');
                    ctx.font = '400 13px Prompt,sans-serif';
                    ctx.textAlign = textOnRight ? 'left' : 'right';
                    ctx.textBaseline = 'middle';
                    const xOffset = textOnRight ? 12 : -12;
                    ctx.fillText(txt, arrowX + xOffset, yPos);
                    ctx.restore();
                };

                if (isCenterFrom && isSandwiched && isLeftSide) {
                    const isDown = (measureYDir === 'bottom');
                    const neighborRef = isDown ? neighborBelow : neighborAbove;
                    const obstacleRightX = neighborRef.draw.leftX + neighborRef.draw.rw;
                    const detourX = obstacleRightX + toPx(10);
                    const yOrigin = isDown ? (topY + rh) : topY;
                    const yDest = isDown ? refBottomY : boxUsed.y;
                    ctx.save(); ctx.setLineDash([4, 3]);
                    drawPlainLineH(leftX + rw / 2, detourX, yOrigin, cIn);
                    ctx.restore();
                    drawArrowV(yOrigin, yDest, detourX, cIn, rec.key, rec.index);
                    ctx.save();
                    const textY = yOrigin + (yDest - yOrigin) / 2;
                    ctx.translate(detourX, textY);
                    ctx.rotate(Math.PI / 2);
                    applyOptFill(rec.key, rec.index, 'offsetY');
                    ctx.font = '400 13px Prompt,sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(`${valY} cm`, 0, -14);
                    ctx.restore();

                } else if (isCenterFrom && isSandwiched && isRightSide) {
                    let obstacleLeftX, yOrigin, yDest;
                    if (measureYDir === 'bottom') {
                        obstacleLeftX = neighborBelow.draw.leftX;
                        yOrigin = topY + rh; yDest = refBottomY;
                    } else {
                        obstacleLeftX = neighborAbove.draw.leftX;
                        yOrigin = topY; yDest = boxUsed.y;
                    }
                    const detourX = obstacleLeftX - toPx(10);
                    ctx.save(); ctx.setLineDash([4, 3]);
                    drawPlainLineH(leftX + rw / 2, detourX, yOrigin, cIn);
                    ctx.restore();
                    if (measureYDir === 'bottom') drawArrowV(yOrigin, yDest, detourX, cIn, rec.key, rec.index);
                    else drawArrowV(yDest, yOrigin, detourX, cIn, rec.key, rec.index);
                    ctx.save();
                    const textY = measureYDir === 'bottom' ? (yOrigin + (yDest - yOrigin) / 2) : (yDest + (yOrigin - yDest) / 2);
                    ctx.translate(detourX, textY);
                    ctx.rotate(-Math.PI / 2);
                    applyOptFill(rec.key, rec.index, 'offsetY');
                    ctx.font = '400 13px Prompt,sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(`${valY} cm`, 0, -14);
                    ctx.restore();

                } else if (isRightSide && hasNeighborBelow && !isCenterFrom && measureYDir === 'bottom') {
                    const safeBuffer = toPx(12);
                    const detourX = leftX - safeBuffer;
                    let yOrigin = topY + rh;
                    let yDest = refBottomY;
                    let yDetourText = yOrigin + (yDest - yOrigin) / 2;
                    ctx.save(); ctx.setLineDash([4, 3]);
                    drawPlainLineH(leftX + rw / 2, detourX, yOrigin, cIn);
                    ctx.restore();
                    drawArrowV(yOrigin, yDest, detourX, cIn, rec.key, rec.index);
                    ctx.save();
                    ctx.translate(detourX, yDetourText);
                    ctx.rotate(isRightSide ? -Math.PI / 2 : Math.PI / 2);
                    applyOptFill(rec.key, rec.index, 'offsetY');
                    ctx.font = '400 13px Prompt,sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(`${valY} cm`, 0, -14);
                    ctx.restore();

                } else if (measureYDir === 'top') {
                    const yObjTop = topY;
                    const yBoxTop = boxUsed.y;
                    if (hasNeighborAbove && !isCenterFrom) {
                        
                        // --- ส่วนที่แก้ไข Logic การหลบ Option ---
                        const safeBuffer = toPx(4); // ระยะห่าง 3cm
                        let detourX;
                        
                        if (isRightSide) {
                            // ถ้าจัดชิดขวา: ให้โยงหลบไปทางซ้าย 
                            detourX = neighborAbove.draw.leftX - 6 - safeBuffer;
                        } else if (isLeftSide) {
                            // ถ้าจัดชิดซ้าย: ให้โยงหลบไปทางขวา 
                            detourX = neighborAbove.draw.leftX + neighborAbove.draw.rw + 6 + safeBuffer;
                        } else {
                            // ถ้าจัดตรงกลาง: ให้โยงหลบอ้อมไปทางขวา (ตามที่คุณต้องการ)
                            detourX = neighborAbove.draw.leftX + neighborAbove.draw.rw + 6 + safeBuffer;
                        }
                        // ------------------------------------

                        ctx.save(); ctx.setLineDash([4, 3]);
                        drawPlainLineH(leftX + rw / 2, detourX, yObjTop, cIn); 
                        ctx.restore();
                        drawArrowV(yBoxTop, yObjTop, detourX, cIn, rec.key, rec.index); 
                        ctx.save();
                        const textY = yBoxTop + (yObjTop - yBoxTop) / 2;
                        ctx.translate(detourX, textY);
                        ctx.rotate(isRightSide ? -Math.PI / 2 : Math.PI / 2);
                        applyOptFill(rec.key, rec.index, 'offsetY');
                        ctx.font = '400 13px Prompt,sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(`${valY} cm`, 0, -14);
                        ctx.restore();
                    } else {
                        drawArrowV(yBoxTop, yObjTop, arrowX, cIn, rec.key, rec.index);
                        const textY = yBoxTop + (yObjTop - yBoxTop) / 2;
                        drawYText(`${valY} cm`, textY);
                    }
                } else {
                    const yObjBottom = topY + rh;
                    const yRefBottom = refBottomY;
                    drawArrowV(yObjBottom, yRefBottom, arrowX, cIn, rec.key, rec.index);
                    const textY = yObjBottom + (yRefBottom - yObjBottom) / 2;
                    drawYText(`${valY} cm`, textY);
                }
            }

            if (valX != null && !cfg.hideDim) {
                const isSmall = (valX < 6);
                const baseLineY = topY + rh / 2;
                const yForXLine = isRotated ? baseLineY : targetLineY;
                const spaceAbove = yForXLine - boxUsed.y;
                const textHeightApprox = 25;
                let textOnBottom = false;
                if (spaceAbove < textHeightApprox) textOnBottom = true;

                const getTextYOffset = (baseOffset) => {
                    if (textOnBottom) {
                        if (baseOffset === -8) return 18;
                        if (baseOffset === -14) return 14;
                        if (baseOffset === -28) return 28;
                        return 18;
                    }
                    return baseOffset;
                };

                if (showLeaderLine && yForXLine !== baseLineY) {
                    ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = cIn; ctx.lineWidth = 1.4; ctx.beginPath();
                    const holeSideX = (measureDir === 'right') ? (leftX + rw) : leftX;
                    const holeCenterY = topY + rh / 2;
                    ctx.moveTo(holeSideX, holeCenterY); ctx.lineTo(holeSideX, targetLineY); ctx.stroke(); ctx.restore();
                }

                const drawXLabel = (tx) => {
                    applyOptFill(rec.key, rec.index, 'offsetX');
                    ctx.font = '400 13px Prompt,sans-serif';
                    ctx.textAlign = 'center';
                    if (isDodging && !isRotated) {
                        ctx.textBaseline = 'top';
                        if (isSmall) { ctx.fillText(`${valX}`, tx, yForXLine + 4); ctx.fillText(`cm`, tx, yForXLine + 16); }
                        else { ctx.fillText(`${valX} cm`, tx, yForXLine + 4); }
                    } else {
                        if (isSmall) {
                            ctx.textBaseline = 'middle';
                            ctx.fillText(`${valX}`, tx, yForXLine + getTextYOffset(-28));
                            ctx.fillText(`cm`, tx, yForXLine + getTextYOffset(-14));
                        } else {
                            ctx.textBaseline = textOnBottom ? 'top' : 'alphabetic';
                            ctx.fillText(`${valX} cm`, tx, yForXLine + getTextYOffset(-8));
                        }
                    }
                    resetCtxFx();
                };

                if (measureDir === 'left') {
                    const xA = boxUsed.x; const xB = leftX;
                    drawArrowH(xA, xB, yForXLine, cIn, rec.key, rec.index);
                    drawXLabel(xA + (xB - xA) / 2);
                } else if (measureDir === 'right') {
                    const xA = leftX + rw; const xB = boxUsed.x + boxUsed.w;
                    drawArrowH(xA, xB, yForXLine, cIn, rec.key, rec.index);
                    drawXLabel(xA + (xB - xA) / 2);
                } else {
                    const xA = boxUsed.x, xB = leftX;
                    drawArrowH(xA, xB, yForXLine, cIn, rec.key, rec.index);
                    drawXLabel(xA + (xB - xA) / 2);
                }
            }

            rec.draw.targetLineY = targetLineY;
            ctx.restore();
        });

        arr.forEach((rec, i) => {
            const d = rec.draw;
            ctx.save(); pathHole(d); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
            if (typeof paintRedLegsInsideHole === 'function') paintRedLegsInsideHole(rec);
            ctx.save(); pathHole(d); ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
            ctx.strokeStyle = violIdx[bk].has(i) ? RED : cIn;
            ctx.lineWidth = violIdx[bk].has(i) ? 2.5 : 2;
            ctx.stroke(); ctx.restore();
        });
    });
}


function scanLegColors(ctx, x, y, w, h, isCircle) {
    if (!ctx || w <= 0 || h <= 0) return false;
    const imgData = ctx.getImageData(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 50) continue;
        if (isCircle) {
            const px = (i / 4) % w;
            const py = Math.floor((i / 4) / w);
            const cx = w / 2;
            const cy = h / 2;
            if (Math.pow(px - cx, 2) + Math.pow(py - cy, 2) > Math.pow(w / 2, 2)) {
                continue;
            }
        }
        if ((r === 254 && g === 50 && b === 50) || 
			(r === 255 && g === 51 && b === 51) || 
            (r === 210 && g === 6 && b === 6) || 
            (r === 204 && g === 0 && b === 0)) {
            return true;
        }
    }
    return false;
}
window.draw2DDebugRuler = function(ctx, startX, startY, logicW, logicH, sc, label) {
    ctx.save();
    
    // Config สี
    const color = (label === 'MAIN') ? '#00FF00' : '#FF0000'; 
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, logicW * sc, logicH * sc);

    // Label
    ctx.fillStyle = color;
    ctx.font = "bold 14px Arial";
    ctx.fillText(label, startX + 5, startY + 15);

    // ฟังก์ชันย่อยวาดขีด
    const drawTick = (val, maxVal, isVertical, offsetPx, edgeType) => {
        const isTen = (val % 10 === 0);
        const isCenter = (Math.abs(val - maxVal / 2) < 0.1);
        const len = isCenter ? 15 : (isTen ? 10 : 5);
        const posPx = val * sc;
        
        ctx.beginPath();
        let txtX, txtY, align, baseline;

        if (!isVertical) { // แนวนอน
            const px = startX + posPx;
            const py = startY + offsetPx;
            const dir = (edgeType === 'top') ? -1 : 1;
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + (len * dir));
            txtX = px; txtY = py + ((len + 3) * dir);
            align = "center"; baseline = (edgeType === 'top') ? "bottom" : "top";
        } else { // แนวตั้ง
            const px = startX + offsetPx;
            const py = startY + posPx;
            const dir = (edgeType === 'left') ? -1 : 1;
            ctx.moveTo(px, py);
            ctx.lineTo(px + (len * dir), py);
            txtX = px + ((len + 3) * dir); txtY = py;
            align = (edgeType === 'left') ? "right" : "left"; baseline = "middle";
        }

        if (isCenter) { ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = 2; }
        else if (isTen) { ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1; }
        else { ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5; }
        ctx.stroke();

        if (isTen || isCenter) {
            ctx.fillStyle = isCenter ? '#D32F2F' : 'black';
            ctx.font = isCenter ? "bold 12px Arial" : "10px Arial";
            ctx.textAlign = align; ctx.textBaseline = baseline;
            ctx.fillText(isCenter ? "CNTR" : Math.round(val), txtX, txtY);
        }
    };

    // วาดขีดรอบด้าน
    for (let i = 0; i <= logicW; i += 2) {
        drawTick(i, logicW, false, 0, 'top');
        drawTick(i, logicW, false, logicH * sc, 'bottom');
    }
    for (let j = 0; j <= logicH; j += 2) {
        drawTick(j, logicH, true, 0, 'left');
        drawTick(j, logicH, true, logicW * sc, 'right');
    }
    ctx.restore();
};



window.drawLegsForScan = function(ctx, sc, rectMain, rectArm) {
    if (!ctx) return;
    const byId = (id) => document.getElementById(id);
    const type = (byId('dpb-type')?.value || '').trim().toLowerCase();
    
    const loadImg = (url) => {
        if (!url) return null;
        if (window.__desk_img_cache && window.__desk_img_cache[url]) return window.__desk_img_cache[url];
        return null;
    };

    ctx.save();
    
    try {
        if (type === 'custom') {
            const Lcm = +byId('dpb-ml').value || 0;
            const Wcm = +byId('dpb-mw').value || 0;
            const A = getLegAssetsBySelection();
            const imgL = loadImg(A.left);
            const imgC = loadImg(A.center);
            const imgR = loadImg(A.right);
            
            if (imgL && imgC && imgR) {
                const layout = computeLegLayoutRectDesk({ x: rectMain.x, y: rectMain.y, w: rectMain.w, h: rectMain.h, sc, Lcm, Wcm });
                ctx.drawImage(imgR, layout.rightRect.x, layout.rightRect.y, layout.rightRect.w, layout.rightRect.h);
                ctx.save();
                const cropW = Math.max(0, layout.crop.rightX - layout.crop.leftX);
                if(cropW > 0){
                    ctx.beginPath(); ctx.rect(layout.crop.leftX, rectMain.y, cropW, rectMain.h); ctx.clip();
                    ctx.drawImage(imgC, layout.centerRect.x, layout.centerRect.y, layout.centerRect.w, layout.centerRect.h);
                }
                ctx.restore();
                ctx.drawImage(imgL, layout.leftRect.x, layout.leftRect.y, layout.leftRect.w, layout.leftRect.h);
            }
        } 
        else if (type === 'l3' && rectArm) {
            const sideSel = (byId('dpb-aside')?.value || 'right').toLowerCase();
            const layout = computeLegLayoutL3Rects_SMART({ rect1: rectMain, rect2: rectArm, sc, Lcm: +byId('dpb-ml').value, side: sideSel });
            
            if (layout) {
                const pack = getL3AssetsAndDims(sideSel);
                const A = pack.A;
                const drawPart = (key, rect) => {
                    if(!rect) return;
                    const url = A[key];
                    if(!url && key.includes('_v3')) return; 
                    const img = loadImg(url) || loadImg(A[key.replace('_v3','')]);
                    if(img) ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
                };

                if (sideSel === 'left') {
                    drawPart('right', layout.rightRect);
                    drawPart('bottomLeft', layout.bottomLeft);
                    drawPart('topLeft', layout.topLeft); 
                    drawPart('topCenter', layout.topCenter); 
                    drawPart('centerLeft', layout.centerLeft);
                } else {
                    drawPart('left', layout.leftRect);
                    drawPart('bottomRight', layout.bottomRight);
                    drawPart('topRight', layout.topRight);
                    drawPart('topCenter', layout.topCenter);
                    drawPart('centerRight', layout.centerRight);
                }
            }
        }
        else if (type === 'l2' && rectArm) {
            const sideSel = (byId('dpb-aside')?.value || 'right').toLowerCase();
            const Lcm = +byId('dpb-ml').value || 0;
            const dims = LEG_DIMS_L2_CM;
            
            let layout = computeLegLayoutL2Rect1({ x: rectMain.x, y: rectMain.y, w: rectMain.w, h: rectMain.h, sc, Lcm, side: sideSel, dims });
            if (l2_needsV2(layout, rectArm, sideSel)) {
                layout = computeLegLayoutL2Rect1_V2({ x: rectMain.x, y: rectMain.y, w: rectMain.w, h: rectMain.h, sc, Lcm, side: sideSel, dims, rect2: rectArm, baseCrop: layout.crop });
            }

            const colorRaw = getLegColorFromSelection();
            const color = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
            const A_L2 = LEG_ASSETS_L2[color] || LEG_ASSETS_L2.white;
            const l2Assets = (sideSel === 'right') 
                ? { left:A_L2.left, right:A_L2.rightL, center:A_L2.center } 
                : { left:A_L2.leftL, right:A_L2.right, center:A_L2.center };

            const iL = loadImg(l2Assets.left);
            const iR = loadImg(l2Assets.right);
            const iC = loadImg(l2Assets.center);

            if(iC && layout.centerRect) ctx.drawImage(iC, layout.centerRect.x, layout.centerRect.y, layout.centerRect.w, layout.centerRect.h);
            if(iR && layout.rightRect)  ctx.drawImage(iR, layout.rightRect.x, layout.rightRect.y, layout.rightRect.w, layout.rightRect.h);
            if(iL && layout.leftRect)   ctx.drawImage(iL, layout.leftRect.x, layout.leftRect.y, layout.leftRect.w, layout.leftRect.h);
        }
        else if (type === 'custom_single') {
             const colorRaw = getLegColorFromSelection();
             const legColor = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
             const A = SINGLE_MOTOR_ASSETS[legColor] || SINGLE_MOTOR_ASSETS.white;
             const iR = loadImg(A.right); const iL = loadImg(A.left); const iC = loadImg(A.center);
             const gaps = (typeof window.dpb_getLegGaps === 'function') ? window.dpb_getLegGaps() : { A: 5, B: 5 };
             const dims = LEG_DIMS_SINGLE_MOTOR_CM;
             
             const gapLeft = Math.max(5, gaps.A); const gapRight = Math.max(5, gaps.B);
             const rW = dims.right.w*sc, lW = dims.left.w*sc, cW = dims.center.w*sc, cH = dims.center.h*sc;
             const lX = rectMain.x + gapLeft*sc; 
             const rX = rectMain.x + rectMain.w - gapRight*sc - rW;
             const cX = rectMain.x + (rectMain.w - cW)/2;
             const lY = rectMain.y + (rectMain.h - dims.left.h*sc)/2;
             const rY = rectMain.y + (rectMain.h - dims.right.h*sc)/2;
             const cY = rectMain.y + (rectMain.h - cH)/2;

             if(iC) ctx.drawImage(iC, cX, cY, cW, cH);
             if(iL) ctx.drawImage(iL, lX, lY, lW, dims.left.h*sc);
             if(iR) ctx.drawImage(iR, rX, rY, rW, dims.right.h*sc);
        }
        else if (type === 'custom_workspace') {
             const colorRaw = getLegColorFromSelection();
             const legColor = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
             const A = WORKSPACE_ASSETS[legColor] || WORKSPACE_ASSETS.white;
             const iR = loadImg(A.right); const iL = loadImg(A.left); const iC = loadImg(A.center);
             const gaps = (typeof window.dpb_getLegGaps === 'function') ? window.dpb_getLegGaps() : { A: 5, B: 5 };
             const dims = LEG_DIMS_WORKSPACE_CM;
             
             const gapLeft = Math.max(5, gaps.A); const gapRight = Math.max(5, gaps.B);
             const rW = dims.right.w*sc, lW = dims.left.w*sc, cW = dims.center.w*sc, cH = dims.center.h*sc;
             const lX = rectMain.x + gapLeft*sc; 
             const rX = rectMain.x + rectMain.w - gapRight*sc - rW;
             const cX = rectMain.x + (rectMain.w - cW)/2;
             const lY = rectMain.y + (rectMain.h - dims.left.h*sc)/2;
             const rY = rectMain.y + (rectMain.h - dims.right.h*sc)/2;
             const cY = rectMain.y + (rectMain.h - cH)/2;

             if(iC) ctx.drawImage(iC, cX, cY, cW, cH);
             if(iL) ctx.drawImage(iL, lX, lY, lW, dims.left.h*sc);
             if(iR) ctx.drawImage(iR, rX, rY, rW, dims.right.h*sc);
        }
        else if (type === 'custom_manual') {
             const colorRaw = getLegColorFromSelection();
             const legColor = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
             const A = MANUAL_DESK_ASSETS[legColor] || MANUAL_DESK_ASSETS.white;
             const iR = loadImg(A.right); const iL = loadImg(A.left); const iC = loadImg(A.center);
             const gaps = (typeof window.dpb_getLegGaps === 'function') ? window.dpb_getLegGaps() : { A: 5, B: 5 };
             const dims = LEG_DIMS_MANUAL_CM;
             
             const gapLeft = Math.max(5, gaps.A); const gapRight = Math.max(5, gaps.B);
             const rW = dims.right.w*sc, rH = dims.right.h*sc;
             const lW = dims.left.w*sc, lH = dims.left.h*sc;
             const cW = dims.center.w*sc, cH = dims.center.h*sc;
             const leftX = rectMain.x + gapLeft*sc; 
             const rightX = rectMain.x + rectMain.w - gapRight*sc - rW;
             const centerX = rectMain.x + (rectMain.w - cW)/2;
             const leftY = rectMain.y + (rectMain.h - lH)/2;
             const rightY = rectMain.y + (rectMain.h - rH)/2;
             const centerY = rectMain.y + (rectMain.h - cH)/2;

             if(iC) ctx.drawImage(iC, centerX, centerY, cW, cH);
             if(iL) ctx.drawImage(iL, leftX, leftY, lW, lH);
             if(iR) ctx.drawImage(iR, rightX, rightY, rW, rH);
        }
        else if (type === 'single') {
             const colorRaw = getLegColorFromSelection();
             const color = (colorRaw ? String(colorRaw).toLowerCase() : 'white');
             const A = SINGLE_LEG_ASSETS[color] || SINGLE_LEG_ASSETS.white;
             const imgLeg = loadImg(A.leg);
             if(imgLeg) {
                 const legWcm = pxToCm(imgLeg.naturalWidth);
                 const legHcm = pxToCm(imgLeg.naturalHeight);
                 const legW = cmToPx(legWcm, sc);
                 const legH = cmToPx(legHcm, sc);
                 const legX = rectMain.x + (rectMain.w - legW)/2;
                 const legY = rectMain.y + (rectMain.h - legH)/2;
                 ctx.drawImage(imgLeg, legX, legY, legW, legH);
             }
        }
    } catch(e) { 
        console.warn('Leg Scan Draw Error', e); 
    }

    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#fe3232';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
};



function ensureL3Rects(rec, sc){
  let rect1 = state?.boxes?.main || null;
  let rect2 = state?.boxes?.arm  || null;
  if (rect1 && rect2) return { rect1, rect2 };
  const t   = (byId('dpb-type')?.value || 'l3').toLowerCase();
  const def = (typeof getTypeDefaults === 'function') ? getTypeDefaults(t) : { mw:70, ml:180, aw:120, al:70, aside:'right' };
  const getNum = (id, key)=>{
    const v = Number(byId(id)?.value);
    if (Number.isFinite(v)) return v;
    return def?.[key];
  };
  const L    = getNum('dpb-ml','ml');   
  const W    = getNum('dpb-mw','mw');  
  const AL   = getNum('dpb-al','al'); 
  const AW   = getNum('dpb-aw','aw');  
  const side = (byId('dpb-aside')?.value || def.aside || 'right').toLowerCase();
  const px   = (cm)=> cm * sc;
  if (rect1 && !rect2){
    rect2 = (side === 'right')
      ? { x: rect1.x + px(L - AL), y: rect1.y, w: px(AL), h: px(AW) }
      : { x: rect1.x,              y: rect1.y, w: px(AL), h: px(AW) };
    return { rect1, rect2 };
  }
  if (!rect1 && rect2){
    rect1 = (side === 'right')
      ? { x: rect2.x - px(L - AL), y: rect2.y, w: px(L), h: px(W) }
      : { x: rect2.x,              y: rect2.y, w: px(L), h: px(W) };
    return { rect1, rect2 };
  }
  if (!rect1 && !rect2){
    if (!rec?.box) return { rect1:null, rect2:null };
    const b   = rec.box;
    const w1  = px(L),  h1 = px(W);  
    const w2  = px(AL), h2 = px(AW);  
    const area = (w,h)=> w*h;
    const dMain = Math.abs(area(b.w, b.h) - area(w1, h1));
    const dArm  = Math.abs(area(b.w, b.h) - area(w2, h2));
    if (dMain <= dArm){
      rect1 = { x:b.x, y:b.y, w:w1, h:h1 };
      rect2 = (side === 'right')
        ? { x: rect1.x + px(L - AL), y: rect1.y, w: px(AL), h: px(AW) }
        : { x: rect1.x,              y: rect1.y, w: px(AL), h: px(AW) };
    } else {
      rect2 = { x:b.x, y:b.y, w:w2, h:h2 };
      rect1 = (side === 'right')
        ? { x: rect2.x - px(L - AL), y: rect2.y, w: px(L), h: px(W) }
        : { x: rect2.x,              y: rect2.y, w: px(L), h: px(W) };
    }
    return { rect1, rect2 };
  }
  return { rect1, rect2 };
}

function DPB_resolveFn(name){
  try { const f = eval(name); if (typeof f === 'function') return f; } catch(_) {}
  const g = (typeof window !== 'undefined') ? window[name] : undefined;
  return (typeof g === 'function') ? g : null;
}

function paintRedLegsInsideHole(rec){
  const d = rec.draw || {};
  const holeL = d.leftX|0, holeT = d.topY|0, holeW = d.rw|0, holeH = d.rh|0;
  const typeNow = (byId('dpb-type')?.value || 'custom').trim().toLowerCase();
  const sc = deskScale();
  ctx.save();
  if (typeof makeHolePath === 'function') {
    makeHolePath(d);
  } else {
    ctx.beginPath();
    if (d.isCircle){
      const r = holeW/2, cx = holeL + r, cy = holeT + r;
      ctx.arc(cx, cy, r, 0, Math.PI*2);
    } else {
      ctx.rect(holeL, holeT, holeW, holeH);
    }
  }
  ctx.clip();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  try{
    if (state?.flags?.showLegs === false){
    }
    else if (typeNow === 'l2'){
   let mainRect = state?.boxes?.main || ensureL2MainRect(rec, sc);
if (!mainRect){ ctx.restore(); return; }
      const yCrop = mainRect.y;
      const hCrop = mainRect.h;
      const sideSel = (String(byId('dpb-aside')?.value || 'right').toLowerCase() === 'left') ? 'left' : 'right';
      const color   = (getLegColorFromSelection() || 'white').toLowerCase();
      const A = LEG_ASSETS_L2[color] || LEG_ASSETS_L2.white;
      const assets = (sideSel === 'right')
        ? { left:A.left, right:A.rightL, leftL:A.leftL, rightL:A.rightL, center:A.center }
        : { left:A.leftL,right:A.right,  leftL:A.leftL, rightL:A.rightL, center:A.center };
      const img = {
        left:   loadLegImage(assets.left,   scheduleRedraw),
        right:  loadLegImage(assets.right,  scheduleRedraw),
        leftL:  loadLegImage(assets.leftL,  scheduleRedraw),
        rightL: loadLegImage(assets.rightL, scheduleRedraw),
        center: loadLegImage(assets.center, scheduleRedraw),
      };
      if (!img.left || !img.right || !img.leftL || !img.rightL || !img.center){
        if (window.DPB_DEBUG){
          const ready = Object.fromEntries(Object.entries(img).map(([k,v])=>[k, !!(v && v.complete)]));
          console.log('[L2/Hole] assets not ready', ready);
        }
        ctx.restore(); return;
      }
      const Lcm = +byId('dpb-ml').value || 0;
      const layout = computeLegLayoutL2Rect1({
        x: mainRect.x, y: mainRect.y, w: mainRect.w, h: mainRect.h,
        sc, Lcm, side: sideSel, dims: LEG_DIMS_L2_CM
      });
      if (!layout){ ctx.restore(); return; }
      let cropLeftX  = Math.max(layout.crop.leftX,  mainRect.x, holeL);
      let cropRightX = Math.min(layout.crop.rightX, mainRect.x + mainRect.w, holeL + holeW);
      if (cropRightX <= cropLeftX){
        const mid = holeL + holeW/2;
        cropLeftX  = Math.max(mid - layout.centerRect.w/2, mainRect.x, holeL);
        cropRightX = Math.min(mid + layout.centerRect.w/2, mainRect.x + mainRect.w, holeL + holeW);
      }
      const drawCenterCropped = () => {
        ctx.save();
        const cw = Math.max(0, cropRightX - cropLeftX);
        if (cw > 0){
          ctx.beginPath();
          ctx.rect(cropLeftX, yCrop, cw, hCrop);
          ctx.clip();
          ctx.drawImage(img.center, layout.centerRect.x, layout.centerRect.y, layout.centerRect.w, layout.centerRect.h);
        }
        ctx.restore();
      };
      ctx.save();
      if (sideSel === 'right'){
        ctx.drawImage(img.left,   layout.leftRect.x,  layout.leftRect.y,  layout.leftRect.w,  layout.leftRect.h);
        drawCenterCropped();
        ctx.drawImage(img.rightL, layout.rightRect.x, layout.rightRect.y, layout.rightRect.w, layout.rightRect.h);
      } else {
        ctx.drawImage(img.leftL,  layout.leftRect.x,  layout.leftRect.y,  layout.leftRect.w,  layout.leftRect.h);
        drawCenterCropped();
        ctx.drawImage(img.right,  layout.rightRect.x, layout.rightRect.y, layout.rightRect.w, layout.rightRect.h);
      }
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(holeL, holeT, holeW, holeH);
      ctx.restore();
    }
else if (typeNow === 'l3'){
  const { rect1, rect2 } = ensureL3Rects(rec, sc);
  if (rect1 && rect2){
    const sideSel = (byId('dpb-aside')?.value || 'right').toLowerCase();
    const { A }   = getL3AssetsAndDims(sideSel);
    const imgs = {};
    Object.keys(A).forEach(k => { imgs[k] = loadLegImage(A[k], scheduleRedraw); });
    const Lcm = +byId('dpb-ml').value || 0;
    const layout = computeLegLayoutL3Rects_SMART({ rect1, rect2, sc, Lcm, side: sideSel });
    ctx.save();
    ctx.globalAlpha = 1;
    if (sideSel === 'left'){
      if (imgs.right)       ctx.drawImage(imgs.right,       layout.rightRect.x,       layout.rightRect.y,       layout.rightRect.w,       layout.rightRect.h);
      if (imgs.bottomLeft) ctx.drawImage(imgs.bottomLeft, layout.bottomLeft.x,      layout.bottomLeft.y,      layout.bottomLeft.w,      layout.bottomLeft.h);
      if (imgs.topLeft)     ctx.drawImage(imgs.topLeft,     layout.topLeft.x,         layout.topLeft.y,         layout.topLeft.w,         layout.topLeft.h);
      if (imgs.topCenter){
        const lX = Math.max(layout.cropTopCenterX.leftX,  rect1.x, holeL);
        const rX = Math.min(layout.cropTopCenterX.rightX, rect1.x + rect1.w, holeL + holeW);
        const cw = Math.max(0, rX - lX);
        if (cw>0){
          ctx.save();
          ctx.beginPath(); ctx.rect(lX, Math.max(rect1.y, holeT), cw, Math.min(rect1.y+rect1.h, holeT+holeH)-Math.max(rect1.y, holeT));
          ctx.clip();
          ctx.drawImage(imgs.topCenter, layout.topCenter.x, layout.topCenter.y, layout.topCenter.w, layout.topCenter.h);
          ctx.restore();
        }
      }
      if (imgs.centerLeft){
        const tY = Math.max(layout.cropCenterLeftY.topY, rect2.y, holeT);
        const bY = Math.min(layout.cropCenterLeftY.botY, rect2.y + rect2.h, holeT + holeH);
        const ch = Math.max(0, bY - tY);
        if (ch>0){
          ctx.save();
          ctx.beginPath(); ctx.rect(Math.max(rect2.x, holeL), tY, Math.min(rect2.x+rect2.w, holeL+holeW)-Math.max(rect2.x, holeL), ch);
          ctx.clip();
          ctx.drawImage(imgs.centerLeft, layout.centerLeft.x, layout.centerLeft.y, layout.centerLeft.w, layout.centerLeft.h);
          ctx.restore();
        }
      }
    } else {
      if (imgs.left)        ctx.drawImage(imgs.left,        layout.leftRect.x,        layout.leftRect.y,        layout.leftRect.w,        layout.leftRect.h);
      if (imgs.bottomRight) ctx.drawImage(imgs.bottomRight,layout.bottomRight.x,     layout.bottomRight.y,     layout.bottomRight.w,     layout.bottomRight.h);
      if (imgs.topRight)    ctx.drawImage(imgs.topRight,   layout.topRight.x,        layout.topRight.y,        layout.topRight.w,        layout.topRight.h);
      if (imgs.topCenter){
        const lX = Math.max(layout.cropTopCenterX.leftX,  rect1.x, holeL);
        const rX = Math.min(layout.cropTopCenterX.rightX, rect1.x + rect1.w, holeL + holeW);
        const cw = Math.max(0, rX - lX);
        if (cw>0){
          ctx.save();
          ctx.beginPath(); ctx.rect(lX, Math.max(rect1.y, holeT), cw, Math.min(rect1.y+rect1.h, holeT+holeH)-Math.max(rect1.y, holeT));
          ctx.clip();
          ctx.drawImage(imgs.topCenter, layout.topCenter.x, layout.topCenter.y, layout.topCenter.w, layout.topCenter.h);
          ctx.restore();
        }
      }
      if (imgs.centerRight){
        const tY = Math.max(layout.cropCenterRightY.topY, rect2.y, holeT);
        const bY = Math.min(layout.cropCenterRightY.botY, rect2.y + rect2.h, holeT + holeH);
        const ch = Math.max(0, bY - tY);
        if (ch>0){
          ctx.save();
          ctx.beginPath(); ctx.rect(Math.max(rect2.x, holeL), tY, Math.min(rect2.x+rect2.w, holeL+holeW)-Math.max(rect2.x, holeL), ch);
          ctx.clip();
          ctx.drawImage(imgs.centerRight, layout.centerRight.x, layout.centerRight.y, layout.centerRight.w, layout.centerRight.h);
          ctx.restore();
        }
      }
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(holeL, holeT, holeW, holeH);
    ctx.restore();
  }
}
    else {
      const drawSingle = DPB_resolveFn('drawSingleLegLayer');
      const drawCustom = DPB_resolveFn('drawCustomDeskLegsLayer');
	  const drawSingleMotor = DPB_resolveFn('drawSingleMotorLegsLayer');
	  const drawWorkSpace = DPB_resolveFn('drawWorkSpaceLegsLayer');
	  const drawManual = DPB_resolveFn('drawManualDeskLegsLayer');
      if (typeNow === 'single' && rec.box && drawSingle){
        drawSingle({ x:rec.box.x, y:rec.box.y, w:rec.box.w, h:rec.box.h, sc, alphaOverride:1, topClip:{ enable:false } });
      } else if (typeNow === 'custom' && rec.box && drawCustom){
        drawCustom({ x:rec.box.x, y:rec.box.y, w:rec.box.w, h:rec.box.h, sc, alphaOverride:1, topClip:{ enable:false } });
      }
      else if (typeNow === 'custom_single' && rec.box && drawSingleMotor){
        drawSingleMotor({ x:rec.box.x, y:rec.box.y, w:rec.box.w, h:rec.box.h, sc, alphaOverride:1, topClip:{ enable:false } });
      }
	  else if (typeNow === 'custom_workspace' && rec.box && drawWorkSpace){
        drawWorkSpace({ x:rec.box.x, y:rec.box.y, w:rec.box.w, h:rec.box.h, sc, alphaOverride:1, topClip:{ enable:false } });
      }
	  else if (typeNow === 'custom_manual' && rec.box && drawManual){
        drawManual({ x:rec.box.x, y:rec.box.y, w:rec.box.w, h:rec.box.h, sc, alphaOverride:1, topClip:{ enable:false } });
      }
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(holeL, holeT, holeW, holeH);
      ctx.restore();
    }
  }catch(e){
    console.error('[DPB][ERR] paintRedLegsInsideHole', e);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = (state?.theme?.bg) || '#ffffff';
  ctx.fillRect(holeL, holeT, holeW, holeH);
  ctx.restore();
  ctx.restore();
}

function drawLDeskAt(X, Y, sc, bg){
  const W  = +byId('dpb-mw').value || 60;
  const L  = +byId('dpb-ml').value || 200;
  const AW = +byId('dpb-aw').value || 120;
  const AL = +byId('dpb-al').value || 60;
  const side = byId('dpb-aside').value; 

  const getNum = (id, fb=0) => {
    const el = byId(id); const v = el ? Number(el.value) : fb;
    return Number.isFinite(v) ? v : fb;
  };

  const r_tl_mm     = getNum('ld_r_tl', 0);
  const r_tr_mm     = getNum('ld_r_tr', 0);
  const r_step_mm   = getNum('ld_r_step', 0);
  const r_br_mm     = getNum('ld_r_br', 0);
  const r_arm_bl_mm = getNum('ld_r_armbl', 0);
  const r_arm_br_mm = getNum('ld_r_armbr', 0);
  const r_in_mm     = getNum('dpb-rInner', 0);

  const px = v => v*sc;
  const R  = mm => (mm/10)*sc; 
  const pat = patFor(byId('dpb-top-color').value);

  const rect1 = { x:X, y:Y, w:px(L), h:px(W),
    tl:R(r_tl_mm), tr:R(r_tr_mm), bl:R(r_step_mm), br:R(r_br_mm) };
  const rect2 = { x:(side==='right') ? (X + px(L-AL)) : X, y:Y, w:px(AL), h:px(AW) };
  const r2 = (side === 'right')
    ? { tl:0, tr:R(r_tr_mm), br:R(r_arm_br_mm), bl:R(r_arm_bl_mm) }
    : { tl:R(r_tl_mm), tr:0, br:R(r_arm_br_mm), bl:R(r_arm_bl_mm) };

  setBoxes({
    rect1: { x:rect1.x, y:rect1.y, w:rect1.w, h:rect1.h }, 
    main : { x:rect1.x, y:rect1.y, w:rect1.w, h:rect1.h },
    arm  : { x:rect2.x, y:rect2.y, w:rect2.w, h:rect2.h }
  });

  ctx.save();
  ctx.fillStyle = pat ? pat : '#fff';
  ctx.beginPath();

  if (side === 'right') {
    const p_TL    = { x: X,          y: Y };
    const p_TR    = { x: X + px(L),  y: Y };
    const p_ArmBR = { x: X + px(L),  y: Y + px(AW) };
    const p_ArmBL = { x: X + px(L-AL), y: Y + px(AW) };
    const p_Inner = { x: X + px(L-AL), y: Y + px(W) };
    const p_Step  = { x: X,          y: Y + px(W) };

    ctx.moveTo(p_TL.x, p_TL.y + R(r_tl_mm));
    ctx.arcTo(p_TL.x, p_TL.y, p_TR.x, p_TR.y, R(r_tl_mm));
    ctx.arcTo(p_TR.x, p_TR.y, p_ArmBR.x, p_ArmBR.y, R(r_tr_mm));
    ctx.arcTo(p_ArmBR.x, p_ArmBR.y, p_ArmBL.x, p_ArmBL.y, R(r_arm_br_mm));
    ctx.arcTo(p_ArmBL.x, p_ArmBL.y, p_Inner.x, p_Inner.y, R(r_arm_bl_mm));
    ctx.arcTo(p_Inner.x, p_Inner.y, p_Step.x, p_Step.y, R(r_in_mm));
    ctx.arcTo(p_Step.x, p_Step.y, p_TL.x, p_TL.y, R(r_step_mm));
  } else {
    const p_TL    = { x: X,         y: Y };
    const p_TR    = { x: X + px(L), y: Y };
    const p_BR    = { x: X + px(L), y: Y + px(W) };
    const p_Inner = { x: X + px(AL), y: Y + px(W) };
    const p_ArmBR = { x: X + px(AL), y: Y + px(AW) };
    const p_ArmBL = { x: X,         y: Y + px(AW) };

    ctx.moveTo(p_TL.x, p_TL.y + R(r_tl_mm));
    ctx.arcTo(p_TL.x, p_TL.y, p_TR.x, p_TR.y, R(r_tl_mm));
    ctx.arcTo(p_TR.x, p_TR.y, p_BR.x, p_BR.y, R(r_tr_mm));
    ctx.arcTo(p_BR.x, p_BR.y, p_Inner.x, p_Inner.y, R(r_br_mm));
    ctx.arcTo(p_Inner.x, p_Inner.y, p_ArmBR.x, p_ArmBR.y, R(r_in_mm));
    ctx.arcTo(p_ArmBR.x, p_ArmBR.y, p_ArmBL.x, p_ArmBL.y, R(r_arm_br_mm));
    ctx.arcTo(p_ArmBL.x, p_ArmBL.y, p_TL.x, p_TL.y, R(r_arm_bl_mm));
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();

  let cutX, cutY, cutW, cutH, cutR;
  {
    const yBottomMain = rect1.y + rect1.h;
    const rect1R = rect1.x + rect1.w;
    const rect2R = rect2.x + rect2.w;
    const rect2B = rect2.y + rect2.h;
    const gapX0  = (side === 'right') ? Math.max(0, rect2.x - rect1.x) : Math.max(0, rect1R - rect2R);
    const gapY0  = Math.max(0, rect2B - yBottomMain);
    const rPxRaw = R(r_in_mm);
    const rPx    = Math.max(0, Math.min(rPxRaw, Math.min(gapX0, gapY0)));
    const baseGapX = gapX0, baseGapY = gapY0;
    let rect4 = { w: baseGapX*2, h: baseGapY*2, x: (side==='right') ? (rect2.x - baseGapX*2) : (rect2R), y: yBottomMain };
    rect4 = { x:Math.round(rect4.x), y:Math.round(rect4.y), w:Math.round(rect4.w), h:Math.round(rect4.h) };
    const r4 = (side==='right') ? { tl:0, tr:rPx, br:0, bl:0 } : { tl:rPx, tr:0, br:0, bl:0 };
    cutX = (side==='right') ? rect1.x : rect2R;
    cutY = yBottomMain;
    cutW = baseGapX;
    cutH = baseGapY;
    cutR = r4;
  }

  try{
    const typeNow = (byId('dpb-type')?.value || '').trim();
    if (typeNow === 'l2') {
      const yCrop = Math.min(rect1.y, rect2.y);
      const hCrop = Math.max(rect1.y+rect1.h, rect2.y+rect2.h) - yCrop;
      DPB_resolveFn('drawL2LegsLayer')({ rect1, rect2, x:rect1.x, y:rect1.y, w:rect1.w, h:rect1.h, sc, side, yCrop, hCrop });
    } else if (typeNow === 'l3') {
      DPB_resolveFn('drawL3LegsLayer')({ rect1, rect2, sc, side });
    }
  }catch(_){}

  const xL = X, xR = X + px(L);
  const yT = Y, yW = Y + px(W), yB = Y + px(AW);
  const armEdge = (side==='right') ? rect2.x : (rect2.x + rect2.w);

  dimH(xL, xR, yT - 24, `${L} cm`, 'up', 'above', { gapPx: 34, dimKey: 'length' });

  const yAL = yB + 22;
  if(side === 'right') dimH(armEdge, xR,  yAL, `${AL} cm`, 'down', 'below', { gapPx: 32, dimKey: 'al' });
  else                 dimH(xL, armEdge,  yAL, `${AL} cm`, 'down', 'below', { gapPx: 32, dimKey: 'al' });

  const xAW = (side==='left') ? (xL-28) : (xR+28);
  dimV(yT, yB, xAW, `${AW} cm`, (side==='left' ? -20 : +25), (side==='left' ? 'right' : 'left'), {
    rotateText:true, clockwise:false, textDy:0, textDx:0, dimKey:'aw'
  });

  function getHorizontalPlacement(){
    const el = byId('dpb-halign') || byId('dpb-hplacement') || byId('dpb-option-halign');
    const v = el?.value?.toLowerCase();
    return (v==='left' || v==='right') ? v : null;
  }
  const hPlace = getHorizontalPlacement();
  let xWline, textPosForW, xOffsetForW;
  if(hPlace==='left'){ xWline=xR+28; textPosForW='left';  xOffsetForW=+28; }
  else if(hPlace==='right'){ xWline=xL-28; textPosForW='right'; xOffsetForW=-28; }
  else { xWline=(side==='left')?(xR+28):(xL-28); textPosForW=(side==='left')?'left':'right'; xOffsetForW=(side==='left')?+28:-28; }

  dimV(yT, yW, xWline, `${W} cm`, xOffsetForW, textPosForW, {
    rotateText:true, clockwise:false, dimKey:'width'
  });

  labelCornerR(xL, yT, r_tl_mm, 'tl', sc);
  labelCornerR(xR, yT, r_tr_mm, 'tr', sc);

  if (side === 'right') {
    labelCornerR(xL,                yW, r_step_mm,   'stepL', sc);
    labelCornerR(rect2.x + rect2.w, yB, r_arm_br_mm, 'armR',  sc);  /* แก้จาก 'br' → 'armR' */
    labelCornerR(armEdge,           yB, r_arm_bl_mm, 'armL',  sc);
  } else {
    labelCornerR(xR,      yW, r_br_mm,     'br',   sc);
    labelCornerR(rect2.x, yB, r_arm_bl_mm, 'armL', sc);              /* แก้จาก 'bl' → 'armL' */
    labelCornerR(armEdge, yB, r_arm_br_mm, 'armR', sc);
  }

  drawInnerGuide({x:cutX, y:cutY, w:cutW, h:cutH, tl:cutR.tl, tr:cutR.tr}, side, sc);

  const totalBox = { x:X, y:Y, w:px(L), h:px(AW) };
  drawOptions(totalBox, bg, sc);

  const meas = measureInfoGrid();
  const headerY = 30;
  const canvasCenterX = canvas.width / 2;
  const centerOffset = (rect1.w - rect2.w) / 2;
  let topCenterX;
  if (side === 'right') { topCenterX = rect2.x - centerOffset; }
  else                  { topCenterX = (rect2.x + rect2.w) + centerOffset; }

  let topY;
  const diffH = rect2.h - rect1.h;
  if (diffH > 0) {
    const midGapY = rect1.y + rect1.h + (diffH / 2);
    topY = Math.round(midGapY - (meas.height / 2) + px(5));
  } else {
    topY = Math.round(rect1.y + rect1.h + px(25));
  }

  drawInfoOverlayOnDesk(meas, {
    headerY:       headerY,
    headerCenterX: canvasCenterX,
    topY:          topY,
    topCenterX:    topCenterX
  });
}
							 
function _dbgRect(r, color='#00e5ff', label='rect') {
  if (!r) return;
  const x = Math.round(r.x) + .5;
  const y = Math.round(r.y) + .5;
  const w = Math.round(r.w);
  const h = Math.round(r.h);
  ctx.save();
  ctx.setLineDash([6,4]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = color;
  ctx.fillRect(x-.5, y-.5, w, h);
  ctx.restore();
  ctx.save();
  ctx.font = '500 12px Prompt, sans-serif';
  ctx.fillStyle = color;
  const cap = `${label}  x=${Math.round(r.x)}, y=${Math.round(r.y)}, w=${w}, h=${h}`;
  ctx.fillText(cap, Math.max(6, x + 6), y - 6);
  ctx.restore();
}

function ensureState(){ return (window.state = window.state || {}); }

function setBoxes(obj){
  var ST = ensureState();
  ST.boxes = obj ? JSON.parse(JSON.stringify(obj)) : null; 
}

function _dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

function _clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function _pointRectDist(px, py, rx, ry, rw, rh){
  const cx = _clamp(px, rx, rx+rw);
  const cy = _clamp(py, ry, ry+rh);
  return Math.hypot(px-cx, py-cy);
}

function _minGapPx(a, b) {
    const A = a.draw, B = b.draw;
    const xA1 = A.leftX, xA2 = A.leftX + A.rw;
    const xB1 = B.leftX, xB2 = B.leftX + B.rw;
    const yA1 = A.topY,  yA2 = A.topY  + A.rh;
    const yB1 = B.topY,  yB2 = B.topY  + B.rh;

    const gapX = Math.max(xB1 - xA2, xA1 - xB2, 0);
    const gapY = Math.max(yB1 - yA2, yA1 - yB2, 0);

    /* ถ้าซ้อนกันทั้ง X และ Y → gap = 0
       ถ้าแยกกันแค่แกนเดียว → ใช้ระยะของแกนนั้น */
    if (gapX === 0 && gapY === 0) return 0;
    if (gapX === 0) return gapY;
    if (gapY === 0) return gapX;
    return Math.sqrt(gapX * gapX + gapY * gapY);
}

function drawRectAt(x, y, sc, bg){
  const L = +byId('dpb-ml').value || 190;
  const W = +byId('dpb-mw').value || 60;
  const w = FIXED_DRAW_LEN;
  const h = W * sc;
  const rmm = {
    tl: +byId('r_rect_tl').value || 0, tr: +byId('r_rect_tr').value || 0,
    bl: +byId('r_rect_bl').value || 0, br: +byId('r_rect_br').value || 0
  };
  const rTL = (rmm.tl / 10) * sc, rTR = (rmm.tr / 10) * sc, rBL = (rmm.bl / 10) * sc, rBR = (rmm.br / 10) * sc;
  const pat = patFor(byId('dpb-top-color').value);
  const deskType = byId('dpb-type')?.value || 'custom';
  
  setBoxes({ main:{ x, y, w, h }, arm:null });
  
  const showLegs = (window.state && window.state.flags && window.state.flags.showLegs !== undefined) 
                    ? window.state.flags.showLegs 
                    : true;

  if (showLegs){
    const drawArgs = { x, y, w, h, sc, alphaOverride:1, topClip:{enable:false} };
    if (deskType === 'single') DPB_resolveFn('drawSingleLegLayer')(drawArgs);
    else if (deskType === 'custom') DPB_resolveFn('drawCustomDeskLegsLayer')(drawArgs);
    else if (deskType === 'custom_single') DPB_resolveFn('drawSingleMotorLegsLayer')(drawArgs);
	else if (deskType === 'custom_workspace') DPB_resolveFn('drawWorkSpaceLegsLayer')(drawArgs);
    else if (deskType === 'custom_manual') DPB_resolveFn('drawManualDeskLegsLayer')(drawArgs);
  }

  ctx.save();
  ctx.fillStyle = pat ? pat : '#fff';
  
  // ใช้ฟังก์ชันใหม่ fillSmartRoundedRect แทน
  fillSmartRoundedRect(ctx, x, y, w, h, rTL, rTR, rBR, rBL);
  
  ctx.restore();

  if (showLegs){
    const drawArgsClip = { x, y, w, h, sc, topClip:{ enable:true, x, y, w, h, radii:[rTL, rTR, rBR, rBL] } };
    if (deskType === 'single') DPB_resolveFn('drawSingleLegLayer')(drawArgsClip);
    else if (deskType === 'custom') DPB_resolveFn('drawCustomDeskLegsLayer')(drawArgsClip);
    else if (deskType === 'custom_single') DPB_resolveFn('drawSingleMotorLegsLayer')(drawArgsClip);
	else if (deskType === 'custom_workspace') DPB_resolveFn('drawWorkSpaceLegsLayer')(drawArgsClip);
    else if (deskType === 'custom_manual') DPB_resolveFn('drawManualDeskLegsLayer')(drawArgsClip);
  }

dimH(x, x + w, y - 28, `${L} cm`, 'up', 'above', { gapPx: 24, dimKey: 'length' });
dimV(y, y + h, x + w + 28, `${W} cm`, 20, 'center', { rotateText:true, clockwise:false, dimKey: 'width' });

  labelCornerR(x, y, rmm.tl, 'tl', sc);
  labelCornerR(x + w, y, rmm.tr, 'tr', sc);
  labelCornerR(x + w, y + h, rmm.br, 'br', sc);
  labelCornerR(x, y + h, rmm.bl, 'bl', sc);

  const meas = measureInfoGrid();
  const headerY = 30; 
  const canvasCenterX = canvas.width / 2;
  const topY = y + h + 15; 
  const topCenterX = x + (w/2);

  drawInfoOverlayOnDesk(meas, {
      headerY: headerY,
      headerCenterX: canvasCenterX,
      topY: topY,
      topCenterX: topCenterX
  });

  drawOptions({x, y, w, h}, bg, sc);
}

const cornerInputMap = {
  'r_rect_tl':  'r_tl',
  'r_rect_tr':  'r_tr',
  'r_rect_bl':  'r_bl',
  'r_rect_br':  'r_br',
  'ld_r_tl':    'r_tl',
  'ld_r_tr':    'r_tr',
  'ld_r_step':  'r_step',
  'ld_r_br':    'r_br',
  'ld_r_armbl': 'r_armbl',
  'ld_r_armbr': 'r_armbr',
  'dpb-rInner': 'r_inner',
};

Object.entries(cornerInputMap).forEach(([id, key]) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('focus', () => startDimPulse(key));
  el.addEventListener('blur',  () => stopDimPulse());
});


function labelCornerR(x, y, rmm, pos='tl', sc=1){
  const c = getOutColor();
  const padTop = 26, padBottom = 28, padSide = 32;
  const cfg = {
    tl:    { dx:-padSide,   dy:-padTop,      align:'right' },
    tr:    { dx:+padSide,   dy:-padTop,      align:'left'  },
    br:    { dx:+padSide,   dy:+padBottom,   align:'left'  },
    bl:    { dx:-padSide,   dy:+padBottom,   align:'right' },
    stepR: { dx:+padSide+6, dy:+padBottom-2, align:'left'  },
    stepL: { dx:-padSide-6, dy:+padBottom-2, align:'right' },
    armR:  { dx:+padSide+6, dy:+padBottom,   align:'left'  },
    armL:  { dx:-padSide-6, dy:+padBottom,   align:'right' },
  };
  const o = cfg[pos] || cfg.tl;

  const posToDimKey = {
    tl:    'r_tl',
    tr:    'r_tr',
    bl:    'r_bl',
    br:    'r_br',
    stepL: 'r_step',
    stepR: 'r_step',
    armL:  'r_armbl',
    armR:  'r_armbr',
  };
  const dimKey   = posToDimKey[pos] || null;
  const isActive = !!(dimKey && window._dpbDimFocus === dimKey);
  const pulse    = isActive ? (window._dpbDimPulse ?? 1) : 1;
  const drawC    = isActive ? '#e7b93b' : c;

  const val  = Number(rmm);
  const text = (val === 0) ? 'เหลี่ยม' : `R${val}`;
  const textX = x + o.dx;
  const textY = y + o.dy;

  ctx.save();
  ctx.fillStyle    = drawC;
  ctx.font         = '400 14px Prompt,sans-serif';
  ctx.textAlign    = o.align;
  ctx.textBaseline = 'middle';
  ctx.globalAlpha  = isActive ? (0.5 + 0.5 * pulse) : 1;
  ctx.shadowColor  = isActive ? '#e7b93b' : 'transparent';
  ctx.shadowBlur   = isActive ? (14 * (1 - pulse)) : 0;
  ctx.fillText(text, textX, textY);
  ctx.restore();

  drawCornerArrowFromCorner(x, y, textX, textY, drawC, val, sc, isActive, pulse);
}


function drawCornerArrow(fromX, fromY, toX, toY, color){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  const ang = Math.atan2(toY - fromY, toX - fromX);
  const size = 10;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(ang - Math.PI/6),
              toY - size * Math.sin(ang - Math.PI/6));
  ctx.lineTo(toX - size * Math.cos(ang + Math.PI/6),
              toY - size * Math.sin(ang + Math.PI/6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawCornerArrowFromCorner(cornerX, cornerY, textX, textY, color, r_mm=0, sc=1, isActive=false, pulse=1){
  const gapCornerPx = 10;
  const gapTextPx   = 10;
  const headSize    = 10;
  
  const r_px = (r_mm / 10) * sc;
  const angle = Math.atan2(textY - cornerY, textX - cornerX);
  
  let depth = 0;
  if (r_px > 0) {
    const vx = Math.cos(angle), vy = Math.sin(angle);
    const dx = r_px * (vx >= 0 ? 1 : -1);
    const dy = r_px * (vy >= 0 ? 1 : -1);
    const proj = vx * dx + vy * dy;
    const disc = proj * proj - (dx * dx + dy * dy - r_px * r_px);
    if (disc >= 0) depth = proj - Math.sqrt(disc);
  }

  const effectiveGap = gapCornerPx - depth;
  const startX = cornerX + Math.cos(angle) * effectiveGap;
  const startY = cornerY + Math.sin(angle) * effectiveGap;
  const endX   = textX - Math.cos(angle) * gapTextPx;
  const endY   = textY - Math.sin(angle) * gapTextPx;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = isActive ? (2.5 + 2 * (1 - pulse)) : 1.6;
  ctx.globalAlpha = isActive ? (0.5 + 0.5 * pulse) : 1;
  ctx.shadowColor = isActive ? '#e7b93b' : 'transparent';
  ctx.shadowBlur  = isActive ? (14 * (1 - pulse)) : 0;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headSize * Math.cos(angle - Math.PI/6), endY - headSize * Math.sin(angle - Math.PI/6));
  ctx.lineTo(endX - headSize * Math.cos(angle + Math.PI/6), endY - headSize * Math.sin(angle + Math.PI/6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawInnerGuide(cut, side, sc){
  const r    = (side==='right') ? cut.tr : cut.tl;
  const cOut = getOutColor();

  const isActive = !!(window._dpbDimFocus === 'r_inner');
  const pulse    = isActive ? (window._dpbDimPulse ?? 1) : 1;
  const drawC    = isActive ? '#e7b93b' : cOut;

  if (!r || r <= 0){
    const cornerX  = (side==='right') ? (cut.x + cut.w) : cut.x;
    const cornerY  = cut.y;
    const textGap  = 6, extraGap = 20, fontSize = 14;
    const textX    = cornerX + (side==='right' ? -(textGap+extraGap) : (textGap+extraGap));
    const textY    = cornerY + (textGap+extraGap);

    ctx.save();
    ctx.fillStyle    = drawC;
    ctx.font         = `400 ${fontSize}px Prompt,sans-serif`;
    ctx.textAlign    = (side==='right' ? 'right' : 'left');
    ctx.textBaseline = 'middle';
    ctx.globalAlpha  = isActive ? (0.5 + 0.5 * pulse) : 1;
    ctx.shadowColor  = isActive ? '#e7b93b' : 'transparent';
    ctx.shadowBlur   = isActive ? (14 * (1 - pulse)) : 0;
    ctx.fillText('เหลี่ยม', textX, textY);
    ctx.restore();
    drawCornerArrowFromCorner(cornerX, cornerY, textX, textY, drawC, 0, sc, isActive, pulse);
    return;
  }

  const cx     = (side==='right') ? (cut.x + cut.w - r) : (cut.x + r);
  const cy     = cut.y + r;
  const rGuide = Math.max(10, r - 18);
  const THETA_MID = (side==='right') ? Math.PI*1.75 : Math.PI*1.25;
  const SWEEP  = (60 * Math.PI) / 180;

  ctx.save();
  ctx.strokeStyle = drawC;
  ctx.lineWidth   = isActive ? (2.5 + 2 * (1 - pulse)) : 2;
  ctx.globalAlpha = isActive ? (0.5 + 0.5 * pulse) : 1;
  ctx.shadowColor = isActive ? '#e7b93b' : 'transparent';
  ctx.shadowBlur  = isActive ? (14 * (1 - pulse)) : 0;
  ctx.beginPath();
  ctx.arc(cx, cy, rGuide, THETA_MID-SWEEP/2, THETA_MID+SWEEP/2, false);
  ctx.stroke();
  ctx.restore();

  const rmm   = Math.round((r*10)/sc);
  const arcX  = cx + Math.cos(THETA_MID)*rGuide;
  const arcY  = cy + Math.sin(THETA_MID)*rGuide;
  const TEXT_ANGLE = THETA_MID + Math.PI;
  const outPx = 10 * sc;
  const textX = arcX + Math.cos(TEXT_ANGLE) * outPx;
  const textY = arcY + Math.sin(TEXT_ANGLE) * outPx;

  ctx.save();
  ctx.fillStyle    = drawC;
  ctx.font         = '400 14px Prompt,sans-serif';
  ctx.textAlign    = (side==='right' ? 'left' : 'right');
  ctx.textBaseline = 'middle';
  ctx.globalAlpha  = isActive ? (0.5 + 0.5 * pulse) : 1;
  ctx.shadowColor  = isActive ? '#e7b93b' : 'transparent';
  ctx.shadowBlur   = isActive ? (14 * (1 - pulse)) : 0;
  ctx.fillText(`R${rmm}`, textX, textY);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = drawC;
  ctx.lineWidth   = isActive ? (2 + 1.5 * (1 - pulse)) : 1;
  ctx.globalAlpha = isActive ? (0.5 + 0.5 * pulse) : 1;
  ctx.shadowColor = isActive ? '#e7b93b' : 'transparent';
  ctx.shadowBlur  = isActive ? (10 * (1 - pulse)) : 0;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(THETA_MID)*r,      cy + Math.sin(THETA_MID)*r);
  ctx.lineTo(cx + Math.cos(THETA_MID)*rGuide, cy + Math.sin(THETA_MID)*rGuide);
  ctx.stroke();
  ctx.restore();
}

function drawFooter(){
  const badges = byId('dpb-meta');
  if(!badges) return;
  const t = byId('dpb-type').value;
  const topKey = byId('dpb-top-color').value;
  const legKey = byId('dpb-legs').value;
  const edge   = byId('dpb-edge').value;
  const topName = (state.meta.colors||[]).find(c=>c.key===topKey)?.name || topKey;
  const legName = (state.meta.legs||[]).find(c=>c.key===legKey)?.name || legName;
  const plat    = byId('dpb-platforms').value || '-';
  badges.innerHTML =
    `<span class="b">Top: ${topName}</span>` +
    `<span class="b">Leg: ${legName}</span>` +
    `<span class="b">Edge: ${edge}</span>` +
    `<span class="b">Type: ${t}</span>` +
    `<span class="b">Platform: ${plat}</span>`;
}

function dpb_isSolidTopKey(key){
  return typeof DPB_SOLID_KEYS !== 'undefined' && DPB_SOLID_KEYS.includes(String(key));
}

function dpb_updateSolidwoodVisibility(){
  const typeSel = document.getElementById('dpb-type');
  if (!typeSel) return;
  
  const type = (typeSel.value || '').toLowerCase(); 
  const isL3 = (type === 'l3'); 
  
  // 1. ดึงข้อมูล Group (.dpb-color-section) ทั้งหมด 3 อัน (Solidwood, Whiteboard, Laminate)
  const colorSections = document.querySelectorAll('.dpb-color-section');
  
  let bannedSwatches = [];
  let bannedSections = [];
  
  colorSections.forEach(section => {
    const swatches = Array.from(section.querySelectorAll('.dpb-top-swatch'));
    if (swatches.length === 0) return;
    
    // ตรวจสอบว่ากลุ่มนี้คือ Solidwood หรือไม่
    const isSolidGroup = swatches.some(btn => typeof DPB_SOLID_KEYS !== 'undefined' && DPB_SOLID_KEYS.includes(String(btn.getAttribute('data-key'))));
    
    // ตรวจสอบว่ากลุ่มนี้คือ Whiteboard หรือไม่
    const sectionText = section.innerText.toLowerCase();
    const isWbGroup = sectionText.includes('whiteboard') || sectionText.includes('ไวท์บอร์ด');
    
    // ถ้ารุ่นคือ L3 กลุ่ม Solidwood และ Whiteboard จะต้องถูกรวบเข้า List ที่โดนแบน
    if (isSolidGroup || isWbGroup) {
      bannedSwatches = bannedSwatches.concat(swatches);
      bannedSections.push(section);
    }
  });
  
  // 2. ซ่อนหรือแสดงผล Group (Section) ทั้งก้อน
  bannedSections.forEach(section => {
    if (isL3) {
      section.style.display = 'none';
      section.setAttribute('aria-hidden', 'true');
    } else {
      section.style.display = '';
      section.removeAttribute('aria-hidden');
    }
  });
  
  // ตัวแปรสำหรับเช็คว่ามีการลักไก่เลือกสีที่โดนแบนค้างไว้หรือไม่
  let isBannedActive = false; 
  
  // 3. ซ่อนปุ่มสีที่ถูกแบน และดักจับสถานะ Active
  bannedSwatches.forEach(btn => {
    if (isL3) {
      btn.style.display = 'none';
      btn.setAttribute('aria-hidden', 'true');
      
      // ดักจับ: ถ้าปุ่มที่กำลังจะโดนซ่อน มีสถานะถูกเลือกค้างอยู่
      if (btn.classList.contains('is-active') || btn.getAttribute('aria-selected') === 'true') {
        isBannedActive = true; 
      }

      // บังคับเคลียร์สถานะการเลือกทิ้ง
      btn.classList.remove('is-active');
      btn.setAttribute('aria-selected', 'false');
    } else {
      btn.style.display = '';
      btn.removeAttribute('aria-hidden');
    }
  });
  
  // 4. ระบบป้องกันระดับสูง (Fallback Auto-Click)
  // หากผู้ใช้เลือกสี Solidwood หรือ Whiteboard ค้างไว้ แล้วเพิ่งเปลี่ยนมาเป็นโต๊ะ L3 
  if (isL3 && isBannedActive) {
    // หาปุ่มสีทั้งหมดบนโต๊ะ
    const allSwatches = Array.from(document.querySelectorAll('.dpb-top-swatch'));
    
    // กรองหา "ปุ่มแรก" ที่ปลอดภัย (ไม่ได้อยู่ใน List สีที่โดนแบน)
    const safeSwatches = allSwatches.filter(btn => !bannedSwatches.includes(btn));
    
    if (safeSwatches.length > 0) {
      // ใช้ setTimeout เพื่อหน่วงเวลาให้ DOM เคลียร์ค่าเก่าเสร็จก่อน (ประมาณ 50ms) แล้วค่อยบังคับคลิกสีใหม่
      setTimeout(() => {
        safeSwatches[0].click(); 
      }, 50);
    }
  }
}

// ดักจับการเปลี่ยนแปลงจาก Dropdown
document.addEventListener('change', function(e){
  if (e.target && e.target.id === 'dpb-type'){
    dpb_updateSolidwoodVisibility();
  }
});

// ดักจับการคลิกที่การ์ดเลือกรุ่นโต๊ะ (Type Tiles)
const typeTiles = document.getElementById('dpb-type-tiles');
if (typeTiles){
  typeTiles.addEventListener('click', function(e){
    const btn = e.target.closest('.dpb-type-card[data-value]');
    if (!btn) return;
    
    // หน่วงเวลาเล็กน้อยเพื่อให้ระบบหลักเปลี่ยนค่า type ให้เสร็จก่อนตรวจสอบ
    setTimeout(dpb_updateSolidwoodVisibility, 10);
  });
}

// ตรวจสอบสถานะทันทีที่โหลดหน้าเว็บเสร็จ
setTimeout(dpb_updateSolidwoodVisibility, 100);


const activeToasts = new Map();

function getToastContainer() {
    let container = document.getElementById('dpb-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'dpb-toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function getFieldKey(el) {
    if (el.name && el.name.trim() !== '') {
        return 'name:' + el.name.trim();
    }
    if (el.id) {
        return 'id:' + el.id;
    }
    el.id = 'dpb-gen-' + Math.random().toString(36).substr(2, 9);
    return 'id:' + el.id;
}

function showToast(message, sourceElement) {
    if (window.innerWidth < 768) return;
    if (!message || !sourceElement) return;

    const container = getToastContainer();
    const uniqueKey = getFieldKey(sourceElement); // ได้ Key เช่น "name:offsetY"

    let existingToast = container.querySelector(`.dpb-toast[data-toast-key="${uniqueKey}"]`);

    let record = activeToasts.get(uniqueKey);

    if (existingToast && !record) {
        record = { toast: existingToast, timer: null };
        activeToasts.set(uniqueKey, record);
    }

    if (record || existingToast) {
        const targetToast = record ? record.toast : existingToast;

        if (record && record.timer) {
            clearTimeout(record.timer);
            record.timer = null;
        }

        const textSpan = targetToast.querySelector('.dpb-toast-msg');
        if (textSpan && textSpan.textContent !== message) {
            textSpan.textContent = message;
        }

        if (!targetToast.classList.contains('show')) {
            requestAnimationFrame(() => targetToast.classList.add('show'));
        }

        if (!record) {
             activeToasts.set(uniqueKey, { toast: targetToast, timer: null });
        }
        
        return; 
    }

    const toast = document.createElement('div');
    toast.className = 'dpb-toast';
    toast.setAttribute('data-toast-key', uniqueKey);
    
    toast.innerHTML = `
        <span class="dpb-toast-icon">⚠️</span>
        <span class="dpb-toast-msg">${message}</span>
    `;
    
    container.appendChild(toast);

    activeToasts.set(uniqueKey, { toast: toast, timer: null });

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
}

function hideToast(sourceElement) {
    if (!sourceElement) return;
    
    const uniqueKey = getFieldKey(sourceElement);

    let record = activeToasts.get(uniqueKey);

    if (!record) {
         const container = document.getElementById('dpb-toast-container');
         const zombie = container ? container.querySelector(`.dpb-toast[data-toast-key="${uniqueKey}"]`) : null;
         if (zombie) {
             record = { toast: zombie, timer: null };
             activeToasts.set(uniqueKey, record);
         }
    }

    if (!record) return;

    if (record.timer) clearTimeout(record.timer);
    
    record.timer = setTimeout(() => {
        const toast = record.toast;
        toast.classList.remove('show');
        
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 350);
        
        activeToasts.delete(uniqueKey);
    }, 100);
}

function setFieldError(el, msg, _mirrorDone, popupMsg){
  if (!el) return;

  el.classList.toggle('dpb-invalid', !!msg);
  
  var note = el.parentElement.querySelector('.dpb-field-note');
  if(!note){
    note = document.createElement('div');
    note.className = 'dpb-field-note';
    el.parentElement.appendChild(note);
  }
  note.textContent = msg || '';
  note.style.display = msg ? '' : 'none';

  if (msg) {
      const uniqueKey = getFieldKey(el);

      const isAlreadyShown = !!document.querySelector(`.dpb-toast[data-toast-key="${uniqueKey}"]`);

      const isUserFocused = (document.activeElement === el);
      const isTypeChanging = (document.activeElement && document.activeElement.id === 'dpb-type');

      if (!isTypeChanging && (isAlreadyShown || isUserFocused)) {
          const alertText = popupMsg || msg;
          showToast(alertText, el);
      } else {
          hideToast(el); 
      }
  } else {
      hideToast(el);
  }

  
  try{
    if (_mirrorDone) return; 
    var typeVal = (document.getElementById('dpb-type')?.value || '').trim().toLowerCase();
    if (typeVal === 'l2' || typeVal === 'l3') return;

    var isGapField = !!(el.id && (/^dpb-gap/i.test(el.id) || /gap(left|right)$/i.test(el.id)));
    if (!isGapField) return;

    var txt = String(msg || '');
    var isPerFieldLimit = /\(ห้ามเกิน\s*\d+\s*cm\)/i.test(txt);
    if (isPerFieldLimit) return; 

    var isMin5Msg = /5\s*cm|5\s*ซม|5cm|แนะนำให้ขอบโต๊ะมีระยะห่าง\s*5\s*cm\s*ขึ้นไป/i.test(txt);
    if (isMin5Msg) return; 

    var isGenericOverlap = /ลดระยะห่างลง|ซ้อน/i.test(txt);
    if (!isGenericOverlap) return;

    var peers = [];
    var row = el.closest('.dpb-row-2');
    if (row){
      var inputs = row.querySelectorAll('input[id^="dpb-gap"], input[id$="gap-left"], input[id$="gap-right"], input[id$="gapL"], input[id$="gapR"]');
      inputs.forEach(function(p){
        if (p !== el && p.offsetParent !== null) peers.push(p);
      });
    }else{
      ['dpb-gap-left','dpb-gap-right','dpb-gapL','dpb-gapR','dpb-gapA','dpb-gapB','dpb-gap-leftL','dpb-gap-rightL'].forEach(function(id){
        var p = document.getElementById(id);
        if (p && p !== el && p.offsetParent !== null) peers.push(p);
      });
    }
    for (var j=0; j<peers.length; j++){
      setFieldError(peers[j], txt, true);
    }
  }catch(_){ }
}

function getConstraints(){
  const type = byId('dpb-type').value;
  const rules = [];
  const m = state.meta.models.find(x=>x.model===type);
  if(!m) return rules;
  if(m.min_w && m.max_w){
    rules.push({id:'dpb-mw', min:m.min_w, max:m.max_w, label:'ความกว้าง'});
  }
  if(m.min_l && m.max_l){
    rules.push({id:'dpb-ml', min:m.min_l, max:m.max_l, label:'ความยาว'});
  }
  if(type==='l2' || type==='l3'){
    if(m.min_aw && m.max_aw){
      rules.push({id:'dpb-aw', min:m.min_aw, max:m.max_aw, label:'ความกว้างด้าน L'});
    }
    if(m.min_al && m.max_al){
      rules.push({id:'dpb-al', min:m.min_al, max:m.max_al, label:'ความยาวด้าน L'});
    }
  }
  return rules;
}

function validateInputs() {
  window.state = window.state || {};
  state.validation = state.validation || { ok: true, messages: [] };
  state.validation.ok = true;
  state.validation.messages = [];
  let allValid = true;

  // Clear old errors
  document.querySelectorAll('.dpb-field-note').forEach(n => { n.style.display = 'none'; });
  document.querySelectorAll('.dpb-invalid').forEach(el => el.classList.remove('dpb-invalid'));

  // 1. ตรวจสอบ Constraints พื้นฐาน (Min/Max ของ Model)
  const rules = getConstraints(); 
  rules.forEach(r => {
    const el = byId(r.id);
    if (!el || el.offsetParent === null) return; 
    const raw = (el.value ?? '').toString().trim();
    if (raw === '') {
      const msg = `กรุณากรอก${r.label} (ช่วง ${r.min}–${r.max} ซม.)`;
      setFieldError(el, msg);
      allValid = false;
      state.validation.ok = false;
      state.validation.messages.push({ field: r.id, message: msg });
      return;
    }
    const v = +raw;
    if (Number.isNaN(v) || v < r.min || v > r.max) {
      const msg = `สามารถเลือก${r.label} ได้เพียง ${r.min}–${r.max} ซม. เท่านั้น`;
      setFieldError(el, msg);
      allValid = false;
      state.validation.ok = false;
      state.validation.messages.push({ field: r.id, message: msg });
      return;
    }
    setFieldError(el, '');
  });

  // 2. (เพิ่มใหม่) ตรวจสอบ Constraints ของมุมโค้ง (Radius)
  const isRadiusValid = validateRadiusConstraints();
  if (!isRadiusValid) {
    allValid = false;
    state.validation.ok = false;
    // หมายเหตุ: ข้อความ error ถูกจัดการใน validateRadiusConstraints แล้ว
  }

  const btnPrev = byId('dpb-preview');
  const btnDown = byId('dpb-download');
  if (btnPrev) btnPrev.disabled = !allValid;
  if (btnDown) btnDown.disabled = !allValid;

  try {
    document.dispatchEvent(new CustomEvent('dpb:validation-changed', {
      detail: { ok: allValid, messages: state.validation.messages.slice() }
    }));
  } catch (_) { }

  return allValid;
}

    function applyTypeDefaults(){
      const t = byId('dpb-type').value;
      if(t==='custom' || t==='single'){
        if(!byId('dpb-mw').value) byId('dpb-mw').value = (t==='single')? '60':'60';
        if(!byId('dpb-ml').value) byId('dpb-ml').value = (t==='single')? '80':'200';
      }else{
        if(!byId('dpb-aw').value) byId('dpb-aw').value=120;
        if(!byId('dpb-al').value) byId('dpb-al').value=60;
      }
      syncRBlocks();
    }

    function genAutoFilename(){
      const type = byId('dpb-type').selectedOptions[0]?.text || 'Desk';
      const name = (byId('dpb-customer').value||'Customer').replace(/\s+/g,'');
      const d = byId('dpb-date').value; let pretty='';
      if(d){ const [yy,mm,dd] = d.split('-'); pretty = `${dd}${mm}${yy}`; }
      else { const t=new Date(); const dd=String(t.getDate()).padStart(2,'0'); const mm=String(t.getMonth()+1).padStart(2,'0'); const yy=t.getFullYear(); pretty=`${dd}${mm}${yy}`; }
      return `${type}_${name}_${pretty}`.replace(/[^\w\-\_\.]+/g,'_'); }

function syncRBlocks(initial = false) {
  const edgeVal = document.getElementById('dpb-edge')?.value || 'square';
  const typeVal = document.getElementById('dpb-type')?.value || 'custom';
  const isRounded = (edgeVal === 'rounded');
  const rRect = document.getElementById('dpb-r-rect');
  const rLdesk = document.getElementById('dpb-r-ldesk');
  
  if (rRect) rRect.style.display = (isRounded && (typeVal === 'custom' || typeVal === 'single' || typeVal === 'custom_workspace' || typeVal === 'custom_single' || typeVal === 'custom_manual')) ? '' : 'none';
  if (rLdesk) rLdesk.style.display = (isRounded && (typeVal === 'l2' || typeVal === 'l3')) ? '' : 'none';
  const setDefaultIfEmpty = (id, defVal) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.value === '' || el.value === null || Number(el.value) === 0) {
      el.value = String(defVal);
    }
  };

  if (isRounded) {
    if (typeVal === 'l2' || typeVal === 'l3') {
      ['ld_r_tl', 'ld_r_tr', 'ld_r_step', 'ld_r_br', 'ld_r_armbl', 'ld_r_armbr'].forEach(id => {
        setDefaultIfEmpty(id, 50); 
      });
      setDefaultIfEmpty('dpb-rInner', 150);
    } else {
      ['r_rect_tl', 'r_rect_tr', 'r_rect_bl', 'r_rect_br'].forEach(id => {
        setDefaultIfEmpty(id, 50);
      });
    }
  } else {
    const allIds = [
      'r_rect_tl', 'r_rect_tr', 'r_rect_bl', 'r_rect_br',
      'ld_r_tl', 'ld_r_tr', 'ld_r_step', 'ld_r_br', 'ld_r_armbl', 'ld_r_armbr',
      'dpb-rInner'
    ];
    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '0';
    });
  }

  if (!initial && typeof scheduleRedraw === "function") {
    scheduleRedraw();
  }
}

function validateRadiusConstraints() {
    const type = document.getElementById('dpb-type')?.value || 'custom';
    const edgeVal = document.getElementById('dpb-edge')?.value;
    
    // ถ้าไม่ได้เลือกแบบมุมมน ไม่ต้องตรวจสอบ
    if (edgeVal !== 'rounded') return true;

    let allOk = true;

    // Helper: ดึงค่า cm แปลงเป็น mm
    const getDimMM = (id) => {
        const el = document.getElementById(id);
        return el ? (Number(el.value) || 0) * 10 : 0;
    };
    // Helper: ดึงค่ามุม (mm อยู่แล้ว)
    const getRadMM = (id) => {
        const el = document.getElementById(id);
        return el ? (Number(el.value) || 0) : 0;
    };

    // Helper: ฟังก์ชันตรวจสอบมุม
    const checkCorner = (fieldId, name, checks) => {
        const el = document.getElementById(fieldId);
        if (!el || el.offsetParent === null) return; 

        const currentVal = Number(el.value) || 0;
        let maxAllowed = 99999; 
        let limitingFactor = '';

        checks.forEach(c => {
            const neighborVal = getRadMM(c.neighbor);
            const limit = c.limit;
            const spaceAvailable = limit - neighborVal;
            
            if (spaceAvailable < maxAllowed) {
                maxAllowed = spaceAvailable;
                limitingFactor = c.limitName || '';
            }
        });

        if (maxAllowed < 0) maxAllowed = 0;

        if (currentVal > maxAllowed) {
            allOk = false;
            const shortMsg = `เลือกขนาดมุมได้ไม่เกิน ${maxAllowed} mm`;
            // popupMsg อาจจะระบุด้วยว่าติดที่ค่าไหน (Optional)
            const popupMsg = `สามารถเลือกขนาด${name}ได้ไม่เกิน ${maxAllowed} mm (ติดข้อจำกัดด้าน${limitingFactor})`;
            
            setFieldError(el, shortMsg, false, popupMsg);
            
            if(window.state && window.state.validation){
                 state.validation.messages.push({ field: fieldId, message: popupMsg });
            }
        } else {
            const currentErr = el.parentElement.querySelector('.dpb-field-note')?.textContent || '';
            if (currentErr.includes('เลือกขนาดมุมได้ไม่เกิน')) {
                setFieldError(el, '');
            }
        }
    };

    if (type === 'l2' || type === 'l3') {
        // === โต๊ะตัว L ===
        const side = document.getElementById('dpb-aside')?.value || 'left';
        
        // ขนาดต่างๆ
        const W = getDimMM('dpb-mw');   // ความลึกแผ่นหลัก (Main Depth)
        const L = getDimMM('dpb-ml');   // ความยาวรวม (Total Length)
        const AW = getDimMM('dpb-aw');  // ความลึกรวมฝั่งแขน (Total Depth L-Side)
        const AL = getDimMM('dpb-al');  // ความกว้างแขน (Arm Width)

        if (side === 'left') {
            // === กรณี L หันซ้าย (แขนอยู่ซ้าย) ===
            // โครงสร้าง: ซ้ายลึก (AW), ขวาสั้น (W)
            
            // 1. มุมบนซ้าย (TL): เช็คแนวนอน (L) และแนวตั้งลึก (AW)
            checkCorner('ld_r_tl', 'มุมบนซ้าย', [
                { neighbor: 'ld_r_tr', limit: L, limitName: 'ความยาวโต๊ะ' },     
                { neighbor: 'ld_r_armbl', limit: AW, limitName: 'ความลึกแขน L' } 
            ]);

            // 2. มุมบนขวา (TR): เช็คแนวนอน (L) และแนวตั้งสั้น (W)
            checkCorner('ld_r_tr', 'มุมบนขวา', [
                { neighbor: 'ld_r_tl', limit: L, limitName: 'ความยาวโต๊ะ' },     
                { neighbor: 'ld_r_br', limit: W, limitName: 'ความลึกแผ่นหลัก' }      
            ]);

            // 3. มุมล่างขวา (BR): เช็คแนวตั้งสั้น (W)
            checkCorner('ld_r_br', 'มุมล่างขวา', [
                { neighbor: 'ld_r_tr', limit: W, limitName: 'ความลึกแผ่นหลัก' }
            ]);

            // 4. มุมปลายแขนซ้าย (ArmBL): เช็คแนวตั้งลึก (AW) และ ความกว้างแขน (AL)
            // *จุดนี้สำคัญ* ต้องเช็คกับ ArmBR (มุมใน) ด้วย เพื่อไม่ให้เกินความกว้างแขน
            checkCorner('ld_r_armbl', 'มุมปลายแขนซ้าย', [
                { neighbor: 'ld_r_tl', limit: AW, limitName: 'ความลึกแขน L' },
                { neighbor: 'ld_r_armbr', limit: AL, limitName: 'ความกว้างแขน L' } 
            ]);

            // 5. มุมในปลายแขน (ArmBR): เช็คความกว้างแขน (AL)
            checkCorner('ld_r_armbr', 'มุมปลายแขนขวา(ใน)', [
                { neighbor: 'ld_r_armbl', limit: AL, limitName: 'ความกว้างแขน L' }
            ]);

        } else {
            // === กรณี L หันขวา (แขนอยู่ขวา) ===
            // โครงสร้าง: ซ้ายสั้น (W), ขวาลึก (AW)

            // 1. มุมบนขวา (TR): เช็คแนวนอน (L) และแนวตั้งลึก (AW)
            checkCorner('ld_r_tr', 'มุมบนขวา', [
                { neighbor: 'ld_r_tl', limit: L, limitName: 'ความยาวโต๊ะ' },
                { neighbor: 'ld_r_armbr', limit: AW, limitName: 'ความลึกแขน L' }
            ]);

            // 2. มุมบนซ้าย (TL): เช็คแนวนอน (L) และแนวตั้งสั้น (W)
            checkCorner('ld_r_tl', 'มุมบนซ้าย', [
                { neighbor: 'ld_r_tr', limit: L, limitName: 'ความยาวโต๊ะ' },
                { neighbor: 'ld_r_step', limit: W, limitName: 'ความลึกแผ่นหลัก' } // ld_r_step คือมุมล่างซ้ายของแผ่นหลัก
            ]);

            // 3. มุมล่างซ้ายแผ่นหลัก (Step/BL): เช็คแนวตั้งสั้น (W)
            checkCorner('ld_r_step', 'มุมล่างซ้าย', [
                { neighbor: 'ld_r_tl', limit: W, limitName: 'ความลึกแผ่นหลัก' }
            ]);

            // 4. มุมปลายแขนขวา (ArmBR): เช็คแนวตั้งลึก (AW) และ ความกว้างแขน (AL)
            checkCorner('ld_r_armbr', 'มุมปลายแขนขวา', [
                { neighbor: 'ld_r_tr', limit: AW, limitName: 'ความลึกแขน L' },
                { neighbor: 'ld_r_armbl', limit: AL, limitName: 'ความกว้างแขน L' }
            ]);

            // 5. มุมในปลายแขน (ArmBL): เช็คความกว้างแขน (AL)
            checkCorner('ld_r_armbl', 'มุมปลายแขนซ้าย(ใน)', [
                { neighbor: 'ld_r_armbr', limit: AL, limitName: 'ความกว้างแขน L' }
            ]);
        }

    } else {
        // === โต๊ะสี่เหลี่ยมปกติ ===
        const W = getDimMM('dpb-mw');
        const L = getDimMM('dpb-ml');

        checkCorner('r_rect_tl', 'มุมบนซ้าย', [
            { neighbor: 'r_rect_tr', limit: L, limitName: 'ความยาว' },
            { neighbor: 'r_rect_bl', limit: W, limitName: 'ความลึก' }
        ]);
        checkCorner('r_rect_tr', 'มุมบนขวา', [
            { neighbor: 'r_rect_tl', limit: L, limitName: 'ความยาว' },
            { neighbor: 'r_rect_br', limit: W, limitName: 'ความลึก' }
        ]);
        checkCorner('r_rect_br', 'มุมล่างขวา', [
            { neighbor: 'r_rect_bl', limit: L, limitName: 'ความยาว' },
            { neighbor: 'r_rect_tr', limit: W, limitName: 'ความลึก' }
        ]);
        checkCorner('r_rect_bl', 'มุมล่างซ้าย', [
            { neighbor: 'r_rect_br', limit: L, limitName: 'ความยาว' },
            { neighbor: 'r_rect_tl', limit: W, limitName: 'ความลึก' }
        ]);
    }

    return allOk;
}

function normalizeOptConfigsOnTypeChange(){
  Object.keys(state.optConfig || {}).forEach(key=>{
    const arr = state.optConfig[key] || [];
    arr.forEach(cfg=>{
      if(!cfg || typeof cfg !== 'object') return;
      if(!cfg.pos) cfg.pos = 'main';
      if(!Number.isFinite(cfg.offsetY)) cfg.offsetY = 5; 
      const place = String(cfg.place||'').toLowerCase();
      if(place === 'center'){
        cfg.offsetX = 0; 
      }else{
        if(!Number.isFinite(cfg.offsetX)) cfg.offsetX = 10; 
      }
    });
  });
}

byId('dpb-edge').addEventListener('change', () => syncRBlocks());

byId('dpb-type').addEventListener('change', ()=>{
  toggleLDeskExtra?.();
  applyTypeDefaults?.();
  syncRBlocks?.();
  normalizeOptConfigsOnTypeChange();
  buildOptConfig?.();
  updateCartBadge?.();
  validateInputs?.();
  scheduleRedraw?.();
});

byId('dpb-aside')?.addEventListener('change', ()=>{
  toggleAside?.();        
  buildOptConfig?.();     
  validateInputs?.();
  scheduleRedraw?.();
});

syncRBlocks(true);

function totalOptions(){
  return totalSelectedCount();
}

function isDesktop(){
  return window.matchMedia('(min-width:901px)').matches;
}

function setMainWrapInert(active){
  if(!mainWrap) return;
  const desktop = isDesktop();
  if(desktop){
    mainWrap.removeAttribute('aria-hidden');
    mainWrap.removeAttribute('data-cart-inert');
    if(supportsInert){ mainWrap.inert = false; }
    return;
  }
  if(active){
    mainWrap.setAttribute('aria-hidden','true');
    mainWrap.setAttribute('data-cart-inert','true');
    if(supportsInert){ mainWrap.inert = true; }
  }else{
    mainWrap.removeAttribute('aria-hidden');
    mainWrap.removeAttribute('data-cart-inert');
    if(supportsInert){ mainWrap.inert = false; }
  }
}

function focusCartHeader(){
  const desktop = isDesktop();
  if(!desktop && cartCloseMobile){ cartCloseMobile.focus(); return; }
  if(desktop && cartCloseDesktop){ cartCloseDesktop.focus(); }
}

function openCart(){
  const desktop = isDesktop();
  if (totalOptions() === 0){
    cartEmpty.style.display='block';
    cartBody.style.display='none';
  }
  cartPanel.classList.add('is-open');
  if (desktop){
    requestAnimationFrame(setMobileCartHeightToCanvasBottom);
    document.body.classList.add('dpb-cart-open-desktop');
    state.desktopCartOpen = true;
  }else{
    cartBackdrop.classList.remove('is-active');
    document.body.classList.add('dpb-cart-lock'); 
    setMainWrapInert(true);
    requestAnimationFrame(() => requestAnimationFrame(requestMobileCartHeightUpdate));
  }
  cartButton.setAttribute('aria-expanded','true');
  cartPanel.setAttribute('aria-hidden','false');
  focusCartHeader();
}
window.openCart = openCart;

function closeCart(skipHistory=false){
  if(!cartPanel.classList.contains('is-open')) return;
  cartPanel.classList.remove('is-open');      
  cartBackdrop.classList.remove('is-active');
  document.body.classList.remove('dpb-cart-lock');
  setMainWrapInert(false);
  if(isDesktop && isDesktop()){
    document.body.classList.remove('dpb-cart-open-desktop');
    state.desktopCartOpen = false;
  }
  cartButton.setAttribute('aria-expanded','false');
  cartPanel.setAttribute('aria-hidden','true');
  if(cartButton) cartButton.focus();
  if (confirmDialog.classList.contains('is-open')) hideConfirm();
  if (!skipHistory && cartHistoryToken !== null){
    if (supportsHistory){
      suppressPopstate = true;
      cartHistoryToken = null;
      history.back();
      setTimeout(()=>{ suppressPopstate = false; }, 0);
    } else {
      cartHistoryToken = null;
    }
  }
  if (skipHistory){ cartHistoryToken = null; }
}

(function(){
  const root = document.documentElement;
  const panelInner = document.querySelector('.dpb-cart-panel__inner');
  function setVH(){
    const vh = (window.visualViewport ? visualViewport.height : window.innerHeight) * 0.01;
    root.style.setProperty('--vh', `${vh}px`);
  }
  function setCartHeight(pct = 50){
    root.style.setProperty('--dpb-cart-h', `calc(var(--vh) * ${pct})`);
  }
  setVH(); setCartHeight(50);
  window.addEventListener('resize', setVH);
  if (window.visualViewport){
    visualViewport.addEventListener('resize', setVH);
    visualViewport.addEventListener('scroll', setVH);
  }
  const cartPanel = document.getElementById('dpb-cart-panel') || document.querySelector('.dpb-cart-panel');
  const cartBtn   = document.getElementById('dpb-cart-button');
  const closeMb   = document.getElementById('dpb-cart-close-mobile');
  const closeDt   = document.getElementById('dpb-cart-close-desktop');
  function refreshCartViewport(){
    const isSmall = Math.min(window.innerWidth, window.innerHeight) < 640;
    setVH();
    setCartHeight(isSmall ? 60 : 50); 
    if (panelInner){
      panelInner.style.willChange = 'transform';
      requestAnimationFrame(()=>{ panelInner.style.willChange = 'auto'; });
    }
  }
  const safe = fn => fn && typeof fn === 'function';
  const _openCart  = window.openCart;
  const _closeCart = window.closeCart;
  window.openCart = function(){
    safe(_openCart) && _openCart.apply(this, arguments);
    refreshCartViewport();
  };
  window.closeCart = function(){
    safe(_closeCart) && _closeCart.apply(this, arguments);
  };
  if (cartBtn)  cartBtn.addEventListener('click', refreshCartViewport, {passive:true});
  if (closeMb)  closeMb.addEventListener('click', refreshCartViewport, {passive:true});
  if (closeDt)  closeDt.addEventListener('click', refreshCartViewport, {passive:true});
})();

function setCartEmptyState(isEmpty){
  const panel = document.querySelector('.dpb-cart-panel'); 
  if(panel){
    panel.classList.toggle('is-empty',  !!isEmpty);
    panel.classList.toggle('has-items', !isEmpty);
  }
  if (window.cartEmpty) cartEmpty.style.display = isEmpty ? '' : 'none';
  if (window.cartBody)  cartBody.style.display  = isEmpty ? 'none' : 'flex';
}

function showConfirm(){
  confirmDialog.classList.add('is-open');
  confirmDialog.setAttribute('aria-hidden','false');
}

function hideConfirm(){
  confirmDialog.classList.remove('is-open');
  confirmDialog.setAttribute('aria-hidden','true');
}

function clearAllOptions(){
  Object.keys(state.selectedOptions).forEach(key=>{
    state.selectedOptions[key] = {count:0};
    state.optConfig[key] = [];
    state.uiExpanded[key] = {};
    updateOptCardCount(key);
  });
  buildOptConfig();
  updateCartBadge();
  closeCart();
  scheduleRedraw();
}

if (cartButton) {
  cartButton.addEventListener('click', () => {
    try { scrollToTopSmooth(); } catch (e) {}
    if (cartPanel.classList.contains('is-open')) {
      closeCart();
    } else {
      buildOptConfig();
      openCart();
    }
  });
}


cartBackdrop.addEventListener('click', () => {
    if (!isDesktop()) closeCart(); 
});


cartCloseMobile.addEventListener('click', ()=>closeCart());
cartCloseDesktop.addEventListener('click', ()=>closeCart());
cartConfirm.addEventListener('click', ()=>closeCart());

cartClear.addEventListener('click', ()=>{
  if(totalOptions() === 0){
    closeCart();
    return;
  }
  showConfirm();
});
confirmNo.addEventListener('click', hideConfirm);
confirmYes.addEventListener('click', ()=>{
  hideConfirm();
  clearAllOptions();
  buildOptions();
});

document.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){
    if(confirmDialog.classList.contains('is-open')) hideConfirm();
    else if(cartPanel.classList.contains('is-open')) closeCart();
  }
});

if(supportsHistory){
  window.addEventListener('popstate', event=>{
    if(suppressPopstate){
      suppressPopstate = false;
      return;
    }
    if(cartHistoryToken !== null){
      if(confirmDialog.classList.contains('is-open')) hideConfirm();
      closeCart(true);
    }
  });
}

function enableDragClose(){
  return;
}

const themeBtn      = document.getElementById('dpb-theme-btn');
const themePanel    = document.getElementById('dpb-theme-panel');
const themeBackdrop = document.getElementById('dpb-theme-backdrop');
const themeClose    = document.getElementById('dpb-theme-close');
const themeConfirm  = document.getElementById('dpb-theme-confirm');

function openTheme(){
  themePanel.classList.add('is-open');
  themeBackdrop.classList.add('is-active');
}

function closeTheme(){
  themePanel.classList.remove('is-open');
  themeBackdrop.classList.remove('is-active');
}

if(themeBtn) themeBtn.addEventListener('click', openTheme);
if(themeClose) themeClose.addEventListener('click', closeTheme);
if(themeBackdrop) themeBackdrop.addEventListener('click', closeTheme);

(function(){
  window.state = window.state || {};
  state.ui = state.ui || {};
  if (typeof state.ui.showInfo === 'undefined') {
    state.ui.showInfo = true;
  }
  window.dpbShouldShowInfo = function(){
    return state?.ui?.showInfo !== false;
  };
  window.dpbSetShowInfo = function(on){
    state.ui = state.ui || {};
    state.ui.showInfo = !!on;
    if (typeof scheduleRedraw === 'function') scheduleRedraw();
  };
  function syncInfoToggleToUI(){
    const el = document.getElementById('dpb-info-toggle');
    if (!el) return;
    el.checked = !!dpbShouldShowInfo();
  }
  function initInfoToggle(){
    const el = document.getElementById('dpb-info-toggle');
    if (!el) return;
    el.addEventListener('change', (e)=>{
      dpbSetShowInfo(e.target.checked);
    });
    syncInfoToggleToUI();
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initInfoToggle, { once:true });
  }else{
    initInfoToggle();
  }
  if (typeof openTheme === 'function'){
    const _origOpenTheme = openTheme;
    window.openTheme = function(){
      _origOpenTheme();
      setTimeout(()=>{ try{ syncInfoToggleToUI(); }catch(_){} }, 0);
    };
  }
})();

function initColorGroup(id, defaultValue, onPick){
  const group = document.getElementById(id);
  if(!group) return;
  const buttons = group.querySelectorAll('button');
  if(defaultValue){
    buttons.forEach(btn=>{
      if(btn.dataset.value === defaultValue){
        btn.classList.add('active');
        group.dataset.selected = defaultValue;
      }
    });
  }
  buttons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      buttons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      group.dataset.selected = btn.dataset.value;
      if(typeof onPick === 'function') onPick(btn.dataset.value);
    });
  });
}

state.theme = state.theme || {};
if (typeof state.theme.userPickedIn === 'undefined')  state.theme.userPickedIn  = false;
if (typeof state.theme.userPickedOut === 'undefined') state.theme.userPickedOut = false;

initColorGroup('dpb-bg', '#ffffff', (val)=>{
  state.theme = state.theme || {};
  state.theme.bg = val;
  if(typeof scheduleRedraw==='function') scheduleRedraw();
});

initColorGroup('dpb-color-in', '#000000', (val)=>{
  state.theme = state.theme || {};
  state.theme.userPickedIn = true;      
  state.theme.colorIn = val;            
  if(typeof scheduleRedraw==='function') scheduleRedraw();
});

initColorGroup('dpb-color-out', '#000000', (val)=>{
  state.theme = state.theme || {};
  state.theme.userPickedOut = true;
  state.theme.colorOut = val;
  if(typeof scheduleRedraw==='function') scheduleRedraw();
});

if(themeConfirm){
  themeConfirm.addEventListener('click', ()=>{
    closeTheme();
  });
}

function handleResize(){
  if(!cartPanel.classList.contains('is-open')) return;
  if(!isDesktop()){
    requestMobileCartHeightUpdate();
    document.body.classList.remove('dpb-cart-open-desktop');
    state.desktopCartOpen = false;
    cartBackdrop.classList.add('is-active');      
    document.body.classList.add('dpb-cart-lock'); 
    setMainWrapInert(true);                        
  }else{
    document.body.classList.add('dpb-cart-open-desktop');
    state.desktopCartOpen = true;
    cartBackdrop.classList.remove('is-active');
    document.body.classList.remove('dpb-cart-lock');
    setMainWrapInert(false);
  }
  cartPanel.classList.add('is-open');
}
window.addEventListener('resize', handleResize);

function _vh() {
  return (window.visualViewport && window.visualViewport.height) || window.innerHeight;
}

function _getCanvasRef() {
  const byClass = document.querySelector('.dpb-card-canvas');
  if (byClass) return byClass;
  const canvas = document.getElementById('dpb-canvas');
  if (canvas) {
    const wrap = canvas.closest('.dpb-card-canvas');
    return wrap || canvas;
  }
  return null;
}

function setMobileCartHeightToCanvasBottom() {
  if (isDesktop && typeof isDesktop === 'function' && isDesktop()) return;
  const cartRoot = document.getElementById('dpb-cart-panel');
  if (!cartRoot || !cartRoot.classList.contains('is-open')) return;
  const panel = document.querySelector('.dpb-cart-panel__inner');
  if (!panel) return;
  const refEl = (function(){
    const wrap = document.querySelector('.dpb-card-canvas');
    if (wrap) return wrap;
    const c = document.getElementById('dpb-canvas');
    return c ? (c.closest('.dpb-card-canvas') || c) : null;
  })();
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const GAP = 8, MIN = 260, MAX = Math.round(vh * 0.92);
  let h = Math.round(vh * 0.6);
  if (refEl){
    const r = refEl.getBoundingClientRect();
    if (r.bottom <= vh){
      h = Math.max(MIN, Math.min(vh - r.bottom - GAP, MAX));
    }
  }
  document.documentElement.style.setProperty('--cart-h', `${h}px`);
}

let _cartHeightRaf = 0;
function requestMobileCartHeightUpdate() {
  if (_cartHeightRaf) return;
  _cartHeightRaf = requestAnimationFrame(() => {
    _cartHeightRaf = 0;
    setMobileCartHeightToCanvasBottom();
  });
}

function setMobileThemeHeightToCanvasBottom() {
  if (isDesktop && typeof isDesktop === 'function' && isDesktop()) return;
  const panel = document.querySelector('#dpb-theme-panel .dpb-theme-panel__inner');
  if (!panel) return;
  const refEl = (function _getCanvasRef() {
    const byClass = document.querySelector('.dpb-card-canvas');
    if (byClass) return byClass;
    const canvas = document.getElementById('dpb-canvas');
    return canvas ? (canvas.closest('.dpb-card-canvas') || canvas) : null;
  })();
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const GAP = 8;
  const MIN = 260;
  const MAX = Math.round(vh * 0.92);
  let heightPx = Math.round(vh * 0.6); 
  if (refEl) {
    const rect = refEl.getBoundingClientRect();
    if (rect.bottom <= vh) {
      const avail = Math.max(0, vh - rect.bottom - GAP);
      heightPx = Math.max(MIN, Math.min(avail, MAX));
    }
  }
  document.documentElement.style.setProperty('--cart-h', `${heightPx}px`);
}

let _themeHeightRaf = 0;
function requestMobileThemeHeightUpdate() {
  if (_themeHeightRaf) return;
  _themeHeightRaf = requestAnimationFrame(() => {
    _themeHeightRaf = 0;
    setMobileThemeHeightToCanvasBottom();
  });
}

(function(){
  const ScrollLock = (()=>{
  const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
  let locked = false;
  let y = 0;
  let unlockTimer = null;
  const getSBW = ()=> window.innerWidth - document.documentElement.clientWidth;
  function lock(){
    if (locked) return;
    locked = true;
    y = window.scrollY || document.documentElement.scrollTop || 0;
    const sbw = getSBW();
    if (sbw > 0) {
      document.documentElement.style.paddingRight = sbw + 'px';
      document.body.style.paddingRight = sbw + 'px';
    }
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    if (isIOS){
      document.body.style.position = 'fixed';
      document.body.style.top = `-${y}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
  }
  function _doUnlock(){
    if (!locked) return;
    locked = false;
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
    document.documentElement.style.paddingRight = '';
    document.body.style.paddingRight = '';
    if (isIOS){
      const py = parseInt(document.body.style.top || '0', 10) || 0;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, -py);
    }
  }
  function unlock(){
    if (unlockTimer) { clearTimeout(unlockTimer); unlockTimer = null; }
    _doUnlock();
  }
  function unlockDebounced(ms = 600){
    if (unlockTimer) clearTimeout(unlockTimer);
    unlockTimer = setTimeout(()=> { unlockTimer = null; _doUnlock(); }, ms);
  }
  return { lock, unlock, unlockDebounced, get locked(){ return locked; } };
})();

  function anyModalOpen(){
    const dpbOpen = !!document.querySelector('.dpb-modal.is-open, .dpb-modal[aria-hidden="false"]');
    const emOpen  = !!document.querySelector('.elementor-popup-modal.elementor-lightbox-open');
    return dpbOpen || emOpen;
  }

function installModalObserver(){
  const targets = [
    document.body,
    ...document.querySelectorAll('.dpb-modal, .elementor-popup-modal')
  ];
  const obs = new MutationObserver(()=> {
    if (anyModalOpen()) ScrollLock.lock();
    else ScrollLock.unlockDebounced(650);  
  });
  targets.forEach(t => obs.observe(t, { attributes: true, childList: true, subtree: true }));
  document.addEventListener('touchmove', (e)=>{
    if (!anyModalOpen()) return;
    const modalContent = e.target.closest('.dpb-modal .dpb-modal__panel, .elementor-popup-modal .dialog-widget-content');
    if (!modalContent) e.preventDefault();
  }, { passive: false });
}

  const _openVariantModalForOption = window.openVariantModalForOption;
  if (typeof _openVariantModalForOption === 'function'){
    window.openVariantModalForOption = function(...args){
      const ret = _openVariantModalForOption.apply(this, args);
      setTimeout(()=> ScrollLock.lock(), 0);
      return ret;
    };
  }
  document.addEventListener('click', (e)=>{
    if (e.target.closest('.dpb-modal__close, .dpb-modal__backdrop')) {
      setTimeout(()=> {
        if (!anyModalOpen()) ScrollLock.unlock();
      }, 0);
    }
  });
  document.addEventListener('elementor/popup/show', ()=> ScrollLock.lock());
  document.addEventListener('elementor/popup/hide', ()=> ScrollLock.unlock());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installModalObserver);
  } else {
    installModalObserver();
  }
})();

(function bindMobileThemeHeightAutoUpdate(){
  const panelRoot = document.getElementById('dpb-theme-panel');
  if (!panelRoot) return;
  const onToggle = () => {
    const isOpen = panelRoot.classList.contains('is-open');
    if (isOpen && !(isDesktop && isDesktop())){
      requestAnimationFrame(() => requestMobileThemeHeightUpdate());
    }
  };
  new MutationObserver(onToggle)
    .observe(panelRoot, { attributes:true, attributeFilter:['class'] });
  window.addEventListener('resize', requestMobileThemeHeightUpdate, { passive:true });
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', requestMobileThemeHeightUpdate, { passive:true });
    window.visualViewport.addEventListener('scroll', requestMobileThemeHeightUpdate, { passive:true });
  }
  onToggle();
})();

(function bindMobileCartHeightAutoUpdate(){
  document.addEventListener('scroll', requestMobileCartHeightUpdate, { passive: true, capture: true });
  window.addEventListener('resize', requestMobileCartHeightUpdate, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', requestMobileCartHeightUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', requestMobileCartHeightUpdate, { passive: true });
  }
})();

/* Delayed layout calculations on screen rotation */
window.addEventListener('orientationchange', () => {
  setTimeout(requestMobileCartHeightUpdate, 100);
  setTimeout(requestMobileCartHeightUpdate, 300);
  setTimeout(requestMobileCartHeightUpdate, 500);
  setTimeout(requestMobileThemeHeightUpdate, 100);
  setTimeout(requestMobileThemeHeightUpdate, 300);
  setTimeout(requestMobileThemeHeightUpdate, 500);
});

(function initLAsideTiles(){
  var sel  = document.getElementById('dpb-aside');
  var host = document.getElementById('dpb-aside-tiles');
  if(!sel || !host) return;
  var LIST = [
    { value:'left',  label:'ซ้าย', img:'https://www.deskspace.in.th/wp-content/uploads/2025/10/L-Left.png'  }, 
    { value:'right', label:'ขวา', img:'https://www.deskspace.in.th/wp-content/uploads/2025/10/L-Right.png' },
  ];


  renderCards(host, LIST, sel.value, function (v){
    if (sel.value !== v){
      sel.value = v;
      sel.dispatchEvent(new Event('change', { bubbles:true }));
      if (typeof scheduleRedraw==='function') scheduleRedraw();
    }
  });
  sel.addEventListener('change', function(){
    syncCards(host, sel.value);
    if (typeof scheduleRedraw==='function') scheduleRedraw();
  });
  sel.dispatchEvent(new Event('change', { bubbles:false }));
  function renderCards(host, items, cur, onPick){
    host.innerHTML = '';
    items.forEach(function(it, idx){
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'dpb-type-card';
      card.setAttribute('data-value', it.value);
      card.setAttribute('aria-selected', (cur===it.value ? 'true' : 'false'));
      card.innerHTML = '' +
        '<span class="dpb-type-card__chip">' +
          '<img loading="lazy" alt="'+esc(it.label)+'" src="'+it.img+'">' +
        '</span>' +
        '<span class="dpb-type-card__name">'+esc(it.label)+'</span>';
      card.addEventListener('click', function(){
        onPick && onPick(it.value);
        [].slice.call(host.querySelectorAll('.dpb-type-card')).forEach(function(el){
          el.setAttribute('aria-selected','false');
        });
        card.setAttribute('aria-selected','true');
      });
      if (idx===0) card.setAttribute('tabindex','0'); 
      host.appendChild(card);
    });
  }
  function syncCards(host, value){
    [].slice.call(host.querySelectorAll('.dpb-type-card')).forEach(function(el){
      el.setAttribute('aria-selected', el.getAttribute('data-value') === value ? 'true' : 'false');
    });
  }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]);}); }
})();

(function initAsideHintCrossfade(){
  var host     = document.getElementById('dpb-aside-tiles');
  var asideSel = document.getElementById('dpb-aside');
  var rPanel   = document.getElementById('dpb-r-ldesk');
  if (!host || !asideSel || !rPanel) return;
  var BASE = {
    right: 'https://www.deskspace.in.th/wp-content/uploads/2025/10/L-Right.png',
    left:  'https://www.deskspace.in.th/wp-content/uploads/2025/10/L-Left.png'
  };
  var LR = {
    'top-left':      'https://www.deskspace.in.th/wp-content/uploads/2025/10/LR-top-left.png',
    'top-right':     'https://www.deskspace.in.th/wp-content/uploads/2025/10/LR-top-right.png',
    'bottom-left':   'https://www.deskspace.in.th/wp-content/uploads/2025/10/LR-bottom-left.png',
    'bottom-Lleft':  'https://www.deskspace.in.th/wp-content/uploads/2025/10/LR-bottom-Lleft.png',
    'bottom-Lright': 'https://www.deskspace.in.th/wp-content/uploads/2025/10/LR-bottom-Lright.png',
    'in':            'https://www.deskspace.in.th/wp-content/uploads/2025/10/LR-In.png'
  };
  var LL = {
    'top-left':      'https://www.deskspace.in.th/wp-content/uploads/2025/10/LL-top-left.png',
    'top-right':     'https://www.deskspace.in.th/wp-content/uploads/2025/10/LL-top-right.png',
    'bottom-right':  'https://www.deskspace.in.th/wp-content/uploads/2025/10/LL-bottom-right.png',
    'bottom-Lleft':  'https://www.deskspace.in.th/wp-content/uploads/2025/10/LL-bottom-Lleft.png',
    'bottom-Lright': 'https://www.deskspace.in.th/wp-content/uploads/2025/10/LL-bottom-Lright.png',
    'in':            'https://www.deskspace.in.th/wp-content/uploads/2025/10/LL-In.png'
  };
  var INPUT_KEY = {
    'ld_r_tl':     'top-left',
    'ld_r_tr':     'top-right',
    'ld_r_step':   'bottom-left',   
    'ld_r_br':     'bottom-right',  
    'ld_r_armbl':  'bottom-Lleft',  
    'ld_r_armbr':  'bottom-Lright', 
    'dpb-rInner':  'in'             
  };
  function getCard(side){ return host.querySelector('.dpb-type-card[data-value="'+ side +'"]'); }
  function getChip(side){ var c=getCard(side); return c ? c.querySelector('.dpb-type-card__chip') : null; }
  function getBaseImg(side){ var chip=getChip(side); return chip ? chip.querySelector('img:not(.dpb-aside-hint)') : null; }
  function getHintImg(side){ var chip=getChip(side); return chip ? chip.querySelector('img.dpb-aside-hint') : null; }
  function ensureHint(side, src){
    var chip = getChip(side); if (!chip) return;
    var hint = getHintImg(side);
    if (!hint){
      hint = document.createElement('img');
      hint.className = 'dpb-aside-hint';
      hint.alt = 'hint';
      hint.decoding = 'async';
      chip.appendChild(hint);
    }
    if (src) hint.src = src;
  }
  function setBase(side){
    var base = getBaseImg(side);
    if (base) base.src = BASE[side];
  }
  function clearAll(){
    ['right','left'].forEach(function(side){
      var card = getCard(side);
      if (card) card.classList.remove('is-hinting');
      var hint = getHintImg(side);
      if (hint) hint.remove(); 
      setBase(side);            
    });
  }
  function currentKey(){
    var a = document.activeElement;
    if (!a || !rPanel.contains(a) || !a.id) return null;
    return INPUT_KEY[a.id] || null;
  }
  function applyState(){
    var side = (asideSel.value || 'right').toLowerCase();
    var key  = currentKey();
    setBase('right'); setBase('left');
    ['right','left'].forEach(function(s){
      var card = getCard(s);
      if (card) card.classList.remove('is-hinting');
      var hint = getHintImg(s);
      if (hint) hint.remove();
    });
    if (!key) return;
    if (side === 'right'){
      ensureHint('right', LR[key] || BASE.right);
      var c = getCard('right'); if (c) c.classList.add('is-hinting');
    } else {
      ensureHint('left', LL[key] || BASE.left);
      var c2 = getCard('left'); if (c2) c2.classList.add('is-hinting');
    }
  }
  rPanel.addEventListener('focusin', function(){ applyState(); }, true);
  rPanel.addEventListener('focusout', function(){
    setTimeout(function(){
      if (!rPanel.contains(document.activeElement)) clearAll();
      else applyState(); 
    }, 0);
  }, true);
  asideSel.addEventListener('change', function(){
    if (rPanel.contains(document.activeElement)) applyState();
    else clearAll();
  });
  clearAll();
})();
