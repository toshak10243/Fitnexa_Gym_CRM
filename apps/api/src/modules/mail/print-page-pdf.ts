import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { chown, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import { Readable, Writable } from 'stream';
import { uploadImage } from './member-admission-document';

/** Render the actual protected SPA print page in an isolated browser. Database data
 * is supplied inside this browser only; no bearer token or public admission URL is created. */
export async function renderAdmissionPage(input: { appUrl: string; executable?: string; memberId: string; tenant: object; user: object; member: object; invoiceId?: string; invoice?: object }): Promise<Buffer> {
  const selector = input.invoiceId ? 'printable-invoice-document' : 'printable-admission-form';
  const executable = [input.executable, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(file => file && existsSync(file));
  if (!executable) throw new Error('Chromium is required for admission PDF rendering. Set PDF_BROWSER_PATH.');
  const origin = new URL(input.appUrl).origin;
  const profile = await mkdtemp(path.join(tmpdir(), 'trifit-admission-'));
  const browserUid = Number(process.env.PDF_BROWSER_UID);
  const browserGid = Number(process.env.PDF_BROWSER_GID);
  const isolatedUser = process.platform === 'linux' && process.getuid?.() === 0 && Number.isInteger(browserUid) && browserUid > 0 && Number.isInteger(browserGid) && browserGid > 0;
  if (isolatedUser) await chown(profile, browserUid, browserGid);
  const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${profile}`], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'], windowsHide: true, ...(isolatedUser ? { uid: browserUid, gid: browserGid, env: { ...process.env, HOME: process.env.PDF_BROWSER_HOME || '/home/fitnexa-pdf' } } : {}) });
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  let sequence = 0;
  let session: string | undefined;
  const inputPipe = child.stdio[3] as Writable;
  const outputPipe = child.stdio[4] as Readable;
  const send = (method: string, params: object = {}, sessionId = session): Promise<any> => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    inputPipe.write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
  const fail = (error: Error) => { pending.forEach(p => p.reject(error)); pending.clear(); };
  child.on('error', fail);
  child.on('exit', () => fail(new Error('Admission PDF browser closed')));
  let buffer = '';
  let protocolError: Error | undefined;
  const browserErrors: string[] = [];
  outputPipe.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    let index: number;
    while ((index = buffer.indexOf('\0')) >= 0) {
      const message = JSON.parse(buffer.slice(0, index)); buffer = buffer.slice(index + 1);
      if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserErrors.push(message.params.args.map((arg: { description?: string; value?: string }) => arg.description || arg.value || '').join(' '));
      if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p?.reject(new Error(message.error.message)); else p?.resolve(message.result); }
      if (message.method === 'Fetch.requestPaused') {
        const request = message.params;
        const url = new URL(request.request.url);
        let body: object | Buffer | undefined;
        if (url.pathname.startsWith('/uploads/')) body = uploadImage(url.pathname);
        if (url.pathname.endsWith('/auth/me')) body = { data: { tenant: input.tenant, user: input.user } };
        if (url.pathname.endsWith(`/members/${input.memberId}/admission-form`)) body = { data: input.member };
        if (input.invoiceId && request.resourceType !== 'Document' && url.pathname.endsWith(`/billing/invoices/${input.invoiceId}`)) body = { data: input.invoice };
        const contentType = Buffer.isBuffer(body) ? (/\.webp$/i.test(url.pathname) ? 'image/webp' : /\.jpe?g$/i.test(url.pathname) ? 'image/jpeg' : 'image/png') : 'application/json';
        const command = body ? send('Fetch.fulfillRequest', { requestId: request.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: contentType }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Credentials', value: 'true' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Accept' }, { name: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' }], body: (Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))).toString('base64') }) : send('Fetch.continueRequest', { requestId: request.requestId });
        void command.catch(error => { protocolError = error; });
      }
    }
  });
  let timeout: ReturnType<typeof setTimeout>;
  const render = async () => {
    const target = await send('Target.createTarget', { url: 'about:blank' });
    session = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*auth/me*' }, { urlPattern: '*admission-form*' }, { urlPattern: '*billing/invoices/*' }, { urlPattern: '*uploads/*' }] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('fitnexa_access_token','isolated-print-render');" });
    await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: input.invoiceId ? `${origin}/billing/invoices/${encodeURIComponent(input.invoiceId)}` : `${origin}/members/${encodeURIComponent(input.memberId)}/print` });
    const ready = await send('Runtime.evaluate', { expression: `(async () => { for(let i=0;i<150;i++){const form=document.getElementById('${selector}'); if(form){await document.fonts.ready; await Promise.all(Array.from(form.querySelectorAll('img')).map(img => img.decode())); return true;} await new Promise(r=>setTimeout(r,100));} throw new Error('Print document did not load');})()`, awaitPromise: true, returnByValue: true });
    if (ready.exceptionDetails || protocolError) {
      const state = await send('Runtime.evaluate', { expression: 'JSON.stringify({path:location.pathname,title:document.title,printElements:Array.from(document.querySelectorAll("[id]" )).map(e=>e.id).filter(id=>id.includes("print"))})', returnByValue: true });
      throw new Error(`Print document render failed: ${ready.exceptionDetails?.exception?.description || protocolError?.message || 'Unknown browser error'} ${browserErrors.join('; ')} ${state.result?.value || ''}`);
    }
    // Match printHtmlElement: isolate the same form and use the same A4 margins.
    await send('Runtime.evaluate', { expression: `(() => { const form=document.getElementById('${selector}'); document.body.replaceChildren(form); const style=document.createElement('style'); style.textContent='@page{size:A4 portrait;margin:10mm 12mm 10mm 12mm}body{margin:0;padding:0;background:#FFFFFF!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.printable-document{border:none!important;box-shadow:none!important;padding:0!important;margin:0!important;width:100%!important;max-width:100%!important;background:#FFFFFF!important}tr,.print-avoid-break{break-inside:avoid!important}'; document.head.appendChild(style); })()` });
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, paperWidth: 8.2677, paperHeight: 11.6929 });
    return Buffer.from(pdf.data, 'base64');
  };
  try { return await Promise.race([render(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Admission PDF rendering timed out')), 25000); })]); }
  finally { clearTimeout(timeout!); child.kill(); fail(new Error('PDF render finished')); await new Promise<void>(resolve => child.exitCode !== null ? resolve() : child.once('exit', () => resolve())); await rm(profile, { recursive: true, force: true, maxRetries: 3 }).catch(() => undefined); }
}
