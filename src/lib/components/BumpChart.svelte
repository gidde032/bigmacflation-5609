<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import * as d3 from 'd3';
	import type { Row, Point, Series } from '$lib/bumpData';
	import { addDollarPrice, filterByRegion, rankByYear, toSeries } from '$lib/bumpData';

	const width = 720;
	const margin = { top: 34, right: 104, bottom: 14, left: 104 };
	const innerWidth = width - margin.left - margin.right;
	const rowHeight = 19;
	const minRows = 8;
	const fullRanks = 38;
	const greyLine = '#a29d90';
	const highlightColors = [
		'#2a78d6',
		'#eb6834',
		'#1baf7a',
		'#eda100',
		'#e87ba4',
		'#008300',
		'#6250d6',
		'#e34948'
	];

	let rows = $state<Row[]>([]);
	let selectedRegion = $state('All');
	let highlighted = $state(new Set<string>());

	onMount(async () => {
		try {
			rows = (await d3.csv(base + '/data/bigmac_clean.csv', d3.autoType)) as unknown as Row[];
		} catch (error) {
			console.error('Could not load bigmac_clean.csv', error);
		}
	});

	let ranked = $derived(rankByYear(filterByRegion(addDollarPrice(rows), selectedRegion)));

	let series = $derived(toSeries(ranked));

	let rowIndex = $derived(d3.index(ranked, (r) => r.name, (r) => r.date));

	let countByYear = $derived(d3.rollup(ranked, (v) => v.length, (r) => r.date));

	let regions = $derived(['All', ...[...new Set(rows.map((r) => r.region))].sort()]);

	let points = $derived(series.flatMap((s) => s.points));

	let x_scale = $derived.by(() => { 
		const [firstYear = 2000, lastYear = 2026] = d3.extent(points, (p) => p.year);
		return d3.scaleLinear([firstYear, lastYear], [0, innerWidth]);
	});

	let maxRank = $derived(d3.max(points, (p) => p.rank) ?? fullRanks);

	let innerHeight = $derived((Math.max(maxRank, minRows) - 1) * rowHeight);

	let height = $derived(margin.top + innerHeight + margin.bottom);

	let y_scale = $derived(d3.scaleLinear([1, Math.max(maxRank, 2)], [0, innerHeight]));

	let years = $derived.by(() => {
		const [start, end] = x_scale.domain();
		return d3.range(start, end + 1);
	});

	let line = $derived(
		d3
			.line<Point>()
			.x((p) => x_scale(p.year))
			.y((p) => y_scale(p.rank))
			.curve(d3.curveBumpX)
	);

	const colorSlot = new Map<string, number>();

	let colorFull = $derived(highlighted.size >= highlightColors.length);

	function toggle(name: string) {
		const next = new Set(highlighted);
		if (next.has(name)) {
			next.delete(name);
			colorSlot.delete(name);
		} else {
			if (next.size >= highlightColors.length) return;
			const taken = new Set(colorSlot.values());
			colorSlot.set(
				name,
				highlightColors.findIndex((_, i) => !taken.has(i))
			);
			next.add(name);
		}
		highlighted = next;
	}

	async function toggleByKey(e: KeyboardEvent, name: string) {
		if (e.key === 'Escape') {
			tip = null;
			return;
		}
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		const el = e.currentTarget as SVGElement; 
		toggle(name);
		await tick();
		el.focus();
	}

	function colorOf(name: string) {
		return highlighted.has(name) ? highlightColors[colorSlot.get(name) ?? 0] : greyLine;
	}

	let ordered = $derived(
		[...series].sort((a, b) => Number(highlighted.has(a.name)) - Number(highlighted.has(b.name)))
	);

	let stage = $state<HTMLDivElement>();

	let tip = $state<{ x: number; y: number; name: string; flipX: boolean; flipY: boolean } | null>(null);

	function showTip(e: PointerEvent, name: string) {
		if (!stage) return;
		const [x, y] = d3.pointer(e, stage); 
		placeTip(x, y, name);
	}

	function placeTip(x: number, y: number, name: string) {
		if (!stage) return;
		tip = {
			x,
			y,
			name,
			flipX: x > stage.clientWidth * 0.55,
			flipY: y > stage.clientHeight * 0.6
		};
	}

	function showTipOnFocus(e: FocusEvent, name: string) {
		const el = e.currentTarget as SVGGElement;
		const path = el.querySelector('path');
		if (!stage || !path || !el.matches(':focus-visible')) return;
		const end = path.getPointAtLength(path.getTotalLength());
		const screen = new DOMPoint(end.x, end.y).matrixTransform(path.getScreenCTM() ?? undefined);
		const box = stage.getBoundingClientRect();
		placeTip(screen.x - box.left, screen.y - box.top, name);
	}

	function hideTip(name: string) {
		if (tip?.name === name) tip = null;
	}

	let hoveredName = $derived(tip?.name ?? null);

	let hoverSeries = $derived(
		hoveredName && !highlighted.has(hoveredName)
			? series.find((s) => s.name === hoveredName)
			: undefined
	);

	const handlersFor = (name: string) => ({
		onclick: () => toggle(name),
		onpointerenter: (e: PointerEvent) => showTip(e, name),
		onpointermove: (e: PointerEvent) => showTip(e, name),
		onpointerleave: () => (tip = null)
	});

	const money = d3.format('$.2f');
	const localFmt = d3.format(',.2f');

	function changeText(change: number, since: number) {
		if (change === 0) return `No change since ${since}`;
		const n = Math.abs(change);
		return `${change > 0 ? 'Up' : 'Down'} ${n} ${n === 1 ? 'place' : 'places'} since ${since}`;
	}

	function describe(s: Series) {
		const first = s.points[0];
		const last = s.points[s.points.length - 1]; 
		const row = rowIndex.get(s.name)?.get(last.year);
		if (!row) return null;
		return {
			name: s.name,
			rank: last.rank,
			total: countByYear.get(last.year) ?? 0,
			year: last.year,
			price: row.dollar_price,
			change: first.rank - last.rank,
			since: first.year,
			local: row.local_price,
			currency: row.currency_code,
			region: row.region
		};
	}

	let tipInfo = $derived.by(() => {
		const s = series.find((d) => d.name === hoveredName);
		return s ? describe(s) : null;
	});

	let tableRows = $derived(
		series.flatMap((s) => describe(s) ?? []).sort((a, b) => b.year - a.year || a.rank - b.rank)
	);
