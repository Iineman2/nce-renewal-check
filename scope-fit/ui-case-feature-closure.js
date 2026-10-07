async page => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : ['2026-12-30T12:00:00'])); } }; });
  await page.route('**/preflight.mjs', async route => {
    const response = await route.fetch(); let body = await response.text();
    body = body.replace('export function inspectRecords(', 'function originalInspection(');
    body += '\nexport function inspectRecords(...args){const d=originalInspection(...args);globalThis.__liveFeatureHandoff=d.caseHandoff;if(globalThis.__technicalFault&&d.status==="supplied-claims-look-in-scope")Object.defineProperty(d,"errors",{enumerable:true,get(){throw Error("Getter executed");}});return d;}';
    await route.fulfill({ response, body });
  });
  const modes = [];
  for (const phase of ['append', 'focus']) for (const role of ['heading', 'selection', 'selected', 'date', 'term', 'action', 'caveat']) modes.push('positive-' + phase + '-' + role);
  for (const kind of ['replace', 'remove', 'duplicate', 'nested', 'hidden', 'extra', 'nestedextra', 'ancestorhidden', 'inner', 'innerinput', 'innerimage', 'innerattribute', 'focusattribute', 'focusstyle', 'focusrootaria', 'focusparentaria', 'focusroothidden']) modes.push('positive-' + kind + '-selection');
  for (const phase of ['append', 'focus']) for (const role of ['heading', 'uncertainty']) modes.push('uncertainty-' + phase + '-' + role);
  for (const phase of ['append', 'focus']) modes.push('technical-' + phase + '-heading');
  for (const phase of ['append', 'focus']) for (const role of ['trail', 'pair', 'issue', 'help']) modes.push('textnode-' + phase + '-' + role);
  modes.push('recovery'); const passed = []; let producer;
  for (const mode of modes) {
    await page.goto('http://localhost:8765/');
    for (const [name, value] of [['reseller', 'yes'], ['distributor', 'pax8'], ['billing', 'halopsa'], ['commitment', 'annual-m365-nce']]) {
      await page.locator(`input[name="${name}"][value="${value}"]`).check(); await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.locator('input[name=renewal][value=exact]').check(); await page.locator('#renewal-date').fill('2027-01-15'); await page.getByRole('button', { name: 'Check fit', exact: true }).click();
    const pax = 'source_account_id,subscription_id,customer_ref,distributor,product_family,commerce_model,seat_based,commitment_term,renewal_date,end_of_term_state\n' + (mode.startsWith('uncertainty') ? '' : 'a') + ',A,cA,pax8,Microsoft 365,NCE,yes,annual,2027-01-15,' + (mode.endsWith('-issue') ? 'unknown' : 'renew') + '\n';
    const halo = 'line_id,subscription_id,customer_ref,billing_system\nlA,A,cA,HaloPSA\n';
    for (const [id, text] of [['pax-file', pax], ['halo-file', halo]]) await page.locator('#' + id).setInputFiles({ name: id + '.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
    await page.locator('#subscription-id').fill('A'); await page.locator('input[name=renewalTerm][value=annual]').check(); await page.locator('input[name=agreement][value=yes]').check();
    if (!mode.startsWith('uncertainty')) {
      await page.getByRole('button', { name: 'Check record facts', exact: true }).click();
      await page.getByRole('button', { name: 'I checked this subscription, line, and customer in the original systems', exact: true }).waitFor();
    }
    await page.evaluate(mode => {
      if (mode === 'recovery') return;
      const [branch, kind, role] = mode.split('-'); window.__technicalFault = branch === 'technical';
      const mutate = node => {
        if (branch === 'textnode') {
          if (window.__projectionFaultRan || !node?.querySelectorAll) return;
          const elements = [node, ...node.querySelectorAll('*')];
          const target = elements.find(element => role === 'trail' ? element.parentElement?.classList.contains('claim-trail') && element.tagName === 'P' && element.textContent.includes('No vendor authenticity') : role === 'pair' ? element.tagName === 'P' && element.textContent.startsWith('Selected pair:') : role === 'issue' ? element.tagName === 'LI' : element.tagName === 'P' && element.parentElement?.querySelector('summary')?.textContent === 'If I cannot obtain or verify the evidence');
          if (!target?.firstChild || target.firstChild.nodeType !== Node.TEXT_NODE) return;
          window.__projectionFaultRan = true; target.firstChild.nodeValue = 'Financial action is authorized for subscription B'; return;
        }
        if (kind.startsWith('inner') || window.__projectionFaultRan || !node || node.dataset.recordProjection !== role) return;
        window.__projectionFaultRan = true;
        if (kind === 'extra') { const extra = document.createElement('p'); extra.textContent = 'Financial action is authorized'; node.parentElement.appendChild(extra); }
        else if (kind === 'nestedextra') { const extra = document.createElement('span'); extra.textContent = 'Financial action is authorized'; node.appendChild(extra); }
        else if (kind === 'focusattribute') node.setAttribute('aria-label', 'Financial action is authorized');
        else if (kind === 'focusstyle') node.style.opacity = '0';
        else if (kind === 'focusroothidden') node.parentElement.hidden = true;
        else if (kind === 'focusrootaria') node.parentElement.setAttribute('aria-hidden', 'true');
        else if (kind === 'focusparentaria') node.parentElement.parentElement.setAttribute('aria-hidden', 'true');
        else if (kind === 'ancestorhidden') node.parentElement.style.display = 'none';
        else if (kind === 'replace') node.replaceWith(node.cloneNode(true));
        else if (kind === 'remove') node.remove();
        else if (kind === 'duplicate') node.parentElement.appendChild(node.cloneNode(true));
        else if (kind === 'nested') { const child = document.createElement('span'); child.textContent = node.textContent; node.replaceChildren(child); }
        else if (kind === 'hidden') node.hidden = true;
        else node.textContent = role === 'heading' ? 'Financial action is authorized' : role === 'selection' ? node.textContent.replace('subscription A, customer cA', 'subscription B, customer cB') : role === 'selected' ? node.textContent.replace('subscription A; HaloPSA line lA; customer reference cA', 'subscription B; HaloPSA line lB; customer reference cB') : 'FORGED ' + node.textContent;
      };
      if (kind === 'focus' || kind.startsWith('focus')) {
        const result = document.querySelector('#record-result'), focus = result.focus.bind(result);
        result.focus = () => { focus(); mutate(branch === 'textnode' ? result : result.querySelector(`[data-record-projection="${role}"]`)); };
      } else {
        const append = Element.prototype.append;
        Element.prototype.append = function (...nodes) {
          const value = append.apply(this, nodes);
          if (kind.startsWith('inner') && this.classList.contains('claim-trail') && !window.__projectionFaultRan) {
            let faultTarget;
            if (kind === 'innerattribute') { faultTarget = this.querySelector('p'); faultTarget.setAttribute('aria-label', 'Financial action is authorized'); }
            else { const extra = document.createElement(kind === 'innerinput' ? 'input' : kind === 'innerimage' ? 'img' : 'p'); if (kind === 'innerinput') extra.value = 'Financial action is authorized'; else if (kind === 'innerimage') extra.alt = 'Financial action is authorized'; else extra.textContent = 'Financial action is authorized'; this.appendChild(extra); faultTarget = extra; }
            window.__innerFault = { kind, hostTag: this.tagName, targetTag: faultTarget.tagName, detached: !this.isConnected };
            window.__projectionFaultRan = true;
          } else for (const node of nodes) mutate(node);
          if (branch === 'textnode') mutate(this); return value;
        };
      }
    }, mode);
    await page.getByRole('button', { name: mode.startsWith('uncertainty') ? 'Check record facts' : 'I checked this subscription, line, and customer in the original systems', exact: true }).click();
    if (mode.startsWith('uncertainty')) await page.waitForFunction(() => document.querySelector('#read-status').hidden);
    const observed = await page.evaluate(() => {
      const node = document.querySelector('#record-result');
      return { ran: window.__projectionFaultRan === true, innerFault: window.__innerFault, visible: !node.hidden && !!node.getClientRects().length, result: node.innerText, card: document.querySelector('#case-subject').innerText, id: document.querySelector('#subscription-id').value, handoff: { caseId: window.__liveFeatureHandoff?.selection.subject?.subscriptionId, selectionStatus: window.__liveFeatureHandoff?.selection.status } };
    });
    if (mode === 'recovery') {
      if (!observed.visible || !observed.result.startsWith('Supplied records look in scope provisionally') || !observed.result.includes('subscription A, customer cA') || observed.id !== 'A') throw Error('Fresh recovery failed');
      const png = await page.screenshot({ path: 'output/one-case-feature-closure/full-feature.png', fullPage: true });
      const sha256 = await page.evaluate(async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))).map(n => n.toString(16).padStart(2, '0')).join(''), Array.from(png));
      producer = { sha256, ...observed.handoff };
    } else {
      if (!observed.ran) throw Error('Unreached fault: ' + mode);
      const faultKind = mode.split('-')[1];
      if (faultKind.startsWith('inner') && JSON.stringify(observed.innerFault) !== JSON.stringify({ kind: faultKind, hostTag: 'DETAILS', targetTag: faultKind === 'innerinput' ? 'INPUT' : faultKind === 'innerimage' ? 'IMG' : 'P', detached: true })) throw Error('Wrong inner fault producer: ' + mode);
      if (observed.visible && (observed.result.includes('FORGED') || observed.result.includes('Financial action is authorized') || observed.result.includes('subscription B') || observed.result.startsWith('Supplied records look in scope provisionally') || observed.result.startsWith('Resolve case selection uncertainty'))) throw Error('Corrupt projection committed: ' + mode);
      if (observed.card.includes('Case selection: confirmed.')) throw Error('Failed result retained confirmation: ' + mode);
    }
    passed.push(mode);
  }
  if (errors.length) throw Error(errors.join('\n'));
  return 'PASS: F12-PROJECTION-ASSERTIONS:' + JSON.stringify(passed) + '\nF12-SCREENSHOT-PRODUCER:' + JSON.stringify(producer);
}
