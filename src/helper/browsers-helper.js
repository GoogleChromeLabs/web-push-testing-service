require('geckodriver');
require('chromedriver');

const seleniumAssistant = require('selenium-assistant');

Promise.all([
  seleniumAssistant.downloadBrowser('firefox', 'stable', 50),
  seleniumAssistant.downloadBrowser('chrome', 'stable', 48)
])
.then(x => {
  console.log(`Downloaded browsers ${x}`);
  process.exit(0);
})
.catch(e => {
  console.error(`Error occured while downloading browsers ${e}`);
  process.exit(1);
});
