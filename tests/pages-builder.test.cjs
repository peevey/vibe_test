const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const build = require('../.github/scripts/build-pages.cjs');
const mainRef = 'a'.repeat(40);

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
        getBranch: async () => { throw new Error('Builder must not resolve main again'); },
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
    assert.deepEqual(await build({ github, owner: 'peevey', repo: 'vibe_test', output, mainRef }), [{ number: 4, path: 'previews/pr-4/' }]);
    assert.equal(await fs.readFile(path.join(output, 'index.html'), 'utf8'), `<h1>${mainRef}</h1>`);
    assert.equal(await fs.readFile(path.join(output, 'previews/pr-4/index.html'), 'utf8'), '<h1>preview-sha</h1>');
    assert.deepEqual(refs, [mainRef, 'preview-sha']);
    pulls = [];
    await build({ github, owner: 'peevey', repo: 'vibe_test', output, mainRef });
    await assert.rejects(fs.access(path.join(output, 'previews/pr-4/index.html')), { code: 'ENOENT' });
  } finally { await fs.rm(output, { recursive: true, force: true }); }
});

test('Builder rejects moving or missing main references before touching existing output', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-pages-'));
  try {
    await fs.writeFile(path.join(output, 'index.html'), 'existing publication');
    for (const mainRef of [undefined, 'main', 'short-sha']) {
      await assert.rejects(build({ github: {}, owner: 'peevey', repo: 'vibe_test', output, mainRef }), /tested main commit SHA/);
      assert.equal(await fs.readFile(path.join(output, 'index.html'), 'utf8'), 'existing publication');
    }
  } finally { await fs.rm(output, { recursive: true, force: true }); }
});

test('HTML copy preserves the embedded star image on main and preview', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-stars-'));
  const html = await fs.readFile(path.join(__dirname, '../index.html'), 'utf8');
  const github = {
    rest: { repos: { getContent: async ({ path: file }) => {
      assert.equal(file, 'index.html');
      return { data: { type: 'file', encoding: 'base64', content: Buffer.from(html).toString('base64') } };
    } }, pulls: { list() {} } },
    paginate: async () => [{ number: 48, head: { sha: 'preview', repo: { full_name: 'peevey/vibe_test' } } }]
  };
  try {
    await build({ github, owner: 'peevey', repo: 'vibe_test', output, mainRef });
    for (const file of ['index.html', 'previews/pr-48/index.html']) {
      const published = await fs.readFile(path.join(output, file), 'utf8');
      assert.equal(published, html);
      const embedded = published.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
      assert.ok(embedded, 'published HTML must contain the image');
      const image = Buffer.from(embedded[1], 'base64');
      assert.equal(image.toString('ascii', 0, 4), 'RIFF');
      assert.equal(image.toString('ascii', 8, 12), 'WEBP');
    }
  } finally { await fs.rm(output, { recursive: true, force: true }); }
});
