import mongoose from 'mongoose';
import { VaultEntry } from '../models/VaultEntry.js';
import { Synapse } from '../models/Synapse.js';
import dotenv from 'dotenv';

dotenv.config();

// Test user ID - używamy stałego ID dla testów
const TEST_USER_ID = 'test-user-consciousness-001';

// ============================================================================
// TEST DATA: KLASTER A - TECHNOLOGIA
// ============================================================================
const techCluster = [
  {
    rawText: 'Dziś zrobiłem głęboki przegląd architektury MongoDB w naszym projekcie. Zauważyłem, że sharding może być kluczowy dla skalowalności gdy osiągniemy 10 milionów dokumentów.',
    summary: 'Przegląd architektury MongoDB - sharding dla skalowalności',
    tags: ['database', 'backend', 'mongodb', 'architecture'],
    category: 'Learning',
  },
  {
    rawText: 'Mongoose to świetny ODM dla Node.js. Wirtualne pola i middleware pre/post save znacząco upraszczają logikę biznesową. Muszę pamiętać o lean() dla wydajności.',
    summary: 'Mongoose ODM - wirtualne pola, middleware, optymalizacja lean()',
    tags: ['database', 'backend', 'mongoose', 'nodejs'],
    category: 'Learning',
  },
  {
    rawText: 'Express.js vs Fastify - benchmarki pokazują że Fastify jest 2x szybszy. Ale ekosystem pluginów Express jest dużo bogatszy. Dla nowego projektu rozważam Fastify.',
    summary: 'Porównanie Express.js i Fastify - wydajność vs ekosystem',
    tags: ['backend', 'nodejs', 'express', 'fastify', 'performance'],
    category: 'Learning',
  },
  {
    rawText: 'Implementacja wzorca Repository w TypeScript z Mongoose. Abstrakcja warstwy dostępu do danych pozwala na łatwe testowanie jednostkowe z mockami.',
    summary: 'Wzorzec Repository z TypeScript i Mongoose - testowanie',
    tags: ['database', 'backend', 'typescript', 'patterns', 'testing'],
    category: 'Work',
  },
  {
    rawText: 'Redis jako cache dla MongoDB. TTL na 5 minut dla często odpytywanych danych. Zmniejszyło obciążenie bazy o 60%. Warto rozważyć Redis Cluster.',
    summary: 'Redis cache dla MongoDB - 60% redukcja obciążenia',
    tags: ['database', 'backend', 'redis', 'cache', 'performance'],
    category: 'Work',
  },
];

// ============================================================================
// TEST DATA: KLASTER B - PSYCHOLOGIA/NEUROBIOLOGIA
// ============================================================================
const psychCluster = [
  {
    rawText: 'Fascynujące badania o neuroplastyczności mózgu. Nawet w dorosłym wieku możemy tworzyć nowe połączenia neuronalne przez intensywną naukę i ćwiczenia.',
    summary: 'Neuroplastyczność mózgu - nowe połączenia w dorosłym wieku',
    tags: ['brain', 'biology', 'neuroplasticity', 'learning'],
    category: 'Health',
  },
  {
    rawText: 'Fazy snu REM są kluczowe dla konsolidacji pamięci. Podczas snu mózg przetwarza i organizuje informacje z dnia. Stąd znaczenie 7-8 godzin snu.',
    summary: 'Sen REM i konsolidacja pamięci - znaczenie 7-8h snu',
    tags: ['brain', 'biology', 'sleep', 'memory', 'rem'],
    category: 'Health',
  },
  {
    rawText: 'Hipokamp - centrum pamięci długotrwałej. Uszkodzenie hipokampu prowadzi do amnezji anterograde. Ciekawe jak niewielka struktura ma tak ogromne znaczenie.',
    summary: 'Hipokamp - centrum pamięci długotrwałej, amnezja',
    tags: ['brain', 'biology', 'hippocampus', 'memory'],
    category: 'Learning',
  },
  {
    rawText: 'Synapsy i ich plastyczność. Long-term potentiation (LTP) wzmacnia połączenia między neuronami przez powtarzającą się aktywację. To biologiczna podstawa uczenia.',
    summary: 'Plastyczność synaps - LTP jako podstawa uczenia',
    tags: ['brain', 'biology', 'synapses', 'ltp', 'learning'],
    category: 'Learning',
  },
  {
    rawText: 'Kortyzol i stres chroniczny niszczą neurony w hipokampie. Medytacja i ćwiczenia fizyczne pomagają regenerować te struktury. Muszę być bardziej regularny z jogą.',
    summary: 'Kortyzol niszczy hipokamp - medytacja i ćwiczenia pomagają',
    tags: ['brain', 'biology', 'stress', 'cortisol', 'meditation'],
    category: 'Health',
  },
];

