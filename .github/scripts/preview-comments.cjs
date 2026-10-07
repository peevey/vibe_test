const marker = '<!-- vibe-test-pr-preview -->';

module.exports = async function updatePreviewComments({ github, owner, repo, previews, baseUrl }) {
  for (const preview of previews) {
    const url = new URL(preview.path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href;
    const body = `${marker}\n### Vorschau\n\n[App-Vorschau öffnen](${url})\n\nDiese Vorschau wurde erfolgreich veröffentlicht. Der Link bleibt bei neuen Deployments gleich. Testergebnisse findest du separat unter **Checks**. Nach dem Schließen oder Mergen des Pull Requests wird die Vorschau beim nächsten erfolgreichen Deployment entfernt.`;
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner, repo, issue_number: preview.number, per_page: 100
    });
    const existing = comments.find(comment =>
      comment.user?.login === 'github-actions[bot]' && comment.body?.includes(marker)
    );
    if (existing) {
      if (existing.body !== body) {
        await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
      }
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: preview.number, body });
    }
  }
};
