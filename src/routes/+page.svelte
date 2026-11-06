<script lang="ts">
	import { base } from '$app/paths';
	import ChartPlaceholder from '$lib/components/ChartPlaceholder.svelte';
</script>

<svelte:head>
	<title>Big MacFlation | CSCI 5609</title>
	<meta
		name="description"
		content="Follow Big Mac prices across countries and time, with a look at affordability and inflation."
	/>
</svelte:head>

<div class="site-shell">
	<header class="site-header">
		<div class="header-inner">
			<a class="brand" href="#introduction" aria-label="Big MacFlation home">
				<span class="brand-mark" aria-hidden="true">
					<i></i><i></i><i></i><i></i><i></i>
				</span>
				<span>Big Mac<span class="brand-light">Flation</span></span>
			</a>

			<nav class="site-nav" aria-label="Page sections">
				<a href="#price-rankings">Prices</a>
				<a href="#affordability-map">Affordability</a>
				<a href="#inflation-comparison">Inflation</a>
				<a href="#conclusions">Takeaways</a>
			</nav>

			<a class="nav-cta" href="#price-rankings">
				Explore the data <span aria-hidden="true">↗</span>
			</a>
		</div>
		<div class="bun-seam" aria-hidden="true"></div>
	</header>

	<main id="main-content">
		<section class="intro-section" id="introduction" aria-labelledby="introduction-heading">
			<div class="hero-inner">
				<div class="hero-copy">
					<p class="eyebrow">
						<span class="eyebrow-rule" aria-hidden="true"></span>
						<span>TOP BUN · INTRODUCTION</span>
						<span class="year-tag">2000–2026</span>
					</p>
					<h1 id="introduction-heading">
						One familiar burger.<br />
						<span>Many economic stories.</span>
					</h1>
					<p class="hero-lede">
						Follow Big Mac prices across places and time, then look at what price alone leaves out.
					</p>
					<a class="primary-link" href="#price-rankings">
						Start with the price rankings
						<span aria-hidden="true">↓</span>
					</a>
				</div>

				<div class="hero-art">
					<div class="art-caption">
						<span>FIVE PAGE SECTIONS · ONE STACK</span>
						<span class="art-rule" aria-hidden="true"></span>
					</div>
					<div class="layer-diagram">
						<svg
							class="hero-burger"
							viewBox="0 0 500 360"
							role="img"
							aria-labelledby="burger-title burger-description"
						>
							<title id="burger-title">Five burger layers map to the five page sections</title>
							<desc id="burger-description">
								A seeded top bun, patty, lettuce, sauce with pickle slices, and bottom bun.
							</desc>
							<ellipse cx="250" cy="339" rx="179" ry="9" fill="#76502f" opacity=".12" />
							<path
								d="M66 121 V94 C66 48 145 22 250 22 C355 22 434 48 434 94 V121 Q434 129 424 129 H76 Q66 129 66 121 Z"
								fill="#e5ad4a"
							/>
							<path
								d="M81 100 C125 72 166 69 205 73 C250 64 310 69 348 76 C384 82 407 93 421 103"
								fill="none"
								stroke="#f4c76f"
								stroke-width="5"
								stroke-linecap="round"
								opacity=".75"
							/>
							<g fill="#fff1c7">
								<ellipse cx="131" cy="72" rx="6" ry="3" transform="rotate(-24 131 72)" />
								<ellipse cx="174" cy="55" rx="6" ry="3" transform="rotate(18 174 55)" />
								<ellipse cx="218" cy="43" rx="6" ry="3" transform="rotate(-14 218 43)" />
								<ellipse cx="264" cy="43" rx="6" ry="3" transform="rotate(20 264 43)" />
								<ellipse cx="310" cy="53" rx="6" ry="3" transform="rotate(-18 310 53)" />
								<ellipse cx="356" cy="70" rx="6" ry="3" transform="rotate(23 356 70)" />
							</g>
							<rect x="73" y="145" width="354" height="42" rx="12" fill="#684332" />
							<path
								d="M88 154 H412 M100 176 H397"
								stroke="#956344"
								stroke-width="2"
								stroke-linecap="round"
								opacity=".8"
							/>
							<g fill="#bd8a62" opacity=".75">
								<circle cx="120" cy="163" r="2.1" />
								<circle cx="163" cy="174" r="1.8" />
								<circle cx="202" cy="158" r="2" />
								<circle cx="249" cy="171" r="2" />
								<circle cx="294" cy="158" r="1.8" />
								<circle cx="337" cy="173" r="2" />
								<circle cx="381" cy="160" r="2" />
							</g>
							<path
								d="M58 204 C76 192 92 213 111 202 C130 191 145 214 165 202 C185 190 200 214 220 202 C240 190 256 214 276 202 C296 190 312 214 331 202 C351 190 367 213 387 202 C407 191 423 210 442 201 L432 227 C415 239 400 218 382 229 C362 240 347 218 328 230 C308 241 292 219 273 230 C253 241 238 219 218 230 C198 241 183 219 164 230 C144 241 128 219 109 230 C90 240 75 223 63 226 Z"
								fill="#789047"
							/>
							<path
								d="M81 211 C111 218 130 204 157 212 M215 212 C242 218 260 204 287 212 M346 211 C369 218 390 205 415 212"
								fill="none"
								stroke="#a2b76f"
								stroke-width="2"
								stroke-linecap="round"
								opacity=".8"
							/>
							<path
								d="M77 246 Q250 238 423 246 L412 272 Q250 279 88 272 Z"
								fill="#e7b24a"
							/>
							<path
								d="M85 253 C125 243 156 266 197 254 S272 243 313 254 S381 265 416 252"
								fill="none"
								stroke="#f8d982"
								stroke-width="4"
								stroke-linecap="round"
							/>
							<g fill="#86a54c" stroke="#617c39" stroke-width="2.5">
								<circle cx="157" cy="259" r="12" />
								<circle cx="250" cy="260" r="12" />
								<circle cx="343" cy="259" r="12" />
							</g>
							<g fill="#e0ecae">
								<circle cx="157" cy="259" r="4" />
								<circle cx="250" cy="260" r="4" />
								<circle cx="343" cy="259" r="4" />
							</g>
							<path
								d="M83 293 H417 V314 C417 329 394 337 370 337 H130 C106 337 83 329 83 314 Z"
								fill="#d28b38"
							/>
							<path
								d="M99 302 H401"
								stroke="#edb753"
								stroke-width="4"
								stroke-linecap="round"
								opacity=".8"
							/>
						</svg>

						<ol class="layer-callouts" aria-label="Page sections mapped to burger layers">
							<li>
								<span class="callout-dot bun-dot" aria-hidden="true"></span>
								<span><b>Top bun</b><small>Introduction</small></span>
							</li>
							<li>
								<span class="callout-dot patty-dot" aria-hidden="true"></span>
								<span><b>Patty</b><small>Price rankings</small></span>
							</li>
							<li>
								<span class="callout-dot leaf-dot" aria-hidden="true"></span>
								<span><b>Lettuce</b><small>Affordability map</small></span>
							</li>
							<li>
								<span class="callout-dot sauce-dot" aria-hidden="true"></span>
								<span><b>Sauce &amp; pickles</b><small>Inflation comparison</small></span>
							</li>
							<li>
								<span class="callout-dot bottom-dot" aria-hidden="true"></span>
								<span><b>Bottom bun</b><small>Conclusions</small></span>
							</li>
						</ol>
					</div>
					<p class="art-footnote">Five clear layers <i>·</i> quiet ingredient details <i>·</i> charts lead below</p>
				</div>

				<div class="hero-bottom" aria-hidden="true">
					<span>SCROLL TO FOLLOW THE STORY</span>
					<span class="scroll-mark">⌄</span>
					<span>01 / 05</span>
				</div>
			</div>
		</section>

		<div class="ingredient-transition" aria-hidden="true"></div>

		<section
			class="story-section price-section"
			id="price-rankings"
			aria-labelledby="price-rankings-heading"
		>
			<div class="story-inner">
				<div class="section-copy">
					<p class="section-label">
						<span class="chapter-number">02</span>
						<span class="chapter-word">PATTY</span>
					</p>
					<h2 id="price-rankings-heading">What does a Big Mac cost around the world?</h2>
					<p class="section-deck">
						Start with the menu price. Compare the same familiar item across countries.
					</p>
					<div class="section-detail">
						<span class="detail-rule" aria-hidden="true"></span>
						<p>Rankings give us a first view of how prices differ from place to place.</p>
					</div>
					<div class="control-stack" role="group" aria-label="Price chart control placeholders">
						<div class="control-field">
							<span class="control-label">Region</span>
							<span class="select-look">
								<span>Choose a region</span><b aria-hidden="true">⌄</b>
							</span>
						</div>
						<div class="control-field">
							<span class="control-label">Year</span>
							<span class="select-look">
								<span>Choose a year</span><b aria-hidden="true">⌄</b>
							</span>
						</div>
					</div>
				</div>

				<div class="chart-region" data-chart-region="price-rankings">
					<ChartPlaceholder
						ingredient="patty"
						overline="PRICE RANKINGS · CHART SLOT"
						title="Big Mac price by country"
						description="The country price ranking will be placed here."
					/>
				</div>
			</div>
		</section>

		<div class="ingredient-transition" aria-hidden="true"></div>

		<section
			class="story-section map-section"
			id="affordability-map"
			aria-labelledby="affordability-map-heading"
		>
			<div class="story-inner">
				<div class="section-copy">
					<p class="section-label">
						<span class="chapter-number">03</span>
						<span class="chapter-word">LETTUCE</span>
					</p>
					<h2 id="affordability-map-heading">A price means more in some places than others.</h2>
					<p class="section-deck">
						Put the menu price beside a broader view of local purchasing power.
					</p>
					<div class="section-detail">
						<span class="detail-rule" aria-hidden="true"></span>
						<p>The map will add another lens to the price comparison.</p>
					</div>
				</div>

				<div class="chart-region" data-chart-region="affordability-map">
					<ChartPlaceholder
						ingredient="lettuce"
						overline="AFFORDABILITY · RESERVED CHART SPACE"
						title="Explore affordability by location"
						description="Neutral preview only; the measure and visual scale are still to be defined."
						preview="map"
					/>
				</div>
			</div>
		</section>

		<div class="ingredient-transition" aria-hidden="true"></div>

		<section
			class="story-section inflation-section"
			id="inflation-comparison"
			aria-labelledby="inflation-comparison-heading"
		>
			<div class="story-inner">
				<div class="section-copy">
					<p class="section-label">
						<span class="chapter-number">04</span>
						<span class="chapter-word">SAUCE &amp; PICKLES</span>
					</p>
					<h2 id="inflation-comparison-heading">How does the menu price move against inflation?</h2>
					<p class="section-deck">
						Compare a Big Mac price trend with a broader inflation measure over time.
					</p>
					<div class="section-detail">
						<span class="detail-rule" aria-hidden="true"></span>
						<p>The final comparison will show where these measures move together or apart.</p>
					</div>
					<div class="control-stack single-control" role="group" aria-label="Inflation chart control placeholder">
						<div class="control-field">
							<span class="control-label">Country</span>
							<span class="select-look">
								<span>Choose a country</span><b aria-hidden="true">⌄</b>
							</span>
						</div>
					</div>
				</div>

				<div class="chart-region" data-chart-region="inflation-comparison">
					<ChartPlaceholder
						ingredient="sauce"
						overline="INFLATION COMPARISON · CHART SLOT"
						title="Big Mac price and inflation over time"
						description="The comparison chart and its data series will be placed here."
					/>
				</div>
			</div>
		</section>

		<div class="ingredient-transition" aria-hidden="true"></div>

		<section class="closing-section" id="conclusions" aria-labelledby="conclusions-heading">
			<div class="closing-inner">
				<div class="closing-heading">
					<p class="section-label">
						<span class="chapter-number">05</span>
						<span class="chapter-word">BOTTOM BUN</span>
					</p>
					<h2 id="conclusions-heading">One product. More than one story.</h2>
					<p>We’ll bring the findings together once the visualizations are complete.</p>
				</div>

				<div class="takeaway-grid">
					<article class="takeaway-card">
						<div class="takeaway-inner">
							<span class="takeaway-icon">01</span>
							<h3>Price</h3>
							<p>Findings will be summarized here.</p>
						</div>
					</article>
					<article class="takeaway-card">
						<div class="takeaway-inner">
							<span class="takeaway-icon">02</span>
							<h3>Purchasing power</h3>
							<p>Findings will be summarized here.</p>
						</div>
					</article>
					<article class="takeaway-card">
						<div class="takeaway-inner">
							<span class="takeaway-icon">03</span>
							<h3>Inflation</h3>
							<p>Findings will be summarized here.</p>
						</div>
					</article>
				</div>

				<p class="closing-note">TAKEAWAY COPY WILL FOLLOW THE VERIFIED RESULTS.</p>
			</div>
		</section>
	</main>

	<footer class="site-footer">
		<div class="bun-seam" aria-hidden="true"></div>
		<div class="footer-inner">
			<a class="brand footer-brand" href="#introduction" aria-label="Big MacFlation home">
				<span class="brand-mark" aria-hidden="true">
					<i></i><i></i><i></i><i></i><i></i>
				</span>
				<span>Big Mac<span class="brand-light">Flation</span></span>
			</a>
			<span class="footer-course">CSCI 5609 · student data story</span>
			<a class="data-link" href={base + '/data/bigmac_clean.csv'}>Download cleaned data (CSV)</a>
			<a class="back-to-top" href="#introduction">Back to top ↑</a>
		</div>
	</footer>
</div>
