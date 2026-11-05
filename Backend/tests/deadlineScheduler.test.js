const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  startDeadlineScheduler,
  stopDeadlineScheduler,
  isDeadlineSchedulerStarted,
} = require('../jobs/deadlineScheduler');

function createFakeCron() {
  const scheduled = [];
  return {
    scheduled,
    validate: (expression) => typeof expression === 'string' && expression.trim() !== '',
    schedule(expression, handler, options) {
      const task = {
        expression,
        handler,
        options,
        destroyed: false,
        async destroy() {
          this.destroyed = true;
        },
        async stop() {
          this.destroyed = true;
        },
      };
      scheduled.push(task);
      return task;
    },
  };
}

describe('deadlineScheduler', () => {
  beforeEach(async () => {
    await stopDeadlineScheduler();
  });

  afterEach(async () => {
    await stopDeadlineScheduler();
  });

  it('tidak mendaftarkan cron di environment test tanpa force', () => {
    const cron = createFakeCron();
    const task = startDeadlineScheduler({ cron, checkDeadlines: async () => ({}) });
    assert.equal(task, null);
    assert.equal(cron.scheduled.length, 0);
    assert.equal(isDeadlineSchedulerStarted(), false);
  });

  it('aktif saat dipanggil dari startup backend', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    assert.match(source, /startDeadlineScheduler\s*\(/);
    assert.match(source, /startBackgroundServices/);
  });

  it('tidak mendaftarkan scheduler dua kali dalam satu instance', () => {
    const cron = createFakeCron();
    const first = startDeadlineScheduler({
      cron,
      force: true,
      checkDeadlines: async () => ({}),
    });
    const second = startDeadlineScheduler({
      cron,
      force: true,
      checkDeadlines: async () => ({}),
    });

    assert.equal(cron.scheduled.length, 1);
    assert.equal(first, second);
    assert.equal(isDeadlineSchedulerStarted(), true);
  });

  it('dapat aktif kembali setelah scheduler dihentikan (simulasi restart)', async () => {
    const cron = createFakeCron();
    startDeadlineScheduler({
      cron,
      force: true,
      checkDeadlines: async () => ({}),
    });
    assert.equal(isDeadlineSchedulerStarted(), true);

    await stopDeadlineScheduler();
    assert.equal(isDeadlineSchedulerStarted(), false);
    assert.equal(cron.scheduled[0].destroyed, true);

    startDeadlineScheduler({
      cron,
      force: true,
      checkDeadlines: async () => ({}),
    });
    assert.equal(cron.scheduled.length, 2);
    assert.equal(isDeadlineSchedulerStarted(), true);
  });

  it('error satu siklus tidak dilempar keluar handler jadwal', async () => {
    const cron = createFakeCron();
    startDeadlineScheduler({
      cron,
      force: true,
      checkDeadlines: async () => {
        throw new Error('gagal siklus');
      },
    });

    await cron.scheduled[0].handler();
  });
});
