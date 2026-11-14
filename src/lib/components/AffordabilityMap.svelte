<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import * as d3 from 'd3';
	import { feature } from 'topojson-client';
	import worldTopologyJson from 'world-atlas/countries-110m.json';
	import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
	import type { GeometryCollection, Topology } from 'topojson-specification';
	import { bigMacsPerDay, change, colourValue, type AffordabilityRow } from '$lib/affordability';

	type Entity = {
		code: string;
		name: string;
		region: string;
		start: AffordabilityRow | undefined;
		end: AffordabilityRow | undefined;
		hasData: boolean;
	};

	type MapCountry = Entity & {
		feature: Feature<Geometry, GeoJsonProperties>;
		isEuroMember: boolean;
	};

	type MapMarker = Entity & {
		coordinates: [number, number];
		labelDx: number;
		labelDy: number;
		anchor: 'start' | 'end';
	};

	type TooltipDetails = {
		name: string;
		price?: string;
		gdp?: string;
		bigMacs?: string;
		change?: string;
		note?: string;
		label: string;
	};

	const width = 720;
	const mapHeight = 352;
	const neutral = '#e6e3dc';
	const euroMembers = new Set([
		'040', '056', '100', '191', '196', '233', '246', '250', '276', '300', '372', '380',
		'428', '440', '442', '470', '528', '620', '703', '705', '724'
	]);
	const markerSpecs = [
		{ code: '', name: 'Euro area', coordinates: [10, 50.5] as [number, number], labelDx: 9, labelDy: -8, anchor: 'start' as const },
		{ code: '344', name: 'Hong Kong', coordinates: [114.17, 22.32] as [number, number], labelDx: -9, labelDy: -9, anchor: 'end' as const },
		{ code: '702', name: 'Singapore', coordinates: [103.82, 1.35] as [number, number], labelDx: 9, labelDy: 13, anchor: 'start' as const }
	];
	const years = d3.range(2000, 2027);
	const formatter = d3.format(',.2f');
	const oneDecimal = d3.format('.1f');
	const percent = d3.format('+.1%');
	const colorScale = d3.scaleDiverging(d3.interpolatePiYG).domain([-1, 0, 1]).clamp(true);
	const topology = worldTopologyJson as unknown as Topology;
	const countryCollection = topology.objects.countries as GeometryCollection;
	const featureCollection = feature(topology, countryCollection) as FeatureCollection<Geometry, GeoJsonProperties>;
	const countryFeatures = featureCollection.features.filter(
		(country) => String(country.id).padStart(3, '0') !== '010'
	) as Feature<Geometry, GeoJsonProperties>[];
	const projection = d3.geoNaturalEarth1().fitExtent(
		[[12, 10], [width - 12, mapHeight - 16]],
		{ type: 'FeatureCollection', features: countryFeatures }
	);
	const geoPath = d3.geoPath(projection);

	let rows = $state<AffordabilityRow[]>([]);
	let loading = $state(true);
	let loadError = $state(false);
	let startYear = $state(2004);
	let endYear = $state(2026);
	let stage = $state<HTMLDivElement>();
	let tip = $state<{ x: number; y: number; flipX: boolean; flipY: boolean; details: TooltipDetails } | null>(null);

	onMount(async () => {
		try {
			const typedRows = (await d3.csv(base + '/data/bigmac_clean.csv', d3.autoType)) as unknown as Array<
				Omit<AffordabilityRow, 'iso_numeric'> & { iso_numeric: string | number | null }
			>;
			rows = typedRows
				.map((row) => ({
					...row,
					// autoType converts leading-zero ISO numerics to numbers; restore the three-digit strings.
					iso_numeric:
						row.iso_numeric === null || row.iso_numeric === ''
							? ''
							: String(row.iso_numeric).padStart(3, '0')
				}))
				.filter(
					(row) =>
						row.name &&
						Number.isFinite(row.date) &&
						Number.isFinite(row.local_price) &&
						row.local_price > 0 &&
						Number.isFinite(row.GDP_local) &&
						row.GDP_local > 0
				);
		} catch {
			loadError = true;
		} finally {
			loading = false;
		}
	});

	let validRange = $derived(startYear < endYear);
	let rowsByCode = $derived(d3.group(rows, (row) => row.iso_numeric));

	function entityFor(code: string, fallbackName = ''): Entity {
		const matches = rowsByCode.get(code) ?? [];
		const sample = matches[0];
		return {
			code,
			name: sample?.name ?? fallbackName,
			region: sample?.region ?? '',
			start: matches.find((row) => row.date === startYear),
			end: matches.find((row) => row.date === endYear),
			hasData: matches.length > 0
		};
	}

	let mapCountries = $derived(
		countryFeatures.map((country, index) => {
			const code = country.id == null ? `shape-${index}` : String(country.id).padStart(3, '0');
			const fallbackName = String(country.properties?.name ?? '');
			return {
				...entityFor(code, fallbackName),
				feature: country,
				isEuroMember: euroMembers.has(code)
			} satisfies MapCountry;
		})
	);

	let markers = $derived(
		markerSpecs.map((marker) => ({ ...entityFor(marker.code, marker.name), ...marker }))
	);

	function entityColor(entity: Entity): string {
		if (!validRange || !entity.start || !entity.end) return neutral;
		return colorScale(colourValue(bigMacsPerDay(entity.start), bigMacsPerDay(entity.end)));
	}

	function missing(year: number) {
		return `No data for ${year}`;
	}

	function valueAt<T>(row: AffordabilityRow | undefined, year: number, value: (row: AffordabilityRow) => T, format: (value: T) => string) {
		return row ? format(value(row)) : missing(year);
	}

	function percentChange(entity: Entity): number | undefined {
		if (!entity.start || !entity.end) return undefined;
		return change(bigMacsPerDay(entity.start), bigMacsPerDay(entity.end)) - 1;
	}

	function changeText(entity: Entity): string {
		const delta = percentChange(entity);
		if (!validRange) return 'Choose an end year after the start year.';
		if (delta === undefined) return missing(entity.start ? endYear : startYear);
		if (delta === 0) return '0.0% no change';
		return `${percent(delta)} ${delta >= 0 ? 'easier' : 'harder'}`;
	}

	function tooltipDetails(entity: Entity): TooltipDetails {
		const currency = entity.start?.currency_code ?? entity.end?.currency_code ?? '';
		const currencyLabel = currency ? ` (${currency})` : '';
		const yearRange = `${startYear} → ${endYear}`;
		const price = `${yearRange}: ${valueAt(entity.start, startYear, (row) => row.local_price, formatter)} → ${valueAt(entity.end, endYear, (row) => row.local_price, formatter)}${currencyLabel}`;
		const gdp = `${yearRange}: ${valueAt(entity.start, startYear, (row) => row.GDP_local / 365, formatter)} → ${valueAt(entity.end, endYear, (row) => row.GDP_local / 365, formatter)}${currencyLabel}`;
		const bigMacs = `${yearRange}: ${valueAt(entity.start, startYear, bigMacsPerDay, oneDecimal)} → ${valueAt(entity.end, endYear, bigMacsPerDay, oneDecimal)}`;
		const details = {
			name: entity.name,
			price,
			gdp,
			bigMacs,
			change: changeText(entity),
			label: `${entity.name}. Big Mac local price: ${price}. GDP per capita per day: ${gdp}. Big Macs per day: ${bigMacs}. Change: ${changeText(entity)}.`
		};
		return details;
	}

	function entityLabel(entity: Entity): string {
		return tooltipDetails(entity).label;
	}

	function placeTip(x: number, y: number, entity: Entity) {
		if (!stage) return;
		tip = {
			x,
			y,
			flipX: x > stage.clientWidth * 0.56,
			flipY: y > stage.clientHeight * 0.64,
			details: tooltipDetails(entity)
		};
	}

	function showPointerTip(event: PointerEvent, entity: Entity) {
		if (!stage) return;
		const [x, y] = d3.pointer(event, stage);
		placeTip(x, y, entity);
	}

	function showFocusTip(event: FocusEvent, entity: Entity) {
		const target = event.currentTarget as SVGElement;
		if (!stage || !target.matches(':focus-visible')) return;
		const targetBox = target.getBoundingClientRect();
		const stageBox = stage.getBoundingClientRect();
		placeTip(targetBox.left + targetBox.width / 2 - stageBox.left, targetBox.top + targetBox.height / 2 - stageBox.top, entity);
	}

	function showMemberTip(event: PointerEvent | FocusEvent, name: string) {
		const message = 'Part of the Euro area. See the Euro area marker.';
		const target = event.currentTarget as SVGElement;
		const details: TooltipDetails = { name, note: message, label: `${name}. ${message}` };
		if (event instanceof PointerEvent && stage) {
			const [x, y] = d3.pointer(event, stage);
			tip = {
				x,
				y,
				flipX: x > stage.clientWidth * 0.56,
				flipY: y > stage.clientHeight * 0.64,
				details
			};
		} else if (stage && target.matches(':focus-visible')) {
			const targetBox = target.getBoundingClientRect();
			const stageBox = stage.getBoundingClientRect();
			const x = targetBox.left + targetBox.width / 2 - stageBox.left;
			const y = targetBox.top + targetBox.height / 2 - stageBox.top;
			tip = {
				x,
				y,
				flipX: x > stage.clientWidth * 0.56,
				flipY: y > stage.clientHeight * 0.64,
				details
			};
		}
	}

	function hideTip() {
		tip = null;
	}

	let tableRows = $derived(
		[...rowsByCode.entries()]
			.map(([code, matches]) => entityFor(code, matches[0]?.name ?? ''))
			.sort((a, b) => {
				const aChange = percentChange(a);
				const bChange = percentChange(b);
				if (aChange === undefined) return bChange === undefined ? a.name.localeCompare(b.name) : 1;
				if (bChange === undefined) return -1;
				return bChange - aChange || a.name.localeCompare(b.name);
			})
	);
