const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  const dump = async (t) => { console.log('---', t, p.url()); console.log('INPUTS', JSON.stringify(await p.$$eval('input,textarea', els => els.map(e => e.getAttribute('aria-label') || e.placeholder)))); console.log('BTNS', JSON.stringify(await p.$$eval('[role=button],button', els => els.map(e => (e.getAttribute('aria-label') || e.innerText || '').slice(0, 30)).filter(Boolean)))); console.log((await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 700)); };
  await p.goto('http://localhost:8099/login'); await p.waitForTimeout(800);
  await p.getByLabel('CPF ou CNPJ').fill('52998224725'); await p.getByRole('textbox',{name:'Senha'}).fill('senha1234');
  await p.getByRole('button', { name: 'Entrar' }).click(); await p.waitForTimeout(2000);
  await p.goto('http://localhost:8099/agente/novo'); await p.waitForTimeout(1200); await dump('novo');
  
  await p.getByText('Agendamento',{exact:true}).first().click();
  await p.getByLabel('Nome do agente').fill('Clara');
  await p.getByLabel('Nome da empresa').fill('Clínica Sol');
  await p.getByRole('button',{name:'Continuar'}).click(); await p.waitForTimeout(600); await dump('step2');
  
  await p.getByText('Começar pelo modelo de agendamento').click(); await p.waitForTimeout(500); await dump('step2b');
  
  await p.getByLabel('Instruções do agente').fill('Você é a Clara, atendente da Clínica Sol. Atende de segunda a sexta, das 9h às 18h. Consulta custa R$ 200. Agende horários e confirme com o cliente.');
  await p.waitForTimeout(300);
  await p.getByRole('button',{name:'Salvar e continuar'}).click(); await p.waitForTimeout(2500); await dump('step3');
  
  await p.getByText('Entendi os riscos',{exact:false}).first().click(); await p.waitForTimeout(300);
  await p.getByRole('button',{name:'Gerar QR code'}).click(); await p.waitForTimeout(4500); await dump('conectado');
  await p.getByRole('button',{name:'Iniciar'}).click({timeout:5000}).catch(e=>console.log('iniciar:',e.message.slice(0,80))); await p.waitForTimeout(2000); await dump('fim');
  await p.screenshot({ path: 'novo.png' });
  await b.close();
})();
