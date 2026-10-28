<script lang="ts">
	let {
		title,
		description
	}: {
		title: string;
		description: string;
	} = $props();
</script>

<figure class="chart-placeholder" aria-label={`${title} chart placeholder`}>
	<div class="placeholder-box" aria-hidden="true">
		<span>Chart placeholder</span>
	</div>
	<figcaption>
		<strong>{title}</strong>
		<p>{description}</p>
	</figcaption>
</figure>

<style>
	.chart-placeholder {
		margin: 1.5rem 0 0;
	}

	.placeholder-box {
		min-height: 12rem;
		display: grid;
		place-items: center;
		border: 1px dashed #87929b;
		background: #f5f6f6;
		color: #4a555d;
	}

	figcaption {
		padding-top: 0.6rem;
		color: #33404a;
	}

	figcaption p {
		margin: 0.25rem 0 0;
	}
</style>
