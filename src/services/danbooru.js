const BASE_URL = 'https://danbooru.donmai.us';

async function getRandomSfwPost() {
  const login = process.env.DANBOORU_LOGIN;
  const apiKey = process.env.DANBOORU_API_KEY;

  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const params = new URLSearchParams({
      tags: 'rating:general 1girl',
      random: 'true',
      limit: '1',
      login,
      api_key: apiKey,
    });

    const res = await fetch(`${BASE_URL}/posts.json?${params}`);
    if (!res.ok) throw new Error(`Danbooru API error: ${res.status}`);

    const posts = await res.json();
    const post = posts[0];

    if (!post) continue;

    const url = post.large_file_url || post.file_url;
    if (!url || !url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      console.log(`[DANBOORU] Attempt ${attempt}: no valid image, retrying...`);
      continue;
    }

    return {
      url,
      pageUrl: `${BASE_URL}/posts/${post.id}`,
      tags: post.tag_string_general.split(' ').slice(0, 5).join(', '),
    };
  }

  throw new Error(`Gagal dapat gambar setelah ${MAX_RETRIES} percobaan`);
}

module.exports = { getRandomSfwPost };
