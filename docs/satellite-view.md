# Satellite view

Open **Layers → Basemap → Satellite · 2016 overview**. You can switch between streets, satellite images and the offline reference map without moving the map or clearing your selection. Boundaries, wards, statistics and dots remain separate layers that you can turn on or off.

The key-free view uses EOxCloudless, made from Copernicus Sentinel images captured in **2016**, at about **10 metres of ground detail**. It helps show fields, vegetation, coastlines and built-up areas. It cannot promise clear views of individual houses or small facilities. Beyond zoom 14, the map enlarges the same image rather than requesting more detail. It is not a live view, and the app's date filters do not change its capture year.

The 2016 mosaic uses [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Its [publisher's terms](https://cloudless.eox.at/documentation/faq) allow reasonable traffic to the public service, which has no uptime guarantee. Later EOX mosaics have different reuse terms. The source's full credit is available in the map's attribution control, with a permanent source and year link along the bottom.

Images load only when their basemap is selected. Changing basemaps stops the previous source. If a tile fails or loading takes too long, the reference map appears with a retry button. No imagery packs are downloaded. Saved investigations keep the selected basemap. Offline HTML reports describe the imagery source but show reference geography instead of embedding online images.

## Sharper satellite and aerial images

The app also supports [MapTiler satellite imagery](https://docs.maptiler.com/cloud/api/tiles/). This needs a separate map account and API key; AI credentials are unrelated.

1. Create a MapTiler browser key with a plan suitable for the app's use. Restrict its allowed origins to your local address and, later, your Netlify domain.
2. Add it to an ignored `.env.local` file:

   ```text
   NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_browser_key
   ```

3. Restart `npm.cmd run dev`. For a production build, set the key before building and rebuild after changes.
4. Choose **Layers → Basemap → Satellite · detailed imagery**.

This is a public browser key: it is included in the website so the browser can request map tiles. Do not put an AI key or another private credential in this setting. On Netlify, set the same variable as a build environment variable when deployment is authorized.

MapTiler's TileJSON supplies the tile addresses, native zoom limits and imagery credits. The app displays its logo and attribution. Detail and capture dates vary by place; there is no single image date or promised building-level coverage everywhere. The provider's [account terms](https://www.maptiler.com/terms/) and usage allowance apply. A real account and key are needed to verify the detailed imagery service end to end.

Satellite images are a visual background. They do not prove a facility's name, ownership, operating status or exact boundary. The app's checked records keep their own sources and dates.
