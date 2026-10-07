"""Trusted external entry point: expected PIN digest is mandatory.
No code from the mutable proof pack is imported before all pinned leaves match.
"""
from pathlib import Path
import hashlib,json,sys,subprocess

ROOT=Path(__file__).resolve().parents[3]
REL='output/file-compatibility-principle-4-closure'
def require(x,cause):
    if not x:raise AssertionError(cause)
def unique(pairs):
    d={}
    for k,v in pairs:
        require(k not in d,'duplicate-key');d[k]=v
    return d
def loads(raw):return json.loads(raw,object_pairs_hook=unique,parse_constant=lambda v:(_ for _ in ()).throw(AssertionError('nonfinite')))
def identity(p):
    b=p.read_bytes();return {'size':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pin_payload(raw,expected):
    require(isinstance(expected,str) and len(expected)==64 and hashlib.sha256(raw).hexdigest()==expected,'expected-pin-hash');pin=loads(raw)
    require(set(pin)=={'version','index','verifier'} and pin['version']=='file-data-closure-pin-v1','pin-schema');return pin
def checked_index(pin,root=ROOT):
    owner=(root/REL).resolve()
    require(pin['index']['path']==REL+'/proof-index.json' and pin['verifier']['path']==REL+'/verify.py','pin-path')
    for item in [pin['index'],pin['verifier']]:require(identity(root/item['path'])==item['identity'],'pinned-'+('index' if item is pin['index'] else 'verifier'))
    index=loads((owner/'proof-index.json').read_bytes());required=loads((owner/'proof-required.json').read_bytes())
    require(index['version']=='file-data-closure-proof-v1' and index['requiredIdentity']==identity(owner/'proof-required.json') and set(index['files'])==set(required['paths']) and 'verify.py' in index['files'],'pinned-inventory')
    for name,value in index['files'].items():
        path=(owner/name).resolve();require(path.is_relative_to(owner) and path.is_file() and identity(path)==value,'pinned-leaf')
    require(index['files']['verify.py']==pin['verifier']['identity'],'pinned-verifier-leaf');return index
if __name__=='__main__':
    require(len(sys.argv)==2,'expected-pin-required')
    pin=pin_payload((Path(__file__).parent/'PIN.json').read_bytes(),sys.argv[1]);checked_index(pin)
    result=subprocess.run([sys.executable,'-I','-B',str(ROOT/pin['verifier']['path']),'verify',pin['index']['identity']['sha256'],pin['verifier']['identity']['sha256']],cwd=ROOT)
    raise SystemExit(result.returncode)
