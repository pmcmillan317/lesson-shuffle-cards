const {chromium}=require('playwright');const fs=require('fs');const R='/home/claude/lesson-shuffle-cards/public';
const top=fs.readdirSync(R).filter(f=>f.endsWith('.html')).map(f=>'/'+f.replace('.html',''));
const pr=fs.readdirSync(R+'/print').map(f=>'/print/'+f.replace('.html',''));
const exists=u=>{u=u.split('#')[0].split('?')[0];if(u==='/')return true;return fs.existsSync(R+u)||fs.existsSync(R+u+'.html')};
(async()=>{const b=await chromium.launch();const probs=[];
for(const w of [390,1280]){const p=await b.newPage({viewport:{width:w,height:860}});
 for(const u of [...top,...pr]){const errs=[];p.removeAllListeners('pageerror');p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8770'+u,{waitUntil:'networkidle'});
  const r=await p.evaluate(()=>({o:document.documentElement.scrollWidth>innerWidth+1,links:[...document.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href')),broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)}));
  const bad=r.links.filter(l=>!exists(l));
  if((r.o&&!u.startsWith('/print/'))||bad.length||errs.length||r.broken.length)probs.push({w,u,o:r.o,bad,errs,broken:r.broken});
  if(u==='/printables'||u==='/think-pair-rotate-share'||u==='/print/word-wise-organizer')await p.screenshot({path:`/tmp/pq-${w}-${u.replace(/\//g,'_')}.png`,fullPage:u==='/printables'});}
 await p.close();}
console.log(JSON.stringify(probs,null,0));await b.close();})();
