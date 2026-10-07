const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const build = require('../.github/scripts/build-pages.cjs');

test('Build publishes main and same-repository previews and removes closed previews', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-pages-'));
  const refs = [];
  let pulls = [
    { number: 4, head: { sha: 'preview-sha', repo: { full_name: 'peevey/vibe_test' } } },
    { number: 5, head: { sha: 'fork-sha', repo: { full_name: 'someone/fork' } } }
  ];
  const github = {
    rest: {
      repos: {
        getBranch: async () => ({ data: { commit: { sha: 'main-sha' } } }),
        getContent: async ({ ref }) => {
          refs.push(ref);
          return { data: { type: 'file', encoding: 'base64', content: Buffer.from(`<h1>${ref}</h1>`).toString('base64') } };
        }
      },
      pulls: { list() {} }
    },
    paginate: async () => pulls
  };
  try {
    assert.deepEqual(await build({ github, owner: 'peevey', repo: 'vibe_test', output }), [{ number: 4, path: 'previews/pr-4/' }]);
    assert.equal(await fs.readFile(path.join(output, 'index.html'), 'utf8'), '<h1>main-sha</h1>');
    assert.equal(await fs.readFile(path.join(output, 'previews/pr-4/index.html'), 'utf8'), '<h1>preview-sha</h1>');
    assert.deepEqual(refs, ['main-sha', 'preview-sha']);
    pulls = [];
    await build({ github, owner: 'peevey', repo: 'vibe_test', output });
    await assert.rejects(fs.access(path.join(output, 'previews/pr-4/index.html')), { code: 'ENOENT' });
  } finally { await fs.rm(output, { recursive: true, force: true }); }
});
