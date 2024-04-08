'use strict';

const Promise = require('bluebird');
const parseConfig = require('./config');

module.exports = (testplane, opts = {}) => {
    if (!testplane.isWorker()) {
        return;
    }

    const pluginConfig = parseConfig(opts);
    if (!pluginConfig.enabled) {
        return;
    }

    async function closeTabs(browser) {
        const tabIds = await browser.getWindowHandles();
        const reversedTabIds = tabIds.reverse(); // used in order to correctly close tabs in native browser apps

        if (reversedTabIds.length <= 1) {
            return;
        }

        await Promise.mapSeries(reversedTabIds, async (id, ind) => {
            await browser.switchToWindow(reversedTabIds[ind]);

            if (ind !== reversedTabIds.length - 1) {
                await browser.closeWindow();
            }
        });
    }

    function shouldClose(browserId) {
        const browserConf = testplane.config.forBrowser(browserId);

        return pluginConfig.browsers.test(browserId) && browserConf.testsPerSession !== 1;
    }

    testplane.on(testplane.events.AFTER_TESTS_READ, (collection) => {
        collection.eachRootSuite((root, browserId) => {
            if (shouldClose(browserId)) {
                root.beforeEach(async function() {
                    await closeTabs(this.browser);
                });
            }
        });
    });
};
