# @testplane/tabs-closer

Plugin for Testplane to close opened tabs from previous tests in a browser. When your tests are opening a lot of tabs in one session, browser can degrade. So that's why you need to close opened tabs before test execution.

## Installation

```bash
npm install @testplane/tabs-closer
```

## Usage

Plugin has following configuration:

* **enabled** (optional) `Boolean` – enable/disable the plugin; by default plugin is enabled
* **browsers** (optional) `Regexp` - browsers in which tabs should be closed

Also there is ability to override plugin parameters by CLI options or environment variables
(see [configparser](https://github.com/gemini-testing/configparser)).
Use `testplane_tabs_closer_` prefix for the environment variables and `--testplane-tabs-closer-` for the cli options.

### Testplane usage

Add plugin to your `testplane` config file:

```js
module.exports = {
    // ...
    system: {
        plugins: {
            '@testplane/tabs-closer': {
                enabled: true,
                browsers: /chrome/
            }
        }
    },
    //...
}
```

## Testing

Run [mocha](http://mochajs.org) tests:
```bash
npm run test-unit
```

Run [eslint](http://eslint.org) codestyle verification
```bash
npm run lint
```
