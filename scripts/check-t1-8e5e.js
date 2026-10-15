"use strict";
const fs=require("fs"),path=require("path");
const commerce=fs.readFileSync(path.join(process.cwd(),"server","routes","reportCommerce.js"),"utf8");
const dispatch=fs.readFileSync(path.join(process.cwd(),"server","lib","geoAlertDispatch.js"),"utf8");
const requiredCommerce=[
  "[geo-alert][existing-campaign-reused]",
  "[geo-alert][previous-orders-superseded]",
  "[geo-alert][activation-delivery-result]",
  'status: "SUPERSEDED"',
  '.neq("id", order.id)',
];
for(const marker of requiredCommerce)if(!commerce.includes(marker))throw new Error(`MISSING_T1_8E5E_MARKER: ${marker}`);
const block=commerce.slice(commerce.indexOf("const { data: reactivatedCampaign"),commerce.indexOf("order.created_campaign_id = reactivatedCampaign.id"));
if(/updated_at\s*:/.test(block))throw new Error("INVALID_REACTIVATION_UPDATED_AT_REMAINS");
if(!dispatch.includes("[geo-alert][delivery-summary]"))throw new Error("MISSING_DELIVERY_SUMMARY");
console.log("OK: T1.8E.5E checks passed.");
