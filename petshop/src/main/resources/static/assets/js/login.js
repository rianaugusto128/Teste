const PORTS = [8080, 8081];
let API_AUTH_LOGIN = 'http://localhost:8080/api/auth/login';

function showLoginStatus(msg, type = 'error') {
    const div = document.getElementById('status');
    const ok = type === 'success';
    div.className = `p-4 rounded-2xl border text-sm font-bold ${ok ?'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`;
    div.innerHTML = `<i class="fas ${ok ?'fa-check-circle' : 'fa-triangle-exclamation'} mr-2"></i>${msg}`;
    div.classList.remove('hidden');
}

async function descobrirBackend() {
    for (const porta of PORTS) {
        try {
            const response = await fetch(`http://localhost:${porta}/api/produtos`);
            if (response.ok) {
                API_AUTH_LOGIN = `http://localhost:${porta}/api/auth/login`;
                return true;
            }
        } catch (error) {
            console.log(`Backend não respondeu na porta ${porta}`);
        }
    }
    return false;
}

async function loginBackend(usuario, senha) {
    const response = await fetch(API_AUTH_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.autenticado !== true) {
        throw new Error(data.mensagem || 'Usuário ou senha inválidos.');
    }
    return data;
}

function limparSessoes() {
    if (window.PetZillaSession?.clearSession) {
        window.PetZillaSession.clearSession();
        return;
    }
    localStorage.removeItem('petzilla_sessao');
    localStorage.removeItem('petzilla_admin_logado');
    localStorage.removeItem('petzilla_admin_usuario');
    localStorage.removeItem('petzilla_admin_login_em');
    localStorage.removeItem('petzilla_usuario_logado');
    localStorage.removeItem('petzilla_usuario_nome');
    localStorage.removeItem('petzilla_usuario_perfil');
}

function salvarSessao(data) {
    limparSessoes();
    const sessao = {
        id: data.id ?? null,
        nome: data.nome || data.usuario || 'Usuário',
        usuario: data.usuario || '',
        email: data.email || '',
        perfil: data.perfil || 'USUARIO',
        fotoPerfil: data.fotoPerfil || '',
        cargo: data.cargo || null
    };

    if (window.PetZillaSession?.saveSession) {
        window.PetZillaSession.saveSession(sessao);
    } else {
        localStorage.setItem('petzilla_sessao', JSON.stringify({ ...sessao, logado: true }));
    }

    const cargoTemAcessoAdmin = sessao.cargo && (sessao.cargo.acessoProdutos || sessao.cargo.acessoCategorias || sessao.cargo.acessoPromocoes || sessao.cargo.acessoUsuarios || sessao.cargo.acessoCargos || sessao.cargo.acessoEstoque);
    if (sessao.perfil === 'ADMIN' || cargoTemAcessoAdmin) {
        localStorage.setItem('petzilla_admin_logado', 'true');
        localStorage.setItem('petzilla_admin_usuario', sessao.usuario || 'admin');
        localStorage.setItem('petzilla_admin_login_em', new Date().toISOString());
        return 'admin.html';
    }

    localStorage.setItem('petzilla_usuario_logado', 'true');
    localStorage.setItem('petzilla_usuario_id', sessao.id ?? '');
    localStorage.setItem('petzilla_usuario_nome', sessao.nome);
    localStorage.setItem('petzilla_usuario_login', sessao.usuario);
    localStorage.setItem('petzilla_usuario_email', sessao.email);
    localStorage.setItem('petzilla_usuario_foto', sessao.fotoPerfil || '');
    localStorage.setItem('petzilla_usuario_cargo', JSON.stringify(sessao.cargo || null));
    localStorage.setItem('petzilla_usuario_perfil', sessao.perfil || 'USUARIO');
    return 'produtos.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    await descobrirBackend();

    document.getElementById('toggleSenha').addEventListener('click', () => {
        const senha = document.getElementById('senha');
        const icon = document.querySelector('#toggleSenha i');
        senha.type = senha.type === 'password' ?'text' : 'password';
        icon.className = senha.type === 'password' ?'fas fa-eye' : 'fas fa-eye-slash';
    });

    document.getElementById('loginForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value.trim();

        if (!usuario || !senha) {
            showLoginStatus('Preencha usuário/e-mail e senha.');
            return;
        }

        try {
            const data = await loginBackend(usuario, senha);
            const destino = salvarSessao(data);
            showLoginStatus('Login realizado com sucesso. Redirecionando...', 'success');
            setTimeout(() => window.location.href = destino, 600);
        } catch (error) {
            showLoginStatus(error.message || 'Usuário ou senha inválidos.');
        }
    });
});
