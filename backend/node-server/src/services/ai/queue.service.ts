import { proccessAndStore } from "../ingest/ingest.service.js";

interface QueueTask {
  id: string;
  userId: string;
  text: string;
  action: string;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class AIQueue {
  private queue: QueueTask[] = [];
  private processing = false;
  private readonly maxConcurrent = 1; // Ile zadań na raz
  private readonly delay = 500; // Opóźnienie między zadaniami (ms)

  /**
   * Dodaje zadanie do kolejki
   */
  async enqueue(userId: string, text: string, action: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: QueueTask = {
        id: `${Date.now()}-${Math.random()}`,
        userId,
        text,
        action,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      this.queue.push(task);
      console.log(`[Queue] Dodano zadanie ${task.id}. W kolejce: ${this.queue.length}`);

      // Uruchom przetwarzanie jeśli kolejka nie jest aktywna
      if (!this.processing) {
        this.process();
      }
    });
  }

  /**
   * Przetwarza kolejkę
   */
  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      try {
        console.log(`[Queue] Przetwarzam zadanie ${task.id} (akcja: ${task.action})`);
        
        // Wykonaj analizę i zapis
        const result = await proccessAndStore(task.userId, task.text);
        
        // Zwróć wynik
        task.resolve({
          success: true,
          entry: result,
          action: task.action,
          queuePosition: this.queue.length,
        });

        console.log(`[Queue] ✓ Zakończono zadanie ${task.id}`);
      } catch (error) {
        console.error(`[Queue] ✗ Błąd zadania ${task.id}:`, error);
        task.reject(error);
      }

      // Opóźnienie między zadaniami
      if (this.queue.length > 0) {
        await this.sleep(this.delay);
      }
    }

    this.processing = false;
    console.log(`[Queue] Kolejka pusta. Oczekiwanie na nowe zadania.`);
  }

  /**
   * Pomocnicza funkcja sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Zwraca status kolejki
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }
}

// Singleton - jedna instancja kolejki dla całej aplikacji
export const aiQueue = new AIQueue();
