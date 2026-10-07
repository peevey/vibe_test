const fs = require('node:fs/promises');
const path = require('node:path');

// Only copy HTML as data. Never execute pull-request scripts or install their dependencies.
module.exports = async function buildPages({ github, owner, repo, output }) {
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  const main = await github.rest.repos.getBranch({ owner, repo, branch: 'main' });
  async function copyIndex(ref, destination) {
    const { data } = await github.rest.repos.getContent({ owner, repo, path: 'index.html', ref });
    if (data.type !== 'file' || data.encoding !== 'base64' || !data.content) {
      throw new Error('index.html must be a readable file');
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, Buffer.from(data.content, 'base64'));
  }
  await copyIndex(main.data.commit.sha, path.join(output, 'index.html'));
  const pulls = await github.paginate(github.rest.pulls.list, { owner, repo, state: 'open', per_page: 100 });
  const previews = [];
  for (const pull of pulls) {
    // Fork previews require a separate trust and authentication design.
    if (pull.head.repo?.full_name !== `${owner}/${repo}`) continue;
    if (!Number.isSafeInteger(pull.number) || pull.number <= 0) throw new Error('Invalid PR number');
    const relative = `previews/pr-${pull.number}/index.html`;
    try {
      await copyIndex(pull.head.sha, path.join(output, relative));
      previews.push({ number: pull.number, path: `previews/pr-${pull.number}/` });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
  return previews;
};
