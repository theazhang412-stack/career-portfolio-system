const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "";
const TOKEN_KEY = "portfolio_admin_token";

const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const loginStatus = document.getElementById("login-status");
const globalStatus = document.getElementById("global-status");

function token() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(value) {
    sessionStorage.setItem(TOKEN_KEY, value);
}

function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
    };
}

async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const detail = typeof data === "object" && data.detail ? data.detail : response.statusText;
        throw new Error(detail);
    }

    return data;
}

function showStatus(message) {
    globalStatus.textContent = message;
    if (message) {
        setTimeout(() => {
            if (globalStatus.textContent === message) globalStatus.textContent = "";
        }, 3500);
    }
}

function confirmSuccess(message) {
    showStatus(message);
    alert(message);
}

function splitLines(value) {
    return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function label(name, field) {
    const wrapper = document.createElement("label");
    if (field.full) wrapper.className = "full";
    const span = document.createElement("span");
    span.textContent = name;
    wrapper.append(span, field.input);
    return wrapper;
}

function input(name, value = "", type = "text") {
    const element = document.createElement("input");
    element.name = name;
    element.type = type;
    element.value = value ?? "";
    return element;
}

function textarea(name, value = "", rows = 4) {
    const element = document.createElement("textarea");
    element.name = name;
    element.rows = rows;
    element.value = Array.isArray(value) ? value.join("\n") : value ?? "";
    return element;
}

function button(text, className = "") {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = text;
    if (className) element.className = className;
    return element;
}

function formActions(onSave, onDelete) {
    const actions = document.createElement("div");
    actions.className = "form-actions full";

    const save = button("Save");
    save.addEventListener("click", onSave);
    actions.appendChild(save);

    if (onDelete) {
        const deleteButton = button("Delete", "danger");
        deleteButton.addEventListener("click", onDelete);
        actions.appendChild(deleteButton);
    }

    return actions;
}

function formValues(form) {
    return Object.fromEntries(new FormData(form).entries());
}

async function loadProfile() {
    const profile = await api("/api/profile");
    const form = document.getElementById("profile-form");
    form.replaceChildren(
        label("Name", { input: input("name", profile.name) }),
        label("University", { input: input("university", profile.university) }),
        label("Degree", { input: input("degree", profile.degree) }),
        label("Email", { input: input("email", profile.email) }),
        label("Phone", { input: input("phone", profile.phone) }),
        label("Location", { input: input("location", profile.location) }),
        label("Career interests", {
            input: textarea("career_interests", profile.career_interests),
            full: true,
        }),
        label("Avatar URL", { input: input("avatar_url", profile.avatar_url), full: true }),
        label("Bio", { input: textarea("bio", profile.bio, 5), full: true }),
        formActions(async () => {
            const values = formValues(form);
            values.career_interests = splitLines(values.career_interests);
            await api("/api/admin/profile", {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify(values),
            });
            confirmSuccess("Profile saved successfully.");
            await loadProfile();
        })
    );
}

function experiencePayload(form) {
    const values = formValues(form);
    return {
        organization: values.organization,
        role: values.role,
        location: values.location || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        category: values.category || null,
        description: values.description || null,
        achievements: splitLines(values.achievements || ""),
        display_order: Number(values.display_order || 0),
    };
}

function renderExperienceForm(experience = {}) {
    const form = document.createElement("form");
    form.className = "admin-card form-grid";
    form.replaceChildren(
        label("Organization", { input: input("organization", experience.organization) }),
        label("Role", { input: input("role", experience.role) }),
        label("Location", { input: input("location", experience.location) }),
        label("Category", { input: input("category", experience.category) }),
        label("Start date", { input: input("start_date", experience.start_date, "date") }),
        label("End date", { input: input("end_date", experience.end_date, "date") }),
        label("Display order", { input: input("display_order", experience.display_order ?? 0, "number") }),
        label("Description", { input: textarea("description", experience.description), full: true }),
        label("Achievements", { input: textarea("achievements", experience.achievements || experience.highlights || []), full: true })
    );
    return form;
}

async function loadExperiences() {
    const createForm = document.getElementById("experience-create-form");
    createForm.replaceChildren(...renderExperienceForm().children);
    createForm.appendChild(formActions(async () => {
        await api("/api/admin/experiences", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(experiencePayload(createForm)),
        });
        confirmSuccess("Experience added successfully.");
        await loadExperiences();
    }));

    const list = document.getElementById("experiences-admin-list");
    const experiences = await api("/api/experiences");
    list.replaceChildren();
    experiences.forEach((experience) => {
        const form = renderExperienceForm(experience);
        form.insertBefore(Object.assign(document.createElement("h3"), { textContent: experience.organization, className: "full" }), form.firstChild);
        form.appendChild(formActions(
            async () => {
                await api(`/api/admin/experiences/${experience.id}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(experiencePayload(form)),
                });
                confirmSuccess("Experience saved successfully.");
                await loadExperiences();
            },
            async () => {
                if (!confirm(`Delete ${experience.organization}?`)) return;
                await api(`/api/admin/experiences/${experience.id}`, {
                    method: "DELETE",
                    headers: authHeaders(),
                });
                confirmSuccess("Experience deleted successfully.");
                await loadExperiences();
            }
        ));
        list.appendChild(form);
    });
}

function projectPayload(form) {
    const values = formValues(form);
    return {
        title: values.title,
        category: values.category || null,
        tools: splitLines(values.tools || ""),
        description: values.description || null,
        outcome: values.outcome || null,
        related_experience_id: values.related_experience_id ? Number(values.related_experience_id) : null,
        display_order: Number(values.display_order || 0),
    };
}

function renderProjectForm(project = {}) {
    const form = document.createElement("form");
    form.className = "admin-card form-grid";
    form.replaceChildren(
        label("Title", { input: input("title", project.title) }),
        label("Category", { input: input("category", project.category) }),
        label("Related experience ID", { input: input("related_experience_id", project.related_experience_id, "number") }),
        label("Display order", { input: input("display_order", project.display_order ?? 0, "number") }),
        label("Tools", { input: textarea("tools", project.tools_list || project.tools || []), full: true }),
        label("Description", { input: textarea("description", project.description), full: true }),
        label("Outcome", { input: textarea("outcome", project.outcome), full: true })
    );
    return form;
}

async function loadProjects() {
    const createForm = document.getElementById("project-create-form");
    createForm.replaceChildren(...renderProjectForm().children);
    createForm.appendChild(formActions(async () => {
        await api("/api/admin/projects", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(projectPayload(createForm)),
        });
        confirmSuccess("Project added successfully.");
        await loadProjects();
    }));

    const list = document.getElementById("projects-admin-list");
    const projects = await api("/api/projects");
    list.replaceChildren();
    projects.forEach((project) => {
        const form = renderProjectForm(project);
        form.insertBefore(Object.assign(document.createElement("h3"), { textContent: project.title, className: "full" }), form.firstChild);
        form.appendChild(formActions(
            async () => {
                await api(`/api/admin/projects/${project.id}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(projectPayload(form)),
                });
                confirmSuccess("Project saved successfully.");
                await loadProjects();
            },
            async () => {
                if (!confirm(`Delete ${project.title}?`)) return;
                await api(`/api/admin/projects/${project.id}`, {
                    method: "DELETE",
                    headers: authHeaders(),
                });
                confirmSuccess("Project deleted successfully.");
                await loadProjects();
            }
        ));
        list.appendChild(form);
    });
}

