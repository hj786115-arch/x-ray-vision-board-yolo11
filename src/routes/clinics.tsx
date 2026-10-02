import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  MapPin, Navigation, Loader2, AlertCircle, ExternalLink,
  Building2, Pill, Stethoscope, Heart, RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { clinicApi } from "@/lib/api";
import type { ClinicResult } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/clinics")({
  head: () => ({ meta: [{ title: "Nearby Clinics - XRayVision AI" }] }),
  component: ClinicsPage,
});

const AMENITY_ICONS: Record<string, typeof Building2> = {
  Hospital: Building2,
  Pharmacy: Pill,
  Doctors: Stethoscope,
  Clinic: Heart,
  "Health Centre": Heart,
};

const URGENCY_COLORS: Record<string, string> = {
  Hospital: "text-destructive bg-destructive/10 border-destructive/20",
  Pharmacy: "text-info bg-info/10 border-info/20",
  Doctors: "text-primary bg-primary/10 border-primary/20",
  Clinic: "text-warning bg-warning/10 border-warning/20",
  "Health Centre": "text-warning bg-warning/10 border-warning/20",
};

function ClinicCard({ clinic }: { clinic: ClinicResult }) {
  const { t, term } = useLanguage();
  const Icon = AMENITY_ICONS[clinic.type] ?? Building2;
  const colorClass = URGENCY_COLORS[clinic.type] ?? "text-muted-foreground bg-card border-border";

  return (
    <div className="group rounded-xl border border-border bg-card/70 p-4 interaction-lift hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground text-sm">{clinic.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{term(clinic.type)}</p>
            {clinic.address !== "Address not available" && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{clinic.address}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
            {clinic.distance_km} {t("common.km")}
          </span>
          <a
            href={clinic.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ExternalLink size={11} />
            {t("cl.maps")}
          </a>
        </div>
      </div>
    </div>
  );
}

function ClinicsPage() {
  const { t, format } = useLanguage();
  const [clinics, setClinics] = useState<ClinicResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityLoading, setCityLoading] = useState(false);
  const [cityChoices, setCityChoices] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [searchedRadius, setSearchedRadius] = useState(5);
  const [selectedCityName, setSelectedCityName] = useState("");
  const mapsLink = (kind: string) => {
    if (location && !selectedCityName) return `https://www.google.com/maps/search/${encodeURIComponent(kind)}/@${location.lat},${location.lon},14z`;
    const area = selectedCityName || cityQuery.trim();
    return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: area ? `${kind} in ${area}` : `${kind} near me` })}`;
  };

  const searchCity = async () => {
    if (cityQuery.trim().length < 3) return;
    setCityLoading(true);
    setError(null);
    setCityChoices([]);
    try {
      const result = await clinicApi.locations(cityQuery.trim());
      setCityChoices(result.locations);
      if (!result.locations.length) setError("City not found. Try a city with its country, such as Lahore, Pakistan, or use Maps below.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "City search is unavailable.");
    } finally {
      setCityLoading(false);
    }
  };

  const doSearch = useCallback(async (lat: number, lon: number, radius: number) => {
    setLoading(true);
    setError(null);
    setClinics(null);
    try {
      const result = await clinicApi.search({ lat, lon, radius_km: radius });
      setClinics(result.clinics);
      setSearchedRadius(radius);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("cl.errFind"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t("cl.errGeoUnsupported"));
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lon: longitude });
        setSelectedCityName("");
        setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        doSearch(latitude, longitude, radiusKm);
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) {
          setError(t("cl.errDenied"));
        } else {
          setError(t("cl.errLocate"));
        }
      },
      { timeout: 15000, maximumAge: 120000, enableHighAccuracy: false },
    );
  }, [radiusKm, doSearch, t]);

  const handleRefresh = useCallback(() => {
    if (location) doSearch(location.lat, location.lon, radiusKm);
  }, [location, radiusKm, doSearch]);

  const hospitalCount = clinics?.filter((c) => c.type === "Hospital").length ?? 0;
  const pharmacyCount = clinics?.filter((c) => c.type === "Pharmacy").length ?? 0;

  return (
    <AppShell title="Nearby Clinics" titleKey="cl.title">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="clinical-panel-strong premium-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">{t("cl.heading")}</h2>
              <p className="text-xs text-muted-foreground">{t("cl.sub")}</p>
            </div>
          </div>

          <form className="mb-4" onSubmit={(event) => { event.preventDefault(); searchCity(); }}>
            <label htmlFor="clinic-city" className="mb-1 block text-xs font-medium text-muted-foreground">Search by city or postal code</label>
            <div className="flex gap-2">
              <input id="clinic-city" value={cityQuery} onChange={(event) => { setCityQuery(event.target.value); setCityChoices([]); }} placeholder="Lahore, Pakistan" maxLength={120} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <button type="submit" disabled={cityLoading || loading || cityQuery.trim().length < 3} className="clinical-button-secondary px-3 disabled:opacity-50">{cityLoading ? "Searching..." : "Find city"}</button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Use this if your browser cannot share location. City searches use the city center.</p>
            {cityChoices.length > 0 && <div className="mt-2 space-y-1">{cityChoices.map((city) => <button key={`${city.lat},${city.lon}`} type="button" disabled={loading} className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-primary" onClick={() => { setLocation(city); setLocationName(city.name); setSelectedCityName(city.name); setCityChoices([]); doSearch(city.lat, city.lon, radiusKm); }}>{city.name}</button>)}</div>}
          </form>

          {/* Radius slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("cl.radius")}</label>
              <span className="font-mono text-xs text-primary">{radiusKm} {t("common.km")}</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="h-10 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>1 {t("common.km")}</span>
              <span>20 {t("common.km")}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleLocate}
              disabled={loading}
              className="clinical-button flex-1 px-4 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Navigation size={16} />
              )}
              {loading ? t("cl.locating") : t("cl.useLocation")}
            </button>
            {location && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="clinical-button-secondary px-3 disabled:opacity-50"
              >
                <RefreshCw size={14} />
                {t("cl.refresh")}
              </button>
            )}
          </div>

          {locationName && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {format("cl.current", { loc: locationName })}
            </p>
          )}
        </div>

        <div className="clinical-panel p-4">
          <p className="text-sm font-semibold">Live map search</p>
          <p className="mt-1 text-xs text-muted-foreground">Open current listings and directions in Google Maps. This also works when the directory service is busy. Maps results may use a wider area than the radius below.</p>
          <div className="mt-3 flex flex-wrap gap-2">{["Clinics", "Hospitals", "Pharmacies"].map((kind) => <a key={kind} href={mapsLink(kind)} target="_blank" rel="noopener noreferrer" className="clinical-button-secondary px-3 text-xs">{kind} on Maps <ExternalLink size={12} /></a>)}</div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="clinical-panel p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="premium-skeleton h-4 w-40" />
                <div className="premium-skeleton mt-3 h-3 w-64 max-w-full" />
              </div>
              <Loader2 size={18} className="animate-spin text-primary" />
            </div>
            <div className="mt-5 space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="premium-skeleton h-20 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {clinics !== null && !loading && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {clinics.length === 0
                  ? t("cl.none")
                  : format("cl.count", { n: clinics.length, r: searchedRadius })}
              </p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {hospitalCount > 0 && <span>{format("cl.hospitals", { n: hospitalCount }).replace("(s)", hospitalCount !== 1 ? "s" : "")}</span>}
                {pharmacyCount > 0 && <span>{format("cl.pharmacies", { n: pharmacyCount }).replace("(ies)", pharmacyCount !== 1 ? "ies" : "y")}</span>}
              </div>
            </div>

            {clinics.length === 0 ? (
              <div className="clinical-panel flex flex-col items-center justify-center py-16 text-center">
                <MapPin size={40} className="text-muted-foreground/30" />
                <p className="mt-4 font-display text-base font-bold text-muted-foreground">{t("cl.none")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("cl.noneHint")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clinics.map((clinic, i) => (
                  <ClinicCard key={`${clinic.name}-${i}`} clinic={clinic} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Initial empty state */}
        {clinics === null && !loading && !error && (
          <div className="clinical-panel flex flex-col items-center justify-center py-16 text-center">
            <Navigation size={40} className="text-primary/30" />
            <p className="mt-4 font-display text-base font-bold text-muted-foreground">{t("cl.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("cl.emptyBody")}</p>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          {t("cl.credit")}
          {" · City search: Open-Meteo / GeoNames"}
        </p>
      </div>
    </AppShell>
  );
}
