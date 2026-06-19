
		var DSLOG_V7_App = (function(){
			var raw=[], visits=[];
			var ADMIN_ICO=window.DSLOG_V7_Admin_Icon || '';
			var ci={trTrend:null,trDev:null,trSrc:null,trHour:null,trDow:null,
				pdTypeTrend:null,pdColorTrend:null,pdPlatTrend:null,pdMonthly:null,
				pdLegs:null,pdTopColors:null,pdSizes:null,pdTopTypes:null,
				pdPropType:null,pdPropColor:null,pdPropPlat:null,pdPropDev:null,
				insFunnel:null,insConvPlat:null,insRepeat:null,insWarn:null,insAddon:null,
				sumTrend:null,sumColors:null,sumType:null,sumPlat:null,sumDev:null,sumDow:null,
				spViews:null,spUsers:null,spLogs:null,spToday:null};
			var tblPage=1,tblSize=15,tblFiltered=[],selMode=false,curJson='',curTab='traffic';
			var tblSortCol='date',tblSortDir='desc';
			var pinnedIds={};
			var modalRawMode=false;
			var curLogObj=null;
			var geoCache={};
			var arTimer=null, arSecs=0, arInterval=null;

			function toast(msg,type){
				type=type||'success';
				var wrap=document.getElementById('v9-tw');
				var el=document.createElement('div'); el.className='v9-toast '+type;
				el.innerHTML='<i class="fa-solid '+(type==='error'?'fa-circle-xmark':'fa-circle-check')+'"></i>'+msg;
				wrap.appendChild(el);
				setTimeout(function(){el.classList.add('show');},10);
				setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},280);},3000);
			}

			function load(on){var el=document.getElementById('v9-loader');if(el)on?el.classList.remove('v9-hide'):el.classList.add('v9-hide');}

			function dte(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
			function safe(s){return(s||'-').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
			function col(i){return['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#6366f1'][i%10];}
			function anim(id,val){
				var el=document.getElementById(id); if(!el)return;
				var s=0,step=Math.ceil(val/(800/16));
				var t=setInterval(function(){s=Math.min(s+step,val);el.innerText=s.toLocaleString();if(s>=val)clearInterval(t);},16);
			}

			function toggleDark(){
				var el=document.querySelector('.v9');
				el.classList.toggle('dark');
				var on=el.classList.contains('dark');
				localStorage.setItem('dslog_dark',on?'1':'0');
				document.getElementById('dark-icon').className=on?'fa-solid fa-sun':'fa-solid fa-moon';
			}
			function initDark(){
				if(localStorage.getItem('dslog_dark')==='1'){
					var el=document.querySelector('.v9');
					if(el){el.classList.add('dark'); document.getElementById('dark-icon').className='fa-solid fa-sun';}
				}
			}

			function setAutoRefresh(val){
				val=parseInt(val)||0;
				if(arInterval){clearInterval(arInterval);arInterval=null;}
				var badge=document.getElementById('v9-ar-badge');
				var cdEl=document.getElementById('v9-ar-cd');
				if(!val){badge.classList.add('v9-hide');return;}
				badge.classList.remove('v9-hide');
				arSecs=val;
				if(cdEl)cdEl.textContent=arSecs;
				arInterval=setInterval(function(){
					arSecs--;
					if(cdEl)cdEl.textContent=arSecs;
					if(arSecs<=0){arSecs=val;loadData();}
				},1000);
			}

			function onGlobalRange(){
				var gr=document.getElementById('g-range').value;
				var cw=document.getElementById('g-custom-wrap');
				cw.style.display=gr==='custom'?'flex':'none';
				['tr-range','pd-range'].forEach(function(id){var el=document.getElementById(id);if(el)el.value=gr;});
				if(gr!=='custom'){
					['tr-custom','pd-custom'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('v9-hide');});
				} else {
					var gs=document.getElementById('g-start').value;
					var ge=document.getElementById('g-end').value;
					['tr-start','pd-start'].forEach(function(id){var el=document.getElementById(id);if(el&&gs)el.value=gs;});
					['tr-end','pd-end'].forEach(function(id){var el=document.getElementById(id);if(el&&ge)el.value=ge;});
					['tr-custom','pd-custom'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.remove('v9-hide');});
				}
				if(curTab==='traffic')renderTraffic();
				else if(curTab==='products')renderProducts();
				else if(curTab==='insights')renderInsights();
				else if(curTab==='summary')renderSummary();
			}

			function drawSparkline(ciKey,canvasId,data,color){
				var cv=document.getElementById(canvasId); if(!cv)return;
				if(ci[ciKey])try{ci[ciKey].destroy();}catch(e){}
				var rgb=color; var rgba=color.includes('rgb(')?color.replace(/^rgb\((.+)\)$/,'rgba($1,0.18)'):'rgba(37,99,235,0.18)';
				ci[ciKey]=new Chart(cv,{type:'line',data:{labels:data.map(function(_,i){return i;}),datasets:[{data:data,borderColor:rgb,borderWidth:1.5,pointRadius:0,tension:.4,fill:true,backgroundColor:rgba}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:400},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false,beginAtZero:true}}}});
			}
			function renderSparklines(){
				if(!visits.length&&!raw.length)return;
				var today=new Date(); today.setHours(0,0,0,0);
				var days7=[];
				for(var i=6;i>=0;i--){var d=new Date(today);d.setDate(d.getDate()-i);days7.push(d.toISOString().split('T')[0]);}
				var vMap={},lMap={};
				visits.forEach(function(v){if(!v.timestamp)return;var dk=v.timestamp.split(' ')[0]; vMap[dk]=(vMap[dk]||0)+1;});
				var uIpByDay={};
				visits.forEach(function(v){if(!v.timestamp)return;var dk=v.timestamp.split(' ')[0];if(!uIpByDay[dk])uIpByDay[dk]=new Set();uIpByDay[dk].add(v.ip);});
				raw.forEach(function(r){if(!r['บันทึกเมื่อ'])return;var dk=r['บันทึกเมื่อ'].split(' ')[0];lMap[dk]=(lMap[dk]||0)+1;});
				drawSparkline('spViews','spark-views',days7.map(function(d){return vMap[d]||0;}),'rgb(37,99,235)');
				drawSparkline('spUsers','spark-users',days7.map(function(d){return uIpByDay[d]?uIpByDay[d].size:0;}),'rgb(5,150,105)');
				drawSparkline('spLogs','spark-logs',days7.map(function(d){return lMap[d]||0;}),'rgb(124,58,237)');
				drawSparkline('spToday','spark-today',days7.map(function(d){return vMap[d]||0;}),'rgb(217,119,6)');
			}

			function loadPins(){try{var p=localStorage.getItem('dslog_pins');pinnedIds=p?JSON.parse(p):{};} catch(e){pinnedIds={};}}
			function savePin(id,v){pinnedIds[id]=v;localStorage.setItem('dslog_pins',JSON.stringify(pinnedIds));updatePinCount();}
			function updatePinCount(){var n=Object.values(pinnedIds).filter(Boolean).length;var el=document.getElementById('pinned-count');if(el)el.textContent=n;}
			var pinnedOnly=false;
			function togglePinnedOnly(){pinnedOnly=!pinnedOnly;var btn=document.getElementById('btn-pinned');if(btn)btn.style.background=pinnedOnly?'var(--amber-lt)':'';renderTable();}
			function pinRow(id){var v=!pinnedIds[id];savePin(id,v);var btn=document.querySelector('[data-pin-id="'+id+'"]');if(btn){btn.className='v9-pin-btn'+(v?' pinned':'');btn.title=v?'Unpin':'Pin';}var tr=btn?btn.closest('tr'):null;if(tr)tr.classList.toggle('pinned-row',v);}

			function geoLookup(ip,cb){
				if(!ip||ip==='127.0.0.1'||ip.startsWith('192.168')||ip.startsWith('10.')){cb({country:'Local',city:'Localhost',flag:'🏠'});return;}
				if(geoCache[ip]){cb(geoCache[ip]);return;}
				fetch('https://ipwho.is/'+ip)
				.then(function(r){return r.json();})
				.then(function(d){
					var info={country:d.country||'?',city:d.city||'?',flag:(d.flag&&d.flag.emoji)?d.flag.emoji:'🌐'};
					geoCache[ip]=info; cb(info);
				}).catch(function(){cb({country:'?',city:'?',flag:'🌐'});});
			}

			function showDetailModal(logObj){
				curLogObj=logObj;
				curJson=JSON.stringify(logObj,null,2);
				document.getElementById('v9-json').textContent=curJson;
				modalRawMode=false;
				document.getElementById('v9-detail-cards').classList.remove('v9-hide');
				document.getElementById('v9-json').classList.add('v9-hide');
				document.getElementById('btn-modal-toggle').innerHTML='<i class="fa-solid fa-code"></i> Raw JSON';
				var s=logObj['สเปคโต๊ะ']||{};
				var c=logObj['ข้อมูลลูกค้า']||{};
				var opts=logObj['รายการ_Options']||[];
				var warns=logObj['คำเตือน']||logObj['Warnings']||[];
				var snap=logObj['รูปภาพ_Snapshot']||'';
				var ip=logObj['IP_Address']||'';
				var safeGeoId='geomodal_'+Date.now();
				var html='<div class="v9-detail-header">';
				if(snap&&snap.startsWith('http')){html+='<div class="v9-detail-snap" onclick="DSLOG_V7_App.openImg(\''+snap.replace(/'/g, "\\'")+'\')" style="cursor:zoom-in"><img src="'+snap+'" loading="lazy" onerror="this.parentNode.style.opacity=\'0.3\'"></div>';}
				else{html+='<div class="v9-detail-snap-empty"><i class="fa-regular fa-image" style="font-size:22px;opacity:.4"></i><div style="font-size:10px;margin-top:4px;color:var(--txt3)">No snapshot</div></div>';}
				var custName=c['ชื่อ']||c['Name']||logObj['Customer_Name']||'\u2014';
				html+='<div class="v9-detail-meta" style="flex:1;min-width:0"><h3 style="word-break:break-word">'+safe(custName)+'</h3>';
				html+='<div class="v9-detail-chips">';
				if(c['แพลตฟอร์ม'])html+=platBadge(c['แพลตฟอร์ม']);
				if(logObj['Device_Type'])html+='<span class="v9-badge gray"><i class="fa-solid '+(logObj['Device_Type']==='Mobile'?'fa-mobile-screen-button':'fa-desktop')+'" style="font-size:10px"></i> '+safe(logObj['Device_Type'])+'</span>';
				if(warns&&warns.length)html+='<span class="v9-badge red"><i class="fa-solid fa-triangle-exclamation"></i> '+warns.length+' warning'+(warns.length>1?'s':'')+'</span>';
				html+='</div>';
				html+='<p style="margin-bottom:3px"><i class="fa-regular fa-clock" style="margin-right:4px"></i>'+safe(logObj['บันทึกเมื่อ']||'\u2014')+'</p>';
				if(ip)html+='<p id="'+safeGeoId+'"><i class="fa-solid fa-location-dot" style="margin-right:4px;color:var(--txt3)"></i><span style="color:var(--txt3);font-size:11px">'+safe(ip)+'\u2026</span></p>';
				html+='</div></div>';
				html+='<div class="v9-detail-section"><div class="v9-detail-section-title"><i class="fa-solid fa-table-cells-large" style="margin-right:5px"></i>Desk Specification</div><div class="v9-detail-grid">';
				var specFields=[['ประเภท/รุ่น',s['ประเภท']||s['รุ่นโต๊ะ']||'\u2014'],['สีท็อป',s['สีท็อป']||s['Color']||'\u2014'],['ขาโต๊ะ',s['ขาโต๊ะ']||s['ประเภทขา']||s['Leg_Type']||s['Table_Leg']||'\u2014'],['ขนาด Main',s['ขนาด Main (กว้างxยาว)']||( s['ความกว้าง_Main_cm']&&s['ความยาว_Main_cm']?(s['ความกว้าง_Main_cm']+' x '+s['ความยาว_Main_cm']+' cm'):'\u2014')],['ขนาด L-Side',s['ขนาด L-Side (กว้างxยาว)']||s['ขนาด Return (กว้างxยาว)']||(s['ความกว้าง_L_cm']&&s['ความยาว_L_cm']?(s['ความกว้าง_L_cm']+' x '+s['ความยาว_L_cm']+' cm'):'\u2014')],['ความสูง',s['ความสูง']||s['ความสูงโต๊ะ']||s['Height']||'\u2014']];
				specFields.forEach(function(f){html+='<div class="v9-detail-row"><div class="v9-detail-key">'+f[0]+'</div><div class="v9-detail-val">'+safe(f[1])+'</div></div>';});
				html+='</div></div>';
				html+='<div class="v9-detail-section"><div class="v9-detail-section-title"><i class="fa-solid fa-user" style="margin-right:5px"></i>Customer Info</div><div class="v9-detail-grid">';
				var custFields=[['ชื่อ',c['ชื่อ']||c['Name']||logObj['Customer_Name']||'\u2014'],['เบอร์/โทร',c['เบอร์']||c['Phone']||c['Tel']||'\u2014'],['อีเมล',c['อีเมล']||c['Email']||'\u2014'],['แพลตฟอร์ม',c['แพลตฟอร์ม']||'\u2014'],['IP Address',logObj['IP_Address']||'\u2014'],['Device',logObj['Device_Type']||'\u2014'],['หมายเหตุ',c['หมายเหตุ']||c['Note']||c['Remark']||'\u2014']];
				custFields.forEach(function(f){html+='<div class="v9-detail-row"><div class="v9-detail-key">'+f[0]+'</div><div class="v9-detail-val">'+safe(f[1])+'</div></div>';});
				html+='</div></div>';
				if(warns.length){
					html+='<div class="v9-detail-section"><div class="v9-detail-section-title" style="color:var(--red)"><i class="fa-solid fa-triangle-exclamation" style="margin-right:5px"></i>Warnings</div>';
					warns.forEach(function(w){html+='<div style="background:var(--red-lt);border:1px solid #fecaca;border-radius:var(--r-sm);padding:7px 11px;font-size:12px;color:var(--red);margin-bottom:5px">'+safe(typeof w==='string'?w:(w.message||JSON.stringify(w)))+'</div>';});
					html+='</div>';
				}
				if(opts.length){
					html+='<div class="v9-detail-section"><div class="v9-detail-section-title"><i class="fa-solid fa-puzzle-piece" style="margin-right:5px"></i>Options / Add-ons ('+opts.length+')</div><div class="v9-detail-options">';
					opts.forEach(function(o,i){
						var nm=o['ชื่อ']||o['name']||'Option '+(i+1);
						var zone=o['ตำแหน่ง_Zone']||o['ตำแหน่ง']||'';
						html+='<div class="v9-detail-option-item"><span>'+(i+1)+'. '+safe(nm)+(zone?' <span style="color:var(--txt3);font-size:10.5px">('+safe(zone)+')</span>':'')+'</span>';
						if(o['Variant']&&o['Variant']!=='-')html+='<span class="v9-badge gray">'+safe(o['Variant'])+'</span>';
						html+='</div>';
					});
					html+='</div></div>';
				}
				// CRM Section (Automated read-only display)
				var orderId = logObj.order_id || '';
				if (orderId) {
					html += '<div class="v9-detail-section" style="border-top:1px solid var(--bdr); padding-top:16px; margin-top:20px;">';
					html += '  <div class="v9-detail-section-title"><i class="fa-solid fa-cart-shopping" style="margin-right:5px"></i>Linked WooCommerce Order</div>';
					html += '  <div style="background:var(--surf2); border:1px solid var(--bdr); border-radius:8px; padding:12px 15px; font-weight:600; color:var(--green); display:flex; align-items:center; gap:8px;">';
					html += '    <i class="fa-solid fa-circle-check"></i> Converted via Order <a href="post.php?post=' + orderId + '&action=edit" target="_blank" style="text-decoration:underline; color:var(--green)">#' + orderId + '</a>';
					html += '  </div>';
					html += '</div>';
				}

				document.getElementById('v9-detail-cards').innerHTML=html;
				document.getElementById('v9-modal').classList.add('active');
				if(ip){geoLookup(ip,function(geo){var el=document.getElementById(safeGeoId);if(el)el.innerHTML='<i class="fa-solid fa-location-dot" style="margin-right:4px;color:var(--txt3)"></i><span class="v9-geo"><span class="v9-geo-flag">'+geo.flag+'</span><strong style="font-size:12px">'+safe(geo.city)+'</strong><span class="v9-geo-city" style="margin-left:3px">'+safe(geo.country)+'</span></span>';});}
			}
			function toggleModalView(){
				modalRawMode=!modalRawMode;
				document.getElementById('v9-detail-cards').classList.toggle('v9-hide',modalRawMode);
				document.getElementById('v9-json').classList.toggle('v9-hide',!modalRawMode);
				document.getElementById('btn-modal-toggle').innerHTML=modalRawMode?'<i class="fa-solid fa-address-card"></i> Structured':'<i class="fa-solid fa-code"></i> Raw JSON';
			}

			function exportFiltered(){
				if(!tblFiltered.length){toast('ไม่มีข้อมูลที่ filter อยู่','error');return;}
				var rows=tblFiltered;
				var flat=rows.map(function(r){return DSLOG_flatten(r);});
				var allKeys={};
				flat.forEach(function(r){Object.keys(r).forEach(function(k){allKeys[k]=1;});});
				var keys=Object.keys(allKeys);
				var csv=keys.map(function(k){return '"'+k+'"';}).join(',')+'\n';
				flat.forEach(function(r){csv+=keys.map(function(k){var v=r[k]===undefined?'':String(r[k]);return '"'+v.replace(/"/g,'""')+'"';}).join(',')+'\n';});
				var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
				var url=URL.createObjectURL(blob);
				var a=document.createElement('a');a.href=url;a.download='dslog_filtered_'+new Date().toISOString().split('T')[0]+'.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
				toast('Export '+rows.length+' rows สำเร็จ');
			}
			function DSLOG_flatten(obj,pfx){
				pfx=pfx||'';var res={};
				Object.keys(obj).forEach(function(k){
					var v=obj[k]; var nk=pfx?pfx+'_'+k:k;
					if(v&&typeof v==='object'&&!Array.isArray(v)){var sub=DSLOG_flatten(v,nk);Object.assign(res,sub);}
					else if(Array.isArray(v)){res[nk]=JSON.stringify(v);}
					else{res[nk]=v;}
				});
				return res;
			}
			function mkChart(id,cfg){
				var inst=ci[id]; if(inst)inst.destroy();
				var ctx=document.getElementById(cfg.canvasId);
				if(!ctx)return null;
				ci[id]=new Chart(ctx.getContext('2d'),{type:cfg.type,data:cfg.data,options:Object.assign({responsive:true,maintainAspectRatio:false},cfg.opts||{})});
				return ci[id];
			}
			function platBadge(p){
				var map={Line:'green',Facebook:'blue',Email:'gold',Instagram:'purple'}; var cls=map[p]||'gray';
				return '<span class="v9-badge '+cls+'">'+safe(p)+'</span>';
			}
			function dateRange(startId,endId,rangeId,customId){
				var rangeEl=document.getElementById(rangeId); if(!rangeEl)return{s:new Date('2000-01-01'),e:new Date()};
				var range=rangeEl.value;
				if(customId){var cEl=document.getElementById(customId);if(cEl)cEl.classList.toggle('v9-hide',range!=='custom');}
				var s=new Date('2000-01-01'),e=new Date(); e.setHours(23,59,59,999);
				if(range==='custom'){var sv=document.getElementById(startId).value,ev=document.getElementById(endId).value; if(sv)s=new Date(sv); if(ev){e=new Date(ev);e.setHours(23,59,59,999);}}
				else if(range!=='all'){s=new Date(); var mo={'7d':0,'1m':1,'3m':3,'6m':6,'1y':12}[range]||0; if(range==='7d')s.setDate(s.getDate()-7);else s.setMonth(s.getMonth()-mo); s.setHours(0,0,0,0);}
				return{s:s,e:e};
			}
			function filterReal(src){
				var seen=new Set();
				return src.filter(function(d){
					var c=d['ข้อมูลลูกค้า']||{},name=(c['ชื่อ']||'').trim(),plat=(c['แพลตฟอร์ม']||'').trim();
					if(!name||name==='-'||name==='ไม่ระบุ'||name.toLowerCase().includes('test'))return false;
					if(!plat||plat==='-'||plat==='ไม่ระบุ')return false;
					var k=name+'||'+plat; if(seen.has(k))return false; seen.add(k); return true;
				});
			}
			function doughOpts(){return{responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10},padding:10}}}};}

			function tab(name){
				curTab=name;
				document.querySelectorAll('[id^="pane-"]').forEach(function(p){p.classList.add('v9-hide');});
				document.querySelectorAll('.v9-tab').forEach(function(t){t.classList.remove('active');});
				var pane=document.getElementById('pane-'+name); if(pane)pane.classList.remove('v9-hide');
				var tabNames=['traffic','products','insights','logs','timeline','summary'];
				var idx=tabNames.indexOf(name);
				var tabs=document.querySelectorAll('.v9-tab'); if(tabs[idx])tabs[idx].classList.add('active');
				if(name==='timeline'&&raw.length)renderTimeline();
				if(name==='products'&&raw.length)renderProducts();
				if(name==='insights'&&raw.length)renderInsights();
				if(name==='summary'&&raw.length)renderSummary();
			}

			async function loadData(){
				load(true);
				try{
					var r1=await fetch(DSLOG_V7_Config.url+'?action=DSLOG_Deskspace_read_log&nonce='+DSLOG_V7_Config.nonce);
					var t1=await r1.text();
					if(t1.includes('Access Denied')){location.reload();return;}
					raw=t1.trim().split('\n').map(function(l){try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean)
						.sort(function(a,b){return new Date(b['บันทึกเมื่อ'])-new Date(a['บันทึกเมื่อ']);});

					var r2=await fetch(DSLOG_V7_Config.url+'?action=DSLOG_Deskspace_read_visits&nonce='+DSLOG_V7_Config.nonce);
					var t2=await r2.text();
					visits=t2.trim().split('\n').map(function(l){try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean);

					updateKPIs();
					renderSparklines();
					renderTraffic();
					renderTable();
					if(curTab==='products')renderProducts();
					if(curTab==='timeline')renderTimeline();
					if(curTab==='insights')renderInsights();
					if(curTab==='summary')renderSummary();
					toast('Data refreshed · '+raw.length+' logs · '+visits.length+' visits');
				}catch(e){console.error(e);toast('Failed to load','error');}
				load(false);
			}

			function updateKPIs(){
				var today=dte(new Date());
				var todayV=visits.filter(function(v){return v.timestamp&&v.timestamp.startsWith(today);}).length;
				var uIPs=new Set(visits.map(function(v){return v.ip;}));
				anim('kpi-views',visits.length); anim('kpi-users',uIPs.size); anim('kpi-logs',raw.length); anim('kpi-today',todayV);
			}

			function renderTraffic(){
				var dr=dateRange('tr-start','tr-end','tr-range','tr-custom');
				var fv=visits.filter(function(v){var d=new Date(v.timestamp);return d>=dr.s&&d<=dr.e;});

				var uIPs=new Set(fv.map(function(v){return v.ip;}));
				var days=Math.max(1,Math.ceil((dr.e-dr.s)/(864e5)));
				var sv=document.getElementById('tr-stat-views'),su=document.getElementById('tr-stat-uniq'),sd=document.getElementById('tr-stat-day');
				if(sv)sv.innerText=fv.length.toLocaleString();
				if(su)su.innerText=uIPs.size.toLocaleString();
				if(sd)sd.innerText=Math.round(fv.length/days).toLocaleString();

				var aggSel=document.getElementById('tr-agg').value;
				var agg=aggSel;
				if(agg==='auto'){
					if(days>180) agg='month';
					else if(days>45) agg='week';
					else agg='day';
				}

				function getKey(ts){
					var d=new Date(ts);
					if(agg==='month') return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
					if(agg==='week'){
						var tmp=new Date(d); tmp.setDate(tmp.getDate()-tmp.getDay());
						return tmp.toISOString().split('T')[0];
					}
					return ts.split(' ')[0];
				}

				var style=document.getElementById('tr-style').value;
				var vg={};
				fv.forEach(function(v){var dk=getKey(v.timestamp); if(!vg[dk])vg[dk]={views:0,ips:new Set()}; vg[dk].views++; vg[dk].ips.add(v.ip);});
				var dates=Object.keys(vg).sort();

				var xLabel=agg==='month'?'Month':agg==='week'?'Week (start)':'Date';

				var trendData={
					type:style,
					data:{labels:dates,datasets:[
						{label:'Page Views',data:dates.map(function(d){return vg[d].views;}),borderColor:'#2563eb',backgroundColor:style==='bar'?'rgba(37,99,235,.55)':'rgba(37,99,235,.12)',borderWidth:2,tension:.35,fill:style!=='bar',pointRadius:style==='bar'?0:dates.length>60?0:3,pointHoverRadius:5,borderRadius:style==='bar'?4:0},
						{label:'Unique Visitors',data:dates.map(function(d){return vg[d].ips.size;}),borderColor:'#059669',backgroundColor:style==='bar'?'rgba(5,150,105,.45)':'rgba(5,150,105,.08)',borderWidth:2,tension:.35,fill:style!=='bar',pointRadius:style==='bar'?0:dates.length>60?0:3,pointHoverRadius:5,borderRadius:style==='bar'?4:0}
					]},
					opts:{
						interaction:{mode:'index',intersect:false},
						plugins:{
							legend:{position:'top',labels:{boxWidth:10,font:{size:11},usePointStyle:true}},
							zoom:{pan:{enabled:true,mode:'x'},zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:'x',onZoomComplete:function(){document.getElementById('tr-zoom-reset').style.display='';}}}
						},
						scales:{
							x:{grid:{display:false},ticks:{font:{size:10},maxTicksLimit:dates.length>90?16:dates.length>30?12:dates.length,maxRotation:45},title:{display:true,text:xLabel,color:'#aaa89f',font:{size:10}}},
							y:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}}
						}
					}
				};
				mkChart('trTrend',{canvasId:'cv-tr-trend',type:trendData.type,data:trendData.data,opts:trendData.opts});

				var dvc={};
				fv.forEach(function(v){var k=v.device||'Unknown'; dvc[k]=(dvc[k]||0)+1;});
				mkChart('trDev',{canvasId:'cv-tr-device',type:'doughnut',data:{labels:Object.keys(dvc),datasets:[{data:Object.values(dvc),backgroundColor:Object.keys(dvc).map(function(_,i){return col(i);}),borderWidth:2,borderColor:'#fff',hoverOffset:6}]},opts:doughOpts()});

				var src={};
				fv.forEach(function(v){var s=v.source||'Direct',k='Direct'; if(s.includes('google'))k='Google'; else if(s.includes('facebook')||s.includes('fbclid'))k='Facebook'; else if(s.includes('line'))k='Line'; else if(s.includes('instagram'))k='Instagram'; src[k]=(src[k]||0)+1;});
				mkChart('trSrc',{canvasId:'cv-tr-src',type:'doughnut',data:{labels:Object.keys(src),datasets:[{data:Object.values(src),backgroundColor:Object.keys(src).map(function(_,i){return col(i+3);}),borderWidth:2,borderColor:'#fff',hoverOffset:6}]},opts:doughOpts()});

				var hrs=new Array(24).fill(0);
				fv.forEach(function(v){if(v.timestamp){var h=parseInt(v.timestamp.split(' ')[1]||'0');if(h>=0&&h<24)hrs[h]++;}});
				var hrLabels=['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
				var maxHr=Math.max.apply(null,hrs)||1;
				mkChart('trHour',{canvasId:'cv-tr-hour',type:'bar',data:{labels:hrLabels,datasets:[{label:'Visits',data:hrs,backgroundColor:hrs.map(function(v){var a=0.2+0.7*(v/maxHr);return 'rgba(37,99,235,'+a.toFixed(2)+')';}),borderColor:'#2563eb',borderWidth:0,borderRadius:3}]},opts:{plugins:{legend:{display:false},tooltip:{callbacks:{title:function(i){return i[0].label+':00 น.'}}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:9}}}}}});

				var dowNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
				var dow=new Array(7).fill(0);
				fv.forEach(function(v){if(v.timestamp){var d=new Date(v.timestamp);dow[d.getDay()]++;}});
				var maxDow=Math.max.apply(null,dow)||1;
				mkChart('trDow',{canvasId:'cv-tr-dow',type:'bar',data:{labels:dowNames,datasets:[{label:'Visits',data:dow,backgroundColor:dow.map(function(v){var a=0.2+0.7*(v/maxDow);return 'rgba(5,150,105,'+a.toFixed(2)+')';}),borderColor:'#059669',borderWidth:0,borderRadius:4}]},opts:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:9}}}}}});
			}

			function resetTrendZoom(){
				if(ci['trTrend']){ci['trTrend'].resetZoom(); document.getElementById('tr-zoom-reset').style.display='none';}
			}

			function getProductData(){
				var dr=dateRange('pd-start','pd-end','pd-range','pd-custom');
				var f=raw.filter(function(d){var dt=new Date(d['บันทึกเมื่อ']);return dt>=dr.s&&dt<=dr.e;});
				if(document.getElementById('pd-real').checked)f=filterReal(f);

				var deskFilter=document.getElementById('pd-desk-filter').value;
				if(deskFilter&&deskFilter!=='all'){
					f=f.filter(function(d){var s=d['สเปคโต๊ะ']||{};return (s['ประเภท']||s['รุ่นโต๊ะ']||'')=== deskFilter;});
				}
				return f;
			}

			function populateDeskFilter(){
				var types=new Set(raw.map(function(d){var s=d['สเปคโต๊ะ']||{};return s['ประเภท']||s['รุ่นโต๊ะ']||'';}));
				var sel=document.getElementById('pd-desk-filter');
				var cur=sel.value;
				sel.innerHTML='<option value="all">All Desk Types</option>';
				Array.from(types).filter(Boolean).sort().forEach(function(t){
					var o=document.createElement('option');o.value=t;o.textContent=t;sel.appendChild(o);
				});
				if(cur)sel.value=cur;
			}

			function trendChart(canvasKey,canvasId,data,keyFn,styleId){
				var styleEl=document.getElementById(styleId);
				var style=styleEl?styleEl.value:'bar';
				var sorted=[].concat(data).sort(function(a,b){return new Date(a['บันทึกเมื่อ'])-new Date(b['บันทึกเมื่อ']);});
				var firstDate=sorted.length?new Date(sorted[0]['บันทึกเมื่อ']):new Date();
				var lastDate=sorted.length?new Date(sorted[sorted.length-1]['บันทึกเมื่อ']):new Date();
				var spanDays=Math.max(1,Math.ceil((lastDate-firstDate)/(864e5)));
				var useMonthly=spanDays>60;

				function getKey(ts){
					if(useMonthly) return ts.substring(0,7);
					return ts.split(' ')[0];
				}

				var grps={},labs=[];
				sorted.forEach(function(d){
					var dk=getKey(d['บันทึกเมื่อ']);
					if(labs.indexOf(dk)===-1)labs.push(dk);
					var k=keyFn(d)||'Unknown';
					if(!grps[k])grps[k]={};
					grps[k][dk]=(grps[k][dk]||0)+1;
				});

				var sortedGrps=Object.keys(grps).sort(function(a,b){
					var sa=labs.reduce(function(t,l){return t+(grps[a][l]||0);},0);
					var sb=labs.reduce(function(t,l){return t+(grps[b][l]||0);},0);
					return sb-sa;
				}).slice(0,10);

				var richColors=['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#dc2626','#16a34a','#db2777','#ea580c','#6366f1'];
				var ds=sortedGrps.map(function(k,i){
					var c=richColors[i%richColors.length];
					return{label:k,data:labs.map(function(d){return grps[k][d]||0;}),backgroundColor:style==='bar'?c+'99':c+'33',borderColor:c,borderWidth:2,tension:.3,fill:false,pointRadius:0,pointHoverRadius:4,borderRadius:style==='bar'?3:0};
				});

				mkChart(canvasKey,{canvasId:canvasId,type:style,data:{labels:labs,datasets:ds},opts:{
					interaction:{mode:'index',intersect:false},
					scales:{
						x:{stacked:style==='bar',grid:{display:false},ticks:{font:{size:9},maxTicksLimit:14,maxRotation:45},title:{display:true,text:useMonthly?'Month':'Date',color:'#aaa89f',font:{size:9}}},
						y:{stacked:style==='bar',beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}}
					},
					plugins:{
						legend:{position:'top',labels:{boxWidth:8,font:{size:10},usePointStyle:true}},
						zoom:{pan:{enabled:true,mode:'x'},zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:'x'}}
					}
				}});
			}

			function doughChart(key,id,data,keyFn){
				var counts={};
				data.forEach(function(d){var k=keyFn(d)||'Unknown'; counts[k]=(counts[k]||0)+1;});
				var sorted=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
				var richColors=['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#dc2626','#16a34a','#db2777','#ea580c','#6366f1','#84cc16','#f43f5e'];
				mkChart(key,{canvasId:id,type:'doughnut',data:{labels:sorted.map(function(x){return x[0];}),datasets:[{data:sorted.map(function(x){return x[1];}),backgroundColor:sorted.map(function(_,i){return richColors[i%richColors.length];}),borderWidth:2,borderColor:'#fff',hoverOffset:8}]},opts:doughOpts()});
			}

			function renderProducts(){
				populateDeskFilter();
				var data=getProductData();
				var types=new Set(data.map(function(d){var s=d['สเปคโต๊ะ']||{};return s['ประเภท']||s['รุ่นโต๊ะ']||'?';}));
				var colors=new Set(data.map(function(d){var s=d['สเปคโต๊ะ']||{};return s['สีท็อป']||'?';}));
				var plats=new Set(data.map(function(d){var c=d['ข้อมูลลูกค้า']||{};return c['แพลตฟอร์ม']||'?';}));
				document.getElementById('pd-total').innerText=data.length.toLocaleString();
				document.getElementById('pd-types').innerText=types.size;
				document.getElementById('pd-colors').innerText=colors.size;
				document.getElementById('pd-platforms').innerText=plats.size;

				trendChart('pdTypeTrend','cv-pd-type-trend',data,function(d){var s=d['สเปคโต๊ะ']||{};return s['ประเภท']||s['รุ่นโต๊ะ'];},'pd-type-style');
				trendChart('pdColorTrend','cv-pd-color-trend',data,function(d){var s=d['สเปคโต๊ะ']||{};return s['สีท็อป'];},'pd-color-style');
				trendChart('pdPlatTrend','cv-pd-plat-trend',data,function(d){var c=d['ข้อมูลลูกค้า']||{};return c['แพลตฟอร์ม'];},'pd-type-style');

				var mo={};
				data.forEach(function(d){var ym=d['บันทึกเมื่อ'].substring(0,7); mo[ym]=(mo[ym]||0)+1;});
				var moKeys=Object.keys(mo).sort();
				mkChart('pdMonthly',{canvasId:'cv-pd-monthly',type:'bar',data:{labels:moKeys,datasets:[{label:'Configs/Month',data:moKeys.map(function(k){return mo[k];}),backgroundColor:'rgba(37,99,235,.55)',borderColor:'#2563eb',borderWidth:0,borderRadius:5}]},opts:{plugins:{legend:{display:false},zoom:{pan:{enabled:true,mode:'x'},zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:'x'}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}}}}});

				var legCounts={};
				data.forEach(function(d){
					var s=d['สเปคโต๊ะ']||{};
					var leg=s['ขาโต๊ะ']||s['ประเภทขา']||s['Leg_Type']||s['leg']||s['Table_Leg']||'';
					if(!leg&&s['สเปค_ขาโต๊ะ'])leg=s['สเปค_ขาโต๊ะ'];
					if(leg&&leg!=='-'&&leg!=='ไม่ระบุ') legCounts[leg]=(legCounts[leg]||0)+1;
				});
				var legEntries=Object.entries(legCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,12);
				var legTotal=legEntries.reduce(function(t,e){return t+e[1];},0);
				var legEl=document.getElementById('pd-leg-count');
				if(legEl) legEl.textContent=legTotal>0?legTotal+' records':'ยังไม่มีข้อมูล';
				if(legEntries.length){
					var richColors=['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#dc2626','#16a34a','#db2777','#ea580c','#6366f1','#84cc16','#f43f5e'];
					mkChart('pdLegs',{canvasId:'cv-pd-legs',type:'bar',data:{
						labels:legEntries.map(function(e){return e[0];}),
						datasets:[{label:'Count',data:legEntries.map(function(e){return e[1];}),backgroundColor:legEntries.map(function(_,i){return richColors[i%richColors.length]+'cc';}),borderColor:legEntries.map(function(_,i){return richColors[i%richColors.length];}),borderWidth:1,borderRadius:5}]
					},opts:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:11}}}}}});
				} else {
					var ctx=document.getElementById('cv-pd-legs');
					if(ctx){var parent=ctx.parentNode; parent.innerHTML='<div class="v9-empty"><i class="fa-solid fa-chair"></i><p style="font-size:12px">ยังไม่มีข้อมูลขาโต๊ะ<br><span style="font-size:11px;color:var(--txt3)">ตรวจสอบ field: ขาโต๊ะ / ประเภทขา / Leg_Type</span></p></div>';}
				}

				var colorCounts={};
				data.forEach(function(d){var s=d['สเปคโต๊ะ']||{};var c=s['สีท็อป']||'';if(c&&c!=='-')colorCounts[c]=(colorCounts[c]||0)+1;});
				var topColors=Object.entries(colorCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,12);
				if(topColors.length){
					var tcColors=['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#dc2626','#16a34a','#db2777','#ea580c','#6366f1','#84cc16','#f43f5e'];
					mkChart('pdTopColors',{canvasId:'cv-pd-top-colors',type:'bar',data:{
						labels:topColors.map(function(e){return e[0];}),
						datasets:[{label:'Orders',data:topColors.map(function(e){return e[1];}),backgroundColor:topColors.map(function(_,i){return tcColors[i%tcColors.length]+'cc';}),borderColor:topColors.map(function(_,i){return tcColors[i%tcColors.length];}),borderWidth:1,borderRadius:5}]
					},opts:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var total=topColors.reduce(function(t,e){return t+e[1];},0);return ' '+ctx.parsed.x+' ('+Math.round(ctx.parsed.x/total*100)+'%)';}}}},scales:{x:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});
				}

				var sizeBuckets={'< 80cm':0,'80\u2013100cm':0,'101\u2013120cm':0,'121\u2013140cm':0,'141\u2013160cm':0,'> 160cm':0,'ไม่ระบุ':0};
				data.forEach(function(d){
					var s=d['สเปคโต๊ะ']||{};
					var w=parseFloat(s['ความกว้าง_Main_cm']||s['ขนาด Main (กว้างxยาว)']||0);
					if(!w)sizeBuckets['ไม่ระบุ']++;
					else if(w<80)sizeBuckets['< 80cm']++;
					else if(w<=100)sizeBuckets['80\u2013100cm']++;
					else if(w<=120)sizeBuckets['101\u2013120cm']++;
					else if(w<=140)sizeBuckets['121\u2013140cm']++;
					else if(w<=160)sizeBuckets['141\u2013160cm']++;
					else sizeBuckets['> 160cm']++;
				});
				var szKeys=Object.keys(sizeBuckets).filter(function(k){return sizeBuckets[k]>0;});
				mkChart('pdSizes',{canvasId:'cv-pd-sizes',type:'bar',data:{
					labels:szKeys,
					datasets:[{label:'Count',data:szKeys.map(function(k){return sizeBuckets[k];}),backgroundColor:'rgba(8,145,178,.55)',borderColor:'#0891b2',borderWidth:0,borderRadius:5}]
				},opts:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}}}}});

				var typeCounts={};
				data.forEach(function(d){var s=d['สเปคโต๊ะ']||{};var t=s['ประเภท']||s['รุ่นโต๊ะ']||'';if(t&&t!=='-')typeCounts[t]=(typeCounts[t]||0)+1;});
				var topTypes=Object.entries(typeCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
				if(topTypes.length){
					var ttColors=['#7c3aed','#2563eb','#059669','#0891b2','#d97706','#dc2626','#16a34a','#db2777','#ea580c','#6366f1'];
					mkChart('pdTopTypes',{canvasId:'cv-pd-top-types',type:'bar',data:{
						labels:topTypes.map(function(e){return e[0];}),
						datasets:[{label:'Count',data:topTypes.map(function(e){return e[1];}),backgroundColor:topTypes.map(function(_,i){return ttColors[i%ttColors.length]+'99';}),borderColor:topTypes.map(function(_,i){return ttColors[i%ttColors.length];}),borderWidth:1,borderRadius:5}]
					},opts:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});
				}

				doughChart('pdPropType','cv-pd-prop-type',data,function(d){var s=d['สเปคโต๊ะ']||{};return s['ประเภท']||s['รุ่นโต๊ะ'];});
				doughChart('pdPropColor','cv-pd-prop-color',data,function(d){var s=d['สเปคโต๊ะ']||{};return s['สีท็อป'];});
				doughChart('pdPropPlat','cv-pd-prop-plat',data,function(d){var c=d['ข้อมูลลูกค้า']||{};return c['แพลตฟอร์ม'];});
				doughChart('pdPropDev','cv-pd-prop-dev',data,function(d){return d['Device_Type']||'Desktop';});
			}

			function sortTable(col){
				if(tblSortCol===col){tblSortDir=tblSortDir==='asc'?'desc':'asc';}
				else{tblSortCol=col;tblSortDir='asc';}
				document.querySelectorAll('.v9-sortable').forEach(function(th){th.classList.remove('asc','desc');});
				var th=document.querySelector('[data-col="'+col+'"]');
				if(th)th.classList.add(tblSortDir);
				renderTable();
			}
			function renderTable(){
				var q=document.getElementById('tbl-q').value.toLowerCase();
				var useReal=document.getElementById('tbl-real').checked;
				var range=document.getElementById('tbl-range').value;
				document.getElementById('tbl-custom').classList.toggle('v9-hide',range!=='custom');
				var sD=document.getElementById('tbl-start').value,eD=document.getElementById('tbl-end').value;

				var f=raw.filter(function(d){
					var date=d['บันทึกเมื่อ'].split(' ')[0];
					var c=d['ข้อมูลลูกค้า']||{},s=d['สเปคโต๊ะ']||{};
					var txt=((c['ชื่อ']||'')+' '+(c['แพลตฟอร์ม']||'')+' '+(s['ประเภท']||'')+' '+(s['สีท็อป']||'')+' '+(d['IP_Address']||'')+' '+(d['Account_Name']||'')).toLowerCase();
					if(range!=='all'&&range!=='custom'){var dr=dateRange('tbl-start','tbl-end','tbl-range',null);if(new Date(d['บันทึกเมื่อ'])<dr.s)return false;}
					if(range==='custom'){if(sD&&date<sD)return false;if(eD&&date>eD)return false;}
					if(q&&!txt.includes(q))return false;
					return true;
				});
				if(useReal)f=filterReal(f);
				if(pinnedOnly)f=f.filter(function(d){return pinnedIds[d.log_id];});

				f.sort(function(a,b){
					var va,vb;
					var ca=a['ข้อมูลลูกค้า']||{},sa=a['สเปคโต๊ะ']||{};
					var cb=b['ข้อมูลลูกค้า']||{},sb=b['สเปคโต๊ะ']||{};
					if(tblSortCol==='date'){va=a['บันทึกเมื่อ']||'';vb=b['บันทึกเมื่อ']||'';}
					else if(tblSortCol==='name'){va=ca['ชื่อ']||'';vb=cb['ชื่อ']||'';}
					else if(tblSortCol==='type'){va=sa['ประเภท']||sa['รุ่นโต๊ะ']||'';vb=sb['ประเภท']||sb['รุ่นโต๊ะ']||'';}
					else if(tblSortCol==='color'){va=sa['สีท็อป']||'';vb=sb['สีท็อป']||'';}
					else{va='';vb='';}
					var cmp=va.localeCompare(vb,undefined,{sensitivity:'base'});
					return tblSortDir==='asc'?cmp:-cmp;
				});

				tblFiltered=f;
				var total=f.length,maxP=Math.ceil(total/tblSize)||1;
				if(tblPage>maxP)tblPage=maxP; if(tblPage<1)tblPage=1;
				var si=(tblPage-1)*tblSize,ei=Math.min(si+tblSize,total);
				var tbody=document.getElementById('tbl-body'); tbody.innerHTML='';

				if(!total){
					tbody.innerHTML='<tr><td colspan="11"><div class="v9-empty"><i class="fa-solid fa-inbox"></i><p>No records found</p></div></td></tr>';
				} else {
					var rows_html=[];
					var geo_queue=[];
					f.slice(si,ei).forEach(function(d){
						var c=d['ข้อมูลลูกค้า']||{},s=d['สเปคโต๊ะ']||{};
						var cName=c['ชื่อ']||'-',cPlat=c['แพลตฟอร์ม']||'-';
						var tType=s['ประเภท']||s['รุ่นโต๊ะ']||'-',tColor=s['สีท็อป']||'-';
						var devType=d['Device_Type']||'Desktop';
						var warnCode=d['Warning_Code']||'';
						var ip=d['IP_Address']||'';
						var userStatus=d['User_Status']||'';
						var accountName=d['Account_Name']||'Admin';
						var isRedIP=ip.startsWith('49.228.2');
						var isBlueIP=['58.136.235.21','49.230.56.201'].indexOf(ip)!==-1;
						var isAdminLog=!!(d['Admin_Mode']===true||d['Admin_Mode']==='true'||d['Admin_Mode']===1);
						var rowClass=(warnCode==='collision'?'warn-c':warnCode==='gap_changed'?'warn-g':isAdminLog?'warn-a':'')+(pinnedIds[d.log_id]?' pinned-row':'');

						var devIcon=devType==='Mobile'?'<i class="fa-solid fa-mobile-screen-button"></i>':'<i class="fa-solid fa-desktop"></i>';
						if(cPlat==='Email')devIcon='<i class="fa-solid fa-envelope" style="color:#b69652"></i>';
						var iStyle=isRedIP?'color:var(--red)':isBlueIP?'color:var(--blue)':'color:var(--txt3)';
						var adminHtml='';
						if(userStatus.includes('Logged In')){adminHtml='<span class="v9-admin-badge" title="Admin: '+safe(accountName)+'"><img src="'+ADMIN_ICO+'" style="width:14px;height:14px;border-radius:2px;vertical-align:middle;margin-left:3px;" onerror="this.style.display=\'none\'"></span>';}
						var firstCol=selMode?'<input type="checkbox" class="dsl-chk-row" value="'+d.log_id+'" style="transform:scale(1.2);cursor:pointer;">':'<span style="'+iStyle+'">'+devIcon+'</span>'+adminHtml;

						var isPinned=!!pinnedIds[d.log_id];
						var pinBtn='<button class="v9-pin-btn'+(isPinned?' pinned':'')+'" data-pin-id="'+d.log_id+'" onclick="DSLOG_V7_App.pinRow(\''+d.log_id+'\')" title="'+(isPinned?'Unpin':'Pin')+'"><i class="fa-solid fa-bookmark"></i></button>';

						var snapUrl=d['รูปภาพ_Snapshot']||'';
						var img=snapUrl?'<div class="v9-thumb" onclick="DSLOG_V7_App.openImg(\''+snapUrl.replace(/'/g, "\\'")+'\')" title="View snapshot"><img src="'+snapUrl+'" loading="lazy"></div>':'<span style="color:var(--txt3)">\u2014</span>';
						var sz='-',mD='',sD2='';
						if(s['ความกว้าง_Main_cm']){mD=s['ความกว้าง_Main_cm']+' x '+s['ความยาว_Main_cm'];var lw=s['ความกว้าง_L_cm'],ll=s['ความยาว_L_cm'];if(lw&&lw!=='-'&&lw!=='0'&&ll&&ll!=='-'&&ll!=='0')sD2=lw+' x '+ll;}
						else if(s['ขนาด Main (กว้างxยาว)']){mD=(s['ขนาด Main (กว้างxยาว)']||'').replace(' cm','').trim();var lv=s['ขนาด L-Side (กว้างxยาว)'];if(lv&&lv!=='-'&&lv!=='ไม่ระบุ')sD2=lv.replace(' cm','').trim();}
						else if(s['ขนาดโต๊ะ (กว้างxยาว)']){mD=(s['ขนาดโต๊ะ (กว้างxยาว)']||'').replace(' cm','').trim();}
						if(mD&&mD!=='undefined x undefined')sz=sD2?(mD+' + '+sD2+' cm'):(mD+' cm');

						var geoId='geo-'+d.log_id;
						var geoCell='<td><div id="'+geoId+'" class="v9-geo"><span style="color:var(--txt3);font-size:10px">···</span></div></td>';
						rows_html.push('<tr class="'+rowClass+'">'
							+'<td style="text-align:center">'+firstCol+'</td>'
							+'<td style="text-align:center">'+pinBtn+'</td>'
							+'<td style="font-family:var(--mono);font-size:11.5px;color:var(--txt2);white-space:nowrap">'+d['บันทึกเมื่อ']+'</td>'
							+'<td style="font-weight:500">'+safe(cName)+'</td>'
							+'<td>'+platBadge(cPlat)+'</td>'
							+'<td>'+safe(tType)+'</td>'
							+'<td>'+safe(tColor)+'</td>'
							+'<td style="font-family:var(--mono);font-size:10.5px;white-space:normal;line-height:1.4">'+safe(sz)+'</td>'
							+geoCell
							+'<td>'+img+'</td>'
							+'<td style="text-align:center;white-space:nowrap;overflow:visible">'
								+'<button class="v9-btn sm ico" onclick="DSLOG_V7_App.view(\''+d.log_id+'\')" title="View Detail"><i class="fa-solid fa-eye"></i></button> '
								+'<button class="v9-btn sm ico danger" onclick="DSLOG_V7_App.del(\''+d.log_id+'\')" title="Delete"><i class="fa-solid fa-trash"></i></button>'
							+'</td>'
							+'</tr>');

						if(ip)geo_queue.push({id:d.log_id,ip:ip});
					});
					tbody.innerHTML=rows_html.join('');
					geo_queue.forEach(function(item,idx){
						setTimeout(function(){
							geoLookup(item.ip,function(geo){
								var el=document.getElementById('geo-'+item.id);
								if(el)el.innerHTML='<span class="v9-geo-flag">'+geo.flag+'</span><span class="v9-geo-city">'+safe(geo.city)+'</span>';
							});
						},idx*120);
					});
				}

				document.getElementById('tbl-info').innerText='Showing '+(total>0?si+1:0)+'\u2013'+ei+' of '+total+' entries';
				document.getElementById('tbl-pg').innerText='Page '+tblPage+' / '+maxP;
				var prev=document.getElementById('btn-prev'),next=document.getElementById('btn-next');
				prev.disabled=(tblPage<=1); next.disabled=(tblPage>=maxP);
				updatePinCount();
			}

			function renderTimeline(){
				var lim=document.getElementById('tl-limit').value;
				var useReal=document.getElementById('tl-real').checked;
				var platFilter=document.getElementById('tl-plat').value;
				var warnFilter=document.getElementById('tl-warn').value;
				var q=(document.getElementById('tl-q').value||'').toLowerCase();
				var data=[].concat(raw);
				if(useReal)data=filterReal(data);
				if(platFilter!=='all')data=data.filter(function(d){return(d['ข้อมูลลูกค้า']||{})['แพลตฟอร์ม']=== platFilter;});
				if(warnFilter==='collision')data=data.filter(function(d){return d['Warning_Code']==='collision';});
				else if(warnFilter==='gap_changed')data=data.filter(function(d){return d['Warning_Code']==='gap_changed';});
				else if(warnFilter==='clean')data=data.filter(function(d){return !d['Warning_Code'];});
				if(q)data=data.filter(function(d){
					var c=d['ข้อมูลลูกค้า']||{},s=d['สเปคโต๊ะ']||{};
					return ((c['ชื่อ']||'')+' '+(c['แพลตฟอร์ม']||'')+' '+(s['ประเภท']||'')+' '+(s['สีท็อป']||'')+' '+(d['Warning_Code']||'')).toLowerCase().includes(q);
				});
				if(lim!=='all')data=data.slice(0,parseInt(lim));
				var container=document.getElementById('tl-body');
				if(!data.length){container.innerHTML='<div class="v9-empty"><i class="fa-regular fa-clock"></i><p>No data found</p></div>';return;}
				container.innerHTML='';
				data.forEach(function(d){
					var c=d['ข้อมูลลูกค้า']||{},s=d['สเปคโต๊ะ']||{};
					var name=c['ชื่อ']||'ไม่ระบุ',plat=c['แพลตฟอร์ม']||'-';
					var type=s['ประเภท']||s['รุ่นโต๊ะ']||'-',color=s['สีท็อป']||'-';
					var warn=d['Warning_Code']||';';
					var isAdminLogTL=!!(d['Admin_Mode']===true||d['Admin_Mode']==='true'||d['Admin_Mode']===1);
					var dotCls=warn==='collision'?'red':warn==='gap_changed'?'amber':isAdminLogTL?'orange':'blue';
					var snap=d['รูปภาพ_Snapshot']||'';
					var snapHtml=snap?'<img src="'+snap+'" style="width:52px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--bdr);flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();DSLOG_V7_App.openImg(\''+snap+'\')" loading="lazy">':'';
					var adminTL='';
					if((d['User_Status']||'').includes('Logged In')){adminTL='<img src="'+ADMIN_ICO+'" style="width:13px;height:13px;border-radius:2px;vertical-align:middle;" onerror="this.style.display=\'none\'">';}
					var opts=d['รายการ_Options']||[];
					var optBadge=opts.length?'<span class="v9-badge gray" style="font-size:10px"><i class="fa-solid fa-puzzle-piece"></i> '+opts.length+'</span>':'';
					container.innerHTML+='<div class="v9-tl-item"><div class="v9-tl-dot '+dotCls+'"></div>'
						+'<div class="v9-tl-card" onclick="DSLOG_V7_App.view(\''+d.log_id+'\')" style="display:flex;gap:10px;align-items:flex-start">'
							+snapHtml
							+'<div style="flex:1;min-width:0">'
								+'<div class="v9-tl-time">'+d['บันทึกเมื่อ']+'</div>'
								+'<div class="v9-tl-name">'+safe(name)+' '+adminTL+'</div>'
								+'<div class="v9-tl-meta" style="flex-wrap:wrap">'
									+'<span>'+platBadge(plat)+'</span>'
									+(type!=='-'?'<span><i class="fa-solid fa-table-columns" style="color:var(--txt3)"></i> '+safe(type)+'</span>':'')
									+(color!=='-'?'<span><i class="fa-solid fa-palette" style="color:var(--txt3)"></i> '+safe(color)+'</span>':'')
									+(warn==='collision'?'<span class="v9-badge red"><i class="fa-solid fa-triangle-exclamation"></i> Collision</span>':'')
									+(warn==='gap_changed'?'<span class="v9-badge amber">Gap Changed</span>':'')
									+(isAdminLogTL?'<span class="v9-badge orange"><i class="fa-solid fa-lock"></i> Admin</span>':'')
									+optBadge
								+'</div>'
							+'</div>'
						+'</div></div>';
				});
			}

			function view(id){
				var item=raw.find(function(x){return x.log_id===id;});
				if(!item)return;
				showDetailModal(item);
			}
			function openImg(src){
				var url=src;
				if(!src.startsWith('http')){
					var item=raw.find(function(x){return x.log_id===src;});
					if(item&&item['รูปภาพ_Snapshot'])url=item['รูปภาพ_Snapshot'];
					else return;
				}
				document.getElementById('v9-img').src=url;
				document.getElementById('v9-img-dl').href=url;
				document.getElementById('v9-img-modal').classList.add('active');
			}
			function copyJson(){
				var txt=curJson||'{}';
				navigator.clipboard.writeText(txt).then(function(){toast('JSON copied!');}).catch(function(){var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('JSON copied!');}catch(e){toast('Copy failed','error');}ta.remove();});
			}

			async function del(id){
				if(!confirm('ยืนยันการลบรายการนี้?'))return;
				var fd=new FormData(); fd.append('action','DSLOG_Deskspace_delete_entry'); fd.append('id',id); fd.append('password','y'); fd.append('nonce',DSLOG_V7_Config.nonce);
				try{var r=await fetch(DSLOG_V7_Config.url,{method:'POST',body:fd}); var j=await r.json(); if(j.success){toast(j.data.msg);loadData();}else toast(j.data.msg,'error');}
				catch(e){toast('Server Error','error');}
			}
			async function delBulk(){
				var chks=document.querySelectorAll('.dsl-chk-row:checked');
				if(!chks.length){alert('กรุณาเลือกรายการ');return;}
				var ids=Array.from(chks).map(function(c){return c.value;});
				if(!confirm('ลบ '+ids.length+' รายการ?'))return;
				var fd=new FormData(); fd.append('action','DSLOG_Deskspace_delete_bulk'); fd.append('ids',JSON.stringify(ids)); fd.append('password','y'); fd.append('nonce',DSLOG_V7_Config.nonce);
				try{var r=await fetch(DSLOG_V7_Config.url,{method:'POST',body:fd}); var j=await r.json(); if(j.success){toast(j.data.msg);toggleSel();loadData();}else toast(j.data.msg,'error');}
				catch(e){toast('Server Error','error');}
			}
			function toggleSel(){
				selMode=!selMode;
				var bs=document.getElementById('btn-sel'),bb=document.getElementById('btn-bulk');
				if(selMode){bs.classList.add('primary');bs.innerHTML='<i class="fa-solid fa-xmark"></i> Cancel';bb.classList.remove('v9-hide');}
				else{bs.classList.remove('primary');bs.innerHTML='<i class="fa-regular fa-square-check"></i> Select';bb.classList.add('v9-hide');}
				renderTable();
			}

			async function reset2FA(){
				if(!confirm('รีเซ็ต 2FA ใช่หรือไม่?'))return;
				var fd=new FormData(); fd.append('action','DSLOG_Deskspace_reset_2fa'); fd.append('nonce',DSLOG_V7_Config.nonce);
				try{var r=await fetch(DSLOG_V7_Config.url,{method:'POST',body:fd}); var j=await r.json(); if(j.success){alert(j.data.msg);location.reload();}}catch(e){alert('Error');}
			}

			document.getElementById('tbl-q').addEventListener('keyup',function(e){if(e.key==='Enter'){tblPage=1;renderTable();}});
			document.getElementById('tbl-range').addEventListener('change',function(){tblPage=1;renderTable();});
			document.getElementById('tbl-start').addEventListener('change',function(){tblPage=1;renderTable();});
			document.getElementById('tbl-end').addEventListener('change',function(){tblPage=1;renderTable();});
			document.getElementById('btn-prev').addEventListener('click',function(){if(tblPage>1){tblPage--;renderTable();}});
			document.getElementById('btn-next').addEventListener('click',function(){var mp=Math.ceil(tblFiltered.length/tblSize)||1;if(tblPage<mp){tblPage++;renderTable();}});

			function renderInsights(){
				var data=raw;
				if(document.getElementById('ins-real').checked)data=filterReal(data);
				var totalVisits=visits.length;
				var totalSaves=data.length;

				if(!totalVisits&&!totalSaves){
					var fi=document.getElementById('cv-ins-funnel');if(fi)fi.parentNode.innerHTML='<div class="v9-empty"><i class="fa-solid fa-chart-bar"></i><p>ยังไม่มีข้อมูล</p></div>';
					var ci2=document.getElementById('cv-ins-conv-plat');if(ci2)ci2.parentNode.innerHTML='<div class="v9-empty"><i class="fa-solid fa-chart-bar"></i><p>ยังไม่มีข้อมูล</p></div>';
				}
				var funnelData=[
					{label:'Total Visits',val:totalVisits,color:'#2563eb'},
					{label:'Configs Saved',val:totalSaves,color:'#059669'},
					{label:'With Customer Info',val:data.filter(function(d){var c=d['ข้อมูลลูกค้า']||{};return !!(c['ชื่อ']&&c['ชื่อ']!=='-');}).length,color:'#7c3aed'},
					{label:'With Platform',val:data.filter(function(d){var c=d['ข้อมูลลูกค้า']||{};return !!(c['แพลตฟอร์ม']&&c['แพลตฟอร์ม']!=='-');}).length,color:'#0891b2'}
				];
				var maxF=funnelData[0].val||1;
				mkChart('insFunnel',{canvasId:'cv-ins-funnel',type:'bar',data:{
					labels:funnelData.map(function(f){return f.label;}),
					datasets:[{data:funnelData.map(function(f){return f.val;}),backgroundColor:funnelData.map(function(f){return f.color+'cc';}),borderColor:funnelData.map(function(f){return f.color;}),borderWidth:1,borderRadius:6}]
				},opts:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var pct=maxF?Math.round(ctx.parsed.x/maxF*100):0;return ' '+ctx.parsed.x.toLocaleString()+' ('+pct+'%)';}}}},scales:{x:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:11}}}}}});

				var platVis={},platSave={};
				visits.forEach(function(v){
					var s=(v.source||'').toLowerCase();
					var k='Direct';
					if(s.includes('line'))k='Line';
					else if(s.includes('facebook')||s.includes('fbclid'))k='Facebook';
					else if(s.includes('instagram'))k='Instagram';
					else if(s.includes('email')||s.includes('mail'))k='Email';
					platVis[k]=(platVis[k]||0)+1;
				});
				data.forEach(function(d){var c=d['ข้อมูลลูกค้า']||{};var k=c['แพลตฟอร์ม']||'Direct';platSave[k]=(platSave[k]||0)+1;});
				var convKeys=Object.keys(platSave);
				var convRates=convKeys.map(function(k){var v=platVis[k]||platSave[k];return v?Math.round(platSave[k]/v*100):100;});
				mkChart('insConvPlat',{canvasId:'cv-ins-conv-plat',type:'bar',data:{
					labels:convKeys,
					datasets:[{label:'Conv. Rate %',data:convRates,backgroundColor:'rgba(124,58,237,.55)',borderColor:'#7c3aed',borderWidth:1,borderRadius:5}]
				},opts:{plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.parsed.y+'%';}}}},scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{beginAtZero:true,max:100,grid:{color:'#f0ede6'},ticks:{callback:function(v){return v+'%';},font:{size:10}}}}}});

				var ipMap={};
				data.forEach(function(d){var ip=d['IP_Address']||'?'; if(!ipMap[ip])ipMap[ip]=0; ipMap[ip]++;});
				var repeats=Object.entries(ipMap).filter(function(e){return e[1]>1;}).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
				var repeatCount=repeats.length;
				var repEl=document.getElementById('ins-repeat-count');
				if(repEl)repEl.textContent=repeatCount+' IPs';
				if(repeats.length){
					mkChart('insRepeat',{canvasId:'cv-ins-repeat',type:'bar',data:{
						labels:repeats.map(function(e){return e[0].length>15?e[0].substring(0,12)+'...':e[0];}),
						datasets:[{label:'Visits',data:repeats.map(function(e){return e[1];}),backgroundColor:'rgba(8,145,178,.6)',borderColor:'#0891b2',borderWidth:0,borderRadius:4}]
					},opts:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});
				} else {
					var c2=document.getElementById('cv-ins-repeat'); if(c2){c2.parentNode.innerHTML='<div class="v9-empty"><i class="fa-solid fa-user-group"></i><p style="font-size:12px">ยังไม่มีข้อมูล Repeat Customers</p></div>';}
				}

				var warnMo={},totalMo={};
				data.forEach(function(d){var ym=d['บันทึกเมื่อ'].substring(0,7); totalMo[ym]=(totalMo[ym]||0)+1; if(d['Warning_Code'])warnMo[ym]=(warnMo[ym]||0)+1;});
				var wKeys=Object.keys(totalMo).sort();
				mkChart('insWarn',{canvasId:'cv-ins-warn',type:'line',data:{
					labels:wKeys,
					datasets:[
						{label:'Warning Rate %',data:wKeys.map(function(k){return totalMo[k]?Math.round((warnMo[k]||0)/totalMo[k]*100):0;}),borderColor:'#dc2626',backgroundColor:'rgba(220,38,38,.1)',borderWidth:2,tension:.35,fill:true,pointRadius:3,pointHoverRadius:5},
						{label:'Total Configs',data:wKeys.map(function(k){return totalMo[k];}),borderColor:'#cbd5e1',borderWidth:1.5,tension:.35,fill:false,pointRadius:0,yAxisID:'y2'}
					]
				},opts:{interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:10}}}},scales:{x:{grid:{display:false},ticks:{font:{size:9},maxTicksLimit:12}},y:{beginAtZero:true,max:100,grid:{color:'#f0ede6'},ticks:{callback:function(v){return v+'%';},font:{size:9}}},y2:{position:'right',beginAtZero:true,grid:{display:false},ticks:{font:{size:9}}}}}});

				var sizeMap={};
				var wBuckets=['<80','80-100','100-120','120-140','140-160','>160'];
				var lBuckets=['<60','60-80','80-100','100-120','>120'];
				data.forEach(function(d){
					var s=d['สเปคโต๊ะ']||{};
					var w=parseFloat(s['ความกว้าง_Main_cm']||0);
					var l=parseFloat(s['ความยาว_Main_cm']||0);
					if(!w||!l)return;
					var wb=w<80?'<80':w<=100?'80-100':w<=120?'100-120':w<=140?'120-140':w<=160?'140-160':'>160';
					var lb=l<60?'<60':l<=80?'60-80':l<=100?'80-100':l<=120?'100-120':'>120';
					var k=wb+'|'+lb; sizeMap[k]=(sizeMap[k]||0)+1;
				});
				var maxHeat=Math.max.apply(null,Object.values(sizeMap))||1;
				var heatHtml='<table class="v9-heatmap"><thead><tr><th>W \\ L</th>';
				lBuckets.forEach(function(l){heatHtml+='<th>'+l+'</th>';});
				heatHtml+='</tr></thead><tbody>';
				wBuckets.forEach(function(wb){
					heatHtml+='<tr><th style="text-align:right;padding-right:8px;color:var(--txt3)">'+wb+'</th>';
					lBuckets.forEach(function(lb){
						var v=sizeMap[wb+'|'+lb]||0;
						var intensity=v/maxHeat;
						var bg=v===0?'var(--surf2)':'rgba(37,99,235,'+(0.1+0.85*intensity).toFixed(2)+')';
						var tc=intensity>0.5?'#fff':'var(--txt)';
						heatHtml+='<td style="background:'+bg+';color:'+tc+'" title="W:'+wb+' L:'+lb+' = '+v+'">'+( v||'')+'</td>';
					});
					heatHtml+='</tr>';
				});
				heatHtml+='</tbody></table>';
				var hw=document.getElementById('cv-ins-heatmap-wrap');
				if(hw)hw.innerHTML=heatHtml;

				var addonMap={};
				data.forEach(function(d){
					var opts=d['รายการ_Options']||[];
					opts.forEach(function(o){var n=o['ชื่อ']||o['name']||'';if(n&&n!=='-')addonMap[n]=(addonMap[n]||0)+1;});
				});
				var topAddons=Object.entries(addonMap).sort(function(a,b){return b[1]-a[1];}).slice(0,12);
				if(topAddons.length){
					var adCols=['#7c3aed','#2563eb','#059669','#0891b2','#d97706','#dc2626','#16a34a','#db2777','#ea580c','#6366f1','#84cc16','#f43f5e'];
					mkChart('insAddon',{canvasId:'cv-ins-addon',type:'bar',data:{
						labels:topAddons.map(function(e){return e[0].length>20?e[0].substring(0,18)+'\u2026':e[0];}),
						datasets:[{label:'Count',data:topAddons.map(function(e){return e[1];}),backgroundColor:topAddons.map(function(_,i){return adCols[i%adCols.length]+'cc';}),borderColor:topAddons.map(function(_,i){return adCols[i%adCols.length];}),borderWidth:1,borderRadius:5}]
					},opts:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});
				} else {
					var ac=document.getElementById('cv-ins-addon');if(ac)ac.parentNode.innerHTML='<div class="v9-empty"><i class="fa-solid fa-puzzle-piece"></i><p style="font-size:12px">ยังไม่มีข้อมูล Add-ons</p></div>';
				}
			}

			function renderSummary(){
				document.getElementById('sum-date').textContent=new Date().toLocaleString('th-TH');
				var richColors=['#2563eb','#059669','#d97706','#7c3aed','#0891b2','#dc2626','#16a34a','#db2777'];

				var today=dte(new Date());
				var todayV=visits.filter(function(v){return v.timestamp&&v.timestamp.startsWith(today);}).length;
				var uIPs=new Set(visits.map(function(v){return v.ip;}));
				var warnCount=raw.filter(function(d){return d['Warning_Code'];}).length;
				var realCount=filterReal(raw).length;
				var kpis=[
					{label:'Total Visits',val:visits.length,icon:'fa-eye',color:'--blue'},
					{label:'Unique Visitors',val:uIPs.size,icon:'fa-users',color:'--green'},
					{label:'Configs Saved',val:raw.length,icon:'fa-floppy-disk',color:'--purple'},
					{label:'Real Customers',val:realCount,icon:'fa-user-check',color:'--teal'},
					{label:'Today Visits',val:todayV,icon:'fa-bolt',color:'--amber'},
					{label:'Warnings',val:warnCount,icon:'fa-triangle-exclamation',color:'--red'}
				];
				var kr=document.getElementById('sum-kpi-row');
				if(kr)kr.innerHTML=kpis.map(function(k){return '<div class="v9-kpi" style="min-width:0"><div class="v9-kpi-bar" style="background:var('+k.color+')"></div><div class="v9-kpi-lbl">'+k.label+'</div><div class="v9-kpi-val" style="font-size:22px">'+k.val.toLocaleString()+'</div><i class="fa-solid '+k.icon+' v9-kpi-bg"></i></div>';}).join('');

				var mo={};
				visits.forEach(function(v){var ym=v.timestamp.substring(0,7);mo[ym]=(mo[ym]||0)+1;});
				var moKeys=Object.keys(mo).sort();
				mkChart('sumTrend',{canvasId:'cv-sum-trend',type:'line',data:{labels:moKeys,datasets:[{label:'Monthly Visits',data:moKeys.map(function(k){return mo[k];}),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',borderWidth:2,tension:.35,fill:true,pointRadius:2}]},opts:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:9},maxTicksLimit:12}},y:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:9}}}}}});

				var cc={};
				raw.forEach(function(d){var s=d['สเปคโต๊ะ']||{};var c=s['สีท็อป']||'';if(c&&c!=='-')cc[c]=(cc[c]||0)+1;});
				var tc=Object.entries(cc).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
				mkChart('sumColors',{canvasId:'cv-sum-colors',type:'bar',data:{labels:tc.map(function(e){return e[0];}),datasets:[{data:tc.map(function(e){return e[1];}),backgroundColor:tc.map(function(_,i){return richColors[i%richColors.length]+'cc';}),borderColor:tc.map(function(_,i){return richColors[i%richColors.length];}),borderWidth:1,borderRadius:5}]},opts:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:9}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});

				// Conversion Funnel Chart Logic
				var totalVisits = visits.length || 1;
				var totalConfigs = raw.length;
				var totalProposals = raw.filter(function(d){return d.traffic_source === 'email' || d.order_id || d.lead_status === 'converted';}).length;
				var totalOrders = raw.filter(function(d){return d.order_id || d.lead_status === 'converted';}).length;

				mkChart('sumFunnel',{canvasId:'cv-sum-funnel',type:'bar',data:{
					labels:['Visits','Saved Configs','Proposals','Orders'],
					datasets:[{
						label:'Conversion Rate (%)',
						data:[
							100, 
							Math.round((totalConfigs/totalVisits)*100), 
							Math.round((totalProposals/totalVisits)*100), 
							Math.round((totalOrders/totalVisits)*100)
						],
						backgroundColor:['#2563eb','#7c3aed','#0891b2','#059669'],
						borderRadius: 6
					}]
				},opts:{
					indexAxis:'y',
					plugins:{legend:{display:false}},
					scales:{
						x:{beginAtZero:true,max:100,ticks:{callback:function(value){return value+'%';}}},
						y:{grid:{display:false}}
					}
				}});

				function sm(key,id,fn){var m={};raw.forEach(function(d){var k=fn(d)||'?';m[k]=(m[k]||0)+1;});var s=Object.entries(m).sort(function(a,b){return b[1]-a[1];}).slice(0,6);mkChart(key,{canvasId:id,type:'doughnut',data:{labels:s.map(function(x){return x[0];}),datasets:[{data:s.map(function(x){return x[1];}),backgroundColor:s.map(function(_,i){return richColors[i%richColors.length];}),borderWidth:1,borderColor:'#fff',hoverOffset:4}]},opts:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'bottom',labels:{boxWidth:8,font:{size:9},padding:6}}}}});}
				sm('sumType','cv-sum-type',function(d){var s=d['สเปคโต๊ะ']||{};return s['ประเภท']||s['รุ่นโต๊ะ'];});
				sm('sumPlat','cv-sum-plat',function(d){var c=d['ข้อมูลลูกค้า']||{};return c['แพลตฟอร์ม'];});
				sm('sumDev','cv-sum-dev',function(d){return d['Device_Type']||'Desktop';});

				var dowN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],dow=new Array(7).fill(0);
				visits.forEach(function(v){if(v.timestamp){var d=new Date(v.timestamp);dow[d.getDay()]++;}});
				mkChart('sumDow',{canvasId:'cv-sum-dow',type:'bar',data:{labels:dowN,datasets:[{data:dow,backgroundColor:dow.map(function(v,i){return richColors[i%richColors.length]+'99';}),borderColor:dow.map(function(v,i){return richColors[i%richColors.length];}),borderWidth:1,borderRadius:4}]},opts:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{beginAtZero:true,grid:{color:'#f0ede6'},ticks:{font:{size:9}}}}}});

				var top10=filterReal(raw).slice(0,10);
				var t10=document.getElementById('sum-top10');
				if(t10){
					var html='<table class="v9-tbl"><thead><tr><th>#</th><th>Date</th><th>Customer</th><th>Platform</th><th>Type</th><th>Color</th><th>Size</th></tr></thead><tbody>';
					top10.forEach(function(d,i){
						var c=d['ข้อมูลลูกค้า']||{},s=d['สเปคโต๊ะ']||{};
						var mD='',sD2='';
						if(s['ความกว้าง_Main_cm'])mD=s['ความกว้าง_Main_cm']+' x '+s['ความยาว_Main_cm'];
						else if(s['ขนาด Main (กว้างxยาว)'])mD=(s['ขนาด Main (กว้างxยาว)']||'').replace(' cm','').trim();
						var sz=mD?(mD+' cm'):'-';
						html+='<tr><td style="color:var(--txt3);font-size:11px">'+(i+1)+'</td>'
							+'<td style="font-size:11px;white-space:nowrap">'+d['บันทึกเมื่อ']+'</td>'
							+'<td style="font-weight:500">'+safe(c['ชื่อ']||'-')+'</td>'
							+'<td>'+platBadge(c['แพลตฟอร์ม']||'-')+'</td>'
							+'<td>'+safe(s['ประเภท']||s['รุ่นโต๊ะ']||'-')+'</td>'
							+'<td>'+safe(s['สีท็อป']||'-')+'</td>'
							+'<td style="font-size:11px">'+safe(sz)+'</td></tr>';
					});
					html+='</tbody></table>';
					t10.innerHTML=html;
				}
			}

			loadPins();
			initDark();
			updatePinCount();

			loadData();
			return{loadData,tab,renderTraffic,renderProducts,renderInsights,renderSummary,renderTable,renderTimeline,view,openImg,copyJson,del,delBulk,toggleSel,reset2FA,resetTrendZoom,toggleDark,setAutoRefresh,onGlobalRange,sortTable,pinRow,togglePinnedOnly,exportFiltered,toggleModalView};
		})();
		