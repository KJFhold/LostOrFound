const fs=require("fs"),path=require("path"),r=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
const app=r("app/alert-areas.tsx"),server=r("server/routes/alertAreas.js"),sql=r("supabase/migrations/20260928_t1_8d41_watch_area_polygon_runtime_fix.sql");
for(const x of ["useSafeAreaInsets","s.backButton","<ScrollView","paddingTop:insets.top+4","top:insets.top+58"])if(!app.includes(x))throw Error(`Navigation/layout fix missing: ${x}`);
for(const x of ["point_data(value)","point_data.value ? 'latitude'","with ordinality as point_data(value, position)"])if(!sql.includes(x))throw Error(`SQL runtime fix missing: ${x}`);
for(const x of ["INVALID_BOUNDARY_COORDINATES","[alert-areas] create failed"])if(!server.includes(x))throw Error(`Backend error handling missing: ${x}`);
console.log("OK: T1.8D.4.1 checks passed.");

