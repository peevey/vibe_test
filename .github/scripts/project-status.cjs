// Project operations use a separate token; PR content is never executed.
function findStatusOption(field, status) {
  const matches = field?.options.filter(option => option.name.toLowerCase() === status.toLowerCase()) || [];
  if (!matches.length) throw new Error(`Project Status option missing: ${status}`);
  if (matches.length > 1) throw new Error(`Project Status option ambiguous: ${status}`);
  return matches[0];
}
async function inspectProject({ github, owner, projectNumber, statuses }) {
  const data = await github.graphql(`query($owner:String!,$number:Int!) {
    user(login:$owner) { projectV2(number:$number) {
      id fields(first:100) { pageInfo { hasNextPage } nodes {
        ... on ProjectV2SingleSelectField { id name options { id name } }
      } }
    } }
  }`, { owner, number: projectNumber });
  const project = data.user?.projectV2;
  if (!project) throw new Error('Project not found or token lacks Project access');
  if (project.fields.pageInfo.hasNextPage) throw new Error('Project has more than 100 fields; pagination required');
  const field = project.fields.nodes.find(f => f?.name === 'Status');
  for (const status of statuses) {
    findStatusOption(field, status);
  }
  return { project, field };
}

async function setProjectStatus({ github, owner, projectNumber, contentId, status }) {
  const { project, field } = await inspectProject({ github, owner, projectNumber, statuses: [status] });
  const option = findStatusOption(field, status);
  // GitHub returns the existing item if the issue is already in the Project.
  const added = await github.graphql(`mutation($project:ID!,$content:ID!) {
    addProjectV2ItemById(input:{projectId:$project,contentId:$content}) { item { id } }
  }`, { project: project.id, content: contentId });
  await github.graphql(`mutation($project:ID!,$item:ID!,$field:ID!,$option:String!) {
    updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}}) { projectV2Item { id } }
  }`, { project: project.id, item: added.addProjectV2ItemById.item.id, field: field.id, option: option.id });
}

async function linkedIssues({ github, owner, repo, number }) {
  const data = await github.graphql(`query($owner:String!,$repo:String!,$number:Int!) {
    repository(owner:$owner,name:$repo) { pullRequest(number:$number) {
      closingIssuesReferences(first:100) { pageInfo { hasNextPage } nodes { id number repository { nameWithOwner } } }
    } }
  }`, { owner, repo, number });
  const issues = data.repository.pullRequest.closingIssuesReferences;
  if (issues.pageInfo.hasNextPage) throw new Error('More than 100 linked issues; pagination required');
  return issues.nodes.filter(i => i.repository.nameWithOwner === `${owner}/${repo}`);
}

async function activeIssuePull({ github, owner, repo, number }) {
  const data = await github.graphql(`query($owner:String!,$repo:String!,$number:Int!) {
    repository(owner:$owner,name:$repo) { issue(number:$number) {
      closedByPullRequestsReferences(first:100,includeClosedPrs:false) {
        pageInfo { hasNextPage } nodes {
          number state baseRefName headRepository { nameWithOwner }
        }
      }
    } }
  }`, { owner, repo, number });
  const references = data.repository.issue.closedByPullRequestsReferences;
  if (references.pageInfo.hasNextPage) throw new Error('More than 100 linked PRs; pagination required');
  const candidates = references.nodes.filter(p => p.state === 'OPEN' &&
    p.baseRefName === 'main' && p.headRepository?.nameWithOwner === `${owner}/${repo}`);
  if (candidates.length > 1) throw new Error(`Issue #${number} has multiple active PRs; use one active PR per issue`);
  if (!candidates.length) return null;
  const { data: pull } = await github.rest.pulls.get({ owner, repo, pull_number: candidates[0].number });
  return isProjectPull(pull, owner, repo) ? pull : null;
}

function isProjectPull(pull, owner, repo) {
  return pull.state === 'open' && pull.base.ref === 'main' &&
    pull.head.repo?.full_name === `${owner}/${repo}`;
}

async function currentTestStatus({ github, owner, repo, pull }) {
  if (pull.draft) return 'In Progress';
  const checks = await github.paginate(github.rest.checks.listForRef, {
    owner, repo, ref: pull.head.sha, filter: 'latest', per_page: 100
  });
  const tests = checks.filter(c => c.name === 'browser-tests' && c.app?.slug === 'github-actions');
  const status = tests.length && tests.every(c => c.conclusion === 'success') ? 'In Review' : 'In Progress';
  // A newer commit or conversion to draft must not inherit the old green checks.
  const { data: latest } = await github.rest.pulls.get({ owner, repo, pull_number: pull.number });
  if (!isProjectPull(latest, owner, repo)) return null;
  return latest.head.sha === pull.head.sha && !latest.draft ? status : 'In Progress';
}

async function processEvent({ github, context, update }) {
  const { owner, repo } = context.repo;
  const payload = context.payload;
  async function updateIssue(number, status) {
    const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: number });
    if (issue.state !== 'open' || issue.pull_request) return;
    await update(issue.node_id, status);
  }
  if (context.eventName === 'issues') {
    const label = payload.label?.name;
    if (payload.action !== 'labeled' || !['workflow:ready', 'workflow:in-progress'].includes(label)) return;
    const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: payload.issue.number });
    if (issue.state !== 'open' || issue.pull_request) return;
    const labels = issue.labels.map(l => typeof l === 'string' ? l : l.name);
    // Ignore a queued command if its label has already been removed.
    if (!labels.includes(label)) return;
    const pull = await activeIssuePull({ github, owner, repo, number: payload.issue.number });
    const status = pull
      ? await currentTestStatus({ github, owner, repo, pull })
      : labels.includes('workflow:in-progress') ? 'In Progress' : 'Ready';
    if (status) await updateIssue(payload.issue.number, status);
    return;
  }
  if (context.eventName === 'workflow_dispatch') {
    await updateIssue(Number(payload.inputs.issue_number), payload.inputs.status);
    return;
  }
  let pulls;
  if (context.eventName === 'workflow_run') {
    const run = payload.workflow_run;
    if (run.event !== 'pull_request') return;
    pulls = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, { owner, repo, commit_sha: run.head_sha, per_page: 100 });
    pulls = pulls.filter(p => p.head.sha === run.head_sha);
  } else if (context.eventName === 'pull_request_target') {
    const { data: pull } = await github.rest.pulls.get({ owner, repo, pull_number: payload.pull_request.number });
    // Ignore delayed events for older commits.
    if (pull.head.sha !== payload.pull_request.head.sha) return;
    pulls = [pull];
  } else return;
  for (const pull of pulls) {
    const { data: current } = await github.rest.pulls.get({ owner, repo, pull_number: pull.number });
    if (!isProjectPull(current, owner, repo) || current.draft || current.head.sha !== pull.head.sha) continue;
    // Both label events and PR events use the current check results, including reruns.
    const status = await currentTestStatus({ github, owner, repo, pull: current });
    if (!status) continue;
    for (const issue of await linkedIssues({ github, owner, repo, number: pull.number })) {
      const active = await activeIssuePull({ github, owner, repo, number: issue.number });
      // Do not write a result for a PR that is no longer the active, current one.
      if (!active || active.number !== current.number || active.head.sha !== current.head.sha) continue;
      await updateIssue(issue.number, status);
    }
  }
}
module.exports = { inspectProject, setProjectStatus, processEvent };
