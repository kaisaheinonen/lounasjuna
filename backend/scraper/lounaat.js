const { load } = require("cheerio");

const LOUNAAT_URL = "https://www.lounaat.info/joensuu";

const DIET_MAP = {
  "item-diet-l": "L",
  "item-diet-g": "G",
  "item-diet-m": "M",
  "item-diet-v": "V",
};

async function fetchLounaat() {
  const res = await fetch(LOUNAAT_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; lounasjuna-app/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`lounaat.info palautti ${res.status}`);
  }
  const html = await res.text();
  return parseRestaurants(html);
}

function parseRestaurants(html) {
  const $ = load(html);
  const restaurants = [];
  let id = 1;

  $("div.menu.item").each((_, el) => {
    const header = $(el).find(".item-header");
    const nameEl = header.find("h3 a");
    const name = nameEl.text().trim();
    if (!name) return;

    const slug = (nameEl.attr("href") || "").replace("/lounas/", "").replace("/joensuu", "");
    const hours = header.find(".lunch").text().replace(/[^\d:\-]/g, "").trim();
    const ratingText = header.find(".review li.current").text().trim();
    const rating = ratingText ? parseFloat(ratingText.split("/")[0]) : null;

    const distEl = $(el).find(".item-footer .dist");
    const address = (distEl.attr("title") || "").replace(", Suomi", "").trim();
    const distText = distEl.text().replace(/[^0-9km]/g, "").trim();
    const distance = distText ? distText + (distText.match(/\d+$/) ? " m" : "") : null;

    const menu = [];
    let menuId = 1;
    $(el).find(".item-body li.menu-item").each((_, item) => {
      const price = $(item).find(".price").text().trim();
      const dish = $(item).find(".dish").text().trim();
      if (!dish) return;

      // Collect diet tags from li classes
      const classes = ($(item).attr("class") || "").split(" ");
      const diets = classes
        .filter((c) => DIET_MAP[c])
        .map((c) => DIET_MAP[c]);

      menu.push({ id: menuId++, name: dish, price: price || null, diets });
    });

    restaurants.push({
      id: id++,
      name,
      slug,
      address: address || null,
      distance: distance || null,
      hours: hours || null,
      rating,
      source: "lounaat.info",
      menu,
    });
  });

  return restaurants;
}

module.exports = { fetchLounaat };
