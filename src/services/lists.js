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

function checkSimilar(list, name) {
  const normName = name.toLowerCase().trim();

  const duplicate = list.find(e => e.name.toLowerCase() === normName);

  const similar = list.filter(e => {
    if (duplicate && e === duplicate) return false;
    const eName = e.name.toLowerCase();
    return eName.includes(normName) || normName.includes(eName);
  });

  return { duplicate, similar };
}

function checkKani(guildId, name) {
  return checkSimilar(getGuildList(guildId), name);
}

function addKani(guildId, name) {
  return mutex.run(() => {
    const data = load();
    const list = data[guildId] ?? [];
    const normName = name.toLowerCase().trim();
    const duplicate = list.find(e => e.name.toLowerCase() === normName);
    if (duplicate) return { added: false, duplicate };
    list.push({ name, favorite: false });
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
    const realIndex = list.findIndex(e => e.name === target.name);
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
    const realIndex = list.findIndex(e => e.name === target.name);
    list[realIndex].favorite = !list[realIndex].favorite;
    data[guildId] = list;
    save(data);
    return list[realIndex];
  });
}

function addKaniBulk(guildId, names) {
  return mutex.run(() => {
    const data = load();
    const list = data[guildId] ?? [];
    const results = [];

    for (const name of names) {
      const normName = name.toLowerCase().trim();
      const duplicate = list.find(e => e.name.toLowerCase() === normName);
      if (duplicate) {
        results.push({ name, added: false });
      } else {
        list.push({ name, favorite: false });
        results.push({ name, added: true });
      }
    }

    data[guildId] = list;
    save(data);
    return { results, total: list.length };
  });
}

module.exports = { getKaniList, checkKani, addKani, addKaniBulk, removeKani, toggleFavorite };
