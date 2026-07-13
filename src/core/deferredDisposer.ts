export class DeferredDisposer {
  private generation = 0;

  constructor(private readonly dispose: () => void) {}

  mount(): () => void {
    const mountedGeneration = ++this.generation;
    return () => {
      queueMicrotask(() => {
        if (this.generation === mountedGeneration) {
          this.dispose();
        }
      });
    };
  }
}
