// R9: Inline scripts moved to external file so CSP can drop 'unsafe-inline'.
// These are lightweight DOM patches that run independently of the React bundle.

// Patch 1: Hide revenue/analytics sections on settings page
setInterval(function(){
  if(location.pathname!=='/settings') return;
  var els=document.querySelectorAll('h2,h1');
  for(var i=0;i<els.length;i++){
    var t=els[i].textContent||'';
    if((t==='Umsatz'||t==='Revenue'||t==='Gelir')&&els[i].tagName==='H1'){
      var wrap=els[i].closest('div[style*="padding"]');
      if(wrap&&wrap.parentElement){
        var parent=wrap.parentElement;
        var node=wrap;
        while(node){var next=node.nextElementSibling;node.style.display='none';node=next;}
      }
    }
  }
  var spans=document.querySelectorAll('div[style*="fontWeight"],span[style*="fontWeight"],div[style*="letterSpacing"]');
  for(var j=0;j<spans.length;j++){
    var st=spans[j].textContent||'';
    if(st.indexOf('BEHANDLUNGSVERTEILUNG')>=0||st.indexOf('TREATMENT')>=0||
       st.indexOf('LEAD-QUELLEN')>=0||st.indexOf('LEAD SOURCES')>=0||st.indexOf('KANAL')>=0){
      var sec=spans[j].closest('div[style*="marginTop"]')||spans[j].parentElement;
      if(sec)sec.style.display='none';
    }
  }
},1500);

// Patch 2: Add Google Maps review link input to settings
setInterval(function(){
  if(document.getElementById('fm-gmaps-box')) return;
  if(!location.pathname.includes('settings')) return;
  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    if(walker.currentNode.textContent.trim()==='Patientenbetreuung'){
      var el=walker.currentNode.parentElement;
      for(var k=0;k<10;k++){
        if(!el) break;
        var s=window.getComputedStyle(el);
        if(s.borderRadius && parseInt(s.borderRadius)>=10 && s.padding && parseInt(s.padding)>=10){
          var box=document.createElement('div');
          box.id='fm-gmaps-box';
          box.style.cssText='margin:-8px 0 20px;padding:14px 18px;border-radius:0 0 12px 12px;background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.1);border-top:none';
          var saved='';try{saved=localStorage.getItem('fm_gmaps_link')||'';}catch(e){}
          box.innerHTML='<div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:8px">\u2B50 Google Bewertungslink</div><div style="display:flex;gap:8px;align-items:center"><input id="fm-gmaps-input" type="text" placeholder="https://g.page/r/IhreKlinik/review" value="'+saved+'" style="flex:1;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#fff;font-size:13px;outline:none;font-family:inherit"><button id="fm-gmaps-save" style="padding:8px 16px;border-radius:8px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.2);color:#fbbf24;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">Speichern</button></div><div style="font-size:11px;color:rgba(167,177,195,0.4);margin-top:6px">Wird automatisch in Bewertungsanfragen eingef\u00FCgt</div>';
          el.parentElement.insertBefore(box, el.nextSibling);
          document.getElementById('fm-gmaps-save').addEventListener('click',function(){
            var v=document.getElementById('fm-gmaps-input').value;
            try{localStorage.setItem('fm_gmaps_link',v);}catch(e){}
            var token=localStorage.getItem('fm_access_token');
            fetch('/api/v1/clinic/settings',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({googleMapsLink:v}),credentials:'include'}).then(function(){
              document.getElementById('fm-gmaps-save').textContent='\u2705';
              setTimeout(function(){document.getElementById('fm-gmaps-save').textContent='Speichern';},2000);
            });
          });
          return;
        }
        el=el.parentElement;
      }
    }
  }
},300);

