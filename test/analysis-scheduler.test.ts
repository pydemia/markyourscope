import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { AnalysisScheduler } from "../src/analysis-scheduler";

test("only the newest document version becomes ready", async () => {
    const ready: Array<[string, number]> = [];
    const scheduler = new AnalysisScheduler(10, (key, version) =>
        ready.push([key, version]));
    scheduler.schedule("file", 1);
    scheduler.schedule("file", 2);
    assert.equal(scheduler.isPending("file", 1), false);
    assert.equal(scheduler.isPending("file", 2), true);
    await sleep(40);
    assert.deepEqual(ready, [["file", 2]]);
    assert.equal(scheduler.isPending("file", 2), false);
    scheduler.dispose();
});

test("closing a document cancels its queued analysis", async () => {
    const ready: string[] = [];
    const scheduler = new AnalysisScheduler(10, (key) =>
        ready.push(key));
    scheduler.schedule("closed", 3);
    scheduler.cancel("closed");
    await sleep(40);
    assert.deepEqual(ready, []);
    scheduler.dispose();
});
