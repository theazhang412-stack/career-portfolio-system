const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "";
let activeFilter = "all";

const TYPE_LABELS = {
    "finance": "Finance",
    "ai": "AI",
    "international-development": "International Development",
};

async function fetchJSON(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value || "";
    }
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

function typeQuery() {
    return activeFilter === "all" ? "" : `?type=${encodeURIComponent(activeFilter)}`;
}

function createTypeTags(types = []) {
    const wrapper = createElement("div", "type-tags");
    types.forEach((type) => {
        wrapper.appendChild(createElement("span", "type-tag", TYPE_LABELS[type] || type));
    });
    return wrapper;
}

async function loadProfile() {
    try {
        const profile = await fetchJSON("/api/profile");
        setText("bio", profile.bio);
        setText("university", profile.university);
        setText("degree", profile.degree);
        setText("profile-name", profile.name);
        setText("profile-location", profile.location);
        setText("profile-email", profile.email);
        setText("profile-phone", profile.phone);

        document.getElementById("profile-email-row").hidden = !profile.email;
        document.getElementById("profile-phone-row").hidden = !profile.phone;

        const tagsContainer = document.getElementById("career-tags");
        const focusList = document.getElementById("profile-focus-list");
        tagsContainer.replaceChildren();
        focusList.replaceChildren();

        const featuredInterests = [
            "ESG",
            "Finance",
            "AI",
            "International Development",
        ];

        featuredInterests.forEach((interest, index) => {
            tagsContainer.appendChild(createElement("span", "", interest));
            if (index < featuredInterests.length - 1) {
                tagsContainer.appendChild(document.createElement("i"));
            }
        });

        (profile.career_interests || featuredInterests).forEach((interest) => {
            focusList.appendChild(createElement("span", "", interest));
        });
    } catch (error) {
        console.error("Failed to load profile:", error);
    }
}

async function loadExperiences() {
    const list = document.getElementById("experiences-list");

    try {
        const experiences = await fetchJSON(`/api/experiences${typeQuery()}`);
        list.replaceChildren();

        if (!experiences.length) {
            list.appendChild(createElement("p", "loading-state", "No experience is tagged for this focus area yet."));
            return;
        }

        experiences.forEach((experience) => {
            const item = createElement("article", "experience-item");
            const period = createElement("p", "experience-period", experience.period);
            const title = createElement("div", "experience-title");
            const details = createElement("div", "experience-description");

            if (Array.isArray(experience.highlights) && experience.highlights.length) {
                const highlights = createElement("ul", "experience-highlights");
                experience.highlights.forEach((highlight) => {
                    highlights.appendChild(createElement("li", "", highlight));
                });
                details.appendChild(highlights);
            } else {
                details.appendChild(createElement("p", "", experience.description));
            }

            title.append(
                createElement("h3", "", experience.organization),
                createElement("p", "", experience.role),
                createTypeTags(experience.types)
            );
            item.append(period, title, details);
            list.appendChild(item);
        });
    } catch (error) {
        console.error("Failed to load experiences:", error);
        list.replaceChildren(createElement("p", "loading-state", "Experience could not be loaded. Please check the backend service."));
    }
}

async function loadProjects() {
    const list = document.getElementById("projects-list");

    try {
        const projects = await fetchJSON(`/api/projects${typeQuery()}`);
        list.replaceChildren();

        if (!projects.length) {
            list.appendChild(createElement("p", "loading-state light", "No project is tagged for this focus area yet."));
            return;
        }

        projects.forEach((project, index) => {
            const item = createElement("article", "project-item");
            const footer = createElement("div", "project-footer");

            footer.append(
                createElement("span", "", project.tools),
                createElement("span", "", "↗")
            );

            item.append(
                createElement("p", "project-number", String(index + 1).padStart(2, "0")),
                createTypeTags(project.types),
                createElement("h3", "", project.title),
                createElement("p", "project-description", `${project.description} ${project.outcome}`),
                footer
            );
            list.appendChild(item);
        });
    } catch (error) {
        console.error("Failed to load projects:", error);
        list.replaceChildren(createElement("p", "loading-state light", "Projects could not be loaded. Please check the backend service."));
    }
}

async function loadSkills() {
    const list = document.getElementById("skills-list");

    try {
        const skills = await fetchJSON(`/api/skills${typeQuery()}`);
        list.replaceChildren();

        if (!skills.length) {
            list.appendChild(createElement("p", "loading-state", "No skill is tagged for this focus area yet."));
            return;
        }

        skills.forEach((skill) => {
            const card = createElement("article", "skill-item");
            card.append(
                createElement("h3", "", skill.skill_name),
                createElement(
                    "p",
                    "skill-meta",
                    [skill.skill_type, skill.level].filter(Boolean).join(" · ")
                ),
                createTypeTags(skill.types),
                createElement("p", "skill-evidence", skill.evidence)
            );
            list.appendChild(card);
        });
    } catch (error) {
        console.error("Failed to load skills:", error);
        list.replaceChildren(createElement("p", "loading-state", "Skills could not be loaded. Please check the backend service."));
    }
}

async function submitContactForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector("button");
    const status = document.getElementById("form-status");
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    button.disabled = true;
    status.textContent = "Sending…";

    try {
        const result = await fetchJSON("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        status.textContent = result.message;
        form.reset();
    } catch (error) {
        console.error("Failed to send message:", error);
        status.textContent = "Message could not be sent. Please try again.";
    } finally {
        button.disabled = false;
    }
}

function setupPortfolioFilters() {
    const buttons = document.querySelectorAll(".filter-button");

    buttons.forEach((button) => {
        button.addEventListener("click", async () => {
            activeFilter = button.dataset.filter || "all";

            buttons.forEach((item) => {
                item.classList.toggle("is-active", item === button);
            });

            await Promise.allSettled([
                loadExperiences(),
                loadProjects(),
                loadSkills(),
            ]);
        });
    });
}

document.getElementById("current-year").textContent = new Date().getFullYear();
document.getElementById("contact-form").addEventListener("submit", submitContactForm);
setupPortfolioFilters();

Promise.allSettled([
    loadProfile(),
    loadExperiences(),
    loadProjects(),
    loadSkills(),
]);
