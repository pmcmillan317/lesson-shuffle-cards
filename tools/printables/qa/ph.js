const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:1200}});
for(const f of fs.readdirSync('/tmp/pp').filter(x=>x.endsWith('.html'))){
 await p.goto('file:///tmp/pp/'+f);await p.evaluate(()=>document.fonts.ready);await p.emulateMedia({media:'print'});
 const r=await p.evaluate(()=>{const st=document.createElement('style');st.textContent='.sheet{height:auto!important;overflow:visible!important}';document.head.appendChild(st);
  return [...document.querySelectorAll('.sheet')].map(s=>Math.round(s.getBoundingClientRect().height))});
 console.log(f,r.join(','));}
await b.close();})();
