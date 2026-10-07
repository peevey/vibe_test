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
  const github = {
    rest: {
      issues: { get: async () => ({ data: issue }) },
      pulls: { get: async () => ({ data: pull }) },
      repos: { listPullRequestsAssociatedWithCommit() {} },
      checks: { listForRef() {} }
    },
    paginate: async method => method === github.rest.checks.listForRef ? checks : [pull],
    graphql: async () => ({ repository: { pullRequest: { closingIssuesReferences: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'issue-id', number: 22, repository: { nameWithOwner: 'peevey/vibe_test' } }] } } } })
  };
  const context = { repo: { owner: 'peevey', repo: 'vibe_test' }, eventName, payload: {
    issue: { number: 22 }, pull_request: structuredClone(pull),
    workflow_run: { event: 'pull_request', head_sha: 'current', conclusion }
  } };
  return { github, context, update: async (id, status) => changes.push({ id, status }), issue, pull, changes, checks };
}

test('Refinement sets Ready; implementation label sets In Progress', async () => {
  const f = fixture('issues');
  await processEvent(f);
  f.issue.labels.push({ name: 'workflow:in-progress' });
  await processEvent(f);
  assert.deepEqual(f.changes.map(c => c.status), ['Ready', 'In Progress']);
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
    if (query.startsWith('query')) return { user: { projectV2: { id: 'project', fields: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'status-field', name: 'Status', options: [{ id: 'review-option', name: 'In Review' }] }] } } } };
    if (query.includes('addProjectV2ItemById')) return { addProjectV2ItemById: { item: { id: 'item' } } };
    return {};
  } };
  await setProjectStatus({ github, owner: 'peevey', projectNumber: 1, contentId: 'issue', status: 'In Review' });
  assert.deepEqual(calls[2], { project: 'project', item: 'item', field: 'status-field', option: 'review-option' });
  await assert.rejects(setProjectStatus({ github, owner: 'peevey', projectNumber: 1, contentId: 'issue', status: 'Missing' }), /option missing/);
});
