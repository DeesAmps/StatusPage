-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "latestIncidentAt" TIMESTAMP(3),
ADD COLUMN     "latestIncidentSummary" TEXT,
ADD COLUMN     "latestIncidentTitle" TEXT;
