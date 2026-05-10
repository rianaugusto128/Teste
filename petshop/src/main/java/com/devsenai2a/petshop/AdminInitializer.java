package com.devsenai2a.petshop;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.devsenai2a.petshop.entities.Cargo;
import com.devsenai2a.petshop.entities.Usuario;
import com.devsenai2a.petshop.repositories.CargoRepository;
import com.devsenai2a.petshop.repositories.UsuarioRepository;

@Configuration
public class AdminInitializer {

    @Bean
    public CommandLineRunner criarOuCorrigirAdminPadrao(UsuarioRepository usuarioRepository, CargoRepository cargoRepository, BCryptPasswordEncoder passwordEncoder) {
        return args -> {
            Cargo administrador = garantirCargoPadrao(cargoRepository, "Administrador", "Acesso total ao painel administrativo.", true, true, true, true, true, true);
            garantirCargoPadrao(cargoRepository, "Gerente", "Gerencia produtos, categorias, promoções e estoque.", true, true, true, false, false, true);
            garantirCargoPadrao(cargoRepository, "Estoquista", "Controla somente o estoque dos produtos.", false, false, false, false, false, true);
            garantirCargoPadrao(cargoRepository, "Marketing", "Gerencia promoções e eventos.", false, false, true, false, false, false);
            garantirCargoPadrao(cargoRepository, "Atendente", "Atendimento ao cliente com acesso fixo aos produtos.", true, false, false, false, false, false);
            garantirCargoPadrao(cargoRepository, "Suporte", "Atendente de suporte com acesso ao painel de conversas.", false, false, false, false, false, false);

            String usuarioAdmin = "admin";
            String emailAdmin = "admin@petzilla.com";
            String senhaPadrao = "123456";

            Usuario admin = usuarioRepository.findByUsuarioIgnoreCase(usuarioAdmin)
                    .or(() -> usuarioRepository.findByEmailIgnoreCase(emailAdmin))
                    .orElse(null);

            if (admin == null) {
                admin = new Usuario();
                admin.setNome("Administrador");
                admin.setUsuario(usuarioAdmin);
                admin.setEmail(emailAdmin);
                admin.setSenha(passwordEncoder.encode(senhaPadrao));
                admin.setPerfil("ADMIN");
                admin.setAtivo(true);
                admin.setCargo(administrador);
                usuarioRepository.save(admin);

                System.out.println("==============================================");
                System.out.println("ADMIN PADRÃO CRIADO");
                System.out.println("Usuário: admin");
                System.out.println("Senha: 123456");
                System.out.println("==============================================");
                return;
            }

            boolean alterou = false;

            if (admin.getUsuario() == null || admin.getUsuario().isBlank()) {
                admin.setUsuario(usuarioAdmin);
                alterou = true;
            }

            if (admin.getEmail() == null || admin.getEmail().isBlank()) {
                admin.setEmail(emailAdmin);
                alterou = true;
            }

            if (!"ADMIN".equalsIgnoreCase(admin.getPerfil())) {
                admin.setPerfil("ADMIN");
                alterou = true;
            }

            if (Boolean.FALSE.equals(admin.getAtivo())) {
                admin.setAtivo(true);
                alterou = true;
            }

            if (admin.getCargo() == null || !"Administrador".equalsIgnoreCase(admin.getCargo().getNome())) {
                admin.setCargo(administrador);
                alterou = true;
            }

            if (admin.getSenha() == null || !admin.getSenha().startsWith("$2")) {
                admin.setSenha(passwordEncoder.encode(senhaPadrao));
                alterou = true;
            }

            if (alterou) {
                usuarioRepository.save(admin);
                System.out.println("Admin padrão corrigido. Use usuário admin e senha admin123.");
            }
        };
    }

    private Cargo garantirCargoPadrao(CargoRepository repository, String nome, String descricao,
            boolean produtos, boolean categorias, boolean promocoes, boolean usuarios, boolean cargos, boolean estoque) {
        Cargo cargo = repository.findByNomeIgnoreCase(nome).orElseGet(Cargo::new);
        boolean novo = cargo.getId() == null;
        boolean alterou = novo;

        if (cargo.getNome() == null || !cargo.getNome().equals(nome)) {
            cargo.setNome(nome);
            alterou = true;
        }
        if (cargo.getDescricao() == null || cargo.getDescricao().isBlank()) {
            cargo.setDescricao(descricao);
            alterou = true;
        }
        if (!Boolean.TRUE.equals(cargo.getAtivo())) {
            cargo.setAtivo(true);
            alterou = true;
        }
        if (!Boolean.valueOf(produtos).equals(cargo.getAcessoProdutos())) { cargo.setAcessoProdutos(produtos); alterou = true; }
        if (!Boolean.valueOf(categorias).equals(cargo.getAcessoCategorias())) { cargo.setAcessoCategorias(categorias); alterou = true; }
        if (!Boolean.valueOf(promocoes).equals(cargo.getAcessoPromocoes())) { cargo.setAcessoPromocoes(promocoes); alterou = true; }
        if (!Boolean.valueOf(usuarios).equals(cargo.getAcessoUsuarios())) { cargo.setAcessoUsuarios(usuarios); alterou = true; }
        if (!Boolean.valueOf(cargos).equals(cargo.getAcessoCargos())) { cargo.setAcessoCargos(cargos); alterou = true; }
        if (!Boolean.valueOf(estoque).equals(cargo.getAcessoEstoque())) { cargo.setAcessoEstoque(estoque); alterou = true; }
        boolean suporte = "Suporte".equalsIgnoreCase(nome);
        if (!Boolean.valueOf(suporte).equals(cargo.getAcessoSuporte())) { cargo.setAcessoSuporte(suporte); alterou = true; }

        return alterou ? repository.save(cargo) : cargo;
    }
}
