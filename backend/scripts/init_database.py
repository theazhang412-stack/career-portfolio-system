from pathlib import Path
from os import environ
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


def database_url_with_ssl(url: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query))

    if parsed.scheme.startswith("postgres") and "sslmode" not in query:
        query["sslmode"] = "require"

    return urlunparse(parsed._replace(query=urlencode(query)))


def main() -> None:
    database_url = environ.get("DATABASE_URL")

    if not database_url:
        raise SystemExit(
            "DATABASE_URL is not set. Export your Render Postgres external URL first."
        )

    try:
        import psycopg
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: psycopg. Install it with: pip install 'psycopg[binary]'"
        ) from exc

    sql_path = Path(__file__).resolve().parents[1] / "sql" / "init_database.sql"
    sql = sql_path.read_text(encoding="utf-8")

    with psycopg.connect(database_url_with_ssl(database_url)) as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql)

    print("Database initialization completed successfully.")


if __name__ == "__main__":
    main()
