from datetime import date
from os import environ
from pathlib import Path
from secrets import token_urlsafe
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import get_connection, load_env_file


load_env_file()

app = FastAPI(title="Yishu Career Portfolio API")
FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MessageCreate(BaseModel):
    name: str
    email: str
    company: str | None = None
    content: str


class AdminLogin(BaseModel):
    username: str
    password: str


class ProfileUpdate(BaseModel):
    name: str | None = None
    university: str | None = None
    degree: str | None = None
    bio: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    career_interests: list[str] | None = None
    avatar_url: str | None = None


class ExperienceCreate(BaseModel):
    organization: str
    role: str
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    category: str | None = None
    description: str | None = None
    achievements: list[str] = Field(default_factory=list)
    display_order: int = 0


class ExperienceUpdate(BaseModel):
    organization: str | None = None
    role: str | None = None
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    category: str | None = None
    description: str | None = None
    achievements: list[str] | None = None
    display_order: int | None = None


class ProjectCreate(BaseModel):
    title: str
    category: str | None = None
    tools: list[str] = Field(default_factory=list)
    description: str | None = None
    outcome: str | None = None
    related_experience_id: int | None = None
    display_order: int = 0


class ProjectUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    tools: list[str] | None = None
    description: str | None = None
    outcome: str | None = None
    related_experience_id: int | None = None
    display_order: int | None = None


class SkillCreate(BaseModel):
    skill_name: str
    skill_type: str | None = None
    level: str | None = None
    evidence: str | None = None
    display_order: int = 0


class SkillUpdate(BaseModel):
    skill_name: str | None = None
    skill_type: str | None = None
    level: str | None = None
    evidence: str | None = None
    display_order: int | None = None


ADMIN_SESSIONS: set[str] = set()


def format_period(start_date: date | None, end_date: date | None) -> str:
    if not start_date and not end_date:
        return ""

    if start_date:
        start = start_date.strftime("%b %Y")
    else:
        start = ""

    if end_date:
        end = end_date.strftime("%b %Y")
    else:
        end = "Present"

    if start == end:
        return start

    return f"{start} - {end}" if start else end


def normalize_experience(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "organization": row["organization"],
        "role": row["role"],
        "location": row["location"],
        "start_date": row["start_date"],
        "end_date": row["end_date"],
        "period": format_period(row["start_date"], row["end_date"]),
        "category": row["category"],
        "description": row["description"],
        "achievements": row["achievements"] or [],
        "highlights": row["achievements"] or [],
        "display_order": row["display_order"],
    }


def normalize_project(row: dict[str, Any]) -> dict[str, Any]:
    tools = row["tools"] or []

    return {
        "id": row["id"],
        "title": row["title"],
        "category": row["category"],
        "tools": ", ".join(tools),
        "tools_list": tools,
        "description": row["description"],
        "outcome": row["outcome"],
        "related_experience_id": row["related_experience_id"],
        "created_at": row["created_at"],
        "display_order": row["display_order"],
    }


