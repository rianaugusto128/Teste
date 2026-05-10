(function () {
    const PORTS = [8080, 8081];
    let API_PROMOCOES = 'http://localhost:8080/api/promocoes';
    let promoTimer = null;

    function escapeHtml(value = '') {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
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

async function descobrirBackend() {
        for (const porta of PORTS) {
            try {
                const response = await fetch(`http://localhost:${porta}/api/promocoes/ativas`);
                if (response.ok) {
                    API_PROMOCOES = `http://localhost:${porta}/api/promocoes`;
                    return true;
                }
            } catch (error) {
                console.log(`Promo banner: backend não respondeu na porta ${porta}`);
            }
        }
        return false;
    }

    function percentualBanner(promocoes) {
        const maior = Math.max(...promocoes.map(p => Number(p.percentualDesconto || 0)));
        return Math.min(Math.round(maior || 0), 40);
    }

    function renderPromoBanner(promocoes) {
        const banner = document.getElementById('promoBanner');
        if (!banner) return;
        if (promoTimer) clearInterval(promoTimer);

        if (!promocoes || !promocoes.length) {
            banner.className = 'hidden';
            posicionarBannerNoTopo(banner, false);
            return;
        }

        const promo = [...promocoes].sort((a, b) => new Date(a.dataFim) - new Date(b.dataFim))[0];
        const maiorDesconto = percentualBanner(promocoes);

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
                    <div class="font-semibold leading-tight">${escapeHtml(promo.nomeEvento)}<br><span class="text-blue-100">${escapeHtml((promo.descricao || "descontos aleatórios nos produtos selecionados"))}</span></div>
                    <div class="flex items-center justify-center gap-4 md:ml-6">
                        <div><strong class="text-3xl font-black">${String(horas).padStart(2, '0')}</strong><p class="text-xs">HORAS</p></div>
                        <div><strong class="text-3xl font-black">${String(min).padStart(2, '0')}</strong><p class="text-xs">MIN</p></div>
                        <div><strong class="text-3xl font-black">${String(seg).padStart(2, '0')}</strong><p class="text-xs">SEG</p></div>
                    </div>
                    <a href="produtos.html" class="underline font-bold md:ml-6">Aproveite!</a>
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

    async function iniciarBanner() {
        const ok = await descobrirBackend();
        if (!ok) return;
        try {
            const response = await fetch(`${API_PROMOCOES}/ativas`);
            if (!response.ok) return;
            const promocoes = await response.json();
            renderPromoBanner(promocoes);
        } catch (error) {
            console.log('Promo banner indisponível', error);
        }
    }

    document.addEventListener('DOMContentLoaded', iniciarBanner);
})();
