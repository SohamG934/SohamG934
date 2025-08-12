const fs = require('fs');
const fetch = require('node-fetch');
const parser = require('xml2js').parseStringPromise;
const github = require('@actions/github');

(async () => {
  const readmePath = 'README.md';
  let readme = fs.readFileSync(readmePath, 'utf8');
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  // ===== 1. Latest Projects =====
  try {
    const repos = await octokit.rest.repos.listForUser({
      username: 'sohamg934',
      sort: 'updated',
      per_page: 5
    });

    const projectList = repos.data
      .filter(r => !r.fork)
      .map(r => `- [${r.name}](${r.html_url}) — ${r.description || "No description"}`)
      .join('\n') || "No recent projects found.";

    readme = readme.replace(
      /<!-- PROJECTS:START -->[\s\S]*<!-- PROJECTS:END -->/,
      `<!-- PROJECTS:START -->\n${projectList}\n<!-- PROJECTS:END -->`
    );
  } catch (err) {
    console.error("Error fetching projects:", err.message);
  }

  // ===== 2. Medium Blog Posts =====
  try {
    const mediumFeed = await fetch(process.env.MEDIUM_URL);
    const mediumXML = await mediumFeed.text();
    const mediumJSON = await parser(mediumXML);

    if (!mediumJSON.rss || !mediumJSON.rss.channel) {
      throw new Error("Invalid Medium RSS feed structure");
    }

    const posts = mediumJSON.rss.channel[0].item.slice(0, 5)
      .map(p => `- [${p.title[0]}](${p.link[0]})`)
      .join('\n') || "No blog posts found.";

    readme = readme.replace(
      /<!-- BLOG-POSTS:START -->[\s\S]*<!-- BLOG-POSTS:END -->/,
      `<!-- BLOG-POSTS:START -->\n${posts}\n<!-- BLOG-POSTS:END -->`
    );
  } catch (err) {
    console.error("Error fetching Medium posts:", err.message);
  }

  // ===== 3. Recent Commits =====
  try {
    const repos = await octokit.rest.repos.listForUser({
      username: 'sohamg934',
      sort: 'updated',
      per_page: 3 // only check the top few repos
    });

    let commitList = [];

    for (const repo of repos.data.filter(r => !r.fork)) {
      const commits = await octokit.rest.repos.listCommits({
        owner: repo.owner.login,
        repo: repo.name,
        per_page: 2
      });

      commitList.push(...commits.data.map(c => ({
        repo: `${repo.owner.login}/${repo.name}`,
        message: c.commit.message,
        url: c.html_url
      })));
    }

    const formattedCommits = commitList.slice(0, 5)
      .map(c => `- [${c.message}](${c.url}) — _${c.repo}_`)
      .join('\n') || "No recent commits found.";

    readme = readme.replace(
      /<!-- COMMITS:START -->[\s\S]*<!-- COMMITS:END -->/,
      `<!-- COMMITS:START -->\n${formattedCommits}\n<!-- COMMITS:END -->`
    );
  } catch (err) {
    console.error("Error fetching commits:", err.message);
  }

  // ===== Save Updated README =====
  fs.writeFileSync(readmePath, readme);
  console.log("README.md updated successfully!");
})();
