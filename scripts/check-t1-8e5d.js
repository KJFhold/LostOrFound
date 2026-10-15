"use strict";

const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(process.cwd(), "server", "routes", "reportCommerce.js"),
  "utf8",
);

const checks = [
  [
    /String\(campaignError\.code\s*\|\|\s*["']["']\)\s*===\s*["']23505["']/,
    "MISSING_DUPLICATE_KEY_BRANCH",
  ],
  [
    /\.from\(\s*["']geo_alert_campaigns["']\s*\)[\s\S]*?\.eq\(\s*["']report_id["']\s*,\s*order\.report_id\s*\)/,
    "MISSING_EXISTING_CAMPAIGN_LOOKUP",
  ],
  [
    /order\.created_campaign_id\s*=\s*reactivatedCampaign\.id/,
    "MISSING_REUSED_CAMPAIGN_ASSIGNMENT",
  ],
  [
    /\[geo-alert\]\[existing-campaign-reused\]/,
    "MISSING_REUSE_LOG",
  ],
  [
    /GEO_ALERT_CAMPAIGN_REACTIVATION_FAILED/,
    "MISSING_REACTIVATION_ERROR_CODE",
  ],
  [
    /dispatchAreaAlertCampaign\(\s*order\.created_campaign_id\s*,?\s*\)/,
    "MISSING_DISPATCH",
  ],
];

for (const [pattern, errorCode] of checks) {
  if (!pattern.test(source)) {
    throw new Error(errorCode);
  }
}

console.log("OK: T1.8E.5D checks passed.");
