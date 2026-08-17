// Recibe una respuesta (MC o V/F) y aumenta el contador correspondiente en la base de datos.
// No requiere ninguna librería: habla directo con la API REST de Upstash Redis.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Preguntas válidas y sus opciones posibles, para no aceptar datos inventados.
const VALID_MC = { P1: 5, P2: 4, P3: 4, P4: 4, P5: 4 };
const VALID_TF = ['tf1', 'tf2', 'tf3', 'tf4', 'tf5', 'tf6'];

async function upstash(command) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
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
    const { type, qid, option } = req.body || {};
    let key = null;

    if (type === 'mc' && VALID_MC[qid] !== undefined) {
      const idx = Number(option);
      if (Number.isInteger(idx) && idx >= 0 && idx < VALID_MC[qid]) {
        key = `mc:${qid}:opt:${idx}`;
      }
    } else if (type === 'tf' && VALID_TF.includes(qid) && (option === 'true' || option === 'false')) {
      key = `tf:${qid}:${option}`;
    }

    if (!key) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }

    await upstash(['INCR', key]);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la respuesta' });
  }
}
