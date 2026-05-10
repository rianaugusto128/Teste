const USER_PORTS = [8080, 8081];
let API_USUARIOS = 'http://localhost:8080/api/usuarios';
let fotoPerfilAtual = '';
let usuarioAtualId = null;
let perfilAtual = null;
let cepTimer = null;
let ultimoCepBuscado = '';

function userStatus(msg, type = 'success') {
    const div = document.getElementById('userStatus');
    const ok = type === 'success';
    div.className = `mb-6 p-4 rounded-2xl border font-semibold ${ok ?'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`;
    div.innerHTML = `<i class="fas ${ok ?'fa-check-circle' : 'fa-triangle-exclamation'} mr-2"></i>${msg}`;
    div.classList.remove('hidden');
}

function getSession() {
    return window.PetZillaSession?.getSession?.() || null;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function getValue(id) {
    return document.getElementById(id)?.value?.trim() || '';
}

function updatePreview(src, name = 'Usuário') {
    const preview = document.getElementById('profilePreview');
    if (!preview) return;
    if (src) {
        preview.innerHTML = `<img src="${src}" alt="Foto de perfil" class="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl">`;
    } else {
        const inicial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
        preview.innerHTML = `<div class="w-32 h-32 rounded-full bg-gradient-to-br from-teal-500 to-orange-400 text-white flex items-center justify-center text-5xl font-black shadow-xl">${inicial}</div>`;
    }
}

async function descobrirBackend() {
    for (const porta of USER_PORTS) {
        try {
            const response = await fetch(`http://localhost:${porta}/api/produtos`);
            if (response.ok) {
                API_USUARIOS = `http://localhost:${porta}/api/usuarios`;
                return true;
            }
        } catch (_) {}
    }
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
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.mensagem || 'Erro ao processar a requisição.');
    }
    return data;
}

function preencherFormulario(data, fallbackSession) {
    const perfil = data || fallbackSession || {};
    perfilAtual = perfil;
    usuarioAtualId = perfil.id ?? fallbackSession?.id ?? usuarioAtualId;

    setValue('nome', perfil.nome || '');
    setValue('usuario', perfil.usuario || '');
    setValue('email', perfil.email || '');
    setValue('telefone', perfil.telefone || '');
    setValue('cep', perfil.cep || '');
    setValue('endereco', perfil.endereco || '');
    setValue('numero', perfil.numero || '');
    setValue('complemento', perfil.complemento || '');
    setValue('bairro', perfil.bairro || '');
    setValue('cidade', perfil.cidade || '');
    setValue('estado', perfil.estado || '');

    fotoPerfilAtual = perfil.fotoPerfil || '';
    updatePreview(fotoPerfilAtual, perfil.nome || perfil.usuario || 'Usuário');
    document.getElementById('welcomeName').textContent = perfil.nome || perfil.usuario || 'Usuário';
}

async function recuperarPerfilPelaSessao(sessao) {
    if (sessao?.id) {
        return fetchJson(`${API_USUARIOS}/${sessao.id}`);
    }

    const login = sessao?.usuario || sessao?.email || '';
    if (login && sessao?.perfil !== 'ADMIN') {
        return fetchJson(`${API_USUARIOS}/login/${encodeURIComponent(login)}`);
    }

    return null;
}

async function carregarPerfil() {
    const sessao = getSession();
    if (!sessao || !sessao.logado) {
        window.location.href = 'login.html';
        return;
    }

    preencherFormulario(null, sessao);

    try {
        const perfil = await recuperarPerfilPelaSessao(sessao);
        if (perfil) {
            preencherFormulario(perfil, sessao);
            if (window.PetZillaSession?.saveSession) {
                window.PetZillaSession.saveSession({ ...sessao, ...perfil });
                window.PetZillaSession.refreshHeaderUserAreas?.();
            }
            return;
        }

        if (sessao.perfil === 'ADMIN') {
            document.getElementById('adminHint').classList.remove('hidden');
        }
    } catch (error) {
        userStatus('Não encontrei o cadastro completo desta sessão. Saia e faça login novamente, ou confirme se o usuário existe no banco.', 'error');
    }
}

