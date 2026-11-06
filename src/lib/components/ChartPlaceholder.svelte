<script lang="ts">
	type Ingredient = 'patty' | 'lettuce' | 'sauce';
	type Preview = 'empty' | 'map';

	let {
		ingredient,
		overline,
		title,
		description,
		preview = 'empty'
	}: {
		ingredient: Ingredient;
		overline: string;
		title: string;
		description: string;
		preview?: Preview;
	} = $props();

	// One instance per ingredient is rendered on this page. Use unique ID prefixes if that changes,
	// including for the map SVG title and description below.
	let titleId = $derived('chart-title-' + ingredient);
</script>

<figure class="chart-frame chart-frame--{ingredient}" aria-labelledby={titleId}>
	<figcaption class="chart-head">
		<div>
			<p class="chart-overline">{overline}</p>
			<h3 id={titleId}>{title}</h3>
		</div>
		<span class="chart-unit">Chart slot</span>
	</figcaption>

	<div class="chart-plot chart-plot--{preview}">
		{#if preview === 'map'}
			<svg
				class="world-map"
				viewBox="0 0 860 300"
				role="img"
				aria-labelledby="map-preview-title map-preview-description"
			>
				<title id="map-preview-title">Neutral world map preview</title>
				<desc id="map-preview-description">
					A gray world map silhouette with no affordability values or data colors.
				</desc>
				<g class="map-grid">
					<path d="M30 70H830 M30 120H830 M30 170H830 M30 220H830" />
					<path d="M110 30V270 M210 30V270 M310 30V270 M410 30V270 M510 30V270 M610 30V270 M710 30V270 M810 30V270" />
				</g>
				<g class="continents">
					<path d="M91 87l28-24 39-7 20 14 32 1 24 22-13 15 8 21-23 12-8 28-19 17-11 32-18-6-12-31-26-10-17-31-19-17 6-18-16-12z" />
					<path d="M206 183l20 4 12 22-5 23-11 14-4 30-13 17-9-15 1-28-13-21 9-24z" />
					<path d="M371 77l28-18 30 7 18 20-7 21-30 4-19 19-21-8-13-20z" />
					<path d="M406 127l25-10 31 8 22 29-11 28-17 17-13 39-15 18-16-23 4-28-14-24 1-26-16-18z" />
					<path d="M478 77l44-22 75 9 41 21 54 9 31 21-18 18-54-8-29 16-30-12-22 19-29-6-14-22-32 2-24-17-28-4z" />
					<path d="M610 179l31-10 33 13 6 25-26 19-30-2-21-23z" />
					<path d="M727 224l18-8 16 9-5 18-20 4z" />
				</g>
				<text class="map-placeholder-text" x="430" y="282" text-anchor="middle">
					MAP PREVIEW · MEASURE AND SCALE TO BE DEFINED
				</text>
			</svg>
		{:else}
			<div class="chart-empty-state">
				<span class="empty-mark" aria-hidden="true"></span>
				<p>Chart visualization reserved</p>
			</div>
		{/if}
	</div>

	<p class="chart-foot">{description}</p>

	{#if ingredient === 'sauce'}
		<div class="pickle-background" aria-hidden="true">
			<span class="pickle-slice pickle-one"></span>
			<span class="pickle-slice pickle-two"></span>
			<span class="pickle-slice pickle-three"></span>
			<span class="pickle-slice pickle-four"></span>
			<span class="pickle-slice pickle-five"></span>
			<span class="pickle-slice pickle-six"></span>
		</div>
	{/if}
</figure>

<style>
	.chart-frame {
		--frame-gap: 12px;
		position: relative;
		z-index: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		min-width: 0;
		margin: 0;
		overflow: hidden;
		padding: var(--frame-gap);
		border: 0;
		border-radius: 18px;
		box-shadow: 0 7px 0 rgb(80 53 31 / 16%), 0 10px 20px rgb(70 51 30 / 8%);
		isolation: isolate;
	}

	.chart-frame--patty {
		background-color: #684332;
		background-image:
			radial-gradient(circle at 6px 7px, #9a7253 0 1.3px, transparent 1.8px),
			radial-gradient(circle at 15px 15px, #8b6549 0 1px, transparent 1.7px);
		background-size: 21px 19px;
	}

	.chart-frame--lettuce {
		background-color: #789047;
		background-image: repeating-linear-gradient(
			166deg,
			#789047 0 7px,
			#91a65e 7px 10px,
			#71883e 10px 15px
		);
	}

	.chart-frame--sauce {
		background-color: #d99518;
		background-image:
			radial-gradient(circle at 8px 8px, #809b49 0 3px, #f3dc8a 3.6px 4.5px, transparent 5px),
			linear-gradient(145deg, #f1c85d, #d9962d);
		background-size: 27px 24px, auto;
	}

	.chart-head,
	.chart-plot,
	.chart-foot {
		position: relative;
		z-index: 1;
		background: #fffdf8;
	}

	.chart-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 14px;
		padding: 20px 22px 0;
		border: 1px solid #efe9dc;
		border-bottom: 0;
		border-radius: 10px 10px 0 0;
	}

	.chart-overline {
		margin: 0 0 5px;
		color: var(--text-muted);
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		line-height: 1.4;
	}

	.chart-head h3 {
		margin: 0;
		color: #392b23;
		font-size: 1.05rem;
		line-height: 1.25;
	}

	.chart-unit {
		flex: 0 0 auto;
		padding: 5px 9px;
		border: 1px solid #e1ddd4;
		border-radius: 999px;
		color: #656a61;
		font-size: 0.7rem;
		white-space: nowrap;
	}

	.chart-plot {
		display: grid;
		min-height: 17rem;
		margin: 0;
		padding: 16px 22px 0;
		place-items: center;
		border-inline: 1px solid #efe9dc;
		background: #fffdf8;
	}

	.chart-plot--map {
		min-height: 0;
		padding: 8px 12px 2px;
		background: #fffdf8;
	}

	.chart-empty-state {
		display: grid;
		justify-items: center;
		gap: 10px;
		padding: 20px;
		color: var(--text-muted);
		text-align: center;
	}

	.chart-empty-state p {
		margin: 0;
		font-size: 0.8rem;
	}

	.empty-mark {
		display: block;
		width: 40px;
		height: 27px;
		border: 1px solid #ded7ca;
		border-radius: 4px;
		background:
			linear-gradient(#ded7ca, #ded7ca) 8px 19px / 24px 1px no-repeat,
			linear-gradient(#ded7ca, #ded7ca) 8px 7px / 1px 13px no-repeat,
			linear-gradient(135deg, transparent 48%, #d99518 49% 55%, transparent 56%) 11px 7px / 19px 12px no-repeat;
	}

	.world-map {
		display: block;
		width: 100%;
		height: auto;
		padding: 8px 10px 2px;
		border: 1px solid #e5e3dc;
		border-radius: 6px;
		background: #efeee7;
	}

	.map-grid {
		fill: none;
		stroke: #d8d9d2;
		stroke-dasharray: 2 5;
		stroke-width: 1;
	}

	.continents path {
		fill: #bfc1ba;
		stroke: #a9ada6;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.map-placeholder-text {
		fill: var(--text-muted);
		font-family: Arial, Helvetica, sans-serif;
		font-size: 9px;
		letter-spacing: 1px;
	}

	.chart-foot {
		margin: 0;
		padding: 7px 22px 15px;
		border: 1px solid #efe9dc;
		border-top: 0;
		border-radius: 0 0 10px 10px;
		color: var(--text-muted);
		font-size: 0.72rem;
		line-height: 1.45;
	}

	.pickle-background {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.pickle-slice {
		position: absolute;
		display: block;
		width: 26px;
		height: 26px;
		border: 3px solid #557436;
		border-radius: 47% 53% 50% 48%;
		background:
			radial-gradient(ellipse 2px 3px at 31% 30%, #f0f2cb 95%, transparent 100%),
			radial-gradient(ellipse 2px 3px at 67% 31%, #eef1c7 95%, transparent 100%),
			radial-gradient(ellipse 2px 3px at 43% 68%, #eef1c7 95%, transparent 100%),
			radial-gradient(ellipse 2px 3px at 71% 68%, #eef1c7 95%, transparent 100%),
			radial-gradient(circle at 45% 45%, #c7d985 0 46%, #91ae52 49% 100%);
		box-shadow: inset 0 0 0 2px #739345, 0 1px 2px rgb(84 59 29 / 21%);
	}

	.pickle-one {
		top: calc(var(--frame-gap) - 3px);
		left: 16%;
		transform: rotate(-12deg);
	}

	.pickle-two {
		top: calc(var(--frame-gap) - 3px);
		right: 18%;
		transform: rotate(11deg);
	}

	.pickle-three {
		top: 32%;
		right: calc(var(--frame-gap) - 3px);
		transform: rotate(18deg);
	}

	.pickle-four {
		top: 62%;
		left: calc(var(--frame-gap) - 3px);
		transform: rotate(-8deg);
	}

	.pickle-five {
		bottom: calc(var(--frame-gap) - 3px);
		right: 24%;
		transform: rotate(9deg);
	}

	.pickle-six {
		bottom: calc(var(--frame-gap) - 3px);
		left: 30%;
		transform: rotate(-16deg);
	}

	@media (max-width: 650px) {
		.chart-frame {
			--frame-gap: 8px;
			border-radius: 15px;
		}

		.chart-head {
			gap: 8px;
			padding: 14px 12px 0;
		}

		.chart-head h3 {
			font-size: 0.95rem;
		}

		.chart-overline {
			font-size: 0.58rem;
		}

		.chart-unit {
			padding: 4px 7px;
			font-size: 0.62rem;
		}

		.chart-plot {
			min-height: 13rem;
			padding: 13px 12px 0;
		}

		.chart-plot--map {
			min-height: 0;
			padding: 7px 6px 2px;
		}

		.chart-foot {
			padding: 7px 12px 11px;
		}

		.pickle-slice {
			width: 20px;
			height: 20px;
			border-width: 2px;
		}
	}
</style>