function skillPayload(form) {
    const values = formValues(form);
    return {
        skill_name: values.skill_name,
        skill_type: values.skill_type || null,
        level: values.level || null,
        evidence: values.evidence || null,
        display_order: Number(values.display_order || 0),
    };
}

function renderSkillForm(skill = {}) {
    const form = document.createElement("form");
    form.className = "admin-card form-grid";
    form.replaceChildren(
        label("Skill name", { input: input("skill_name", skill.skill_name) }),
        label("Skill type", { input: input("skill_type", skill.skill_type) }),
        label("Level", { input: input("level", skill.level) }),
        label("Display order", { input: input("display_order", skill.display_order ?? 0, "number") }),
        label("Evidence", { input: textarea("evidence", skill.evidence), full: true })
    );
    return form;
}

async function loadSkills() {
    const createForm = document.getElementById("skill-create-form");
    createForm.replaceChildren(...renderSkillForm().children);
    createForm.appendChild(formActions(async () => {
        await api("/api/admin/skills", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(skillPayload(createForm)),
        });
        confirmSuccess("Skill added successfully.");
        await loadSkills();
    }));

    const list = document.getElementById("skills-admin-list");
    const skills = await api("/api/skills");
    list.replaceChildren();
    skills.forEach((skill) => {
        const form = renderSkillForm(skill);
        form.insertBefore(Object.assign(document.createElement("h3"), { textContent: skill.skill_name, className: "full" }), form.firstChild);
        form.appendChild(formActions(
            async () => {
                await api(`/api/admin/skills/${skill.id}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(skillPayload(form)),
                });
                confirmSuccess("Skill saved successfully.");
                await loadSkills();
            },
            async () => {
                if (!confirm(`Delete ${skill.skill_name}?`)) return;
                await api(`/api/admin/skills/${skill.id}`, {
                    method: "DELETE",
                    headers: authHeaders(),
                });
                confirmSuccess("Skill deleted successfully.");
                await loadSkills();
            }
        ));
        list.appendChild(form);
    });
}

async function loadMessages() {
    const list = document.getElementById("messages-admin-list");
    const messages = await api("/api/admin/messages", { headers: authHeaders() });
    list.replaceChildren();

    if (!messages.length) {
        const empty = document.createElement("p");
        empty.className = "status";
        empty.textContent = "No HR messages yet.";
        list.appendChild(empty);
        return;
    }

    messages.forEach((message) => {
        const card = document.createElement("article");
        card.className = "admin-card message-card";

        const title = document.createElement("h3");
        title.textContent = message.visitor_name;
        const meta = document.createElement("p");
        meta.className = "message-meta";
        meta.textContent = `${message.email}${message.company ? ` · ${message.company}` : ""} · ${new Date(message.created_at).toLocaleString()} · ${message.status}`;
        const content = document.createElement("p");
        content.textContent = message.content;

        card.append(title, meta, content);
        list.appendChild(card);
    });
}

async function loadDashboard() {
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await Promise.all([
        loadProfile(),
        loadExperiences(),
        loadProjects(),
        loadSkills(),
        loadMessages(),
    ]);
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    loginStatus.textContent = "Logging in…";
    const values = formValues(event.currentTarget);

    try {
        const result = await api("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        setToken(result.access_token);
        loginStatus.textContent = "";
        await loadDashboard();
    } catch (error) {
        loginStatus.textContent = error.message;
    }
});

document.getElementById("logout-button").addEventListener("click", () => {
    clearToken();
    dashboard.classList.add("hidden");
    loginPanel.classList.remove("hidden");
});

if (token()) {
    loadDashboard().catch(() => {
        clearToken();
        dashboard.classList.add("hidden");
        loginPanel.classList.remove("hidden");
    });
}
