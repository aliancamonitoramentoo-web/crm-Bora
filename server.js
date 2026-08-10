/* ─────────────────────────────────────────────────────────────
   Linha CRM · Servidor (Node + Express)
   - Serve o CRM (public/index.html)
   - Expõe POST /api/ia que fala com o Claude COM A CHAVE NO SERVIDOR
     (a chave fica em variável de ambiente, NUNCA no código do front)
   ───────────────────────────────────────────────────────────── */
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Troque aqui se sua conta usar outro modelo:
const MODELO = 'claude-sonnet-4-6';

app.post('/api/ia', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ erro: 'A chave ANTHROPIC_API_KEY não está configurada no servidor (Render → Environment).' });
    }
    const { cliente = {}, conversa = '' } = req.body || {};

    const system =
      'Você é o melhor vendedor de ATACADO de uma confecção do polo de Santa Cruz do Capibaribe (PE). ' +
      'Seus compradores NÃO são consumidor final: são pequenos e médios lojistas e sacoleiros (a maioria com CNPJ) ' +
      'que compram no atacado e REVENDEM no VAREJO para os clientes deles. ' +
      'Seu trabalho é fazer o cliente COMPRAR BEM PRA VENDER BEM. Toda mensagem deve conectar com o que dá lucro pra ele: ' +
      'margem na revenda, giro rápido, grade fechada (P ao GG, pra ele não perder venda por falta de número), ' +
      'reposição das peças campeãs de venda dele, novidade pra dar frescor na vitrine, ' +
      'preço de atacado melhor por quantidade, e boas condições (à vista no PIX com desconto, prazo, fiado). ' +
      'Fale como gente do Agreste, no WhatsApp: mensagens curtas, calorosas e diretas, sem enrolação corporativa. ' +
      'Crie urgência real (peça que gira, grade limitada), quebre a objeção do cliente e facilite o fechamento — ' +
      'sempre lembrando que quem você ajuda a vender mais na loja dele volta a comprar de você. ' +
      'NUNCA invente preço, prazo, desconto ou promoção que não foi informado. Se não souber um número, ' +
      'ofereça mandar a tabela de atacado ou combinar na hora.';

    const ctx =
      `Cliente: ${cliente.nome || '-'} (${cliente.tipo || '-'}), ${cliente.cidade || ''}/${cliente.uf || ''}, classe ${cliente.classe || '-'}.\n` +
      `Costuma comprar: ${(cliente.produtos || []).join(', ') || 'sem histórico'}.\n` +
      `Última compra: ${cliente.ultimaCompra || 'sem registro'}. Fiado atual: ${cliente.fiado || 'R$ 0,00'}.`;

    const userMsg =
      `${ctx}\n\n` +
      `Conversa até agora (WhatsApp):\n${conversa || '(sem conversa colada — sugira uma abordagem de primeiro contato para fechar venda)'}\n\n` +
      `Lembre: este cliente COMPRA NO ATACADO PRA REVENDER NO VAREJO. Foque no lucro dele — margem, giro, grade fechada, ` +
      `reposição do que já vende, novidade pra vitrine e condição de atacado. ` +
      `Gere de 2 a 3 opções de resposta MINHA (do vendedor) para mandar agora, cada uma com um ângulo diferente ` +
      `(ex: fechar a grade, quebrar objeção de preço mostrando a margem na revenda, criar urgência de giro/reposição). ` +
      `Cada opção curtinha, pronta pra colar no WhatsApp. Responda SOMENTE em JSON, sem nada fora dele, no formato: ` +
      `{"opcoes":[{"titulo":"...","texto":"..."}]}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await r.json();
    if (data.error) return res.status(500).json({ erro: data.error.message || 'Erro na API da Anthropic' });

    const txt = (data.content || []).map(b => b.text || '').join('\n').trim();
    let opcoes;
    try {
      opcoes = JSON.parse(txt.replace(/```json|```/g, '').trim()).opcoes;
    } catch (e) {
      opcoes = [{ titulo: 'Sugestão', texto: txt }];
    }
    res.json({ opcoes: opcoes || [] });
  } catch (e) {
    res.status(500).json({ erro: String(e && e.message ? e.message : e) });
  }
});

// qualquer outra rota devolve o app
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Linha rodando na porta ' + PORT));
