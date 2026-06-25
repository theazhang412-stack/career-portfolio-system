# Career Portfolio API Design

## API Rule

The frontend must not read the database directly. All data should be fetched or submitted through FastAPI backend APIs.

## Public APIs

| Method | API | Purpose | Status |
| --- | --- | --- | --- |
| `GET` | `/api/profile` | Read homepage profile data | Done, reads from PostgreSQL `profile` table |
| `GET` | `/api/experiences` | Read all experiences | Done, reads from PostgreSQL `experiences` table |
| `GET` | `/api/experiences?category=Finance` | Filter experiences by category | Done, supports category query |
| `GET` | `/api/projects` | Read all projects | Done, reads from PostgreSQL `projects` table |
| `GET` | `/api/skills` | Read skills list | Done, reads from PostgreSQL `skills` table |
| `POST` | `/api/messages` | Submit visitor message | Done, writes to PostgreSQL `messages` table |

## Admin APIs

Admin APIs require an `Authorization` header after login:

```text
Authorization: Bearer <ACCESS_TOKEN>
```

The access token is returned by `/api/admin/login`. Admin login requires `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `backend/.env`.

| Method | API | Purpose | Status |
| --- | --- | --- | --- |
| `POST` | `/api/admin/login` | Verify admin login and return token | Done |
| `PUT` | `/api/admin/profile` | Update personal profile information | Done |
| `POST` | `/api/admin/experiences` | Add a new experience | Done |
| `POST` | `/api/admin/projects` | Add a new project | Done |
| `POST` | `/api/admin/skills` | Add a new skill | Done |
| `GET` | `/api/admin/messages` | View all visitor messages | Done |
| `PUT` | `/api/admin/experiences/{id}` | Update an existing experience | Done |
| `DELETE` | `/api/admin/experiences/{id}` | Delete an existing experience | Done |
| `PUT` | `/api/admin/projects/{id}` | Update an existing project | Done |
| `DELETE` | `/api/admin/projects/{id}` | Delete an existing project | Done |
| `PUT` | `/api/admin/skills/{id}` | Update an existing skill | Done |
| `DELETE` | `/api/admin/skills/{id}` | Delete an existing skill | Done |

## Current Backend Files

| File | Purpose |
| --- | --- |
| `backend/main.py` | FastAPI controller layer and API routes |
| `backend/database.py` | PostgreSQL connection and `.env` loading |
| `frontend/admin.html` | Admin dashboard page |
| `frontend/admin.css` | Admin dashboard styling |
| `frontend/admin.js` | Admin dashboard login, editing, saving, and message viewing logic |
| `backend/scripts/check_database.py` | Database connection check script |
| `backend/sql/init_database.sql` | Database table creation and seed data |

## Environment Variables

Required:

```text
DATABASE_URL=postgresql://...
```

Required for admin login:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
```

Optional fixed admin token:

```text
ADMIN_TOKEN=change-this-token
```

## Implementation Status

The API controller layer is now database-backed.

Completed:

- Public APIs read from PostgreSQL.
- Contact messages are persisted to PostgreSQL.
- Skills API is implemented.
- Experience category filtering is implemented.
- Admin APIs are implemented with Bearer Token protection.
- Admin dashboard page is implemented at `frontend/admin.html`.

Remaining optional improvements:

- Replace simple token auth with stronger session/JWT authentication.
- Add pagination for messages if the message table grows.
- Add stricter request validation and email validation.
