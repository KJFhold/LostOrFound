"use strict";
const fs = require("fs");
const server = fs.readFileSync("server/routes/alertAreas.js", "utf8");
const app = fs.readFileSync("app/alert-areas.tsx", "utf8");
for (const value of [
  'const { randomUUID } = require("crypto");',
  '.insert({ id: randomUUID(), ...values, user_id: req.user.id })',
]) {
  if (!server.includes(value)) throw new Error(`Missing backend fix: ${value}`);
}
for (const value of [
  "value={!!current?.active}",
  "enabled ? void updateCurrent(false) : void disableCurrent()",
]) {
  if (!app.includes(value)) throw new Error(`Missing switch fix: ${value}`);
}
console.log("OK: T1.8E.4.1.3 checks passed.");