</script>

<figure class="bump-frame" aria-labelledby="bump-chart-title">
	<figcaption class="bump-head">
		<div class="bump-titles">
			<p class="bump-overline">PRICE RANKINGS · 2000–2026</p>
			<h3 id="bump-chart-title">Where each Big Mac ranks, year by year</h3>
		</div>

		<div class="bump-control">
			<label for="bump-region">Region</label>
			
			<select id="bump-region" bind:value={selectedRegion} onchange={() => (tip = null)}>
				{#each regions as region (region)}
					<option value={region}>{region}</option>
				{/each}
			</select>
		</div>
	</figcaption>

	<div class="bump-stage" bind:this={stage}>
		<div class="bump-scroll">
			<div class="bump-plot">
				<svg
					viewBox="0 0 {width} {height}"
					role="group"
					aria-label="Bump chart of Big Mac price rank by year, 1 is most expensive"
				>
					<g transform="translate({margin.left},{margin.top})">
						<g class="grid" aria-hidden="true">
							{#each years as year (year)}
								<line x1={x_scale(year)} x2={x_scale(year)} y1={-8} y2={innerHeight + 8} />
								{#if year % 2 === 0}
									<text class="year-label" x={x_scale(year)} y={-16} text-anchor="middle">{year}</text>
								{/if}
							{/each}
						</g>

						{#each ordered as s (s.name)}
							{@const d = line(s.points) ?? ''}
							{@const first = s.points[0]}
							{@const last = s.points[s.points.length - 1]}
							{@const on = highlighted.has(s.name)}
							{@const info = describe(s)}
							<g
								class="country"
								class:on
								role="button"
								tabindex="0"
								aria-pressed={on}
								aria-label={info
									? `${s.name}, rank ${info.rank} of ${info.total} in ${info.year}`
									: s.name}
								aria-describedby={hoveredName === s.name ? 'bump-tooltip' : undefined}
								{...handlersFor(s.name)}
								onkeydown={(e) => toggleByKey(e, s.name)}
								onfocus={(e) => showTipOnFocus(e, s.name)}
								onblur={() => hideTip(s.name)}
							>
								<path class="hit" {d} />
								{#if on}
									<path class="casing" {d} />
									<path class="line" {d} stroke={colorOf(s.name)} />
									<circle
										class="dot"
										cx={x_scale(first.year)}
										cy={y_scale(first.rank)}
										r="4.5"
										fill={colorOf(s.name)}
									/>
									<circle
										class="dot"
										cx={x_scale(last.year)}
										cy={y_scale(last.rank)}
										r="4.5"
										fill={colorOf(s.name)}
									/>
								{:else}
									<path class="line" {d} stroke={greyLine} />
									{#if first.year > x_scale.domain()[0]}
										<circle
											class="dot"
											cx={x_scale(first.year)}
											cy={y_scale(first.rank)}
											r="3.5"
											fill={greyLine}
										/>
									{/if}
								{/if}
							</g>
						{/each}

						{#if hoverSeries}
							<path class="hover-line" d={line(hoverSeries.points) ?? ''} />
						{/if}

						<g class="labels" aria-hidden="true">
							{#each ordered as s (s.name)}
								{@const first = s.points[0]}
								{@const last = s.points[s.points.length - 1]}
								{@const lateStart = first.year > x_scale.domain()[0]}
								{@const strong = highlighted.has(s.name) || hoveredName === s.name}
								{#if !lateStart || strong}
									<text
										class="label"
										class:strong
										{...handlersFor(s.name)}
										x={x_scale(first.year) - (lateStart ? 8 : 13)}
										y={y_scale(first.rank)}
										dy="0.35em"
										text-anchor="end">{s.name}</text
									>
								{/if}
								<text
									class="label"
									class:strong
									{...handlersFor(s.name)}
									x={x_scale(last.year) + 8}
									y={y_scale(last.rank)}
									dy="0.35em"
									text-anchor="start">{s.name}</text
								>
							{/each}
						</g>
					</g>
				</svg>
			</div>
		</div>

		{#if tip && tipInfo}
			<div
				class="tooltip"
				id="bump-tooltip"
				role="tooltip"
				class:flip-x={tip.flipX}
				class:flip-y={tip.flipY}
				style:left="{tip.x}px"
				style:top="{tip.y}px"
			>
				<p class="tip-name">
					<span class="tip-key" style:background={colorOf(tipInfo.name)}></span>
					{tipInfo.name}
				</p>
				<p class="tip-rank">
					<strong>Rank {tipInfo.rank} of {tipInfo.total}</strong>
					· {money(tipInfo.price)} ({tipInfo.year})
				</p>
				<p>{changeText(tipInfo.change, tipInfo.since)}</p>
				<p>{localFmt(tipInfo.local)} {tipInfo.currency}</p>
				<p class="tip-region">{tipInfo.region}</p>
			</div>
		{/if}
	</div>

	<div class="bump-foot">
		<p>
			Ranked by US-dollar price (local price ÷ exchange rate); 1 is the most expensive. Click a line
			or its name to highlight it. A dot marks a country that enters the dataset after 2000.
			{#if colorFull}
				All {highlightColors.length} highlight colors are in use. Click a highlighted line to free one.
			{/if}
		</p>
	</div>

	<details class="bump-table">
		<summary>View the latest ranks as a table</summary>
		<div class="table-scroll">
			<table
				aria-label="Latest Big Mac price rank per country, {selectedRegion === 'All'
					? 'all regions'
					: selectedRegion}"
			>
				<thead>
					<tr>
						<th scope="col">Rank</th>
						<th scope="col">Country</th>
						<th scope="col">Year</th>
						<th scope="col">US$ price</th>
						<th scope="col">Local price</th>
						<th scope="col">Rank change</th>
						<th scope="col">Region</th>
					</tr>
				</thead>
				<tbody>
					{#each tableRows as r (r.name)}
						<tr>
							<td>{r.rank}</td>
							<th scope="row">{r.name}</th>
							<td>{r.year}</td>
							<td>{money(r.price)}</td>
							<td>{localFmt(r.local)} {r.currency}</td>
							<td>{changeText(r.change, r.since)}</td>
							<td>{r.region}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
</figure>

<style>
	.bump-frame {
		--paper: #fffdf8;
		--rule: #efe9dc;
		--grey-hover: #5f5b51;
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

	.bump-head,
	.bump-scroll,
	.bump-foot,
	.bump-table {
		background: var(--paper);
		border: 1px solid var(--rule);
	}

	.bump-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px 16px;
		padding: 20px 22px 12px;
		border-bottom: 0;
		border-radius: 10px 10px 0 0;
	}

	.bump-overline {
		margin: 0 0 5px;
		color: var(--text-muted);
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		line-height: 1.4;
	}

	.bump-head h3 {
		margin: 0;
		color: #392b23;
		font-size: 1.05rem;
		line-height: 1.25;
	}

	.bump-control {
		display: grid;
		gap: 5px;
	}

	.bump-control label {
		color: var(--text-muted);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	.bump-control select {
		min-width: 11rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--control-border);
		border-radius: 8px;
		background-color: var(--paper);
		color: #363d35;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.bump-control select:focus-visible {
		outline: 3px solid var(--tomato-contrast);
		outline-offset: 2px;
	}

	.bump-stage {
		position: relative;
		min-width: 0;
	}

	.bump-scroll {
		overflow-x: auto;
		border-top: 0;
		border-bottom: 0;
	}

	.bump-plot {
		min-width: 540px;
		padding: 0 12px;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.grid line {
		stroke: var(--chart-grid);
		stroke-width: 1;
	}

	.year-label {
		fill: var(--text-muted);
		font-size: 10.5px;
		font-variant-numeric: tabular-nums;
	}

	.country {
		cursor: pointer;
		outline: none;
	}

	.hit {
		fill: none;
		stroke: transparent;
		stroke-width: 12;
		stroke-linecap: round;
		pointer-events: stroke;
	}

	.country:focus-visible .hit {
		stroke: #392b23;
		stroke-opacity: 0.18;
	}

	.line {
		fill: none;
		stroke-width: 1.6;
		stroke-linecap: round;
		pointer-events: none;
		transition: stroke 0.15s;
	}

	.country.on .line {
		stroke-width: 3.6;
	}

	.casing {
		fill: none;
		stroke: var(--paper);
		stroke-width: 7;
		stroke-linecap: round;
		pointer-events: none;
	}

	.dot {
		stroke: var(--paper);
		stroke-width: 2;
		pointer-events: none;
	}

	.hover-line {
		fill: none;
		stroke: var(--grey-hover);
		stroke-width: 2.6;
		stroke-linecap: round;
		pointer-events: none;
	}

	.label {
		fill: var(--text-muted);
		font-size: 11.5px;
		cursor: pointer;
		paint-order: stroke;
		stroke: var(--paper);
		stroke-width: 3px;
		stroke-linejoin: round;
	}

	.label.strong {
		fill: var(--ink);
		font-weight: 700;
	}

	.tooltip {
		position: absolute;
		z-index: 2;
		width: max-content;
		max-width: 15rem;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		box-shadow: 0 6px 18px rgb(57 43 35 / 18%);
		color: var(--ink);
		font-size: 0.74rem;
		line-height: 1.45;
		pointer-events: none;
		transform: translate(14px, 14px); 
	}

	.tooltip.flip-x {
		transform: translate(calc(-100% - 14px), 14px);
	}

	.tooltip.flip-y {
		transform: translate(14px, calc(-100% - 14px));
	}

	.tooltip.flip-x.flip-y {
		transform: translate(calc(-100% - 14px), calc(-100% - 14px));
	}

	.tooltip p {
		margin: 0;
	}

	.tip-name {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 3px !important;
		font-size: 0.82rem;
		font-weight: 800;
	}

	.tip-key {
		flex: 0 0 auto;
		width: 14px;
		height: 3px;
		border-radius: 2px;
	}

	.tip-rank strong {
		font-size: 0.8rem;
	}

	.tip-region {
		margin-top: 3px !important;
		color: var(--text-muted);
	}

	.bump-foot {
		padding: 8px 22px 14px;
		border-top: 0;
		color: var(--text-muted);
		font-size: 0.72rem;
		line-height: 1.45;
	}

	.bump-foot p {
		max-width: 40rem;
		margin: 0;
	}

	.bump-table {
		padding: 0 22px 14px;
		border-top: 0;
		border-radius: 0 0 10px 10px;
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.bump-table summary {
		padding: 4px 0 8px;
		color: #363d35;
		font-weight: 700;
		text-align: center;
		list-style-position: inside;
		cursor: pointer;
	}

	.bump-table summary:focus-visible {
		outline: 3px solid var(--tomato-contrast);
		outline-offset: 2px;
	}

	.table-scroll {
		max-height: 18rem;
		overflow: auto;
	}

	.bump-table table {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}

	.bump-table th,
	.bump-table td {
		padding: 6px 10px;
		border-bottom: 1px solid var(--rule);
		text-align: center;
		white-space: nowrap;
	}

	.bump-table thead th {
		position: sticky;
		top: 0;
		background: var(--paper);
		color: #363d35;
	}

	.bump-table thead th:nth-child(2),
	.bump-table tbody th {
		color: #363d35;
		text-align: left;
	}

	@media (max-width: 650px) {
		.bump-frame {
			padding: 8px;
			border-radius: 15px;
		}

		.bump-head {
			padding: 14px 12px 10px;
		}

		.bump-plot {
			padding: 0 6px;
		}

		.bump-foot {
			padding: 8px 12px 12px;
		}

		.bump-table {
			padding: 0 12px 12px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.line {
			transition: none;
		}
	}
</style>
