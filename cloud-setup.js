/* Deal Dhamaka V2 cloud bridge. Local-first, additive migration, row-level sync. */
(function(){
'use strict';
const cfg=window.DEAL_DHAMAKA_SUPABASE_CONFIG||{}, PLACEHOLDER='PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE';
const KEY='dealDhamakaAgentV2', TEMPLATE_KEY='dealDhamakaWhatsAppTemplatesV1';
const TABLES={contacts:'dd_contacts',products:'dd_products',shares:'dd_shares',activity:'dd_activity',templates:'dd_templates'};
let client=null,workspaceId=null,user=null,busy=false,syncing=false,channel=null,baseline={};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(s,type){const e=$('ddCloudStatus');if(e){e.textContent=s;e.dataset.type=type||'info';}}
function setBusy(v){busy=v;['ddCloudSignIn','ddCloudSignOut','ddCloudBackup','ddCloudImport','ddCloudRefresh','ddCloudDiagnose','ddCloudWriteTest'].forEach(id=>{if($(id))$(id).disabled=v;});}
function normalize(x){return {contacts:Array.isArray(x.contacts)?x.contacts:[],products:Array.isArray(x.products)?x.products:[],shares:Array.isArray(x.shares)?x.shares:[],activity:Array.isArray(x.activity)?x.activity:[],templates:Array.isArray(x.templates)?x.templates:[]};}
function local(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return normalize({});}}
function waTemplates(){try{const a=JSON.parse(localStorage.getItem(TEMPLATE_KEY)||'[]');return Array.isArray(a)?a:[];}catch(_){return [];}}
function idOf(r,k,i){return r&&r.id!=null&&String(r.id).trim()?String(r.id):k+'-migration-'+i;}
function errorText(e){const parts=[e&&e.message,e&&e.details,e&&e.hint,e&&e.code,e&&e.name].filter(Boolean);return parts.join(' | ')||String(e||'Unknown error');}
async function ensure(){if(!cfg.url||!cfg.publishableKey||cfg.publishableKey===PLACEHOLDER)throw Error('Supabase URL/publishable key is missing.');if(!window.supabase?.createClient)throw Error('Supabase JS library did not load. Reload on a stable connection; no records were changed.');if(!client)client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
async function findWorkspace(){const {data,error}=await client.from('dd_workspace_members').select('workspace_id,role').eq('user_id',user.id);if(error)throw error;if(!data?.length)throw Error('Signed-in account is not a member of a workspace.');if(data.length!==1)throw Error('Account has multiple workspace memberships; select the intended workspace before syncing.');workspaceId=data[0].workspace_id;return data[0];}
async function counts(){const out={};for(const [k,t] of Object.entries(TABLES)){const {count,error}=await client.from(t).select('id',{count:'exact',head:true}).eq('workspace_id',workspaceId);if(error)throw error;out[k]=count||0;}return out;}
function total(c){return Object.values(c).reduce((a,b)=>a+b,0);}
async function diagnose(){if(busy||!client||!user||!workspaceId)return;setBusy(true);status('Running read-only browser/network diagnostics…','info');const results=[];try{
  const sessionResult=await client.auth.getSession();
  if(sessionResult.error)throw new Error('Session lookup failed: '+errorText(sessionResult.error));
  const token=sessionResult.data?.session?.access_token;
  if(!token)throw new Error('No active access token found. Sign in again.');
  results.push('Session: OK');
  const base=String(cfg.url||'').replace(/\/$/,'');
  const endpoint=base+'/rest/v1/dd_contacts?select=id&limit=1';
  let response;
  try { response=await fetch(endpoint,{method:'GET',headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+token,Accept:'application/json','Accept-Profile':'public'}}); }
  catch(fetchError){throw new Error('Browser fetch failed before an HTTP response (likely network/CORS/browser request failure): '+errorText(fetchError));}
  const body=await response.text();
  results.push('REST GET: HTTP '+response.status+' '+response.statusText);
  if(!response.ok)throw new Error(results.join(' · ')+' · REST response: '+(body.slice(0,700)||'(empty body)'));
  results.push('REST body: '+(body.slice(0,180)||'(empty array or body)'));
  const {error}=await client.from('dd_contacts').select('id',{head:true,count:'exact'}).eq('workspace_id',workspaceId);
  if(error)throw new Error(results.join(' · ')+' · Supabase SDK query failed: '+errorText(error));
  results.push('Supabase SDK query: OK');
  status('Diagnostics passed (read-only): '+results.join(' · ')+'. No records were inserted, updated, or deleted. Next, migration-write failure needs browser console/network details.','success');
  alert('Read-only diagnostics passed.\n\n'+results.join('\n')+'\n\nNo data was changed. This confirms reads only; it does not prove writes work.');
}catch(e){const msg=errorText(e);status('Diagnostics identified a failure: '+msg+'. No records were inserted, updated, or deleted.','error');alert('Diagnostics result:\n'+msg+'\n\nNo data was changed.');}finally{setBusy(false);}}

async function testCloudWrite(){
 if(busy||!client||!user||!workspaceId)return;
 if(!confirm('Run a controlled write test? This creates one uniquely named temporary test row in dd_contacts, then attempts to delete only that exact row. Existing records are not modified. Continue?'))return;
 setBusy(true);const id='__dd_write_test_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);let inserted=false;let insertStage='not started';let deleteStage='not needed';
 try{
  status('Testing one temporary cloud write…','info');
  const row={workspace_id:workspaceId,id,payload:{_diagnostic:'Deal Dhamaka cloud write test',created_at:new Date().toISOString()},updated_at:new Date().toISOString(),updated_by:user.id};
  insertStage='sending insert';
  let result;
  try { result=await client.from('dd_contacts').insert(row).select('id').single(); }
  catch(e){throw new Error('INSERT request failed before a Supabase response: '+errorText(e)+' · test id '+id);}
  if(result.error)throw new Error('INSERT rejected: '+errorText(result.error)+' · test id '+id);
  inserted=true;insertStage='INSERT succeeded';
  deleteStage='sending cleanup DELETE';
  let cleanup;
  try { cleanup=await client.from('dd_contacts').delete().eq('workspace_id',workspaceId).eq('id',id).select('id'); }
  catch(e){throw new Error('INSERT succeeded, but cleanup DELETE request failed: '+errorText(e)+' · temporary test id '+id);}
  if(cleanup.error)throw new Error('INSERT succeeded, but cleanup DELETE was rejected: '+errorText(cleanup.error)+' · temporary test id '+id);
  if(!cleanup.data||cleanup.data.length!==1)throw new Error('INSERT succeeded, but cleanup did not confirm exactly one row deleted. Check dd_contacts for test id '+id);
  deleteStage='DELETE succeeded';
  status('Cloud write test passed: INSERT and cleanup DELETE both succeeded. No existing records were changed.','success');
  alert('Cloud write test PASSED.\n\nINSERT: HTTP response received; row created.\nDELETE: temporary test row removed.\nExisting records were not modified.');
 }catch(e){
  const msg=errorText(e);status('Cloud write test result: '+msg+(inserted?' · INSERT succeeded; verify temporary-row cleanup if DELETE failed.':'') ,'error');
  alert('Cloud write test result:\n\n'+msg+'\n\n'+(inserted?'IMPORTANT: INSERT succeeded. If cleanup failed, remove only the temporary test row with the exact id shown above after verifying it in dd_contacts.':'No successful INSERT was confirmed; existing records were not changed.'));
 }finally{setBusy(false);}
}
async function backup(){const data=JSON.parse(localStorage.getItem(KEY)||'{}');const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),localStorageKey:KEY,data,whatsappTemplates:waTemplates()},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='deal-dhamaka-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);return data;}
async function upsertOne(k,item,i){
 const table=TABLES[k],id=idOf(item,k,i);
 let payloadJson;
 try{payloadJson=JSON.stringify(item);if(payloadJson===undefined)throw new Error('payload could not be serialized');}
 catch(e){throw new Error('Migration diagnostic: table='+table+', local record index='+(i+1)+', record id='+id+', payload serialization failed: '+errorText(e)+'. No personal field values were included.');}
 const row={workspace_id:workspaceId,id,payload:item,updated_at:new Date().toISOString(),updated_by:user.id};
 try{
  const {error}=await client.from(table).upsert(row,{onConflict:'workspace_id,id'});
  if(error){const fields=item&&typeof item==='object'?Object.keys(item).join(', '):'(payload is not an object)';throw new Error('Migration write rejected: table='+table+', local record index='+(i+1)+' of '+(local()[k]||[]).length+', record id='+id+', payload bytes='+new TextEncoder().encode(payloadJson).length+', payload fields=['+fields+']; Supabase error: '+errorText(error));}
 }catch(e){
  const message=errorText(e);
  if(message.startsWith('Migration write rejected:')||message.startsWith('Migration diagnostic:'))throw e;
  const fields=item&&typeof item==='object'?Object.keys(item).join(', '):'(payload is not an object)';
  throw new Error('Migration request failed before a normal Supabase response: table='+table+', local record index='+(i+1)+' of '+(local()[k]||[]).length+', record id='+id+', payload bytes='+new TextEncoder().encode(payloadJson).length+', payload fields=['+fields+']; browser/SDK error: '+message+'. No personal field values were included.');
 }
}
async function insertMigrationOne(k,item,i,totalRows){
 const table=TABLES[k],id=idOf(item,k,i);
 let payloadJson;
 try{payloadJson=JSON.stringify(item);if(payloadJson===undefined)throw new Error('payload could not be serialized');}
 catch(e){throw new Error('Migration diagnostic: table='+table+', local record index='+(i+1)+' of '+totalRows+', record id='+id+', payload serialization failed: '+errorText(e)+'. No personal field values were included.');}
 const row={workspace_id:workspaceId,id,payload:item,updated_at:new Date().toISOString(),updated_by:user.id};
 let result;
 try{result=await client.from(table).insert(row).select('id').single();}
 catch(e){throw new Error('Migration INSERT request failed before a normal Supabase response: table='+table+', local record index='+(i+1)+' of '+totalRows+', record id='+id+', payload bytes='+new TextEncoder().encode(payloadJson).length+', payload fields=['+(item&&typeof item==='object'?Object.keys(item).join(', '):'(payload is not an object)')+']; browser/SDK error: '+errorText(e)+'. No personal field values were included.');}
 if(result.error)throw new Error('Migration INSERT rejected: table='+table+', local record index='+(i+1)+' of '+totalRows+', record id='+id+', payload bytes='+new TextEncoder().encode(payloadJson).length+', payload fields=['+(item&&typeof item==='object'?Object.keys(item).join(', '):'(payload is not an object)')+']; Supabase error: '+errorText(result.error));
}
async function migrate(){if(busy||!client||!user||!workspaceId)return;setBusy(true);try{const s=local(), wa=waTemplates();const n=Object.fromEntries(Object.keys(TABLES).map(k=>[k,s[k].length]));n.whatsAppTemplates=wa.length;const cc=await counts();if(total(cc)>0)throw Error('Migration stopped safely: cloud is not empty ('+JSON.stringify(cc)+'). No import was attempted.');if(total(n)===0)throw Error('No local records found.');if(!confirm('A fresh backup will download. Import '+JSON.stringify(n)+' into the empty workspace? Local data will not be deleted.'))return;await backup();let written=0;
for(const k of Object.keys(TABLES)){for(let i=0;i<s[k].length;i++){await insertMigrationOne(k,s[k][i],i,s[k].length);written++;}}
for(let i=0;i<wa.length;i++){const item=wa[i], id='whatsapp-template-'+idOf(item,'template',i);const {error}=await client.from(TABLES.templates).insert({workspace_id:workspaceId,id,payload:{...item,_source:TEMPLATE_KEY},updated_at:new Date().toISOString(),updated_by:user.id});if(error)throw new Error('dd_templates WhatsApp templates · INSERT rejected at local record '+(i+1)+' of '+wa.length+' · '+errorText(error));written++;}
const after=await counts();status('Migration completed. Imported '+written+' records. Cloud counts: '+JSON.stringify(after)+'. Local data remains unchanged.','success');baseline=JSON.parse(JSON.stringify(local()));startSync();alert('Migration completed. Imported '+written+' records. Keep your backup. Cloud counts: '+JSON.stringify(after));
}catch(e){const msg=errorText(e);status('Migration failed safely: '+msg+'. Check connection and API logs; local data was not deleted.','error');alert('Migration failed: '+msg+'\n\nLocal data was not deleted. Do not retry until the error is resolved.');}finally{setBusy(false);}}
async function inspect(){if(busy||!client||!user||!workspaceId)return;setBusy(true);try{const c=await counts();status('Connected. Cloud counts — '+Object.entries(c).map(([k,v])=>k+': '+v).join(' · ')+(syncing?' · Real-time sync listening':' · Real-time sync not started; import or load cloud first.'),'success');}catch(e){status('Cloud check failed: '+errorText(e),'error');}finally{setBusy(false);}}
function mergeCloudRows(k,rows){const current=local(), arr=current[k]||[], byId=new Map(arr.map((x,i)=>[String(x?.id??'__missing_'+i),x]));for(const row of rows||[]){const p=row.payload;if(!p||typeof p!=='object')continue;const id=String(p.id??row.id);byId.set(id,p);}current[k]=Array.from(byId.values());syncing=true;try{localStorage.setItem(KEY,JSON.stringify(current));}finally{syncing=false;}baseline=JSON.parse(JSON.stringify(current));window.dispatchEvent(new CustomEvent('deal-dhamaka-data-updated'));if(typeof window.renderAll==='function')try{window.renderAll();}catch(_){} }
async function pullAll(){for(const [k,t] of Object.entries(TABLES)){const {data,error}=await client.from(t).select('id,payload,updated_at').eq('workspace_id',workspaceId);if(error)throw error;if(k==='templates'){const wa=(data||[]).filter(r=>r.payload&&r.payload._source===TEMPLATE_KEY).map(r=>{const x={...r.payload};delete x._source;return x;});if(wa.length){syncing=true;try{localStorage.setItem(TEMPLATE_KEY,JSON.stringify(wa));}finally{syncing=false;}}const appRows=(data||[]).filter(r=>!(r.payload&&r.payload._source===TEMPLATE_KEY));mergeCloudRows(k,appRows);}else mergeCloudRows(k,data||[]);} }
async function pushChanges(){if(!syncing||!client||!workspaceId||!user)return;const now=local();for(const k of Object.keys(TABLES)){const old=new Map((baseline[k]||[]).map((r,i)=>[String(r?.id??'__missing_'+i),JSON.stringify(r)]));for(let i=0;i<now[k].length;i++){const r=now[k][i],id=String(r?.id??'');if(!id)continue;if(old.get(id)!==JSON.stringify(r)){await upsertOne(k,r,i);}}}for(const [i,item] of waTemplates().entries()){const id='whatsapp-template-'+idOf(item,'template',i);const {error}=await client.from(TABLES.templates).upsert({workspace_id:workspaceId,id,payload:{...item,_source:TEMPLATE_KEY},updated_at:new Date().toISOString(),updated_by:user.id},{onConflict:'workspace_id,id'});if(error)throw new Error('WhatsApp template sync failed: '+errorText(error));}baseline=JSON.parse(JSON.stringify(now));}
let pushTimer=null;function schedulePush(){if(!syncing||busy)return;clearTimeout(pushTimer);pushTimer=setTimeout(()=>pushChanges().catch(e=>status('Sync write failed: '+errorText(e)+'. Local changes remain on this device.','error')),700);}
function startSync(){if(!client||!workspaceId||!user||channel)return;syncing=true;baseline=JSON.parse(JSON.stringify(local()));channel=client.channel('deal-dhamaka-workspace-'+workspaceId);for(const t of Object.values(TABLES))channel.on('postgres_changes',{event:'*',schema:'public',table:t,filter:'workspace_id=eq.'+workspaceId},async()=>{try{await pullAll();}catch(e){status('Realtime refresh failed: '+errorText(e),'error');}});channel.subscribe(s=>{if(s==='SUBSCRIBED')status('Real-time sync is listening for shared changes.','success');else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')status('Realtime subscription status: '+s+'. Verify Supabase Realtime is enabled for dd_* tables.','error');});}
async function loadCloud(){if(busy||!client||!user||!workspaceId)return;setBusy(true);try{const c=await counts();if(total(c)===0){status('Cloud is empty. Use migration only after confirming the latest backup.','info');return;}if(!confirm('Load shared cloud records into this browser? Existing local records with matching IDs will be refreshed; local-only records are preserved.'))return;await pullAll();startSync();status('Cloud data loaded. Real-time sync subscription started.','success');}catch(e){status('Cloud load failed: '+errorText(e),'error');}finally{setBusy(false);}}
async function signIn(e){e.preventDefault();if(busy)return;setBusy(true);try{await ensure();const {data,error}=await client.auth.signInWithPassword({email:$('ddCloudEmail').value.trim(),password:$('ddCloudPassword').value});if(error)throw error;user=data.user;await findWorkspace();$('ddCloudIdentity').textContent='Signed in as '+user.email+' · workspace verified';$('ddCloudLoginForm').hidden=true;$('ddCloudActions').hidden=false;await inspect();}catch(e2){status('Sign-in/setup failed: '+errorText(e2),'error');}finally{setBusy(false);}}
async function signOut(){if(!client)return;setBusy(true);try{if(channel){await client.removeChannel(channel);channel=null;}syncing=false;await client.auth.signOut();user=null;workspaceId=null;$('ddCloudLoginForm').hidden=false;$('ddCloudActions').hidden=true;$('ddCloudIdentity').textContent='Not signed in';status('Signed out. Local app data remains on this device.','info');}catch(e){status(errorText(e),'error');}finally{setBusy(false);}}
function mount(){const settings=$('settings');if(!settings||$('ddCloudCard'))return;const card=document.createElement('div');card.className='card';card.id='ddCloudCard';card.innerHTML='<h3>Shared Cloud</h3><p class="hint">Sign in to the shared workspace. Keep a backup before migration. Local-first storage is preserved.</p><p id="ddCloudIdentity">Not signed in</p><div id="ddCloudStatus" role="status" aria-live="polite">Supabase is configured. Sign in to continue.</div><form id="ddCloudLoginForm"><label>Email<input id="ddCloudEmail" type="email" autocomplete="username" required></label><label>Password<input id="ddCloudPassword" type="password" autocomplete="current-password" required></label><button class="primary full" id="ddCloudSignIn" type="submit">Sign in to Supabase</button></form><div id="ddCloudActions" hidden><button class="secondary full" id="ddCloudBackup" type="button">Download local backup</button><button class="primary full" id="ddCloudImport" type="button">Migrate local data to empty cloud</button><button class="secondary full" id="ddCloudLoad" type="button">Load shared cloud data / start sync</button><button class="secondary full" id="ddCloudRefresh" type="button">Check cloud record counts</button><button class="secondary full" id="ddCloudDiagnose" type="button">Run read-only connection diagnostics</button><button class="secondary full" id="ddCloudWriteTest" type="button">Test cloud write (temporary row)</button><button class="secondary full" id="ddCloudSignOut" type="button">Sign out</button></div><p class="hint">Migration is additive and does not delete local data. Realtime depends on Supabase table publication and valid RLS policies. Review counts after migration.</p>';settings.appendChild(card);$('ddCloudLoginForm').addEventListener('submit',signIn);$('ddCloudSignOut').addEventListener('click',signOut);$('ddCloudBackup').addEventListener('click',()=>backup().then(()=>status('Backup download started.','success')).catch(e=>status(errorText(e),'error')));$('ddCloudImport').addEventListener('click',migrate);$('ddCloudLoad').addEventListener('click',loadCloud);$('ddCloudRefresh').addEventListener('click',inspect);$('ddCloudDiagnose').addEventListener('click',diagnose);$('ddCloudWriteTest').addEventListener('click',testCloudWrite);}
// Observe legacy writes so existing app scripts remain compatible. Sync writes only changed records; deletes are intentionally not propagated automatically.
const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){originalSet.call(this,k,v);if(!syncing&&(k===KEY||k===TEMPLATE_KEY))schedulePush();};
window.addEventListener('DOMContentLoaded',mount);if(document.readyState!=='loading')mount();
})();
