// Select a fixed, tested main commit independently of the deployment's trigger.
module.exports = async function selectTestedMain({ github, owner, repo }) {
  const { data: branch } = await github.rest.repos.getBranch({ owner, repo, branch: 'main' });
  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    owner, repo, workflow_id: 'tests.yml', branch: 'main', event: 'push', status: 'success', per_page: 100
  });
  // Try recent runs first, but use commit ancestry rather than completion order.
  const candidates = runs.filter(run => run.head_branch === 'main' && run.event === 'push' &&
    run.status === 'completed' && run.conclusion === 'success')
    .sort((a, b) => b.run_number - a.run_number);
  let selected;
  for (const run of candidates) {
    if (!/^[a-f0-9]{40}$/.test(run.head_sha)) throw new Error('Test run must reference a full commit SHA');
    if (selected) {
      const { data: newer } = await github.rest.repos.compareCommits({
        owner, repo, base: selected.sha, head: run.head_sha
      });
      if (newer.status !== 'ahead') continue;
    }
    const { data: comparison } = await github.rest.repos.compareCommits({
      owner, repo, base: run.head_sha, head: branch.commit.sha
    });
    if (!['identical', 'ahead'].includes(comparison.status)) continue;
    const checks = await github.paginate(github.rest.checks.listForRef, {
      owner, repo, ref: run.head_sha, filter: 'latest', per_page: 100
    });
    const tests = checks.filter(check => check.name === 'browser-tests' && check.app?.slug === 'github-actions');
    // A rerun may have superseded the successful result returned by the run list.
    if (!tests.length || tests.some(check => check.status !== 'completed' || check.conclusion !== 'success')) continue;
    selected = { sha: run.head_sha, runId: run.id };
    if (selected.sha === branch.commit.sha) return selected;
  }
  if (selected) return selected;
  throw new Error('No successfully tested main commit is available; Pages deployment stopped');
};
