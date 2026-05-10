const PORTS = [8080, 8081];
let API_BASE = 'http://localhost:8080/api';
let API_CATEGORIAS = `${API_BASE}/categorias`;
let API_PRODUTOS = `${API_BASE}/produtos`;
let API_PROMOCOES = `${API_BASE}/promocoes`;
let produtos = [];
let categorias = [];
let promocoesAtivas = [];
let termoAtual = '';
let categoriaAtual = '';
let precoMinAtual = '';
let precoMaxAtual = '';
let ordenacaoAtual = 'relevancia';
let searchTimer = null;
let promoTimer = null;

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function normalizeSearch(value = '') {
    return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function productMatchesSearch(produto, term) {
    const normalized = normalizeSearch(term);
    if (!normalized) return true;
    const texto = normalizeSearch(`${produto.nome || ''} ${produto.descricao || ''} ${produto.categoria?.nome || ''}`);
    return normalized.split(/\s+/).every(part => texto.includes(part));
}

function renderIcon(icon = 'mdi:paw', classes = 'text-2xl') {
    const safe = escapeHtml(icon || 'mdi:paw');
    if (safe.includes(':')) {
        return `<iconify-icon icon="${safe}" class="${classes}"></iconify-icon>`;
    }
    return `<i class="fas ${safe} ${classes}"></i>`;
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function posicionarBannerNoTopo(banner, ativo) {
    const header = document.querySelector('header');
    if (!banner) return;
    if (banner.parentElement !== document.body || banner.previousElementSibling) {
        document.body.insertBefore(banner, document.body.firstChild);
    }
    if (!header) return;
    if (!ativo) {
        header.style.top = '0px';
        return;
    }
    requestAnimationFrame(() => {
        header.style.top = `${banner.offsetHeight}px`;
    });
}

function showStatus(msg, type = 'error') {
    const div = document.getElementById('status');
    const ok = type === 'success';
    div.className = `mb-6 p-4 rounded-2xl border font-semibold ${ok ?'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`;
    div.innerHTML = `<i class="fas ${ok ?'fa-check-circle' : 'fa-triangle-exclamation'} mr-2"></i>${msg}`;
    div.classList.remove('hidden');
}

async function descobrirBackend() {
    for (const porta of PORTS) {
        try {
            const response = await fetch(`http://localhost:${porta}/api/produtos`);
            if (response.ok) {
                API_BASE = `http://localhost:${porta}/api`;
                API_CATEGORIAS = `${API_BASE}/categorias`;
                API_PRODUTOS = `${API_BASE}/produtos`;
                API_PROMOCOES = `${API_BASE}/promocoes`;
                return true;
            }
        } catch (error) {
            console.log(`Backend não respondeu na porta ${porta}`);
        }
    }
    showStatus('Backend não encontrado. Inicie o Spring Boot na porta 8080 ou 8081.');
    return false;
}

async function fetchJson(url) {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function carregarDados() {
    try {
        [produtos, categorias, promocoesAtivas] = await Promise.all([
            fetchJson(API_PRODUTOS),
            fetchJson(API_CATEGORIAS),
            fetchJson(`${API_PROMOCOES}/ativas`).catch(() => [])
        ]);
        renderCategorias();
        renderPromoBanner();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        showStatus('Erro ao carregar produtos e categorias. Verifique o backend.');
    }
}

function renderCategorias() {
    const chips = document.getElementById('categoryChips');
    if (!chips) return;
    const ativas = categorias.filter(c => c.ativo !== false);

    chips.innerHTML = `
        <button onclick="selecionarCategoria('')" class="category-chip shrink-0 px-5 py-3 rounded-2xl font-black border ${categoriaAtual === '' ?'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-700 border-slate-200'}">
            ${renderIcon('mdi:paw', 'mr-2 text-lg align-middle')}Todas
        </button>` +
        ativas.map(c => `
            <button onclick="selecionarCategoria('${c.id}')" class="category-chip shrink-0 px-5 py-3 rounded-2xl font-black border ${String(categoriaAtual) === String(c.id) ?'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-700 border-slate-200'}">
                ${renderIcon(c.icon || 'mdi:paw', 'mr-2 text-lg align-middle')}${escapeHtml(c.nome)}
            </button>`).join('');
}
function selecionarCategoria(id) {
    categoriaAtual = String(id || '');
    renderCategorias();
    aplicarFiltros();
}

function precoFinalProduto(produto) {
    return Number(calcularPrecoProduto(produto).precoFinal || produto.preco || 0);
}

function aplicarFiltros() {
    const termo = termoAtual.trim().toLowerCase();
    const min = precoMinAtual !== '' ?Number(precoMinAtual) : null;
    const max = precoMaxAtual !== '' ?Number(precoMaxAtual) : null;
    let lista = [...produtos];

    if (categoriaAtual) {
        lista = lista.filter(p => String(p.categoria?.id || '') === String(categoriaAtual));
    }

    if (termo) {
        lista = lista.filter(p => productMatchesSearch(p, termo));
    }

    lista = lista.filter(p => {
        const precoFinal = precoFinalProduto(p);
        if (min !== null && precoFinal < min) return false;
        if (max !== null && precoFinal > max) return false;
        return true;
    });

    if (ordenacaoAtual === 'menor-preco') lista.sort((a, b) => precoFinalProduto(a) - precoFinalProduto(b));
    if (ordenacaoAtual === 'maior-preco') lista.sort((a, b) => precoFinalProduto(b) - precoFinalProduto(a));
    if (ordenacaoAtual === 'promocoes') lista.sort((a, b) => Number(!!calcularPrecoProduto(b).evento || Number(b.precoDesconto || b.preco) < Number(b.preco || 0)) - Number(!!calcularPrecoProduto(a).evento || Number(a.precoDesconto || a.preco) < Number(a.preco || 0)));

    renderProdutos(lista);
    atualizarInfo(lista.length);
}

function atualizarInfo(total) {
    const info = document.getElementById('searchInfo');
    const partes = [];
    if (termoAtual.trim()) partes.push(`busca: "${escapeHtml(termoAtual.trim())}"`);
    if (categoriaAtual) {
        const cat = categorias.find(c => String(c.id) === String(categoriaAtual));
        if (cat) partes.push(`categoria: ${escapeHtml(cat.nome)}`);
    }
    info.innerHTML = partes.length ?`${total} resultado(s) para ${partes.join(' + ')}` : `${total} produto(s) encontrado(s)`;
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
    // Produtos acima de R$ 200 podem receber até o desconto máximo informado no banner, limitado a 40%.
    // Produtos abaixo de R$ 200 continuam com variedade, mas tendem a descontos menores.
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
            melhor = {
                precoFinal: precoPromocional,
                percentual,
                evento: promocao.nomeEvento
            };
        }
    });

    return melhor;
}

