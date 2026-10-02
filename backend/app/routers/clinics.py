"""Nearby healthcare search using Photon and OpenStreetMap Overpass."""

from __future__ import annotations

import logging
import math
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.schemas import ClinicResult, ClinicSearchResponse
from app.services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(tags=["clinics"])

OVERPASS_ENDPOINTS = (
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)
_cache: dict[tuple, tuple[float, list]] = {}


def _cached(key: tuple):
    item = _cache.get(key)
    return item[1] if item and time.monotonic() - item[0] < 600 else None


def _remember(key: tuple, value: list):
    if len(_cache) >= 128:
        _cache.pop(next(iter(_cache)))
    _cache[key] = (time.monotonic(), value)

AMENITY_LABELS = {
    "hospital": "Hospital",
    "clinic": "Clinic",
    "doctors": "Doctors",
    "doctor": "Doctors",
    "pharmacy": "Pharmacy",
    "health_centre": "Health Centre",
    "centre": "Health Centre",
}


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two GPS coordinates."""
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return radius * 2 * math.asin(math.sqrt(a))


@router.get("/clinics", response_model=ClinicSearchResponse)
async def find_nearby_clinics(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(default=5.0, ge=0.5, le=25.0, description="Search radius in km"),
    _user_id: str = Depends(get_current_user_id),
):
    """Find hospitals, clinics, doctors, and pharmacies near the given GPS coordinates."""
    radius_m = int(radius_km * 1000)
    elements = await _fetch_nearby_elements(lat, lon, radius_m)
    clinics = _parse_clinics(elements, lat, lon, radius_km)

    return ClinicSearchResponse(
        clinics=clinics,
        total=len(clinics),
        search_location={"lat": lat, "lon": lon, "radius_km": radius_km},
    )


async def _fetch_nearby_elements(lat: float, lon: float, radius_m: int) -> list[dict[str, Any]]:
    key = ("nearby", round(lat, 5), round(lon, 5), radius_m)
    cached = _cached(key)
    if cached is not None:
        return cached
    try:
        elements = await _fetch_photon_elements(lat, lon, radius_m)
    except (httpx.HTTPError, ValueError, TypeError, KeyError) as exc:
        logger.warning("Photon healthcare lookup unavailable: %s", type(exc).__name__)
        elements = await _fetch_overpass_elements(lat, lon, radius_m)
    _remember(key, elements)
    return elements


async def _fetch_photon_elements(lat: float, lon: float, radius_m: int) -> list[dict[str, Any]]:
    # Photon documents category-filtered reverse lookup for nearby pharmacies.
    # One bounded request returns named healthcare places, not an exhaustive census.
    params = [("lat", str(lat)), ("lon", str(lon)), ("radius", str(radius_m / 1000)),
              ("limit", "50"), ("lang", "en")]
    params.extend(("osm_tag", "amenity:" + kind) for kind in
                  ("hospital", "clinic", "doctors", "pharmacy", "health_centre"))
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(14.0, connect=6.0), follow_redirects=True,
        headers={"User-Agent": "XRayVisionAI/2.2 (x-ray-vision-board-yolo11.vercel.app)"},
    ) as client:
        response = await client.get("https://photon.komoot.io/reverse", params=params)
        response.raise_for_status()
        payload = response.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("features"), list):
        raise ValueError("Invalid Photon healthcare response")
    elements = []
    for feature in payload["features"]:
        props = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        coords = geometry.get("coordinates") or []
        kind = props.get("osm_value")
        if props.get("osm_key") != "amenity" or kind not in AMENITY_LABELS:
            continue
        if geometry.get("type") != "Point" or len(coords) < 2:
            continue
        clon, clat = float(coords[0]), float(coords[1])
        if not (-90 <= clat <= 90 and -180 <= clon <= 180):
            continue
        tags = {"name": props.get("name") or "Unnamed Facility", "amenity": kind}
        for source, dest in (("housenumber", "housenumber"), ("street", "street"),
                             ("district", "suburb"), ("city", "city"),
                             ("state", "state"), ("country", "country")):
            if props.get(source):
                tags["addr:" + dest] = props[source]
        elements.append({"type": "node", "id": props.get("osm_id"),
                         "lat": clat, "lon": clon, "tags": tags})
    return elements


async def _fetch_overpass_elements(lat: float, lon: float, radius_m: int) -> list[dict[str, Any]]:
    key = (round(lat, 5), round(lon, 5), radius_m)
    cached = _cached(key)
    if cached is not None:
        return cached
    # A bounding-box index query avoids six repeated around-distance queries.
    # Exact distance filtering and nearest-first sorting happen below.
    lat_delta = radius_m / 110500
    lon_delta = min(180, radius_m / (111320 * max(abs(math.cos(math.radians(lat))), 0.001)))
    bounds = f"{max(-90,lat-lat_delta)},{max(-180,lon-lon_delta)},{min(90,lat+lat_delta)},{min(180,lon+lon_delta)}"
    query = f"""
