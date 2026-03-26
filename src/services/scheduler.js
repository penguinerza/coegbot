const fs = require('fs');
const Mutex = require('../utils/mutex');

const DATA_PATH = '/app/data/agendas.json';
const mutex = new Mutex();

function loadAgendas() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveAgendas(agendas) {
  fs.mkdirSync('/app/data', { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(agendas, null, 2));
}

function getDateParts(date, tz) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  return {
    year: +parts.find(p => p.type === 'year').value,
    month: +parts.find(p => p.type === 'month').value,
    day: +parts.find(p => p.type === 'day').value,
    hour: +parts.find(p => p.type === 'hour').value % 24,
    minute: +parts.find(p => p.type === 'minute').value,
  };
}

function parseScheduledTime(timeStr, tz) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();

  const { year, month, day } = getDateParts(now, tz);
  const naiveMs = Date.UTC(year, month - 1, day, hours, minutes, 0);

  const tzParts = getDateParts(new Date(naiveMs), tz);
  const utcParts = getDateParts(new Date(naiveMs), 'UTC');
  const offsetMs =
    Date.UTC(tzParts.year, tzParts.month - 1, tzParts.day, tzParts.hour, tzParts.minute) -
    Date.UTC(utcParts.year, utcParts.month - 1, utcParts.day, utcParts.hour, utcParts.minute);

  const scheduled = new Date(naiveMs - offsetMs);
  if (scheduled <= now) return null;
  return scheduled;
}

function addAgenda({ channelId, guildId, timeStr, tz, createdBy, createdById }) {
  return mutex.run(() => {
    const agendas = loadAgendas();
    const scheduledAt = parseScheduledTime(timeStr, tz);
    if (!scheduledAt) return null;
    const id = Date.now().toString();
    agendas.push({
      id, channelId, guildId,
      scheduledAt: scheduledAt.toISOString(),
      timeStr, tz, createdBy, createdById,
      messageId: null,
      confirmed: [],
      declined: [],
    });
    saveAgendas(agendas);
    return { id, scheduledAt };
  });
}

function setAgendaMessageId(agendaId, messageId) {
  return mutex.run(() => {
    const agendas = loadAgendas();
    const agenda = agendas.find(a => a.id === agendaId);
    if (!agenda) return;
    agenda.messageId = messageId;
    saveAgendas(agendas);
  });
}

function getAgenda(agendaId) {
  return loadAgendas().find(a => a.id === agendaId) ?? null;
}

function cancelAgenda(agendaId) {
  return mutex.run(() => {
    const agendas = loadAgendas();
    const index = agendas.findIndex(a => a.id === agendaId);
    if (index === -1) return null;
    const [removed] = agendas.splice(index, 1);
    saveAgendas(agendas);
    return removed;
  });
}

function updateRsvp(agendaId, userId, status) {
  return mutex.run(() => {
    const agendas = loadAgendas();
    const agenda = agendas.find(a => a.id === agendaId);
    if (!agenda) return null;

    agenda.confirmed = agenda.confirmed.filter(id => id !== userId);
    agenda.declined = agenda.declined.filter(id => id !== userId);

    if (status === 'hadir') agenda.confirmed.push(userId);
    else if (status === 'tidak') agenda.declined.push(userId);

    saveAgendas(agendas);
    return agenda;
  });
}

function startScheduler(client) {
  setInterval(() => {
    mutex.run(async () => {
      const agendas = loadAgendas();
      const now = new Date();
      const toFire = agendas.filter(a => new Date(a.scheduledAt) <= now);
      if (!toFire.length) return;

      saveAgendas(agendas.filter(a => new Date(a.scheduledAt) > now));

      for (const agenda of toFire) {
        try {
          const guild = await client.guilds.fetch(agenda.guildId);
          const channel = await guild.channels.fetch(agenda.channelId);

          let ping;
          if (agenda.confirmed.length >= 5) {
            ping = agenda.confirmed.map(id => `<@${id}>`).join(' ');
          } else {
            const roles = await guild.roles.fetch();
            const mabarRole = roles.find(r => r.name.toLowerCase() === 'mabar');
            ping = mabarRole ? `<@&${mabarRole.id}>` : '**@mabar**';
          }

          await channel.send(`${ping} Gas mabar sekarang! 🎮`);
          console.log(`[SCHEDULER] Fired agenda ${agenda.id}, confirmed: ${agenda.confirmed.length}`);
        } catch (err) {
          console.error(`[SCHEDULER] Gagal fire agenda ${agenda.id}: ${err.message}`);
        }
      }
    }).catch(err => console.error(`[SCHEDULER] Error: ${err.message}`));
  }, 30 * 1000);
}

module.exports = { addAgenda, setAgendaMessageId, getAgenda, cancelAgenda, updateRsvp, startScheduler };
