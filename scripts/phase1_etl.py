import argparse
import json
import math
import os
import random
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd


TARGET_COLUMNS = [
    "txn_id",
    "user_id",
    "ts",
    "amount",
    "merchant_cat",
    "merchant_id",
    "city",
    "country",
    "device_id",
]


@dataclass(frozen=True)
class MappingConfig:
    input_csv: str
    delimiter: str
    encoding: str
    columns: dict
    defaults: dict
    ts_format_hint: str | None
    amount_abs: bool


def _load_mapping(path: str) -> MappingConfig:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    return MappingConfig(
        input_csv=str(raw.get("input_csv", "")),
        delimiter=str(raw.get("delimiter", ",")),
        encoding=str(raw.get("encoding", "utf-8")),
        columns=dict(raw.get("columns", {})),
        defaults=dict(raw.get("defaults", {})),
        ts_format_hint=raw.get("ts_format_hint", None),
        amount_abs=bool(raw.get("amount_abs", False)),
    )


def _ensure_parent_dir(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)


def _tokenize(series: pd.Series, prefix: str) -> pd.Series:
    # Stable remap based on sorted unique values.
    vals = series.fillna("").astype(str)
    uniques = sorted(v for v in vals.unique() if v != "")
    mapping = {v: f"{prefix}_{i+1:05d}" for i, v in enumerate(uniques)}
    return vals.map(lambda v: mapping.get(v, "")).astype(str)


def _parse_ts(series: pd.Series, format_hint: str | None) -> pd.Series:
    s = series.astype(str)
    if format_hint:
        parsed = pd.to_datetime(s, format=format_hint, errors="coerce", utc=True)
    else:
        parsed = pd.to_datetime(s, errors="coerce", utc=True)
    return parsed


