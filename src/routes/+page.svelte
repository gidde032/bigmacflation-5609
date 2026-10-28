<script lang="ts">
	import { base } from '$app/paths';
	import ChartPlaceholder from '$lib/components/ChartPlaceholder.svelte';
</script>

<svelte:head>
	<title>Big MacFlation | CSCI 5609</title>
	<meta
		name="description"
		content="A narrative visualization project exploring Big Mac prices, affordability, and inflation."
	/>
</svelte:head>

<header class="site-header">
	<div class="site-title">
		<p class="eyebrow">CSCI 5609 · Narrative visualization</p>
		<a href="#introduction">Big MacFlation</a>
	</div>
	<nav aria-label="Page sections">
		<a href="#price-rankings">Price rankings</a>
		<a href="#affordability-map">Affordability map</a>
		<a href="#inflation-comparison">Inflation comparison</a>
		<a href="#conclusions">Conclusions</a>
	</nav>
</header>

<main>
	<section id="introduction" aria-labelledby="introduction-heading">
		<p class="eyebrow">A global snapshot</p>
		<h1 id="introduction-heading">What does a Big Mac say about prices?</h1>
		<p class="lede">
			Explore how Big Mac prices vary across countries, how those prices relate to local
			affordability, and how they compare with inflation over time.
		</p>
		<p class="data-note">
			Project data: <a href={`${base}/data/bigmac_clean.csv`}>download the cleaned CSV</a>.
		</p>
		<ChartPlaceholder
			title="Introduction visual"
			description="Opening context visualization will be added here."
		/>
	</section>

	<section id="price-rankings" aria-labelledby="price-rankings-heading">
		<p class="eyebrow">01 · Compare</p>
		<h2 id="price-rankings-heading">Price rankings</h2>
		<p>See how the price of a Big Mac compares across the countries in the dataset.</p>
		<ChartPlaceholder
			title="Price rankings chart"
			description="A teammate's Svelte chart component will go here."
		/>
	</section>

	<section id="affordability-map" aria-labelledby="affordability-map-heading">
		<p class="eyebrow">02 · Locate</p>
		<h2 id="affordability-map-heading">Affordability map</h2>
		<p>Explore how Big Mac affordability varies by location.</p>
		<ChartPlaceholder
			title="Affordability map"
			description="Map design and implementation are reserved for a separate session."
		/>
	</section>

	<section id="inflation-comparison" aria-labelledby="inflation-comparison-heading">
		<p class="eyebrow">03 · Put in context</p>
		<h2 id="inflation-comparison-heading">Inflation comparison</h2>
		<p>Compare Big Mac price changes with broader inflation measures.</p>
		<ChartPlaceholder
			title="Inflation comparison chart"
			description="A teammate's Svelte chart component will go here."
		/>
	</section>

	<section id="conclusions" aria-labelledby="conclusions-heading">
		<p class="eyebrow">04 · Reflect</p>
		<h2 id="conclusions-heading">Conclusions</h2>
		<p>Key takeaways will be summarized here after the visualizations are complete.</p>
		<ChartPlaceholder
			title="Conclusion summary"
			description="Space for the final synthesis or supporting visual."
		/>
	</section>
</main>

<footer>
	<p>CSCI 5609 · Big MacFlation project</p>
</footer>
