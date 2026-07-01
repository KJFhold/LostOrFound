// C:\RN\RepairLostOrFound\server\supabaseClient.js
"use strict";

const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !service) {
  throw new Error("[supabase] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE in server/.env");
}

const supaAdmin = createClient(url, service);

module.exports = { supaAdmin };