function produtoCarrinhoPayload(produto, calculo) {
    return {
        ...produto,
        precoOriginal: Number(produto.preco || 0),
        precoFinal: Number(calculo?.precoFinal ?? produto.precoDesconto ?? produto.preco ?? 0),
        percentual: Math.round(Number(calculo?.percentual || 0))
    };
}

function adicionarProdutoAoCarrinho(event, produtoId) {
    event.stopPropagation();
    const listaProdutos = typeof produtosCache !== 'undefined' ?produtosCache : produtos;
    const produto = listaProdutos.find(p => Number(p.id) === Number(produtoId));
    if (!produto) return;
    const calculo = calcularPrecoProduto(produto);
    window.PetZillaCart?.addItem(produtoCarrinhoPayload(produto, calculo), 1);
}

function abrirProdutoDetalhe(id) {
    if (!id) return;
    window.location.href = `produto.html?id=${encodeURIComponent(id)}`;
}

function renderProdutos(lista = []) {
    const grid = document.getElementById('produtosGrid');

    if (!lista.length) {
        grid.innerHTML = `
            <div class="col-span-full bg-white rounded-3xl p-10 text-center border border-teal-50 shadow-sm">
                <i class="fas fa-dog text-6xl text-orange-300 mb-4"></i>
                <h3 class="font-black text-xl text-slate-800">Ops, não encontramos esse produto</h3>
                <p class="text-slate-500 mt-2">Tente outra busca ou escolha uma categoria diferente.</p>
                <button onclick="limparFiltros()" class="mt-5 bg-teal-600 text-white px-5 py-3 rounded-full font-black hover:bg-teal-700 transition">Ver todos os produtos</button>
            </div>`;
        return;
    }

    grid.innerHTML = lista.map(p => {
        const preco = Number(p.preco || 0);
        const calculo = calcularPrecoProduto(p);
        const temDesconto = preco > 0 && calculo.precoFinal < preco;
        const percentual = Math.round(calculo.percentual || 0);
        const estoque = Number(p.qtdEstoque || 0);
        const imagem = p.imagem ?escapeHtml(p.imagem) : '';

        return `
            <article onclick="abrirProdutoDetalhe(${p.id})" class="product-card cursor-pointer bg-white rounded-3xl overflow-hidden border border-teal-50 shadow-sm group">
                ${temDesconto ?`<div class="bg-orange-500 text-white text-center font-black py-2 text-sm tracking-wide"><i class="fas fa-bolt mr-2"></i>${percentual}% OFF</div>` : ''}
                <div class="relative bg-gradient-to-br from-teal-50 to-orange-50 h-56 flex items-center justify-center p-6">
                    ${estoque <= 0 ?`<span class="absolute top-4 right-4 bg-slate-900 text-white text-xs font-black px-3 py-2 rounded-full shadow">Sem estoque</span>` : ''}
                    ${imagem ?`<img src="${imagem}" alt="${escapeHtml(p.nome)}" class="max-h-40 object-contain group-hover:scale-110 transition duration-300" onerror="this.outerHTML='<i class=&quot;fas fa-bone text-7xl text-teal-300&quot;></i>'">` : `<i class="fas fa-bone text-7xl text-teal-300 group-hover:scale-110 transition duration-300"></i>`}
                </div>
                <div class="p-5">
                    <p class="text-xs font-black uppercase tracking-wider text-teal-600 mb-2">${escapeHtml(p.categoria?.nome || 'Sem categoria')}</p>
                    <h3 class="font-black text-lg text-slate-900 min-h-[56px]">${escapeHtml(p.nome)}</h3>
                    <div class="mt-2 min-h-[40px] flex items-center gap-2 text-sm text-slate-500">
                        <i class="fas fa-circle-info text-teal-500"></i>
                        <span>Detalhes completos na página do produto.</span>
                    </div>
                    ${calculo.evento ?`<p class="mt-3 text-xs font-black text-blue-700 bg-blue-50 px-3 py-2 rounded-full inline-flex"><i class="fas fa-bullhorn mr-2"></i>${escapeHtml(calculo.evento)}</p>` : ''}
                    <div class="mt-4 flex items-end justify-between gap-3">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-baseline gap-2">
                                <p class="text-2xl font-black text-orange-500">${formatMoney(temDesconto ?calculo.precoFinal : preco)}</p>
                                ${temDesconto ?`<p class="text-sm text-slate-400 line-through font-bold">${formatMoney(preco)}</p>` : ''}
                            </div>
                        </div>
                        <span class="text-xs font-bold ${estoque > 0 ?'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'} px-3 py-2 rounded-full">
                            ${estoque > 0 ?`${estoque} un.` : 'indisponível'}
                        </span>
                    </div>
                    <div class="mt-4 flex flex-col sm:flex-row gap-2">
                        <button type="button" onclick="adicionarProdutoAoCarrinho(event, ${p.id})" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-2xl font-black transition">
                            <i class="fas fa-cart-plus mr-2"></i>Adicionar
                        </button>
                        <span class="inline-flex items-center justify-center text-sm font-black text-teal-700 px-2 py-3">
                            Ver produto <i class="fas fa-arrow-right ml-1"></i>
                        </span>
                    </div>
                </div>
            </article>`;
    }).join('');
}

