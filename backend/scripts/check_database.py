from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg


EXPECTED_TABLES = ["profile", "experiences", "projects", "skills", "messages"]


def load_env_value(key: str, env_path: Path) -> str | None:
    if not env_path.exists():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        env_key, value = line.split("=", 1)

        if env_key.strip() == key:
            return value.strip().strip("\"'")

    return None


def database_url_with_ssl(url: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query))

    if parsed.scheme.startswith("postgres") and "sslmode" not in query:
        query["sslmode"] = "require"

    return urlunparse(parsed._replace(query=urlencode(query)))


def main() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    database_url = load_env_value("DATABASE_URL", env_path)

    if not database_url:
        raise SystemExit("ERROR: DATABASE_URL is missing in backend/.env")

    with psycopg.connect(database_url_with_ssl(database_url), connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT current_database(), current_user, inet_server_addr()::text")
            db_name, db_user, server_addr = cur.fetchone()

            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ANY(%s)
                ORDER BY table_name
                """,
                (EXPECTED_TABLES,),
            )
            tables = [row[0] for row in cur.fetchall()]

            row_counts = {}
            for table in EXPECTED_TABLES:
                if table in tables:
                    cur.execute(f"SELECT COUNT(*) FROM {table}")
                    row_counts[table] = cur.fetchone()[0]

    print("OK: database connection successful")
    print(f"database={db_name}")
    print(f"user={db_user}")
    print(f"server_addr={server_addr}")
    print(f"tables_found={tables}")
    print(f"row_counts={row_counts}")


if __name__ == "__main__":
    main()
