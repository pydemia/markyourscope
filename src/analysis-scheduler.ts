interface PendingAnalysis {
    version: number;
    timer: ReturnType<typeof setTimeout>;
}

/** Coalesce document edits and ignore work superseded by a newer version. */
export class AnalysisScheduler {
    private readonly pending = new Map<string, PendingAnalysis>();

    constructor(
        private readonly delayMs: number,
        private readonly onReady: (key: string, version: number) => void,
    ) {}

    schedule(key: string, version: number): void {
        this.cancel(key);
        const timer = setTimeout(() => {
            const current = this.pending.get(key);
            if (current?.timer !== timer || current.version !== version) {
                return;
            }
            this.pending.delete(key);
            this.onReady(key, version);
        }, this.delayMs);
        this.pending.set(key, { version, timer });
    }

    isPending(key: string, version: number): boolean {
        return this.pending.get(key)?.version === version;
    }

    cancel(key: string): void {
        const current = this.pending.get(key);
        if (current) clearTimeout(current.timer);
        this.pending.delete(key);
    }

    dispose(): void {
        for (const key of this.pending.keys()) this.cancel(key);
    }
}