// Patch 3: Add Stripe connect button to settings
setInterval(function(){
  if(!location.pathname.includes('settings')) return;
  if(document.getElementById('fm-stripe-btn')) return;
  var spans=document.querySelectorAll('span,div');
  for(var i=0;i<spans.length;i++){
    var el=spans[i];
    if(el.textContent==='Stripe Payments' && el.childNodes.length===1){
      var parent=el.parentElement;
      if(!parent) continue;
      var cardParent=parent.parentElement;
      if(!cardParent) continue;
      var btn=document.createElement('div');
      btn.id='fm-stripe-btn';
      btn.style.cssText='padding:8px 16px;margin-top:8px;border-radius:8px;background:linear-gradient(135deg,#635bff,#7c3aed);color:#fff;font-weight:700;font-size:11px;cursor:pointer;text-align:center;font-family:inherit';
      btn.textContent='Stripe verbinden';
      btn.onclick=function(){
        btn.textContent='Verbinde...';
        var token=localStorage.getItem('fm_access_token');
        (function(){var x=new XMLHttpRequest();x.open('POST','https://api.flowmatix.io/api/v1/billing/connect/onboard',true);x.setRequestHeader('Content-Type','application/json');var t=window._fmToken||localStorage.getItem('fm_access_token');if(t)x.setRequestHeader('Authorization','Bearer '+t);x.withCredentials=true;x.onload=function(){try{var d=JSON.parse(x.responseText);if(d.url){window.open(d.url,'_blank');}else{alert('Fehler: '+(d.error||'Unbekannt'));}}catch(e){alert('Fehler: '+x.responseText);}btn.textContent='Stripe verbinden';};x.onerror=function(){alert('Verbindungsfehler');btn.textContent='Stripe verbinden';};x.send('{}');})()
          .then(function(r){return r.json();})
          .then(function(data){
            if(data.url){window.open(data.url,'_blank');}
            else{btn.textContent='Stripe verbinden';}
          })
          .catch(function(){btn.textContent='Stripe verbinden';});
      };
      cardParent.appendChild(btn);
      break;
    }
  }
},500);

// Patch 4: Add automation detail toggles to settings
setInterval(function(){
  if(!location.pathname.includes('settings')) return;
  if(document.getElementById('fm-auto-details-1')) return;
  var details = {
    'Patientenbetreuung': {
      id: 'fm-auto-details-1',
      items: [
        '\u2705 Buchungsbestätigung — sofort nach Terminbuchung',
        '\uD83D\uDD14 Erinnerung — 3 Tage vor Termin',
        '\uD83D\uDD14 Erinnerung — 2 Stunden vor Termin',
        '\uD83D\uDC8A Nachsorge — 4 Stunden nach OP',
        '\u2B50 Bewertungsanfrage — 14 Tage nach OP'
      ]
    },
    'Reise & Logistik': {
      id: 'fm-auto-details-2',
      items: [
        '\u2708\uFE0F Flug-Tracking — sobald Flugnummer erkannt',
        '\uD83D\uDE97 Fahrer-Info — 30 Min vor Landung per WhatsApp',
        '\uD83C\uDFE8 Hotel-Bestätigung — nach Zuweisung'
      ]
    },
    'Umsatz-Sicherung': {
      id: 'fm-auto-details-3',
      items: [
        '\uD83D\uDCB0 Zahlungserinnerung — 48h nach Angebot',
        '\uD83D\uDCF5 No-Show — 30 Min nach verpasstem Termin'
      ]
    }
  };
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    var t = walker.currentNode.textContent.trim();
    var cfg = null; for(var key in details){ if(t===key || t.indexOf(key)>=0){ cfg=details[key]; break; } }
    if(!cfg) continue;
    if(document.getElementById(cfg.id)) continue;
    var el = walker.currentNode.parentElement;
    for(var k=0;k<10;k++){
      if(!el) break;
      var s = window.getComputedStyle(el);
      if(s.borderRadius && parseInt(s.borderRadius)>=10 && el.offsetWidth > 400){
        var wrap = document.createElement('div');
        wrap.id = cfg.id;
        wrap.style.cssText = 'padding:0 16px 12px';
        var toggle = document.createElement('div');
        toggle.style.cssText = 'font-size:11px;color:rgba(167,177,195,0.4);cursor:pointer;display:flex;align-items:center;gap:4px';
        toggle.innerHTML = '\u2699\uFE0F <span>Details anzeigen</span>';
        var list = document.createElement('div');
        list.style.cssText = 'display:none;margin-top:8px;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04)';
        var html = '';
        for(var j=0;j<cfg.items.length;j++){
          html += '<div style="font-size:11px;color:rgba(167,177,195,0.5);padding:3px 0">'+cfg.items[j]+'</div>';
        }
        list.innerHTML = html;
        toggle.onclick = (function(l,tgl){
          return function(){
            if(l.style.display==='none'){
              l.style.display='block';
              tgl.querySelector('span').textContent='Details ausblenden';
            } else {
              l.style.display='none';
              tgl.querySelector('span').textContent='Details anzeigen';
            }
          };
        })(list, toggle);
        wrap.appendChild(toggle);
        wrap.appendChild(list);
        el.appendChild(wrap);
        break;
      }
      el = el.parentElement;
    }
  }
},500);
