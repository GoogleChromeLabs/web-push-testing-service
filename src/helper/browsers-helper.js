require('geckodriver');
require('chromedriver');

const seleniumAssistant = require('selenium-assistant');

Promise.all([
  seleniumAssistant.downloadBrowser('firefox', 'stable', 48),
  seleniumAssistant.downloadBrowser('firefox', 'beta', 48),
  seleniumAssistant.downloadBrowser('firefox', 'unstable', 48),
  seleniumAssistant.downloadBrowser('chrome', 'stable', 48),
  seleniumAssistant.downloadBrowser('chrome', 'beta', 48),
  seleniumAssistant.downloadBrowser('chrome', 'unstable', 48)
])
.then(x => {
  console.log(`Downloaded browsers ${x}`);
  process.exit(0);
})
.catch(e => {
  console.error(`Error occured while downloading browsers ${e}`);
  process.exit(1);
});
