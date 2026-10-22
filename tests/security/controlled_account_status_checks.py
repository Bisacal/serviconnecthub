import os,json,uuid,time,sys
from pathlib import Path
import requests
if os.environ.get('SERVICONNECT_CONTROLLED_STATUS_TEST') != 'explicitly-approved':
 raise SystemExit('Refusing live mutations without an approved reversible test plan.')
ROOT=Path(os.environ['STATUS_TEST_WORKDIR']); F=json.loads((ROOT/'fixtures.json').read_text())
BASE=os.environ['SUPABASE_URL'].rstrip('/'); KEY=os.environ['SUPABASE_PUBLISHABLE_KEY']; CACHE=Path.home()/'.cache/lovable-auth'
P=json.loads((CACHE/'provider-test-session.json').read_text())['session']; A=json.loads((CACHE/'session.json').read_text())['session']
UID=os.environ['STATUS_TEST_USER_ID']; PID=os.environ['STATUS_TEST_PROVIDER_ID']
assert P['user']['id']==UID and A['user']['id']==os.environ['STATUS_TEST_ADMIN_ID']
results=[];tracked={};files=[];phase='setup'; original={}; abort=None

def call(session,method,path,data=None,raw=None):
 h={'apikey':KEY,'Prefer':'return=representation'}
 if session:h['Authorization']='Bearer '+session['access_token']
 if raw is not None:h['Content-Type']='text/plain'
 r=requests.request(method,BASE+path,headers=h,json=data if raw is None else None,data=raw,timeout=30)
 try:b=r.json()
 except ValueError:b=None
 return r,b

def rest(session,method,table,data=None,flt=''):
 return call(session,method,'/rest/v1/'+table+flt,data)
def read(table,fid,session=P):
 r,b=rest(session,'GET',table,flt='?id=eq.'+fid)
 if r.status_code!=200:raise RuntimeError('Read failed: '+table)
 return b

def report(name,passed,**extra):
 row={'phase':phase,'operation':name,'result':'PASS' if passed else 'FAIL',**extra};results.append(row); print(json.dumps(row),flush=True)
 return passed

def changed(r,b):return 200<=r.status_code<300 and ((len(b)>0) if isinstance(b,list) else not (isinstance(b,dict) and b.get('error')))

def mutate(table,method,data=None,fid=None,allow=False):
 before=read(table,fid) if fid else None
 r,b=rest(P,method,table,data,'?id=eq.'+fid if fid else '')
 success=changed(r,b)
 after=read(table,fid) if fid else None
 if fid and method=='DELETE':verified=(len(after)==0) if allow else (after==before and len(before)==1)
 elif fid and method=='PATCH':verified=(success and len(after)==1 and all(after[0].get(k)==v for k,v in data.items())) if allow else (not success and after==before)
 else:verified=success if allow else (r.status_code in (401,403) and b and b.get('code')=='42501')
 report(table+' '+method,verified,http_status=r.status_code,affected_rows=len(b) if isinstance(b,list) else None,code=b.get('code') if isinstance(b,dict) else None)
 if method=='POST' and success:
  for row in b:tracked.setdefault(table,[]).append(row['id'])
 return b

def fixture(table,data):
 fid=str(uuid.uuid4()); b=mutate(table,'POST',{'id':fid,**data},allow=True)
 if not isinstance(b,list) or len(b)!=1:raise RuntimeError('Fixture creation failed: '+table)
 return fid

def status(s):
 r,b=rest(A,'PATCH','profiles',{'status':s},'?user_id=eq.'+UID)
 report('administrator manages dedicated account: '+s,r.status_code==200 and len(b)==1 and b[0]['status']==s)
 if not (r.status_code==200 and len(b)==1 and b[0]['status']==s):raise RuntimeError('Status transition failed')
 r,b=call(P,'GET','/auth/v1/user');report('original provider token still valid',r.status_code==200 and b.get('id')==UID)

