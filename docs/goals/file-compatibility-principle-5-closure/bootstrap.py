from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[3]
OWNER=ROOT/'output/file-compatibility-principle-5-closure'
INDEX_SHA256='083fa77e3baad2992465f99872dbc94338febe65c17e6e05d8e4d745e288dd65'
VERIFIER_SHA256='987c2cf7f5cb5383b4de086105dfc62eecdbb6467adbf2ca8147d6c64ddfdca3'
path=OWNER/'verify.py';body=path.read_bytes()
if hashlib.sha256(body).hexdigest()!=VERIFIER_SHA256:raise AssertionError('external-verifier-pin')
if hashlib.sha256((OWNER/'index.json').read_bytes()).hexdigest()!=INDEX_SHA256:raise AssertionError('external-index-pin')
sys.argv=[str(path),'--index-sha256',INDEX_SHA256]
exec(compile(body,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
