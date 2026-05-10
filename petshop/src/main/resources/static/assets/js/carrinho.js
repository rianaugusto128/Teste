function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function showCartStatus(msg, type = 'success') {
    const div = document.getElementById('cartStatus');
    const ok = type === 'success';
    div.className = `mb-6 p-4 rounded-2xl border font-semibold ${ok ?'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`;
    div.innerHTML = `<i class="fas ${ok ?'fa-check-circle' : 'fa-triangle-exclamation'} mr-2"></i>${msg}`;
    div.classList.remove('hidden');
    setTimeout(() => div.classList.add('hidden'), 3500);
}

function renderCart() {
    const cart = window.PetZillaCart.getCart();
    const box = document.getElementById('cartItems');
    const clearBtn = document.getElementById('clearCartBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');

    clearBtn.disabled = cart.length === 0;
    checkoutBtn.disabled = cart.length === 0;
    clearBtn.classList.toggle('opacity-50', cart.length === 0);
    checkoutBtn.classList.toggle('opacity-50', cart.length === 0);

    if (!cart.length) {
        box.innerHTML = `
            <div class="p-10 text-center">
                <i class="fas fa-cart-shopping text-6xl text-orange-300 mb-4"></i>
                <h3 class="text-2xl font-black text-slate-900">Seu carrinho está vazio</h3>
                <p class="text-slate-500 mt-2">Escolha produtos para seu pet e adicione ao carrinho.</p>
                <a href="produtos.html" class="mt-6 inline-flex items-center bg-teal-600 hover:bg-teal-700 text-white px-6 py-4 rounded-full font-black transition">
                    Ver produtos <i class="fas fa-arrow-right ml-2"></i>
                </a>
            </div>`;
        updateSummary();
        return;
    }

    box.innerHTML = cart.map(item => {
        const imagem = item.imagem
            ?`<img src="${escapeHtml(item.imagem)}" alt="${escapeHtml(item.nome)}" class="w-24 h-24 rounded-2xl object-contain bg-slate-50" onerror="this.outerHTML='<div class=&quot;w-24 h-24 rounded-2xl bg-teal-50 flex items-center justify-center&quot;><i class=&quot;fas fa-bone text-3xl text-teal-300&quot;></i></div>'">`
            : `<div class="w-24 h-24 rounded-2xl bg-teal-50 flex items-center justify-center"><i class="fas fa-bone text-3xl text-teal-300"></i></div>`;
        const temDesconto = Number(item.precoOriginal || 0) > Number(item.precoFinal || 0);
        return `
            <div class="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-5">
                <a href="produto.html?id=${encodeURIComponent(item.id)}" class="shrink-0">${imagem}</a>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-black uppercase tracking-widest text-teal-600">${escapeHtml(item.categoria || 'Sem categoria')}</p>
                    <a href="produto.html?id=${encodeURIComponent(item.id)}" class="block font-black text-xl text-slate-900 hover:text-teal-700 truncate">${escapeHtml(item.nome)}</a>
                    <div class="mt-2 flex flex-wrap items-baseline gap-2">
                        <span class="text-2xl font-black text-orange-500">${window.PetZillaCart.formatMoney(item.precoFinal)}</span>
                        ${temDesconto ?`<span class="text-sm text-slate-400 line-through font-bold">${window.PetZillaCart.formatMoney(item.precoOriginal)}</span>` : ''}
                        ${item.percentual > 0 ?`<span class="bg-orange-50 text-orange-600 px-2 py-1 rounded-full text-xs font-black">${item.percentual}% OFF</span>` : ''}
                    </div>
                    <p class="text-xs text-slate-500 mt-1">Estoque disponível: ${Number(item.estoque || 0)} un.</p>
                </div>

                <div class="flex items-center gap-3">
                    <button type="button" onclick="alterarQuantidade(${item.id}, ${Number(item.quantidade || 1) - 1})" class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" min="1" max="${Number(item.estoque || 9999)}" value="${Number(item.quantidade || 1)}" onchange="alterarQuantidade(${item.id}, this.value)" class="w-20 px-3 py-3 rounded-xl border border-slate-200 text-center font-black">
                    <button type="button" onclick="alterarQuantidade(${item.id}, ${Number(item.quantidade || 1) + 1})" class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>

                <div class="md:w-36 text-left md:text-right">
                    <p class="text-xs text-slate-500 font-bold">Total do item</p>
                    <p class="font-black text-xl text-slate-900">${window.PetZillaCart.formatMoney(Number(item.precoFinal || 0) * Number(item.quantidade || 1))}</p>
                    <button type="button" onclick="removerItem(${item.id})" class="mt-2 text-red-600 hover:text-red-700 font-black text-sm">
                        <i class="fas fa-trash mr-1"></i>Remover
                    </button>
                </div>
            </div>`;
    }).join('');

    updateSummary();
}

function updateSummary() {
    const cart = window.PetZillaCart.getCart();
    const qty = cart.reduce((total, item) => total + Number(item.quantidade || 0), 0);
    const subtotalOriginal = cart.reduce((total, item) => total + (Number(item.precoOriginal || item.precoFinal || 0) * Number(item.quantidade || 0)), 0);
    const total = cart.reduce((sum, item) => sum + (Number(item.precoFinal || 0) * Number(item.quantidade || 0)), 0);
    const savings = Math.max(0, subtotalOriginal - total);

    document.getElementById('summaryQty').textContent = String(qty);
    document.getElementById('summarySubtotal').textContent = window.PetZillaCart.formatMoney(subtotalOriginal);
    document.getElementById('summarySavings').textContent = window.PetZillaCart.formatMoney(savings);
    document.getElementById('summaryTotal').textContent = window.PetZillaCart.formatMoney(total);
    window.PetZillaCart.updateCartBadges();
}

function alterarQuantidade(id, quantidade) {
    const item = window.PetZillaCart.getCart().find(p => Number(p.id) === Number(id));
    if (!item) return;
    const novaQtd = Number(quantidade || 1);
    if (novaQtd <= 0) {
        removerItem(id);
        return;
    }
    if (item.estoque > 0 && novaQtd > item.estoque) {
        showCartStatus(`Só temos ${item.estoque} unidade(s) disponíveis deste produto.`, 'error');
    }
    window.PetZillaCart.updateQty(id, novaQtd);
    renderCart();
}

function removerItem(id) {
    window.PetZillaCart.removeItem(id);
    showCartStatus('Produto removido do carrinho.');
    renderCart();
}

function finalizarPedido() {
    const cart = window.PetZillaCart.getCart();
    if (!cart.length) {
        showCartStatus('Adicione produtos ao carrinho antes de finalizar.', 'error');
        return;
    }
    window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    document.getElementById('clearCartBtn').addEventListener('click', () => {
        if (!window.PetZillaCart.getCart().length) return;
        if (!confirm('Deseja limpar todo o carrinho?')) return;
        window.PetZillaCart.clearCart();
        showCartStatus('Carrinho limpo com sucesso.');
        renderCart();
    });

    document.getElementById('checkoutBtn').addEventListener('click', finalizarPedido);
    window.addEventListener('petzilla:cart-updated', renderCart);
});
