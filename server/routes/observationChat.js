"use strict";
const express = require("express");
const router = express.Router();
const { supaAdmin } = require("../supabaseClient");
const { requireUser } = require("../mw/auth");
const { notifyUser } = require("../lib/userNotify");

async function getObservation(id) {
  const { data, error } = await supaAdmin.from("area_alert_observations")
    .select("id,report_id,observer_user_id,report_owner_user_id,observation_type,status")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  return data || null;
}
function canAccess(o,userId){ return o && (o.observer_user_id===userId || o.report_owner_user_id===userId); }
async function ensureConversation(o){
  let { data, error } = await supaAdmin.from("observation_conversations")
    .select("id,observation_id,report_id,report_owner_user_id,observer_user_id,created_at,updated_at")
    .eq("observation_id",o.id).maybeSingle();
  if(error) throw error;
  if(data) return data;
  const inserted = await supaAdmin.from("observation_conversations").insert({
    observation_id:o.id, report_id:o.report_id,
    report_owner_user_id:o.report_owner_user_id, observer_user_id:o.observer_user_id
  }).select("id,observation_id,report_id,report_owner_user_id,observer_user_id,created_at,updated_at").single();
  if(inserted.error){
    if(inserted.error.code==='23505') return ensureConversation(o);
    throw inserted.error;
  }
  return inserted.data;
}

router.post("/:observationId/open", requireUser, async(req,res)=>{
  try{
    const userId=req.user?.id; const id=String(req.params.observationId||"").trim();
    const o=await getObservation(id);
    if(!canAccess(o,userId)) return res.status(404).json({error:"OBSERVATION_NOT_FOUND"});
    const conversation=await ensureConversation(o);
    return res.json({ok:true,conversation});
  }catch(e){ return res.status(500).json({error:e?.message||"OBSERVATION_CHAT_OPEN_FAILED"}); }
});

router.get("/:observationId/messages", requireUser, async(req,res)=>{
  try{
    const userId=req.user?.id; const id=String(req.params.observationId||"").trim();
    const o=await getObservation(id);
    if(!canAccess(o,userId)) return res.status(404).json({error:"OBSERVATION_NOT_FOUND"});
    const conversation=await ensureConversation(o);
    const {data,error}=await supaAdmin.from("observation_messages")
      .select("id,conversation_id,sender_id,body,created_at")
      .eq("conversation_id",conversation.id).order("created_at",{ascending:true}).limit(500);
    if(error) throw error;
    return res.json({ok:true,conversation,messages:data||[]});
  }catch(e){ return res.status(500).json({error:e?.message||"OBSERVATION_CHAT_LOAD_FAILED"}); }
});

router.post("/:observationId/messages", requireUser, async(req,res)=>{
  try{
    const userId=req.user?.id; const id=String(req.params.observationId||"").trim();
    const body=String(req.body?.body||"").replace(/\s+/g," ").trim();
    if(!body || body.length>1000) return res.status(400).json({error:"INVALID_MESSAGE"});
    const o=await getObservation(id);
    if(!canAccess(o,userId)) return res.status(404).json({error:"OBSERVATION_NOT_FOUND"});
    const conversation=await ensureConversation(o);
    const ins=await supaAdmin.from("observation_messages").insert({conversation_id:conversation.id,sender_id:userId,body})
      .select("id,conversation_id,sender_id,body,created_at").single();
    if(ins.error) throw ins.error;
    await supaAdmin.from("observation_conversations").update({updated_at:new Date().toISOString()}).eq("id",conversation.id);
    const otherUserId=userId===o.report_owner_user_id?o.observer_user_id:o.report_owner_user_id;
    const n=await supaAdmin.from("notifications").insert({
      user_id:otherUserId,type:"OBSERVATION_MESSAGE",entity_type:"observation",entity_id:o.id,
      title:"Ny melding om observasjon",body:"Du har fått en ny melding om en observasjon eller et mulig funn."
    });
    if(n.error) console.warn("[observation-chat] notification failed",n.error.message);
    return res.json({ok:true,message:ins.data});
  }catch(e){ return res.status(500).json({error:e?.message||"OBSERVATION_CHAT_SEND_FAILED"}); }
});
module.exports=router;
