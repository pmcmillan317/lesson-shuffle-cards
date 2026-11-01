const {chromium}=require('playwright');const fs=require('fs');const AXE=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch();const agg={};
for(const scheme of ['light','dark']){const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:scheme});const p=await c.newPage();
for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){
 await p.goto('http://localhost:8770/'+f.replace('.html',''));
 // open all details so hidden content is checked too
 await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
 await p.addScriptTag({content:AXE});
 const r=await p.evaluate(async()=>{const x=await axe.run(document,{runOnly:['wcag2a','wcag2aa','best-practice']});return x.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,ex:v.nodes.slice(0,2).map(n=>n.target.join(' ')+' :: '+(n.any[0]&&n.any[0].message||'').slice(0,120))}))});
 for(const v of r){const k=scheme+' '+v.id;agg[k]=agg[k]||{impact:v.impact,pages:0,nodes:0,ex:v.ex,where:[]};agg[k].pages++;if(agg[k].where.length<8)agg[k].where.push(f);agg[k].nodes+=v.n;}
}
await c.close();}
console.log(JSON.stringify(agg,null,1));await b.close();})();