try:
 r,b=rest(P,'GET','profiles',flt='?user_id=eq.'+UID);assert len(b)==1 and b[0]['status']=='active';original['profile']=b[0]
 r,b=rest(P,'GET','provider_profiles',flt='?id=eq.'+PID);assert len(b)==1 and not b[0]['is_published'];original['provider']=b[0]
 r,b=rest(P,'GET','client_profiles',flt='?user_id=eq.'+UID);assert b==[], 'Dedicated test account already has client profile: abort deletion fixture'
 r,b=rest(P,'GET','notifications',flt='?user_id=eq.'+UID);original['notification_ids']=[n['id'] for n in b]
 (ROOT/'snapshot.json').write_text(json.dumps(original));os.chmod(ROOT/'snapshot.json',0o600)
 phase='active'
 mutate('profiles','PATCH',{'bio':original['profile']['bio']},original['profile']['id'],True)
 mutate('provider_profiles','PATCH',{'headline':original['provider']['headline']},PID,True)
 service=fixture('provider_services',{'provider_id':PID,'title':'Disposable status regression service'})
 portfolio=fixture('portfolio_items',{'provider_id':PID,'title':'Disposable status regression portfolio'})
 availability=fixture('provider_availability',{'provider_id':PID,'weekday':0,'start_time':'01:00','end_time':'02:00'})
 document=fixture('verification_documents',{'provider_id':PID,'document_type':'identity_document','file_path':UID+'/disposable-status-test.txt'})
 client=fixture('client_profiles',{'user_id':UID,'additional_info':'Disposable status regression client profile'})
 saved=fixture('saved_providers',{'user_id':UID,'provider_id':F['other_provider']})
 for table,data,fid in [('portfolio_items',{'title':'Disposable updated portfolio'},portfolio),('provider_services',{'title':'Disposable updated service'},service),('provider_availability',{'end_time':'02:30:00'},availability),('client_profiles',{'additional_info':'Disposable updated client profile'},client),('notifications',{'read_at':'2026-10-22T07:00:00+00:00'},F['notice'])]:mutate(table,'PATCH',data,fid,True)
 # The completed request belongs to the retained provider identity acting as client; no client role is forged.
 review=fixture('reviews',{'request_id':F['review_request'],'provider_id':F['other_provider'],'client_id':UID,'rating':4,'comment':'Disposable eligibility regression review'})
 mutate('reviews','PATCH',{'rating':5},review,True)
 mutate('service_requests','PATCH',{'status':'accepted'},F['request'],True)
 mutate('bookings','PATCH',{'status':'confirmed'},F['booking'],True)
 mutate('messages','POST',{'conversation_id':F['conversation'],'sender_id':UID,'kind':'text','body':'Disposable retained-session regression'},allow=True)
 before=read('conversations',F['conversation'])[0]['provider_last_read_at'];time.sleep(.05)
 r,b=call(P,'POST','/rest/v1/rpc/mark_conversation_read',{'_conversation_id':F['conversation']});after=read('conversations',F['conversation'])[0]['provider_last_read_at']
 report('conversation mark read',r.status_code==204 and after!=before,http_status=r.status_code)
 r,b=call(P,'POST','/rest/v1/rpc/start_conversation',{'_client_id':F['other_user'],'_provider_id':PID});report('legitimate start_conversation',r.status_code==200 and b==F['conversation'],http_status=r.status_code)
 for bucket in ['avatars','portfolio','request-attachments','verification-documents']:
  path=UID+'/status-guards-'+str(uuid.uuid4())+'.txt';r,b=call(P,'POST','/storage/v1/object/'+bucket+'/'+path,raw=b'Harmless disposable test file.');ok=changed(r,b);report(bucket+' upload',ok,http_status=r.status_code)
  if ok:files.append((bucket,path))
  # File privacy for unpublished provider, anonymous signed access must fail.
  r,b=call(None,'POST','/storage/v1/object/sign/'+bucket+'/'+path,{'expiresIn':60});report(bucket+' anonymous file access denied',not changed(r,b),http_status=r.status_code)
  r,b=call(P,'POST','/storage/v1/object/'+bucket+'/'+F['other_user']+'/status-guards-'+str(uuid.uuid4())+'.txt',raw=b'Ownership rejection probe');report(bucket+' other-folder upload denied',not changed(r,b),http_status=r.status_code)
 for state in ['suspended','deactivated']:
  phase=state;status(state)
  mutate('profiles','PATCH',{'bio':'Blocked status probe'},original['profile']['id'])
  mutate('provider_profiles','PATCH',{'headline':'Blocked status probe'},PID)
  for table,data,fid in [('portfolio_items',{'title':'Blocked probe'},portfolio),('provider_services',{'title':'Blocked probe'},service),('provider_availability',{'end_time':'03:00:00'},availability),('client_profiles',{'additional_info':'Blocked probe'},client),('notifications',{'read_at':None},F['notice']),('reviews',{'rating':3},review),('service_requests',{'status':'in_progress'},F['request']),('bookings',{'status':'cancelled'},F['booking'])]:mutate(table,'PATCH',data,fid)
  for table,fid in [('portfolio_items',portfolio),('provider_services',service),('provider_availability',availability),('verification_documents',document),('client_profiles',client),('saved_providers',saved),('reviews',review),('notifications',F['delete_notice'])]:mutate(table,'DELETE',fid=fid)
  for table,data in [('portfolio_items',{'provider_id':PID,'title':'Blocked insert probe'}),('provider_services',{'provider_id':PID,'title':'Blocked insert probe'}),('provider_availability',{'provider_id':PID,'weekday':1,'start_time':'01:00','end_time':'02:00'}),('verification_documents',{'provider_id':PID,'document_type':'identity_document','file_path':UID+'/blocked.txt'}),('reviews',{'request_id':F['suspended_review_request'] if state=='suspended' else F['deactivated_review_request'],'client_id':UID,'provider_id':F['other_provider'],'rating':4}),('messages',{'conversation_id':F['conversation'],'sender_id':UID,'kind':'text','body':'Blocked send probe'})]:mutate(table,'POST',{'id':str(uuid.uuid4()),**data})
  before=read('conversations',F['conversation']);r,b=call(P,'POST','/rest/v1/rpc/mark_conversation_read',{'_conversation_id':F['conversation']});after=read('conversations',F['conversation']);report('conversation mark read blocked',r.status_code==403 and b.get('code')=='42501' and before==after,http_status=r.status_code)
  r,b=call(P,'POST','/rest/v1/rpc/start_conversation',{'_client_id':F['other_user'],'_provider_id':PID});report('start_conversation blocked',r.status_code==403 and b.get('code')=='42501',http_status=r.status_code)
  for bucket,path in list(files):
   newpath=UID+'/status-guards-'+str(uuid.uuid4())+'.txt';r,b=call(P,'POST','/storage/v1/object/'+bucket+'/'+newpath,raw=b'Blocked upload probe');ok=changed(r,b);report(bucket+' upload blocked',not ok,http_status=r.status_code)
   if ok:files.append((bucket,newpath))
   if bucket!='verification-documents':
    r,b=call(P,'PUT','/storage/v1/object/'+bucket+'/'+path,raw=b'Blocked replacement probe');report(bucket+' replace blocked',not changed(r,b),http_status=r.status_code)
   r,b=call(P,'DELETE','/storage/v1/object/'+bucket,{'prefixes':[path]});r2,b2=call(P,'POST','/storage/v1/object/sign/'+bucket+'/'+path,{'expiresIn':60});report(bucket+' delete blocked and original retained',changed(r2,b2) and not (isinstance(b,list) and len(b)>0),http_status=r.status_code)
 # Inactive accounts still have intentionally permitted read access to their own threads.
 report('own conversation remains readable',len(read('conversations',F['conversation']))==1)
 phase='restored';status('active')
 mutate('profiles','PATCH',{'bio':original['profile']['bio']},original['profile']['id'],True)
 mutate('provider_profiles','PATCH',{'headline':original['provider']['headline']},PID,True)
 # Unrelated authenticated actor must not access notification or unpublished provider data.
 for table,fid in [('notifications',F['other_notice']),('provider_profiles',F['other_provider'])]:
  before=read(table,fid);report('other identity '+table+' read denied',before==[])
  for method in ['PATCH','DELETE']:
   r,b=rest(P,method,table,{'read_at':None} if table=='notifications' and method=='PATCH' else ({'headline':'Denied'} if method=='PATCH' else None),'?id=eq.'+fid);report('other identity '+table+' '+method+' denied',not changed(r,b),http_status=r.status_code)
 # Nonparticipant administrator cannot inspect private threads merely because of role.
 for table,fid in [('conversations',F['conversation'])]:report('nonparticipant administrator private conversation denied',read(table,fid,A)==[])
 before=read('conversations',F['conversation']);r,b=call(A,'POST','/rest/v1/rpc/mark_conversation_read',{'_conversation_id':F['conversation']});report('nonparticipant administrator cannot mark read',read('conversations',F['conversation'])==before,http_status=r.status_code)
 r,b=rest(P,'PATCH','user_roles',{'role':'admin'},'?user_id=eq.'+UID);report('provider cannot self-assign administrator',not changed(r,b),http_status=r.status_code)
 mutate('client_profiles','DELETE',fid=client,allow=True)
 mutate('notifications','DELETE',fid=F['delete_notice'],allow=True)
