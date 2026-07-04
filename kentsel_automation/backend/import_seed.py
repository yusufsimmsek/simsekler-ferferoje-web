from __future__ import annotations

import argparse
import json
from pathlib import Path

from database import DEFAULT_DB_PATH, DEFAULT_SEED_PATH, import_seed


def main() -> None:
    parser = argparse.ArgumentParser(description="Import automation_seed.json into SQLite.")
    parser.add_argument("--seed", type=Path, default=DEFAULT_SEED_PATH)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--keep-existing", action="store_true", help="Do not reset the database before import.")
    args = parser.parse_args()

    result = import_seed(args.seed, args.db, reset=not args.keep_existing)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