function renderPromoBanner() {
    const banner = document.getElementById('promoBanner');
    if (!banner) return;
    if (promoTimer) clearInterval(promoTimer);

    if (!promocoesAtivas.length) {
        banner.className = 'hidden';
        posicionarBannerNoTopo(banner, false);
        return;
    }

    const promo = [...promocoesAtivas].sort((a, b) => new Date(a.dataFim) - new Date(b.dataFim))[0];
    const maiorDesconto = Math.min(40, Math.round(Math.max(...promocoesAtivas.map(p => Number(p.percentualDesconto || 0)))));

    const tick = () => {
        let diff = new Date(promo.dataFim).getTime() - Date.now();
        if (diff < 0) diff = 0;
        const totalSeg = Math.floor(diff / 1000);
        const horas = Math.floor(totalSeg / 3600);
        const min = Math.floor((totalSeg % 3600) / 60);
        const seg = totalSeg % 60;
        banner.innerHTML = `
            <div class="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-center gap-4 text-center">
                <div class="font-bold">ATÉ <span class="text-4xl md:text-5xl font-black text-orange-100 drop-shadow">${maiorDesconto}%</span> OFF</div>
                <div class="font-semibold leading-tight">${escapeHtml(promo.nomeEvento)}<br><span class="text-blue-100">${escapeHtml((promo.descricao || "ofertas especiais nos produtos selecionados"))}</span></div>
                <div class="flex items-center justify-center gap-4 md:ml-6">
                    <div><strong class="text-3xl font-black">${String(horas).padStart(2, '0')}</strong><p class="text-xs">HORAS</p></div>
                    <div><strong class="text-3xl font-black">${String(min).padStart(2, '0')}</strong><p class="text-xs">MIN</p></div>
                    <div><strong class="text-3xl font-black">${String(seg).padStart(2, '0')}</strong><p class="text-xs">SEG</p></div>
                </div>
                <a href="#produtosGrid" class="underline font-bold md:ml-6">Aproveite!</a>
            </div>`;
    };

    banner.className = 'bg-blue-600 text-white shadow-lg sticky top-0';
    banner.style.zIndex = '70';
    tick();
    posicionarBannerNoTopo(banner, true);
    promoTimer = setInterval(() => {
        tick();
        posicionarBannerNoTopo(banner, true);
    }, 1000);
    window.addEventListener('resize', () => posicionarBannerNoTopo(banner, true));
}

