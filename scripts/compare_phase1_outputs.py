import pandas as pd


def main() -> None:
    full = "data/processed/transactions_full.csv"
    sample = "data/processed/transactions_sample.csv"

    df_full = pd.read_csv(full)
    df_s = pd.read_csv(sample)

    print("full_rows", len(df_full))
    print("sample_rows", len(df_s))
    print("same_columns", list(df_full.columns) == list(df_s.columns))
    print("columns", list(df_s.columns))

    n = len(df_s)
    print("sample_equals_full_head", df_s.equals(df_full.head(n)))
    print("sample_txn_id_subset", set(df_s["txn_id"]).issubset(set(df_full["txn_id"])))


if __name__ == "__main__":
    main()