except Exception as e:
 abort=type(e).__name__+': '+str(e);print('TEST ABORTED: '+abort,flush=True)
finally:
 phase='cleanup'
 if original:
  status(original['profile']['status'])
  mutate('profiles','PATCH',{'bio':original['profile']['bio']},original['profile']['id'],True)
  mutate('provider_profiles','PATCH',{'headline':original['provider']['headline']},PID,True)
 for table,ids in tracked.items():
  for fid in ids:
   # Messages are immutable; clean them via the database tool afterward.
   if table=='messages':continue
   session=A if table=='reviews' else P
   r,b=rest(session,'DELETE',table,flt='?id=eq.'+fid)
   report('cleanup '+table,read(table,fid,session)==[],http_status=r.status_code)
 for bucket,path in files:
  r,b=call(P,'DELETE','/storage/v1/object/'+bucket,{'prefixes':[path]});r2,b2=call(P,'POST','/storage/v1/object/sign/'+bucket+'/'+path,{'expiresIn':60});report('cleanup '+bucket+' file',not changed(r2,b2),http_status=r.status_code)
 (ROOT/'tracked.json').write_text(json.dumps({'records':tracked,'files':files}));(ROOT/'results.json').write_text(json.dumps({'abort':abort,'checks':results},indent=2))
 print('Failures: '+str(sum(r['result']=='FAIL' for r in results)),flush=True)
 if abort or any(row['result']=='FAIL' for row in results):sys.exit(1)
