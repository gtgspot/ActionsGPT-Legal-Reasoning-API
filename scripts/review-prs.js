#!/usr/bin/env node

const fs = require("fs/promises");

const DEFAULT_PER_PAGE = 30;
const DEFAULT_MAX_PRS = 10;
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_PER_PAGE = 100;
const USER_AGENT = "codex-pr-review-helper";

function parseArgs(argv) {
  const options = {
    repo: process.env.GITHUB_REPOSITORY || "",
    state: "open",
    perPage: DEFAULT_PER_PAGE,
    maxPrs: DEFAULT_MAX_PRS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    includePatches: false,
    format: "markdown",
    output: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [flag, inlineValue] = arg.split("=");
    const value = inlineValue ?? argv[i + 1];

    switch (flag) {
      case "--repo":
        options.repo = value;
        if (!inlineValue) {
          i += 1;
        }
        break;
      case "--state":
        options.state = value;
        if (!inlineValue) {
          i += 1;
        }
        break;
      case "--per-page":
        options.perPage = Number(value) || DEFAULT_PER_PAGE;
        if (!inlineValue) {
          i += 1;
        }
        break;
      case "--max-prs":
        options.maxPrs = Number(value) || DEFAULT_MAX_PRS;
        if (!inlineValue) {
          i += 1;
        }
        break;
      case "--timeout":
        options.timeoutMs = Number(value) || DEFAULT_TIMEOUT_MS;
        if (!inlineValue) {
          i += 1;
        }
        break;
      case "--include-patches":
        options.includePatches = true;
        break;
      case "--format":
        options.format = value || "markdown";
        if (!inlineValue) {
          i += 1;
        }
        break;
      case "--output":
        options.output = value || "";
        if (!inlineValue) {
          i += 1;
        }
        break;
      case "--help":
        return { ...options, help: true };
      default:
        break;
    }
  }

  return options;
}

function printHelp() {
  const helpText = `\
Usage: node scripts/review-prs.js --repo owner/name [options]

Options:
  --repo owner/name      GitHub repository (default: $GITHUB_REPOSITORY)
  --state open|closed|all
  --per-page 30          Results per page (default: 30)
  --max-prs 10           Max PRs to fetch (default: 10)
  --timeout 15000        Request timeout in ms (default: 15000)
  --include-patches      Include file patches in output
  --format markdown|json Output format (default: markdown)
  --output path          Write output to a file instead of stdout
  --help                 Show this help message

Environment:
  GITHUB_TOKEN           GitHub token with repo:read scope
`;

  // eslint-disable-next-line no-console
  console.log(helpText);
}

function getFocusTags(filePath) {
  const focus = new Set();
  if (filePath.startsWith("app/")) {
    focus.add("App routing and server/client boundaries");
  }
  if (filePath.startsWith("components/")) {
    focus.add("UI component behavior and accessibility");
  }
  if (filePath.startsWith("lib/")) {
    focus.add("Shared logic and edge-case coverage");
  }
  if (filePath.startsWith("styles/") || filePath.endsWith(".css")) {
    focus.add("Visual regression and theming");
  }
  if (filePath.endsWith(".sql")) {
    focus.add("Data migrations and rollback safety");
  }
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    focus.add("Type safety and runtime behavior");
  }
  if (filePath.endsWith(".md")) {
    focus.add("Docs accuracy and clarity");
  }
  return Array.from(focus);
}

function collectFocus(filePaths) {
  const focus = new Set();
  filePaths.forEach((filePath) => {
    getFocusTags(filePath).forEach((tag) => focus.add(tag));
  });
  return Array.from(focus);
}

async function fetchJson(url, token, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

async function fetchAllPages(url, token, perPage, maxItems, timeoutMs) {
  let page = 1;
  const results = [];
  const normalizedPerPage = Math.min(Math.max(perPage, 1), MAX_PER_PAGE);

  while (results.length < maxItems) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("per_page", String(normalizedPerPage));
    pageUrl.searchParams.set("page", String(page));

    // eslint-disable-next-line no-await-in-loop
    const data = await fetchJson(pageUrl.toString(), token, timeoutMs);
    results.push(...data);

    if (data.length < normalizedPerPage) {
      break;
    }

    page += 1;
  }

  return results.slice(0, maxItems);
}

