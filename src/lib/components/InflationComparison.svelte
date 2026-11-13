
<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { csvParse } from 'd3';

  type Entry = {
    country: string;
    region: string;
    year: number;
    price: number;
    cpi: number;
    };

    type Result = {
    country: string;
    bigmac: number;
    cpi: number;
    gap: number;
    };

  let data: Entry[] = [];
  let loading = true;
  let error = '';

  let startYear = 2000;
  let endYear = 2025;
  let region = 'All';
  let selectedCountry = '';

  onMount(async function () {
    try {
      let response = await fetch(base + '/data/bigmac_cpi_merged.csv');

      if (!response.ok) {
        throw new Error('Could not load the CSV file');
      }

      let text = await response.text();
      let rows = csvParse(text);

      data = rows.map(function (row) {
        return {
          country: row.country,
          region: row.region,
          year: Number(row.year),
          price: Number(row.local_price),
          cpi: Number(row.cpi_index)
        };
      });

      data = data.filter(function (row) {
        return row.country && row.price > 0 && row.cpi > 0;
      });
    } catch (err) {
      error = 'Could not load the inflation data.';
    }

    loading = false;
  });

  $: years = [...new Set(data.map(row => row.year))].sort((a, b) => a - b);

  $: regions = ['All', ...new Set(data.map(row => row.region))];

  $: results = calculateResults(data, startYear, endYear, region);

  $: maxGap = Math.max(1, ...results.map(row => Math.abs(row.gap)));

  $: if (results.length > 0 && !results.some(row => row.country === selectedCountry)) {
    selectedCountry = results[0].country;
  }

  $: selected = results.find(row => row.country === selectedCountry);

  $: countryData = data.filter(row =>
    row.country === selectedCountry &&
    row.year >= startYear &&
    row.year <= endYear
  ).sort((a, b) => a.year - b.year);

  $: first = countryData.find(row => row.year === startYear);

  $: trend = first ? countryData.map(row => ({
    year: row.year,
    bigmac: row.price / first.price * 100,
    cpi: row.cpi / first.cpi * 100
  })) : [];

  $: highest = Math.max(110, ...trend.map(row => Math.max(row.bigmac, row.cpi)));

  $: lowest = Math.min(90, ...trend.map(row => Math.min(row.bigmac, row.cpi)));

  function calculateResults(
  rows: Entry[],
  start: number,
  end: number,
  chosenRegion: string
): Result[] {
  let countries = [...new Set(rows.map(row => row.country))];
  let answer: Result[] = [];

  if (start >= end) {
    return answer;
  }

  for (let country of countries) {
    let first = rows.find(row => row.country === country && row.year === start);
    let last = rows.find(row => row.country === country && row.year === end);

    if (!first || !last) {
      continue;
    }

    if (chosenRegion !== 'All' && first.region !== chosenRegion) {
      continue;
    }

    let bigmac = (last.price / first.price - 1) * 100;
    let cpi = (last.cpi / first.cpi - 1) * 100;

    answer.push({
      country: country,
      bigmac: bigmac,
      cpi: cpi,
      gap: bigmac - cpi
    });
  }

  answer.sort((a, b) => b.gap - a.gap);

  return answer;
}

function x(year: number) {
  return 45 + (year - startYear) / (endYear - startYear) * 510;
}

function y(value: number) {
  return 245 - (value - lowest) / (highest - lowest) * 210;
}

function points(type: 'bigmac' | 'cpi') {
  return trend.map(row => x(row.year) + ',' + y(row[type])).join(' ');
}

function number(value: number) {
  return value.toFixed(1);
}
</script>

