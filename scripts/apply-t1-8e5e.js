"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const commercePath = path.join(root, "server", "routes", "reportCommerce.js");
const dispatchPath = path.join(root, "server", "lib", "geoAlertDispatch.js");

for (const filePath of [commercePath, dispatchPath]) {
  if (!fs.existsSync(filePath)) throw new Error(`REQUIRED_FILE_NOT_FOUND: ${filePath}`);
}

let commerce = fs.readFileSync(commercePath, "utf8");
let dispatch = fs.readFileSync(dispatchPath, "utf8");

if (!commerce.includes("[geo-alert][existing-campaign-reused]")) {
  throw new Error("T1_8E5D_REUSE_FLOW_NOT_FOUND");
}

// The current geo_alert_campaigns schema does not expose updated_at.
// Remove it only from the existing-campaign reactivation update payload.
const reuseStart = commerce.indexOf("const { data: reactivatedCampaign");
const reuseEnd = commerce.indexOf("order.created_campaign_id = reactivatedCampaign.id", reuseStart);
if (reuseStart < 0 || reuseEnd < 0) throw new Error("REACTIVATION_BLOCK_NOT_FOUND");
let reuseBlock = commerce.slice(reuseStart, reuseEnd);
reuseBlock = reuseBlock.replace(/\s*updated_at:\s*now\.toISOString\(\),?/g, "");
commerce = commerce.slice(0, reuseStart) + reuseBlock + commerce.slice(reuseEnd);

// Mark older ACTIVE orders for the same report/product as superseded only after
// the campaign was successfully created or reused. This prevents repeated test
// activations from appearing as multiple active services.
const dispatchAnchor = "let areaAlertDispatch = null;";
if (!commerce.includes("[geo-alert][previous-orders-superseded]")) {
  const index = commerce.indexOf(dispatchAnchor);
  if (index < 0) throw new Error("AREA_ALERT_DISPATCH_ANCHOR_NOT_FOUND");
  const cleanup = `const { data: supersededOrders, error: supersedeError } = await supaAdmin\n      .from("report_orders")\n      .update({ status: "SUPERSEDED", updated_at: now.toISOString() })\n      .eq("report_id", order.report_id)\n      .eq("user_id", userId)\n      .eq("product_code", order.product_code)\n      .eq("status", "ACTIVE")\n      .neq("id", order.id)\n      .select("id");\n\n    if (supersedeError) {\n      console.error("[geo-alert][previous-orders-supersede-failed]", {\n        orderId: order.id,\n        reportId: order.report_id,\n        userId,\n        errorCode: supersedeError.code || null,\n        errorMessage: supersedeError.message || String(supersedeError),\n      });\n    } else {\n      console.info("[geo-alert][previous-orders-superseded]", {\n        orderId: order.id,\n        reportId: order.report_id,\n        userId,\n        count: supersededOrders?.length || 0,\n      });\n    }\n\n    `;
  commerce = commerce.slice(0, index) + cleanup + commerce.slice(index);
}

// Ensure dispatch completion is logged even if the delivery helper omits its
// own detailed summary. The returned object remains internal.
if (!commerce.includes("[geo-alert][activation-delivery-result]")) {
  const catchAnchor = "} catch (dispatchError) {";
  const catchIndex = commerce.indexOf(catchAnchor, commerce.indexOf(dispatchAnchor));
  if (catchIndex < 0) throw new Error("DISPATCH_CATCH_ANCHOR_NOT_FOUND");
  const log = `console.info("[geo-alert][activation-delivery-result]", {\n          orderId: order.id,\n          reportId: order.report_id,\n          userId,\n          campaignId: order.created_campaign_id,\n          delivery: areaAlertDispatch,\n        });\n        `;
  commerce = commerce.slice(0, catchIndex) + log + commerce.slice(catchIndex);
}

// Add a guaranteed summary at every successful return from the dispatch helper.
// This does not change recipient selection. It makes partial delivery observable.
if (!dispatch.includes("[geo-alert][delivery-summary]")) {
  const returnMatches = [...dispatch.matchAll(/return\s*\{\s*ok:\s*true,/g)];
  if (!returnMatches.length) throw new Error("SUCCESSFUL_DISPATCH_RETURN_NOT_FOUND");
  const last = returnMatches[returnMatches.length - 1];
  const summary = `console.info("[geo-alert][delivery-summary]", {\n    campaignId,\n    result: { sent, skippedAsDuplicate, failed },\n  });\n\n  `;
  dispatch = dispatch.slice(0, last.index) + summary + dispatch.slice(last.index);
}

fs.writeFileSync(commercePath, commerce, "utf8");
fs.writeFileSync(dispatchPath, dispatch, "utf8");

const writtenCommerce = fs.readFileSync(commercePath, "utf8");
const writtenDispatch = fs.readFileSync(dispatchPath, "utf8");
if (/const \{ data: reactivatedCampaign[\s\S]*?updated_at:\s*now\.toISOString\(\)/.test(writtenCommerce)) {
  throw new Error("REACTIVATION_UPDATED_AT_STILL_PRESENT");
}
for (const marker of [
  "[geo-alert][existing-campaign-reused]",
  "[geo-alert][previous-orders-superseded]",
  "[geo-alert][activation-delivery-result]",
]) {
  if (!writtenCommerce.includes(marker)) throw new Error(`POST_WRITE_MARKER_MISSING: ${marker}`);
}
if (!writtenDispatch.includes("[geo-alert][delivery-summary]")) {
  throw new Error("POST_WRITE_DELIVERY_SUMMARY_MISSING");
}

console.log("OK: Applied and verified T1.8E.5E.");
