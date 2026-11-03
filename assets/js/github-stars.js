// Live GitHub star counts next to every "Code" link that points to a GitHub repository.
// One request per repository, cached for five minutes per browser session; on any
// failure (offline, rate limit) the link simply stays as it was.
(() => {
  "use strict";
  const TTL = 5 * 60 * 1000;
  const links = [...document.querySelectorAll('.links a[href^="https://github.com/"]')].filter(
    (link) => link.textContent.trim() === "Code"
  );
  if (!links.length) return;

  const style = document.createElement("style");
  style.textContent = `
    .links a .gh-stars { display: inline-block; margin-left: .45em; white-space: nowrap;
      color: var(--global-text-color-light); font-variant-numeric: tabular-nums; }
    .links a .gh-stars span { color: inherit; }
    .links a .gh-stars svg { width: .85em; height: .85em; margin-right: .2em; vertical-align: -.05em; fill: currentColor; }`;
  document.head.appendChild(style);

  const repoOf = (href) => {
    const match = new URL(href).pathname.match(/^\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    return match ? `${match[1]}/${match[2]}` : null;
  };
  const format = (n) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}k`);
  const read = (repo) => {
    try {
      const entry = JSON.parse(sessionStorage.getItem(`gh-stars:${repo}`));
      return entry && Date.now() - entry.t < TTL ? entry.n : null;
    } catch {
      return null;
    }
  };
  const write = (repo, n) => {
    try {
      sessionStorage.setItem(`gh-stars:${repo}`, JSON.stringify({ n, t: Date.now() }));
    } catch {}
  };
  const star =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .9l2.2 4.5 4.9.7-3.6 3.5.9 4.9L8 12.2l-4.4 2.3.9-4.9L.9 6.1l4.9-.7z"/></svg>';

  const show = (repo, n) => {
    for (const link of links) {
      if (repoOf(link.href) !== repo || link.querySelector(".gh-stars")) continue;
      const badge = document.createElement("span");
      badge.className = "gh-stars";
      badge.innerHTML = `${star}<span>${format(n)}</span>`;
      link.appendChild(badge);
      link.setAttribute("aria-label", `Code on GitHub, ${n} stars`);
    }
  };

  for (const repo of new Set(links.map((link) => repoOf(link.href)).filter(Boolean))) {
    const cached = read(repo);
    if (cached !== null) {
      show(repo, cached);
      continue;
    }
    fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: "application/vnd.github+json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data) => {
        if (typeof data.stargazers_count !== "number") return;
        write(repo, data.stargazers_count);
        show(repo, data.stargazers_count);
      })
      .catch(() => {});
  }
})();
