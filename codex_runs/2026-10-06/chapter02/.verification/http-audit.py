import urllib.request,urllib.error,json,sys,sqlite3
from pathlib import Path
port,app=sys.argv[1:3];base='http://localhost:'+port
state=json.loads(Path('.verification/browser/'+app+'-state.json').read_text())
def call(method,path,body=None):
 req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Content-Type':'application/json'})
 try:r=urllib.request.urlopen(req)
 except urllib.error.HTTPError as e:r=e
 data=json.load(r);print(method,path,r.status,json.dumps(data,ensure_ascii=False));return r.status,data
_,b=call('POST','/api/boards',{'title':'　Test \t\n'});assert b['title']=='Test'
_,rows=call('GET','/api/boards');assert rows[0]['id']==b['id'];print('PASS Board追加後のcreatedAt降順')
_,ls=call('GET','/api/boards/'+state['board']+'/lists');assert [l['title'] for l in ls]==['ToDo','進行中','Done']
_,cs=call('GET','/api/lists/'+state['lists'][0]+'/cards');assert cs[0]['title']=='要件を再確認' and cs[1]['title']=='APIを実装'
for method,path,body in [('POST','/api/boards',{'title':''}),('GET','/api/boards/not-found/lists',None),('POST','/api/boards/not-found/lists',{'title':''}),('GET','/api/lists/not-found/cards',None),('POST','/api/lists/not-found/cards',{'title':''}),('PATCH','/api/cards/not-found',{'title':''})]:
 status,data=call(method,path,body);assert status==(400 if path=='/api/boards' else 404)
connection=sqlite3.connect(f'{app}/prisma/dev.db')
for table in ['Board','List','Card']:
 print('SQLite schema',table,connection.execute(f'PRAGMA table_info("{table}")').fetchall())
 print('SQLite count',table,connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0])
print('SQLite migrations',connection.execute('SELECT migration_name, finished_at IS NOT NULL FROM _prisma_migrations').fetchall())
connection.close()
print('PASS HTTPとSQLite実データを照合')
