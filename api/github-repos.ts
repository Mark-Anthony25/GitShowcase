function parseHtmlRepos(username: string, html: string) {
  const cards = html.split(/<li[^>]*itemprop=["']owns["'][^>]*>/);
  const repos = [];
  for (let i = 1; i < cards.length; i++) {
    const chunk = cards[i].split('</li>')[0];
    const nameMatch = /<a[^>]*itemprop=["']name codeRepository["'][^>]*>([\s\S]*?)<\/a>/.exec(chunk);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    const descMatch = /<p[^>]*itemprop=["']description["'][^>]*>([\s\S]*?)<\/p>/.exec(chunk);
    const description = descMatch ? descMatch[1].trim() : null;

    const langMatch = /<span[^>]*itemprop=["']programmingLanguage["'][^>]*>([\s\S]*?)<\/span>/.exec(chunk);
    const language = langMatch ? langMatch[1].trim() : null;

    const starMatch = /href=["'][^"']*\/stargazers["'][^>]*>[\s\S]*?<\/svg>[\s\n]*([\d,]+)/.exec(chunk);
    const stars = starMatch ? parseInt(starMatch[1].replace(/,/g, ''), 10) : 0;

    const forkMatch = /href=["'][^"']*\/forks["'][^>]*>[\s\S]*?<\/svg>[\s\n]*([\d,]+)/.exec(chunk);
    const forks = forkMatch ? parseInt(forkMatch[1].replace(/,/g, ''), 10) : 0;

    let hash = 0;
    const full = `${username}/${name}`;
    for (let c = 0; c < full.length; c++) {
      hash = ((hash << 5) - hash + full.charCodeAt(c)) | 0;
    }

    repos.push({
      id: Math.abs(hash),
      name,
      full_name: `${username}/${name}`,
      description,
      language,
      stargazers_count: stars,
      forks_count: forks,
      html_url: `https://github.com/${username}/${name}`,
      updated_at: new Date().toISOString(),
      pushed_at: new Date().toISOString(),
      private: false,
      fork: false,
    });
  }
  return repos;
}

export default async function handler(req: any, res: any) {
  const username = (req.query?.username as string) || '';
  if (!username) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Username required' }));
  }

  try {
    let r = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 GitShowcase/1.0',
        'Accept': 'application/vnd.github+json',
      },
    });
    if (r.ok) {
      const data = await r.json();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(JSON.stringify(data));
    }

    const pageRes = await fetch(`https://github.com/${encodeURIComponent(username)}?tab=repositories`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const repos = parseHtmlRepos(username, html);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(JSON.stringify(repos));
    }

    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'Failed to fetch repositories' }));
  } catch (err: any) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: err.message }));
  }
}
