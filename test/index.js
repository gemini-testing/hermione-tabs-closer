'use strict';

const plugin = require('../');
const EventEmitter = require('events');

const events = {AFTER_TESTS_READ: 'after_tests_read'};

describe('hermione tabs closer', () => {
    const sandbox = sinon.sandbox.create();

    const mkHermioneStub = (config) => {
        const hermione = new EventEmitter();

        hermione.events = events;
        hermione.config = config || {forBrowser: () => ({testsPerSession: 10})};
        hermione.isWorker = () => true;

        return hermione;
    };

    const mkBrowser = () => {
        return {
            switchToWindow: sandbox.stub().resolves(),
            getWindowHandles: sandbox.stub().resolves(['default-tab']),
            closeWindow: sandbox.stub().resolves()
        };
    };

    const callBeforeEachCb = async ({browser, suite}) => {
        const beforeEachHook = suite.beforeEach.lastCall.args[0];
        await beforeEachHook.call({browser});
    };

    afterEach(() => sandbox.restore());

    it('should do nothing in master process', () => {
        const hermione = mkHermioneStub();
        hermione.isWorker = () => false;

        plugin(hermione);

        const eachRootSuite = sinon.spy().named('eachRootSuite');
        hermione.emit(events.AFTER_TESTS_READ, {eachRootSuite});

        assert.notCalled(eachRootSuite);
    });

    it('should not add hook for browsers which not match to RegExp', () => {
        const hermione = mkHermioneStub();
        plugin(hermione, {browsers: /bro2/});

        const suite = {beforeEach: sinon.spy().named('beforeEach')};
        hermione.emit(events.AFTER_TESTS_READ, {
            eachRootSuite: (cb) => cb(suite, 'bro1')
        });

        assert.notCalled(suite.beforeEach);
    });

    it('should not add hook for browsers with one test per session', () => {
        const hermione = mkHermioneStub({
            forBrowser: sandbox.stub().withArgs('bro1').returns({testsPerSession: 1})
        });

        plugin(hermione);

        const suite = {beforeEach: sinon.spy().named('beforeEach')};
        hermione.emit(events.AFTER_TESTS_READ, {eachRootSuite: (cb) => cb(suite, 'bro1')});

        assert.notCalled(suite.beforeEach);
    });

    [
        {
            name: 'there are no opened tabs',
            tabs: []
        },
        {
            name: 'only one tab is opened',
            tabs: ['tab1']
        }
    ].forEach(({name, tabs}) => {
        it(`should not close tabs if ${name}`, async () => {
            const hermione = mkHermioneStub();
            const browser = mkBrowser();
            const suite = {beforeEach: sinon.spy().named('beforeEach')};

            browser.getWindowHandles.resolves(tabs);

            plugin(hermione);
            hermione.emit(events.AFTER_TESTS_READ, {eachRootSuite: (cb) => cb(suite, 'bro1')});

            await callBeforeEachCb({browser, suite});

            assert.notCalled(browser.closeWindow);
        });
    });

    it('should switch to last tab before start to close tabs', async () => {
        const hermione = mkHermioneStub();
        const browser = mkBrowser();
        const suite = {beforeEach: sinon.spy().named('beforeEach')};

        browser.getWindowHandles.resolves(['tab1', 'tab2']);

        plugin(hermione);
        hermione.emit(events.AFTER_TESTS_READ, {eachRootSuite: (cb) => cb(suite, browser)});

        await callBeforeEachCb({browser, suite});

        assert.callOrder(browser.switchToWindow.withArgs('tab2'), browser.closeWindow);
    });

    it('should switch to first tab after close other tabs', async () => {
        const hermione = mkHermioneStub();
        const browser = mkBrowser();
        const suite = {beforeEach: sinon.spy().named('beforeEach')};

        browser.getWindowHandles.resolves(['tab1', 'tab2']);

        plugin(hermione);
        hermione.emit(events.AFTER_TESTS_READ, {eachRootSuite: (cb) => cb(suite, browser)});

        await callBeforeEachCb({browser, suite});

        assert.callOrder(browser.closeWindow, browser.switchToWindow.withArgs('tab1'));
    });

    it('should close all opened tabs except first tab', async () => {
        const hermione = mkHermioneStub();
        const browser = mkBrowser();
        const suite = {beforeEach: sinon.spy().named('beforeEach')};

        browser.getWindowHandles.resolves(['tab1', 'tab2']);

        plugin(hermione);
        hermione.emit(events.AFTER_TESTS_READ, {eachRootSuite: (cb) => cb(suite, browser)});

        await callBeforeEachCb({browser, suite});

        assert.calledOnce(browser.closeWindow);
        assert.calledTwice(browser.switchToWindow);
        assert.calledWith(browser.switchToWindow.firstCall, 'tab2');
        assert.calledWith(browser.switchToWindow.secondCall, 'tab1');
    });
});
