# pr-traffic-analyzer

Analyzes pull request traffic for all repositories in an organization.

## Setup

Install package dependencies:

```
$ npm install
```

After packages are installed, you'll see a newly created `.env` file.

Enter the specified information:
|VARIABLE|DESCRIPTION|
| --- | --- |
| `GITHUB_USER` | your github username |
| `PERSONAL_ACCESS_TOKEN` | a GitHub access token ([it doesn't require any scopes](https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#authentication)) |
| `ORGANIZATION` | the organization of interest |

## Running

To run the application:

```
$ npm start
```

This will log the number of found pull requests for the organization to the console.
