package com.devsenai2a.petshop.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.devsenai2a.petshop.entities.Usuario;
import com.devsenai2a.petshop.repositories.UsuarioRepository;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CargoService cargoService;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    public List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public Usuario registrar(String nome, String usuario, String email, String senha) {
        validarCadastro(nome, usuario, email, senha);

        if (usuarioRepository.existsByUsuarioIgnoreCase(usuario.trim())) {
            throw new IllegalArgumentException("Este usuário já está cadastrado.");
        }

        if (usuarioRepository.existsByEmailIgnoreCase(email.trim())) {
            throw new IllegalArgumentException("Este e-mail já está cadastrado.");
        }

        Usuario novo = new Usuario();
        novo.setNome(nome.trim());
        novo.setUsuario(usuario.trim());
        novo.setEmail(email.trim().toLowerCase());
        novo.setSenha(passwordEncoder.encode(senha));
        novo.setPerfil("USUARIO");
        novo.setAtivo(true);
        novo.setFotoPerfil(null);

        return usuarioRepository.save(novo);
    }

    public Usuario autenticar(String login, String senha) {
        if (login == null || login.trim().isEmpty() || senha == null || senha.isEmpty()) {
            return null;
        }

        Usuario usuario = usuarioRepository.findByUsuarioIgnoreCase(login.trim())
                .or(() -> usuarioRepository.findByEmailIgnoreCase(login.trim()))
                .orElse(null);

        if (usuario == null || Boolean.FALSE.equals(usuario.getAtivo())) {
            return null;
        }

        if (!passwordEncoder.matches(senha, usuario.getSenha())) {
            return null;
        }

        return usuario;
    }

    public Usuario buscarPorId(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
    }

    public Usuario buscarPorLogin(String login) {
        if (login == null || login.trim().isEmpty()) {
            throw new IllegalArgumentException("Informe o usuário ou e-mail.");
        }

        String valor = login.trim();
        return usuarioRepository.findByUsuarioIgnoreCase(valor)
                .or(() -> usuarioRepository.findByEmailIgnoreCase(valor))
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
    }

    public Usuario atualizarPerfil(Long id, String nome, String email, String fotoPerfil,
            String telefone, String cep, String endereco, String numero, String complemento,
            String bairro, String cidade, String estado) {

        Usuario usuario = buscarPorId(id);
        validarPerfil(nome, email);

        String emailNormalizado = email.trim().toLowerCase();
        Optional<Usuario> outroUsuario = usuarioRepository.findByEmailIgnoreCase(emailNormalizado);
        if (outroUsuario.isPresent() && !outroUsuario.get().getId().equals(usuario.getId())) {
            throw new IllegalArgumentException("Este e-mail já está cadastrado em outro usuário.");
        }

        usuario.setNome(nome.trim());
        usuario.setEmail(emailNormalizado);
        usuario.setFotoPerfil(limpar(fotoPerfil));
        usuario.setTelefone(limpar(telefone));
        usuario.setCep(limpar(cep));
        usuario.setEndereco(limpar(endereco));
        usuario.setNumero(limpar(numero));
        usuario.setComplemento(limpar(complemento));
        usuario.setBairro(limpar(bairro));
        usuario.setCidade(limpar(cidade));
        usuario.setEstado(normalizarEstado(estado));

        return usuarioRepository.save(usuario);
    }

    public Usuario atualizarUsuarioAdmin(Long id, String nome, String email, String perfil, Boolean ativo, Long cargoId) {
        Usuario usuario = buscarPorId(id);
        validarPerfil(nome, email);

        String emailNormalizado = email.trim().toLowerCase();
        Optional<Usuario> outroUsuario = usuarioRepository.findByEmailIgnoreCase(emailNormalizado);
        if (outroUsuario.isPresent() && !outroUsuario.get().getId().equals(usuario.getId())) {
            throw new IllegalArgumentException("Este e-mail já está cadastrado em outro usuário.");
        }

        usuario.setNome(nome.trim());
        usuario.setEmail(emailNormalizado);
        usuario.setPerfil(normalizarPerfil(perfil));
        usuario.setAtivo(ativo != null ? ativo : true);
        usuario.setCargo(cargoId != null ? cargoService.buscarPorId(cargoId) : null);

        return usuarioRepository.save(usuario);
    }

    public Usuario alterarSenhaAdmin(Long id, String novaSenha) {
        if (novaSenha == null || novaSenha.length() < 6) {
            throw new IllegalArgumentException("A senha precisa ter pelo menos 6 caracteres.");
        }
        Usuario usuario = buscarPorId(id);
        usuario.setSenha(passwordEncoder.encode(novaSenha));
        return usuarioRepository.save(usuario);
    }

    private String normalizarPerfil(String perfil) {
        String valor = limpar(perfil);
        if (valor == null) return "USUARIO";
        valor = valor.toUpperCase();
        return "ADMIN".equals(valor) ? "ADMIN" : "USUARIO";
    }

    private String limpar(String valor) {
        return valor != null && !valor.trim().isEmpty() ? valor.trim() : null;
    }

    private String normalizarEstado(String estado) {
        String valor = limpar(estado);
        if (valor == null) return null;
        valor = valor.toUpperCase();
        if (valor.length() > 2) {
            valor = valor.substring(0, 2);
        }
        return valor;
    }

    private void validarCadastro(String nome, String usuario, String email, String senha) {
        if (nome == null || nome.trim().isEmpty()) {
            throw new IllegalArgumentException("Informe o nome.");
        }
        if (usuario == null || usuario.trim().isEmpty()) {
            throw new IllegalArgumentException("Informe o usuário.");
        }
        if (email == null || email.trim().isEmpty() || !email.contains("@")) {
            throw new IllegalArgumentException("Informe um e-mail válido.");
        }
        if (senha == null || senha.length() < 6) {
            throw new IllegalArgumentException("A senha precisa ter pelo menos 6 caracteres.");
        }
    }

    private void validarPerfil(String nome, String email) {
        if (nome == null || nome.trim().isEmpty()) {
            throw new IllegalArgumentException("Informe o nome.");
        }
        if (email == null || email.trim().isEmpty() || !email.contains("@")) {
            throw new IllegalArgumentException("Informe um e-mail válido.");
        }
    }
}
