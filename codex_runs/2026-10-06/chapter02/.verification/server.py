from pathlib import Path
import subprocess,sys,datetime
root=Path(__file__).resolve().parent.parent
app,port=sys.argv[1:3]
log=(root/'.verification'/f'{app}-server.log').open('w')
p=subprocess.Popen(['npm','run','dev','--','--port',port],cwd=root/app,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
(root/'.verification'/f'{app}-server.pid').write_text(str(p.pid))
with (root/'evidence/session.md').open('a') as f:f.write(f'\nサーバー起動: `{app}/` で `npm run dev -- --port {port}`。起動プロセス作成終了0。稼働は後続HTTP/Playwrightで確認。\n')
print('server started',app,port)
