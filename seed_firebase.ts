import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';

async function runSeed() {
  console.log("Starting Firebase seeding process...");

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error("No firebase-applet-config.json found!");
    process.exit(1);
  }

  const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log("Loaded config for project:", configData.projectId);

  const app = initializeApp(configData);
  const db = configData.firestoreDatabaseId ? getFirestore(app, configData.firestoreDatabaseId) : getFirestore(app);

  const dbPath = path.join(process.cwd(), 'gzq_db.json');
  if (!fs.existsSync(dbPath)) {
    console.error("No gzq_db.json file found at", dbPath);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(dbPath, 'utf8');
  const dbData = JSON.parse(fileContent);
  
  console.log("Successfully read gzq_db.json file. Starting push...");

  // 1. Push gzq_db_store
  const timestamp = new Date().toISOString();
  const docRef = doc(db, 'gzq_db_store', '1');
  await setDoc(docRef, { id: 1, data: dbData, updated_at: timestamp });
  console.log("1/2. Pushed gzq_db_store to Firebase successfully.");

  // 2. Push ingredients list in batches of 500
  if (dbData.ingredients && Array.isArray(dbData.ingredients)) {
    console.log(`Pushing ${dbData.ingredients.length} ingredients to Firebase...`);
    let batch = writeBatch(db);
    let count = 0;

    for (const i of dbData.ingredients) {
      const ingDocRef = doc(db, 'ingredients', String(i.id));
      batch.set(ingDocRef, {
        id: i.id,
        code: i.code || '',
        category_id: i.category_id || 1,
        name: i.name || '',
        bdd: Number(i.bdd) || 100,
        energy: Number(i.energy) || 0,
        protein: Number(i.protein) || 0,
        fat: Number(i.fat) || 0,
        carbohydrate: Number(i.carbohydrate) || 0,
        fiber: Number(i.fiber) || 0,
        price: Number(i.price) || 0,
        created_at: i.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: i.deleted_at || null
      });
      count++;

      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Pushed ${count} ingredients...`);
        batch = writeBatch(db);
      }
    }

    if (count % 500 !== 0) {
      await batch.commit();
      console.log(`Pushed remaining ingredients. Total: ${count}`);
    }
  }

  console.log("Firebase seeding process completed successfully!");
  process.exit(0);
}

runSeed().catch(err => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
