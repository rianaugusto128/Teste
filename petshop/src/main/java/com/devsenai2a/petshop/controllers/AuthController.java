package com.devsenai2a.petshop.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.devsenai2a.petshop.entities.Cargo;
import com.devsenai2a.petshop.entities.Usuario;
import com.devsenai2a.petshop.services.UsuarioService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Value("${PETZILLA_ADMIN_USUARIO:}")
    private String adminUsuario;

    @Value("${PETZILLA_ADMIN_SENHA:}")
    private String adminSenha;

    @Autowired
    private UsuarioService usuarioService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        if (request == null || request.getUsuario() == null || request.getSenha() == null) {
            return ResponseEntity.status(400).body(new LoginResponse(false, "Informe usuário/e-mail e senha.", null, null, null, null, null, null, null));
        }

        String login = request.getUsuario().trim();
        String senha = request.getSenha();

        if (adminUsuario != null && !adminUsuario.isBlank()
                && adminSenha != null && !adminSenha.isBlank()
                && adminUsuario.equals(login) && adminSenha.equals(senha)) {
            return ResponseEntity.ok(new LoginResponse(true, "Login administrativo realizado com sucesso.", "ADMIN", null, adminUsuario, "Administrador", null, null, null));
        }

        Usuario usuario = usuarioService.autenticar(login, senha);
        if (usuario == null) {
            return ResponseEntity.status(401).body(new LoginResponse(false, "Usuário ou senha inválidos.", null, null, null, null, null, null, null));
        }

        return ResponseEntity.ok(new LoginResponse(
                true,
                "Login realizado com sucesso.",
                usuario.getPerfil(),
                usuario.getId(),
                usuario.getUsuario(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getFotoPerfil(),
                usuario.getCargo()
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@RequestBody RegisterRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new RegisterResponse(false, "Informe os dados do cadastro.", null, null));
        }

        try {
            Usuario usuario = usuarioService.registrar(request.getNome(), request.getUsuario(), request.getEmail(), request.getSenha());
            return ResponseEntity.ok(new RegisterResponse(true, "Usuário cadastrado com sucesso.", usuario.getUsuario(), usuario.getNome()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new RegisterResponse(false, ex.getMessage(), null, null));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(new RegisterResponse(false, "Erro ao cadastrar usuário.", null, null));
        }
    }

    public static class LoginRequest {
        private String usuario;
        private String senha;
        public String getUsuario() { return usuario; }
        public void setUsuario(String usuario) { this.usuario = usuario; }
        public String getSenha() { return senha; }
        public void setSenha(String senha) { this.senha = senha; }
    }

    public static class RegisterRequest {
        private String nome;
        private String usuario;
        private String email;
        private String senha;
        public String getNome() { return nome; }
        public void setNome(String nome) { this.nome = nome; }
        public String getUsuario() { return usuario; }
        public void setUsuario(String usuario) { this.usuario = usuario; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getSenha() { return senha; }
        public void setSenha(String senha) { this.senha = senha; }
    }

    public static class LoginResponse {
        private boolean autenticado;
        private String mensagem;
        private String perfil;
        private Long id;
        private String usuario;
        private String nome;
        private String email;
        private String fotoPerfil;
        private Cargo cargo;

        public LoginResponse(boolean autenticado, String mensagem, String perfil, Long id, String usuario, String nome, String email, String fotoPerfil, Cargo cargo) {
            this.autenticado = autenticado;
            this.mensagem = mensagem;
            this.perfil = perfil;
            this.id = id;
            this.usuario = usuario;
            this.nome = nome;
            this.email = email;
            this.fotoPerfil = fotoPerfil;
            this.cargo = cargo;
        }

        public boolean isAutenticado() { return autenticado; }
        public void setAutenticado(boolean autenticado) { this.autenticado = autenticado; }
        public String getMensagem() { return mensagem; }
        public void setMensagem(String mensagem) { this.mensagem = mensagem; }
        public String getPerfil() { return perfil; }
        public void setPerfil(String perfil) { this.perfil = perfil; }
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getUsuario() { return usuario; }
        public void setUsuario(String usuario) { this.usuario = usuario; }
        public String getNome() { return nome; }
        public void setNome(String nome) { this.nome = nome; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getFotoPerfil() { return fotoPerfil; }
        public void setFotoPerfil(String fotoPerfil) { this.fotoPerfil = fotoPerfil; }
        public Cargo getCargo() { return cargo; }
        public void setCargo(Cargo cargo) { this.cargo = cargo; }
    }

    public static class RegisterResponse {
        private boolean cadastrado;
        private String mensagem;
        private String usuario;
        private String nome;
        public RegisterResponse(boolean cadastrado, String mensagem, String usuario, String nome) {
            this.cadastrado = cadastrado;
            this.mensagem = mensagem;
            this.usuario = usuario;
            this.nome = nome;
        }
        public boolean isCadastrado() { return cadastrado; }
        public void setCadastrado(boolean cadastrado) { this.cadastrado = cadastrado; }
        public String getMensagem() { return mensagem; }
        public void setMensagem(String mensagem) { this.mensagem = mensagem; }
        public String getUsuario() { return usuario; }
        public void setUsuario(String usuario) { this.usuario = usuario; }
        public String getNome() { return nome; }
        public void setNome(String nome) { this.nome = nome; }
    }
}
