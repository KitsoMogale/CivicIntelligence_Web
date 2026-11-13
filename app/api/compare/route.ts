import { countries, indicators } from "@/lib/knowledge";
import { comparisonRows } from "@/lib/analytics";
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const codes = (params.get("countries") ?? "ZA,BW").split(",");
  const code = params.get("indicator") ?? "SP.POP.TOTL";
  const year = params.has("year") ? Number(params.get("year")) : null;
  if (
    codes.length < 2 ||
    codes.length > 3 ||
    new Set(codes).size !== codes.length ||
    !codes.every((c) => countries.some((known) => known.code === c)) ||
    !indicators.some((i) => i.code === code) ||
    (year !== null && (!Number.isInteger(year) || year < 1960 || year > 2100))
  )
    return Response.json(
      { error: "Invalid comparison filters" },
      { status: 400 },
    );
  return Response.json(comparisonRows(code, codes, year));
}
