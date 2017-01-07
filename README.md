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

Here, the first dependency is defined with a standard [semver] version. However, for the two other dependencies, nothing can be implied from the URL. And as a regular **lazy** developer, I don't want to update all my dependencies frequently for no reason, because it can be really slow (especially if you need to recompile native stuff each time, which I do).

To solve that, `checkmydeps` retrieves the package.json file from the GitHub repository, at the specified tag or branch. Then we can compare the version from this remote file to your installed version, just like we would do for standard semver dependencies.

Here is the report produced by `checkmydeps` for the example. We can see that it seems the `esprima` team has released a new version on github recently!

![](/docs/example-outdated.png?raw=true)

## Command-line usage

Run the usual `npm install -g checkmydeps`. Then just run `checkmydeps` with no args in your module folder, and you're done.

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
    -v, --version      Shows the current version of this tool.
```

## Programmatic usage

```js
const checkMyDeps = require('checkmydeps');

checkMyDeps(modulePath, options, (err, res) => {
  if (err) { return console.error(err); }

  // `res` is an array of dependencies. Up to you to analyse it
  // to create custom reports, or triggers actions. An utility
  // `checkMyDeps.createReportTable` is provided to generate
  // the same report as the executable.

  // A dependency has the following properties. Here is what you
  // would get for the 'esprima' dependency of the example.
  // {
  //   name     : 'esprima',
  //   kind     : 'normal',         // or 'dev' or 'optional'
  //   needs    : '4.0.0-dev',      // latest version found online for github dependencies
  //   needsRaw : 'jquery/esprima', // version requested in package.json
  //   found    : '3.1.3',          // version currently installed in node_modules
  //   status   : 'outdated',       // or 'ok'
  //   type     : 'github'          // or 'common'
  // }
});
```

* **modulePath**: a string with the path to the module to check.
* **options**: an object, with the following optional properties:
  * githubToken: a string
* **callback**: a function accepting two arguments, `err` and `res`. The result comes as an array of dependencies. Each dependency is an object with many properties, such as `name`, `type` (common or github), `needs`, `found` and `status` (outdated or ok).

Some helpers are provided:

```js
/**
 * Convenience function to convert the result of function "checkMyDeps" into a
 * human readable text, like the one produced by the command-line tool.
 */
checkMyDeps.createReportTable(dependencies);

/**
 * Convenience function to (re)format a text report produced by "createReportTable".
 * Usually needed to align several reports joined into a single text.
 */
checkMyDeps.formatReportTable(text);
```

## Help, I get 404 errors for dependencies in private repositories

Private repositories cannot be accessed from raw http calls, so you need to pass a GitHub token to the tool, to authorize it. I recommend you to create a new token in your GitHub account. Just go to your GitHub Settings, in section *"Personal access tokens"*, and create a token with the *"repo"* capability. Then either put this token in a `GITHUB_TOKEN` environment variable, or pass it to the tool with option `--github-token`.

[semver]: https://docs.npmjs.com/misc/semver
