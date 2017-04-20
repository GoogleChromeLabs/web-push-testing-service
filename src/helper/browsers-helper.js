const seleniumAssistant = require('selenium-assistant');

/**
 * Download browsers.
 * Parameters:
 * @param {Array} browsers - a list of [browsers name, channel, expirationHours]. E.g.: ['chrome', 'stable', 48]
 *
 * @return {Promise} - a promise succesfully resolved when all browsers are downloaded.
 */
function downloadBrowsers(browsers) {
  return Promise.all(browsers.map(item => {
    const [browserName, channel, expirationHours] = item;
    return seleniumAssistant
      .downloadBrowser(browserName, channel, expirationHours);
  }));
}

module.exports = {
  downloadBrowsers
};

/**
 * Download browsers using CLI:
 *
 * node browsers-helper.js chrome:stable:48 firefox:stable:50
 */
if (require.main === module) {
  const browsers = process.argv.slice(2).map(item => item.split(':'));
  console.log(`Downloading browsers: ${browsers.join(' ')}`);
  downloadBrowsers(browsers)
  .then(x => {
    console.log(`Downloaded ${x.length} browsers.`);
    process.exit(0);
  })
  .catch(e => {
    console.error(`Error occured while downloading browsers ${e}`);
    process.exit(1);
  });
}
