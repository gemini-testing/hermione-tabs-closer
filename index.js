'use strict';

const Promise = require('bluebird');
const parseConfig = require('./config');

module.exports = (hermione, opts = {}) => {
    if (!hermione.isWorker()) {
        return;
    }

    const pluginConfig = parseConfig(opts);
    if (!pluginConfig.enabled) {
        return;
    }

    async function closeTabs(browser) {
        const tabIds = await browser.getWindowHandles();

        await browser.switchToWindow(tabIds[0]);

        return Promise.mapSeries(tabIds, async (id, ind) => {
            if (ind === tabIds.length - 1) {
                return browser;
            }

            await browser.closeWindow();

            return browser.switchToWindow(tabIds[ind + 1]);
        });
    }

    function shouldClose(browserId) {
        const browserConf = hermione.config.forBrowser(browserId);

        return pluginConfig.browsers.test(browserId) && browserConf.testsPerSession !== 1;
    }

    hermione.on(hermione.events.AFTER_TESTS_READ, (collection) => {
        collection.eachRootSuite((root, browserId) => {
            if (shouldClose(browserId)) {
                root.beforeEach(function() {
                    return closeTabs(this.browser);
                });
            }
        });
    });
};
