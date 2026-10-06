import subprocess,sys,datetime,re,os
from pathlib import Path
root=Path(__file__).resolve().parent.parent
label,cwd,cmd=sys.argv[1:4]
env=os.environ.copy();env["npm_config_cache"]=str(root/".verification/npm-cache")
p=subprocess.run(cmd,shell=True,cwd=root/cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
s=p.stdout.replace(str(root),'[WORK]')
s=re.sub(r'/Users/[^/\s]+', '[HOME]', s)
s=re.sub(r'file:[^\s\x1b\"\']+', '[LOCAL_DB_URL]', s)
with (root/'evidence/session.md').open('a') as f:f.write(f'\n## {label}\n\n時刻: {datetime.datetime.now().isoformat()}\n作業場所: `{cwd}`\nコマンド: `{cmd}`\n終了コード: {p.returncode}\n\n```text\n{s}\n```\n')
print(s);print('EXIT',p.returncode)
sys.exit(p.returncode)
