const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "";

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
        tagsContainer.replaceChildren();

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
    } catch (error) {
        console.error("Failed to load profile:", error);
    }
}

async function loadExperiences() {
    const list = document.getElementById("experiences-list");

    try {
        const experiences = await fetchJSON("/api/experiences");
        list.replaceChildren();

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
                createElement("span", "experience-category", experience.category)
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
        const projects = await fetchJSON("/api/projects");
        list.replaceChildren();

        projects.forEach((project, index) => {
            const item = createElement("article", "project-item");
            const footer = createElement("div", "project-footer");

            footer.append(
                createElement("span", "", project.tools),
                createElement("span", "", "↗")
            );

            item.append(
                createElement("p", "project-number", String(index + 1).padStart(2, "0")),
                createElement("p", "project-category", project.category),
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
        const skills = await fetchJSON("/api/skills");
        list.replaceChildren();

        skills.forEach((skill) => {
            const card = createElement("article", "skill-item");
            card.append(
                createElement("h3", "", skill.skill_name),
                createElement(
                    "p",
                    "skill-meta",
                    [skill.skill_type, skill.level].filter(Boolean).join(" · ")
                ),
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

document.getElementById("current-year").textContent = new Date().getFullYear();
document.getElementById("contact-form").addEventListener("submit", submitContactForm);

Promise.allSettled([
    loadProfile(),
    loadExperiences(),
    loadProjects(),
    loadSkills(),
]);
