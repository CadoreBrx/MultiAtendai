-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT,
    "numero" TEXT NOT NULL,
    "fotoPerfil" TEXT,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "valor" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Contato" ("createdAt", "fotoPerfil", "id", "nome", "numero", "updatedAt") SELECT "createdAt", "fotoPerfil", "id", "nome", "numero", "updatedAt" FROM "Contato";
DROP TABLE "Contato";
ALTER TABLE "new_Contato" RENAME TO "Contato";
CREATE UNIQUE INDEX "Contato_numero_key" ON "Contato"("numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
