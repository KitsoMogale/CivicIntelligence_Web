import { countries, getSources } from "@/lib/knowledge";
import {
  countryProfile,
  countryAreas,
  countryCoverage,
} from "@/lib/country-profiles";
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("country");
  if (code && !/^[A-Z]{2}$/.test(code))
    return Response.json({ error: "Invalid country code" }, { status: 400 });
  if (!code)
    return Response.json({
      countries: countries.map((c) => ({
        ...c,
        coverage: countryCoverage(c.code),
      })),
    });
  const country = countries.find((c) => c.code === code);
  if (!country)
    return Response.json(
      { error: "Country or area not found" },
      { status: 404 },
    );
  const profile = countryProfile(code);
  return Response.json({
    country,
    profile,
    areas: countryAreas(code),
    sources: getSources([...profile.sourceIds, profile.boundary.sourceId]),
  });
}
