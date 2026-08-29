import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { supabase } from "./supabase";
import { API_BASE_URL } from "./config";

async function fetchJsonWithTimeout<T>(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 20_000): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(input, { ...(init || {}), signal: controller.signal });
    const text = await r.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    return { ok: r.ok, status: r.status, data, text };
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("UPLOAD_TIMEOUT");
    throw e;
  } finally { clearTimeout(id); }
}
function isSvgUri(uri: string) { const u=(uri||"").toLowerCase(); return u.includes(".svg") || u.startsWith("data:image/svg"); }
async function normalizePickedImageUri(uri: string): Promise<string> {
  if (!uri) throw new Error("IMAGE_URI_MISSING");
  if (isSvgUri(uri)) throw new Error("IMAGE_TYPE_UNSUPPORTED");
  try {
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
    return out.uri;
  } catch { return uri; }
}
export async function pickOneImage(): Promise<string | null> {
  try {
    const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.granted) {
      const res=await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing:false, quality:1, selectionLimit:1 });
      if (!res.canceled && res.assets?.length) return await normalizePickedImageUri(res.assets[0]?.uri ?? "");
    }
  } catch {}
  const doc=await DocumentPicker.getDocumentAsync({ type:["image/*"], multiple:false, copyToCacheDirectory:true });
  if (doc.canceled) return null;
  const asset=(doc as any).assets?.[0] ?? doc as any;
  return asset?.uri ? normalizePickedImageUri(asset.uri) : null;
}
export async function captureOneImage(): Promise<string | null> {
  const perm=await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res=await ImagePicker.launchCameraAsync({ allowsEditing:false, quality:1 });
  if (res.canceled || !res.assets?.length) return null;
  return normalizePickedImageUri(res.assets[0]?.uri ?? "");
}
export async function compressImage(uri:string, opts?:{maxWidth?:number;quality?:number}):Promise<{uri:string;mime:string;ext:string}> {
  const width=Math.max(320,Math.min(opts?.maxWidth ?? 1600,4096));
  const quality=Math.max(.1,Math.min(opts?.quality ?? .8,1));
  const out=await ImageManipulator.manipulateAsync(uri,[{resize:{width}}],{compress:quality,format:ImageManipulator.SaveFormat.JPEG});
  return {uri:out.uri,mime:"image/jpeg",ext:"jpg"};
}
export type UploadedImage={path:string;url?:string};
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function putLocalFile(signedUrl:string, uri:string, mime:string) {
  const file=new File(uri);
  if (!file.exists || !file.size) throw new Error("IMAGE_FILE_UNAVAILABLE");
  let lastStatus=0;
  for (let attempt=0; attempt<2; attempt++) {
    const response=await expoFetch(signedUrl,{method:"PUT",headers:{"Content-Type":mime},body:file as any});
    if (response.ok) return;
    lastStatus=response.status;
    if (attempt===0 && (response.status===408 || response.status===429 || response.status>=500)) { await wait(700); continue; }
    break;
  }
  throw new Error(`STORAGE_UPLOAD_FAILED_${lastStatus || "NETWORK"}`);
}
export async function uploadReportImage(reportId:string,localUri:string,sortOrder=0):Promise<UploadedImage> {
  if (!reportId || typeof reportId!=="string") throw new Error("REPORT_ID_INVALID");
  if (!localUri) throw new Error("IMAGE_URI_MISSING");
  const already=localUri.includes("/ImageManipulator/") && /\.jpe?g$/i.test(localUri);
  const normalized=already?{uri:localUri,mime:"image/jpeg",ext:"jpg"}:await compressImage(localUri);
  const {data:sess}=await supabase.auth.getSession();
  const token=sess.session?.access_token;
  if (!token) throw new Error("AUTH_REQUIRED");
  const signed=await fetchJsonWithTimeout<{path:string;signedUrl:string;error?:string}>(`${API_BASE_URL}/storage/signed-upload`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({reportId,ext:normalized.ext})});
  if (!signed.ok) throw new Error("SIGNED_UPLOAD_FAILED");
  const path=(signed.data as any)?.path; const signedUrl=(signed.data as any)?.signedUrl;
  if (!path || !signedUrl) throw new Error("SIGNED_UPLOAD_RESPONSE_INVALID");
  await putLocalFile(signedUrl,normalized.uri,normalized.mime);
  const reg=await fetchJsonWithTimeout<{image?:any;error?:string}>(`${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/images`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({path,sort_order:sortOrder})});
  if (!reg.ok) throw new Error("IMAGE_REGISTRATION_FAILED");
  return {path};
}
