from contextlib import contextmanager
from os import environ
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg
from psycopg.rows import dict_row


BASE_DIR = Path(__file__).resolve().parent


def load_env_file() -> None:
    env_path = BASE_DIR / ".env"

    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        environ.setdefault(key.strip(), value.strip().strip("\"'"))


def database_url_with_ssl(url: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query))

    if parsed.scheme.startswith("postgres") and "sslmode" not in query:
        query["sslmode"] = "require"

    return urlunparse(parsed._replace(query=urlencode(query)))


def get_database_url() -> str:
    load_env_file()
    database_url = environ.get("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is missing. Add it to backend/.env.")

    return database_url_with_ssl(database_url)


@contextmanager
def get_connection():
    with psycopg.connect(get_database_url(), row_factory=dict_row, connect_timeout=10) as conn:
        yield conn
