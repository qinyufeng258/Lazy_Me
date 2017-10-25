/**
 * author by yff
 */
const puppeteer = require('puppeteer');
const DATA = require('./data');

(async function run() {

    const browser = await puppeteer.launch({
        headless: false
    })

    const page = await browser.newPage();

    await page.setViewport({
        width: 1500,
        height: 1000
    });
    await page.goto('http://note.youdao.com/signIn/index.html?&callback=https://note.youdao.com/web&from=web')

    const USERNAME_SELECTOR = 'body > div.bd > div.login-main > form > div:nth-child(2) > input';
    const PASSWORD_SELECTOR = 'body > div.bd > div.login-main > form > div:nth-child(3) > input';
    const LOGIN_BUTTON_SELECTOR = 'body > div.bd > div.login-main > form > div.row.row-btn > button';
    const WORK_SELECTOR = '#flexible-left > div.sidebar-content.widget-scroller > div.widget-scroller-wrap > tree-root > div > ul > li:nth-child(2) > div > div > div > div.name > div';
    const EISOO_SELECTOR = '#file-outer > div.widget-scroller-wrap > file-view > div > div > ul > li:nth-child(6) > div.title > div > span';
    const NEW_SELECTOR = '#flexible-left > div.hd > div';
    const NEW_MARKDOWN_SELECTOR = '#flexible-left > div.hd > div > ul > li:nth-child(2)';
    const TITLE_SELECTOR = '#flexible-list-right > div.detail > markdown > div > div:nth-child(1) > div > top-title > input';
    const SAVE_SELECTOR = '#flexible-list-right > div.detail > markdown > div > div:nth-child(1) > div > div > div > div';
    const DIALOG_SELECTOR = 'body > dialog-overlay > div > div';
    const DIALOG_CANCEL_SELECTOR = 'body > dialog-overlay > div > div > div.widget-dialog-footer > button.btn.cancel';
    const SELECTORS = [WORK_SELECTOR, EISOO_SELECTOR, NEW_SELECTOR, NEW_MARKDOWN_SELECTOR, TITLE_SELECTOR];

    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(DATA.username);

    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(DATA.password);

    await page.click(LOGIN_BUTTON_SELECTOR);
    await page.waitForNavigation();

    console.log('登录成功');
    for (let sel = 0; sel < SELECTORS.length; sel++) {
        await page.waitFor(SELECTORS[sel]);
        await page.waitFor(1000);
        await page.click(SELECTORS[sel]);

    }

    await page.waitFor(2000);
    await page.keyboard.type(DATA.title);
    await page.waitFor(2000);

    let $frame = await page.mainFrame();
    let fulleditor = $frame.childFrames()[2];
    console.log('找到富文本编辑器，开始输入')
    let CONTENT_SELECTOR = await fulleditor.$("#editor > textarea");
    let NEW_LINE_SELECTOR = await fulleditor.$("#horizontal-rule");
    await CONTENT_SELECTOR.click();
    await page.waitFor(2000);

    page.waitFor(DIALOG_SELECTOR, {
        timeout: 5000
    }).then(async() => {
        await page.click(DIALOG_CANCEL_SELECTOR);
        browser.close();

    }, async() => {

        for (let i = 0; i < DATA.content.length; i++) {
            await page.keyboard.type(DATA.content[i]);
            await NEW_LINE_SELECTOR.click();

            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');

            i === 2 ?
                await page.keyboard.press('Backspace') :
                null

            await page.waitFor(500);
        }
        await page.waitFor(2000);
        await page.click(SAVE_SELECTOR);
        let time = new Date();
        let year = time.getFullYear();
        let month = time.getMonth() + 1;
        let day = time.getDate();

        await page.screenshot({
            path: `media/${year}-${month}-${day}-save.png`
        })
        browser.close();
        console.log(`脚本执行结束，已生成${year}-${month}-${day}的工作汇报，工作愉快:)`);

    })

})();