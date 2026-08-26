import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'redirect.js'), 'utf8');

vm.runInThisContext(source, { filename: 'redirect.js' });

const api = globalThis.CivilizedPoolRedirect;

if (!api) {
  throw new Error('CivilizedPoolRedirect API was not exposed');
}

const overrides = JSON.parse(fs.readFileSync(path.join(root, 'tournament-overrides.json'), 'utf8'));

const cases = [
  {
    label: '2026-08-28 00:00 Pacific',
    now: new Date('2026-08-28T07:00:00Z'),
    expectedDateKey: '2026-09-03',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-first-thursday-8-ball-932026/overview',
  },
  {
    label: '2026-09-03 00:00 Pacific',
    now: new Date('2026-09-03T07:00:00Z'),
    expectedDateKey: '2026-09-03',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-first-thursday-8-ball-932026/overview',
  },
  {
    label: '2026-09-10 00:00 Pacific',
    now: new Date('2026-09-10T07:00:00Z'),
    expectedDateKey: '2026-09-10',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-second-thursday-9-ball-9102026/overview',
  },
  {
    label: '2026-09-17 00:00 Pacific',
    now: new Date('2026-09-17T07:00:00Z'),
    expectedDateKey: '2026-09-17',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-third-thursday-ladies-night-8-ball-9172026/overview',
  },
  {
    label: '2026-09-24 00:00 Pacific',
    now: new Date('2026-09-24T07:00:00Z'),
    expectedDateKey: '2026-09-24',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-fourth-thursday-8-and-9-ball-9242026/overview',
  },
  {
    label: '2026-10-01 00:00 Pacific',
    now: new Date('2026-10-01T07:00:00Z'),
    expectedDateKey: '2026-10-01',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-first-thursday-8-ball-1012026/overview',
  },
  {
    label: '2026-10-08 00:00 Pacific',
    now: new Date('2026-10-08T07:00:00Z'),
    expectedDateKey: '2026-10-08',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-second-thursday-9-ball-1082026/overview',
  },
  {
    label: '2026-10-15 00:00 Pacific',
    now: new Date('2026-10-15T07:00:00Z'),
    expectedDateKey: '2026-10-15',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-third-thursday-ladies-night-9-ball-10152026/overview',
  },
  {
    label: '2026-10-22 00:00 Pacific',
    now: new Date('2026-10-22T07:00:00Z'),
    expectedDateKey: '2026-10-22',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-fourth-thursday-8-and-9-ball-10222026/overview',
  },
  {
    label: '2026-10-29 00:00 Pacific',
    now: new Date('2026-10-29T07:00:00Z'),
    expectedDateKey: '2026-10-29',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-fifth-thursday-open-10-ball-10292026/overview',
  },
  {
    label: '2027-04-29 00:00 Pacific fifth Thursday without override',
    now: new Date('2027-04-29T07:00:00Z'),
    expectedStatus: 'fallback',
  },
  {
    label: '2026-11-01 across DST transition',
    now: new Date('2026-11-01T09:30:00Z'),
    expectedDateKey: '2026-11-05',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-first-thursday-8-ball-1152026/overview',
  },
  {
    label: '2026-09-03 23:59 Pacific boundary check',
    now: new Date('2026-09-04T06:59:00Z'),
    expectedDateKey: '2026-09-03',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-first-thursday-8-ball-932026/overview',
  },
  {
    label: '2026-09-04 00:00 Pacific boundary check',
    now: new Date('2026-09-04T07:00:00Z'),
    expectedDateKey: '2026-09-10',
    expectedUrl: 'https://digitalpool.com/tournaments/rodders-second-thursday-9-ball-9102026/overview',
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const testCase of cases) {
  const decision = api.evaluateTournamentDecision({
    now: testCase.now,
    overrides,
  });

  if (testCase.expectedStatus) {
    assert(
      decision.status === testCase.expectedStatus,
      `${testCase.label}: expected status ${testCase.expectedStatus}, got ${decision.status}`,
    );
    continue;
  }

  assert(
    decision.status === 'redirect',
    `${testCase.label}: expected redirect, got ${decision.status}`,
  );
  assert(
    decision.tournamentDateKey === testCase.expectedDateKey,
    `${testCase.label}: expected date ${testCase.expectedDateKey}, got ${decision.tournamentDateKey}`,
  );
  assert(
    decision.url === testCase.expectedUrl,
    `${testCase.label}: expected url ${testCase.expectedUrl}, got ${decision.url}`,
  );
}

console.log(`Verified ${cases.length} redirect cases successfully.`);
