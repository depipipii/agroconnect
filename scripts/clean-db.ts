
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Step 1: Backup database
const dbPath = path.join(process.cwd(), "data", "sensor.db");
const backupPath = path.join(process.cwd(), "data", "sensor_backup.db");

if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log("✅ Backup berhasil: data/sensor_backup.db");
} else {
  console.error("❌ File database tidak ditemukan!");
  process.exit(1);
}

// Connect to database
const db = new Database(dbPath);

// Step 2: Count data before cleaning
const countBefore = db.prepare("SELECT COUNT(*) as count FROM readings").get() as { count: number };
console.log(`\n📊 Jumlah data sebelum dibersihkan: ${countBefore.count}`);

// Step 3 & 4: Clean data and reset autoincrement
const deleteStmt = db.prepare("DELETE FROM readings");
deleteStmt.run();

const resetAutoincrementStmt = db.prepare("DELETE FROM sqlite_sequence WHERE name='readings'");
resetAutoincrementStmt.run();

console.log("✅ Data tabel readings berhasil dihapus");
console.log("✅ Autoincrement/id berhasil direset");

// Step 5: Verify data count
const countAfter = db.prepare("SELECT COUNT(*) as count FROM readings").get() as { count: number };
console.log(`📊 Jumlah data setelah dibersihkan: ${countAfter.count}`);

console.log("\n✨ Pembersihan database selesai!");
