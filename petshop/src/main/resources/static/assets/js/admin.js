const PORTS = [8080, 8081];
let API_BASE = 'http://localhost:8080/api';
let API_CATEGORIAS = `${API_BASE}/categorias`;
let API_PRODUTOS = `${API_BASE}/produtos`;
let API_PROMOCOES = `${API_BASE}/promocoes`;
let API_USUARIOS = `${API_BASE}/usuarios`;
let API_CARGOS = `${API_BASE}/cargos`;
let API_COMPRAS = `${API_BASE}/compras`;

let produtos = [];
let categorias = [];
let promocoes = [];
let usuarios = [];
let cargos = [];
let vendas = [];
let currentTab = 'produtos';
let produtosSelecionadosPromocao = new Set();
let previewTimer = null;
let adminPermissoes = null;

const ICONES_CATEGORIA = [
    { value: 'mdi:paw', label: 'Patinha' },
    { value: 'mdi:dog', label: 'Cachorro' },
    { value: 'mdi:cat', label: 'Gato' },
    { value: 'mdi:fish', label: 'Peixe' },
    { value: 'mdi:bird', label: 'Pássaro' },
    { value: 'mdi:rabbit', label: 'Coelho' },
    { value: 'mdi:turtle', label: 'Tartaruga' },
    { value: 'mdi:horse', label: 'Cavalo' },
    { value: 'mdi:duck', label: 'Pato' },
    { value: 'mdi:butterfly', label: 'Borboleta' },
    { value: 'mdi:bee', label: 'Abelha' },
    { value: 'mdi:snail', label: 'Caracol' },
    { value: 'game-icons:parrot-head', label: 'Papagaio' },
    { value: 'game-icons:hamster', label: 'Hamster' },
    { value: 'game-icons:goldfish', label: 'Peixe dourado' },
    { value: 'game-icons:seahorse', label: 'Cavalo-marinho' },
    { value: 'game-icons:chicken', label: 'Galinha' },
    { value: 'game-icons:goat', label: 'Cabra' },
    { value: 'game-icons:cow', label: 'Vaca' },
    { value: 'game-icons:pig', label: 'Porco' },
    { value: 'fa-paw', label: 'Patinha ' },
    { value: 'fa-dog', label: 'Cachorro ' },
    { value: 'fa-cat', label: 'Gato ' },
    { value: 'fa-bone', label: 'Osso ' },
    { value: 'fa-fish', label: 'Peixe ' }
];

function getSessaoAdmin() {
    const sessao = window.PetZillaSession?.getSession?.() || JSON.parse(localStorage.getItem('petzilla_sessao') || 'null');
    if (sessao?.perfil === 'ADMIN') return sessao;
    const cargo = sessao?.cargo;
    if (cargo && cargo.ativo !== false && (
        cargo.acessoProdutos || cargo.acessoCategorias || cargo.acessoPromocoes ||
        cargo.acessoUsuarios || cargo.acessoCargos || cargo.acessoEstoque || cargo.acessoVendas || cargo.acessoSuporte
    )) return sessao;
    if (localStorage.getItem('petzilla_admin_logado') === 'true' && localStorage.getItem('petzilla_usuario_perfil') === 'ADMIN') return { perfil: 'ADMIN', nome: 'Administrador' };
    return null;
}

function permissoesDaSessao(sessao) {
    if (!sessao || sessao.perfil === 'ADMIN') {
        return { produtos: true, categorias: true, promocoes: true, vendas: true, suporte: true, usuarios: true, cargos: true, estoque: true };
    }
    const cargo = sessao.cargo || {};
    return {
        produtos: !!cargo.acessoProdutos,
        categorias: !!cargo.acessoCategorias,
        promocoes: !!cargo.acessoPromocoes,
        vendas: !!(cargo.acessoVendas || cargo.acessoProdutos || cargo.acessoEstoque || cargo.acessoCargos),
        usuarios: !!cargo.acessoUsuarios,
        cargos: !!cargo.acessoCargos,
        estoque: !!cargo.acessoEstoque
    };
}

function temPermissao(area) {
    return !!adminPermissoes?.[area];
}

function temAcessoProdutosOuEstoque() {
    return temPermissao('produtos') || temPermissao('estoque');
}

function negarAcesso(mensagem = 'Seu cargo não tem permissão para esta ação.') {
    showStatus(mensagem, 'error');
    return false;
}

async function atualizarSessaoAdminPeloBackend() {
    const sessao = window.PetZillaSession?.getSession?.() || JSON.parse(localStorage.getItem('petzilla_sessao') || 'null');
    if (!sessao?.id) return sessao;
    try {
        const usuarioAtualizado = await fetchJson(`${API_USUARIOS}/${sessao.id}`);
        const sessaoAtualizada = { ...sessao, ...usuarioAtualizado, logado: true };
        window.PetZillaSession?.saveSession?.(sessaoAtualizada);
        return sessaoAtualizada;
    } catch (error) {
        console.warn('Não foi possível atualizar a sessão do usuário pelo backend.', error);
        return sessao;
    }
}

function protegerAdmin() {
    const sessao = getSessaoAdmin();
    if (!sessao) {
        window.location.href = 'login.html';
        return;
    }
    adminPermissoes = permissoesDaSessao(sessao);
    aplicarPermissoesAdmin();
}

function aplicarPermissoesAdmin() {
    if (!adminPermissoes) return;
    const mapa = {
        produtos: 'tabProdutos',
        categorias: 'tabCategorias',
        promocoes: 'tabPromocoes',
        vendas: 'tabVendas',
        usuarios: 'tabUsuarios',
        cargos: 'tabCargos'
    };

    Object.entries(mapa).forEach(([key, id]) => {
        const visivel = key === 'produtos' ?temAcessoProdutosOuEstoque() : temPermissao(key);
        document.getElementById(id)?.classList.toggle('hidden', !visivel);
    });

    document.getElementById('novoProdutoButton')?.classList.toggle('hidden', !temPermissao('produtos'));
    document.getElementById('estoqueOnlyNotice')?.classList.toggle('hidden', !(temPermissao('estoque') && !temPermissao('produtos')));

    const ordem = ['produtos', 'categorias', 'promocoes', 'vendas', 'suporte', 'usuarios', 'cargos'];
    const primeira = ordem.find(k => k === 'produtos' ?temAcessoProdutosOuEstoque() : temPermissao(k));
    if (primeira) currentTab = primeira;
    else window.location.href = 'produtos.html';
}

function logoutAdmin() {
    window.PetZillaSession?.clearSession?.();
    localStorage.removeItem('petzilla_admin_logado');
    localStorage.removeItem('petzilla_admin_usuario');
    localStorage.removeItem('petzilla_admin_login_em');
    window.location.href = 'login.html';
}

