const fs = require('fs');
const fetch = require('node-fetch');
const parser = require('xml2js').parseStringPromise;
const github = require('@actions/github');

(async () => {
  const readmePath = 'README.md';
  let readme = fs.readFileSync(readmePath, 'utf8');

  // GitHub client
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  // ===== Latest Projects =====
  const repos = await octokit.rest.repos.listForUser({
    username: 'sohamg934',
    sort: 'updated',
    per_page: 5
  });

  const projectList = repos.data
    .filter(r => !r.fork)
    .map(r => `- [${r.name}](${r.html_url}) — ${r.description || "No description"}`)
    .join('\n');

  readme = readme.replace(
    /<!-- PROJECTS:START -->[\s\S]*<!-- PROJECTS:END -->/,
    `<!-- PROJECTS:START -->\n${projectList}\n<!-- PROJECTS:END -->`
  );

  // ===== Medium Posts =====
  try {
    const mediumFeed = await fetch('https://medium.com/feed/@sohamghadge0903');
    const mediumXML = await mediumFeed.text();
    const mediumJSON = await parser(mediumXML);

    const posts = mediumJSON.rss.channel[0].item.slice(0, 5)
      .map(p => `- [${p.title[0]}](${p.link[0]})`)
      .join('\n');

    readme = readme.replace(
      /<!-- BLOG-POSTS:START -->[\s\S]*<!-- BLOG-POSTS:END -->/,
      `<!-- BLOG-POSTS:START -->\n${posts}\n<!-- BLOG-POSTS:END -->`
    );
  } catch (err) {
    console.error("Error fetching Medium posts:", err.message);
  }

  // ===== Recent Commits =====
  const events = await octokit.rest.activity.listPublicEventsForUser({
    username: 'sohamg934',
    per_page: 10
  });

  const commitList = events.data
    .filter(e => e.type === 'PushEvent')
    .flatMap(e => e.payload.commits.map(c => ({
      repo: e.repo.name,
      message: c.message,
      url: `https://github.com/${e.repo.name}/commit/${c.sha}`
    })))
    .slice(0, 5)
    .map(c => `- [${c.message}](${c.url}) — _${c.repo}_`)
    .join('\n');

  readme = readme.replace(
    /<!-- COMMITS:START -->[\s\S]*<!-- COMMITS:END -->/,
    `<!-- COMMITS:START -->\n${commitList}\n<!-- COMMITS:END -->`
  );

  fs.writeFileSync(readmePath, readme);
})();
