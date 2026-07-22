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

    const { human_image, garment_image, category, description } = body;

    if (!human_image || !garment_image) {
      return res.status(400).json({ erro: 'Envie a foto da cliente e a foto da roupa!' });
    }

    const rawKey = process.env.FAL_KEY;
    if (!rawKey) {
      return res.status(500).json({ erro: 'Chave FAL_KEY não configurada na Vercel.' });
    }

    const cleanKey = rawKey.trim().replace(/^Key\s+/i, '');

    console.log("🛍️ Processando ProvouComprou no IDM-VTON... Categoria:", category);

    const respostaIA = await fetch("https://fal.run/fal-ai/idm-vton", {
      method: "POST",
      headers: {
        "Authorization": `Key ${cleanKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        human_image_url: human_image,
        garment_image_url: garment_image,
        category: category || "upper_body",
        description: description || "fashion item"
      })
    });

    if (!respostaIA.ok) {
      const textoErro = await respostaIA.text();
      console.error("Erro no Fal.ai (IDM-VTON):", textoErro);
      return res.status(500).json({ erro: `Fal.ai recusou o processamento [Código ${respostaIA.status}]: ${textoErro}` });
    }

    const dados = await respostaIA.json();
    const fotoFinalUrl = dados.image?.url || dados.images?.[0]?.url;

    if (!fotoFinalUrl) {
      return res.status(500).json({ erro: 'A IA não retornou a imagem do provador.' });
    }

    return res.status(200).json({
      sucesso: true,
      imageUrl: fotoFinalUrl
    });

  } catch (erro) {
    console.error("Erro interno no servidor:", erro);
    return res.status(500).json({ erro: `Erro interno no servidor: ${erro.message}` });
  }
}
