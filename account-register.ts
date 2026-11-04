import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const allowed='https://willbl3.github.io';
const headers={'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const sha=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const origin=req.headers.get('origin');if(origin&&origin!==allowed)return reply({error:'Origin not allowed'},403);
 try{
  const bodyText=await req.text();if(bodyText.length>4096)return reply({error:'Request too large'},413);
  const body=JSON.parse(bodyText),username=String(body.username||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[a-z0-9_]{3,24}$/.test(username))return reply({error:'Use 3–24 letters, numbers or underscores for your username.'},400);
  if(password.length<10||password.length>128)return reply({error:'Use a password between 10 and 128 characters.'},400);
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||req.headers.get('cf-connecting-ip')||'unknown';
  const bucket=await sha(serviceKey+':'+ip+':'+(body.action==='recover'?'recover':'signup'));
  const {data:permitted,error:rateError}=await admin.rpc('daily_plate_rate_limit',{bucket_key:bucket,max_hits:body.action==='recover'?10:5});
  if(rateError)return reply({error:'Account service unavailable. Try again later.'},503);if(!permitted)return reply({error:'Too many attempts. Please try again in an hour.'},429);
  if(body.action==='recover'){
   const code=String(body.recoveryCode||'').replaceAll('-','').toLowerCase();if(!/^[a-f0-9]{32}$/.test(code))return reply({error:'Invalid username or recovery code.'},400);
   const {data:record,error}=await admin.from('daily_plate_recovery').select('user_id,code_hash').eq('username',username).maybeSingle();
   if(error||!record||record.code_hash!==await sha(code))return reply({error:'Invalid username or recovery code.'},400);
   const {error:updateError}=await admin.auth.admin.updateUserById(record.user_id,{password});
   if(updateError)return reply({error:'Could not update password. Please try again.'},400);
   return reply({success:true});
  }
  if(body.action!=='register')return reply({error:'Unknown action'},400);
  const code=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const {data,error}=await admin.auth.admin.createUser({email:username+'@users.dailyplate.invalid',password,email_confirm:true,user_metadata:{username}});
  if(error||!data.user)return reply({error:'Username is unavailable, or account creation failed. Try another username.'},400);
  const {error:saveError}=await admin.from('daily_plate_recovery').insert({user_id:data.user.id,username,code_hash:await sha(code)});
  if(saveError){await admin.auth.admin.deleteUser(data.user.id);return reply({error:'Account creation could not finish. Please try again.'},503);}
  return reply({success:true,recoveryCode:code.match(/.{1,4}/g)!.join('-')});
 }catch{return reply({error:'Account request failed. Please try again.'},400);}
});

