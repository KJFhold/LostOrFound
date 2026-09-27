import { CATEGORIES, SUBCATEGORIES, objectLabel } from "./categories";
export type AppLanguage = "no" | "en";
const CATEGORY_EN:Record<string,string>={PERSONAL:"Personal belongings",ELECTRONICS:"Electronics",BAGS_LUGGAGE:"Bags and luggage",CLOTHING_ACCESSORIES:"Clothing and accessories",JEWELRY:"Jewelry",TOOLS_HOUSE:"Tools",VEHICLE_TRANSPORT:"Vehicle / transport",SPORT_OUTDOOR:"Sports and outdoors",CULTURE_HOBBY:"Culture and hobbies",CHILDREN_FAMILY:"Children and family",PETS:"Pets"};
const COLOR_NO:Record<string,string>={black:"Svart",white:"Hvit",gray:"Grå",red:"Rød",orange:"Oransje",yellow:"Gul",green:"Grønn",blue:"Blå",purple:"Lilla",brown:"Brun",pink:"Rosa",beige:"Beige",navy:"Mørkeblå",silver:"Sølv",gold:"Gull",multicolor:"Flerfarget"};
const COLOR_EN:Record<string,string>={black:"Black",white:"White",gray:"Gray",red:"Red",orange:"Orange",yellow:"Yellow",green:"Green",blue:"Blue",purple:"Purple",brown:"Brown",pink:"Pink",beige:"Beige",navy:"Navy",silver:"Silver",gold:"Gold",multicolor:"Multicolor"};
const norm=(v:any)=>String(v||"").trim().toUpperCase().replace(/[ -]+/g,"_");
export function categoryLabel(v:any,l:AppLanguage){const k=norm(v);return l==="en"?(CATEGORY_EN[k]||String(v||"")):(CATEGORIES.find(x=>x.value===k)?.label||String(v||""));}
export function itemLabel(v:any,l:AppLanguage,c?:any){return objectLabel(norm(v),l,norm(c))||String(v||"");}
export function colorLabel(v:any,l:AppLanguage){const k=String(v||"").trim().toLowerCase();return (l==="en"?COLOR_EN:COLOR_NO)[k]||String(v||"");}
export function reportSummary(r:any,l:AppLanguage){if(!r)return "";const type=String(r.type||"").toUpperCase()==="FOUND"?(l==="en"?"Found":"Funnet"):(l==="en"?"Lost":"Mistet");return [type,categoryLabel(r.category,l),itemLabel(r.subcategory_key,l,r.category),colorLabel(r.color,l)].filter(Boolean).join(" • ");}
export function localizeStoredReportTitle(v:any){return String(v||"");}
export function notificationCaseLabel(r:any,l:AppLanguage){if(!r)return "";const type=String(r.type||"").toUpperCase()==="FOUND"?(l==="en"?"Found":"Funnet"):(l==="en"?"Lost":"Mistet");const color=colorLabel(r.color,l).trim().toLowerCase();const item=String(r.subcategory_custom||itemLabel(r.subcategory_key,l,r.category)||"").trim().toLowerCase();return [type,color,item].filter(Boolean).join(" ").replace(/\s+/g," ").trim();}
