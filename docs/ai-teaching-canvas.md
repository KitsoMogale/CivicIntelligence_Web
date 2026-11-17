# The AI teaching canvas

Civic Intelligence is a visual learning app. Ask about any country or subject. GPT researches the question, explains it, and uses the same canvas tools you can use yourself. Topics are not limited to the saved examples.

## Start locally

Keep two terminals open in the project folder:

```powershell
# Terminal 1 — the website
npm.cmd run dev
```

```powershell
# Terminal 2 — the AI teaching service
npm.cmd run dev:api
```

Open http://127.0.0.1:3000. Your server-only `.env.local` needs `OPENAI_API_KEY`. The model is `OPENAI_MODEL=gpt-6-luna`. Both commands read this file. Restart the teaching service after changing its environment. Keep keys out of chat messages, public variables, exports and Git.

The website connects to FastAPI at http://127.0.0.1:8000 by default. `AI_SERVICE_URL` changes that address. The map browser key, `NEXT_PUBLIC_MAPTILER_KEY`, is separate from the OpenAI key.

For a fresh checkout, run `npm.cmd ci`, set up Python with `node scripts/bootstrap-python.mjs`, and install `backend/requirements.txt` into `backend/.venv`. A database is not required for teaching.

## Try it

Ask: “Explain how Namibia makes laws. Research official sources and build a flow diagram.” Then select a step and ask: “Explain this part in more detail.”

Or ask: “Explain South Africa's electricity system using a map and a flow diagram. Only plot sites with sourced coordinates.” Maps can use reference geography, streets or detailed satellite imagery when the map key is configured. Imagery dates vary by location.

Click **Teaching canvas** to open the board manually. You can:

- Add maps, hierarchies, flows, relationship graphs, charts, timelines, panels and notes.
- Drag a visual by its heading, resize its selected frame, or close it.
- Pan and zoom the board; pan and zoom inside a map or diagram separately.
- Arrange visuals in a grid or side by side, and connect their edge handles.
- Filter elements, select an item, inspect its details, highlight it, or expand/collapse diagram children.
- Edit notes and information panels, undo/redo changes, and download the board as JSON.

The board is saved in this browser. Conversation history stays in the current page session. The older saved explorations and visual reports cover the map reference workspace; use the teaching toolbar's export for the teaching board.

## How an answer reaches the canvas

1. The browser sends the question, recent conversation, visible board, selected item, map camera and active map layers to the same-origin Next.js endpoint.
2. Next checks the request origin, size and rate limit, then calls the private FastAPI teaching service.
3. FastAPI calls the OpenAI Responses API with `gpt-6-luna`, built-in web search and a structured `canvas_command` function. Provider response storage is disabled.
4. GPT can research, propose a change, receive a validation result, and correct its proposal. It sees the existing component IDs so it can update a visual without replacing the rest of the board.
5. The browser checks the complete batch again and applies it as one undo step. If the user changed the board or map during the answer, the changes are rejected and the user can ask again with the current context.

Responses stream text and progress messages. Inline web citations are clickable. Visuals keep their source links and reporting dates. Map dots show details when selected; they do not have floating entity label cards.

## Shared tools and checks

The contract is defined in `lib/teaching.ts` and exported with `npm.cmd run canvas:contract` to `backend/canvas-contract.json`. Both runtimes validate against this contract. Commands create/update/remove a component, arrange or connect components, select/highlight/filter items, move a map camera, or move the board camera. Users and GPT use the same commands.

No command runs arbitrary code or accepts HTML or renderer configuration. Source URLs must use HTTP or HTTPS. New AI source URLs must come from its web search results or sources already on the board. Coordinates, sizes, item counts, IDs and connection endpoints are checked. These checks reduce invalid output; they cannot prove that a source supports every AI claim. Follow the sources for important details.

Each visual has one of eight renderer types. React Flow places the visual frames and draws hierarchy/process diagrams; Cytoscape handles networks; ECharts handles numeric charts; MapLibre handles maps. The existing map workspace supplies the detailed country, municipal and ward controls.

## Limits and hosting

The first version allows 12 visuals, 16 commands per answer and four model rounds. Large questions should be explored in follow-ups. Diagrams use simple automatic placement. A complete drawing editor, arbitrary uploaded datasets, automatic new official boundary imports, and a native WebView wrapper are not included yet. No 3D features are needed.

Netlify hosts Next.js; run FastAPI on a separate Python-capable host. Set `AI_SERVICE_URL` on Netlify and the same private `AI_SERVICE_TOKEN` on both services. Put the OpenAI key and model on FastAPI. Configure the existing shared rate limiter before enabling hosted paid AI. CORS alone does not authorize the teaching endpoint. Local testing does not publish or deploy the site.

## Verification

`npm.cmd test` checks canvas behavior and the Next proxy. `npm.cmd run test:api` checks FastAPI with simulated provider responses. `npm.cmd run test:teaching` checks the browser without paid AI calls. Build with `npm.cmd run build:verify` for an isolated preview. Real provider checks are separate and use the configured account's API allowance.
