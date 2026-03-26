const fs = require('fs');
const Mutex = require('../utils/mutex');

const PATH = '/app/data/kani-list.json';
const mutex = new Mutex();

function load() {
  try {
    return JSON.parse(fs.readFileSync(PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync('/app/data', { recursive: true });
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

function getGuildList(guildId) {
  return load()[guildId] ?? [];
}

function getSortedList(guildId) {
  const list = getGuildList(guildId);
  return [...list.filter(e => e.favorite), ...list.filter(e => !e.favorite)];
}

function getKaniList(guildId) {
  return getSortedList(guildId);
}

function checkSimilar(list, name, series) {
  const normName = name.toLowerCase().trim();
  const normSeries = series?.toLowerCase().trim() ?? null;

  const duplicate = list.find(e => {
    const sameName = e.name.toLowerCase() === normName;
    const sameSeries = (e.series?.toLowerCase() ?? null) === normSeries;
    return sameName && sameSeries;
  });

  const similar = list.filter(e => {
    if (duplicate && e === duplicate) return false;
    const eName = e.name.toLowerCase();
    const nameSimilar = eName.includes(normName) || normName.includes(eName);
    const eSeries = e.series?.toLowerCase() ?? null;
    const seriesSimilar = normSeries && eSeries && (eSeries.includes(normSeries) || normSeries.includes(eSeries));
    return nameSimilar || seriesSimilar;
  });

  return { duplicate, similar };
}

function checkKani(guildId, name, series) {
  return checkSimilar(getGuildList(guildId), name, series);
}

function addKani(guildId, name, series) {
  return mutex.run(() => {
    const data = load();
    const list = data[guildId] ?? [];
    const normName = name.toLowerCase().trim();
    const normSeries = series?.toLowerCase().trim() ?? null;
    const duplicate = list.find(e => {
      return e.name.toLowerCase() === normName && (e.series?.toLowerCase() ?? null) === normSeries;
    });
    if (duplicate) return { added: false, duplicate };
    list.push({ name, series, favorite: false });
    data[guildId] = list;
    save(data);
    return { added: true, total: list.length };
  });
}

function removeKani(guildId, index) {
  return mutex.run(() => {
    const sorted = getSortedList(guildId);
    if (index < 1 || index > sorted.length) return null;
    const target = sorted[index - 1];
    if (target.favorite) return { blocked: true, entry: target };

    const data = load();
    const list = data[guildId] ?? [];
    const realIndex = list.findIndex(e => e.name === target.name && e.series === target.series);
    const [removed] = list.splice(realIndex, 1);
    data[guildId] = list;
    save(data);
    return { blocked: false, entry: removed };
  });
}

function toggleFavorite(guildId, index) {
  return mutex.run(() => {
    const sorted = getSortedList(guildId);
    if (index < 1 || index > sorted.length) return null;
    const target = sorted[index - 1];

    const data = load();
    const list = data[guildId] ?? [];
    const realIndex = list.findIndex(e => e.name === target.name && e.series === target.series);
    list[realIndex].favorite = !list[realIndex].favorite;
    data[guildId] = list;
    save(data);
    return list[realIndex];
  });
}

module.exports = { getKaniList, checkKani, addKani, removeKani, toggleFavorite };
