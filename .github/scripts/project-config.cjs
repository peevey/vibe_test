function positiveInteger(value, name) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return Number(value);
}

function prepareProjectConfig({ enabled, projectNumber, hasToken, setup = false }) {
  if (!setup && enabled !== 'true') return { active: false };
  if (!projectNumber) throw new Error('Set the repository Actions variable PROJECT_NUMBER. See README: Project setup.');
  const number = positiveInteger(projectNumber, 'PROJECT_NUMBER');
  if (!hasToken) throw new Error('Set the repository Actions secret PROJECTS_TOKEN with Project write access. See README: Project setup.');
  return { active: true, projectNumber: number };
}

async function runProjectSetup({ github, owner, repo, projectNumber, issueNumber, confirm }) {
  if (confirm !== true) throw new Error('Confirm that the selected test issue will be added to the Project and set to Ready.');
  const number = positiveInteger(issueNumber, 'Test issue number');
  const { inspectProject, setProjectStatus } = require('./project-status.cjs');
  await inspectProject({ github, owner, projectNumber, statuses: ['Ready', 'In Progress', 'In Review'] });
  const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: number });
  if (issue.state !== 'open' || issue.pull_request) throw new Error('Select an open test issue, not a pull request or closed issue.');
  await setProjectStatus({ github, owner, projectNumber, contentId: issue.node_id, status: 'Ready' });
  return { issueNumber: number, status: 'Ready' };
}

module.exports = { prepareProjectConfig, runProjectSetup };
