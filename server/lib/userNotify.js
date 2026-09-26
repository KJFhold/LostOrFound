"use strict";
const { supaAdmin } = require("../supabaseClient");
async function notifyUser({userId,type,entityType,entityId,title,body,data={}}){
 const n=await supaAdmin.from("notifications").insert({user_id:userId,type,entity_type:entityType,entity_id:entityId,title,body});
 if(n.error) console.warn("[notify] in-app failed",n.error.message);
 const q=await supaAdmin.from("push_installations").select("installation_id,expo_push_token,language").eq("user_id",userId).eq("active",true);
 if(q.error||!q.data?.length)return {inApp:!n.error,push:0};
 const messages=q.data.map(x=>({to:x.expo_push_token,sound:"default",title,body,data:{type,targetKind:entityType,targetId:entityId,...data}}));
 const r=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","Accept-Encoding":"gzip, deflate"},body:JSON.stringify(messages)});
 const result=await r.json().catch(()=>({}));
 if(!r.ok){console.warn("[notify] push failed",result);return {inApp:!n.error,push:0};}
 return {inApp:!n.error,push:messages.length};
}
module.exports={notifyUser};
