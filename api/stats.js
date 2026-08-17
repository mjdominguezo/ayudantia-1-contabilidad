// Lee todos los contadores guardados y devuelve los porcentajes ya calculados.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const MC_QUESTIONS = {
  P1: { options: 5, correct: 4 },
  P2: { options: 4, correct: 0 },
  P3: { options: 4, correct: 2 },
  P4: { options: 4, correct: 3 },
  P5: { options: 4, correct: 1 }
};

const TF_QUESTIONS = {
  tf1: false,
  tf2: false,
  tf3: false,
  tf4: true,
  tf5: true,
  tf6: false
};

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
  if (!KV_URL || !KV_TOKEN) {
    res.status(500).json({ error: 'Base de datos no conectada todavía' });
    return;
  }

  try {
    const keys = [];
    Object.entries(MC_QUESTIONS).forEach(([qid, q]) => {
      for (let i = 0; i < q.options; i++) keys.push(`mc:${qid}:opt:${i}`);
    });
    Object.keys(TF_QUESTIONS).forEach(qid => {
      keys.push(`tf:${qid}:true`);
      keys.push(`tf:${qid}:false`);
    });

    const commands = keys.map(k => ['GET', k]);
    const results = await upstashPipeline(commands);
    const values = {};
    keys.forEach((k, i) => {
      const raw = results[i] && results[i].result;
      values[k] = raw ? parseInt(raw, 10) : 0;
    });

    const mc = {};
    Object.entries(MC_QUESTIONS).forEach(([qid, q]) => {
      const counts = [];
      let total = 0;
      for (let i = 0; i < q.options; i++) {
        const c = values[`mc:${qid}:opt:${i}`] || 0;
        counts.push(c);
        total += c;
      }
      mc[qid] = {
        counts,
        total,
        correctIndex: q.correct,
        correctPercent: total ? Math.round((counts[q.correct] / total) * 100) : 0,
        percents: counts.map(c => (total ? Math.round((c / total) * 100) : 0))
      };
    });

    const tf = {};
    Object.entries(TF_QUESTIONS).forEach(([qid, correctValue]) => {
      const nTrue = values[`tf:${qid}:true`] || 0;
      const nFalse = values[`tf:${qid}:false`] || 0;
      const total = nTrue + nFalse;
      const correctCount = correctValue ? nTrue : nFalse;
      tf[qid] = {
        true: nTrue,
        false: nFalse,
        total,
        correctValue,
        correctPercent: total ? Math.round((correctCount / total) * 100) : 0,
        truePercent: total ? Math.round((nTrue / total) * 100) : 0,
        falsePercent: total ? Math.round((nFalse / total) * 100) : 0
      };
    });

    res.status(200).json({ mc, tf });
  } catch (err) {
    res.status(500).json({ error: 'Error al leer los resultados' });
  }
}
