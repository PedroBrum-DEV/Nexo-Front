import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ---------- CSV (separador ";" e BOM, que é o que o Excel em português abre sem bagunçar os acentos) ----------
const esc = (v: string | number) => { const s = String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCSV = (headers: string[], rows: (string | number)[][]) => '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
export const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ---------- salvar / compartilhar arquivo ----------
// Navegador: baixa o arquivo. Celular: grava no cache e abre a folha de compartilhamento (Salvar em Arquivos, e-mail, WhatsApp...).
export async function saveFile(filename: string, content: string, mime: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const f = new File(Paths.cache, filename);
  if (f.exists) f.delete();
  f.create(); f.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este aparelho não permite compartilhar arquivos.');
  await Sharing.shareAsync(f.uri, { mimeType: mime, dialogTitle: filename, UTI: mime === 'application/json' ? 'public.json' : undefined });
}

// PDF: no navegador abre a janela de impressão (escolha "Salvar como PDF"); no celular gera o arquivo e compartilha.
export async function savePdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    // o expo-print na web só chama window.print() (imprimiria a tela do app): o relatório vai para um quadro oculto e só ele é impresso
    await new Promise<void>((resolve, reject) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true'); f.title = 'Relatório';
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;';
      f.onload = () => {
        try { f.contentWindow?.focus(); f.contentWindow?.print(); } catch (e) { f.remove(); reject(e); return; }
        setTimeout(() => { f.remove(); resolve(); }, 2000);
      };
      f.srcdoc = html;
      document.body.appendChild(f);
    });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este aparelho não permite compartilhar arquivos.');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Relatório', UTI: 'com.adobe.pdf' });
}

// ---------- HTML do relatório (vira o PDF) ----------
export type ReportData = {
  title: string; subtitle: string; periodLabel: string; agentLabel: string;
  kpis: [string, string][]; headers: string[]; rows: (string | number)[][]; services: [string, number][];
};
const h = (s: string | number) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function reportHtml(d: ReportData, brand = 'Nexo'): string {
  const when = new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${h(d.title)}</title><style>
  *{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A2A40;margin:0;padding:32px}
  header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #0B5C8E;padding-bottom:16px;margin-bottom:20px}
  .logo{width:40px;height:40px}h1{font-size:22px;margin:0}header p{margin:2px 0 0;color:#4F6B80;font-size:13px}
  .meta{display:flex;gap:24px;font-size:13px;color:#4F6B80;margin-bottom:18px}.meta b{color:#0A2A40}
  .kpis{display:flex;gap:12px;margin-bottom:22px}.kpi{flex:1;border:1px solid #DCE7EF;border-radius:10px;padding:12px 14px}.kpi span{display:block;font-size:12px;color:#4F6B80}.kpi b{font-size:24px}
  h2{font-size:15px;margin:22px 0 8px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px 10px;border-bottom:1px solid #DCE7EF;text-align:right}
  th:first-child,td:first-child{text-align:left}th{background:#F4F8FB;font-weight:600}tr:last-child td{font-weight:700}
  footer{margin-top:28px;font-size:11px;color:#4F6B80;border-top:1px solid #DCE7EF;padding-top:10px}@media print{body{padding:0}}
  </style></head><body>
  <header><svg class="logo" viewBox="0 0 48 48"><path fill="#0B5C8E" d="M17 4h14c7.2 0 13 5.8 13 13v8c0 7.2-5.8 13-13 13H22.5L11 44.5l2.2-8.6C8 34.5 4 30.2 4 25v-8C4 9.8 9.8 4 17 4z"/><path d="M12.5 22.5c3-6 6.3-6 9.5 0s6.5 6 9.5 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><circle cx="36" cy="22.5" r="2.4" fill="#E0B040"/></svg>
  <div><h1>${h(d.title)}</h1><p>${h(d.subtitle)}</p></div></header>
  <div class="meta"><div>Período: <b>${h(d.periodLabel)}</b></div><div>Agente: <b>${h(d.agentLabel)}</b></div></div>
  <div class="kpis">${d.kpis.map(([k, v]) => `<div class="kpi"><span>${h(k)}</span><b>${h(v)}</b></div>`).join('')}</div>
  <h2>Por semana</h2><table><thead><tr>${d.headers.map((x) => `<th>${h(x)}</th>`).join('')}</tr></thead><tbody>${d.rows.map((r) => `<tr>${r.map((c) => `<td>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <h2>Serviços mais agendados</h2><table><thead><tr><th>Serviço</th><th>Agendamentos</th></tr></thead><tbody>${d.services.map(([n, v]) => `<tr><td>${h(n)}</td><td>${h(v)}</td></tr>`).join('')}</tbody></table>
  <footer>${h(brand)} · gerado em ${h(when)}</footer></body></html>`;
}
