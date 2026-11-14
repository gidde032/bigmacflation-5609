#!/usr/bin/env python3
"""Rebuild the canonical Big Mac and World Bank CPI merge."""

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BIGMAC_PATH = ROOT / "bigmac_clean.csv"
CPI_PATH = ROOT / "scripts" / "world_bank_cpi.csv"
OUTPUT_PATHS = (
    ROOT / "bigmac_cpi_merged.csv",
    ROOT / "static" / "data" / "bigmac_cpi_merged.csv",
)
FIELDS = ("country", "iso_a3", "region", "year", "local_price", "currency_code", "cpi_index")


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def build_rows() -> list[dict[str, str]]:
    cpi_rows = read_rows(CPI_PATH)
    cpi_by_country_year: dict[tuple[str, str], str] = {}

    for row in cpi_rows:
        key = (row["iso_a3"], row["year"])
        if key in cpi_by_country_year:
            raise ValueError(f"Duplicate CPI observation for {key[0]} in {key[1]}")
        cpi_by_country_year[key] = row["cpi_index"]

    merged = []
    for row in read_rows(BIGMAC_PATH):
        key = (row["iso_a3"], row["date"])
        cpi_index = cpi_by_country_year.get(key)
        if cpi_index is None:
            continue

        merged.append(
            {
                "country": row["name"],
                "iso_a3": row["iso_a3"],
                "region": row["region"],
                "year": row["date"],
                "local_price": row["local_price"],
                "currency_code": row["currency_code"],
                "cpi_index": cpi_index,
            }
        )

    return sorted(merged, key=lambda row: (row["country"], int(row["year"])))


def main() -> None:
    rows = build_rows()
    for path in OUTPUT_PATHS:
        with path.open("w", newline="", encoding="utf-8") as output:
            writer = csv.DictWriter(output, fieldnames=FIELDS, lineterminator="\r\n")
            writer.writeheader()
            writer.writerows(rows)
    print(f"Wrote {len(rows)} merged rows to the repository and static data directories.")


if __name__ == "__main__":
    main()
