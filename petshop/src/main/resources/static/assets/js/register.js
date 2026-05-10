const PORTS = [8080, 8081];
let API_AUTH_REGISTER = 'http://localhost:8080/api/auth/register';

function showRegisterStatus(msg, type = 'error') {
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
                API_AUTH_REGISTER = `http://localhost:${porta}/api/auth/register`;
                return true;
            }
        } catch (error) {
            console.log(`Backend não respondeu na porta ${porta}`);
        }
    }
    return false;
}

async function registrarUsuario(payload) {
    const response = await fetch(API_AUTH_REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.cadastrado !== true) {
        throw new Error(data.mensagem || 'Não foi possível concluir o cadastro.');
    }
    return data;
}

document.addEventListener('DOMContentLoaded', async () => {
    await descobrirBackend();

    document.getElementById('toggleSenha').addEventListener('click', () => {
        const senha = document.getElementById('senha');
        const icon = document.querySelector('#toggleSenha i');
        senha.type = senha.type === 'password' ?'text' : 'password';
        icon.className = senha.type === 'password' ?'fas fa-eye' : 'fas fa-eye-slash';
    });

    document.getElementById('registerForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = {
            nome: document.getElementById('nome').value.trim(),
            usuario: document.getElementById('usuario').value.trim(),
            email: document.getElementById('email').value.trim(),
            senha: document.getElementById('senha').value.trim()
        };

        if (!payload.nome || !payload.usuario || !payload.email || !payload.senha) {
            showRegisterStatus('Preencha todos os campos.');
            return;
        }

        if (payload.senha.length < 6) {
            showRegisterStatus('A senha precisa ter pelo menos 6 caracteres.');
            return;
        }

        try {
            await registrarUsuario(payload);
            showRegisterStatus('Cadastro realizado com sucesso. Redirecionando para o login...', 'success');
            setTimeout(() => window.location.href = 'login.html', 900);
        } catch (error) {
            showRegisterStatus(error.message || 'Erro ao cadastrar usuário.');
        }
    });
});
