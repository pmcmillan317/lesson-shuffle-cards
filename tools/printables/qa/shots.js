const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:900,height:1200},deviceScaleFactor:1.2});
const out='/tmp/shots';fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync('/tmp/pp').filter(x=>x.endsWith('.html'))){
 await p.goto('file:///tmp/pp/'+f);await p.addStyleTag({content:'@font-face{font-family:"Days One";src:url(file:///home/claude/lesson-shuffle-cards/public/fonts/days-one-latin-400-normal.woff2)}@font-face{font-family:"Rubik";font-weight:400;src:url(file:///home/claude/lesson-shuffle-cards/public/fonts/rubik-latin-400-normal.woff2)}@font-face{font-family:"Rubik";font-weight:500;src:url(file:///home/claude/lesson-shuffle-cards/public/fonts/rubik-latin-500-normal.woff2)}'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);await p.emulateMedia({media:'print'});
 const sh=await p.$$('.sheet');let i=0;for(const s of sh){await s.screenshot({path:`${out}/${f.replace('.html','')}-${++i}.png`});}
}
await p.emulateMedia({media:'screen'});await p.setViewportSize({width:1100,height:900});
await p.goto('file:///tmp/pp/clock-partners.html');await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:out+'/_screen-clock.png'});
await b.close();})();
