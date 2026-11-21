const { chromium } = require('playwright'); const fs=require('fs');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
(async()=>{
  const b=await chromium.launch();
  for (const dark of [false,true]) {
  const ctx=await b.newContext({viewport:{width:1280,height:900},colorScheme:dark?'dark':'light'}); const p=await ctx.newPage();
  const run=async(name)=>{ await p.addScriptTag({content:axe}); const r=await p.evaluate(()=>axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa']}));
    console.log('##',dark?'dark':'light',name,'violations:',r.violations.length);
    for(const v of r.violations) console.log('  -',v.id,v.impact,v.nodes.length,'|',v.help,'|',v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' ; ').slice(0,160)); };
  await p.goto('http://localhost:8099/login'); await p.waitForTimeout(3000); await run('login');
  await p.getByLabel('CPF ou CNPJ').fill('52998224725'); await p.getByRole('textbox',{name:'Senha'}).fill('senha1234');
  await p.getByRole('button',{name:'Entrar'}).click(); await p.waitForTimeout(3500); await run('home');
  for (const [u,n] of [['/agente/novo','novo'],['/agentes','agentes'],['/registros','registros'],['/relatorios','relatorios'],['/conta','conta']]) { await p.goto('http://localhost:8099'+u); await p.waitForTimeout(3000); await run(n); }
  await ctx.close(); }
  await b.close();
})();
