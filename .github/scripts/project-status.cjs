// Project operations use a separate token; PR content is never executed.
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
    if (!field?.options.some(o => o.name === status)) throw new Error(`Project Status option missing: ${status}`);
  }
  return { project, field };
}

async function setProjectStatus({ github, owner, projectNumber, contentId, status }) {
  const { project, field } = await inspectProject({ github, owner, projectNumber, statuses: [status] });
  const option = field.options.find(o => o.name === status);
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

async function processEvent({ github, context, update }) {
  const { owner, repo } = context.repo;
  const payload = context.payload;
  async function updateIssue(number, status) {
    const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: number });
    if (issue.state !== 'open' || issue.pull_request) return;
    await update(issue.node_id, status);
  }
  if (context.eventName === 'issues') {
    const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: payload.issue.number });
    if (issue.state !== 'open') return;
    const labels = issue.labels.map(l => typeof l === 'string' ? l : l.name);
    const status = labels.includes('workflow:in-progress') ? 'In Progress' : labels.includes('workflow:ready') ? 'Ready' : null;
    if (status) await update(issue.node_id, status);
    return;
  }
  if (context.eventName === 'workflow_dispatch') {
    await updateIssue(Number(payload.inputs.issue_number), payload.inputs.status);
    return;
  }
  let pulls;
  let status;
  if (context.eventName === 'workflow_run') {
    const run = payload.workflow_run;
    if (run.event !== 'pull_request') return;
    pulls = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, { owner, repo, commit_sha: run.head_sha, per_page: 100 });
    status = run.conclusion === 'success' ? 'In Review' : 'In Progress';
    pulls = pulls.filter(p => p.head.sha === run.head_sha);
  } else if (context.eventName === 'pull_request_target') {
    const { data: pull } = await github.rest.pulls.get({ owner, repo, pull_number: payload.pull_request.number });
    // Ignore delayed events for older commits.
    if (pull.head.sha !== payload.pull_request.head.sha) return;
    pulls = [pull];
    status = 'In Progress';
    // A delayed PR event must not undo a successful test result.
    const checks = await github.paginate(github.rest.checks.listForRef, { owner, repo, ref: pull.head.sha, filter: 'latest', per_page: 100 });
    const tests = checks.filter(c => c.name === 'browser-tests' && c.app?.slug === 'github-actions');
    if (tests.length && tests.every(c => c.conclusion === 'success')) status = 'In Review';
  } else return;
  for (const pull of pulls) {
    const { data: current } = await github.rest.pulls.get({ owner, repo, pull_number: pull.number });
    if (current.state !== 'open' || current.draft || current.base.ref !== 'main' || current.head.repo?.full_name !== `${owner}/${repo}` || current.head.sha !== pull.head.sha) continue;
    if (context.eventName === 'workflow_run') {
      // A rerun can supersede an older result even when the commit SHA is unchanged.
      const checks = await github.paginate(github.rest.checks.listForRef, { owner, repo, ref: current.head.sha, filter: 'latest', per_page: 100 });
      const tests = checks.filter(c => c.name === 'browser-tests' && c.app?.slug === 'github-actions');
      status = tests.length && tests.every(c => c.conclusion === 'success') ? 'In Review' : 'In Progress';
    }
    for (const issue of await linkedIssues({ github, owner, repo, number: pull.number })) await updateIssue(issue.number, status);
  }
}
module.exports = { inspectProject, setProjectStatus, processEvent };
