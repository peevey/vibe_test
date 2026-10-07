const { test } = require('node:test');
const assert = require('node:assert/strict');
const update = require('../.github/scripts/preview-comments.cjs');

test('Preview comment uses deployed URL, updates the bot comment and does not duplicate it', async () => {
  const comments = [{ id: 1, user: { login: 'peevey' }, body: '<!-- vibe-test-pr-preview --> user text' }];
  const created = [], updated = [];
  const github = {
    rest: { issues: {
      listComments() {},
      createComment: async data => {
        created.push(data);
        comments.push({ id: 2, user: { login: 'github-actions[bot]' }, body: data.body });
      },
      updateComment: async data => {
        updated.push(data);
        comments.find(c => c.id === data.comment_id).body = data.body;
      }
    } },
    paginate: async () => comments
  };
  const options = { github, owner: 'peevey', repo: 'vibe_test', previews: [{ number: 4, path: 'previews/pr-4/' }], baseUrl: 'https://peevey.github.io/vibe_test/' };
  await update(options);
  assert.equal(created.length, 1);
  assert.equal(created[0].issue_number, 4);
  assert.match(created[0].body, /https:\/\/peevey.github.io\/vibe_test\/previews\/pr-4\//);
  await update(options);
  assert.equal(created.length, 1);
  assert.equal(updated.length, 0);
  comments[1].body = '<!-- vibe-test-pr-preview --> old link';
  await update(options);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].comment_id, 2);
  assert.equal(comments[0].body, '<!-- vibe-test-pr-preview --> user text');
});

test('No published previews means no comments', async () => {
  await update({ github: {}, previews: [] });
});
