/* ============================================================
   إنتاجي — APP LOGIC v3.0
   12-Hour Clock · SPA Router · localStorage
   ============================================================ */
;(function(){
  'use strict';

  /* ── Helpers ── */
  var $=function(id){return document.getElementById(id)};
  var $$=function(s){return document.querySelectorAll(s)};
  var pad=function(n){return n<10?'0'+n:''+n};
  var uid=function(){return Date.now().toString(36)+Math.random().toString(36).substr(2,6)};
  var sGet=function(k,fb){try{var v=localStorage.getItem(k);return v!==null?JSON.parse(v):fb}catch(e){return fb}};
  var sSet=function(k,v){localStorage.setItem(k,JSON.stringify(v))};
  var dayKey=function(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};

  function toast(msg,type){
    var box=$('toast-box'),t=document.createElement('div');
    t.className='toast '+(type||'');t.textContent=msg;
    box.appendChild(t);
    requestAnimationFrame(function(){t.classList.add('show')});
    setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove()},400)},2800);
  }

  function beep(){
    try{
      var c=new(window.AudioContext||window.webkitAudioContext)();
      [0,.2,.4].forEach(function(d,i){
        var o=c.createOscillator(),g=c.createGain();
        o.connect(g);g.connect(c.destination);o.type='sine';
        o.frequency.value=[660,880,1100][i];
        g.gain.setValueAtTime(.25,c.currentTime+d);
        g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d+.4);
        o.start(c.currentTime+d);o.stop(c.currentTime+d+.4);
      });
    }catch(e){}
  }

  /* ═══════════════════════════════════
     1. THEME
     ═══════════════════════════════════ */
  (function(){
    var saved=sGet('theme',null);
    if(saved) document.documentElement.setAttribute('data-theme',saved);
    else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)
      document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.setAttribute('data-theme','light');
  })();

  $('theme-btn').addEventListener('click',function(){
    var cur=document.documentElement.getAttribute('data-theme');
    var next=cur==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    sSet('theme',next);
  });

  /* ═══════════════════════════════════
     2. ROUTER
     ═══════════════════════════════════ */
  var pills=$$('.pill');
  var pages=$$('.page');
  var pillSlider=$('pill-slider');
  var navPills=$('nav-pills');
  var hamburger=$('hamburger');

  function movePillSlider(){
    var active=document.querySelector('.pill.active');
    if(!active||!pillSlider) return;
    pillSlider.style.width=active.offsetWidth+'px';
    pillSlider.style.left=active.offsetLeft+'px';
  }

  function goTo(name){
    pages.forEach(function(p){p.classList.remove('active')});
    pills.forEach(function(p){p.classList.remove('active')});
    var target=$('page-'+name);
    if(target){void target.offsetWidth;target.classList.add('active')}
    pills.forEach(function(p){if(p.dataset.page===name)p.classList.add('active')});
    navPills.classList.remove('open');hamburger.classList.remove('open');
    sSet('page',name);
    setTimeout(movePillSlider,10);
    refreshStats();refreshOverview();
  }

  pills.forEach(function(p){
    p.addEventListener('click',function(e){e.preventDefault();goTo(this.dataset.page)});
  });
  hamburger.addEventListener('click',function(){
    this.classList.toggle('open');navPills.classList.toggle('open');
  });

  window.addEventListener('hashchange',function(){
    goTo(location.hash.replace('#','')||'home');
  });
  window.addEventListener('resize',movePillSlider);

  /* ═══════════════════════════════════
     3. 12-HOUR CLOCK
     ═══════════════════════════════════ */
  var arDays=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var arMon=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  function tickClock(){
    var now=new Date();
    var h24=now.getHours(), m=now.getMinutes(), s=now.getSeconds();

    // Convert to 12-hour format
    var h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    var ampm = h24 >= 12 ? 'مساءً' : 'صباحًا';

    $('clock-digits').textContent=pad(h12)+':'+pad(m);
    $('clock-ampm').textContent=ampm;
    $('clock-seconds').textContent=':'+pad(s);
    $('clock-date').textContent=arDays[now.getDay()]+'، '+now.getDate()+' '+arMon[now.getMonth()]+' '+now.getFullYear();

    // Greeting
    var gt, gb;
    if(h24>=5&&h24<12){gt='صباح الخير! ☀️';gb='🌅 صباح'}
    else if(h24>=12&&h24<17){gt='مساء الخير! 🌤️';gb='☀️ ظهيرة'}
    else if(h24>=17&&h24<21){gt='مساء الخير! 🌆';gb='🌆 مساء'}
    else{gt='مساء الخير! 🌙';gb='🌙 ليل'}
    $('greeting-text').textContent=gt;
    $('greeting-badge').textContent=gb;
  }
  tickClock();setInterval(tickClock,1000);

  /* ═══════════════════════════════════
     4. POMODORO
     ═══════════════════════════════════ */
  var WORK=25*60,BRK=5*60,CIRC=2*Math.PI*100;
  var pm={mode:'work',total:WORK,left:WORK,on:false,iv:null,sess:sGet('pomo-s',0)};

  function drawPomo(){
    $('pomo-digits').textContent=pad(Math.floor(pm.left/60))+':'+pad(pm.left%60);
    var pct=1-(pm.left/pm.total);
    $('pomo-fill').style.strokeDashoffset=CIRC*(1-pct);
  }

  function startPomo(){
    if(pm.on) return;pm.on=true;
    $('pbtn-play').style.display='none';
    $('pbtn-pause').style.display='flex';
    document.querySelector('.pomo-ring-wrap').classList.add('active');
    document.querySelector('.pomo-ring-wrap').classList.remove('done');
    pm.iv=setInterval(function(){
      if(pm.left<=0){
        clearInterval(pm.iv);pm.on=false;
        document.querySelector('.pomo-ring-wrap').classList.remove('active');
        document.querySelector('.pomo-ring-wrap').classList.add('done');
        $('pbtn-play').style.display='flex';
        $('pbtn-pause').style.display='none';
        beep();
        if(pm.mode==='work'){pm.sess++;sSet('pomo-s',pm.sess);toast('🎉 أحسنت! انتهت جلسة العمل','ok')}
        else toast('⏰ انتهت الاستراحة — هيا نعود!','ok');
        refreshStats();return;
      }
      pm.left--;drawPomo();
    },1000);
  }

  function pausePomo(){
    clearInterval(pm.iv);pm.on=false;
    $('pbtn-play').style.display='flex';
    $('pbtn-pause').style.display='none';
    document.querySelector('.pomo-ring-wrap').classList.remove('active');
  }

  function resetPomo(){
    pausePomo();pm.left=pm.total;
    document.querySelector('.pomo-ring-wrap').classList.remove('done');
    drawPomo();
  }

  function switchMode(m){
    pausePomo();pm.mode=m;pm.total=m==='work'?WORK:BRK;pm.left=pm.total;
    document.querySelector('.pomo-ring-wrap').classList.remove('done');
    $('mode-work').classList.toggle('active',m==='work');
    $('mode-break').classList.toggle('active',m==='break');
    $('pomo-sub').textContent=m==='work'?'جلسة عمل':'استراحة';
    drawPomo();
  }

  $('pbtn-play').addEventListener('click',startPomo);
  $('pbtn-pause').addEventListener('click',pausePomo);
  $('pbtn-reset').addEventListener('click',resetPomo);
  $('mode-work').addEventListener('click',function(){switchMode('work')});
  $('mode-break').addEventListener('click',function(){switchMode('break')});
  drawPomo();

  /* ═══════════════════════════════════
     5. QUOTES
     ═══════════════════════════════════ */
  var quotes=[
    {t:'النجاح ليس نهائيًا، والفشل ليس قاتلًا: إنما الشجاعة للاستمرار هي ما يهم.',a:'ونستون تشرشل'},
    {t:'الطريقة الوحيدة لإنجاز عمل عظيم هي أن تحب ما تفعله.',a:'ستيف جوبز'},
    {t:'لا تنتظر الفرصة، بل اصنعها.',a:'جورج برنارد شو'},
    {t:'ابدأ من حيث أنت. استخدم ما لديك. افعل ما تستطيع.',a:'آرثر آش'},
    {t:'الانضباط هو الجسر بين الأهداف والإنجاز.',a:'جيم رون'},
    {t:'لا يوجد طريق مختصر لأي مكان يستحق الذهاب إليه.',a:'بيفرلي سيلز'},
    {t:'إذا كنت تمر بجحيم، فاستمر في المشي.',a:'ونستون تشرشل'},
    {t:'الإنتاجية ليست في فعل المزيد، بل في تحقيق الأكثر أهمية.',a:'مجهول'},
    {t:'اجعل كل يوم تحفة فنية.',a:'جون وودن'},
    {t:'السر ليس في إدارة الوقت، بل في إدارة الطاقة.',a:'مجهول'},
    {t:'ليس المهم أن تكون الأفضل، بل أن تكون أفضل مما كنت بالأمس.',a:'مجهول'},
    {t:'كل إنجاز عظيم كان في البداية حلمًا.',a:'مجهول'}
  ];
  var qtEl=$('quote-txt'),qaEl=$('quote-cite');
  function newQuote(){
    var q=quotes[Math.floor(Math.random()*quotes.length)];
    qtEl.style.opacity='0';qaEl.style.opacity='0';
    setTimeout(function(){qtEl.textContent=q.t;qaEl.textContent='— '+q.a;qtEl.style.opacity='1';qaEl.style.opacity='1'},220);
  }
  $('new-quote').addEventListener('click',newQuote);
  newQuote();

  /* ═══════════════════════════════════
     6. TODOS
     ═══════════════════════════════════ */
  var todos=sGet('todos',[]),filter='all';

  function saveTodos(){sSet('todos',todos)}

  function renderTodos(){
    var ul=$('todo-list');ul.innerHTML='';
    var vis=todos.filter(function(t){
      if(filter==='active') return!t.done;
      if(filter==='completed') return t.done;return true;
    });
    $('todo-empty').style.display=vis.length===0?'flex':'none';
    vis.forEach(function(t){
      var li=document.createElement('li');li.className='item'+(t.done?' done':'');
      var cb=document.createElement('input');cb.type='checkbox';cb.className='chk';cb.checked=t.done;
      cb.addEventListener('change',function(){togTodo(t.id)});
      var tx=document.createElement('span');tx.className='itxt';tx.textContent=t.text;
      li.appendChild(cb);li.appendChild(tx);
      if(t.pri&&t.pri!=='normal'){
        var pr=document.createElement('span');
        pr.className='pri pri-'+t.pri;
        pr.textContent=t.pri==='urgent'?'عاجلة':'مهمة';
        li.appendChild(pr);
      }
      var dl=document.createElement('button');dl.className='del';dl.innerHTML='✕';
      dl.addEventListener('click',function(){delTodo(t.id)});
      li.appendChild(dl);ul.appendChild(li);
    });
    var done=todos.filter(function(t){return t.done}).length,total=todos.length;
    var pct=total?Math.round(done/total*100):0;
    $('todo-chip').textContent=todos.filter(function(t){return!t.done}).length;
    $('todo-progress').style.width=pct+'%';
    $('todo-label').textContent=done+' من '+total+' مكتملة ('+pct+'%)';
    refreshStats();refreshOverview();
  }
  function addTodo(txt,pri){
    txt=txt.trim();if(!txt) return;
    todos.push({id:uid(),text:txt,done:false,pri:pri||'normal'});
    saveTodos();renderTodos();$('todo-input').value='';$('todo-priority').value='normal';
  }
  function togTodo(id){todos.forEach(function(t){if(t.id===id)t.done=!t.done});saveTodos();renderTodos()}
  function delTodo(id){todos=todos.filter(function(t){return t.id!==id});saveTodos();renderTodos()}

  $('todo-form').addEventListener('submit',function(e){e.preventDefault();addTodo($('todo-input').value,$('todo-priority').value)});
  $$('.fbtn').forEach(function(b){
    b.addEventListener('click',function(){
      filter=this.dataset.filter;
      $$('.fbtn').forEach(function(x){x.classList.remove('active')});
      this.classList.add('active');renderTodos();
    });
  });
  renderTodos();

  /* ═══════════════════════════════════
     7. HABITS
     ═══════════════════════════════════ */
  var hData=sGet('habits',{list:[],comp:{}});
  var HCIRC=2*Math.PI*60;

  function saveH(){sSet('habits',hData)}
  function todayComp(){var k=dayKey();if(!hData.comp[k])hData.comp[k]=[];return hData.comp[k]}

  function calcStreak(){
    if(!hData.list.length) return 0;
    var s=0,d=new Date();
    for(var i=0;i<365;i++){
      var k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      var c=hData.comp[k]||[];
      var all=hData.list.every(function(h){return c.indexOf(h.id)!==-1});
      if(all&&hData.list.length>0)s++;
      else if(i>0)break;else break;
      d.setDate(d.getDate()-1);
    }
    return s;
  }

  function renderH(){
    var ul=$('habit-list');ul.innerHTML='';
    var comp=todayComp(),total=hData.list.length,done=0;
    $('habit-empty').style.display=total===0?'flex':'none';
    hData.list.forEach(function(h){
      var ok=comp.indexOf(h.id)!==-1;if(ok)done++;
      var li=document.createElement('li');li.className='item'+(ok?' done':'');
      var cb=document.createElement('input');cb.type='checkbox';cb.className='chk chk-circle';cb.checked=ok;
      cb.addEventListener('change',function(){togH(h.id)});
      var tx=document.createElement('span');tx.className='itxt';tx.textContent=h.name;
      var dl=document.createElement('button');dl.className='del';dl.innerHTML='✕';
      dl.addEventListener('click',function(){delH(h.id)});
      li.appendChild(cb);li.appendChild(tx);li.appendChild(dl);ul.appendChild(li);
    });
    var pct=total?Math.round(done/total*100):0;
    $('hring-pct').textContent=pct+'%';
    $('hring-fg').style.strokeDashoffset=HCIRC-(HCIRC*pct/100);
    $('streak-badge').textContent='🔥 '+calcStreak()+' يوم';
    if(total>0&&done===total) toast('🎊 أنجزت جميع عاداتك!','ok');
    refreshStats();refreshOverview();
  }
  function addH(n){n=n.trim();if(!n)return;hData.list.push({id:uid(),name:n});saveH();renderH();$('habit-input').value=''}
  function togH(id){var c=todayComp();var i=c.indexOf(id);if(i!==-1)c.splice(i,1);else c.push(id);saveH();renderH()}
  function delH(id){
    hData.list=hData.list.filter(function(h){return h.id!==id});
    Object.keys(hData.comp).forEach(function(k){hData.comp[k]=hData.comp[k].filter(function(x){return x!==id})});
    saveH();renderH();
  }
  $('habit-form').addEventListener('submit',function(e){e.preventDefault();addH($('habit-input').value)});
  renderH();

  /* ═══════════════════════════════════
     8. SCHEDULE
     ═══════════════════════════════════ */
  var sched=sGet('sched',[]);
  function saveSched(){sSet('sched',sched)}
  function renderSched(){
    var tl=$('timeline');tl.innerHTML='';
    var sorted=sched.slice().sort(function(a,b){return a.time.localeCompare(b.time)});
    $('sched-empty').style.display=sorted.length===0?'flex':'none';
    sorted.forEach(function(s){
      var d=document.createElement('div');d.className='tl-item';
      var b=document.createElement('span');b.className='tl-badge '+(s.color||'cyan');b.textContent=s.time;
      var n=document.createElement('span');n.className='tl-name';n.textContent=s.name;
      var dl=document.createElement('button');dl.className='tl-del';dl.innerHTML='✕';
      dl.addEventListener('click',function(){sched=sched.filter(function(x){return x.id!==s.id});saveSched();renderSched()});
      d.appendChild(b);d.appendChild(n);d.appendChild(dl);tl.appendChild(d);
    });
    refreshOverview();
  }
  $('show-sched-form').addEventListener('click',function(){
    var f=$('sched-form');f.style.display=f.style.display==='none'?'flex':'none';
    if(f.style.display==='flex')$('sched-name').focus();
  });
  $('sched-form').addEventListener('submit',function(e){
    e.preventDefault();
    var t=$('sched-time').value,n=$('sched-name').value.trim();
    if(!t||!n){toast('أدخل الوقت والاسم','warn');return}
    sched.push({id:uid(),time:t,name:n,color:$('sched-color').value});
    saveSched();renderSched();$('sched-name').value='';$('sched-time').value='';$('sched-form').style.display='none';
  });
  renderSched();

  /* ═══════════════════════════════════
     9. NOTES
     ═══════════════════════════════════ */
  var noteArea=$('note-area');
  noteArea.value=sGet('notes','');
  var nTimer;
  noteArea.addEventListener('input',function(){clearTimeout(nTimer);nTimer=setTimeout(function(){sSet('notes',noteArea.value)},500)});
  $('save-notes').addEventListener('click',function(){sSet('notes',noteArea.value);toast('✅ تم الحفظ','ok')});

  /* ═══════════════════════════════════
     10. BOOKMARKS
     ═══════════════════════════════════ */
  var bmarks=sGet('bmarks',[]);
  function saveBM(){sSet('bmarks',bmarks)}
  function renderBM(){
    var box=$('bm-list');box.innerHTML='';
    $('bm-empty').style.display=bmarks.length===0?'flex':'none';
    bmarks.forEach(function(b){
      var d=document.createElement('div');d.className='bm-item';
      var ic=document.createElement('div');ic.className='bm-icon';ic.textContent='🔗';
      var a=document.createElement('a');a.className='bm-link';a.href=b.url;a.target='_blank';a.rel='noopener';a.textContent=b.name;
      var dl=document.createElement('button');dl.className='bm-del';dl.innerHTML='✕';
      dl.addEventListener('click',function(){bmarks=bmarks.filter(function(x){return x.id!==b.id});saveBM();renderBM()});
      d.appendChild(ic);d.appendChild(a);d.appendChild(dl);box.appendChild(d);
    });
  }
  $('show-bm-form').addEventListener('click',function(){
    var f=$('bm-form');f.style.display=f.style.display==='none'?'flex':'none';
    if(f.style.display==='flex')$('bm-name').focus();
  });
  $('bm-form').addEventListener('submit',function(e){
    e.preventDefault();
    var n=$('bm-name').value.trim(),u=$('bm-url').value.trim();
    if(!n||!u){toast('أدخل الاسم والرابط','warn');return}
    if(!u.startsWith('http'))u='https://'+u;
    bmarks.push({id:uid(),name:n,url:u});saveBM();renderBM();
    $('bm-name').value='';$('bm-url').value='';$('bm-form').style.display='none';
  });
  renderBM();

  /* ═══════════════════════════════════
     11. STATS
     ═══════════════════════════════════ */
  function refreshStats(){
    var tt=todos.length,td=todos.filter(function(t){return t.done}).length;
    var ht=hData.list.length,hd=todayComp().length;
    var hp=ht?Math.round(hd/ht*100):0;
    $('stat-tasks').textContent=tt;
    $('stat-done').textContent=td;
    $('stat-habits').textContent=hp+'%';
    $('stat-pomo').textContent=pm.sess;

    // Mini rings (stroke-dashoffset out of 100)
    $('ring-tasks').style.strokeDashoffset=100-Math.min(tt*10,100);
    $('ring-done').style.strokeDashoffset=tt?100-Math.round(td/Math.max(tt,1)*100):100;
    $('ring-habits').style.strokeDashoffset=100-hp;
    $('ring-pomo').style.strokeDashoffset=100-Math.min(pm.sess*20,100);
  }

  /* ═══════════════════════════════════
     12. OVERVIEW
     ═══════════════════════════════════ */
  function refreshOverview(){
    var box=$('overview-list');box.innerHTML='';var items=[];
    var active=todos.filter(function(t){return!t.done});
    if(active.length){
      active.slice(0,3).forEach(function(t){
        items.push({t:t.text,c:t.pri==='urgent'?'ov-rose':'ov-cyan'});
      });
      if(active.length>3) items.push({t:'+ '+(active.length-3)+' مهام أخرى',c:'ov-cyan'});
    }
    var comp=todayComp();
    hData.list.filter(function(h){return comp.indexOf(h.id)===-1}).slice(0,2).forEach(function(h){
      items.push({t:'⏳ '+h.name,c:'ov-violet'});
    });
    var now=new Date(),ct=pad(now.getHours())+':'+pad(now.getMinutes());
    var up=sched.filter(function(s){return s.time>=ct}).sort(function(a,b){return a.time.localeCompare(b.time)});
    if(up.length) items.push({t:'📅 '+up[0].time+' — '+up[0].name,c:'ov-emerald'});
    if(!items.length) items.push({t:'لا توجد عناصر بعد',c:'ov-cyan'});
    items.forEach(function(it){
      var d=document.createElement('div');d.className='ov-item';
      var dot=document.createElement('span');dot.className='ov-dot '+it.c;
      var sp=document.createElement('span');sp.textContent=it.t;
      d.appendChild(dot);d.appendChild(sp);box.appendChild(d);
    });
  }

  /* ═══════════════════════════════════
     13. CLEANUP & INIT
     ═══════════════════════════════════ */
  (function(){
    var now=Date.now(),lim=30*24*60*60*1000;
    Object.keys(hData.comp).forEach(function(k){if(now-new Date(k).getTime()>lim)delete hData.comp[k]});
    saveH();
  })();

  // Init page
  var initPage=location.hash.replace('#','')||sGet('page','home');
  goTo(initPage);

})();
