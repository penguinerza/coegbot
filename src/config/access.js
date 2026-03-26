// Daftar command yang hanya boleh diakses di guild tertentu.
// Key = nama command, value = array env var name yang berisi guild ID.
// Command yang tidak terdaftar di sini akan diregister secara global.
module.exports = {
  kani: [process.env.GUILD_ID_DEV, process.env.GUILD_ID_MABAR].filter(Boolean),
};
