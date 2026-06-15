const https = require('https');

const GITHUB_OWNER  = 'elias1342';
const GITHUB_REPO   = 'gedichte-geschichten';
const GITHUB_FILE   = 'content.json';
const GITHUB_BRANCH = 'master';

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent':    'netlify-function',
        'Accept':        'application/vnd.github.v3+json',
        'Content-Type':  'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const params   = new URLSearchParams(event.body);
    const title    = (params.get('titel')       || '').trim();
    const category = (params.get('kategorie')   || '').trim();
    const snippet  = (params.get('kurzvorschau')|| '').trim();
    const text     = (params.get('text')        || '').trim();
    const date     = (params.get('datum')       || '').trim()
                     || new Date().toISOString().split('T')[0];

    if (!title || !category || !snippet || !text) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Fehlende Pflichtfelder' }) };
    }

    /* fetch current content.json from GitHub */
    const getRes = await githubRequest(
      'GET',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`
    );
    if (getRes.status !== 200) {
      throw new Error(`GitHub GET fehlgeschlagen (${getRes.status})`);
    }

    const sha     = getRes.data.sha;
    const content = JSON.parse(Buffer.from(getRes.data.content, 'base64').toString('utf-8'));

    /* build new entry */
    const id    = (category === 'Gedicht' ? 'g' : 'k') + Date.now();
    const entry = { id, title, date, snippet, text };

    if (category === 'Gedicht') {
      content.gedichte.push(entry);
    } else {
      content.kurzgeschichten.push(entry);
    }

    /* commit updated file back to GitHub */
    const putRes = await githubRequest(
      'PUT',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        message: `Neuer Eintrag: ${title}`,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha,
        branch: GITHUB_BRANCH
      }
    );

    if (putRes.status !== 200 && putRes.status !== 201) {
      throw new Error(`GitHub PUT fehlgeschlagen (${putRes.status})`);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
