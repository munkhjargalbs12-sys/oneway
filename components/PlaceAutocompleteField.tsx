import { AppFontFamily, AppTheme } from "@/constants/theme";
import {
  getPlaceDetails,
  searchPlaces,
  type PlaceDetails,
  type PlaceSuggestion,
} from "@/services/placeSearch";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  label?: string;
  placeholder: string;
  helperText?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (place: PlaceDetails) => void;
  selectedPlaceId?: string | null;
  selectedLabel?: string | null;
  origin?: {
    lat: number;
    lng: number;
  } | null;
  compact?: boolean;
  showGoogleHint?: boolean;
};

function createSessionToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PlaceAutocompleteField({
  label,
  placeholder,
  helperText,
  value,
  onChangeText,
  onSelectPlace,
  selectedPlaceId,
  selectedLabel,
  origin,
  compact = false,
  showGoogleHint = !compact,
}: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const sessionTokenRef = useRef(createSessionToken());

  const trimmedValue = value.trim();
  const trimmedSelectedLabel = (selectedLabel || "").trim();
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const isShowingConfirmedSelection =
    Boolean(selectedPlaceId) &&
    Boolean(trimmedSelectedLabel) &&
    trimmedValue === trimmedSelectedLabel;

  useEffect(() => {
    if (isShowingConfirmedSelection || trimmedValue.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setErrorText(null);
      return;
    }

    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorText(null);

        const nextSuggestions = await searchPlaces({
          input: trimmedValue,
          sessionToken: sessionTokenRef.current,
          origin:
            Number.isFinite(originLat) && Number.isFinite(originLng)
              ? { lat: originLat as number, lng: originLng as number }
              : null,
        });

        if (requestIdRef.current !== nextRequestId) return;
        setSuggestions(nextSuggestions);
      } catch {
        if (requestIdRef.current !== nextRequestId) return;
        setSuggestions([]);
        setErrorText("Газрын нэрийн санал ачаалж чадсангүй.");
      } finally {
        if (requestIdRef.current === nextRequestId) {
          setLoading(false);
        }
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [isShowingConfirmedSelection, originLat, originLng, trimmedValue]);

  const shouldShowEmptyState = useMemo(
    () =>
      !loading &&
      !errorText &&
      !isShowingConfirmedSelection &&
      trimmedValue.length >= 2 &&
      suggestions.length === 0,
    [errorText, isShowingConfirmedSelection, loading, suggestions.length, trimmedValue.length]
  );

  async function handleSelectSuggestion(item: PlaceSuggestion) {
    try {
      setResolvingPlaceId(item.placeId);
      setErrorText(null);

      const place = await getPlaceDetails(item.placeId, sessionTokenRef.current);

      onChangeText(place.label);
      onSelectPlace(place);
      setSuggestions([]);
      sessionTokenRef.current = createSessionToken();
    } catch {
      setErrorText("Сонгосон байршлын координатыг авч чадсангүй.");
    } finally {
      setResolvingPlaceId(null);
    }
  }

  return (
    <View style={styles.container}>
      {!compact && label ? <Text style={styles.label}>{label}</Text> : null}
      {!compact && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <View style={[styles.inputWrap, compact && styles.inputWrapCompact]}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={AppTheme.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          style={[styles.input, compact && styles.inputCompact]}
        />
        {loading ? (
          <ActivityIndicator size="small" color={AppTheme.colors.accentDeep} style={styles.loader} />
        ) : null}
      </View>

      {showGoogleHint ? <Text style={styles.googleHint}>Google Places санал</Text> : null}

      {errorText ? <Text style={styles.feedbackError}>{errorText}</Text> : null}
      {shouldShowEmptyState ? <Text style={styles.feedbackText}>Тохирох байршил олдсонгүй.</Text> : null}

      {suggestions.length > 0 ? (
        <View style={styles.resultsCard}>
          {suggestions.map((item) => {
            const isResolving = resolvingPlaceId === item.placeId;

            return (
              <Pressable
                key={item.placeId}
                style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultSubtitle} numberOfLines={2}>
                    {item.subtitle || item.description}
                  </Text>
                </View>
                {isResolving ? (
                  <ActivityIndicator size="small" color={AppTheme.colors.accentDeep} />
                ) : (
                  <Text style={styles.resultAction}>Сонгох</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    color: AppTheme.colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  helperText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  inputWrap: {
    marginTop: 14,
    position: "relative",
  },
  inputWrapCompact: {
    marginTop: 0,
  },
  input: {
    backgroundColor: AppTheme.colors.white,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    color: AppTheme.colors.text,
    paddingRight: 44,
  },
  inputCompact: {
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 14,
  },
  loader: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  googleHint: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.3,
    marginTop: 8,
  },
  feedbackText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
  feedbackError: {
    color: "#b94a48",
    fontSize: 12,
    marginTop: 10,
  },
  resultsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    overflow: "hidden",
    backgroundColor: AppTheme.colors.white,
  },
  resultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,204,190,0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultRowPressed: {
    backgroundColor: AppTheme.colors.cardSoft,
  },
  resultTextWrap: {
    flex: 1,
  },
  resultTitle: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  resultSubtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  resultAction: {
    color: AppTheme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "700",
  },
});
