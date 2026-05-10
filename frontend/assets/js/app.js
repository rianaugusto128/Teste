const PORTS = [8080, 8081];
let API_BASE = 'http://localhost:8080/api';
let API_CATEGORIAS = `${API_BASE}/categorias`;
let API_PRODUTOS = `${API_BASE}/produtos`;
let API_PROMOCOES = `${API_BASE}/promocoes`;
let backendDisponivel = false;
let produtosCache = [];
let categoriasCache = [];
let promocoesAtivas = [];
let categoriaSelecionadaId = null;
let termoAtual = '';
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

function searchableProductText(produto = {}) {
    return normalizeSearch(`${produto.nome || ''} ${produto.descricao || ''} ${produto.categoria?.nome || ''}`);
}

function productMatchesSearch(produto, term) {
    const normalizedTerm = normalizeSearch(term);
    if (!normalizedTerm) return true;
    return normalizedTerm.split(/\s+/).every(part => searchableProductText(produto).includes(part));
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

function showStatus(msg, type = 'success') {
    const div = document.getElementById('status');
    if (!div) return;
    const success = type === 'success';
    div.className = `mb-6 p-4 rounded-2xl border font-semibold ${success ?'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`;
    div.innerHTML = `<i class="fas ${success ?'fa-check-circle' : 'fa-triangle-exclamation'} mr-2"></i>${msg}`;
    div.classList.remove('hidden');
    setTimeout(() => div.classList.add('hidden'), 4500);
}

async function testarBackend() {
    for (const porta of PORTS) {
        try {
            const response = await fetch(`http://localhost:${porta}/api/produtos`, { method: 'GET' });
            if (response.ok) {
                API_BASE = `http://localhost:${porta}/api`;
                API_CATEGORIAS = `${API_BASE}/categorias`;
                API_PRODUTOS = `${API_BASE}/produtos`;
                API_PROMOCOES = `${API_BASE}/promocoes`;
                backendDisponivel = true;
                return true;
            }
        } catch (error) {
            console.log(`Backend não respondeu na porta ${porta}`);
        }
    }
    backendDisponivel = false;
    showStatus('Backend não encontrado. Inicie o Spring Boot na porta 8080 ou 8081.', 'error');
    return false;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.status === 204) return null;
    return response.json();
}

async function loadCategories() {
    try {
        categoriasCache = await fetchJson(API_CATEGORIAS);
        displayCategories(categoriasCache);
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        const grid = document.getElementById('categoriesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full bg-red-50 border border-red-200 text-red-700 rounded-3xl p-8 text-center">
                    <i class="fas fa-plug-circle-xmark text-5xl mb-3"></i>
                    <p class="font-black">Não foi possível carregar as categorias.</p>
                    <p class="text-sm mt-1">Verifique se o backend Spring Boot está rodando.</p>
                </div>`;
        }
    }
}

async function loadProdutos() {
    try {
        produtosCache = await fetchJson(API_PRODUTOS);
        aplicarFiltros();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        const grid = document.getElementById('produtosGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full bg-red-50 border border-red-200 text-red-700 rounded-3xl p-8 text-center">
                    <i class="fas fa-plug-circle-xmark text-5xl mb-3"></i>
                    <p class="font-black">Não foi possível carregar os produtos.</p>
                    <p class="text-sm mt-1">Verifique se o backend Spring Boot está rodando.</p>
                    <button onclick="inicializarPagina()" class="mt-5 bg-orange-500 text-white px-5 py-3 rounded-full font-black hover:bg-orange-600 transition">
                        <i class="fas fa-rotate-right mr-2"></i>Tentar novamente
                    </button>
                </div>`;
        }
    }
}

async function loadPromocoesAtivas() {
    try {
        promocoesAtivas = await fetchJson(`${API_PROMOCOES}/ativas`);
        renderPromoBanner();
        aplicarFiltros();
    } catch (error) {
        console.warn('Promoções não carregadas. Verifique se o endpoint /api/promocoes foi adicionado.', error);
        promocoesAtivas = [];
        renderPromoBanner();
    }
}

