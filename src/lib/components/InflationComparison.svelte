<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import * as d3 from 'd3';

	type MergedCsvRow = {
		country: string;
		iso_a3: string;
		region: string;
		year: number;
		local_price: number;
		currency_code: string;
		cpi_index: number;
	};

	type BigMacCsvRow = {
		name: string;
		iso_a3: string;
		region: string;
		local_price: number;
		date: number;
	};

	type Entry = {
		country: string;
		region: string;
		year: number;
		price: number;
		cpi: number;
	};

	type PriceEntry = {
		country: string;
		region: string;
		year: number;
	};

	type Result = {
		country: string;
		bigMacChange: number;
		inflationChange: number;
		realChange: number;
	};

	type TrendPoint = {
		year: number;
		bigMac: number;
		cpi: number;
	};

	type OmissionGroup = {
		countries: string[];
		reason: string;
	};

	let data = $state<Entry[]>([]);
	let prices = $state<PriceEntry[]>([]);
	let loading = $state(true);
	let error = $state('');

	let startYear = $state(2004);
	let endYear = $state(2024);
	let region = $state('All');
	let selectedCountry = $state('');

	onMount(async () => {
		try {
			const [mergedRows, priceRows] = await Promise.all([
				d3.csv(base + '/data/bigmac_cpi_merged.csv', d3.autoType),
				d3.csv(base + '/data/bigmac_clean.csv', d3.autoType)
			]);

			data = (mergedRows as unknown as MergedCsvRow[])
				.filter(
					(row) =>
						row.country &&
						Number.isFinite(row.year) &&
						Number.isFinite(row.local_price) &&
						row.local_price > 0 &&
						Number.isFinite(row.cpi_index) &&
						row.cpi_index > 0
				)
				.map((row) => ({
					country: row.country,
					region: row.region,
					year: row.year,
					price: row.local_price,
					cpi: row.cpi_index
				}));

			prices = (priceRows as unknown as BigMacCsvRow[])
				.filter(
					(row) =>
						row.name &&
						Number.isFinite(row.date) &&
						Number.isFinite(row.local_price) &&
						row.local_price > 0
				)
				.map((row) => ({
					country: row.name,
					region: row.region,
					year: row.date
				}));
		} catch {
			error = 'Could not load the inflation data.';
		} finally {
			loading = false;
		}
	});

	let years = $derived([...new Set(data.map((row) => row.year))].sort((a, b) => a - b));

	let regions = $derived([
		'All',
		...[...new Set(prices.map((row) => row.region))].sort((a, b) => a.localeCompare(b))
	]);

	let results = $derived.by(() => calculateResults(data, startYear, endYear, region));

	let maxRealChange = $derived(Math.max(1, ...results.map((row) => Math.abs(row.realChange))));

	let selected = $derived(
		results.find((row) => row.country === selectedCountry) ?? results[0]
	);

	let selectedRows = $derived(
		data
			.filter(
				(row) =>
					row.country === selected?.country &&
					row.year >= startYear &&
					row.year <= endYear
			)
			.sort((a, b) => a.year - b.year)
	);

	let first = $derived(selectedRows.find((row) => row.year === startYear));

	let trend = $derived.by((): TrendPoint[] =>
		first
			? selectedRows.map((row) => ({
					year: row.year,
					bigMac: (row.price / first.price) * 100,
					cpi: (row.cpi / first.cpi) * 100
				}))
			: []
	);

	let highest = $derived(Math.max(110, ...trend.map((row) => Math.max(row.bigMac, row.cpi))));

	let lowest = $derived(Math.min(90, ...trend.map((row) => Math.min(row.bigMac, row.cpi))));

	let yearTicks = $derived.by(() => getYearTicks(startYear, endYear));

	let omittedGroups = $derived.by(() => getOmissionGroups(prices, data, startYear, endYear, region));

	function calculateResults(
		rows: Entry[],
		start: number,
		end: number,
		chosenRegion: string
	): Result[] {
		if (start >= end) return [];

		const countries = [...new Set(rows.map((row) => row.country))];
		const answer: Result[] = [];

		for (const country of countries) {
			const first = rows.find((row) => row.country === country && row.year === start);
			const last = rows.find((row) => row.country === country && row.year === end);

			if (!first || !last || (chosenRegion !== 'All' && first.region !== chosenRegion)) continue;

			const bigMacChange = (last.price / first.price - 1) * 100;
			const inflationChange = (last.cpi / first.cpi - 1) * 100;
			const realChange = ((last.price / first.price) / (last.cpi / first.cpi) - 1) * 100;

			answer.push({ country, bigMacChange, inflationChange, realChange });
		}

		return answer.sort((a, b) => b.realChange - a.realChange);
	}

	function getOmissionGroups(
		priceRows: PriceEntry[],
		mergedRows: Entry[],
		start: number,
		end: number,
		chosenRegion: string
	): OmissionGroup[] {
		if (start >= end) return [];

		const countryRegions = new Map<string, string>();
		for (const row of priceRows) {
			if (!countryRegions.has(row.country)) countryRegions.set(row.country, row.region);
		}

		const priceKeys = new Set(priceRows.map((row) => `${row.country}\u0000${row.year}`));
		const mergedKeys = new Set(mergedRows.map((row) => `${row.country}\u0000${row.year}`));
		const grouped = new Map<string, string[]>();

		for (const [country, countryRegion] of countryRegions) {
			if (chosenRegion !== 'All' && countryRegion !== chosenRegion) continue;

			const missingPriceYears: number[] = [];
			const missingCpiYears: number[] = [];

			for (const year of new Set([start, end])) {
				const key = `${country}\u0000${year}`;
				if (!priceKeys.has(key)) {
					missingPriceYears.push(year);
				} else if (!mergedKeys.has(key)) {
					missingCpiYears.push(year);
				}
			}

			const reasons = [
				missingPriceYears.length > 0
					? `no Big Mac price data for ${formatYears(missingPriceYears)}`
					: '',
				missingCpiYears.length > 0 ? `no CPI data for ${formatYears(missingCpiYears)}` : ''
			].filter(Boolean);

			if (reasons.length === 0) continue;

			const reason = reasons.join(' and ');
			const countries = grouped.get(reason) ?? [];
			countries.push(country);
			grouped.set(reason, countries);
		}

		return [...grouped.entries()]
			.map(([reason, countries]) => ({
				reason,
				countries: countries.sort((a, b) => a.localeCompare(b))
			}))
			.sort((a, b) => a.countries[0].localeCompare(b.countries[0]));
	}

	function formatYears(values: number[]) {
		if (values.length === 1) return String(values[0]);
		return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
	}

	function getYearTicks(start: number, end: number) {
		if (start >= end) return [start];

		const ticks = [start];
		for (let year = start + 5; year < end; year += 5) ticks.push(year);
		if (ticks[ticks.length - 1] !== end) ticks.push(end);
		return ticks;
	}

	function x(year: number) {
		return 100 + ((year - startYear) / (endYear - startYear)) * 530;
	}

	function y(value: number) {
		return 245 - ((value - lowest) / (highest - lowest)) * 210;
	}

	function points(type: 'bigMac' | 'cpi') {
		return trend.map((row) => `${x(row.year)},${y(row[type])}`).join(' ');
	}

	function number(value: number) {
		return value.toFixed(1);
	}

	function signedPercent(value: number) {
		return `${value > 0 ? '+' : ''}${number(value)}%`;
	}