<div class="inflation-box">
  <h3>Did Big Macs outpace inflation?</h3>

  <p class="description">
    Compare how much Big Mac prices increased compared with
    general consumer prices in different countries.
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
        <strong>How to explore:</strong> Select a time period and region.
        Click a country below to see its Big Mac and inflation trends.
      </p>

      <div class="legend">
        <span><i class="red"></i> Big Mac grew faster than CPI</span>
        <span><i class="blue"></i> Big Mac grew slower than CPI</span>
      </div>

      <div class="country-chart">
        {#each results as row}
          <button
            class="country-row"
            class:active={selectedCountry === row.country}
            onclick={() => selectedCountry = row.country}
            title={`${row.country}: Big Mac ${number(row.bigmac)}%, CPI ${number(row.cpi)}%`}
          >
            <span class="country-name">{row.country}</span>

            <span class="bar-space">
              <span class="zero"></span>
              <span
                class="bar"
                class:positive={row.gap >= 0}
                class:negative={row.gap < 0}
                style:left={row.gap >= 0
                  ? '50%'
                  : (50 - Math.abs(row.gap) / maxGap * 48) + '%'}
                style:width={(Math.abs(row.gap) / maxGap * 48) + '%'}
              ></span>
            </span>

            <span class="value">
              {row.gap > 0 ? '+' : ''}{number(row.gap)} pp
            </span>
          </button>
        {/each}
      </div>

      <p class="note">
        Values show Big Mac price growth minus CPI growth,
        measured in percentage points. Red means Big Mac prices
        grew faster; blue means they grew slower.
      </p>

      {#if selected && trend.length > 0}
        <div class="details">
          <h3>{selected.country}: A closer look</h3>

          <div class="numbers">
            <div>
              <small>Big Mac growth</small>
              <strong>{number(selected.bigmac)}%</strong>
            </div>

            <div>
              <small>General inflation</small>
              <strong>{number(selected.cpi)}%</strong>
            </div>

            <div>
              <small>Difference</small>
              <strong>{number(selected.gap)} pp</strong>
            </div>
          </div>

          <p class="finding">
            Between {startYear} and {endYear}, Big Mac prices in
            {selected.country}
            {selected.gap >= 0 ? 'grew faster' : 'grew slower'}
            than general consumer prices by
            {number(Math.abs(selected.gap))} percentage points.
          </p>

          <div class="legend">
            <span><i class="red"></i> Big Mac price index</span>
            <span><i class="blue"></i> CPI index</span>
          </div>

          <svg viewBox="0 0 600 290" class="line-chart" role="img"
            aria-label={`Big Mac and CPI price trends for ${selected.country}`}>

            {#each [0, 1, 2, 3, 4] as step}
              {@const value = lowest + (highest - lowest) * step / 4}
              <line
                x1="45"
                y1={y(value)}
                x2="555"
                y2={y(value)}
                stroke="#ddd5c6"
              />
              <text x="38" y={y(value) + 4} text-anchor="end" font-size="11">
                {number(value)}
              </text>
            {/each}

            <polyline
              points={points('bigmac')}
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
              <circle cx={x(row.year)} cy={y(row.bigmac)} r="4" fill="#c93935">
                <title>{row.year}: Big Mac index {number(row.bigmac)}</title>
              </circle>

              <circle cx={x(row.year)} cy={y(row.cpi)} r="4" fill="#218b9d">
                <title>{row.year}: CPI index {number(row.cpi)}</title>
              </circle>
            {/each}

            <text x="45" y="272" font-size="12">{startYear}</text>
            <text x="555" y="272" text-anchor="end" font-size="12">{endYear}</text>
            <text x="300" y="288" text-anchor="middle" font-size="12">Year</text>
          </svg>

          <p class="note">
            Both lines start at 100 in {startYear}.
            Hover over a point to see its value.
            Years without data are not filled in.
          </p>
        </div>
      {/if}
    {/if}
  {/if}

  <p class="source">
    Sources: The Economist Big Mac Index and World Bank CPI.
    Calculations use local-currency Big Mac prices.
    CPI represents general inflation, not food inflation alone.
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

  .red { background: #c93935; }
  .blue { background: #218b9d; }

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

  .positive { background: #c93935; }
  .negative { background: #218b9d; }

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