-- Phase 5 (Auth & Users): free-form per-user settings persisted for PATCH /users/me.
ALTER TABLE "users" ADD COLUMN "settings" JSONB;
