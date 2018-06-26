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

    function closeTabs(browser) {
        let tabIds;

        return browser
            .getTabIds()
            .then((ids) => {
                tabIds = ids;

                return browser.switchTab(tabIds[0]);
            })
            .then(() => {
                return Promise.mapSeries(tabIds, (id, ind) => {
                    return (ind === tabIds.length - 1)
                        ? browser
                        : browser.close(tabIds[ind + 1]);
                });
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
