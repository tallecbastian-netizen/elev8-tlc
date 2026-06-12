/* Suivi membres & prospects — CRM local (localStorage). Aucune dépendance. */
(function(){
  var KEY="tlc_members_v2", SKEY="tlc_settings_v1";
  var STEPS=["Inscrit","VSL vue","Candidature","Appel fait","Onboarding","P1 Contenu","P2 Monétisation","P3 Trading","P4 Performance","P5 Élite"];

  function load(k,d){ try{var v=JSON.parse(localStorage.getItem(k)); return (v===null||v===undefined)?d:v;}catch(e){return d;} }
  var members=load(KEY,null);
  var settings=load(SKEY,{zoom:"",doc:"",wa:"Salut {prenom} ! Voici le lien de notre appel : {zoom}"});
  if(members===null){ members=load("tlc_members_v1",[])||[]; members.forEach(function(m){ if(!m.type)m.type="Membre"; if(!m.inscription)m.inscription=m.debut||""; }); }

  function save(){ try{localStorage.setItem(KEY,JSON.stringify(members));}catch(e){} }
  function saveSettings(){ try{localStorage.setItem(SKEY,JSON.stringify(settings));}catch(e){} }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function esc(s){ return (s||"").replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function daysSince(d){ if(!d) return null; var x=Math.floor((Date.now()-new Date(d).getTime())/86400000); return x<0?0:x; }

  function reactivity(m){
    var d=daysSince(m.dernierContact);
    if(d===null) return {key:'bad',cls:'react-bad',label:'Jamais contacté'};
    if(d<7) return {key:'ok',cls:'react-ok',label:'Réactif · J-'+d};
    if(d<15) return {key:'mid',cls:'react-mid',label:'Tiède · J-'+d};
    return {key:'bad',cls:'react-bad',label:'À relancer · J-'+d};
  }
  function cycle(m){ var x=daysSince(m.inscription); if(x===null) return null; var capped=Math.min(x,28); return {day:x,pct:Math.round(capped/28*100),done:x>=28}; }

  var sZoom=document.getElementById('set-zoom'), sDoc=document.getElementById('set-doc'), sWa=document.getElementById('set-wa');
  sZoom.value=settings.zoom; sDoc.value=settings.doc; sWa.value=settings.wa;
  [["set-zoom","zoom"],["set-doc","doc"],["set-wa","wa"]].forEach(function(p){
    document.getElementById(p[0]).addEventListener('input',function(e){ settings[p[1]]=e.target.value; saveSettings(); });
  });

  var listEl=document.getElementById('list'), statsEl=document.getElementById('stats');
  var search=document.getElementById('search'), fType=document.getElementById('filterType'), fPromo=document.getElementById('filterPromo'), fReact=document.getElementById('filterReact');
  [search,fType,fPromo,fReact].forEach(function(el){ el.addEventListener('input',render); el.addEventListener('change',render); });

  function promos(){ var s={}; members.forEach(function(m){ if(m.promo) s[m.promo]=1; }); return Object.keys(s).sort(); }
  function waLink(m){
    var ph=(m.phone||"").replace(/[^\d]/g,""); if(ph.length===10 && ph[0]==="0") ph="33"+ph.slice(1);
    var msg=(settings.wa||"").replace(/{prenom}/g,(m.nom||"").split(" ")[0]).replace(/{zoom}/g,settings.zoom||"").replace(/{doc}/g,settings.doc||"");
    return "https://wa.me/"+ph+"?text="+encodeURIComponent(msg);
  }
  function byId(id){ return members.find(function(x){return x.id===id;}); }

  function render(){
    var ps=promos();
    document.getElementById('promos').innerHTML=ps.map(function(p){return '<option value="'+esc(p)+'">';}).join("");
    var cur=fPromo.value; fPromo.innerHTML='<option value="">Toutes promotions</option>'+ps.map(function(p){return '<option '+(p===cur?'selected':'')+'>'+esc(p)+'</option>';}).join("");

    var nb={total:members.length,prospect:0,membre:0,relance:0,actifs:0};
    members.forEach(function(m){ if(m.type==='Membre')nb.membre++; else nb.prospect++; if(reactivity(m).key==='bad')nb.relance++; if(m.statut==='Actif')nb.actifs++; });
    statsEl.innerHTML=[['<span class="gold-text">'+nb.total+'</span>','Contacts'],[nb.prospect,'Prospects'],[nb.membre,'Membres'],[nb.actifs,'Actifs'],['<span style="color:#ffb4b4">'+nb.relance+'</span>','À relancer']]
      .map(function(s){return '<div class="stat"><div class="v">'+s[0]+'</div><div class="l">'+s[1]+'</div></div>';}).join("");

    var q=(search.value||"").toLowerCase();
    var rows=members.filter(function(m){
      if(fType.value && m.type!==fType.value) return false;
      if(cur && m.promo!==cur) return false;
      if(fReact.value && reactivity(m).key!==fReact.value) return false;
      if(q && !((m.nom||"")+" "+(m.promo||"")+" "+(m.email||"")+" "+(m.phone||"")).toLowerCase().includes(q)) return false;
      return true;
    });
    if(!rows.length){ listEl.innerHTML='<div class="empty">Aucun contact pour ce filtre.<br>Clique <b>+ Ajouter</b> ou <b>Importer Brevo (CSV)</b> pour récupérer tous tes inscrits.</div>'; return; }

    listEl.innerHTML='<div class="grid">'+rows.map(function(m){
      var steps=m.steps||{}; var done=STEPS.filter(function(s){return steps[s];}).length; var pct=Math.round(done/STEPS.length*100);
      var r=reactivity(m); var c=cycle(m);
      var chips=STEPS.map(function(s){return '<span class="chip '+(steps[s]?'on':'')+'" data-id="'+m.id+'" data-step="'+esc(s)+'">'+esc(s)+'</span>';}).join("");
      var cyc=c?('<div class="cycle">Cycle 28 j — '+(c.done?'<b style="color:#ffb4b4">terminé (J+'+c.day+')</b>':'<b>J'+c.day+'/28</b>')+'</div><div class="cyclebar"><i style="width:'+c.pct+'%"></i></div>'):'';
      return '<div class="card '+(m.type==='Membre'?'is-membre':'')+'">'+
        '<div class="hd"><div><div class="name">'+esc(m.nom||"—")+'</div>'+
          '<div class="badges"><span class="tag '+(m.type==='Membre'?'t-membre':'t-prospect')+'">'+esc(m.type||'Prospect')+'</span>'+
          (m.promo?'<span class="tag promo">'+esc(m.promo)+'</span>':'')+
          '<span class="tag '+r.cls+'">'+r.label+'</span></div></div>'+
          '<button class="a btn-sm" data-edit="'+m.id+'">Éditer</button></div>'+
        '<div class="meta">'+esc(m.statut||'')+(m.inscription?' · inscrit le '+esc(m.inscription):'')+(m.phone?' · '+esc(m.phone):'')+'</div>'+
        cyc+
        '<div><div class="bar-l"><span>Progression parcours</span><span>'+pct+'%</span></div><div class="bar"><i style="width:'+pct+'%"></i></div></div>'+
        '<div class="steps">'+chips+'</div>'+
        '<div class="actions">'+
          (m.phone?'<a class="a wa" target="_blank" rel="noopener" data-wa="'+m.id+'" href="'+waLink(m)+'">WhatsApp + Zoom</a>':'')+
          '<button class="a" data-contact="'+m.id+'">Contacté ✓</button>'+
          (m.type!=='Membre'?'<button class="a" data-makemember="'+m.id+'">→ Membre</button>':'')+
        '</div>'+
      '</div>';
    }).join("")+'</div>';
  }

  listEl.addEventListener('click',function(e){
    var chip=e.target.closest('.chip');
    if(chip){ var m=byId(chip.dataset.id); if(m){ m.steps=m.steps||{}; m.steps[chip.dataset.step]=!m.steps[chip.dataset.step]; save(); render(); } return; }
    var ed=e.target.closest('[data-edit]'); if(ed){ openModal(byId(ed.dataset.edit)); return; }
    var ct=e.target.closest('[data-contact]'); if(ct){ var m2=byId(ct.dataset.contact); if(m2){ m2.dernierContact=today(); save(); render(); } return; }
    var mk=e.target.closest('[data-makemember]'); if(mk){ var m3=byId(mk.dataset.makemember); if(m3){ m3.type='Membre'; if(!m3.inscription)m3.inscription=today(); save(); render(); } return; }
    var wa=e.target.closest('[data-wa]'); if(wa){ var m4=byId(wa.dataset.wa); if(m4){ m4.dernierContact=today(); save(); setTimeout(render,400); } return; }
  });

  var modal=document.getElementById('modal');
  function set(id,v){ document.getElementById(id).value=v||''; }
  function val(id){ return document.getElementById(id).value; }
  function openModal(m){
    document.getElementById('modalTitle').textContent=m?'Modifier le contact':'Nouveau contact';
    set('m-id',m?m.id:''); set('m-nom',m?m.nom:''); set('m-type',m?m.type||'Prospect':'Prospect'); set('m-promo',m?m.promo:'');
    set('m-statut',m?m.statut||'Nouveau':'Nouveau'); set('m-phone',m?m.phone:''); set('m-email',m?m.email:'');
    set('m-inscription',m?m.inscription||'':today()); set('m-contact',m?m.dernierContact||'':''); set('m-notes',m?m.notes:'');
    document.getElementById('delBtn').style.display=m?'inline-flex':'none';
    modal.classList.add('show');
  }
  document.getElementById('addBtn').addEventListener('click',function(){openModal(null);});
  document.getElementById('cancelBtn').addEventListener('click',function(){modal.classList.remove('show');});
  modal.addEventListener('click',function(e){ if(e.target===modal) modal.classList.remove('show'); });
  document.getElementById('saveBtn').addEventListener('click',function(){
    var id=val('m-id');
    var data={nom:val('m-nom'),type:val('m-type'),promo:val('m-promo'),statut:val('m-statut'),phone:val('m-phone'),email:val('m-email'),inscription:val('m-inscription'),dernierContact:val('m-contact'),notes:val('m-notes')};
    if(!data.nom.trim()){ document.getElementById('m-nom').focus(); return; }
    if(id){ Object.assign(byId(id),data); } else { data.id=uid(); data.steps={"Inscrit":true}; members.unshift(data); }
    save(); render(); modal.classList.remove('show');
  });
  document.getElementById('delBtn').addEventListener('click',function(){
    var id=val('m-id'); if(id&&confirm("Supprimer ?")){ members=members.filter(function(x){return x.id!==id;}); save(); render(); modal.classList.remove('show'); }
  });

  document.getElementById('exportJson').addEventListener('click',function(){ dl("suivi-membres.json",JSON.stringify(members,null,2),"application/json"); });
  document.getElementById('exportCsv').addEventListener('click',function(){
    var head=["Nom","Type","Promotion","Téléphone","Email","Inscription","Dernier contact","Cycle J/28","Réactivité","Statut","Progression %","Notes"];
    var lines=[head.join(";")].concat(members.map(function(m){
      var done=STEPS.filter(function(s){return (m.steps||{})[s];}).length; var pct=Math.round(done/STEPS.length*100); var c=cycle(m);
      return [m.nom,m.type,m.promo,m.phone,m.email,m.inscription,m.dernierContact,(c?c.day:""),reactivity(m).label,m.statut,pct,(m.notes||"").replace(/\n/g," ")]
        .map(function(x){return '"'+String(x==null?"":x).replace(/"/g,'""')+'"';}).join(";");
    }));
    dl("suivi-membres.csv","﻿"+lines.join("\r\n"),"text/csv");
  });
  document.getElementById('exportPhones').addEventListener('click',function(){
    var q=(search.value||"").toLowerCase();
    var rows=members.filter(function(m){
      if(fType.value && m.type!==fType.value) return false;
      if(fPromo.value && m.promo!==fPromo.value) return false;
      if(fReact.value && reactivity(m).key!==fReact.value) return false;
      if(q && !((m.nom||"")+" "+(m.promo||"")+" "+(m.email||"")).toLowerCase().includes(q)) return false;
      return m.phone;
    });
    if(!rows.length){ alert("Aucun numéro pour ce filtre."); return; }
    var txt=rows.map(function(m){ var ph=(m.phone||"").replace(/[^\d]/g,""); if(ph.length===10&&ph[0]==="0")ph="33"+ph.slice(1); return ph+"\t"+(m.nom||""); }).join("\n");
    dl("numeros-"+(fType.value||"tous").toLowerCase()+".txt",txt,"text/plain");
    alert(rows.length+" numéros exportés. Crée une liste de diffusion WhatsApp avec.");
  });

  document.getElementById('importJson').addEventListener('click',function(){document.getElementById('fileJson').click();});
  document.getElementById('fileJson').addEventListener('change',function(e){
    var f=e.target.files[0]; if(!f)return; var r=new FileReader();
    r.onload=function(){ try{var a=JSON.parse(r.result); if(Array.isArray(a)){members=a;save();render();alert("Restauré : "+a.length+" contacts.");}}catch(x){alert("Fichier invalide.");} };
    r.readAsText(f); e.target.value="";
  });
  document.getElementById('importBrevo').addEventListener('click',function(){document.getElementById('fileBrevo').click();});
  document.getElementById('fileBrevo').addEventListener('change',function(e){
    var f=e.target.files[0]; if(!f)return; var r=new FileReader(); r.onload=function(){ importBrevoCsv(r.result); }; r.readAsText(f); e.target.value="";
  });

  function importBrevoCsv(text){
    var rows=parseCsv(text); if(rows.length<2){ alert("CSV vide ou illisible."); return; }
    var head=rows[0].map(function(h){return h.toLowerCase().trim();});
    function idx(){ for(var i=0;i<arguments.length;i++){ var k=head.indexOf(arguments[i]); if(k>=0)return k; } return -1; }
    var iEmail=idx("email","e-mail","adresse e-mail");
    var iPre=idx("prenom","prénom","firstname","first name");
    var iNom=idx("nom","lastname","last name","name");
    var iTel=idx("sms","telephone","téléphone","phone","whatsapp","numero","numéro");
    var iDate=idx("date de création du contact","date d'inscription","created","date","inscription");
    var existing={}; members.forEach(function(m){ if(m.email) existing[m.email.toLowerCase()]=1; });
    var added=0,skip=0;
    for(var i=1;i<rows.length;i++){
      var row=rows[i]; if(!row || !row.length) continue;
      var email=iEmail>=0?(row[iEmail]||"").trim():"";
      var pre=iPre>=0?(row[iPre]||"").trim():""; var nom=iNom>=0?(row[iNom]||"").trim():"";
      var full=((pre+" "+nom).trim())|| email || "Sans nom";
      if(email && existing[email.toLowerCase()]){ skip++; continue; }
      if(!email && !pre && !nom) continue;
      var d=iDate>=0?(row[iDate]||"").trim():""; d=normDate(d);
      members.unshift({id:uid(),nom:full,type:"Prospect",promo:"",statut:"Nouveau",phone:iTel>=0?(row[iTel]||"").trim():"",email:email,inscription:d||today(),dernierContact:"",steps:{Inscrit:true},notes:""});
      if(email) existing[email.toLowerCase()]=1; added++;
    }
    save(); render(); alert("Import Brevo : "+added+" ajoutés"+(skip?", "+skip+" déjà présents (ignorés)":"")+".");
  }
  function normDate(s){ if(!s)return ""; var m=s.match(/(\d{4})-(\d{2})-(\d{2})/); if(m)return m[0]; m=s.match(/(\d{2})[\/.](\d{2})[\/.](\d{4})/); if(m)return m[3]+"-"+m[2]+"-"+m[1]; return ""; }
  function parseCsv(text){
    text=text.replace(/^﻿/,"");
    var firstLine=text.split("\n")[0];
    var delim=(firstLine.split(";").length > firstLine.split(",").length)?";":",";
    var rows=[],cur=[],val="",q=false;
    for(var i=0;i<text.length;i++){ var ch=text[i];
      if(q){ if(ch==='"'){ if(text[i+1]==='"'){val+='"';i++;} else q=false; } else val+=ch; }
      else { if(ch==='"')q=true; else if(ch===delim){cur.push(val);val="";} else if(ch==='\n'){cur.push(val);rows.push(cur);cur=[];val="";} else if(ch==='\r'){} else val+=ch; }
    }
    if(val.length||cur.length){cur.push(val);rows.push(cur);} return rows;
  }

  function dl(name,content,type){ var b=new Blob([content],{type:type}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); }

  render();
})();
