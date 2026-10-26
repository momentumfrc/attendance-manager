# Architecture

Attendance Manager is a single-page web app backed by a JSON API.

## Repository layout

| Path | Purpose |
| --- | --- |
| `attendance-api/` | Laravel (PHP 8.3) backend: REST API, authentication, console commands |
| `attendance-web/` | Angular frontend, using Angular Material |
| `dev-proxy/` | nginx config that puts both dev servers behind <http://localhost/> |
| `docker-compose.yml` | Development environment: API, web, MariaDB and the proxy |
| `deploy/` | Scripts that build a deployable bundle, and a daily cron script |
| `staging/` | A local OpenLiteSpeed stack for testing the deployment |
| `backup/` | Database backup script |
| `docs/` | Documentation |

## Development topology

In development, the nginx container (`dev-proxy`) serves everything on port 80:

- `/api`, `/auth`, `/sanctum` are proxied to the Laravel container.
- Everything else is proxied to the Angular dev server (`ng serve`, port 4200).

Serving both from one origin means the browser can use cookie-based authentication without CORS.

## API (`attendance-api`)

### Data model

| Model | Description |
| --- | --- |
| `Student` | A team member. Students are records, not users, and cannot log in. Soft-deleted. Holds graduation year and other details. |
| `StudentProfileImage` | A student's photo, stored under `storage/app/public/student_profiles` and processed with `spatie/image`. |
| `AttendanceEvent` | A `check-in` or `check-out` for a student. Soft-deleted, so events can be undone. |
| `AttendanceSession` | Not a table: a database **view** (see the `attendance_sessions` migrations) that pairs each check-in with the next check-out for the same student. A check-in with no check-out is a missed checkout. |
| `MeetingEvent` | Marks the end of a meeting. Registering one checks out all students who are still checked in. |
| `User` | A person who logs in (a mentor or student lead). Soft-deleted. |

Event types are defined in `config/enums.php`.

### Routes and controllers

All routes are in `routes/api.php`, are behind `auth:sanctum`, and map onto a controller
in `app/Http/Controllers`:

- `students`, `student-profile-images`: `StudentController`, `StudentProfileImageController`
- `attendance/events`, `attendance/sessions`: `AttendanceEventController`, `AttendanceSessionController`
- `meetings`: `MeetingEventController`
- `users`, `roles`: `UserController`
- `reports/*`: `ReportController` (meeting lists, per-meeting attendance, student stats)
- `poll`: `PollController`
- `info` is the only unauthenticated route; it reports the deployed git hash.

### Authentication and authorization

- Users log in with Slack through Laravel Socialite (`AuthController`, `SlackSocialiteProvider`).
- Sessions are cookie-based, using Laravel Sanctum's SPA authentication.
- Authorization uses [spatie/laravel-permission](https://spatie.be/docs/laravel-permission).
  Fine-grained permissions such as `student check in` or `delete attendance event` are
  defined in `database/seeders/RolesSeeder.php` and grouped into the `mentor` and
  `student-lead` roles. Controllers check them with `Gate::authorize(...)`.
- A user with no role can log in but cannot use the application.

### Polling

The app does not use websockets. The `poll` endpoint takes a `since` timestamp (and an
optional `until`) and returns every attendance event and student created, updated or
deleted in that window. Soft-deleted rows are included so clients can remove them. This
lets several people use the check-in screens at once and see each other's changes.

### Console commands

Commands live in `app/Console/Commands` and are run with `php artisan <name>`:

| Command | Purpose |
| --- | --- |
| `meetings:end` | Registers an end-of-meeting event if any student is still checked in. `--force` registers it regardless. |
| `validate:attendance` | Finds invalid attendance sessions and tries to repair them. |
| `app:photo-check-fs` | Checks that profile image records and files on disk agree. |

In production, `deploy/scripts/daily.sh` runs `meetings:end` from cron, which is what
makes meeting ends automatic.

## Web (`attendance-web`)

The frontend is a standard Angular module-based app.

- `src/app/app-routing.module.ts` defines the routes: home (check-in and check-out),
  `students`, `reports`, `meetings`, `users`, and `login`.
- `components/` holds one component per page or feature, with shared widgets in `components/reuse/`.
- `services/` has one service per API resource. Components never call `HttpClient` directly.
  `poll.service.ts` drives the periodic polling described above.
- `models/` holds TypeScript types for API payloads.
- `guards/` protects routes: `MustBeLoggedIn`, `MustNotBeLoggedIn`, and a permission-based
  guard that uses the permissions the API reports for the current user.
- `http-interceptors/` applies cross-cutting request behavior: sending credentials, parsing
  dates, and handling errors through `ErrorService`.

The frontend hides or shows features based on the user's permissions, but the API is
what enforces them.

## Deployment

`deploy/deploy.sh` assembles a bundle from the git-tracked files of both projects, writes
a production `.env` from `deploy/deploy.env`, and builds the web app. The API serves
alongside the built frontend, with the git hash recorded for the `info` endpoint.
`staging/` provides a local OpenLiteSpeed setup to try this out before deploying.