[out:json][timeout:18];
(
  nwr[amenity=hospital]({bounds});
  nwr[amenity=clinic]({bounds});
  nwr[amenity=doctors]({bounds});
  nwr[amenity=pharmacy]({bounds});
  nwr[amenity=health_centre]({bounds});
);
out body center 1000;
"""

    last_error: str | None = None
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(25.0, connect=8.0),
        headers={"User-Agent": "XRayVisionAI/2.1 educational clinic locator"},
        follow_redirects=True,
    ) as client:
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                response = await client.get(endpoint, params={"data": query})
                response.raise_for_status()
                payload = response.json()
                if payload.get("remark") or not isinstance(payload.get("elements"), list):
                    raise ValueError("Overpass returned an incomplete result")
                elements = payload["elements"]
                _remember(key, elements)
                return elements
            except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.TransportError, ValueError) as exc:
                last_error = str(exc)
                logger.warning("Overpass endpoint failed (%s): %s", endpoint, exc)

    raise HTTPException(
        status_code=503,
        detail=f"Clinic lookup service temporarily unavailable. Tried {len(OVERPASS_ENDPOINTS)} OpenStreetMap mirrors.",
    ) from RuntimeError(last_error or "Overpass unavailable")


def _parse_clinics(elements: list[dict[str, Any]], lat: float, lon: float, radius_km: float) -> list[ClinicResult]:
    clinics: list[ClinicResult] = []
    seen: set[tuple[str, float, float]] = set()

    for element in elements:
        tags = element.get("tags") or {}
        name = tags.get("name") or tags.get("operator") or tags.get("brand") or "Unnamed Facility"
        raw_type = (tags.get("amenity") or tags.get("healthcare") or "clinic").replace(" ", "_").lower()
        facility_type = AMENITY_LABELS.get(raw_type, raw_type.replace("_", " ").title())

        coords = _element_coords(element, lat, lon)
        if coords is None:
            continue
        clat, clon = coords
        exact_distance = _haversine(lat, lon, clat, clon)
        if exact_distance > radius_km:
            continue
        distance = round(exact_distance, 2)

        dedupe_key = (name.strip().lower(), round(clat, 4), round(clon, 4))
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        clinics.append(
            ClinicResult(
                name=name,
                type=facility_type,
                address=_address_from_tags(tags),
                lat=clat,
                lon=clon,
                distance_km=distance,
                maps_url=f"https://www.google.com/maps/search/?api=1&query={clat},{clon}",
            )
        )

    clinics.sort(key=lambda clinic: (clinic.distance_km, clinic.type, clinic.name))
    return clinics[:80]


def _element_coords(element: dict[str, Any], fallback_lat: float, fallback_lon: float) -> tuple[float, float] | None:
    if element.get("type") == "node" and "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])

    center = element.get("center") or {}
    if "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])

    if "bounds" in element:
        bounds = element["bounds"]
        try:
            return (
                (float(bounds["minlat"]) + float(bounds["maxlat"])) / 2,
                (float(bounds["minlon"]) + float(bounds["maxlon"])) / 2,
            )
        except (KeyError, TypeError, ValueError):
            pass

    # Missing coordinates must never create a fictional zero-distance clinic.
    return None


@router.get("/clinics/locations")
async def search_clinic_locations(
    query: str = Query(..., min_length=3, max_length=120),
    _user_id: str = Depends(get_current_user_id),
):
    """User-triggered city/postcode lookup; no location permission needed."""
    key = ("city", query.strip().lower())
    cached = _cached(key)
    if cached is not None:
        return {"locations": cached}
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get("https://geocoding-api.open-meteo.com/v1/search", params={
                "name": query.strip(), "count": 5, "language": "en", "format": "json",
            })
            r.raise_for_status()
            locations = [{
                "name": ", ".join(str(p) for p in (v.get("name"), v.get("admin1"), v.get("country")) if p),
                "lat": v["latitude"], "lon": v["longitude"],
            } for v in r.json().get("results", []) if "latitude" in v and "longitude" in v]
            _remember(key, locations)
            return {"locations": locations}
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        logger.warning("City lookup unavailable: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="City search is temporarily unavailable. Use your location or open the Maps search below.") from exc


def _address_from_tags(tags: dict[str, Any]) -> str:
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:barangay"),
        tags.get("addr:suburb"),
        tags.get("addr:city") or tags.get("addr:municipality"),
        tags.get("addr:province") or tags.get("addr:state"),
        tags.get("addr:country"),
    ]
    return ", ".join(str(part) for part in parts if part) or "Address not available"