// ============================================================================
// TEST DATA: SILNE WSPOMNIENIA (STRENGTH 10) - TEST LTM CONSOLIDATION
// ============================================================================
const strongMemories = [
  {
    rawText: 'Teoria grafów i jej zastosowanie w bazach danych. Graph databases jak Neo4j modelują relacje naturalnie. Cypher query language jest intuicyjny dla traversali.',
    summary: 'Teoria grafów w bazach danych - Neo4j i Cypher',
    tags: ['database', 'graphs', 'neo4j', 'backend'],
    category: 'Learning',
    strength: 10, // Ready for LTM!
  },
  {
    rawText: 'Efekt Zeigarnika - niezakończone zadania pozostają w pamięci dłużej niż zakończone. Mózg tworzy napięcie motywacyjne. Wykorzystuję to w GTD - zamykam otwarte pętle.',
    summary: 'Efekt Zeigarnika - niezakończone zadania w pamięci',
    tags: ['brain', 'psychology', 'memory', 'productivity'],
    category: 'Learning',
    strength: 10, // Ready for LTM!
  },
];

// ============================================================================
// TEST DATA: SZUM (NOISE) - NIEPOWIĄZANE TEMATY
// ============================================================================
const noiseCluster = [
  {
    rawText: 'Przepis na pizzę neapolitańską: mąka tipo 00, drożdże świeże, woda 65% hydratacji. Fermentacja 24-72h w lodówce. Pieczenie w 450°C przez 90 sekund.',
    summary: 'Przepis na pizzę neapolitańską - fermentacja i pieczenie',
    tags: ['cooking', 'pizza', 'recipe', 'italian'],
    category: 'Personal',
    daysOld: 0, // Fresh
  },
  {
    rawText: 'Real Madryt wygrał El Clasico 3:1 z Barceloną. Vinicius z dubletem, Bellingham z golem z główki. Xavi pod ogromną presją po tej porażce.',
    summary: 'El Clasico - Real 3:1 Barcelona, Vinicius dublet',
    tags: ['football', 'sports', 'real-madrid', 'barcelona'],
    category: 'Personal',
    daysOld: 3, // OLD - to test Decay!
  },
  {
    rawText: 'Kupiłem nową kawę specialty z Etiopii Yirgacheffe. Nuty cytrusowe i kwiatowe, lekka kwasowość. Idealna do chemeksa z grubszym mieleniem.',
    summary: 'Kawa specialty Etiopia Yirgacheffe - cytrusy i kwiaty',
    tags: ['coffee', 'specialty', 'ethiopia'],
    category: 'Personal',
    daysOld: 0, // Fresh
  },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================
async function seedTestData(): Promise<void> {
  console.log('\n🧪 ============================================');
  console.log('   SEED TEST DATA - Consciousness Test Suite');
  console.log('============================================\n');

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/brain-app';
  console.log(`📡 Łączę z MongoDB: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Połączono z MongoDB\n');

  // Clean existing test data
  console.log(`🧹 Czyszczę dane testowe dla userId: ${TEST_USER_ID}`);
  
  const deletedEntries = await VaultEntry.deleteMany({ userId: TEST_USER_ID });
  console.log(`   ↳ Usunięto ${deletedEntries.deletedCount} wpisów VaultEntry`);

  // Get all entry IDs for this user before deleting synapses
  const entryIds = await VaultEntry.find({ userId: TEST_USER_ID }).distinct('_id');
  if (entryIds.length > 0) {
    const deletedSynapses = await Synapse.deleteMany({
      $or: [
        { from: { $in: entryIds } },
        { to: { $in: entryIds } },
      ],
    });
    console.log(`   ↳ Usunięto ${deletedSynapses.deletedCount} synaps`);
  }
  console.log('');

  // Helper to create entry
  const now = new Date();
  const createEntry = (data: any, daysOld = 0, customStrength?: number) => ({
    userId: TEST_USER_ID,
    rawText: data.rawText,
    summary: data.summary,
    tags: data.tags,
    category: data.category,
    strength: customStrength ?? data.strength ?? 5, // Use custom, then data.strength, then default 5
    isAnalyzed: false,
    isConsolidated: false,
    lastActivityAt: new Date(now.getTime() - daysOld * 24 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - daysOld * 24 * 60 * 60 * 1000),
  });

  // Insert TECH cluster
  console.log('🔧 KLASTER A: TECHNOLOGIA (5 notatek)');
  const techEntries = techCluster.map(data => createEntry(data, 0));
  const insertedTech = await VaultEntry.insertMany(techEntries);
  insertedTech.forEach((e, i) => {
    console.log(`   ${i + 1}. [${e._id.toString().substring(0, 8)}] ${e.summary?.substring(0, 50)}...`);
  });
  console.log('');

  // Insert PSYCH cluster
  console.log('🧠 KLASTER B: PSYCHOLOGIA/NEUROBIOLOGIA (5 notatek)');
  const psychEntries = psychCluster.map(data => createEntry(data, 0));
  const insertedPsych = await VaultEntry.insertMany(psychEntries);
  insertedPsych.forEach((e, i) => {
    console.log(`   ${i + 1}. [${e._id.toString().substring(0, 8)}] ${e.summary?.substring(0, 50)}...`);
  });
  console.log('');

  // Insert NOISE cluster
  console.log('📢 SZUM: NIEPOWIĄZANE TEMATY (3 notatki)');
  const noiseEntries = noiseCluster.map(data => createEntry(data, data.daysOld || 0));
  const insertedNoise = await VaultEntry.insertMany(noiseEntries);
  insertedNoise.forEach((e, i) => {
    const daysOld = noiseCluster[i].daysOld || 0;
    const ageLabel = daysOld > 0 ? ` ⚠️ ${daysOld} dni temu (test Decay!)` : '';
    console.log(`   ${i + 1}. [${e._id.toString().substring(0, 8)}] ${e.summary?.substring(0, 40)}...${ageLabel}`);
  });
  console.log('');

  // Insert STRONG MEMORIES (strength 10 - ready for LTM)
  console.log('💪 SILNE WSPOMNIENIA: STRENGTH 10 (2 notatki - test LTM)');
  const strongEntries = strongMemories.map(data => createEntry(data, 0));
  const insertedStrong = await VaultEntry.insertMany(strongEntries);
  insertedStrong.forEach((e, i) => {
    console.log(`   ${i + 1}. [${e._id.toString().substring(0, 8)}] 💪 strength:10 - ${e.summary?.substring(0, 40)}...`);
  });
  console.log('');

  // Summary
  const totalEntries = insertedTech.length + insertedPsych.length + insertedNoise.length + insertedStrong.length;
  console.log('📊 PODSUMOWANIE:');
  console.log(`   - Łącznie notatek: ${totalEntries}`);
  console.log(`   - Klaster Tech: ${insertedTech.length}`);
  console.log(`   - Klaster Psych: ${insertedPsych.length}`);
  console.log(`   - Szum: ${insertedNoise.length}`);
  console.log(`   - Silne wspomnienia (strength 10): ${insertedStrong.length}`);
  console.log(`   - Notatki z opóźnionym lastActivityAt: 1 (El Clasico - 3 dni wstecz)`);
  console.log(`   - Domyślne strength: 5 (oprócz silnych wspomnień)`);
  console.log(`   - Wszystkie isAnalyzed: false (czekają na Świadomość)`);
  console.log('');

  console.log('============================================');
  console.log('🚀 Baza nakarmiona. Możesz uruchomić:');
  console.log('   npm run dev:test-conscious   (👁️ Świadomość - analiza + synapsy)');
  console.log('   npm run dev:test-subconscious (🌘 Podświadomość - decay/pruning)');
  console.log('   npm run dev:test-full        (obie rutyny)');
  console.log('============================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

// Run
seedTestData().catch(err => {
  console.error('❌ Błąd seedowania:', err);
  process.exit(1);
});
