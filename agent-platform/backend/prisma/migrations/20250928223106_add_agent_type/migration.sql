-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'dify',
    "url" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Agent" ("apiToken", "createdAt", "id", "isActive", "name", "updatedAt", "url") SELECT "apiToken", "createdAt", "id", "isActive", "name", "updatedAt", "url" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE INDEX "Agent_isActive_idx" ON "Agent"("isActive");
CREATE INDEX "Agent_type_idx" ON "Agent"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
