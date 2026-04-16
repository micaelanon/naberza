# Tasks Module

## Purpose
Personal task management with priorities, dates, and persistent/recurring tasks.

## Key Entities
- `Task` — personal task with status, priority, due date

## Key Operations
- CRUD
- Toggle completion
- Set priority / due date
- Link to source inbox item

## Phase Implementation
- Phase 1: Core CRUD and views (today, upcoming, persistent, completed)
- Phase 3+: Task assignment, recurring task expansion

## TODO
- [ ] Prisma schema for Task
- [ ] Task service (CRUD, views)
- [ ] API routes: GET /tasks, POST /tasks, PATCH /tasks/:id, DELETE /tasks/:id
- [ ] Event emission (task.created, task.completed, task.overdue)
- [ ] Tests
