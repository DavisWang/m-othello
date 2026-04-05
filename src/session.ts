const STORAGE_KEY = "m-othello.seat.v1";

export type Seat = { role: "black" | "white"; token: string };

type Store = Record<string, Seat>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadSeat(publicId: string): Seat | null {
  const s = readStore()[publicId];
  if (!s?.token || (s.role !== "black" && s.role !== "white")) return null;
  return s;
}

export function saveSeat(publicId: string, seat: Seat) {
  const store = readStore();
  store[publicId] = seat;
  writeStore(store);
}

export function clearSeat(publicId: string) {
  const store = readStore();
  delete store[publicId];
  writeStore(store);
}