function limparFiltros() {
    termoAtual = '';
    categoriaAtual = '';
    precoMinAtual = '';
    precoMaxAtual = '';
    ordenacaoAtual = 'relevancia';
    document.getElementById('searchInput').value = '';
    document.getElementById('precoMinFiltro').value = '';
    document.getElementById('precoMaxFiltro').value = '';
    document.getElementById('ordenacaoFiltro').value = 'relevancia';
    document.getElementById('clearSearch').classList.add('hidden');
    renderCategorias();
    aplicarFiltros();
}

function configurarEventos() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const precoMin = document.getElementById('precoMinFiltro');
    const precoMax = document.getElementById('precoMaxFiltro');
    const ordenacao = document.getElementById('ordenacaoFiltro');
    const limparAvancado = document.getElementById('limparFiltrosAvancados');

    searchInput.addEventListener('input', (event) => {
        clearTimeout(searchTimer);
        termoAtual = event.target.value;
        clearSearch.classList.toggle('hidden', !termoAtual.trim());
        searchTimer = setTimeout(aplicarFiltros, 180);
    });

    clearSearch.addEventListener('click', () => {
        termoAtual = '';
        searchInput.value = '';
        clearSearch.classList.add('hidden');
        aplicarFiltros();
    });

    document.getElementById('categoryPrev')?.addEventListener('click', () => document.getElementById('categoryChips')?.scrollBy({ left: -320, behavior: 'smooth' }));
    document.getElementById('categoryNext')?.addEventListener('click', () => document.getElementById('categoryChips')?.scrollBy({ left: 320, behavior: 'smooth' }));
    const aplicarPreco = () => {
        precoMinAtual = precoMin?.value || '';
        precoMaxAtual = precoMax?.value || '';
        ordenacaoAtual = ordenacao?.value || 'relevancia';
        aplicarFiltros();
    };
    precoMin?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(aplicarPreco, 180); });
    precoMax?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(aplicarPreco, 180); });
    ordenacao?.addEventListener('change', aplicarPreco);
    limparAvancado?.addEventListener('click', limparFiltros);
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    if (q) {
        termoAtual = q;
        const input = document.getElementById('searchInput');
        const clear = document.getElementById('clearSearch');
        if (input) input.value = q;
        clear?.classList.remove('hidden');
    }
    configurarEventos();
    await descobrirBackend();
    await carregarDados();
});

