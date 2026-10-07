const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepareProjectConfig, runProjectSetup } = require('../.github/scripts/project-config.cjs');

test('Disabled automation requires no configuration and does not enable itself', () => {
  for (const enabled of [undefined, '', 'false', 'TRUE', '1']) {
    assert.deepEqual(prepareProjectConfig({ enabled }), { active: false });
  }
});
test('Only explicit true enables configured automation', () => {
  assert.deepEqual(prepareProjectConfig({ enabled: 'true', projectNumber: '4', hasToken: true }), { active: true, projectNumber: 4 });
});
test('Enabled automation and manual setup reject missing or invalid configuration', () => {
  for (const mode of [{ enabled: 'true' }, { setup: true }]) {
    assert.throws(() => prepareProjectConfig(mode), /PROJECT_NUMBER/);
    for (const value of ['0', '-1', '1.2', 'abc', '0x10', '9007199254740992']) {
      assert.throws(() => prepareProjectConfig({ ...mode, projectNumber: value, hasToken: true }), /positive integer/);
    }
    assert.throws(() => prepareProjectConfig({ ...mode, projectNumber: '4' }), /PROJECTS_TOKEN/);
  }
});

function setupFixture() {
  const writes = [];
  const options = ['Ready', 'In Progress', 'In Review'];
  const issue = { state: 'open', node_id: 'issue-id' };
  const github = { graphql: async (query, variables) => {
    if (query.startsWith('query')) return { user: { projectV2: { id: 'project-id', fields: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'field-id', name: 'Status', options: options.map(name => ({ name, id: name })) }] } } } };
    writes.push(variables);
    if (query.includes('addProjectV2ItemById')) return { addProjectV2ItemById: { item: { id: 'item-id' } } };
    return {};
  }, rest: { issues: { get: async () => ({ data: issue }) } } };
  return { github, owner: 'peevey', repo: 'vibe_test', projectNumber: 4, issueNumber: '30', confirm: true, writes, options, issue };
}
test('Manual setup requires confirmation and an open issue before writing', async () => {
  for (const change of [f => { f.confirm = false; }, f => { f.issue.state = 'closed'; }, f => { f.issue.pull_request = {}; }, f => { f.issueNumber = 'invalid'; }]) {
    const f = setupFixture(); change(f);
    await assert.rejects(runProjectSetup(f));
    assert.deepEqual(f.writes, []);
  }
});
test('Setup validates all three status options before writing', async () => {
  const f = setupFixture();
  f.options.pop();
  await assert.rejects(runProjectSetup(f), /In Review/);
  assert.deepEqual(f.writes, []);
});
test('Setup adds the chosen issue and writes Ready without activating automation', async () => {
  const f = setupFixture();
  assert.deepEqual(await runProjectSetup(f), { issueNumber: 30, status: 'Ready' });
  assert.deepEqual(f.writes, [
    { project: 'project-id', content: 'issue-id' },
    { project: 'project-id', item: 'item-id', field: 'field-id', option: 'Ready' }
  ]);
});
test('A denied Project write remains a failure', async () => {
  const f = setupFixture();
  const original = f.github.graphql;
  f.github.graphql = async (query, variables) => {
    if (query.startsWith('mutation')) throw new Error('Project write denied');
    return original(query, variables);
  };
  await assert.rejects(runProjectSetup(f), /write denied/);
});
