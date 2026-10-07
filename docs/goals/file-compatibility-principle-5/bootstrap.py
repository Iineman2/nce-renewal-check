"""External trust entry. An independently expected PIN hash is mandatory."""
from pathlib import Path
import hashlib,json,sys,subprocess
ROOT=Path(__file__).resolve().parents[3];REL='output/file-compatibility-principle-5'
def need(ok,cause):
    if not ok:raise AssertionError(cause)
def unique(pairs):
    d={}
    for k,v in pairs:need(k not in d,'duplicate-key');d[k]=v
    return d
def loads(raw):return json.loads(raw,object_pairs_hook=unique,parse_constant=lambda v:(_ for _ in ()).throw(AssertionError('nonfinite')))
def identity(p):
    b=p.read_bytes();return {'size':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pin_payload(raw,expected):
    need(isinstance(expected,str) and len(expected)==64 and hashlib.sha256(raw).hexdigest()==expected,'expected-pin-hash');pin=loads(raw)
    need(set(pin)=={'version','index','verifier'} and pin['version']=='authorized-handling-pin-v1','pin-schema');return pin
def checked_index(pin,root=ROOT):
    owner=(root/REL).resolve()
    need(pin['index']['path']==REL+'/proof-index.json' and pin['verifier']['path']==REL+'/verify.py','pin-path')
    for key in ['index','verifier']:need(identity(root/pin[key]['path'])==pin[key]['identity'],'pinned-'+key)
    index=loads((owner/'proof-index.json').read_bytes());required=loads((owner/'proof-required.json').read_bytes())
    need(index['version']=='authorized-handling-proof-v1' and index['requiredIdentity']==identity(owner/'proof-required.json') and set(index['files'])==set(required['paths']) and 'verify.py' in index['files'],'pinned-inventory')
    for name,wanted in index['files'].items():
        p=(owner/name).resolve();need(p.is_relative_to(owner) and p.is_file() and identity(p)==wanted,'pinned-leaf')
    need(index['files']['verify.py']==pin['verifier']['identity'],'pinned-verifier-leaf');return index
if __name__=='__main__':
    need(len(sys.argv)==2,'expected-pin-required');pin=pin_payload((Path(__file__).parent/'PIN.json').read_bytes(),sys.argv[1]);checked_index(pin)
    result=subprocess.run([sys.executable,'-I','-B',str(ROOT/pin['verifier']['path']),'verify',pin['index']['identity']['sha256'],pin['verifier']['identity']['sha256']],cwd=ROOT);raise SystemExit(result.returncode)
