import type { Page } from "puppeteer";

const autoScroll = async (page: Page) => {
  await page.evaluate(async () => {
    const wrapper = document.querySelector('div[role="feed"]');

    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 100;
      let scrollDelay = 3000;

      let timer = setInterval(async () => {
        let scrollHeightBefore = wrapper?.scrollHeight;
        wrapper?.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeightBefore!) {
          totalHeight = 0;
          await new Promise((res) => setTimeout(res, scrollDelay));

          let scrollHeightAfter = wrapper?.scrollHeight;

          if (scrollHeightAfter! > scrollHeightBefore!) {
            return;
          } else {
            clearInterval(timer);
            resolve(null);
          }
        }
      }, 700);
    });
  });
};

export default autoScroll;