def require_admin(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authorization required")

    token = authorization.removeprefix("Bearer ").strip()
    fixed_token = environ.get("ADMIN_TOKEN")
    fixed_token_is_configured = fixed_token and fixed_token != "change-this-token"

    if token not in ADMIN_SESSIONS and not (fixed_token_is_configured and token == fixed_token):
        raise HTTPException(status_code=401, detail="Admin authorization required")


@app.get("/")
def home():
    index_path = FRONTEND_DIR / "index.html"

    if index_path.exists():
        return FileResponse(index_path)

    return {"message": "Yishu Career Portfolio System backend is running!"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/profile")
def get_profile():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, university, degree, bio, email, phone, location,
                       career_interests, avatar_url
                FROM profile
                ORDER BY id
                LIMIT 1
                """
            )
            profile = cur.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profile


@app.get("/api/experiences")
def get_experiences(category: str | None = Query(default=None)):
    query = """
        SELECT id, organization, role, location, start_date, end_date, category,
               description, achievements, display_order
        FROM experiences
    """
    params: list[Any] = []

    if category:
        query += " WHERE category ILIKE %s"
        params.append(f"%{category}%")

    query += " ORDER BY display_order ASC, start_date DESC NULLS LAST, id ASC"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    return [normalize_experience(row) for row in rows]


@app.get("/api/projects")
def get_projects():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, category, tools, description, outcome,
                       related_experience_id, created_at, display_order
                FROM projects
                ORDER BY display_order ASC, created_at DESC, id ASC
                """
            )
            rows = cur.fetchall()

    return [normalize_project(row) for row in rows]


@app.get("/api/skills")
def get_skills():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, skill_name, skill_type, level, evidence, display_order
                FROM skills
                ORDER BY display_order ASC, id ASC
                """
            )
            rows = cur.fetchall()

    return rows


@app.post("/api/messages")
def create_message(message: MessageCreate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO messages (visitor_name, email, company, content, status)
                VALUES (%s, %s, %s, %s, 'new')
                RETURNING id, visitor_name, email, company, content, created_at, status
                """,
                (message.name, message.email, message.company, message.content),
            )
            new_message = cur.fetchone()

    return {
        "status": "success",
        "message": "Message received successfully!",
        "data": new_message,
    }


@app.post("/api/admin/login")
def admin_login(credentials: AdminLogin):
    expected_username = environ.get("ADMIN_USERNAME")
    expected_password = environ.get("ADMIN_PASSWORD")

    if not expected_username or not expected_password:
        raise HTTPException(status_code=503, detail="Admin credentials are not configured")

    if (
        credentials.username != expected_username
        or credentials.password != expected_password
    ):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = token_urlsafe(32)
    ADMIN_SESSIONS.add(token)

    return {"access_token": token, "token_type": "bearer"}


@app.put("/api/admin/profile")
def update_profile(
    profile: ProfileUpdate,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    update_data = profile.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    allowed_fields = [
        "name",
        "university",
        "degree",
        "bio",
        "email",
        "phone",
        "location",
        "career_interests",
        "avatar_url",
    ]
    set_clause = ", ".join(f"{field} = %s" for field in allowed_fields if field in update_data)
    values = [update_data[field] for field in allowed_fields if field in update_data]

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE profile
                SET {set_clause}, updated_at = NOW()
                WHERE id = (SELECT id FROM profile ORDER BY id LIMIT 1)
                RETURNING id, name, university, degree, bio, email, phone, location,
                          career_interests, avatar_url
                """,
                values,
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")

    return row


@app.post("/api/admin/experiences")
def create_experience(
    experience: ExperienceCreate,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO experiences (
                    organization, role, location, start_date, end_date, category,
                    description, achievements, display_order
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, organization, role, location, start_date, end_date,
                          category, description, achievements, display_order
                """,
                (
                    experience.organization,
                    experience.role,
                    experience.location,
                    experience.start_date,
                    experience.end_date,
                    experience.category,
                    experience.description,
                    experience.achievements,
                    experience.display_order,
                ),
            )
            row = cur.fetchone()

    return normalize_experience(row)


@app.post("/api/admin/projects")
def create_project(project: ProjectCreate, authorization: str | None = Header(default=None)):
    require_admin(authorization)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO projects (
                    title, category, tools, description, outcome,
                    related_experience_id, display_order
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, title, category, tools, description, outcome,
                          related_experience_id, created_at, display_order
                """,
                (
                    project.title,
                    project.category,
                    project.tools,
                    project.description,
                    project.outcome,
                    project.related_experience_id,
                    project.display_order,
                ),
            )
            row = cur.fetchone()

    return normalize_project(row)


@app.post("/api/admin/skills")
def create_skill(skill: SkillCreate, authorization: str | None = Header(default=None)):
    require_admin(authorization)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO skills (skill_name, skill_type, level, evidence, display_order)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, skill_name, skill_type, level, evidence, display_order
                """,
                (
                    skill.skill_name,
                    skill.skill_type,
                    skill.level,
                    skill.evidence,
                    skill.display_order,
                ),
            )
            row = cur.fetchone()

    return row


