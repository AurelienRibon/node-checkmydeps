# CHECK MY DEPS, PLEASE!

## Wait, why?

`checkmydeps` does the same thing as a bazillion other similar scripts: it checks if your installed dependencies match the versions specified in the `package.json` file of your module. However, the aim is to go a little further, and handle dependencies specified with GitHub URLs too.

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

Here, the first dependency is defined with a standard [semver] version. All available scripts know how to check if your installed version of "express" is up-to-date with the `^4.14.0` requirement. However, for the two other dependencies, nothing can be implied from the URL. And as a regular **lazy** developer, I don't want to update all my dependencies frequently for no reason, because it can be really slow (especially if you need to recompile native stuff each time, which I do).

To solve that, `checkmydeps` retrieves the package.json file from the GitHub repository, at the specified tag or branch. Then we can just compare the version from this remote file to your installed version.

Here is the report produced by `checkmydeps`. We can see that it seems the `escodegen` team has released a new version recently, better update it!

```
UP-TO-DATE
--------------------------------------------------------------------------------
express   | needs ^4.14.0           | found 4.14.1
esprima   | needs 3.2.0 (on github) | found 3.2.0

OUTDATED
--------------------------------------------------------------------------------
escodegen | needs 1.8.1 (on github) | found 1.8.0
```

## Command-line usage

You can use `checkmydeps` either from the command-line, or programmatically, in your own scripts.

For command-line usage, run the usual `npm install -g checkmydeps`. Then just run `checkmydeps` with no args in your module folder, and you're done.
```
Usage: checkmydeps [options] [path]
    path  The path of the target node module to check. Uses current directory if
          no path is provided.

Options:
    --hide-up-to-date  Prevents the display of up-to-date dependencies.
    --github-token     Defines the GitHub token to use to access private github
                       repositories. The token must have "repo" capability (check
                       your GitHub settings, section "Personal access tokens").
    -h, --help         Shows this description.
```

## Programmatic usage

```js
const checkMyDeps = require('checkmydeps');
checkMyDeps(modulePath, options, callback);
```

* **modulePath**: a string with the path to the module to check.
* **options**: an object, with the following optional properties:
  * githubToken: a string
* **callback**: a function accepting two arguments, `err` and `res`. The result comes as an object with two properties `ok` and `nok`. Each property contains an array of dependencies. Each dependency is an object with many properties, such as `name`, `type` (common or github), `needs` and `found`.

## Help, I get 404 errors for dependencies in private repositories

Private repositories cannot be accessed from raw http calls, so you need to pass a GitHub token to the tool, to authorize it. I recommend you to create a new token in your GitHub account. Just go to your GitHub Settings, in section *"Personal access tokens"*, and create a token with the *"repo"* capability. Then either put this token in a `GITHUB_TOKEN` environment variable, or pass it to the tool with option `--github-token`.

[semver]: https://docs.npmjs.com/misc/semver
