package com.devsenai2a.petshop.controllers;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.devsenai2a.petshop.entities.Cargo;
import com.devsenai2a.petshop.entities.Usuario;
import com.devsenai2a.petshop.services.UsuarioService;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @GetMapping
    public List<UsuarioResponse> listar() {
        return usuarioService.listarTodos().stream()
            .map(UsuarioResponse::new)
            .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(new UsuarioResponse(usuarioService.buscarPorId(id)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(new ErrorResponse(ex.getMessage()));
        }
    }

    @GetMapping("/login/{login}")
    public ResponseEntity<?> buscarPorLogin(@PathVariable String login) {
        try {
            return ResponseEntity.ok(new UsuarioResponse(usuarioService.buscarPorLogin(login)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(new ErrorResponse(ex.getMessage()));
        }
    }

    @PutMapping("/{id}/perfil")
    public ResponseEntity<?> atualizarPerfil(@PathVariable Long id, @RequestBody AtualizarPerfilRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Informe os dados do perfil."));
        }

        try {
            Usuario usuario = usuarioService.atualizarPerfil(
                    id,
                    request.getNome(),
                    request.getEmail(),
                    request.getFotoPerfil(),
                    request.getTelefone(),
                    request.getCep(),
                    request.getEndereco(),
                    request.getNumero(),
                    request.getComplemento(),
                    request.getBairro(),
                    request.getCidade(),
                    request.getEstado()
            );
            return ResponseEntity.ok(new UsuarioResponse(usuario));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(new ErrorResponse("Erro ao atualizar perfil."));
        }
    }

    @PutMapping("/{id}/admin")
    public ResponseEntity<?> atualizarUsuarioAdmin(@PathVariable Long id, @RequestBody AtualizarUsuarioAdminRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Informe os dados do usuário."));
        }
        try {
            Usuario usuario = usuarioService.atualizarUsuarioAdmin(
                    id,
                    request.getNome(),
                    request.getEmail(),
                    request.getPerfil(),
                    request.getAtivo(),
                    request.getCargoId()
            );
            return ResponseEntity.ok(new UsuarioResponse(usuario));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(new ErrorResponse("Erro ao atualizar usuário."));
        }
    }

    @PutMapping("/{id}/senha")
    public ResponseEntity<?> alterarSenha(@PathVariable Long id, @RequestBody AlterarSenhaRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Informe a nova senha."));
        }
        try {
            return ResponseEntity.ok(new UsuarioResponse(usuarioService.alterarSenhaAdmin(id, request.getNovaSenha())));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
        }
    }

    public static class AtualizarPerfilRequest {
        private String nome;
        private String email;
        private String fotoPerfil;
        private String telefone;
        private String cep;
        private String endereco;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String estado;

        public String getNome() { return nome; }
        public void setNome(String nome) { this.nome = nome; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getFotoPerfil() { return fotoPerfil; }
        public void setFotoPerfil(String fotoPerfil) { this.fotoPerfil = fotoPerfil; }
        public String getTelefone() { return telefone; }
        public void setTelefone(String telefone) { this.telefone = telefone; }
        public String getCep() { return cep; }
        public void setCep(String cep) { this.cep = cep; }
        public String getEndereco() { return endereco; }
        public void setEndereco(String endereco) { this.endereco = endereco; }
        public String getNumero() { return numero; }
        public void setNumero(String numero) { this.numero = numero; }
        public String getComplemento() { return complemento; }
        public void setComplemento(String complemento) { this.complemento = complemento; }
        public String getBairro() { return bairro; }
        public void setBairro(String bairro) { this.bairro = bairro; }
        public String getCidade() { return cidade; }
        public void setCidade(String cidade) { this.cidade = cidade; }
        public String getEstado() { return estado; }
        public void setEstado(String estado) { this.estado = estado; }
    }

    public static class AtualizarUsuarioAdminRequest {
        private String nome;
        private String email;
        private String perfil;
        private Boolean ativo;
        private Long cargoId;

        public String getNome() { return nome; }
        public void setNome(String nome) { this.nome = nome; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPerfil() { return perfil; }
        public void setPerfil(String perfil) { this.perfil = perfil; }
        public Boolean getAtivo() { return ativo; }
        public void setAtivo(Boolean ativo) { this.ativo = ativo; }
        public Long getCargoId() { return cargoId; }
        public void setCargoId(Long cargoId) { this.cargoId = cargoId; }
    }

    public static class AlterarSenhaRequest {
        private String novaSenha;
        public String getNovaSenha() { return novaSenha; }
        public void setNovaSenha(String novaSenha) { this.novaSenha = novaSenha; }
    }

    public static class UsuarioResponse {
        private Long id;
        private String nome;
        private String usuario;
        private String email;
        private String perfil;
        private Boolean ativo;
        private String fotoPerfil;
        private String telefone;
        private String cep;
        private String endereco;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String estado;
        private Cargo cargo;

        public UsuarioResponse(Usuario usuario) {
            this.id = usuario.getId();
            this.nome = usuario.getNome();
            this.usuario = usuario.getUsuario();
            this.email = usuario.getEmail();
            this.perfil = usuario.getPerfil();
            this.ativo = usuario.getAtivo();
            this.fotoPerfil = usuario.getFotoPerfil();
            this.telefone = usuario.getTelefone();
            this.cep = usuario.getCep();
            this.endereco = usuario.getEndereco();
            this.numero = usuario.getNumero();
            this.complemento = usuario.getComplemento();
            this.bairro = usuario.getBairro();
            this.cidade = usuario.getCidade();
            this.estado = usuario.getEstado();
            this.cargo = usuario.getCargo();
        }

        public Long getId() { return id; }
        public String getNome() { return nome; }
        public String getUsuario() { return usuario; }
        public String getEmail() { return email; }
        public String getPerfil() { return perfil; }
        public Boolean getAtivo() { return ativo; }
        public String getFotoPerfil() { return fotoPerfil; }
        public String getTelefone() { return telefone; }
        public String getCep() { return cep; }
        public String getEndereco() { return endereco; }
        public String getNumero() { return numero; }
        public String getComplemento() { return complemento; }
        public String getBairro() { return bairro; }
        public String getCidade() { return cidade; }
        public String getEstado() { return estado; }
        public Cargo getCargo() { return cargo; }
    }

    public static class ErrorResponse {
        private String mensagem;
        public ErrorResponse(String mensagem) { this.mensagem = mensagem; }
        public String getMensagem() { return mensagem; }
        public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    }
}
