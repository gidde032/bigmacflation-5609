import * as d3 from 'd3';

export type Row = {
	name: string;
	iso_a3: string;
	currency_code: string;
	local_price: number;
	dollar_ex: number;
	date: number;
	region: string;
};

export type PricedRow = Row & { dollar_price: number };
export type RankedRow = PricedRow & { rank: number };

export type Point = { year: number; rank: number };

export type Series = { name: string; points: Point[] };

export function addDollarPrice(rows: Row[]): PricedRow[] {
	return rows.map((r) => ({...r, dollar_price: (r.local_price / r.dollar_ex)}));
}

export function filterByRegion(rows: PricedRow[], region: string): PricedRow[] {
	if (region === "All"){
		return rows;
	}

	return rows.filter(r => r.region === region);
}

export function rankByYear(rows: PricedRow[]): RankedRow[] {
	const years = Array.from(d3.group(rows, (r) => r.date).values());

	return years.flatMap((rows) => [...rows]
			.sort((a, b) => d3.descending(a.dollar_price, b.dollar_price))
			.map((r, i) => ({ ...r, rank: i + 1 }))
	);
}

export function toSeries(rows: RankedRow[]): Series[] {
	let grouped_countries = d3.groups(rows, r => r.name);

	return grouped_countries.map(([name, items]) => ({name, points: items.map((r) => ({year: r.date, rank: r.rank})).sort((a, b) => a.year - b.year)}))
}
