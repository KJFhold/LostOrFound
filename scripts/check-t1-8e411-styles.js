"use strict";
const fs = require("fs");
const source = fs.readFileSync("app/alert-areas.tsx", "utf8");
const required = [
  "panelCollapsed: {",
  "statusBoxActive: {",
  "statusBoxBusy: {",
  "statusBoxOff: {",
];
for (const value of required) {
  if (!source.includes(value)) throw new Error(`Missing style definition: ${value}`);
}
console.log("OK: T1.8E.4.1.1 style definitions are present.");
