const { test } = require('node:test');
const assert = require('node:assert/strict');
const select = require('../.github/scripts/tested-main.cjs');

const oldSha = 'a'.repeat(40), newSha = 'b'.repeat(40), untestedSha = 'c'.repeat(40);
function run(sha, number) {
  return { id: number, run_number: number, head_sha: sha, head_branch: 'main',
    event: 'push', status: 'completed', conclusion: 'success' };
}
function fixture() {
  const f = { head: newSha, runs: [run(oldSha, 10), run(newSha, 20)],
    checks: new Map(), checked: [], comparisons: [], order: [oldSha, newSha, untestedSha] };
  const github = {
    rest: {
      actions: { listWorkflowRuns() {} },
      checks: { listForRef() {} },
      repos: {
        getBranch: async () => ({ data: { commit: { sha: f.head } } }),
        compareCommits: async ({ base, head }) => {
          f.comparisons.push({ base, head });
          const a = f.order.indexOf(base), b = f.order.indexOf(head);
          const status = a === -1 || b === -1 ? 'diverged' : a === b ? 'identical' : b > a ? 'ahead' : 'behind';
          return { data: { status } };
        }
      }
    },
    paginate: async (method, args) => {
      if (method === github.rest.actions.listWorkflowRuns) {
        assert.equal(args.workflow_id, 'tests.yml');
        assert.equal(args.branch, 'main');
        assert.equal(args.event, 'push');
        assert.equal(args.status, 'success');
        return f.runs;
      }
      assert.equal(args.filter, 'latest');
      f.checked.push(args.ref);
      return f.checks.get(args.ref) ?? [{ name: 'browser-tests', status: 'completed', conclusion: 'success', app: { slug: 'github-actions' } }];
    }
  };
  return Object.assign(f, { github, owner: 'peevey', repo: 'vibe_test' });
}

test('An older run finishing last cannot roll Pages back from a newer green main commit', async () => {
  const f = fixture();
  assert.deepEqual(await select(f), { sha: newSha, runId: 20 });
  assert.deepEqual(f.checked, [newSha]);
});
test('Commit ancestry wins even if push test runs were created out of order', async () => {
  const f = fixture();
  f.head = untestedSha;
  f.runs = [run(oldSha, 30), run(newSha, 20)];
  assert.deepEqual(await select(f), { sha: newSha, runId: 20 });
});
test('PR deployments retain the last green main version while a newer main is untested', async () => {
  const f = fixture();
  f.head = untestedSha;
  assert.deepEqual(await select(f), { sha: newSha, runId: 20 });
  assert.ok(!f.checked.includes(untestedSha));
});
test('Pending, failed, cancelled and skipped reruns cannot reuse an earlier green result', async () => {
  for (const [status, conclusion] of [
    ['in_progress', null], ['queued', null], ['completed', 'failure'],
    ['completed', 'cancelled'], ['completed', 'skipped']
  ]) {
    const f = fixture();
    f.checks.set(newSha, [{ name: 'browser-tests', status, conclusion, app: { slug: 'github-actions' } }]);
    assert.deepEqual(await select(f), { sha: oldSha, runId: 10 });
  }
});
test('Only completed successful push runs for main can authorize publication', async () => {
  for (const patch of [
    { head_branch: 'feature' }, { event: 'pull_request' },
    { status: 'in_progress' }, { conclusion: 'failure' }
  ]) {
    const f = fixture();
    f.runs = [{ ...run(newSha, 20), ...patch }];
    await assert.rejects(select(f), /No successfully tested main commit/);
    assert.deepEqual(f.checked, []);
  }
});
test('Commits outside the current main history cannot authorize publication', async () => {
  const f = fixture();
  f.runs = [run('d'.repeat(40), 30), ...f.runs];
  assert.deepEqual(await select(f), { sha: newSha, runId: 20 });
  assert.ok(!f.checked.includes('d'.repeat(40)));
});
test('Missing or unrelated checks and mixed results stop publication without a green fallback', async () => {
  for (const checks of [
    [], [{ name: 'other-tests', status: 'completed', conclusion: 'success', app: { slug: 'github-actions' } }],
    [{ name: 'browser-tests', status: 'completed', conclusion: 'success', app: { slug: 'other-app' } }],
    [
      { name: 'browser-tests', status: 'completed', conclusion: 'success', app: { slug: 'github-actions' } },
      { name: 'browser-tests', status: 'completed', conclusion: 'failure', app: { slug: 'github-actions' } }
    ]
  ]) {
    const f = fixture();
    f.runs = [run(newSha, 20)];
    f.checks.set(newSha, checks);
    await assert.rejects(select(f), /No successfully tested main commit/);
  }
  const empty = fixture();
  empty.runs = [];
  await assert.rejects(select(empty), /No successfully tested main commit/);
});
