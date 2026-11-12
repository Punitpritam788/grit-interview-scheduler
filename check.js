// Run: node check.js   (needs playwright). Checks double booking, the 24h cancel rule, exact student messages,
// the 10,000-student path, no horizontal scroll on a 320px phone, and that the write-up prints on 2 pages.
const {chromium}=require('playwright');const assert=require('assert');
(async()=>{const b=await chromium.launch(),p=await b.newPage(),err=[];p.on('pageerror',e=>err.push(e.message));
 await p.goto('file://'+__dirname+'/index.html');
 const r=await p.evaluate(()=>{const id=S.slots.find(isFree).id;S.me='s3';bookSlot(id);S.me='s4';bookSlot(id);dirty=true;return S.slots.filter(x=>x.by).length+'|'+S.students.find(s=>s.id==='s4').st});
 assert.equal(r,'3|eligible','slot was double booked');
 const txt=await p.evaluate(()=>{S.me='s3';tab='home';go();return document.getElementById('app').innerText});
 assert(/Your interview is booked for \w{3}, \d+ \w{3} at \d+:\d\d (AM|PM) with \w+\.\nYou can cancel up to 24 hours before\./.test(txt),'booked message differs: '+txt);
 assert(await p.evaluate(()=>{const x=ix().slotBy.get('s3');return canCancel({date:fmt(0),time:'23:00'})===false&&canCancel(x)===(new Date(x.date+'T'+x.time)-Date.now()>=864e5)}),'cancel rule');
 await p.evaluate(()=>{S.me='s6';tab='home';go()});assert((await p.innerText('#app')).includes('You passed. Your Full-Stack Track Badge is now on your profile.'));
 await p.evaluate(()=>{const s=ix().byId.get('s4');s.st='retake';s.after=fmt(7);S.me='s4';tab='home';go()});assert(/You're almost there\. Your interviewer wants a second look\.\nYou can rebook from/.test(await p.innerText('#app')));
 await p.evaluate(()=>{A.big();A.nav({v:'roster'})});await p.waitForSelector('.vr');
 const rows=await p.evaluate(()=>document.querySelectorAll('.vr').length);assert(rows<40,'roster drew '+rows+' rows');
 const ms=await p.evaluate(()=>{const t=performance.now();rq='a';paintRoster();return performance.now()-t});assert(ms<200,'search repaint '+ms+'ms');
 // classic version inside the same file: opens, shares the saved data, and switches back
 await p.evaluate(()=>{S=seed();dirty=true;saveSoon()});await p.waitForTimeout(400);await p.evaluate(()=>setMode('classic'));
 const fr=p.frameLocator('#cl');await fr.locator('button.nv:text-is("Book interview")').click();await fr.locator('.slot').first().click();
 await p.waitForTimeout(300);assert(await p.evaluate(()=>S.students.find(s=>s.id==='s3').st)==='booked','classic booking not saved');
 await fr.locator('.seg button:text-is("New")').click();await p.waitForTimeout(500);
 assert(await p.evaluate(()=>S.students.find(s=>s.id==='s3').st==='booked'&&!document.body.classList.contains('classic')),'switch back lost data');
 const d=await b.newPage();await d.goto('file://'+__dirname+'/index.html#classic');await d.waitForSelector('#cl');assert(await d.frameLocator('#cl').locator('button.nv').count()>0,'#classic link did not open classic');
 // overview: animated workflow steps move
 await p.evaluate(()=>{tab='ov';go()});await p.waitForSelector('.lanes');await p.evaluate(()=>A.ostep({v:'2'}));assert(await p.evaluate(()=>document.querySelector('.lh.on').dataset.os==='2'&&document.querySelector('.lanes').style.getPropertyValue('--s')==='2'),'overview step');
 // no sideways scroll at any width, on any screen (the before/after screen once overflowed at 821 to 900px)
 for(const w of [320,414,768,821,900,1008,1180,1280,1440]){const q=await b.newPage({viewport:{width:w,height:800}});await q.goto('file://'+__dirname+'/index.html');for(const t of ['ov','home','book','badges','avail','today','roster','ba','doc']){await q.evaluate(t=>{tab=t;FRESH=false;render()},t);const d=await q.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert(d<=0,t+' overflows '+d+'px at '+w)}await q.close()}
 // phone: no horizontal scroll on any screen at 320px
 const m=await b.newPage({viewport:{width:320,height:640},isMobile:true,hasTouch:true});m.on('pageerror',e=>err.push(e.message));await m.goto('file://'+__dirname+'/index.html');
 for(const t of ['ov','home','book','badges','avail','today','roster','ba','doc']){await m.evaluate(t=>A.nav({v:t}),t);await m.waitForTimeout(600);
  const w=await m.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);assert(w[0]<=w[1],t+' scrolls sideways '+w)}
 // write-up prints on 2 A4 pages
 await p.evaluate(()=>{S=seed();dirty=true;A.nav({v:'doc'})});await p.waitForSelector('.stack');await p.waitForTimeout(500);await p.emulateMedia({media:'print'});
 const pdf=await p.pdf({format:'A4',printBackground:true});const pages=Math.max(...[...pdf.toString('latin1').matchAll(/\/Count (\d+)/g)].map(m=>+m[1]));assert(pages<=2,'write-up prints on '+pages+' pages');
 assert.deepEqual(err,[]);console.log('ok',{rows,ms:Math.round(ms),pages});await b.close()})();
