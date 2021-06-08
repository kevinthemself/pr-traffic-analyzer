require('dotenv').config();
const needle = require('needle');

const ORGANIZATION = process.env.ORGANIZATION;
const GITHUB_USER = process.env.GITHUB_USER;
const PERSONAL_ACCESS_TOKEN = process.env.PERSONAL_ACCESS_TOKEN;

const github = async (method, path, options = {}) => {
  const response = await needle(
    method,
    `https://api.github.com${path}`,
    { auth: 'basic', username: GITHUB_USER, password: PERSONAL_ACCESS_TOKEN, ...options }
  );
  return response.body;
};

const getPullRequestsByOrg = async function (organization) {
  try {
    const repos = await github('get', `/orgs/${organization}/repos`);

    if (repos.length === 0) {
      throw new Error('No repos found for this organization');
    }

    // instead of transforming the repo.pulls_url, we explicitly call the list PR endpoint
    const pullRequests = await Promise.all(
      repos.map(
        async (repo) => github(
          'get',
          `/repos/${repo.full_name}/pulls?per_page=100`,
        )
      )
    );

    if (pullRequests.length === 0) {
      throw new Error('No open pull requests found in any repositories in this organization');
    }

    const pullRequestCount = pullRequests.reduce((count, pullRequests) => count += pullRequests.length, 0);

    console.log(`Found ${pullRequestCount} pull requests in ${organization} across ${repos.length} repositories!`);

    return pullRequests;
  } catch (error) {
    console.error(error);
  }
};

getPullRequestsByOrg(ORGANIZATION);
