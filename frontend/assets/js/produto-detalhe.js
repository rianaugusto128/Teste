const PORTS = [8080, 8081];
let API_BASE = 'http://localhost:8080/api';
let API_PRODUTOS = `${API_BASE}/produtos`;
let API_PROMOCOES = `${API_BASE}/promocoes`;
let promocoesAtivas = [];
let produtoAtual = null;

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function descobrirBackend() {
    for (const porta of PORTS) {
        try {
            const response = await fetch(`http://localhost:${porta}/api/produtos`);
            if (response.ok) {
                API_BASE = `http://localhost:${porta}/api`;
                API_PRODUTOS = `${API_BASE}/produtos`;
                API_PROMOCOES = `${API_BASE}/promocoes`;
                return true;
            }
        } catch (_) {}
    }
    return false;
}

async function fetchJson(url) {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function produtoTemPromocao(promocao, produtoId) {
    return (promocao.produtos || []).some(p => Number(p.id) === Number(produtoId));
}

function limiteDescontoPromocao(promocao) {
    const informado = Math.floor(Number(promocao.percentualDesconto || 0));
    return Math.max(1, Math.min(informado, 40));
}

function percentualAleatorioPromocao(promocao, produto) {
    const limiteEvento = limiteDescontoPromocao(promocao);
    const preco = Number(produto.preco || 0);
    const limiteProduto = preco >= 200 ?limiteEvento : Math.min(limiteEvento, 20);
    const minimo = limiteProduto >= 5 ?5 : 1;
    const chave = `${promocao.id || promocao.nomeEvento || 'promo'}-${produto.id || produto.nome || ''}`;
    let hash = 0;
    for (let i = 0; i < chave.length; i++) {
        hash = ((hash << 5) - hash) + chave.charCodeAt(i);
        hash |= 0;
    }
    return minimo + (Math.abs(hash) % (limiteProduto - minimo + 1));
}

function calcularPrecoProduto(produto) {
    const precoOriginal = Number(produto.preco || 0);
    const precoFixo = Number(produto.precoDesconto || produto.preco || 0);
    let melhor = {
        precoFinal: precoFixo > 0 ?precoFixo : precoOriginal,
        percentual: precoFixo > 0 && precoFixo < precoOriginal ?Math.round(((precoOriginal - precoFixo) / precoOriginal) * 100) : 0,
        evento: null
    };

    promocoesAtivas.forEach(promocao => {
        if (!produtoTemPromocao(promocao, produto.id)) return;
        const percentual = percentualAleatorioPromocao(promocao, produto);
        const precoPromocional = precoOriginal - (precoOriginal * percentual / 100);
        if (precoPromocional < melhor.precoFinal) {
            melhor = { precoFinal: precoPromocional, percentual, evento: promocao.nomeEvento };
        }
    });

    return melhor;
}


function adicionarProdutoDetalheAoCarrinho() {
    if (!produtoAtual) return;
    const calculo = calcularPrecoProduto(produtoAtual);
    const payload = {
        ...produtoAtual,
        precoOriginal: Number(produtoAtual.preco || 0),
        precoFinal: Number(calculo?.precoFinal ?? produtoAtual.precoDesconto ?? produtoAtual.preco ?? 0),
        percentual: Math.round(Number(calculo?.percentual || 0))
    };
    window.PetZillaCart?.addItem(payload, 1);
}

function renderProduto(produto) {
    produtoAtual = produto;
    const box = document.getElementById('produtoDetalhe');
    const preco = Number(produto.preco || 0);
    const calculo = calcularPrecoProduto(produto);
    const temDesconto = preco > 0 && calculo.precoFinal < preco;
    const estoque = Number(produto.qtdEstoque || 0);
    const imagem = produto.imagem ?escapeHtml(produto.imagem) : '';

    document.title = `${produto.nome || 'Produto'} - PetZilla`;

    box.innerHTML = `
        <div class="grid lg:grid-cols-2">
            <div class="relative min-h-[360px] bg-gradient-to-br from-teal-50 to-orange-50 flex items-center justify-center p-8">
                ${temDesconto ?`<div class="absolute top-6 left-6 bg-orange-500 text-white px-5 py-3 rounded-2xl font-black shadow-lg">${Math.round(calculo.percentual)}% OFF</div>` : ''}
                ${estoque <= 0 ?`<div class="absolute top-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black shadow-lg">Sem estoque</div>` : ''}
                ${imagem ?`<img src="${imagem}" alt="${escapeHtml(produto.nome)}" class="max-h-[320px] object-contain drop-shadow-xl" onerror="this.outerHTML='<i class=&quot;fas fa-bone text-9xl text-teal-300&quot;></i>'">` : `<i class="fas fa-bone text-9xl text-teal-300"></i>`}
            </div>
            <div class="p-8 lg:p-10">
                <p class="text-sm font-black uppercase tracking-widest text-teal-600">${escapeHtml(produto.categoria?.nome || 'Sem categoria')}</p>
                <h1 class="text-4xl md:text-5xl font-black text-slate-900 mt-3 leading-tight">${escapeHtml(produto.nome || 'Produto')}</h1>
                <p class="text-slate-500 mt-5 text-lg leading-relaxed">${escapeHtml(produto.descricao || 'Produto selecionado para deixar a rotina do seu pet mais completa, prática e cheia de cuidado.')}</p>

                ${calculo.evento ?`<div class="mt-6 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl p-4 font-black"><i class="fas fa-bullhorn mr-2"></i>${escapeHtml(calculo.evento)}</div>` : ''}

                <div class="mt-8 flex flex-wrap items-baseline gap-3">
                    <span class="text-4xl font-black text-orange-500">${formatMoney(temDesconto ?calculo.precoFinal : preco)}</span>
                    ${temDesconto ?`<span class="text-xl text-slate-400 line-through font-bold">${formatMoney(preco)}</span>` : ''}
                </div>

                <div class="mt-6 flex flex-wrap gap-3">
                    <span class="px-4 py-3 rounded-2xl font-black ${estoque > 0 ?'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">
                        <i class="fas fa-boxes-stacked mr-2"></i>${estoque > 0 ?`${estoque} unidade(s) em estoque` : 'Produto indisponível'}
                    </span>
                    <span class="px-4 py-3 rounded-2xl font-black bg-slate-100 text-slate-700">
                        <i class="fas fa-paw mr-2"></i>PetZilla
                    </span>
                </div>

                <div class="mt-8 flex flex-col sm:flex-row gap-3">
                    <button type="button" onclick="adicionarProdutoDetalheAoCarrinho()" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-2xl font-black text-center transition shadow-lg ${estoque <= 0 ?'opacity-50 cursor-not-allowed' : ''}" ${estoque <= 0 ?'disabled' : ''}>
                        <i class="fas fa-cart-plus mr-2"></i>Adicionar ao carrinho
                    </button>
                    <a href="carrinho.html" class="bg-slate-900 hover:bg-teal-700 text-white px-6 py-4 rounded-2xl font-black text-center transition">
                        Ver carrinho
                    </a>
                    <a href="produtos.html" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-4 rounded-2xl font-black text-center transition">
                        Continuar comprando
                    </a>
                </div>
            </div>
        </div>`;
}

async function carregarProduto() {
    const box = document.getElementById('produtoDetalhe');
    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {
        box.innerHTML = `<div class="p-10 text-center"><i class="fas fa-triangle-exclamation text-5xl text-orange-400 mb-4"></i><h1 class="text-2xl font-black">Produto não encontrado</h1><p class="text-slate-500 mt-2">Volte ao catálogo e escolha um produto para ver todos os detalhes.</p></div>`;
        return;
    }

    try {
        await descobrirBackend();
        promocoesAtivas = await fetchJson(`${API_PROMOCOES}/ativas`).catch(() => []);
        const produto = await fetchJson(`${API_PRODUTOS}/${id}`);
        renderProduto(produto);
    } catch (error) {
        console.error(error);
        box.innerHTML = `<div class="p-10 text-center"><i class="fas fa-plug-circle-xmark text-5xl text-red-400 mb-4"></i><h1 class="text-2xl font-black">Não conseguimos abrir este produto agora</h1><p class="text-slate-500 mt-2">Confira se o sistema está rodando e tente abrir o produto novamente.</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', carregarProduto);