function escapeHtml(value = '') {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
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

function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function toDatetimeLocal(value) { return value ?String(value).slice(0, 16) : ''; }
function toLocalDatetimeInput(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function showStatus(msg, type = 'success') {
    const div = document.getElementById('status');
    const ok = type === 'success';
    div.className = `mb-6 p-4 rounded-2xl border font-semibold ${ok ?'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`;
    div.innerHTML = `<i class="fas ${ok ?'fa-check-circle' : 'fa-triangle-exclamation'} mr-2"></i>${msg}`;
    div.classList.remove('hidden');
    setTimeout(() => div.classList.add('hidden'), 4500);
}

async function descobrirBackend() {
    const bases = [];
    if (window.location.protocol.startsWith('http')) {
        bases.push(`${window.location.origin}/api`);
    }
    bases.push('http://localhost:8080/api', 'http://localhost:8081/api');

    const testadas = [];
    for (const base of [...new Set(bases)]) {
        try {
            testadas.push(base);
            const response = await fetch(`${base}/produtos`, { method: 'GET', cache: 'no-store' });
            if (response.ok) {
                API_BASE = base;
                API_CATEGORIAS = `${API_BASE}/categorias`;
                API_PRODUTOS = `${API_BASE}/produtos`;
                API_PROMOCOES = `${API_BASE}/promocoes`;
                API_USUARIOS = `${API_BASE}/usuarios`;
                API_CARGOS = `${API_BASE}/cargos`;
                API_COMPRAS = `${API_BASE}/compras`;
                atualizarApiStatus(`Conectado ao backend: ${API_BASE}`, 'success');
                return true;
            }
        } catch (error) {
            console.log(`Backend não respondeu em ${base}`, error);
        }
    }
    atualizarApiStatus(`Backend não encontrado. Testado: ${testadas.join(', ')}`, 'error');
    showStatus('Backend não encontrado. Abra o site pelo Spring Boot ou inicie o backend na porta 8080/8081.', 'error');
    return false;
}

function atualizarApiStatus(mensagem, tipo = 'info') {
    const el = document.getElementById('apiStatus');
    if (!el) return;
    const classes = {
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        error: 'bg-red-50 text-red-700 border-red-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200'
    };
    el.className = `mb-6 p-4 rounded-2xl border font-semibold ${classes[tipo] || classes.info}`;
    el.innerHTML = `<i class="fas ${tipo === 'error' ?'fa-triangle-exclamation' : tipo === 'success' ?'fa-plug-circle-check' : 'fa-circle-info'} mr-2"></i>${mensagem}`;
    el.classList.remove('hidden');
}

function normalizarLista(valor) {
    if (Array.isArray(valor)) return valor;
    if (Array.isArray(valor?.content)) return valor.content;
    if (Array.isArray(valor?.data)) return valor.data;
    return [];
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.mensagem || `HTTP ${response.status}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ?JSON.parse(text) : null;
}

async function carregarDados() {
    const statusItens = [];

    async function carregarLista(nome, url) {
        try {
            const dados = normalizarLista(await fetchJson(url));
            statusItens.push(`${nome}: ${dados.length}`);
            return dados;
        } catch (error) {
            console.error(`Erro ao carregar ${nome}:`, error);
            statusItens.push(`${nome}: erro`);
            return [];
        }
    }

    produtos = await carregarLista('produtos', API_PRODUTOS);
    categorias = await carregarLista('categorias', API_CATEGORIAS);
    promocoes = await carregarLista('promoções', API_PROMOCOES);
    usuarios = await carregarLista('usuários', API_USUARIOS);
    cargos = await carregarLista('cargos', API_CARGOS);
    vendas = await carregarLista('vendas', API_COMPRAS);

    renderTudo();

    const total = produtos.length + categorias.length + promocoes.length + usuarios.length + cargos.length + vendas.length;
    if (total === 0) {
        atualizarApiStatus(`Backend respondeu, mas nenhuma informação foi encontrada no banco. ${statusItens.join(' | ')}. Confira se você está usando o banco petshop correto e se rodou os SQLs da pasta database.`, 'error');
    } else {
        atualizarApiStatus(`Dados carregados do banco. ${statusItens.join(' | ')}.`, 'success');
    }
}

function renderTudo() {
    const executar = (nome, fn) => {
        try { fn(); } catch (error) { console.error(`Erro em ${nome}:`, error); }
    };
    produtos = normalizarLista(produtos);
    categorias = normalizarLista(categorias);
    promocoes = normalizarLista(promocoes);
    usuarios = normalizarLista(usuarios);
    cargos = normalizarLista(cargos);
    vendas = normalizarLista(vendas);

    executar('stats', renderStats);
    executar('produtos', renderProdutos);
    executar('categorias', renderCategorias);
    executar('promoções', renderPromocoes);
    executar('vendas', renderVendas);
    executar('filtro cargos usuários', preencherFiltroCargosUsuarios);
    executar('usuários', renderUsuarios);
    executar('cargos', renderCargos);
    executar('select categorias', carregarSelectCategorias);
    executar('select cargos usuários', carregarSelectCargosUsuarios);
    executar('ícones', preencherSelectIcones);
    executar('preview banner', atualizarPreviewBannerAdmin);
    executar('abas', () => showAdminTab(currentTab));
}

function promocaoEstaAtiva(promocao) {
    const agora = new Date();
    const fim = new Date(promocao.dataFim);
    return promocao.ativo !== false && fim >= agora;
}

function renderStats() {
    document.getElementById('totalProdutos').innerText = normalizarLista(produtos).length;
    document.getElementById('totalCategorias').innerText = normalizarLista(categorias).length;
    document.getElementById('totalPromocoesAtivas').innerText = normalizarLista(promocoes).filter(promocaoEstaAtiva).length;
    document.getElementById('totalBaixoEstoque').innerText = normalizarLista(produtos).filter(p => Number(p.qtdEstoque || 0) <= 5).length;
}

function showAdminTab(tab) {
    const podeAbrir = tab === 'produtos' ?temAcessoProdutosOuEstoque() : temPermissao(tab);
    if (!podeAbrir) {
        const primeira = ['produtos', 'categorias', 'promocoes', 'vendas', 'suporte', 'usuarios', 'cargos']
            .find(t => t === 'produtos' ?temAcessoProdutosOuEstoque() : temPermissao(t));
        tab = primeira || 'produtos';
    }
    currentTab = tab;
    ['produtos', 'categorias', 'promocoes', 'vendas', 'suporte', 'usuarios', 'cargos'].forEach(nome => {
        const podeVer = nome === 'produtos' ?temAcessoProdutosOuEstoque() : temPermissao(nome);
        document.getElementById(`${nome}Section`)?.classList.toggle('hidden', nome !== tab || !podeVer);
    });

    const labels = { produtos: 'Produtos', categorias: 'Categorias', promocoes: 'Promocoes', vendas: 'Vendas', suporte: 'Suporte', usuarios: 'Usuarios', cargos: 'Cargos' };
    Object.entries(labels).forEach(([key, nome]) => {
        const el = document.getElementById(`tab${nome}`);
        if (!el) return;
        const podeVer = key === 'produtos' ?temAcessoProdutosOuEstoque() : temPermissao(key);
        const alvo = key === tab;
        el.className = alvo
            ?'tab-active px-5 py-3 rounded-2xl font-black transition'
            : 'px-5 py-3 rounded-2xl font-black transition text-slate-600 hover:bg-slate-100';
        el.classList.toggle('hidden', !podeVer);
    });

    document.getElementById('novoProdutoButton')?.classList.toggle('hidden', !temPermissao('produtos'));
    document.getElementById('estoqueOnlyNotice')?.classList.toggle('hidden', !(temPermissao('estoque') && !temPermissao('produtos')));
}

function renderProdutos() {
    const tbody = document.getElementById('produtosTable');
    if (!tbody) return;

    if (!temAcessoProdutosOuEstoque()) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-500 font-bold">Seu cargo não tem acesso a produtos ou estoque.</td></tr>';
        return;
    }

    const termo = document.getElementById('adminSearchProdutos')?.value.trim().toLowerCase() || '';
    const lista = normalizarLista(produtos).filter(p => `${p.nome || ''} ${p.descricao || ''} ${p.categoria?.nome || ''}`.toLowerCase().includes(termo));
    const podeEditarProduto = temPermissao('produtos');
    const podeEditarEstoque = temPermissao('estoque');

    document.getElementById('novoProdutoButton')?.classList.toggle('hidden', !podeEditarProduto);
    document.getElementById('estoqueOnlyNotice')?.classList.toggle('hidden', !(podeEditarEstoque && !podeEditarProduto));

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Nenhum produto encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const imagem = p.imagem
            ?`<img src="${escapeHtml(p.imagem)}" class="w-14 h-14 rounded-2xl object-cover bg-slate-100" onerror="this.outerHTML='<div class=&quot;w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center&quot;><i class=&quot;fas fa-bone text-teal-500&quot;></i></div>'">`
            : '<div class="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center"><i class="fas fa-bone text-teal-500"></i></div>';
        const preco = Number(p.preco || 0);
        const precoDesconto = Number(p.precoDesconto || p.preco || 0);
        const temDesconto = precoDesconto > 0 && precoDesconto < preco;
        const estoque = Number(p.qtdEstoque || 0);
        const estoqueInput = podeEditarEstoque
            ?`<input id="estoque_${p.id}" type="number" min="0" step="1" value="${estoque}" class="w-24 px-3 py-2 rounded-xl border border-slate-200 font-bold">
               <button onclick="salvarEstoque(${p.id})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold" title="Salvar estoque"><i class="fas fa-floppy-disk"></i></button>`
            : `<span class="font-black text-slate-700">${estoque} un.</span>`;
        const acoes = podeEditarProduto
            ?`<button onclick="editarProduto(${p.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-edit"></i></button>
               <button onclick="excluirProduto(${p.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-trash"></i></button>`
            : '<span class="text-xs text-slate-400 font-bold">Somente estoque</span>';

        return `
            <tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        ${imagem}
                        <div>
                            <p class="font-black text-slate-900">${escapeHtml(p.nome)}</p>
                            <p class="text-sm text-slate-500 max-w-xs truncate">${escapeHtml(p.descricao || '')}</p>
                            ${p.destaque ?'<span class="inline-flex mt-1 bg-orange-50 text-orange-600 px-2 py-1 rounded-full text-[11px] font-black">Destaque home</span>' : ''}
                        </div>
                    </div>
                </td>
                <td class="p-4 font-semibold text-slate-600">${escapeHtml(p.categoria?.nome || 'Sem categoria')}</td>
                <td class="p-4">
                    <p class="font-black text-orange-500">${formatMoney(temDesconto ?precoDesconto : preco)}</p>
                    ${temDesconto ?`<p class="text-xs text-slate-400 line-through">${formatMoney(preco)}</p>` : ''}
                </td>
                <td class="p-4">
                    <div class="flex items-center gap-2">${estoqueInput}</div>
                    ${estoque <= 5 ?'<p class="text-xs text-red-500 font-bold mt-1">Baixo estoque</p>' : ''}
                </td>
                <td class="p-4">
                    <span class="px-3 py-2 rounded-full text-xs font-black ${p.ativo !== false ?'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">
                        ${p.ativo !== false ?'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="p-4">
                    <div class="flex justify-end gap-2">${acoes}</div>
                </td>
            </tr>`;
    }).join('');
}

function renderCategorias() {
    const tbody = document.getElementById('categoriasTable');
    if (!tbody) return;
    const termo = document.getElementById('adminSearchCategorias')?.value.trim().toLowerCase() || '';
    const lista = normalizarLista(categorias).filter(c => `${c.nome || ''} ${c.descricao || ''}`.toLowerCase().includes(termo));
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500">Nenhuma categoria encontrada.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(c => `
        <tr class="border-t border-slate-100 hover:bg-slate-50">
            <td class="p-4"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">${renderIcon(c.icon || 'mdi:paw', 'text-2xl text-orange-500')}</div><p class="font-black text-slate-900">${escapeHtml(c.nome)}</p></div></td>
            <td class="p-4 text-slate-600">${escapeHtml(c.descricao || '-')}</td>
            <td class="p-4 font-mono text-sm text-slate-500">${escapeHtml(c.icon || 'mdi:paw')}</td>
            <td class="p-4"><span class="px-3 py-2 rounded-full text-xs font-black ${c.ativo !== false ?'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${c.ativo !== false ?'Ativa' : 'Inativa'}</span></td>
            <td class="p-4"><div class="flex justify-end gap-2"><button onclick="editarCategoria(${c.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-edit"></i></button><button onclick="excluirCategoria(${c.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-trash"></i></button></div></td>
        </tr>`).join('');
}

function renderPromocoes() {
    const tbody = document.getElementById('promocoesTable');
    if (!tbody) return;
    promocoes = normalizarLista(promocoes);
    if (!promocoes.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Nenhuma promoção cadastrada.</td></tr>';
        return;
    }
    tbody.innerHTML = normalizarLista(promocoes).map(p => {
        const ativaAgora = promocaoEstaAtiva(p);
        return `
            <tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="p-4"><p class="font-black text-slate-900">${escapeHtml(p.nomeEvento)}</p><p class="text-sm text-slate-500">${escapeHtml(p.descricao || '')}</p></td>
                <td class="p-4"><span class="bg-orange-100 text-orange-700 px-3 py-2 rounded-full text-xs font-black">Até ${Math.min(40, Number(p.percentualDesconto || 0))}% OFF</span></td>
                <td class="p-4 text-sm text-slate-600"><p><strong>Início:</strong> ${formatDateTime(p.dataInicio)}</p><p><strong>Fim:</strong> ${formatDateTime(p.dataFim)}</p></td>
                <td class="p-4 font-bold text-slate-600">${p.produtos?.length || 0} produto(s)</td>
                <td class="p-4"><span class="px-3 py-2 rounded-full text-xs font-black ${ativaAgora ?'bg-emerald-50 text-emerald-700' : p.ativo !== false ?'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}">${ativaAgora ?'Ativa agora' : p.ativo !== false ?'Agendada/fora do período' : 'Inativa'}</span></td>
                <td class="p-4"><div class="flex justify-end gap-2"><button onclick="editarPromocao(${p.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-edit"></i></button><button onclick="excluirPromocao(${p.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-trash"></i></button></div></td>
            </tr>`;
    }).join('');
}

function statusVendaLabel(status = 'RECEBIDO') {
    const labels = {
        RECEBIDO: 'Recebido',
        PREPARANDO: 'Preparando',
        SAIU_PARA_ENTREGA: 'Saiu para entrega',
        ENTREGUE: 'Entregue',
        CANCELADO: 'Cancelado'
    };
    return labels[String(status || 'RECEBIDO').toUpperCase()] || status;
}

function produtosVendaTexto(venda) {
    const produtosVenda = Array.isArray(venda.produtos) ?venda.produtos : [];
    return produtosVenda.map(p => `${p.quantidade || 1}x ${p.nome || 'Produto'}`).join(', ') || '-';
}

function calcularStatsVendas() {
    const lista = normalizarLista(vendas);
    const totalVendido = lista.reduce((soma, venda) => soma + Number(venda.total || 0), 0);
    const pendentes = lista.filter(v => !['ENTREGUE', 'CANCELADO'].includes(String(v.statusEntrega || 'RECEBIDO').toUpperCase())).length;
    const porStatus = {};
    const top = {};
    lista.forEach(venda => {
        const status = String(venda.statusEntrega || 'RECEBIDO').toUpperCase();
        porStatus[status] = (porStatus[status] || 0) + 1;
        (Array.isArray(venda.produtos) ?venda.produtos : []).forEach(p => {
            const nome = p.nome || 'Produto';
            if (!top[nome]) top[nome] = { nome, quantidade: 0, total: 0 };
            const qtd = Number(p.quantidade || 0);
            top[nome].quantidade += qtd;
            top[nome].total += Number(p.precoFinal || 0) * qtd;
        });
    });
    return {
        totalVendido,
        totalPedidos: lista.length,
        ticketMedio: lista.length ?totalVendido / lista.length : 0,
        pendentes,
        porStatus,
        topProdutos: Object.values(top).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
    };
}

function renderVendas() {
    const tbody = document.getElementById('vendasTable');
    if (!tbody) return;
    const stats = calcularStatsVendas();
    document.getElementById('vendasTotalVendido').textContent = formatMoney(stats.totalVendido);
    document.getElementById('vendasTotalPedidos').textContent = stats.totalPedidos;
    document.getElementById('vendasTicketMedio').textContent = formatMoney(stats.ticketMedio);
    document.getElementById('vendasPendentes').textContent = stats.pendentes;

    const topBox = document.getElementById('topProdutosVendas');
    if (topBox) {
        topBox.innerHTML = stats.topProdutos.length ?stats.topProdutos.map(p => `<div class="flex items-center justify-between gap-3 bg-slate-50 rounded-2xl p-3"><div><p class="font-black text-slate-900">${escapeHtml(p.nome)}</p><p class="text-xs text-slate-500 font-semibold">${p.quantidade} un. vendidas</p></div><strong class="text-emerald-600">${formatMoney(p.total)}</strong></div>`).join('') : '<p class="text-slate-500 font-semibold">Nenhuma venda registrada ainda.</p>';
    }
    const statusBox = document.getElementById('statusResumoVendas');
    if (statusBox) {
        const entradas = Object.entries(stats.porStatus);
        statusBox.innerHTML = entradas.length ?entradas.map(([status, total]) => `<div class="flex items-center justify-between bg-slate-50 rounded-2xl px-3 py-2"><span class="font-bold text-slate-700">${statusVendaLabel(status)}</span><strong>${total}</strong></div>`).join('') : '<p class="text-slate-500 font-semibold">Sem pedidos.</p>';
    }

    const termo = document.getElementById('adminSearchVendas')?.value.trim().toLowerCase() || '';
    const filtro = document.getElementById('salesStatusFilter')?.value || '';
    let lista = normalizarLista(vendas);
    if (filtro) lista = lista.filter(v => String(v.statusEntrega || 'RECEBIDO').toUpperCase() === filtro);
    if (termo) lista = lista.filter(v => `${v.pedidoId || ''} ${v.cliente || ''} ${v.email || ''} ${v.telefone || ''} ${v.endereco || ''} ${produtosVendaTexto(v)}`.toLowerCase().includes(termo));

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 font-bold">Nenhuma venda encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(v => {
        const status = String(v.statusEntrega || 'RECEBIDO').toUpperCase();
        return `<tr class="border-t border-slate-100 hover:bg-slate-50 align-top">
            <td class="p-4"><p class="font-black text-slate-900">${escapeHtml(v.pedidoId || '-')}</p><p class="text-xs text-slate-500 font-semibold">${formatDateTime(v.criadoEm)}</p><p class="text-xs text-slate-400 mt-1">${escapeHtml(v.pagamento || '')}</p></td>
            <td class="p-4 min-w-72"><p class="font-black text-slate-900">${escapeHtml(v.cliente || '-')}</p><p class="text-sm text-slate-500">${escapeHtml(v.email || '')} ${escapeHtml(v.telefone || '')}</p><p class="text-sm text-slate-700 mt-2 leading-relaxed"><i class="fas fa-location-dot text-orange-500 mr-1"></i>${escapeHtml(v.endereco || '-')}</p>${v.observacoes ?`<p class="text-xs text-slate-500 mt-2 whitespace-pre-wrap">${escapeHtml(v.observacoes)}</p>` : ''}</td>
            <td class="p-4 min-w-56"><p class="text-sm font-semibold text-slate-700">${escapeHtml(produtosVendaTexto(v))}</p></td>
            <td class="p-4"><p class="font-black text-orange-500 text-xl">${formatMoney(v.total)}</p></td>
            <td class="p-4 min-w-72">
                <select data-pedido-status="${escapeHtml(v.pedidoId || '')}" class="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white">
                    ${['RECEBIDO','PREPARANDO','SAIU_PARA_ENTREGA','ENTREGUE','CANCELADO'].map(opt => `<option value="${opt}" ${opt === status ?'selected' : ''}>${statusVendaLabel(opt)}</option>`).join('')}
                </select>
                <input data-pedido-rastreio="${escapeHtml(v.pedidoId || '')}" value="${escapeHtml(v.codigoRastreio || '')}" placeholder="Codigo de rastreio" class="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-sm">
                <textarea data-pedido-obs="${escapeHtml(v.pedidoId || '')}" rows="2" placeholder="Observacao interna" class="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-sm">${escapeHtml(v.observacoesInternas || '')}</textarea>
                <button onclick="atualizarStatusVenda('${escapeHtml(v.pedidoId || '')}')" class="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-xl font-black"><i class="fas fa-floppy-disk mr-2"></i>Salvar entrega</button>
            </td>
        </tr>`;
    }).join('');
}

async function carregarVendas() {
    try {
        vendas = normalizarLista(await fetchJson(API_COMPRAS));
        renderVendas();
        showStatus('Vendas atualizadas com sucesso.');
    } catch (error) {
        showStatus(error.message || 'Erro ao carregar vendas.', 'error');
    }
}

async function atualizarStatusVenda(pedidoId) {
    const statusEntrega = document.querySelector(`[data-pedido-status="${CSS.escape(pedidoId)}"]`)?.value || 'RECEBIDO';
    const codigoRastreio = document.querySelector(`[data-pedido-rastreio="${CSS.escape(pedidoId)}"]`)?.value || '';
    const observacoesInternas = document.querySelector(`[data-pedido-obs="${CSS.escape(pedidoId)}"]`)?.value || '';
    try {
        await fetchJson(`${API_COMPRAS}/${encodeURIComponent(pedidoId)}/status`, { method: 'PATCH', body: JSON.stringify({ statusEntrega, codigoRastreio, observacoesInternas }) });
        showStatus('Status de entrega atualizado.');
        await carregarVendas();
    } catch (error) {
        showStatus(error.message || 'Erro ao atualizar entrega.', 'error');
    }
}
function preencherFiltroCargosUsuarios() {
    const select = document.getElementById('adminFiltroCargoUsuarios');
    if (!select) return;
    const valorAtual = select.value || '';
    const opcoes = ['<option value="">Todos os cargos</option>', '<option value="SEM_CARGO">Sem cargo</option>'];
    cargos = normalizarLista(cargos);
    normalizarLista(cargos).filter(c => c.ativo !== false).forEach(c => {
        opcoes.push(`<option value="${c.id}">${escapeHtml(c.nome)}</option>`);
    });
    select.innerHTML = opcoes.join('');
    select.value = valorAtual;
}

function renderUsuarios() {
    const tbody = document.getElementById('usuariosTable');
    if (!tbody) return;
    const termo = document.getElementById('adminSearchUsuarios')?.value.trim().toLowerCase() || '';
    const cargoFiltro = document.getElementById('adminFiltroCargoUsuarios')?.value || '';
    let lista = [...normalizarLista(usuarios)];

    if (termo) {
        lista = lista.filter(u => `${u.nome || ''} ${u.usuario || ''} ${u.email || ''} ${u.telefone || ''} ${u.cargo?.nome || ''}`.toLowerCase().includes(termo));
    }

    if (cargoFiltro === 'SEM_CARGO') {
        lista = lista.filter(u => !u.cargo || !u.cargo.id);
    } else if (cargoFiltro) {
        lista = lista.filter(u => String(u.cargo?.id || '') === String(cargoFiltro));
    }

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Nenhum usuário encontrado. Verifique o filtro de cargo ou clique em atualizar.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(u => {
        const avatar = u.fotoPerfil
            ?`<img src="${escapeHtml(u.fotoPerfil)}" class="w-11 h-11 rounded-full object-cover border border-slate-200" alt="Foto">`
            : `<div class="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-orange-400 text-white font-black flex items-center justify-center">${escapeHtml((u.nome || 'U').charAt(0).toUpperCase())}</div>`;
        return `
        <tr class="border-t border-slate-100 hover:bg-slate-50">
            <td class="p-4"><div class="flex items-center gap-3">${avatar}<div><p class="font-black text-slate-900">${escapeHtml(u.nome || '-')}</p><p class="text-sm text-slate-500">@${escapeHtml(u.usuario || '-')}</p></div></div></td>
            <td class="p-4 text-slate-600"><p>${escapeHtml(u.email || '-')}</p><p class="text-sm text-slate-400">${escapeHtml(u.telefone || '')}</p></td>
            <td class="p-4"><span class="bg-purple-50 text-purple-700 px-3 py-2 rounded-full text-xs font-black">${escapeHtml(u.cargo?.nome || 'Sem cargo')}</span></td>
            <td class="p-4"><span class="bg-slate-100 text-slate-700 px-3 py-2 rounded-full text-xs font-black">${escapeHtml(u.perfil || 'USUARIO')}</span></td>
            <td class="p-4"><span class="px-3 py-2 rounded-full text-xs font-black ${u.ativo !== false ?'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${u.ativo !== false ?'Ativo' : 'Inativo'}</span></td>
            <td class="p-4"><div class="flex justify-end"><button onclick="editarUsuarioAdmin(${u.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-user-gear"></i></button></div></td>
        </tr>`;
    }).join('');
}

function acessosCargo(c) {
    const items = [];
    if (c.acessoProdutos) items.push('Produtos');
    if (c.acessoEstoque) items.push('Estoque');
    if (c.acessoCategorias) items.push('Categorias');
    if (c.acessoPromocoes) items.push('Promoções');
    if (c.acessoUsuarios) items.push('Usuários');
    if (c.acessoCargos) items.push('Cargos');
    return items;
}

function renderCargos() {
    const tbody = document.getElementById('cargosTable');
    if (!tbody) return;
    cargos = normalizarLista(cargos);
    if (!cargos.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500">Nenhum cargo cadastrado. Crie um novo cargo ou rode database/update_cargos_usuarios.sql e reinicie o Spring Boot.</td></tr>';
        return;
    }
    tbody.innerHTML = normalizarLista(cargos).map(c => `
        <tr class="border-t border-slate-100 hover:bg-slate-50">
            <td class="p-4"><p class="font-black text-slate-900">${escapeHtml(c.nome)}</p></td>
            <td class="p-4 text-slate-600">${escapeHtml(c.descricao || '-')}</td>
            <td class="p-4"><div class="flex flex-wrap gap-2">${acessosCargo(c).map(a => `<span class="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-black">${a}</span>`).join('') || '<span class="text-slate-400 text-sm">Sem acessos</span>'}</div></td>
            <td class="p-4"><span class="px-3 py-2 rounded-full text-xs font-black ${c.ativo !== false ?'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${c.ativo !== false ?'Ativo' : 'Inativo'}</span></td>
            <td class="p-4"><div class="flex justify-end gap-2"><button onclick="editarCargo(${c.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-edit"></i></button><button onclick="excluirCargo(${c.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl font-bold"><i class="fas fa-trash"></i></button></div></td>
        </tr>`).join('');
}

function carregarSelectCategorias() {
    const select = document.getElementById('produtoCategoriaId');
    if (!select) return;
    const ativas = normalizarLista(categorias).filter(c => c.ativo !== false);
    select.innerHTML = '<option value="">Selecione uma categoria</option>' + ativas.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
}

function carregarSelectCargosUsuarios() {
    const select = document.getElementById('usuarioAdminCargo');
    if (!select) return;
    select.innerHTML = '<option value="">Sem cargo</option>' + normalizarLista(cargos).filter(c => c.ativo !== false).map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
}

function preencherSelectIcones() {
    const select = document.getElementById('categoriaIcon');
    if (!select || select.dataset.loaded === 'true') return;
    select.innerHTML = ICONES_CATEGORIA.map(i => `<option value="${i.value}">${i.label} (${i.value})</option>`).join('');
    select.dataset.loaded = 'true';
    atualizarPreviewIconeCategoria();
}

function atualizarPreviewIconeCategoria() {
    const icon = document.getElementById('categoriaIcon')?.value || 'mdi:paw';
    const preview = document.getElementById('categoriaIconPreview');
    if (preview) preview.innerHTML = renderIcon(icon, 'text-3xl text-orange-500');
    const nome = document.getElementById('categoriaIconNome');
    if (nome) nome.innerText = icon;
}

function atualizarPreviewImagemProduto(src = '') {
    const preview = document.getElementById('produtoImagemPreview');
    if (!preview) return;
    if (src) {
        preview.innerHTML = `<img src="${escapeHtml(src)}" alt="Preview do produto" class="w-full h-32 object-contain bg-white">`;
    } else {
        preview.innerHTML = '<i class="fas fa-bone text-4xl"></i>';
    }
}

function prepararUploadImagemProduto() {
    const inputArquivo = document.getElementById('produtoImagemArquivo');
    const inputImagem = document.getElementById('produtoImagem');
    if (!inputArquivo || !inputImagem) return;
    inputArquivo.addEventListener('change', () => {
        const arquivo = inputArquivo.files?.[0];
        if (!arquivo) return;
        if (!arquivo.type.startsWith('image/')) {
            showStatus('Selecione um arquivo de imagem valido.', 'error');
            inputArquivo.value = '';
            return;
        }
        if (arquivo.size > 2 * 1024 * 1024) {
            showStatus('Escolha uma imagem com ate 2 MB para salvar no banco.', 'error');
            inputArquivo.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            inputImagem.value = reader.result;
            atualizarPreviewImagemProduto(reader.result);
        };
        reader.readAsDataURL(arquivo);
    });
    inputImagem.addEventListener('input', () => atualizarPreviewImagemProduto(inputImagem.value.trim()));
}
function openProdutoModal(produto = null) {
    if (!temPermissao('produtos')) return negarAcesso('Seu cargo não pode criar ou editar produtos.');
    carregarSelectCategorias();
    document.getElementById('produtoForm').reset();
    document.getElementById('produtoId').value = '';
    document.getElementById('produtoAtivo').checked = true;
    document.getElementById('produtoDestaque').checked = false;
    document.getElementById('produtoImagemArquivo').value = '';
    atualizarPreviewImagemProduto('');
    document.getElementById('produtoModalTitle').innerText = produto ?'Editar produto' : 'Novo produto';
    if (produto) {
        document.getElementById('produtoId').value = produto.id;
        document.getElementById('produtoNome').value = produto.nome || '';
        document.getElementById('produtoDescricao').value = produto.descricao || '';
        document.getElementById('produtoPreco').value = produto.preco || 0;
        document.getElementById('produtoPrecoDesconto').value = produto.precoDesconto || '';
        document.getElementById('produtoQtdEstoque').value = produto.qtdEstoque || 0;
        document.getElementById('produtoImagem').value = produto.imagem || '';
        document.getElementById('produtoDestaque').checked = !!produto.destaque;
        atualizarPreviewImagemProduto(produto.imagem || '');
        document.getElementById('produtoCategoriaId').value = produto.categoria?.id || '';
        document.getElementById('produtoAtivo').checked = produto.ativo !== false;
    }
    document.getElementById('produtoModal').classList.remove('hidden');
    document.getElementById('produtoModal').classList.add('flex');
}
function closeProdutoModal() { document.getElementById('produtoModal').classList.add('hidden'); document.getElementById('produtoModal').classList.remove('flex'); }
function editarProduto(id) { const produto = produtos.find(p => Number(p.id) === Number(id)); if (produto) openProdutoModal(produto); }
async function salvarProduto(event) {
    if (!temPermissao('produtos')) { event.preventDefault(); return negarAcesso('Seu cargo não pode salvar produtos.'); }
    event.preventDefault();
    const id = document.getElementById('produtoId').value;
    const preco = parseFloat(document.getElementById('produtoPreco').value || '0');
    const descontoDigitado = document.getElementById('produtoPrecoDesconto').value;
    const precoDesconto = descontoDigitado ?parseFloat(descontoDigitado) : preco;
    const payload = {
        nome: document.getElementById('produtoNome').value.trim(), descricao: document.getElementById('produtoDescricao').value.trim(), preco, precoDesconto,
        qtdEstoque: parseInt(document.getElementById('produtoQtdEstoque').value || '0'), imagem: document.getElementById('produtoImagem').value.trim(),
        ativo: document.getElementById('produtoAtivo').checked, destaque: document.getElementById('produtoDestaque')?.checked || false, categoria: document.getElementById('produtoCategoriaId').value ?{ id: parseInt(document.getElementById('produtoCategoriaId').value) } : null
    };
    try { await fetchJson(id ?`${API_PRODUTOS}/${id}` : API_PRODUTOS, { method: id ?'PUT' : 'POST', body: JSON.stringify(payload) }); showStatus(id ?'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.'); closeProdutoModal(); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao salvar produto.', 'error'); }
}
async function salvarEstoque(id) {
    if (!temPermissao('estoque')) return negarAcesso('Seu cargo não pode alterar estoque.');
    const input = document.getElementById(`estoque_${id}`);
    const qtdEstoque = parseInt(input.value || '0');
    try { await fetchJson(`${API_PRODUTOS}/${id}/estoque`, { method: 'PATCH', body: JSON.stringify({ qtdEstoque }) }); showStatus('Estoque atualizado com sucesso.'); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao atualizar estoque.', 'error'); }
}
async function excluirProduto(id) { if (!temPermissao('produtos')) return negarAcesso('Seu cargo não pode excluir produtos.');  if (!confirm('Deseja excluir este produto?')) return; try { await fetchJson(`${API_PRODUTOS}/${id}`, { method: 'DELETE' }); showStatus('Produto excluído com sucesso.'); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao excluir produto.', 'error'); } }

function openCategoriaModal(categoria = null) {
    if (!temPermissao('categorias')) return negarAcesso('Seu cargo não pode criar ou editar categorias.');
    preencherSelectIcones();
    document.getElementById('categoriaForm').reset();
    document.getElementById('categoriaId').value = '';
    document.getElementById('categoriaAtiva').checked = true;
    document.getElementById('categoriaIcon').value = 'mdi:paw';
    document.getElementById('categoriaModalTitle').innerText = categoria ?'Editar categoria' : 'Nova categoria';
    if (categoria) {
        document.getElementById('categoriaId').value = categoria.id;
        document.getElementById('categoriaNome').value = categoria.nome || '';
        document.getElementById('categoriaDescricao').value = categoria.descricao || '';
        document.getElementById('categoriaIcon').value = categoria.icon || 'mdi:paw';
        document.getElementById('categoriaAtiva').checked = categoria.ativo !== false;
    }
    atualizarPreviewIconeCategoria();
    document.getElementById('categoriaModal').classList.remove('hidden');
    document.getElementById('categoriaModal').classList.add('flex');
}
function closeCategoriaModal() { document.getElementById('categoriaModal').classList.add('hidden'); document.getElementById('categoriaModal').classList.remove('flex'); }
function editarCategoria(id) { const categoria = categorias.find(c => Number(c.id) === Number(id)); if (categoria) openCategoriaModal(categoria); }
async function salvarCategoria(event) {
    if (!temPermissao('categorias')) { event.preventDefault(); return negarAcesso('Seu cargo não pode salvar categorias.'); }
    event.preventDefault();
    const id = document.getElementById('categoriaId').value;
    const payload = { nome: document.getElementById('categoriaNome').value.trim(), descricao: document.getElementById('categoriaDescricao').value.trim(), icon: document.getElementById('categoriaIcon').value || 'mdi:paw', ativo: document.getElementById('categoriaAtiva').checked };
    try { await fetchJson(id ?`${API_CATEGORIAS}/${id}` : API_CATEGORIAS, { method: id ?'PUT' : 'POST', body: JSON.stringify(payload) }); showStatus(id ?'Categoria atualizada com sucesso.' : 'Categoria cadastrada com sucesso.'); closeCategoriaModal(); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao salvar categoria.', 'error'); }
}
async function excluirCategoria(id) { if (!temPermissao('categorias')) return negarAcesso('Seu cargo não pode excluir categorias.');  if (!confirm('Deseja excluir esta categoria?')) return; try { await fetchJson(`${API_CATEGORIAS}/${id}`, { method: 'DELETE' }); showStatus('Categoria excluída com sucesso.'); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao excluir categoria.', 'error'); } }

function openPromocaoModal(promocao = null) {
    if (!temPermissao('promocoes')) return negarAcesso('Seu cargo não pode criar ou editar promoções.');
    produtosSelecionadosPromocao = new Set();
    document.getElementById('promocaoForm').reset();
    document.getElementById('promocaoId').value = '';
    document.getElementById('promocaoAtiva').checked = true;
    document.getElementById('promocaoModalTitle').innerText = promocao ?'Editar promoção' : 'Nova promoção';
    if (!promocao) {
        const agora = new Date();
        const fim = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
        document.getElementById('promocaoDataInicio').value = toLocalDatetimeInput(agora);
        document.getElementById('promocaoDataFim').value = toLocalDatetimeInput(fim);
    }
    if (promocao) {
        document.getElementById('promocaoId').value = promocao.id;
        const nomesPadrao = Array.from(document.getElementById('promocaoEventoSelect').options).map(o => o.value);
        if (nomesPadrao.includes(promocao.nomeEvento)) { document.getElementById('promocaoEventoSelect').value = promocao.nomeEvento; document.getElementById('promocaoNomePersonalizado').value = ''; }
        else { document.getElementById('promocaoEventoSelect').value = 'OUTRO'; document.getElementById('promocaoNomePersonalizado').value = promocao.nomeEvento || ''; }
        document.getElementById('promocaoPercentual').value = promocao.percentualDesconto || '';
        document.getElementById('promocaoDescricao').value = promocao.descricao || '';
        document.getElementById('promocaoDataInicio').value = toDatetimeLocal(promocao.dataInicio);
        document.getElementById('promocaoDataFim').value = toDatetimeLocal(promocao.dataFim);
        document.getElementById('promocaoAtiva').checked = promocao.ativo !== false;
        (promocao.produtos || []).forEach(p => produtosSelecionadosPromocao.add(String(p.id)));
    }
    renderProdutosPromocao(); atualizarPreviewBannerAdmin();
    document.getElementById('promocaoModal').classList.remove('hidden'); document.getElementById('promocaoModal').classList.add('flex');
}
function closePromocaoModal() { document.getElementById('promocaoModal').classList.add('hidden'); document.getElementById('promocaoModal').classList.remove('flex'); }
function renderProdutosPromocao() {
    const lista = document.getElementById('promocaoProdutosLista');
    const termo = document.getElementById('promocaoBuscaProdutos')?.value.trim().toLowerCase() || '';
    const filtrados = normalizarLista(produtos).filter(p => `${p.nome || ''} ${p.categoria?.nome || ''}`.toLowerCase().includes(termo));
    if (!filtrados.length) { lista.innerHTML = '<p class="text-slate-500 col-span-full p-4">Nenhum produto encontrado.</p>'; return; }
    lista.innerHTML = filtrados.map(p => {
        const checked = produtosSelecionadosPromocao.has(String(p.id));
        return `<label class="flex items-center gap-3 bg-white border ${checked ?'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'} rounded-2xl p-3 cursor-pointer"><input type="checkbox" ${checked ?'checked' : ''} onchange="toggleProdutoPromocao(${p.id}, this.checked)" class="w-5 h-5 accent-blue-600"><div><p class="font-black text-slate-900">${escapeHtml(p.nome)}</p><p class="text-xs text-slate-500">${formatMoney(p.preco)} • ${escapeHtml(p.categoria?.nome || 'Sem categoria')}</p></div></label>`;
    }).join('');
}
function toggleProdutoPromocao(id, checked) { checked ?produtosSelecionadosPromocao.add(String(id)) : produtosSelecionadosPromocao.delete(String(id)); renderProdutosPromocao(); }
function marcarTodosProdutosPromo(marcar) { produtosSelecionadosPromocao = marcar ?new Set(produtos.map(p => String(p.id))) : new Set(); renderProdutosPromocao(); }
function editarPromocao(id) { const promocao = promocoes.find(p => Number(p.id) === Number(id)); if (promocao) openPromocaoModal(promocao); }
async function salvarPromocao(event) {
    if (!temPermissao('promocoes')) { event.preventDefault(); return negarAcesso('Seu cargo não pode salvar promoções.'); }
    event.preventDefault();
    const id = document.getElementById('promocaoId').value;
    const eventoSelect = document.getElementById('promocaoEventoSelect').value;
    const nomePersonalizado = document.getElementById('promocaoNomePersonalizado').value.trim();
    const nomeEvento = eventoSelect === 'OUTRO' ?nomePersonalizado : eventoSelect;
    if (!nomeEvento) { showStatus('Informe o nome do evento.', 'error'); return; }
    if (produtosSelecionadosPromocao.size === 0) { showStatus('Selecione pelo menos um produto para a promoção.', 'error'); return; }
    const percentual = Math.min(40, Math.max(1, Number(document.getElementById('promocaoPercentual').value || 0)));
    const payload = { nomeEvento, descricao: document.getElementById('promocaoDescricao').value.trim(), percentualDesconto: percentual, dataInicio: document.getElementById('promocaoDataInicio').value, dataFim: document.getElementById('promocaoDataFim').value, ativo: document.getElementById('promocaoAtiva').checked, produtos: Array.from(produtosSelecionadosPromocao).map(id => ({ id: Number(id) })) };
    try { await fetchJson(id ?`${API_PROMOCOES}/${id}` : API_PROMOCOES, { method: id ?'PUT' : 'POST', body: JSON.stringify(payload) }); showStatus(id ?'Promoção atualizada com sucesso.' : 'Promoção cadastrada com sucesso.'); closePromocaoModal(); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao salvar promoção.', 'error'); }
}
async function excluirPromocao(id) { if (!temPermissao('promocoes')) return negarAcesso('Seu cargo não pode excluir promoções.');  if (!confirm('Deseja excluir esta promoção?')) return; try { await fetchJson(`${API_PROMOCOES}/${id}`, { method: 'DELETE' }); showStatus('Promoção excluída com sucesso.'); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao excluir promoção.', 'error'); } }

function editarUsuarioAdmin(id) {
    if (!temPermissao('usuarios')) return negarAcesso('Seu cargo não pode editar usuários.');
    const u = usuarios.find(x => Number(x.id) === Number(id));
    if (!u) return;
    carregarSelectCargosUsuarios();
    document.getElementById('usuarioForm').reset();
    document.getElementById('usuarioAdminId').value = u.id;
    document.getElementById('usuarioAdminNome').value = u.nome || '';
    document.getElementById('usuarioAdminEmail').value = u.email || '';
    document.getElementById('usuarioAdminPerfil').value = u.perfil || 'USUARIO';
    document.getElementById('usuarioAdminCargo').value = u.cargo?.id || '';
    document.getElementById('usuarioAdminAtivo').checked = u.ativo !== false;
    document.getElementById('usuarioAdminSenha').value = '';
    document.getElementById('usuarioModal').classList.remove('hidden'); document.getElementById('usuarioModal').classList.add('flex');
}
function closeUsuarioModal() { document.getElementById('usuarioModal').classList.add('hidden'); document.getElementById('usuarioModal').classList.remove('flex'); }
async function salvarUsuarioAdmin(event) {
    if (!temPermissao('usuarios')) { event.preventDefault(); return negarAcesso('Seu cargo não pode salvar usuários.'); }
    event.preventDefault();
    const id = document.getElementById('usuarioAdminId').value;
    const cargoId = document.getElementById('usuarioAdminCargo').value;
    const payload = { nome: document.getElementById('usuarioAdminNome').value.trim(), email: document.getElementById('usuarioAdminEmail').value.trim(), perfil: document.getElementById('usuarioAdminPerfil').value, ativo: document.getElementById('usuarioAdminAtivo').checked, cargoId: cargoId ?Number(cargoId) : null };
    try { await fetchJson(`${API_USUARIOS}/${id}/admin`, { method: 'PUT', body: JSON.stringify(payload) }); showStatus('Usuário atualizado com sucesso.'); closeUsuarioModal(); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao atualizar usuário.', 'error'); }
}
async function alterarSenhaUsuarioAdmin() {
    const id = document.getElementById('usuarioAdminId').value;
    const novaSenha = document.getElementById('usuarioAdminSenha').value;
    if (!novaSenha || novaSenha.length < 6) { showStatus('Informe uma senha com pelo menos 6 caracteres.', 'error'); return; }
    try { await fetchJson(`${API_USUARIOS}/${id}/senha`, { method: 'PUT', body: JSON.stringify({ novaSenha }) }); document.getElementById('usuarioAdminSenha').value = ''; showStatus('Senha alterada com sucesso.'); } catch (error) { showStatus(error.message || 'Erro ao alterar senha.', 'error'); }
}

function openCargoModal(cargo = null) {
    if (!temPermissao('cargos')) return negarAcesso('Seu cargo não pode criar ou editar cargos.');
    document.getElementById('cargoForm').reset();
    document.getElementById('cargoId').value = '';
    document.getElementById('cargoAtivo').checked = true;
    document.getElementById('cargoModalTitle').innerText = cargo ?'Editar cargo' : 'Novo cargo';
    ['Produtos','Categorias','Promocoes','Usuarios','Cargos','Estoque','Suporte'].forEach(k => document.getElementById(`cargoAcesso${k}`).checked = false);
    if (cargo) {
        document.getElementById('cargoId').value = cargo.id;
        document.getElementById('cargoNome').value = cargo.nome || '';
        document.getElementById('cargoDescricao').value = cargo.descricao || '';
        document.getElementById('cargoAtivo').checked = cargo.ativo !== false;
        document.getElementById('cargoAcessoProdutos').checked = !!cargo.acessoProdutos;
        document.getElementById('cargoAcessoCategorias').checked = !!cargo.acessoCategorias;
        document.getElementById('cargoAcessoPromocoes').checked = !!cargo.acessoPromocoes;
        document.getElementById('cargoAcessoUsuarios').checked = !!cargo.acessoUsuarios;
        document.getElementById('cargoAcessoCargos').checked = !!cargo.acessoCargos;
        document.getElementById('cargoAcessoEstoque').checked = !!cargo.acessoEstoque;
        if (document.getElementById('cargoAcessoSuporte')) document.getElementById('cargoAcessoSuporte').checked = !!cargo.acessoSuporte;
    }
    aplicarCargoFixo();
    document.getElementById('cargoModal').classList.remove('hidden'); document.getElementById('cargoModal').classList.add('flex');
}
function closeCargoModal() { document.getElementById('cargoModal').classList.add('hidden'); document.getElementById('cargoModal').classList.remove('flex'); }
function editarCargo(id) { const cargo = cargos.find(c => Number(c.id) === Number(id)); if (cargo) openCargoModal(cargo); }
function aplicarCargoFixo() {
    const nome = (document.getElementById('cargoNome')?.value || '').trim().toLowerCase();
    const produtosEl = document.getElementById('cargoAcessoProdutos');
    const suporteEl = document.getElementById('cargoAcessoSuporte');
    if (nome === 'atendente' && produtosEl) {
        produtosEl.checked = true;
        produtosEl.disabled = true;
    } else if (produtosEl) {
        produtosEl.disabled = false;
    }
    if (nome === 'suporte' && suporteEl) {
        suporteEl.checked = true;
        suporteEl.disabled = true;
    } else if (suporteEl) {
        suporteEl.disabled = false;
    }
}

async function salvarCargo(event) {
    if (!temPermissao('cargos')) { event.preventDefault(); return negarAcesso('Seu cargo não pode salvar cargos.'); }
    event.preventDefault();
    const id = document.getElementById('cargoId').value;
    aplicarCargoFixo();
    const payload = { nome: document.getElementById('cargoNome').value.trim(), descricao: document.getElementById('cargoDescricao').value.trim(), ativo: document.getElementById('cargoAtivo').checked, acessoProdutos: document.getElementById('cargoAcessoProdutos').checked, acessoCategorias: document.getElementById('cargoAcessoCategorias').checked, acessoPromocoes: document.getElementById('cargoAcessoPromocoes').checked, acessoUsuarios: document.getElementById('cargoAcessoUsuarios').checked, acessoCargos: document.getElementById('cargoAcessoCargos').checked, acessoEstoque: document.getElementById('cargoAcessoEstoque').checked, acessoSuporte: !!document.getElementById('cargoAcessoSuporte')?.checked };
    try { await fetchJson(id ?`${API_CARGOS}/${id}` : API_CARGOS, { method: id ?'PUT' : 'POST', body: JSON.stringify(payload) }); showStatus(id ?'Cargo atualizado com sucesso.' : 'Cargo cadastrado com sucesso.'); closeCargoModal(); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao salvar cargo.', 'error'); }
}
async function excluirCargo(id) { if (!temPermissao('cargos')) return negarAcesso('Seu cargo não pode excluir cargos.');  if (!confirm('Deseja excluir este cargo?Usuários vinculados podem ficar sem cargo.')) return; try { await fetchJson(`${API_CARGOS}/${id}`, { method: 'DELETE' }); showStatus('Cargo excluído com sucesso.'); await carregarDados(); } catch (error) { showStatus(error.message || 'Erro ao excluir cargo.', 'error'); } }

function atualizarExemploCalculo() {
    const informado = Number(document.getElementById('promocaoPercentual')?.value || 0);
    const percentualMaximo = Math.min(40, Math.max(0, Math.floor(informado)));
    const preco = 199.99;
    const menorPercentual = percentualMaximo >= 5 ?5 : percentualMaximo;
    const finalMenor = preco - (preco * menorPercentual / 100);
    const finalMaior = preco - (preco * percentualMaximo / 100);
    const texto = percentualMaximo > 0 ?`Exemplo: ${formatMoney(preco)} pode ficar entre ${formatMoney(finalMaior)} e ${formatMoney(finalMenor)} com descontos aleatórios de ${menorPercentual}% a ${percentualMaximo}%.` : 'O sistema sorteia por produto entre 5% e o máximo informado. Limite: 40%.';
    document.getElementById('promocaoExemploCalculo').innerText = texto;
    document.getElementById('previewDesconto').innerText = `${percentualMaximo || 0}%`;
    document.getElementById('previewDescricaoBanner').innerText = document.getElementById('promocaoDescricao')?.value?.trim() || 'descontos aleatórios nos produtos selecionados';
}
function atualizarPreviewBannerAdmin() {
    if (previewTimer) clearInterval(previewTimer);
    const tick = () => {
        const fimValue = document.getElementById('promocaoDataFim')?.value;
        let diff = fimValue ?new Date(fimValue).getTime() - Date.now() : 0;
        if (diff < 0) diff = 0;
        const totalSeg = Math.floor(diff / 1000);
        document.getElementById('previewHoras').innerText = String(Math.floor(totalSeg / 3600)).padStart(2, '0');
        document.getElementById('previewMin').innerText = String(Math.floor((totalSeg % 3600) / 60)).padStart(2, '0');
        document.getElementById('previewSeg').innerText = String(totalSeg % 60).padStart(2, '0');
    };
    tick(); atualizarExemploCalculo(); previewTimer = setInterval(tick, 1000);
}

function configurarEventos() {
    document.getElementById('produtoForm').addEventListener('submit', salvarProduto);
    prepararUploadImagemProduto();
    document.getElementById('categoriaForm').addEventListener('submit', salvarCategoria);
    document.getElementById('promocaoForm').addEventListener('submit', salvarPromocao);
    document.getElementById('usuarioForm').addEventListener('submit', salvarUsuarioAdmin);
    document.getElementById('cargoForm').addEventListener('submit', salvarCargo);
    document.getElementById('adminSearchProdutos').addEventListener('input', renderProdutos);
    document.getElementById('adminSearchCategorias').addEventListener('input', renderCategorias);
    document.getElementById('adminSearchUsuarios').addEventListener('input', renderUsuarios);
    document.getElementById('adminSearchVendas')?.addEventListener('input', renderVendas);
    document.getElementById('salesStatusFilter')?.addEventListener('change', renderVendas);
    document.getElementById('refreshVendasBtn')?.addEventListener('click', carregarVendas);
    document.getElementById('adminFiltroCargoUsuarios')?.addEventListener('change', renderUsuarios);
    document.getElementById('categoriaIcon').addEventListener('change', atualizarPreviewIconeCategoria);
    document.getElementById('promocaoBuscaProdutos').addEventListener('input', renderProdutosPromocao);
    document.getElementById('promocaoPercentual').addEventListener('input', atualizarExemploCalculo);
    document.getElementById('promocaoDescricao').addEventListener('input', atualizarExemploCalculo);
    document.getElementById('promocaoDataFim').addEventListener('change', atualizarPreviewBannerAdmin);
    document.getElementById('promocaoDataInicio').addEventListener('change', atualizarPreviewBannerAdmin);
    document.getElementById('cargoNome')?.addEventListener('input', aplicarCargoFixo);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('produtoModal')) closeProdutoModal();
        if (e.target === document.getElementById('categoriaModal')) closeCategoriaModal();
        if (e.target === document.getElementById('promocaoModal')) closePromocaoModal();
        if (e.target === document.getElementById('usuarioModal')) closeUsuarioModal();
        if (e.target === document.getElementById('cargoModal')) closeCargoModal();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await descobrirBackend();
    await atualizarSessaoAdminPeloBackend();
    protegerAdmin();
    configurarEventos();
    preencherSelectIcones();
    await carregarDados();
});

window.recarregarDadosAdmin = carregarDados;


