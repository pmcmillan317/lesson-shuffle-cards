const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const dir='/home/claude/lesson-shuffle-cards/public/print';const out='/tmp/pp';fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(dir)){
 let h=fs.readFileSync(dir+'/'+f,'utf8').replace(/href="\//g,'href="file:///home/claude/lesson-shuffle-cards/public/').replace(/src="\//g,'src="file:///home/claude/lesson-shuffle-cards/public/');
 fs.writeFileSync('/tmp/pp/'+f,h);
 await p.goto('file:///tmp/pp/'+f);await p.evaluate(()=>document.fonts.ready);
 // overflow check in print layout
 await p.emulateMedia({media:'print'});
 const ov=await p.evaluate(()=>[...document.querySelectorAll('.sheet')].map(s=>s.scrollHeight-s.clientHeight));
 await p.pdf({path:out+'/'+f.replace('.html','.pdf'),format:'Letter',printBackground:true});
 await p.emulateMedia({media:'screen'});
 console.log(f,JSON.stringify(ov));}
await b.close();})();