async function getPullRequestFiles(owner, repo, number, token, timeoutMs) {
  const files = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files?per_page=100&page=${page}`;
    // eslint-disable-next-line no-await-in-loop
    const data = await fetchJson(url, token, timeoutMs);
    files.push(...data);

    if (data.length < 100) {
      break;
    }

    page += 1;
  }

  return files;
}

function buildMarkdownReport({ repo, state, generatedAt, pullRequests, includePatches }) {
  const lines = [];
  lines.push(`# Codex PR Review Bundle`);
  lines.push("");
  lines.push(`- Repository: ${repo}`);
  lines.push(`- State: ${state}`);
  lines.push(`- Generated: ${generatedAt}`);
  lines.push("");
  lines.push("## Review Checklist");
  lines.push("- Summarize intent and user impact");
  lines.push("- Verify correctness and edge cases");
  lines.push("- Confirm tests/observability updates");
  lines.push("- Flag security or data integrity risks");
  lines.push("");

  pullRequests.forEach((pr) => {
    lines.push(`## PR #${pr.number}: ${pr.title}`);
    lines.push("");
    lines.push(`- URL: ${pr.html_url}`);
    lines.push(`- Author: ${pr.user?.login || "unknown"}`);
    lines.push(`- Base → Head: ${pr.base.ref} → ${pr.head.ref}`);
    lines.push(`- Updated: ${pr.updated_at}`);
    lines.push(`- Labels: ${(pr.labels || []).map((label) => label.name).join(", ") || "none"}`);
    lines.push("");

    lines.push(`### Change Summary`);
    lines.push(`- Files changed: ${pr.files.length}`);
    lines.push(`- Additions: ${pr.additions}`);
    lines.push(`- Deletions: ${pr.deletions}`);
    lines.push("");

    lines.push("### Files");
    pr.files.forEach((file) => {
      lines.push(`- ${file.filename} (${file.status}, +${file.additions} -${file.deletions})`);
    });
    lines.push("");

    const focus = collectFocus(pr.files.map((file) => file.filename));
    if (focus.length > 0) {
      lines.push("### Suggested Review Focus");
      focus.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }

    if (includePatches) {
      lines.push("### Patches");
      pr.files.forEach((file) => {
        lines.push(`#### ${file.filename}`);
        lines.push("```diff");
        lines.push(file.patch || "(no patch available)");
        lines.push("```");
      });
      lines.push("");
    }
  });

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.repo) {
    throw new Error("Repository is required. Use --repo owner/name or set GITHUB_REPOSITORY.");
  }

  if (options.maxPrs <= 0) {
    throw new Error("max-prs must be greater than zero.");
  }
  if (options.timeoutMs <= 0) {
    throw new Error("timeout must be greater than zero.");
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required to query the GitHub API.");
  }

  const [owner, repo] = options.repo.split("/");
  if (!owner || !repo) {
    throw new Error("Repository must be in owner/name format.");
  }

  const pullsUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${options.state}`;
  const pulls = await fetchAllPages(
    pullsUrl,
    token,
    options.perPage,
    options.maxPrs,
    options.timeoutMs
  );

  const pullRequests = [];

  for (const pr of pulls) {
    // eslint-disable-next-line no-await-in-loop
    const files = await getPullRequestFiles(owner, repo, pr.number, token, options.timeoutMs);
    pullRequests.push({
      ...pr,
      files,
    });
  }

  const generatedAt = new Date().toISOString();

  if (options.format === "json") {
    const payload = {
      repo: options.repo,
      state: options.state,
      generatedAt,
      pullRequests,
    };
    const content = JSON.stringify(payload, null, 2);
    if (options.output) {
      await fs.writeFile(options.output, content, "utf8");
      return;
    }
    // eslint-disable-next-line no-console
    console.log(content);
    return;
  }

  const report = buildMarkdownReport({
    repo: options.repo,
    state: options.state,
    generatedAt,
    pullRequests,
    includePatches: options.includePatches,
  });

  if (options.output) {
    await fs.writeFile(options.output, report, "utf8");
    return;
  }

  // eslint-disable-next-line no-console
  console.log(report);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error);
  process.exitCode = 1;
});
