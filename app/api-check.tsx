import { AppFontFamily, AppTheme } from "@/constants/theme";
import { getToken } from "../services/authStorage";
import { API_URL } from "../services/config";
import { describeError } from "../services/networkDiagnostics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type CheckResult = {
  label: string;
  ok: boolean;
  details: string;
};

type ApiCheckItem = {
  label: string;
  url: string;
  options: RequestInit;
  expectedStatuses: number[];
};

async function readResponse(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return "<empty>";

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export default function ApiCheckScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [lastRunAt, setLastRunAt] = useState("");

  const runChecks = async () => {
    setLoading(true);
    setResults([]);

    const token = await getToken();
    const nextResults: CheckResult[] = [];
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const checks: ApiCheckItem[] = [
      {
        label: "GET /health",
        url: `${API_URL}/health`,
        options: { method: "GET" },
        expectedStatuses: [200],
      },
      {
        label: "GET /rides",
        url: `${API_URL}/rides`,
        options: { method: "GET" },
        expectedStatuses: [200],
      },
      {
        label: "POST /auth/login",
        url: `${API_URL}/auth/login`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "00000000", password: "wrongpass" }),
        },
        expectedStatuses: [200, 400, 401],
      },
      {
        label: "GET /users/me",
        url: `${API_URL}/users/me`,
        options: {
          method: "GET",
          headers: authHeaders,
        },
        expectedStatuses: token ? [200] : [401],
      },
    ];

    for (const check of checks) {
      try {
        const res = await fetch(check.url, check.options);
        const body = await readResponse(res);
        const ok = check.expectedStatuses.includes(res.status);

        nextResults.push({
          label: check.label,
          ok,
          details: `URL: ${check.url}\nStatus: ${res.status}\nBody: ${body}`,
        });
      } catch (err) {
        nextResults.push({
          label: check.label,
          ok: false,
          details: `URL: ${check.url}\nError: ${describeError(err)}`,
        });
      }
    }

    setResults(nextResults);
    setLastRunAt(new Date().toLocaleString());
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[AppTheme.colors.text, AppTheme.colors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Diagnostics</Text>
        <Text style={styles.heroTitle}>API шалгалтын самбар</Text>
        <Text style={styles.heroBody}>
          Backend-ийн үндсэн endpoint-үүдийн төлөв, response body, auth behavior-ийг нэг дор шалгана.
        </Text>
      </LinearGradient>

      <View style={styles.metaCard}>
        <Text style={styles.metaText}>API URL: {API_URL}</Text>
        <Text style={styles.metaText}>Token state: {results.length ? "Шалгалтаас харна" : "Тодорхойгүй"}</Text>
        {lastRunAt ? <Text style={styles.metaText}>Сүүлд ажиллуулсан: {lastRunAt}</Text> : null}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={runChecks} disabled={loading}>
        {loading ? <ActivityIndicator color={AppTheme.colors.white} /> : <Text style={styles.primaryButtonText}>Шалгалт ажиллуулах</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Буцах</Text>
      </TouchableOpacity>

      {results.map((result) => (
        <View
          key={result.label}
          style={[
            styles.resultCard,
            { borderColor: result.ok ? AppTheme.colors.accent : AppTheme.colors.danger },
          ]}
        >
          <Text
            style={[
              styles.resultTitle,
              { color: result.ok ? AppTheme.colors.accentDeep : AppTheme.colors.danger },
            ]}
          >
            {result.ok ? "OK" : "FAIL"} · {result.label}
          </Text>
          <Text style={styles.resultBody}>{result.details}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    backgroundColor: AppTheme.colors.canvas,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 24,
    ...AppTheme.shadow.floating,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily: AppFontFamily,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  heroBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  metaCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  metaText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 16,
    ...AppTheme.shadow.floating,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  secondaryButtonText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  resultCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 14,
    ...AppTheme.shadow.card,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    fontFamily: AppFontFamily,
  },
  resultBody: {
    fontSize: 13,
    color: AppTheme.colors.text,
    lineHeight: 20,
  },
});
