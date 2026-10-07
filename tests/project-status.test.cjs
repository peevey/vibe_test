const { test } = require('node:test');
const assert = require('node:assert/strict');
const { processEvent, setProjectStatus } = require('../.github/scripts/project-status.cjs');

function fixture(eventName, conclusion = 'success') {
  const pull = { number: 30, state: 'open', draft: false, base: { ref: 'main' }, head: { sha: 'current', repo: { full_name: 'peevey/vibe_test' } } };
  const issue = { node_id: 'issue-id', state: 'open', labels: [{ name: 'workflow:ready' }] };
  const checks = eventName === 'workflow_run'
    ? [{ name: 'browser-tests', conclusion, app: { slug: 'github-actions' } }]
    : [];
  const changes = [];
  const linkedPulls = eventName === 'issues' ? [] : [
    { number: pull.number, state: 'OPEN', baseRefName: 'main', headRepository: { nameWithOwner: 'peevey/vibe_test' } }
  ];
  const pageInfo = { hasNextPage: false };
  const github = {
    rest: {
      issues: { get: async () => ({ data: issue }) },
      pulls: { get: async () => ({ data: structuredClone(pull) }) },
      repos: { listPullRequestsAssociatedWithCommit() {} },
      checks: { listForRef() {} }
    },
    paginate: async method => method === github.rest.checks.listForRef ? checks : [pull],
    graphql: async () => ({ repository: {
      issue: { closedByPullRequestsReferences: { pageInfo, nodes: linkedPulls } },
      pullRequest: { closingIssuesReferences: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'issue-id', number: 22, repository: { nameWithOwner: 'peevey/vibe_test' } }] } }
    } })
  };
  const context = { repo: { owner: 'peevey', repo: 'vibe_test' }, eventName, payload: {
    action: 'labeled', label: { name: 'workflow:ready' },
    issue: { number: 22 }, pull_request: structuredClone(pull),
    workflow_run: { event: 'pull_request', head_sha: 'current', conclusion }
  } };
  return { github, context, update: async (id, status) => changes.push({ id, status }), issue, pull, changes, checks, linkedPulls, pageInfo };
}

function linkPull(f) {
  f.linkedPulls.push({ number: f.pull.number, state: 'OPEN', baseRefName: 'main', headRepository: { nameWithOwner: 'peevey/vibe_test' } });
}

