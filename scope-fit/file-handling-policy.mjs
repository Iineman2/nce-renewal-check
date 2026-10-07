// The canonical handling declaration. Capability/presentation owners reference
// this exact immutable object; a same-version lookalike is not qualification.
const glossary = [
  { term: 'File use', definition: 'Selecting a file permits local case finding, record checking and original inspection in this page. HaloPSA permits checking and inspection.' },
  { term: 'Sharing', definition: 'No file upload, remote processing, evidence logging, application storage or sharing with another page.' },
  { term: 'Retention', definition: 'Temporary while selected, including hidden tabs. Cancel keeps files for retry. Replacement, removal or a detected local date change requires reselection.' },
  { term: 'Reset and exit', definition: 'Revoke access and remove selected files, results and retained originals. Restored pages require reselection. Pending native work cannot publish after removal.' },
  { term: 'Saved copies', definition: 'Saving an original is your explicit action. Reset cannot delete your source, downloads, browser or operating-system copies and backups.' },
  { term: 'Device access', definition: 'Processing uses this page and local workers. Your browser, device and extensions are outside this application permission boundary.' },
].map(row => Object.freeze(row));

export const AUTHORIZED_HANDLING = Object.freeze({
  version: 'local-selection-v2', scope: 'current-role-file-occurrence-page', handlesPerRole: 2,
  selectionEvent: 'owned-input-change', pickerDismissal: 'retain-unchanged-selection',
  retentionExpiry: 'detected-local-calendar-date-change',
  remoteProcessing: false, persistence: false, logging: false, crossPageSharing: false,
  glossary: Object.freeze(glossary),
});

export function assertHandlingDeclaration(value) {
  if (value !== AUTHORIZED_HANDLING) {
    throw new TypeError('Qualified local file handling is unavailable. Reload and reselect the original files.');
  }
  return value;
}
