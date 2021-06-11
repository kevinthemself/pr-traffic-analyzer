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
  return response;
};

const getPullRequestsByOrg = async function (organization) {
  try {
    const queryParams = 'per_page=100&state=all';
    const repos = (await github('get', `/orgs/${organization}/repos`)).body;

    if (repos.length === 0) {
      throw new Error('No repos found for this organization');
    }

    // determines if more than 1 page of results is needed
    const shouldGetMoreResults = async (repoName) => {
      const response = await github('head', `/repos/${repoName}/pulls?${queryParams}`, { parse_response: false });
      const { headers: { link = '' } } = response;

      if (link !== '') return true;

      return false;
    }

    // generates all pr page urls to be fetched later
    const generatePRUrls = async (repo) => {
      if (await shouldGetMoreResults(repo.full_name)) {
        let response = await github('head', `/repos/${repo.full_name}/pulls?${queryParams}`, { parse_response: false });
        const { headers: { link = '' } } = response;
        const lastPage = link.split(',').filter(link => link.includes('rel="last'))[0];
        const lastPageNum = Number(lastPage.match(/&page=(\d+)/)[1]);

        let urls = [];

        for (let page = 1; page <= lastPageNum; page++) {
          urls.push(`/repos/${repo.full_name}/pulls?${queryParams}&page=${page}`)
        }

        return urls;
      } else {
        return [`/repos/${repo.full_name}/pulls?${queryParams}`];
      }
    }

    // links repo with all pr page urls
    const repoWithPageUrls = await Promise.all(repos.map(async repo => ({ repo, urls: await generatePRUrls(repo) })));

    // sends request for urls, flattening resulting array of page results
    const getAllResults = async (urls) => {
      const unflattened = await Promise.all(urls.map(async (url) => (await github('get', url)).body));
      return unflattened.flat();
    }

    // executes PR fetch for all repos based on their generated pr page result url
    const pullRequestsByRepo = await Promise.all(repoWithPageUrls.map(async ({ repo, urls }) => ({ repo, prs: await getAllResults(urls) })));

    if (pullRequestsByRepo.every(({ prs }) => prs.length === 0)) {
      throw new Error('No pull requests found in any repositories in this organization');
    }

    const totalPullRequestCount = pullRequestsByRepo.reduce((count, { prs }) => count += prs.length, 0);
    const openPullRequestCount = pullRequestsByRepo.reduce((count, { prs }) => count += prs.filter(pr => pr.state === 'open').length, 0);
    const mergedPullRequestCount = pullRequestsByRepo.reduce((count, { prs }) => count += prs.filter(pr => pr.state === 'closed' && pr.merge_commit_sha).length, 0);
    const closedNotMergedPullRequestCount = pullRequestsByRepo.reduce((count, { prs }) => count += prs.filter(pr => pr.state === 'closed' && !pr.merge_commit_sha).length, 0)

    console.log(`Found ${openPullRequestCount} open pull requests, ${mergedPullRequestCount} merged pull requests, and ${closedNotMergedPullRequestCount} closed & unmerged pull requests out of ${totalPullRequestCount} total pull requests in ${organization} across ${repos.length} repositories!`);

    return pullRequestsByRepo;
  } catch (error) {
    console.error(error);
  }
};

const orgPullRequests = getPullRequestsByOrg(ORGANIZATION);
