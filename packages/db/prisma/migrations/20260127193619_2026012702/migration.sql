-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "notificationSettings" JSONB NOT NULL DEFAULT '{}';
