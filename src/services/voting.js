const fs = require('fs');
const Mutex = require('../utils/mutex');

const PATH = '/app/data/votings.json';
const mutex = new Mutex();

function load() {
  try {
    return JSON.parse(fs.readFileSync(PATH, 'utf8'));
  } catch {
    return [];
  }
}

function save(data) {
  fs.mkdirSync('/app/data', { recursive: true });
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

function createVoting({ channelId, guildId, question, options, createdById }) {
  return mutex.run(() => {
    const votings = load();
    const id = Date.now().toString();
    votings.push({ id, channelId, guildId, question, options, votes: {}, createdById, messageId: null });
    save(votings);
    return id;
  });
}

function setVotingMessageId(id, messageId) {
  return mutex.run(() => {
    const votings = load();
    const v = votings.find((v) => v.id === id);
    if (!v) return;
    v.messageId = messageId;
    save(votings);
  });
}

function castVote(votingId, userId, optionIndex) {
  return mutex.run(() => {
    const votings = load();
    const v = votings.find((v) => v.id === votingId);
    if (!v) return null;
    v.votes[userId] = optionIndex;
    save(votings);
    return v;
  });
}

function getVoting(id) {
  return load().find((v) => v.id === id) ?? null;
}

function closeVoting(id) {
  return mutex.run(() => {
    const votings = load();
    const index = votings.findIndex((v) => v.id === id);
    if (index === -1) return null;
    const [removed] = votings.splice(index, 1);
    save(votings);
    return removed;
  });
}

module.exports = { createVoting, setVotingMessageId, castVote, getVoting, closeVoting };
