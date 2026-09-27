"use strict";
const fs=require("fs");
const files=["app/observation/[id].tsx","app/observation-chat/[id].tsx","app/chat/[matchId].tsx"];
let failed=false;
for(const f of files){const s=fs.readFileSync(f,"utf8");if(s.includes('/context/"OBSERVATION"/')||s.includes('/context/"MATCH"/')){console.error(f,"contains quoted context URL");failed=true;}if(/f├|fÃ|Ã¸|Ã¥/.test(s)){console.error(f,"contains encoding corruption");failed=true;}}
for(const f of ["server/routes/observationChat.js","server/routes/resolutions.js","server/routes/matches.js"]){const s=fs.readFileSync(f,"utf8");if(/f├|fÃ|Ã¸|Ã¥/.test(s)){console.error(f,"contains encoding corruption");failed=true;}}
if(failed)process.exit(1);console.log("OK: T1.7D source checks passed.");