function prepararUploadImagem() {
    const input = document.getElementById('fotoPerfilArquivo');
    const remover = document.getElementById('removePhoto');

    input.addEventListener('change', () => {
        const arquivo = input.files?.[0];
        if (!arquivo) return;
        if (!arquivo.type.startsWith('image/')) {
            userStatus('Selecione um arquivo de imagem válido.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            fotoPerfilAtual = reader.result;
            updatePreview(fotoPerfilAtual, getValue('nome') || 'Usuário');
        };
        reader.readAsDataURL(arquivo);
    });

    remover.addEventListener('click', () => {
        fotoPerfilAtual = '';
        input.value = '';
        updatePreview('', getValue('nome') || 'Usuário');
    });
}

async function buscarCep(silencioso = false) {
    const cepLimpo = getValue('cep').replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        if (!silencioso) userStatus('Informe um CEP com 8 numeros.', 'error');
        return;
    }
    if (silencioso && cepLimpo === ultimoCepBuscado) return;
    ultimoCepBuscado = cepLimpo;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (data.erro) {
            userStatus('CEP não encontrado.', 'error');
            return;
        }

        setValue('cep', data.cep || getValue('cep'));
        setValue('endereco', data.logradouro || getValue('endereco'));
        setValue('bairro', data.bairro || getValue('bairro'));
        setValue('cidade', data.localidade || getValue('cidade'));
        setValue('estado', data.uf || getValue('estado'));
        document.getElementById('numero')?.focus();
        if (!silencioso) userStatus('Endereco preenchido pelo CEP. Confira o numero e complemento.');
    } catch (error) {
        userStatus('Não foi possível buscar o CEP agora. Preencha manualmente.', 'error');
    }
}

function configurarFormulario() {
    document.getElementById('nome').addEventListener('input', (e) => {
        updatePreview(fotoPerfilAtual, e.target.value || 'Usuário');
    });

    document.getElementById('buscarCep').addEventListener('click', () => buscarCep(false));
    document.getElementById('cep').addEventListener('input', () => {
        clearTimeout(cepTimer);
        const cepLimpo = getValue('cep').replace(/\\D/g, '');
        if (cepLimpo.length === 8) cepTimer = setTimeout(() => buscarCep(true), 350);
    });
    document.getElementById('cep').addEventListener('blur', () => {
        const cepLimpo = getValue('cep').replace(/\\D/g, '');
        if (cepLimpo.length === 8) buscarCep(true);
    });

    document.getElementById('profileForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const sessao = getSession();
        const idParaSalvar = usuarioAtualId || sessao?.id;

        if (!idParaSalvar) {
            userStatus('Sessão antiga sem ID. Clique em sair, faça login novamente e tente salvar o perfil.', 'error');
            return;
        }

        const payload = {
            nome: getValue('nome'),
            email: getValue('email'),
            fotoPerfil: fotoPerfilAtual || '',
            telefone: getValue('telefone'),
            cep: getValue('cep'),
            endereco: getValue('endereco'),
            numero: getValue('numero'),
            complemento: getValue('complemento'),
            bairro: getValue('bairro'),
            cidade: getValue('cidade'),
            estado: getValue('estado').toUpperCase()
        };

        if (!payload.nome || !payload.email) {
            userStatus('Preencha nome e e-mail para salvar.', 'error');
            return;
        }

        try {
            const perfil = await fetchJson(`${API_USUARIOS}/${idParaSalvar}/perfil`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (window.PetZillaSession?.saveSession) {
                window.PetZillaSession.saveSession({ ...(sessao || {}), ...perfil });
                window.PetZillaSession.refreshHeaderUserAreas?.();
            }
            preencherFormulario(perfil, sessao);
            userStatus('Perfil atualizado com sucesso.');
        } catch (error) {
            userStatus(error.message || 'Erro ao atualizar perfil.', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await descobrirBackend();
    prepararUploadImagem();
    configurarFormulario();
    await carregarPerfil();
});


