
# CHECK MY DEPS, PLEASE!

## Wait, why?

`checkmydeps` does the same thing as a bazillion other similar scripts: it checks if your installed dependencies match the versions specified in the `package.json` file of your module. However, the aim here is to handle dependencies specified with GitHub URLs.

For instance, consider this extract of a package.json file:

```js
{
  "dependencies" : {
    "express"   : "^4.14.0", // <-- a standard semver for the npmjs registry
    "esprima"   : "jquery/esprima", // <-- a GitHub repository
    "escodegen" : "estools/escodegen#master", // <-- another GitHub repository, with a "commit-ish" fragment
  }
}
```

Here, the first dependency is defined with a standard [semver] version. However, for the two other dependencies, nothing can be implied from the URL. And as a regular **lazy** developer, I don't want to update all my dependencies frequently for no reason, because it can be really slow (especially if you need to recompile native stuff each time, which I do).

To solve that, `checkmydeps` retrieves the package.json file from the GitHub repository, at the specified tag or branch. Then we can compare the version from this remote file to your installed version, just like we would do for standard semver dependencies.

Here is the report produced by `checkmydeps` for the example. We can see that the `esprima` team has released a new version on Github, we should update.

![](/docs/example-outdated.png?raw=true)

## Command-line usage

Run the usual `npm install -g checkmydeps`. Then just run `checkmydeps` with no args in your module folder, or in a folder containing multiple repositories, and you're done.

```
USAGE: checkmydeps [options] [path]

    path      The optional path of the target node module to check. Default to
              current directory.
    options   See below

OPTIONS:
    -t, --token      Define the token to access private Github repositories.
    -m, --minimal    Prevent the display of up-to-date dependencies.
    -a, --all        Force the display of up-to-date dependencies.
    -h, --help       Show this description.
    -v, --version    Show the current version of this tool.
```

## Programmatic usage

```js
const { checkmydeps, checkalldeps } = require('checkmydeps');
const options = { githubToken, useColors };

// checks the deps in a repository
const dependencies = await checkmydeps('some/path', options);

// checks the deps of all repositories found in a folder
await dependenciesByModule = await checkalldeps('some/path', options);
```

## Help, I get 404 errors for dependencies in private repositories

Private repositories cannot be accessed from raw http calls, so you need to pass a GitHub token to the tool, to authorize it. I recommend you to create a new token in your GitHub account. Just go to your GitHub Settings, in section *"Personal access tokens"*, and create a token with the *"repo"* capability. Then either put this token in a `GITHUB_TOKEN` environment variable, or pass it to the tool with option `--token`.

[semver]: https://docs.npmjs.com/misc/semver
