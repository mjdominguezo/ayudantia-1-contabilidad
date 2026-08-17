// Borra todos los contadores guardados. Se llama manualmente desde el panel de la ayudante.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const MC_QUESTIONS = { P1: 5, P2: 4, P3: 4, P4: 4, P5: 4 };
const TF_QUESTIONS = ['tf1', 'tf2', 'tf3', 'tf4', 'tf5', 'tf6'];

async function upstashPipeline(commands) {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });
  return res.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!KV_URL || !KV_TOKEN) {
    res.status(500).json({ error: 'Base de datos no conectada todavía' });
    return;
  }

  try {
    const keys = [];
    Object.entries(MC_QUESTIONS).forEach(([qid, n]) => {
      for (let i = 0; i < n; i++) keys.push(`mc:${qid}:opt:${i}`);
    });
    TF_QUESTIONS.forEach(qid => {
      keys.push(`tf:${qid}:true`);
      keys.push(`tf:${qid}:false`);
    });

    const commands = keys.map(k => ['DEL', k]);
    await upstashPipeline(commands);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al reiniciar los datos' });
  }
}