</script>

<figure class="affordability-frame" aria-labelledby="affordability-chart-title">
	<div class="map-head">
		<div>
			<p class="map-overline">AFFORDABILITY · BIG MACS PER DAY</p>
			<h3 id="affordability-chart-title">How many Big Macs a day of GDP per capita buys</h3>
		</div>
		<div class="map-controls" role="group" aria-label="Choose map years">
			<div class="map-control">
				<label for="affordability-start">Start year</label>
				<select id="affordability-start" bind:value={startYear}>
					{#each years as year}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>
			<div class="map-control">
				<label for="affordability-end">End year</label>
				<select id="affordability-end" bind:value={endYear}>
					{#each years as year}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<div class="map-stage" bind:this={stage}>
		<svg
			viewBox="0 0 {width} {mapHeight}"
			class="world-map"
			aria-labelledby="affordability-map-title affordability-map-description"
		>
			<title id="affordability-map-title">Change in Big Macs affordable per day from {startYear} to {endYear}</title>
			<desc id="affordability-map-description">
				Countries are colored by the change in Big Macs that a day of local GDP per capita can buy. Green means easier to afford; pink means harder. Grey marks missing data. Focus or hover a country for details.
			</desc>
			<defs>
				<pattern id="euro-member-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<rect width="7" height="7" fill={neutral} />
					<path d="M0 0V7" stroke="#b4ad9f" stroke-opacity=".7" stroke-width="2" />
				</pattern>
			</defs>
			<g class="country-layer">
				{#each mapCountries as country (country.code)}
					{@const focusable = country.hasData || country.isEuroMember}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<path
						class="country-shape"
						data-country={country.name}
						class:interactive={focusable}
						d={geoPath(country.feature) ?? ''}
						fill={country.isEuroMember ? 'url(#euro-member-hatch)' : entityColor(country)}
						stroke={country.hasData || country.isEuroMember ? '#a9a59b' : '#d3d0c8'}
						stroke-width={country.hasData || country.isEuroMember ? 0.65 : 0.5}
						role={focusable ? 'img' : undefined}
						tabindex={focusable ? 0 : -1}
						aria-label={country.isEuroMember ? 'Part of the Euro area. See the Euro area marker.' : focusable ? entityLabel(country) : undefined}
						onpointerenter={focusable ? (event) => (country.isEuroMember ? showMemberTip(event, country.name) : showPointerTip(event, country)) : undefined}
						onpointermove={focusable ? (event) => (country.isEuroMember ? showMemberTip(event, country.name) : showPointerTip(event, country)) : undefined}
						onpointerleave={focusable ? hideTip : undefined}
						onfocus={focusable ? (event) => (country.isEuroMember ? showMemberTip(event, country.name) : showFocusTip(event, country)) : undefined}
						onblur={focusable ? hideTip : undefined}
					/>
				{/each}
			</g>
			<g class="marker-layer">
				{#each markers as marker (marker.code || marker.name)}
					{@const point = projection(marker.coordinates)}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<g
						class="map-marker"
						class:interactive={true}
						transform="translate({point?.[0] ?? 0},{point?.[1] ?? 0})"
						role="img"
						tabindex="0"
						aria-label={entityLabel(marker)}
						onpointerenter={(event) => showPointerTip(event, marker)}
						onpointermove={(event) => showPointerTip(event, marker)}
						onpointerleave={hideTip}
						onfocus={(event) => showFocusTip(event, marker)}
						onblur={hideTip}
					>
						<circle r="6" fill={entityColor(marker)} stroke="#fffdf8" stroke-width="1.5" />
						<text x={marker.labelDx} y={marker.labelDy} text-anchor={marker.anchor}>{marker.name}</text>
					</g>
				{/each}
			</g>
		</svg>
		{#if tip}
			<div
				class="map-tooltip"
				class:flip-x={tip.flipX}
				class:flip-y={tip.flipY}
				style:left="{tip.x}px"
				style:top="{tip.y}px"
				role="tooltip"
			>
				<strong>{tip.details.name}</strong>
				{#if tip.details.note}
					<p>{tip.details.note}</p>
				{:else}
					<p><b>Big Mac local price:</b> {tip.details.price}</p>
					<p><b>GDP per capita per day:</b> {tip.details.gdp}</p>
					<p><b>Big Macs per day:</b> {tip.details.bigMacs}</p>
					<p><b>Change:</b> {tip.details.change}</p>
				{/if}
			</div>
		{/if}
	</div>

	{#if loading}
		<p class="map-message" role="status">Loading affordability data…</p>
	{:else if loadError}
		<p class="map-message" role="status">Could not load the affordability data.</p>
	{:else if !validRange}
		<p class="map-message" role="status">Choose a start year earlier than the end year to compare affordability.</p>
	{/if}

	<div class="map-legend" aria-label="Map legend">
		<div class="legend-scale" style="--harder: {colorScale(-1)}; --unchanged: {colorScale(0)}; --easier: {colorScale(1)}">
			<div class="legend-heading"><span>Harder to afford</span><span>Easier to afford</span></div>
			<div class="legend-bar" aria-hidden="true"></div>
			<div class="legend-ticks"><span>÷2 or less</span><span>No change</span><span>×2 or more</span></div>
		</div>
		<p class="marker-legend"><span aria-hidden="true">●</span> Value with no country shape on this map</p>
	</div>

	<div class="map-foot">
		<p>Affordability = how many Big Macs one day of GDP per capita buys (GDP per capita ÷ 365 ÷ local Big Mac price). GDP per capita is an average, not a wage.</p>
		<p>Choose start and end years. Hover or focus a country for details. Grey means no data.</p>
		<p class="map-interpretation">
			In the default 2004 → 2026 view, 26 of 37 places got easier to afford and 11 got harder. China rose from 2.8 to 10.5 Big Macs per day (×3.7). Japan fell the most, from 43.4 to 30.1 (−31%); Britain fell −28% and Mexico −27%. The Euro area changed from 25.0 to 20.0; the United States from 43.7 to 40.0.
		</p>
	</div>

	<details class="map-table">
		<summary>View affordability values as a table</summary>
		<div class="table-scroll">
			<table aria-label="Big Macs per day by country from {startYear} to {endYear}">
				<thead>
					<tr>
						<th scope="col">Country</th>
						<th scope="col">Big Macs per day ({startYear})</th>
						<th scope="col">Big Macs per day ({endYear})</th>
						<th scope="col">Change</th>
						<th scope="col">Region</th>
					</tr>
				</thead>
				<tbody>
					{#each tableRows as entity (entity.code || entity.name)}
						<tr>
							<th scope="row">{entity.name}</th>
							<td>{valueAt(entity.start, startYear, bigMacsPerDay, oneDecimal)}</td>
							<td>{valueAt(entity.end, endYear, bigMacsPerDay, oneDecimal)}</td>
							<td>{changeText(entity)}</td>
							<td>{entity.region}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
</figure>

<style>
	.affordability-frame {
		--paper: #fffdf8;
		--rule: #efe9dc;
		position: relative;
		z-index: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		min-width: 0;
		margin: 0;
		padding: 12px;
		border-radius: 18px;
		background-color: #684332;
		background-image:
			radial-gradient(circle at 6px 7px, #9a7253 0 1.3px, transparent 1.8px),
			radial-gradient(circle at 15px 15px, #8b6549 0 1px, transparent 1.7px);
		background-size: 21px 19px;
		box-shadow: 0 7px 0 rgb(80 53 31 / 16%), 0 10px 20px rgb(70 51 30 / 8%);
	}

	.map-head,
	.map-stage,
	.map-legend,
	.map-foot,
	.map-table {
		background: var(--paper);
		border-inline: 1px solid var(--rule);
	}

	.map-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px 16px;
		padding: 20px 22px 12px;
		border-top: 1px solid var(--rule);
		border-bottom: 0;
		border-radius: 10px 10px 0 0;
	}

	.map-overline {
		margin: 0 0 5px;
		color: var(--text-muted);
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		line-height: 1.4;
	}

	.map-head h3 {
		max-width: 30rem;
		margin: 0;
		color: #392b23;
		font-size: 1.05rem;
		line-height: 1.25;
	}

	.map-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.map-control {
		display: grid;
		gap: 5px;
	}

	.map-control label {
		color: var(--text-muted);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	.map-control select {
		min-width: 7rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--control-border);
		border-radius: 8px;
		background-color: var(--paper);
		color: #363d35;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.map-control select:focus-visible,
	.map-table summary:focus-visible {
		outline: 3px solid var(--tomato-contrast);
		outline-offset: 2px;
	}

	.map-stage {
		position: relative;
		min-width: 0;
		padding: 0 10px;
		border-bottom: 0;
	}

	.world-map {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.country-shape {
		vector-effect: non-scaling-stroke;
	}

	.country-shape.interactive,
	.map-marker.interactive {
		cursor: help;
	}

	.country-shape:focus-visible,
	.map-marker:focus-visible circle {
		stroke: #392b23;
		stroke-width: 1.8;
		outline: none;
	}

	.map-marker text {
		fill: #392b23;
		font-size: 10px;
		font-weight: 700;
		paint-order: stroke;
		stroke: #fffdf8;
		stroke-linejoin: round;
		stroke-width: 3px;
		pointer-events: none;
	}

	.map-tooltip {
		position: absolute;
		z-index: 2;
		width: min(18rem, calc(100vw - 3rem));
		padding: 10px 12px;
		transform: translate(10px, 10px);
		border: 1px solid #ded7c9;
		border-radius: 9px;
		background: #fffdf8;
		box-shadow: 0 5px 18px rgb(45 35 22 / 17%);
		color: #49473f;
		font-size: 0.72rem;
		line-height: 1.4;
		pointer-events: none;
	}

	.map-tooltip.flip-x {
		transform: translate(calc(-100% - 10px), 10px);
	}

	.map-tooltip.flip-y {
		margin-top: -10px;
		transform: translate(10px, -100%);
	}

	.map-tooltip.flip-x.flip-y {
		transform: translate(calc(-100% - 10px), -100%);
	}

	.map-tooltip strong {
		display: block;
		margin-bottom: 4px;
		color: #363d35;
		font-size: 0.8rem;
	}

	.map-tooltip p {
		margin: 3px 0 0;
	}

	.map-message {
		margin: 0;
		padding: 2px 22px 10px;
		border-inline: 1px solid var(--rule);
		background: var(--paper);
		color: #8d402d;
		font-size: 0.75rem;
	}

	.map-legend {
		display: grid;
		grid-template-columns: minmax(15rem, 1fr) auto;
		align-items: end;
		gap: 18px;
		padding: 8px 22px 12px;
		border-bottom: 0;
	}

	.legend-scale {
		min-width: 0;
	}

	.legend-heading,
	.legend-ticks {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		color: #55554d;
		font-size: 0.64rem;
	}

	.legend-heading {
		margin-bottom: 3px;
		font-weight: 700;
	}

	.legend-bar {
		height: 10px;
		border: 1px solid rgb(57 43 35 / 16%);
		border-radius: 999px;
		background: linear-gradient(90deg, var(--harder), var(--unchanged), var(--easier));
	}

	.legend-ticks {
		margin-top: 3px;
	}

	.legend-ticks span:nth-child(2) {
		text-align: center;
	}

	.legend-ticks span:last-child {
		text-align: right;
	}

	.marker-legend {
		margin: 0;
		color: #55554d;
		font-size: 0.65rem;
		white-space: nowrap;
	}

	.marker-legend span {
		color: #684332;
		font-size: 0.95rem;
	}

	.map-foot {
		padding: 8px 22px 14px;
		border-bottom: 0;
		color: var(--text-muted);
		font-size: 0.72rem;
		line-height: 1.45;
	}

	.map-foot p {
		max-width: 52rem;
		margin: 0 0 5px;
	}

	.map-foot p:last-child {
		margin-bottom: 0;
	}

	.map-table {
		padding: 0 22px 14px;
		border-bottom: 1px solid var(--rule);
		border-radius: 0 0 10px 10px;
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.map-table summary {
		padding: 4px 0 8px;
		color: #363d35;
		font-weight: 700;
		text-align: center;
		list-style-position: inside;
		cursor: pointer;
	}

	.table-scroll {
		max-height: 18rem;
		overflow: auto;
	}

	.map-table table {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}

	.map-table th,
	.map-table td {
		padding: 6px 10px;
		border-bottom: 1px solid var(--rule);
		text-align: center;
		white-space: nowrap;
	}

	.map-table thead th {
		position: sticky;
		top: 0;
		background: var(--paper);
		color: #363d35;
	}

	.map-table thead th:first-child,
	.map-table tbody th {
		color: #363d35;
		text-align: left;
	}

	@media (max-width: 580px) {
		.map-head {
			padding-inline: 14px;
		}

		.map-controls {
			width: 100%;
		}

		.map-control {
			flex: 1;
		}

		.map-control select {
			min-width: 0;
			width: 100%;
		}

		.map-legend {
			grid-template-columns: 1fr;
			gap: 8px;
			padding-inline: 14px;
		}

		.marker-legend {
			white-space: normal;
		}

		.map-foot,
		.map-table {
			padding-inline: 14px;
		}
	}
</style>