@app.put("/api/admin/projects/{project_id}")
def update_project(
    project_id: int,
    project: ProjectUpdate,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    update_data = project.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    allowed_fields = [
        "title",
        "category",
        "tools",
        "description",
        "outcome",
        "related_experience_id",
        "display_order",
    ]
    set_clause = ", ".join(f"{field} = %s" for field in allowed_fields if field in update_data)
    values = [update_data[field] for field in allowed_fields if field in update_data]
    values.append(project_id)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE projects
                SET {set_clause}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, title, category, tools, description, outcome,
                          related_experience_id, created_at, display_order
                """,
                values,
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    return normalize_project(row)


@app.delete("/api/admin/projects/{project_id}")
def delete_project(
    project_id: int,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM projects WHERE id = %s RETURNING id",
                (project_id,),
            )
            deleted = cur.fetchone()

    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"status": "success", "deleted_id": deleted["id"]}


@app.put("/api/admin/skills/{skill_id}")
def update_skill(
    skill_id: int,
    skill: SkillUpdate,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    update_data = skill.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    allowed_fields = [
        "skill_name",
        "skill_type",
        "level",
        "evidence",
        "display_order",
    ]
    set_clause = ", ".join(f"{field} = %s" for field in allowed_fields if field in update_data)
    values = [update_data[field] for field in allowed_fields if field in update_data]
    values.append(skill_id)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE skills
                SET {set_clause}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, skill_name, skill_type, level, evidence, display_order
                """,
                values,
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Skill not found")

    return row


@app.delete("/api/admin/skills/{skill_id}")
def delete_skill(
    skill_id: int,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM skills WHERE id = %s RETURNING id",
                (skill_id,),
            )
            deleted = cur.fetchone()

    if not deleted:
        raise HTTPException(status_code=404, detail="Skill not found")

    return {"status": "success", "deleted_id": deleted["id"]}


@app.get("/api/admin/messages")
def get_admin_messages(authorization: str | None = Header(default=None)):
    require_admin(authorization)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, visitor_name, email, company, content, created_at, status
                FROM messages
                ORDER BY created_at DESC
                """
            )
            rows = cur.fetchall()

    return rows


@app.put("/api/admin/experiences/{experience_id}")
def update_experience(
    experience_id: int,
    experience: ExperienceUpdate,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    update_data = experience.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    allowed_fields = [
        "organization",
        "role",
        "location",
        "start_date",
        "end_date",
        "category",
        "description",
        "achievements",
        "display_order",
    ]
    set_clause = ", ".join(f"{field} = %s" for field in allowed_fields if field in update_data)
    values = [update_data[field] for field in allowed_fields if field in update_data]
    values.append(experience_id)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE experiences
                SET {set_clause}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, organization, role, location, start_date, end_date,
                          category, description, achievements, display_order
                """,
                values,
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Experience not found")

    return normalize_experience(row)


@app.delete("/api/admin/experiences/{experience_id}")
def delete_experience(
    experience_id: int,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM experiences WHERE id = %s RETURNING id",
                (experience_id,),
            )
            deleted = cur.fetchone()

    if not deleted:
        raise HTTPException(status_code=404, detail="Experience not found")

    return {"status": "success", "deleted_id": deleted["id"]}


@app.get("/{file_path:path}", include_in_schema=False)
def serve_frontend_file(file_path: str):
    target = (FRONTEND_DIR / file_path).resolve()
    frontend_root = FRONTEND_DIR.resolve()

    if not str(target).startswith(str(frontend_root)) or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(target)
