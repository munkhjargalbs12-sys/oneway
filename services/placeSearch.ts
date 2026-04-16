import { apiFetch } from "./apiClient";

export type PlaceSuggestion = {
  placeId: string;
  title: string;
  subtitle?: string;
  description: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  label: string;
  lat: number;
  lng: number;
};

type SearchPlacesOptions = {
  input: string;
  sessionToken?: string;
  origin?: {
    lat: number;
    lng: number;
  } | null;
};

export async function searchPlaces({
  input,
  sessionToken,
  origin,
}: SearchPlacesOptions): Promise<PlaceSuggestion[]> {
  const payload = await apiFetch("/places/autocomplete", {
    method: "POST",
    body: JSON.stringify({
      input,
      ...(sessionToken ? { sessionToken } : {}),
      ...(origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
        ? { origin }
        : {}),
    }),
  });

  return Array.isArray(payload?.suggestions) ? payload.suggestions : [];
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetails> {
  const suffix = sessionToken
    ? `?sessionToken=${encodeURIComponent(sessionToken)}`
    : "";

  return apiFetch(`/places/${encodeURIComponent(placeId)}${suffix}`);
}