def _validate(df: pd.DataFrame) -> None:
    missing = [c for c in TARGET_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns after transform: {missing}")

    if df["txn_id"].isna().any() or (df["txn_id"].astype(str).str.len() == 0).any():
        raise ValueError("txn_id contains null/empty values.")

    dupes = df["txn_id"].duplicated().sum()
    if dupes:
        raise ValueError(f"txn_id has {dupes} duplicates.")

    if df["amount"].isna().any():
        raise ValueError("amount contains null values.")

    if not pd.api.types.is_numeric_dtype(df["amount"]):
        raise ValueError("amount must be numeric after coercion.")

    ts_parsed = pd.to_datetime(df["ts"], errors="coerce", utc=True)
    if ts_parsed.isna().any():
        bad = int(ts_parsed.isna().sum())
        raise ValueError(f"ts has {bad} unparsable values.")


def standardize_from_mapping(mapping_path: str, output_full: str, output_sample: str | None, sample_n: int) -> None:
    cfg = _load_mapping(mapping_path)
    input_csv = cfg.input_csv
    if not input_csv:
        raise ValueError("mapping.input_csv is empty. Set it to your raw CSV path.")

    df_raw = pd.read_csv(
        input_csv,
        sep=cfg.delimiter,
        encoding=cfg.encoding,
        low_memory=False,
    )

    out = pd.DataFrame()

    for target in TARGET_COLUMNS:
        src = cfg.columns.get(target, None)
        if src is None:
            out[target] = None
        else:
            if src not in df_raw.columns:
                raise ValueError(f"Source column '{src}' not found in input CSV for target '{target}'.")
            out[target] = df_raw[src]

    # txn_id fallback
    if out["txn_id"].isna().all() or (out["txn_id"].astype(str).str.len() == 0).all():
        out["txn_id"] = pd.Series(range(1, len(out) + 1), dtype="int64").map(lambda x: f"t_{x:08d}")
    else:
        out["txn_id"] = out["txn_id"].astype(str)

    # Defaults
    for col, default_val in cfg.defaults.items():
        if col in out.columns:
            out[col] = out[col].fillna(default_val)

    # Parse timestamp and format consistently
    ts_parsed = _parse_ts(out["ts"], cfg.ts_format_hint)
    out["ts"] = ts_parsed.dt.strftime("%Y-%m-%d %H:%M:%S")

    # Amount
    out["amount"] = pd.to_numeric(out["amount"], errors="coerce")
    if cfg.amount_abs:
        out["amount"] = out["amount"].abs()

    # Ensure strings
    for c in ["merchant_cat", "merchant_id", "city", "country", "device_id", "user_id"]:
        out[c] = out[c].fillna("").astype(str)

    # Anonymize identifiers (user/merchant/device)
    out["user_id"] = _tokenize(out["user_id"], "u")
    out["merchant_id"] = _tokenize(out["merchant_id"], "m")
    out["device_id"] = _tokenize(out["device_id"], "d")

    out = out[TARGET_COLUMNS]
    _validate(out)

    _ensure_parent_dir(output_full)
    out.to_csv(output_full, index=False)

    if output_sample:
        _ensure_parent_dir(output_sample)
        out.head(sample_n).to_csv(output_sample, index=False)

    _print_report(out, label="standardized")


def _print_report(df: pd.DataFrame, label: str) -> None:
    ts = pd.to_datetime(df["ts"], utc=True, errors="coerce")
    users = df["user_id"].nunique(dropna=True)
    amt = df["amount"]
    print(f"[{label}] rows={len(df)} users={users}")
    print(f"[{label}] amount min={amt.min():.2f} median={amt.median():.2f} max={amt.max():.2f}")
    if len(ts):
        print(f"[{label}] ts range {ts.min()} -> {ts.max()}")


def generate_synthetic_raw(output_raw: str, n_users: int, n_txns: int, seed: int) -> None:
    random.seed(seed)
    base = datetime.now(tz=timezone.utc) - timedelta(days=7)

    merchant_cats = ["grocery", "fuel", "ecommerce", "restaurant", "travel", "pharmacy", "electronics"]
    countries = ["US", "GB", "IN", "DE", "BR", "NG"]
    cities = {
        "US": ["New York", "Austin", "Seattle"],
        "GB": ["London", "Manchester", "Bristol"],
        "IN": ["Bengaluru", "Mumbai", "Delhi"],
        "DE": ["Berlin", "Munich", "Hamburg"],
        "BR": ["Sao Paulo", "Rio", "Curitiba"],
        "NG": ["Lagos", "Abuja", "Kano"],
    }

    user_ids = [f"user_{i+1:04d}" for i in range(n_users)]
    device_ids = [f"device_{i+1:04d}" for i in range(max(1, math.ceil(n_users * 1.2)))]
    merchant_ids = [f"merchant_{i+1:05d}" for i in range(400)]

    rows: list[dict] = []
    for i in range(n_txns):
        u = random.choice(user_ids)
        device = random.choice(device_ids)
        cat = random.choice(merchant_cats)
        merchant = random.choice(merchant_ids)

        home_country = random.choice(countries)
        country = home_country if random.random() < 0.9 else random.choice(countries)
        city = random.choice(cities[country])

        # Amount: log-normal-ish with category adjustment
        base_amt = random.lognormvariate(mu=3.2, sigma=0.6)  # ~25 median-ish
        if cat in ("travel", "electronics"):
            base_amt *= 2.5
        elif cat in ("fuel",):
            base_amt *= 0.7

        t = base + timedelta(minutes=random.randint(0, 60 * 24 * 7))
        rows.append(
            {
                "customer_id": u,
                "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
                "amount": round(float(base_amt), 2),
                "merchant_category": cat,
                "merchant_id": merchant,
                "city": city,
                "country": country,
                "device_id": device,
            }
        )

    df = pd.DataFrame(rows)
    _ensure_parent_dir(output_raw)
    df.to_csv(output_raw, index=False)
    print(f"[synthetic_raw] wrote {output_raw} rows={len(df)}")


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description="Phase 1 ETL: standardize transaction CSV schema")
    sub = p.add_subparsers(dest="cmd", required=True)

    gen = sub.add_parser("generate-synthetic", help="Generate a synthetic raw dataset CSV")
    gen.add_argument("--output-raw", default="data/raw/synthetic_transactions.csv")
    gen.add_argument("--users", type=int, default=500)
    gen.add_argument("--txns", type=int, default=50000)
    gen.add_argument("--seed", type=int, default=7)

    run = sub.add_parser("run", help="Standardize a dataset using a mapping JSON")
    run.add_argument("--mapping", default="config/phase1_mapping.example.json")
    run.add_argument("--output-full", default="data/processed/transactions_full.csv")
    run.add_argument("--output-sample", default="data/processed/transactions_sample.csv")
    run.add_argument("--sample-n", type=int, default=20000)

    args = p.parse_args(argv)

    if args.cmd == "generate-synthetic":
        generate_synthetic_raw(args.output_raw, args.users, args.txns, args.seed)
        return 0

    if args.cmd == "run":
        standardize_from_mapping(args.mapping, args.output_full, args.output_sample, args.sample_n)
        return 0

    raise RuntimeError("unreachable")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

