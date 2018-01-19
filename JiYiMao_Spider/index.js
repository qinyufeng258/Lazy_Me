/**
 * author by yff
 */
const puppeteer = require('puppeteer')
const dbCollection = 'Impact'
const mysql = require('mysql')
const log4js = require('log4js')
const async2 = require('async');
log4js.configure({
    appenders: {
        impact: {
            type: 'file',
            filename: 'impact.log'
        }
    },
    categories: {
        default: {
            appenders: ['impact'],
            level: 'trace'
        }
    }
});
const logger = log4js.getLogger('impact');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '690076598',
    port: '3306',
    database: 'JIAOYIMAO',
});

connection.connect();

async function run() {

    const browser = await puppeteer.launch({
        headless: false
    })

    const page = await browser.newPage()

    await page.setViewport({
        width: 1500,
        height: 1000
    })
    logger.info('JiaoYiMao Impact3 Spider Start!');
    await page.goto('https://m.jiaoyimao.com/g4508-c1476093489697179/s%E5%AE%89%E5%8D%93%E6%9C%8D%E5%8A%A1%E5%99%A8.html')

    const GUIDE_SELECTOR = 'body > div.id-certification-guide'
    const LOAD_MORE_SELECTOR = '#loadMoreGoods'

    try {
        // 点击掉首次进入时的提示遮罩层
        await page.waitForSelector(GUIDE_SELECTOR, {
            timeout: 5000
        })
        await page.click(GUIDE_SELECTOR)
    } catch (error) {
        logger.error('Page waitForGuideSelector error: ', error)
    }


    let begin = 0
    let enbaleLoadMore = true

    while (enbaleLoadMore) {

        // 确保加载完毕
        await page.waitFor(1000);
        // 获取一页商品列表和价格
        let goods = await page.evaluate((begin) => {
            let goods = []
            let GOODS_LIST_SELECTOR = '#goodsList > li > a'
            let GOODS_PRICE = 'div.goods-price'
            let goodsList = [...document.querySelectorAll(GOODS_LIST_SELECTOR)].slice(begin)
            goodsList.forEach(e => {
                let price = e.querySelector(GOODS_PRICE)
                goods.push({
                    id: /goods\/(\d+).html/g.exec(e.href)[1],
                    price: price.innerHTML ? price.innerHTML.slice(1) : '-1'
                })
            })
            return goods
        }, begin)

        begin = begin + goods.length;

        // 写入数据库，判断是否需要更新商品数据 && 判断是否进行下一步加载
        // logger.info('Catched ' + goods.length + ' goods');
        let sqls = [];
        for (let index = 0; index < goods.length; index++) {
            sqls.push('SELECT * FROM IMPACT3 WHERE ID = ' + goods[index].id)
        }

        let duplicatedTag = 0;
        let countTag = 0;
        async2.forEachOf(sqls, function (sql, index, callback) {
            console.log('New GoodsID: ', goods[index].id, '---', goods[index].price)

            connection.query(sql, function (err, result) {
                countTag++;
                if (err) {
                    callback(err)
                    logger.error('[SELECT ERROR] - ', err.message)

                }
                // logger.info('[SELECT RESULT] - ', goods[index].id)
                if (result.length !== 0) {
                    if (result[0].price === parseFloat(goods[index].price)) {
                        // NO MORE LOAD
                        duplicatedTag++;
                        console.log('Duplicated GoodsID: ', goods[index].id)

                    } else {
                        let modSql = 'UPDATE IMPACT3 SET PRICE =? WHERE ID = ?'
                        let modSqlParams = [
                            goods[index].id,
                            goods[index].price
                        ];
                        // UPDATE GOODS
                        connection.query(modSql, modSqlParams, function (err, result) {
                            if (err) {
                                callback(err)
                                logger.error('[UPDATE ERROR] - ', err.message)

                            }
                            logger.info('[UPDATE ID] - ', goods[index].id)
                        });
                    }
                } else {
                    // 如果搜索不到，则认为当前商品需要写入数据库中
                    let addSql = 'INSERT INTO IMPACT3(ID,PRICE) VALUES(?,?)'
                    let addSqlParams = [goods[index].id, goods[index].price]

                    //增
                    connection.query(addSql, addSqlParams, function (err, result) {
                        if (err) {
                            callback(err)
                            logger.error('[INSERT ERROR] - ', err.message);

                        }
                        logger.info('INSERT ID - ', goods[index].id)
                    });
                }
            });

            callback('', duplicatedTag, countTag);
        }, (err, duplicatedTag, countTag) => {
            // 所有SQL执行完成后回调
            if (err) {
                console.log(err);
            } else {
                console.log('SQL EXCUTED SUCCEED!');
            }
            if (Math.abs(duplicatedTag - countTag) < 3) {
                enbaleLoadMore = false;
                console.log(duplicatedTag, countTag);
            } else {
                enbaleLoadMore = true;
                console.log(enbaleLoadMore);
            }
        })

        console.log('----------------------------------------------------')


        if (enbaleLoadMore) {
            // 点击加载更多按钮
            await page.waitFor(LOAD_MORE_SELECTOR)
            await page.click(LOAD_MORE_SELECTOR)
        }
    }

    console.log('JiaoYiMao Impact3 Spider End!');
    // browser.close()

}

run()