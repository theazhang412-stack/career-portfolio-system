# Career Portfolio Database Design

## Core Tables

| Table | Purpose |
| --- | --- |
| `profile` | Stores basic personal profile information. Usually only one record is needed. |
| `experiences` | Stores internships, work experience, volunteering, and extracurricular experience. |
| `projects` | Stores research, academic, data, ESG, finance, and AI-related projects. |
| `skills` | Stores skills and supporting evidence. |
| `messages` | Stores messages submitted by HR, recruiters, or visitors. |

## Table Fields

### `profile`

| Field | Description |
| --- | --- |
| `id` | Primary key |
| `name` | Full name |
| `university` | University name |
| `degree` | Degree or programme |
| `bio` | Short personal introduction |
| `email` | Contact email |
| `phone` | Contact phone number |
| `location` | Current location |
| `career_interests` | Career interest list |
| `avatar_url` | Avatar or profile image URL |

### `experiences`

| Field | Description |
| --- | --- |
| `id` | Primary key |
| `organization` | Company, NGO, university, or institution name |
| `role` | Position title |
| `location` | Experience location |
| `start_date` | Start date |
| `end_date` | End date; can be empty for current roles |
| `category` | Experience category, such as Finance, ESG, AI, Tech, Charity |
| `description` | Short summary of the experience |
| `achievements` | Key responsibilities or achievements |
| `display_order` | Controls display order on the website |

### `projects`

| Field | Description |
| --- | --- |
| `id` | Primary key |
| `title` | Project title |
| `category` | Project category |
| `tools` | Tools, platforms, or methods used |
| `description` | Project description |
| `outcome` | Project result or output |
| `related_experience_id` | Optional link to an experience record |
| `created_at` | Project creation timestamp |

### `skills`

| Field | Description |
| --- | --- |
| `id` | Primary key |
| `skill_name` | Skill name |
| `skill_type` | Skill category, such as Technical, Finance, Research, Operations |
| `level` | Skill level |
| `evidence` | Evidence showing where or how the skill was used |

### `messages`

| Field | Description |
| --- | --- |
| `id` | Primary key |
| `visitor_name` | Visitor or recruiter name |
| `email` | Visitor email |
| `company` | Company or organisation name |
| `content` | Message content |
| `created_at` | Submission timestamp |
| `status` | Message status, such as new, read, archived |

## Resume-to-Database Mapping

| Resume Content | Database Location | Website Display |
| --- | --- | --- |
| UCL Geography and Economics | `profile` | Homepage profile and education section |
| Barclays Spring Week / return offer | `experiences` | Finance experience |
| UNESCAP-CSAM desertification data work | `experiences` + `projects` | ESG / international development experience and project |
| EY SaT-VME + AI evaluation reports | `experiences` + `projects` | Consulting, valuation, and AI project content |
| Oxfam volunteer sales data / Gift Aid | `experiences` | Charity / social impact experience |
| NetEase Codewave low-code platform | `experiences` + `skills` | Tech / low-code experience and skills section |
