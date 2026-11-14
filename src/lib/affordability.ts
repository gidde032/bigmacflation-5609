export type AffordabilityRow = {
	name: string;
	iso_a3: string;
	currency_code: string;
	local_price: number;
	GDP_local: number;
	date: number;
	iso_numeric: string;
	region: string;
};

export function bigMacsPerDay(row: Pick<AffordabilityRow, 'GDP_local' | 'local_price'>): number {
	return row.GDP_local / 365 / row.local_price;
}

export function change(startValue: number, endValue: number): number {
	return endValue / startValue;
}

export function colourValue(startValue: number, endValue: number): number {
	return Math.log2(change(startValue, endValue));
}
