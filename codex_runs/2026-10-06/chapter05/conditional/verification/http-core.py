import urllib.request,urllib.error,json
from pathlib import Path
base='http://localhost:3105';results=[]
def call(method,path,data=None,expected=200):
 req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Content-Type':'application/json'})
 try:r=urllib.request.urlopen(req)
 except urllib.error.HTTPError as e:r=e
 raw=r.read();payload=json.loads(raw) if raw else None
 results.append({'method':method,'path':path,'status':r.status,'expected':expected,'requestId':r.headers.get('x-request-id'),'body':payload})
 assert r.status==expected,(method,path,r.status,payload)
 assert r.headers.get('x-request-id')
 return payload
try:
 b=call('POST','/api/boards',{'title':'HTTP Board'},201)
 l=call('POST',f'/api/boards/{b["id"]}/lists',{'title':'HTTP List'},201)
 c=call('POST',f'/api/lists/{l["id"]}/cards',{'title':'HTTP Card','description':''},201)
 call('GET',f'/api/cards/{c["id"]}')
 for kind,limit in [('boards',100),('lists',100),('cards',200)]:
  id={'boards':b,'lists':l,'cards':c}[kind]['id']
  for title in ['', 'x'*(limit+1)]:call('PATCH',f'/api/{kind}/{id}',{'title':title},422)
  for title in ['x','x'*limit]:call('PATCH',f'/api/{kind}/{id}',{'title':title})
  call('GET',f'/api/{kind}/does-not-exist',expected=404)
 call('PATCH',f'/api/cards/{c["id"]}',{'description':'x'*2000})
 call('PATCH',f'/api/cards/{c["id"]}',{'description':'x'*2001},422)
 call('PATCH',f'/api/cards/{c["id"]}',{'description':''})
 d=call('POST',f'/api/lists/{l["id"]}/cards',{'title':'second'},201)
 call('PATCH',f'/api/cards/{d["id"]}',{'order':0})
 cards=call('GET',f'/api/lists/{l["id"]}/cards')['items'];assert [v['id'] for v in cards]==[d['id'],c['id']]
 call('PATCH',f'/api/cards/{c["id"]}',{'order':-1},422)
 call('PATCH',f'/api/cards/{c["id"]}',{'order':1.5},422)
 call('PATCH',f'/api/cards/{c["id"]}',{'order':2},422)
 l2=call('POST',f'/api/boards/{b["id"]}/lists',{'title':'second list'},201)
 call('PATCH',f'/api/lists/{l2["id"]}',{'order':0})
 lists=call('GET',f'/api/boards/{b["id"]}/lists')['items'];assert [v['id'] for v in lists]==[l2['id'],l['id']]
 call('DELETE',f'/api/cards/{d["id"]}',expected=204)
 call('DELETE',f'/api/lists/{l["id"]}',expected=204)
 call('GET',f'/api/cards/{c["id"]}',expected=404)
 call('DELETE',f'/api/boards/{b["id"]}',expected=204)
 call('GET',f'/api/lists/{l2["id"]}',expected=404)
 print('HTTP assertions passed;',len(results),'requests')
finally:
 Path('evidence/http-core.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