</script>

<div class="inflation-box">
	<h3>Did Big Macs outpace inflation?</h3>

	<p class="description">
		Compare the change in Big Mac prices after accounting for general consumer price inflation.
	</p>

	{#if loading}
		<p>Loading data...</p>
	{:else if error}
		<p>{error}</p>
	{:else}
		<div class="filters">
			<label>
				Start Year
				<select bind:value={startYear}>
					{#each years as year}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</label>

			<label>
				End Year
				<select bind:value={endYear}>
					{#each years as year}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</label>

			<label>
				Region
				<select bind:value={region}>
					{#each regions as item}
						<option value={item}>{item}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if startYear >= endYear}
			<p>Please select an end year after the start year.</p>
		{:else if results.length === 0}
			<p>No matching country data is available for these years.</p>
		{:else}
			<p class="instructions">
				<strong>How to explore:</strong> Select a time period and region. Click a country below to
				see its price and inflation trends.
			</p>

			<div class="legend">
				<span><i class="red"></i> Big Mac price rose after inflation</span>
				<span><i class="blue"></i> Big Mac price fell after inflation</span>
			</div>

			<p class="metric-axis-label">Big Mac price change after inflation (%)</p>

			<div class="country-chart" aria-label="Country real price changes">
				{#each results as row}
					<button
						class="country-row"
						class:active={selected?.country === row.country}
						aria-pressed={selected?.country === row.country}
						onclick={() => (selectedCountry = row.country)}
						title={`${row.country}: ${signedPercent(row.realChange)} after inflation`}
					>
						<span class="country-name">{row.country}</span>

						<span class="bar-space">
							<span class="zero"></span>
							<span
								class="bar"
								class:positive={row.realChange >= 0}
								class:negative={row.realChange < 0}
								style:left={row.realChange >= 0
									? '50%'
									: 50 - (Math.abs(row.realChange) / maxRealChange) * 48 + '%'}
								style:width={(Math.abs(row.realChange) / maxRealChange) * 48 + '%'}
							></span>
						</span>

						<span class="value">{signedPercent(row.realChange)}</span>
					</button>
				{/each}
			</div>

			{#if omittedGroups.length > 0}
				<p class="note omissions">
					<strong>Not shown:</strong>
					{#each omittedGroups as group, index}
						{#if index > 0};&nbsp;{/if}{group.countries.join(', ')} ({group.reason})
					{/each}.
				</p>
			{:else}
				<p class="note omissions">No countries were left out for these years and region.</p>
			{/if}

			<p class="note">
				Values show cumulative Big Mac price change after adjusting for cumulative CPI:
				((price end / price start) / (CPI end / CPI start) - 1) × 100. Red means prices rose in real terms;
				blue means they fell.
			</p>

			{#if selected && trend.length > 0}
				<div class="details">
					<h3>{selected.country}: A closer look</h3>

					<div class="numbers">
						<div>
							<small>Big Mac price change</small>
							<strong>{signedPercent(selected.bigMacChange)}</strong>
						</div>

						<div>
							<small>General inflation</small>
							<strong>{signedPercent(selected.inflationChange)}</strong>
						</div>

						<div>
							<small>Real price change</small>
							<strong>{signedPercent(selected.realChange)}</strong>
						</div>
					</div>

					<p class="finding">
						Between {startYear} and {endYear}, Big Mac prices in {selected.country}
						{#if selected.realChange > 0}
							rose {number(selected.realChange)}% faster than general prices.
						{:else if selected.realChange < 0}
							fell {number(Math.abs(selected.realChange))}% relative to general prices.
						{:else}
							kept pace with general prices.
						{/if}
					</p>

					<div class="legend">
						<span><i class="red"></i> Big Mac price index</span>
						<span><i class="blue"></i> CPI index</span>
					</div>

					<svg
						viewBox="0 0 680 310"
						class="line-chart"
						role="img"
						aria-label={`Big Mac and CPI price trends for ${selected.country}`}
					>
						{#each [0, 1, 2, 3, 4] as step}
							{@const value = lowest + ((highest - lowest) * step) / 4}
							<line x1="100" y1={y(value)} x2="630" y2={y(value)} stroke="#ddd5c6" />
							<text x="88" y={y(value) + 4} text-anchor="end" font-size="11">
								{number(value)}
							</text>
						{/each}

						<polyline
							points={points('bigMac')}
							fill="none"
							stroke="#c93935"
							stroke-width="3"
						/>

						<polyline
							points={points('cpi')}
							fill="none"
							stroke="#218b9d"
							stroke-width="3"
						/>

						{#each trend as row}
							<circle cx={x(row.year)} cy={y(row.bigMac)} r="4" fill="#c93935">
								<title>{row.year}: Big Mac index {number(row.bigMac)}</title>
							</circle>

							<circle cx={x(row.year)} cy={y(row.cpi)} r="4" fill="#218b9d">
								<title>{row.year}: CPI index {number(row.cpi)}</title>
							</circle>
						{/each}

						{#each yearTicks as year}
							<line x1={x(year)} y1="245" x2={x(year)} y2="250" stroke="#777" />
							<text
								x={x(year)}
								y="270"
								text-anchor={year === startYear ? 'start' : year === endYear ? 'end' : 'middle'}
								font-size="12"
							>
								{year}
							</text>
						{/each}

						<text x="28" y="140" transform="rotate(-90 28 140)" text-anchor="middle" font-size="12">
							Index (start year = 100)
						</text>
						<text x="365" y="298" text-anchor="middle" font-size="12">Year</text>
					</svg>

					<p class="note">
						Both lines start at 100 in {startYear}. Hover over a point to see its value. Only years
						with data are plotted.
					</p>
				</div>
			{/if}
		{/if}
	{/if}

	<p class="source">
		Sources: The Economist Big Mac Index and World Bank indicator FP.CPI.TOTL (2010 = 100).
		Calculations use local-currency Big Mac prices. CPI represents general inflation, not food
		inflation alone.
	</p>
</div>

<style>
	.inflation-box {
		width: 100%;
		box-sizing: border-box;
		background: #fffdf7;
		padding: 20px;
		border-radius: 16px;
		border: 1px solid #e6dcc6;
		color: #29251f;
		font-family: inherit;
	}

	h3 {
		margin: 0 0 10px;
		font-size: 25px;
	}

	.description {
		font-size: 14px;
		line-height: 1.6;
	}

	.filters {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin: 22px 0;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12px;
		font-weight: bold;
	}

	select {
		width: 100%;
		min-width: 0;
		padding: 10px;
		border: 1px solid #d4c7ac;
		border-radius: 7px;
		background: white;
		color: #29251f;
	}

	.instructions {
		padding: 12px;
		border-radius: 8px;
		background: #fff0c4;
		font-size: 13px;
		line-height: 1.6;
	}

	.legend {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		margin: 18px 0;
		font-size: 12px;
	}

	.legend span {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.legend i {
		width: 11px;
		height: 11px;
		display: inline-block;
		border-radius: 2px;
	}

	.red {
		background: #c93935;
	}

	.blue {
		background: #218b9d;
	}

	.metric-axis-label {
		margin: 0 0 6px;
		color: #6b665c;
		font-size: 11px;
		font-weight: 600;
		text-align: center;
	}

	.country-chart {
		max-height: 400px;
		overflow-y: auto;
		padding-right: 4px;
	}

	.country-row {
		display: grid;
		grid-template-columns: 95px minmax(0, 1fr) 78px;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 9px 5px;
		border: none;
		border-bottom: 1px solid #eee5d5;
		background: transparent;
		color: #29251f;
		text-align: left;
		cursor: pointer;
		font-family: inherit;
	}

	.country-row:hover,
	.country-row.active {
		background: #fff0c4;
	}

	.country-name {
		font-size: 12px;
		overflow-wrap: anywhere;
	}

	.bar-space {
		position: relative;
		display: block;
		height: 20px;
		background: #f5f1e9;
	}

	.zero {
		position: absolute;
		left: 50%;
		height: 100%;
		border-left: 1px solid #777;
	}

	.bar {
		position: absolute;
		top: 3px;
		height: 14px;
		border-radius: 2px;
	}

	.positive {
		background: #c93935;
	}

	.negative {
		background: #218b9d;
	}

	.value {
		text-align: right;
		font-size: 11px;
		white-space: nowrap;
	}

	.note {
		font-size: 11px;
		color: #6b665c;
		line-height: 1.6;
	}

	.omissions {
		margin: 12px 0;
	}

	.details {
		border-top: 2px solid #e6d4aa;
		margin-top: 28px;
		padding-top: 20px;
	}

	.numbers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin: 20px 0;
	}

	.numbers div {
		background: #f4ebd9;
		padding: 12px;
		border-radius: 8px;
	}

	.numbers small {
		display: block;
		margin-bottom: 8px;
		font-size: 11px;
	}

	.numbers strong {
		font-size: 18px;
	}

	.finding {
		background: #fff1cb;
		border-left: 4px solid #e9ae3e;
		padding: 12px;
		font-size: 13px;
		line-height: 1.7;
	}

	.line-chart {
		width: 100%;
		height: auto;
		display: block;
		background: white;
	}

	.source {
		margin-top: 24px;
		font-size: 11px;
		color: #756e63;
		line-height: 1.6;
	}

	@media (max-width: 650px) {
		.inflation-box {
			padding: 12px;
		}

		.filters {
			grid-template-columns: 1fr;
		}

		.country-row {
			grid-template-columns: 75px minmax(0, 1fr) 70px;
			gap: 5px;
		}

		.country-name,
		.value {
			font-size: 10px;
		}

		.numbers {
			grid-template-columns: 1fr;
		}
	}
</style>
