(function () {
    const CART_KEY = 'petzilla_carrinho';

    function parseCart() {
        try {
            const data = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            return Array.isArray(data) ?data : [];
        } catch (_) {
            return [];
        }
    }

    function saveCart(items) {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
        updateCartBadges();
        window.dispatchEvent(new CustomEvent('petzilla:cart-updated', { detail: { items } }));
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function normalizeProduct(produto, quantidade = 1) {
        const precoOriginal = Number(produto.precoOriginal ?? produto.preco ?? 0);
        const precoFinal = Number(produto.precoFinal ?? produto.precoDesconto ?? produto.preco ?? 0);
        const estoque = Number(produto.qtdEstoque ?? produto.estoque ?? 0);
        return {
            id: Number(produto.id),
            nome: produto.nome || 'Produto',
            categoria: produto.categoria?.nome || produto.categoria || 'Sem categoria',
            imagem: produto.imagem || '',
            precoOriginal,
            precoFinal,
            percentual: Number(produto.percentual || 0),
            estoque,
            quantidade: Math.max(1, Number(quantidade || 1))
        };
    }

    function getCart() {
        return parseCart();
    }

    function addItem(produto, quantidade = 1) {
        if (!produto || !produto.id) {
            notify('Produto inválido para o carrinho.', 'error');
            return;
        }

        const item = normalizeProduct(produto, quantidade);
        if (item.estoque <= 0) {
            notify('Produto sem estoque no momento.', 'error');
            return;
        }

        const carrinho = getCart();
        const atual = carrinho.find(p => Number(p.id) === Number(item.id));
        if (atual) {
            const novaQtd = Math.min(item.estoque || 9999, Number(atual.quantidade || 1) + item.quantidade);
            atual.quantidade = novaQtd;
            atual.precoFinal = item.precoFinal;
            atual.precoOriginal = item.precoOriginal;
            atual.percentual = item.percentual;
            atual.estoque = item.estoque;
            atual.imagem = item.imagem;
        } else {
            item.quantidade = Math.min(item.estoque || 9999, item.quantidade);
            carrinho.push(item);
        }

        saveCart(carrinho);
        notify(`${item.nome} foi adicionado ao carrinho.`, 'success');
    }

    function removeItem(id) {
        saveCart(getCart().filter(item => Number(item.id) !== Number(id)));
    }

    function updateQty(id, quantidade) {
        const carrinho = getCart();
        const item = carrinho.find(p => Number(p.id) === Number(id));
        if (!item) return;
        const qtd = Math.max(1, Number(quantidade || 1));
        item.quantidade = item.estoque > 0 ?Math.min(qtd, item.estoque) : qtd;
        saveCart(carrinho);
    }

    function clearCart() {
        saveCart([]);
    }

    function countItems() {
        return getCart().reduce((total, item) => total + Number(item.quantidade || 0), 0);
    }

    function totalCart() {
        return getCart().reduce((total, item) => total + (Number(item.precoFinal || 0) * Number(item.quantidade || 0)), 0);
    }

    function updateCartBadges() {
        const count = countItems();
        document.querySelectorAll('[data-cart-count]').forEach(el => {
            el.textContent = String(count);
            el.classList.toggle('hidden', count <= 0);
        });
    }

    function notify(message, type = 'success') {
        let box = document.getElementById('cartToast');
        if (!box) {
            box = document.createElement('div');
            box.id = 'cartToast';
            box.className = 'fixed bottom-5 right-5 z-[9999] max-w-sm';
            document.body.appendChild(box);
        }

        const ok = type === 'success';
        box.innerHTML = `
            <div class="${ok ?'bg-emerald-600' : 'bg-red-600'} text-white rounded-2xl shadow-2xl px-5 py-4 font-bold flex items-start gap-3">
                <i class="fas ${ok ?'fa-check-circle' : 'fa-triangle-exclamation'} mt-1"></i>
                <div>
                    <p>${message}</p>
                    ${ok ?'<a href="carrinho.html" class="underline text-sm">Ver carrinho</a>' : ''}
                </div>
            </div>`;

        clearTimeout(window.__petzillaToastTimer);
        window.__petzillaToastTimer = setTimeout(() => {
            box.innerHTML = '';
        }, 2800);
    }

    function cartButtonMarkup(extraClasses = '') {
        return `
            <a href="carrinho.html" class="${extraClasses} relative inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-full font-bold transition">
                <i class="fas fa-cart-shopping mr-2"></i>Carrinho
                <span data-cart-count class="hidden absolute -top-2 -right-2 bg-slate-950 text-white text-xs rounded-full min-w-6 h-6 px-1 flex items-center justify-center border-2 border-white">0</span>
            </a>`;
    }

    function injectHeaderCart() {
        document.querySelectorAll('[data-cart-area]').forEach(el => {
            el.innerHTML = cartButtonMarkup(el.dataset.cartMobile === 'true' ?'w-full' : '');
        });
        updateCartBadges();
    }

    window.PetZillaCart = {
        getCart,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        countItems,
        totalCart,
        updateCartBadges,
        formatMoney,
        cartButtonMarkup,
        injectHeaderCart,
        notify
    };

    document.addEventListener('DOMContentLoaded', () => {
        injectHeaderCart();
        updateCartBadges();
    });
})();
