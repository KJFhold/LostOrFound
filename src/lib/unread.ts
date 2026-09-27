import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "lastSeenAtByMatch";

type Map = Record<string, string>; // matchId -> ISO timestamp

export async function getLastSeenMap(): Promise<Map> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function setLastSeen(matchId: string) {
  const map = await getLastSeenMap();
  map[matchId] = new Date().toISOString();
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}