test('Refinement sets Ready; implementation label sets In Progress', async () => {
  const f = fixture('issues');
  await processEvent(f);
  f.issue.labels.push({ name: 'workflow:in-progress' });
  f.context.payload.label.name = 'workflow:in-progress';
  await processEvent(f);
  assert.deepEqual(f.changes.map(c => c.status), ['Ready', 'In Progress']);
});
test('Removed labels, unrelated labels and obsolete queued commands do not move the board', async () => {
  for (const change of [
    f => { f.context.payload.action = 'unlabeled'; },
    f => { f.context.payload.label.name = 'workflow:other'; },
    f => { f.issue.labels = []; },
    f => { f.issue.state = 'closed'; },
    f => { f.issue.pull_request = {}; }
  ]) {
    const f = fixture('issues');
    change(f);
    await processEvent(f);
    assert.deepEqual(f.changes, []);
  }
});
test('Delayed Ready and implementation commands preserve a green linked PR in review', async () => {
  for (const label of ['workflow:ready', 'workflow:in-progress']) {
    const f = fixture('issues');
    f.issue.labels = [label];
    f.context.payload.label.name = label;
    linkPull(f);
    f.checks.push({ name: 'browser-tests', conclusion: 'success', app: { slug: 'github-actions' } });
    await processEvent(f);
    assert.deepEqual(f.changes, [{ id: 'issue-id', status: 'In Review' }]);
  }
});
test('An active PR keeps label commands in progress until its current tests pass', async () => {
  for (const conclusion of ['failure', null, 'cancelled', 'skipped', 'missing']) {
    const f = fixture('issues');
    linkPull(f);
    if (conclusion !== 'missing') f.checks.push({ name: 'browser-tests', conclusion, app: { slug: 'github-actions' } });
    await processEvent(f);
    assert.equal(f.changes[0].status, 'In Progress');
  }
});
test('Draft PRs remain in progress even with green tests', async () => {
  const f = fixture('issues');
  linkPull(f);
  f.pull.draft = true;
  f.checks.push({ name: 'browser-tests', conclusion: 'success', app: { slug: 'github-actions' } });
  await processEvent(f);
  assert.equal(f.changes[0].status, 'In Progress');
});
test('Merged PRs, forks and other target branches do not override refinement', async () => {
  for (const change of [
    f => { f.linkedPulls[0].state = 'MERGED'; },
    f => { f.linkedPulls[0].headRepository.nameWithOwner = 'other/fork'; },
    f => { f.linkedPulls[0].baseRefName = 'other'; },
    f => { f.pull.state = 'closed'; }
  ]) {
    const f = fixture('issues');
    linkPull(f);
    change(f);
    await processEvent(f);
    assert.equal(f.changes[0].status, 'Ready');
  }
});
test('Ambiguous or truncated PR references fail without a board write', async () => {
  for (const event of ['issues', 'pull_request_target', 'workflow_run']) {
    for (const change of [f => { linkPull(f); f.linkedPulls.at(-1).number = 31; }, f => { f.pageInfo.hasNextPage = true; }]) {
      const f = fixture(event);
      if (event === 'issues') linkPull(f);
      change(f);
      await assert.rejects(processEvent(f), /multiple active PRs|pagination required/);
      assert.deepEqual(f.changes, []);
    }
  }
});
test('A commit pushed during the check lookup does not inherit old green tests', async () => {
  for (const event of ['issues', 'pull_request_target', 'workflow_run']) {
    const f = fixture(event);
    if (event === 'issues') linkPull(f);
    f.checks.splice(0, f.checks.length, { name: 'browser-tests', conclusion: 'success', app: { slug: 'github-actions' } });
    const paginate = f.github.paginate;
    f.github.paginate = async (method, args) => {
      const result = await paginate(method, args);
      if (method === f.github.rest.checks.listForRef) {
        assert.equal(args.ref, 'current');
        f.pull.head.sha = 'new-untested-commit';
      }
      return result;
    };
    await processEvent(f);
    if (event === 'issues') assert.equal(f.changes[0].status, 'In Progress');
    else assert.deepEqual(f.changes, []);
  }
});
test('Only successful current PR tests set In Review', async () => {
  const f = fixture('workflow_run');
  await processEvent(f);
  assert.equal(f.changes[0].status, 'In Review');
  const failed = fixture('workflow_run', 'failure');
  await processEvent(failed);
  assert.equal(failed.changes[0].status, 'In Progress');
  f.changes.length = 0;
  f.context.payload.workflow_run.head_sha = 'old';
  await processEvent(f);
  assert.deepEqual(f.changes, []);
});
test('Closed issues, draft PRs, forks and main test runs are not advanced', async () => {
  for (const change of [f => { f.issue.state = 'closed'; }, f => { f.pull.draft = true; }, f => { f.pull.head.repo.full_name = 'other/fork'; }, f => { f.context.payload.workflow_run.event = 'push'; }]) {
    const f = fixture('workflow_run'); change(f); await processEvent(f); assert.deepEqual(f.changes, []);
  }
});
test('New PR changes set In Progress; delayed event preserves green checks', async () => {
  const f = fixture('pull_request_target');
  await processEvent(f);
  assert.equal(f.changes[0].status, 'In Progress');
  f.checks.push({ name: 'browser-tests', conclusion: 'success', app: { slug: 'github-actions' } });
  await processEvent(f);
  assert.equal(f.changes[1].status, 'In Review');
});
test('A superseded successful run does not advance an issue during a rerun', async () => {
  const f = fixture('workflow_run');
  f.checks[0].conclusion = null;
  await processEvent(f);
  assert.equal(f.changes[0].status, 'In Progress');
});
test('Project mutation uses the correct single-select status option', async () => {
  const calls = [];
  const github = { graphql: async (query, variables) => {
    calls.push(variables);
    if (query.startsWith('query')) return { user: { projectV2: { id: 'project', fields: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'status-field', name: 'Status', options: [{ id: 'review-option', name: 'In review' }] }] } } } };
    if (query.includes('addProjectV2ItemById')) return { addProjectV2ItemById: { item: { id: 'item' } } };
    return {};
  } };
  await setProjectStatus({ github, owner: 'peevey', projectNumber: 1, contentId: 'issue', status: 'In Review' });
  assert.deepEqual(calls[2], { project: 'project', item: 'item', field: 'status-field', option: 'review-option' });
  await assert.rejects(setProjectStatus({ github, owner: 'peevey', projectNumber: 1, contentId: 'issue', status: 'Missing' }), /option missing/);
});
