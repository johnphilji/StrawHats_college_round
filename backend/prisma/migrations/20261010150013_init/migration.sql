-- CreateEnum
CREATE TYPE "PatchStatus" AS ENUM ('DRAFT', 'GENERATING', 'GENERATED', 'VALIDATING', 'VALIDATION_FAILED', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'MERGED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('PENDING', 'MERGING', 'MERGED', 'FAILED', 'REVERTED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('QUEUED', 'BUILDING', 'READY', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeploymentEnvironment" AS ENUM ('PREVIEW', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED', 'PATCH_CREATED', 'PATCH_GENERATION_STARTED', 'PATCH_GENERATED', 'PATCH_VALIDATION_STARTED', 'PATCH_VALIDATED', 'PATCH_VALIDATION_FAILED', 'PATCH_APPROVED', 'PATCH_REJECTED', 'PATCH_MERGED', 'PATCH_CANCELLED', 'RELEASE_CREATED', 'RELEASE_MERGED', 'RELEASE_FAILED', 'RELEASE_REVERTED', 'DEPLOYMENT_STARTED', 'DEPLOYMENT_SUCCEEDED', 'DEPLOYMENT_FAILED', 'DEPLOYMENT_CANCELLED', 'ROLLBACK_STARTED', 'ROLLBACK_SUCCEEDED', 'ROLLBACK_FAILED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "repository_url" TEXT,
    "repository_identifier" TEXT,
    "production_branch" TEXT NOT NULL DEFAULT 'main',
    "owner_id" TEXT NOT NULL,
    "vercel_project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patches" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "summary" TEXT,
    "status" "PatchStatus" NOT NULL DEFAULT 'DRAFT',
    "branch_name" TEXT,
    "base_commit_sha" TEXT,
    "head_commit_sha" TEXT,
    "pull_request_number" INTEGER,
    "pull_request_url" TEXT,
    "files_changed" INTEGER NOT NULL DEFAULT 0,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "validation_passed" BOOLEAN,
    "validation_details" JSONB,
    "created_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "patch_id" TEXT,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'PENDING',
    "source_branch" TEXT,
    "target_branch" TEXT NOT NULL DEFAULT 'main',
    "commit_sha" TEXT,
    "merged_by" TEXT,
    "merged_at" TIMESTAMP(3),
    "version" TEXT,
    "notes" TEXT,
    "previous_release_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "release_id" TEXT,
    "environment" "DeploymentEnvironment" NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "vercel_deployment_id" TEXT,
    "deployment_url" TEXT,
    "alias_url" TEXT,
    "commit_sha" TEXT,
    "branch_name" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "patch_id" TEXT,
    "release_id" TEXT,
    "deployment_id" TEXT,
    "actor_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");

-- CreateIndex
CREATE INDEX "projects_repository_identifier_idx" ON "projects"("repository_identifier");

-- CreateIndex
CREATE INDEX "patches_project_id_idx" ON "patches"("project_id");

-- CreateIndex
CREATE INDEX "patches_status_idx" ON "patches"("status");

-- CreateIndex
CREATE INDEX "patches_created_by_idx" ON "patches"("created_by");

-- CreateIndex
CREATE INDEX "patches_project_id_created_at_idx" ON "patches"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "releases_project_id_idx" ON "releases"("project_id");

-- CreateIndex
CREATE INDEX "releases_patch_id_idx" ON "releases"("patch_id");

-- CreateIndex
CREATE INDEX "releases_status_idx" ON "releases"("status");

-- CreateIndex
CREATE INDEX "releases_project_id_created_at_idx" ON "releases"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_vercel_deployment_id_key" ON "deployments"("vercel_deployment_id");

-- CreateIndex
CREATE INDEX "deployments_project_id_idx" ON "deployments"("project_id");

-- CreateIndex
CREATE INDEX "deployments_release_id_idx" ON "deployments"("release_id");

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "deployments"("status");

-- CreateIndex
CREATE INDEX "deployments_environment_idx" ON "deployments"("environment");

-- CreateIndex
CREATE INDEX "deployments_project_id_created_at_idx" ON "deployments"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_project_id_created_at_idx" ON "audit_logs"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_patch_id_idx" ON "audit_logs"("patch_id");

-- CreateIndex
CREATE INDEX "audit_logs_release_id_idx" ON "audit_logs"("release_id");

-- CreateIndex
CREATE INDEX "audit_logs_deployment_id_idx" ON "audit_logs"("deployment_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "patches" ADD CONSTRAINT "patches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_previous_release_id_fkey" FOREIGN KEY ("previous_release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
