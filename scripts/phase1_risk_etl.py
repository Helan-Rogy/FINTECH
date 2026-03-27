import argparse
import json
import math
import random
import sys
from dataclasses import dataclass
from pathlib import Path

import pandas as pd


TARGET_ID_COL = "subject_id"
TARGET_LABEL_COL = "defaulted"
TARGET_FEATURES = [
    "income_monthly",
    "employment_years",
    "credit_history_months",
    "avg_monthly_spend",
    "late_payments_12m",
]


@dataclass(frozen=True)
class RiskMapping:
    input_csv: str
    delimiter: str
    encoding: str
    label_column: str
    id_column: str | None
    feature_columns: dict


def _ensure_parent_dir(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)


def _load_mapping(path: str) -> RiskMapping:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return RiskMapping(
        input_csv=str(raw.get("input_csv", "")),
        delimiter=str(raw.get("delimiter", ",")),
        encoding=str(raw.get("encoding", "utf-8")),
        label_column=str(raw.get("label_column", TARGET_LABEL_COL)),
        id_column=raw.get("id_column", None),
        feature_columns=dict(raw.get("feature_columns", {})),
    )


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def generate_synthetic_risk_raw(output_raw: str, n_subjects: int, seed: int) -> None:
    random.seed(seed)

    rows: list[dict] = []
    for i in range(n_subjects):
        subject_id = f"subj_{i+1:06d}"

        income = max(3000, random.gauss(28000, 12000))
        employment_years = max(0.0, random.gauss(3.0, 2.5))
        credit_history_months = max(0, int(random.gauss(24, 18)))
        avg_spend = max(0, random.gauss(income * random.uniform(0.4, 0.95), income * 0.15))
        late = max(0, int(random.gauss(1.0, 1.5)))
        late = min(late, 12)

        # Synthetic default probability model (for demo/training):
        # Higher risk with low income, short credit history, high spend ratio, more late payments.
        spend_ratio = avg_spend / max(income, 1.0)
        logit = (
            -2.2
            + (0.9 * (spend_ratio - 0.7))
            + (0.35 * late)
            + (0.6 * (1.0 / (1.0 + employment_years)))
            + (0.8 * (1.0 / (1.0 + credit_history_months / 12.0)))
            - (income / 80000.0)
        )
        p = _sigmoid(logit)
        defaulted = 1 if random.random() < p else 0

        rows.append(
            {
                "subject_id": subject_id,
                "income_monthly": round(float(income), 2),
                "employment_years": round(float(employment_years), 2),
                "credit_history_months": int(credit_history_months),
                "avg_monthly_spend": round(float(avg_spend), 2),
                "late_payments_12m": int(late),
                "defaulted": int(defaulted),
            }
        )

    df = pd.DataFrame(rows)
    _ensure_parent_dir(output_raw)
    df.to_csv(output_raw, index=False)
    print(f"[synthetic_risk_raw] wrote {output_raw} rows={len(df)}")


def standardize_risk_from_mapping(mapping_path: str, output_csv: str, output_sample: str | None, sample_n: int) -> None:
    m = _load_mapping(mapping_path)
    if not m.input_csv:
        raise ValueError("mapping.input_csv is empty. Set it to your raw risk CSV path.")

    df_raw = pd.read_csv(m.input_csv, sep=m.delimiter, encoding=m.encoding, low_memory=False)

    out = pd.DataFrame()

    # subject id
    if m.id_column:
        if m.id_column not in df_raw.columns:
            raise ValueError(f"id_column '{m.id_column}' not found in input CSV.")
        out[TARGET_ID_COL] = df_raw[m.id_column].astype(str)
    else:
        out[TARGET_ID_COL] = pd.Series(range(1, len(df_raw) + 1), dtype="int64").map(lambda x: f"s_{x:06d}")

    # label
    if m.label_column not in df_raw.columns:
        raise ValueError(f"label_column '{m.label_column}' not found in input CSV.")
    out[TARGET_LABEL_COL] = pd.to_numeric(df_raw[m.label_column], errors="coerce").fillna(0).astype(int)
    out[TARGET_LABEL_COL] = out[TARGET_LABEL_COL].clip(0, 1)

    # features
    for f in TARGET_FEATURES:
        src = m.feature_columns.get(f, None)
        if src is None:
            raise ValueError(f"Missing mapping for feature '{f}' in mapping.feature_columns.")
        if src not in df_raw.columns:
            raise ValueError(f"Feature source column '{src}' not found for '{f}'.")
        out[f] = pd.to_numeric(df_raw[src], errors="coerce")

    _validate_risk(out)

    _ensure_parent_dir(output_csv)
    out.to_csv(output_csv, index=False)

    if output_sample:
        _ensure_parent_dir(output_sample)
        out.head(sample_n).to_csv(output_sample, index=False)

    _print_report(out)


def _validate_risk(df: pd.DataFrame) -> None:
    required = [TARGET_ID_COL, TARGET_LABEL_COL, *TARGET_FEATURES]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns after transform: {missing}")

    if df[TARGET_ID_COL].isna().any() or (df[TARGET_ID_COL].astype(str).str.len() == 0).any():
        raise ValueError("subject_id contains null/empty values.")

    dupes = df[TARGET_ID_COL].duplicated().sum()
    if dupes:
        raise ValueError(f"subject_id has {dupes} duplicates.")

    if df[TARGET_LABEL_COL].isna().any():
        raise ValueError("defaulted contains null values.")

    for f in TARGET_FEATURES:
        if df[f].isna().any():
            raise ValueError(f"Feature '{f}' contains null values after coercion.")


def _print_report(df: pd.DataFrame) -> None:
    n = len(df)
    default_rate = float(df[TARGET_LABEL_COL].mean()) if n else 0.0
    print(f"[risk_standardized] rows={n} default_rate={default_rate:.3f}")
    for f in ["income_monthly", "credit_history_months", "late_payments_12m"]:
        s = df[f]
        print(f"[risk_standardized] {f} min={s.min():.2f} median={s.median():.2f} max={s.max():.2f}")


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description="Phase 1 ETL: risk dataset generator/standardizer")
    sub = p.add_subparsers(dest="cmd", required=True)

    gen = sub.add_parser("generate-synthetic", help="Generate synthetic labeled risk dataset CSV")
    gen.add_argument("--output-raw", default="data/raw/synthetic_risk.csv")
    gen.add_argument("--subjects", type=int, default=10000)
    gen.add_argument("--seed", type=int, default=7)

    run = sub.add_parser("run", help="Standardize a risk dataset using mapping JSON")
    run.add_argument("--mapping", default="config/risk_mapping.example.json")
    run.add_argument("--output", default="data/processed/risk_dataset.csv")
    run.add_argument("--output-sample", default="data/processed/risk_dataset_sample.csv")
    run.add_argument("--sample-n", type=int, default=5000)

    args = p.parse_args(argv)

    if args.cmd == "generate-synthetic":
        generate_synthetic_risk_raw(args.output_raw, args.subjects, args.seed)
        return 0

    if args.cmd == "run":
        standardize_risk_from_mapping(args.mapping, args.output, args.output_sample, args.sample_n)
        return 0

    raise RuntimeError("unreachable")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

