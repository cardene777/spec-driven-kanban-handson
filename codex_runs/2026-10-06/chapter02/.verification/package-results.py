from pathlib import Path
import hashlib,zipfile,re
root=Path('.')
excluded={'node_modules','.next','generated','binaries','.cache','.git'}
files=[]
for app in ['prompt','skill','evidence']:
 for p in sorted((root/app).rglob('*')):
  if not p.is_file() or any(part in excluded for part in p.parts):continue
  if p.name.startswith('.env') or p.suffix in {'.db','.sqlite','.tsbuildinfo'} or '.db-' in p.name or p.name=='provenance.txt':continue
  if p.name in {'file-manifest.tsv','public-artifacts.txt'}:continue
  files.append(p)
for p in sorted(Path('.verification').glob('*.py')):files.append(p)
files.extend([Path('.verification/browser/check.cjs'),Path('.verification/browser/package.json'),Path('.verification/browser/package-lock.json')])
for p in files:
 data=p.read_bytes()
 assert not re.search(rb'/Users/[A-Za-z][A-Za-z0-9_.-]+/|/private/tmp/[A-Za-z][A-Za-z0-9_.-]+/',data), 'personal absolute path: '+str(p)
 assert not re.search(rb'(?i)sk-(?:proj-|ant-)[a-z0-9_-]{20,}',data), 'token-like text: '+str(p)
Path('evidence/file-manifest.tsv').write_text('path\tsha256\n'+''.join(str(p)+'\t'+hashlib.sha256(p.read_bytes()).hexdigest()+'\n' for p in files))
files.extend([Path('evidence/file-manifest.tsv'),Path('evidence/public-artifacts.txt')])
Path('evidence/public-artifacts.txt').write_text('\n'.join(str(p) for p in files)+'\n')
with zipfile.ZipFile('verification-results.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,str(p))
with zipfile.ZipFile('verification-results.zip') as z:
 assert len(z.namelist())==len(files)
 assert z.testzip() is None
 for name in z.namelist():
  assert not any(x in Path(name).parts for x in excluded)
  assert not Path(name).name.startswith('.env')
print('Public archive verified:',len(files),'files; no DB/env/dependencies/binaries/cache/personal absolute paths.')