function displayCategories(categories = []) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    const activeCategories = categories.filter(c => c.ativo !== false);
    if (activeCategories.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-8 text-slate-500">Nenhuma categoria cadastrada.</div>';
        return;
    }

    const allCard = `
        <button onclick="filtrarPorCategoria(null)" class="category-card text-left bg-white rounded-3xl p-5 border ${categoriaSelecionadaId === null ?'border-orange-300 ring-4 ring-orange-100' : 'border-teal-50'} shadow-sm">
            <div class="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
                ${renderIcon('mdi:paw', 'text-orange-500 text-2xl')}
            </div>
            <h3 class="font-black text-slate-800">Todos</h3>
            <p class="text-xs text-slate-500 mt-1">Ver tudo</p>
        </button>`;

    grid.innerHTML = allCard + activeCategories.map(c => `
        <button onclick="filtrarPorCategoria(${c.id})" class="category-card text-left bg-white rounded-3xl p-5 border ${categoriaSelecionadaId === c.id ?'border-orange-300 ring-4 ring-orange-100' : 'border-teal-50'} shadow-sm">
            <div class="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                ${renderIcon(c.icon || 'mdi:paw', 'text-teal-600 text-2xl')}
            </div>
            <h3 class="font-black text-slate-800">${escapeHtml(c.nome)}</h3>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(c.descricao || 'Produtos selecionados')}</p>
        </button>`).join('');
}

