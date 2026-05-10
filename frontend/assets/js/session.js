(function () {
    function parseJson(value) {
        try { return JSON.parse(value); } catch (_) { return null; }
    }

    function cargoTemAcessoAdmin(cargo) {
        return !!(cargo && cargo.ativo !== false && (
            cargo.acessoProdutos || cargo.acessoCategorias || cargo.acessoPromocoes ||
            cargo.acessoUsuarios || cargo.acessoCargos || cargo.acessoEstoque || cargo.acessoSuporte
        ));
    }

    function getSession() {
        const saved = parseJson(localStorage.getItem('petzilla_sessao'));
        if (saved && saved.logado) return saved;

        if (localStorage.getItem('petzilla_usuario_logado') === 'true') {
            return {
                logado: true,
                id: localStorage.getItem('petzilla_usuario_id') ?Number(localStorage.getItem('petzilla_usuario_id')) : null,
                nome: localStorage.getItem('petzilla_usuario_nome') || 'Usuário',
                usuario: localStorage.getItem('petzilla_usuario_login') || '',
                email: localStorage.getItem('petzilla_usuario_email') || '',
                perfil: localStorage.getItem('petzilla_usuario_perfil') || 'USUARIO',
                fotoPerfil: localStorage.getItem('petzilla_usuario_foto') || '',
                cargo: parseJson(localStorage.getItem('petzilla_usuario_cargo'))
            };
        }

        if (localStorage.getItem('petzilla_admin_logado') === 'true') {
            return {
                logado: true,
                id: localStorage.getItem('petzilla_usuario_id') ?Number(localStorage.getItem('petzilla_usuario_id')) : null,
                nome: localStorage.getItem('petzilla_usuario_nome') || 'Administrador',
                usuario: localStorage.getItem('petzilla_admin_usuario') || localStorage.getItem('petzilla_usuario_login') || 'admin',
                email: localStorage.getItem('petzilla_usuario_email') || '',
                perfil: localStorage.getItem('petzilla_usuario_perfil') || 'ADMIN',
                fotoPerfil: localStorage.getItem('petzilla_usuario_foto') || '',
                cargo: parseJson(localStorage.getItem('petzilla_usuario_cargo'))
            };
        }

        return null;
    }

    function saveSession(sessao) {
        if (!sessao) return;
        const normalizada = {
            logado: true,
            id: sessao.id ?? null,
            nome: sessao.nome || sessao.usuario || 'Usuário',
            usuario: sessao.usuario || '',
            email: sessao.email || '',
            perfil: sessao.perfil || 'USUARIO',
            fotoPerfil: sessao.fotoPerfil || '',
            cargo: sessao.cargo || null
        };
        localStorage.setItem('petzilla_sessao', JSON.stringify(normalizada));

        const adminOuCargo = normalizada.perfil === 'ADMIN' || cargoTemAcessoAdmin(normalizada.cargo);
        if (adminOuCargo) {
            localStorage.setItem('petzilla_admin_logado', 'true');
            localStorage.setItem('petzilla_admin_usuario', normalizada.usuario || 'admin');
        }

        localStorage.setItem('petzilla_usuario_logado', 'true');
        localStorage.setItem('petzilla_usuario_id', normalizada.id ?? '');
        localStorage.setItem('petzilla_usuario_nome', normalizada.nome);
        localStorage.setItem('petzilla_usuario_login', normalizada.usuario || '');
        localStorage.setItem('petzilla_usuario_email', normalizada.email || '');
        localStorage.setItem('petzilla_usuario_perfil', normalizada.perfil || 'USUARIO');
        localStorage.setItem('petzilla_usuario_foto', normalizada.fotoPerfil || '');
        localStorage.setItem('petzilla_usuario_cargo', JSON.stringify(normalizada.cargo || null));
        return normalizada;
    }

    function clearSession() {
        [
            'petzilla_sessao', 'petzilla_admin_logado', 'petzilla_admin_usuario', 'petzilla_admin_login_em',
            'petzilla_usuario_logado', 'petzilla_usuario_id', 'petzilla_usuario_nome', 'petzilla_usuario_login',
            'petzilla_usuario_email', 'petzilla_usuario_foto', 'petzilla_usuario_perfil', 'petzilla_usuario_cargo'
        ].forEach(key => localStorage.removeItem(key));
    }

    function escapeHtml(value = '') {
        return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    function avatarMarkup(sessao, size = 'w-10 h-10') {
        const foto = sessao?.fotoPerfil || '';
        const inicial = escapeHtml((sessao?.nome || sessao?.usuario || 'U').trim().charAt(0).toUpperCase() || 'U');
        if (foto) return `<img src="${escapeHtml(foto)}" alt="Foto de perfil" class="${size} rounded-full object-cover border-2 border-white shadow">`;
        return `<div class="${size} rounded-full bg-gradient-to-br from-teal-500 to-orange-400 text-white flex items-center justify-center font-black shadow">${inicial}</div>`;
    }

    function buildGuestButton(isMobile) {
        return `<a href="login.html" class="${isMobile ?'bg-teal-600' : 'bg-slate-900'} text-white px-5 py-3 rounded-full font-bold hover:bg-teal-700 transition inline-flex items-center justify-center"><i class="fas fa-user mr-2"></i>Entrar</a>`;
    }

    function buildLoggedMenu(sessao, isMobile) {
        const podeSuporte = !!(sessao.cargo && sessao.cargo.acessoSuporte);
        const podeAdmin = sessao.perfil === 'ADMIN' || cargoTemAcessoAdmin(sessao.cargo);
        const destinoPrincipal = podeSuporte && sessao.perfil !== 'ADMIN' ?'suporte-admin.html' : (podeAdmin ?'admin.html' : 'user.html');
        const rotuloPrincipal = podeSuporte && sessao.perfil !== 'ADMIN' ?'Painel suporte' : (podeAdmin ?'Painel admin' : 'Minha conta');
        return `
            <div class="relative js-user-menu-wrapper ${isMobile ?'w-full' : ''}">
                <button type="button" class="js-toggle-user-menu inline-flex items-center gap-3 ${isMobile ?'w-full justify-center' : ''} bg-slate-900 text-white px-4 py-2 rounded-full font-bold hover:bg-teal-700 transition">
                    ${avatarMarkup(sessao, 'w-9 h-9')}
                    <span class="max-w-[150px] truncate">${escapeHtml(sessao.nome || sessao.usuario || 'Usuário')}</span>
                    <i class="fas fa-chevron-down text-xs"></i>
                </button>
                <div class="js-user-menu-panel hidden absolute ${isMobile ?'left-0 right-0 mt-2' : 'right-0 mt-3'} bg-white border border-slate-200 rounded-2xl shadow-2xl w-72 p-2 z-50">
                    <div class="flex items-center gap-3 px-3 py-3 border-b border-slate-100">
                        ${avatarMarkup(sessao, 'w-12 h-12')}
                        <div class="min-w-0">
                            <p class="font-black text-slate-900 truncate">${escapeHtml(sessao.nome || sessao.usuario || 'Usuário')}</p>
                            <p class="text-sm text-slate-500 truncate">${escapeHtml(sessao.email || sessao.usuario || '')}</p>
                            ${sessao.cargo?.nome ?`<p class="text-xs text-purple-600 font-black truncate">${escapeHtml(sessao.cargo.nome)}</p>` : ''}
                        </div>
                    </div>
                    <div class="p-2 grid gap-1">
                        <a href="${destinoPrincipal}" class="px-3 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center"><i class="fas fa-id-badge mr-2 text-teal-600"></i>${rotuloPrincipal}</a>
                        ${podeAdmin ?'<a href="user.html" class="px-3 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center"><i class="fas fa-user mr-2 text-blue-500"></i>Meu perfil</a>' : ''}
                        ${(sessao.perfil === 'ADMIN' || sessao.cargo?.acessoSuporte) ?'<a href="suporte-admin.html" class="px-3 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center"><i class="fas fa-headset mr-2 text-teal-500"></i>Suporte</a>' : ''}
                        <a href="produtos.html" class="px-3 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center"><i class="fas fa-store mr-2 text-orange-500"></i>Ver produtos</a>
                        <button type="button" class="js-logout px-3 py-3 rounded-xl font-bold text-left text-red-600 hover:bg-red-50 inline-flex items-center"><i class="fas fa-right-from-bracket mr-2"></i>Sair</button>
                    </div>
                </div>
            </div>`;
    }

    function bindMenu(container) {
        const toggle = container.querySelector('.js-toggle-user-menu');
        const panel = container.querySelector('.js-user-menu-panel');
        const logoutBtn = container.querySelector('.js-logout');
        if (!toggle || !panel) return;
        toggle.addEventListener('click', event => { event.stopPropagation(); panel.classList.toggle('hidden'); });
        document.addEventListener('click', event => { if (!container.contains(event.target)) panel.classList.add('hidden'); });
        logoutBtn?.addEventListener('click', () => { clearSession(); window.location.href = 'index.html'; });
    }

    function renderUserArea(containerId, isMobile) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const sessao = getSession();
        container.innerHTML = sessao ?buildLoggedMenu(sessao, isMobile) : buildGuestButton(isMobile);
        if (sessao) bindMenu(container);
    }

    function refreshHeaderUserAreas() {
        renderUserArea('userAreaMobile', true);
        renderUserArea('userAreaDesktop', false);
    }

    window.PetZillaSession = { getSession, saveSession, clearSession, refreshHeaderUserAreas, avatarMarkup, cargoTemAcessoAdmin };
    document.addEventListener('DOMContentLoaded', refreshHeaderUserAreas);
})();
