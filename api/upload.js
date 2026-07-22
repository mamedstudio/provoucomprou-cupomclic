export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e){}
    }

    const { image } = body;
    if (!image) {
      return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
    }

    const rawKey = process.env.FAL_KEY;
    if (!rawKey) {
      return res.status(500).json({ erro: 'Chave FAL_KEY não configurada na Vercel.' });
    }
    const cleanKey = rawKey.trim().replace(/^Key\s+/i, '');

    // Extrai o tipo e os dados em base64
    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ erro: 'Formato de imagem inválido.' });
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    // 1. Inicia o upload no storage do Fal.ai
    const initRes = await fetch("https://rest.fal.ai/storage/upload/initiate", {
      method: "POST",
      headers: {
        "Authorization": `Key ${cleanKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        file_name: `roupa_${Date.now()}.jpg`,
        content_type: contentType
      })
    });

    if (!initRes.ok) {
      const errTxt = await initRes.text();
      return res.status(500).json({ erro: "Erro ao iniciar upload no Fal.ai: " + errTxt });
    }

    const { upload_url, file_url } = await initRes.json();

    // 2. Faz o envio direto da foto para a CDN
    const putRes = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: buffer
    });

    if (!putRes.ok) {
      return res.status(500).json({ erro: "Erro ao enviar imagem para a CDN." });
    }

    // Retorna a URL curta da imagem hospedada
    return res.status(200).json({ sucesso: true, url: file_url });

  } catch (erro) {
    console.error("Erro no upload:", erro);
    return res.status(500).json({ erro: erro.message });
  }
}