function filtrarPorCategoria(id) {
    categoriaSelecionadaId = id;
    displayCategories(categoriasCache);
    aplicarFiltros();
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function produtoApareceNaHome(produto) {
    return produto.destaque === true || promocoesAtivas.some(promoção => produtoTemPromocao(promocao, produto.id));
}
function aplicarFiltros() {
    const term = normalizeSearch(termoAtual);
    let filtrados = term ?[...produtosCache] : produtosCache.filter(produtoApareceNaHome);

    if (categoriaSelecionadaId !== null) {
        filtrados = filtrados.filter(p => Number(p.categoria?.id) === Number(categoriaSelecionadaId));
    }

    if (term) {
        filtrados = filtrados.filter(p => productMatchesSearch(p, term));
    }

    displayProdutos(filtrados);
    atualizarInfoBusca(filtrados.length);
    renderSearchSuggestions();
}

function atualizarInfoBusca(total) {
    const info = document.getElementById('searchInfo');
    if (!info) return;
    const partes = [];
    if (termoAtual.trim()) partes.push(`pesquisa: "${escapeHtml(termoAtual.trim())}"`);
    if (categoriaSelecionadaId !== null) {
        const categoria = categoriasCache.find(c => Number(c.id) === Number(categoriaSelecionadaId));
        if (categoria) partes.push(`categoria: ${escapeHtml(categoria.nome)}`);
    }
    info.innerHTML = partes.length ?`${total} resultado(s) para ${partes.join(' + ')}` : `${total} produto(s) em destaque`;
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

function displayProdutos(produtos = []) {
    const grid = document.getElementById('produtosGrid');
    if (!grid) return;

    if (!produtos || produtos.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white rounded-3xl p-10 text-center border border-teal-50 shadow-sm">
                <i class="fas fa-dog text-6xl text-orange-300 mb-4"></i>
                <h3 class="font-black text-xl text-slate-800">Ops, não encontramos esse produto</h3>
                <p class="text-slate-500 mt-2">A home mostra apenas produtos em promocao ou marcados como destaque no admin.</p>
                <button onclick="window.location.href='produtos.html'" class="mt-5 bg-teal-600 text-white px-5 py-3 rounded-full font-black hover:bg-teal-700 transition">Ver catálogo completo</button>
            </div>`;
        return;
    }

    grid.innerHTML = produtos.map(p => {
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
                <a href="#produtos" class="underline font-bold md:ml-6">Aproveite!</a>
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

function limparBusca() {
    const input = document.getElementById('searchInput');
    const clear = document.getElementById('clearSearch');
    termoAtual = '';
    categoriaSelecionadaId = null;
    if (input) input.value = '';
    if (clear) clear.classList.add('hidden');
    hideSearchSuggestions();
    displayCategories(categoriasCache);
    aplicarFiltros();
}

function hideSearchSuggestions() {
    const panel = document.getElementById('searchSuggestions');
    const input = document.getElementById('searchInput');
    panel?.classList.add('hidden');
    input?.setAttribute('aria-expanded', 'false');
}

function searchResultUrl(term = termoAtual) {
    const query = term.trim();
    return query ?`produtos.html?q=${encodeURIComponent(query)}` : 'produtos.html';
}

function goToSearchResults() {
    window.location.href = searchResultUrl();
}

function suggestionProductRow(produto) {
    const calculo = calcularPrecoProduto(produto);
    const imagem = produto.imagem ?`<img src="${escapeHtml(produto.imagem)}" alt="${escapeHtml(produto.nome)}" class="w-12 h-12 rounded-2xl object-cover bg-teal-50">` : '<div class="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600"><i class="fas fa-bone"></i></div>';
    return `<button type="button" onclick="abrirProdutoDetalhe(${produto.id})" class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-teal-50 transition">
        ${imagem}
        <span class="min-w-0 flex-1"><span class="block font-black text-slate-900 truncate">${escapeHtml(produto.nome)}</span><span class="block text-xs font-semibold text-slate-500 truncate">${escapeHtml(produto.categoria?.nome || 'Sem categoria')}</span></span>
        <span class="font-black text-orange-500">${formatMoney(calculo.precoFinal || produto.preco)}</span>
    </button>`;
}

function renderSearchSuggestions() {
    const panel = document.getElementById('searchSuggestions');
    const input = document.getElementById('searchInput');
    if (!panel || !input) return;
    const rawTerm = termoAtual.trim();
    const term = normalizeSearch(rawTerm);
    if (!term) { hideSearchSuggestions(); return; }

    const matchingProducts = produtosCache.filter(p => productMatchesSearch(p, term));
    const products = matchingProducts.slice(0, 5);
    const categories = categoriasCache.filter(c => c.ativo !== false && normalizeSearch(`${c.nome || ''} ${c.descricao || ''}`).includes(term)).slice(0, 3);
    const categoryRows = categories.map(c => `<button type="button" onclick="filtrarPorCategoria(${Number(c.id)})" class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 transition"><span class="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">${renderIcon(c.icon || 'mdi:paw', 'text-xl')}</span><span><span class="block font-black text-slate-900">${escapeHtml(c.nome)}</span><span class="block text-xs font-semibold text-slate-500">Categoria</span></span></button>`).join('');

    panel.innerHTML = `
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
            <span class="text-sm font-black text-slate-700">Resultados para "${escapeHtml(rawTerm)}"</span>
            <button type="button" onclick="goToSearchResults()" class="text-sm font-black text-teal-700 hover:text-orange-500">Ver todos</button>
        </div>
        ${products.length ?`<div class="py-2">${products.map(suggestionProductRow).join('')}</div>` : '<div class="px-4 py-6 text-center text-slate-500 font-bold">Nenhum produto encontrado na vitrine.</div>'}
        ${categoryRows ?`<div class="border-t border-slate-100 py-2">${categoryRows}</div>` : ''}
        <button type="button" onclick="goToSearchResults()" class="w-full px-4 py-4 bg-slate-950 text-white font-black hover:bg-teal-700 transition"><i class="fas fa-magnifying-glass mr-2"></i>Ver ${matchingProducts.length} resultado(s) no catálogo</button>`;
    panel.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
}

function configurarBusca() {
    const input = document.getElementById('searchInput');
    const clear = document.getElementById('clearSearch');
    const submit = document.getElementById('searchSubmit');
    if (!input) return;

    input.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        termoAtual = e.target.value;
        clear?.classList.toggle('hidden', !termoAtual.trim());
        searchTimer = setTimeout(aplicarFiltros, 120);
    });

    input.addEventListener('focus', renderSearchSuggestions);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); goToSearchResults(); }
        if (event.key === 'Escape') hideSearchSuggestions();
    });
    document.addEventListener('click', event => {
        const wrapper = input.closest('.relative');
        if (wrapper && !wrapper.contains(event.target)) hideSearchSuggestions();
    });

    clear?.addEventListener('click', limparBusca);
    submit?.addEventListener('click', goToSearchResults);
}

async function inicializarPagina() {
    await testarBackend();
    await Promise.all([loadCategories(), loadProdutos(), loadPromocoesAtivas()]);
}

window.goToSearchResults = goToSearchResults;
window.abrirProdutoDetalhe = abrirProdutoDetalhe;
window.filtrarPorCategoria = filtrarPorCategoria;

document.addEventListener('DOMContentLoaded', () => {
    configurarBusca();
    inicializarPagina();
});

