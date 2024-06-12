import * as cheerio from "cheerio";
import { convertArrayToCSV } from "convert-array-to-csv";
import * as fs from "fs";
import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import autoScroll from "./helpers/autoScroll";

puppeteerExtra.use(stealthPlugin());

const browser = await puppeteerExtra.launch({
  headless: false,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.goto(
  "https://www.google.com/maps/search/cafe/@-7.2875707,112.7964885,15z?entry=ttu"
);

await autoScroll(page);

const html = await page.content();
const pages = await browser.pages();
await Promise.all(pages.map((page) => page.close()));

await browser.close();

const $ = cheerio.load(html);
const aTags = $("a");
const parents: cheerio.Cheerio<cheerio.Element>[] = [];

aTags.each((i, el) => {
  const href = $(el).attr("href");
  if (!href) {
    return;
  }

  if (href.includes("/maps/place/")) {
    parents.push($(el).parent());
  }
});

let index = 0;
let businesses: {
  index: number;
  storeName: string;
  placeId: string;
  address: string;
  category: string;
  phone: string;
  googleUrl: string | undefined;
  ratingText: string | undefined;
  stars: number | null;
  numberOfReviews: number | null;
  latitude: number | null;
  longitude: number | null;
}[] = [];

parents.forEach((parent) => {
  const url = parent.find("a").attr("href");
  const storeName = parent.find("div.fontHeadlineSmall").text();
  const ratingText = parent
    .find("span.fontBodyMedium > span")
    .attr("aria-label");

  const bodyDiv = parent.find("div.fontBodyMedium").first();
  const children = bodyDiv.children();
  const lastChild = children.last();
  const firstOfLast = lastChild.children().first();
  const lastOfLast = lastChild.children().last();
  index = index + 1;

  const urlPattern =
    /!1s(?<id>[^!]+).+!3d(?<latitude>[^!]+)!4d(?<longitude>[^!]+)/gm; // https://regex101.com/r/KFE09c/1
  const latitude = url?.matchAll(urlPattern).next().value?.groups?.latitude;
  const longitude = url?.matchAll(urlPattern).next().value?.groups?.longitude;

  businesses.push({
    index,
    storeName,
    placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
    address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
    category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
    phone: lastOfLast?.text()?.split("·")?.[1]?.trim(),
    googleUrl: url,
    ratingText,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    stars: ratingText?.split("bintang")[0].trim()
      ? Number(ratingText?.split("bintang")[0].trim().replace(",", "."))
      : null,
    numberOfReviews: ratingText
      ?.split("bintang")?.[1]
      ?.replace("Ulasan", "")
      ?.trim()
      ? Number(ratingText?.split("bintang")?.[1]?.replace("Ulasan", "")?.trim())
      : null,
  });
});

const csvFromArrayOfObjects = convertArrayToCSV(businesses);
fs.writeFileSync("output.csv", csvFromArrayOfObjects);
