const { load } = require("cheerio");

const LOUNAAT_PAGE = "https://www.lounaat.info/joensuu";
const LOUNAAT_AJAX = "https://www.lounaat.info/ajax/filter";

const DIET_MAP = {
  "item-diet-l": "L",
  "item-diet-g": "G",
  "item-diet-m": "M",
  "item-diet-v": "V",
};

// Muuntaa ISO-päivämäärän lounaat.info day-numeroksi
// Tämä viikko: ma=1, ti=2, ke=3, to=4, pe=5, la=6, su=7
// Ensi viikko: ensi ma=8, ensi ti=9, ...
function dateToDay(isoDate) {
  const target = new Date(isoDate + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const dowOf = (d) => (d.getDay() === 0 ? 7 : d.getDay()); // 1=ma..7=su
  const mondayOf = (d) => {
    const m = new Date(d);
    m.setDate(d.getDate() - (dowOf(d) - 1));
    m.setHours(0, 0, 0, 0);
    return m;
  };

  const weekDiff = Math.round(
    (mondayOf(target) - mondayOf(today)) / (7 * 24 * 3600 * 1000)
  );
  return weekDiff * 7 + dowOf(target);
}

async function fetchLounaat(date) {
  // Haetaan aina ensin pääsivu session-cookien saamiseksi
  const pageRes = await fetch(LOUNAAT_PAGE, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; lounasjuna-app/1.0)",
      Accept: "text/html",
    },
  });
  if (!pageRes.ok) {
    throw new Error(`lounaat.info palautti ${pageRes.status}`);
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const targetDate = date || todayISO;

  // Tänään: parsitaan suoraan pääsivun HTML
  if (targetDate === todayISO) {
    const html = await pageRes.text();
    return parseRestaurants(html);
  }

  // Muu päivä: käytetään AJAX-endpointia session-cookien kanssa
  const cookieVal = (pageRes.headers.get("set-cookie") || "").split(";")[0];
  const day = dateToDay(targetDate);

  const ajaxRes = await fetch(
    `${LOUNAAT_AJAX}?view=lahistolla&day=${day}&page=0&coords=false`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; lounasjuna-app/1.0)",
        Accept: "*/*",
        Referer: LOUNAAT_PAGE,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookieVal,
      },
    }
  );
  if (!ajaxRes.ok) {
    throw new Error(`lounaat.info ajax palautti ${ajaxRes.status}`);
  }
  const html = await ajaxRes.text();
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
