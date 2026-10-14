"use strict";
const fs = require("fs");
const source = fs.readFileSync("server/routes/alertAreas.js", "utf8");
if (source.includes("`r`n") || source.includes("`n`n")) {
  throw new Error("Literal PowerShell line-break text remains in JavaScript");
}
if (!source.includes('const { randomUUID } = require("crypto");')) {
  throw new Error("Missing randomUUID import");
}
if (!source.includes(".insert({ id: randomUUID(), ...values, user_id: req.user.id })")) {
  throw new Error("Missing generated UUID in current-location insert");
}
console.log("OK: T1.8E.4.1.3 server syntax fix is present.");
