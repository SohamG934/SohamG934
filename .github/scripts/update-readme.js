const fs = require('fs');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');

(async () => {
  const readmePath = 'README.md';
  let readme = fs.readFileSync(readmePath, 'utf8');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

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

  // ===== 2. Medium Blog Posts (via rss2json) =====
  try {
    const rssUrl = encodeURIComponent(process.env.MEDIUM_URL);
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      throw new Error("No blog posts found in feed");
    }

    const posts = data.items.slice(0, 5)
      .map(p => `- [${p.title}](${p.link})`)
      .join('\n');

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
      per_page: 3
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
