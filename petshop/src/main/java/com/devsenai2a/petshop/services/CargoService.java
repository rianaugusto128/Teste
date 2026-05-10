package com.devsenai2a.petshop.services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.devsenai2a.petshop.entities.Cargo;
import com.devsenai2a.petshop.repositories.CargoRepository;

@Service
public class CargoService {

    @Autowired
    private CargoRepository cargoRepository;

    public List<Cargo> listarTodos() {
        return cargoRepository.findAll();
    }

    public Cargo buscarPorId(Long id) {
        return cargoRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Cargo não encontrado com id: " + id));
    }

    public Cargo criar(Cargo cargo) {
        validar(cargo, null);
        prepararDefaults(cargo);
        return cargoRepository.save(cargo);
    }

    public Cargo atualizar(Long id, Cargo atualizado) {
        Cargo existente = buscarPorId(id);
        validar(atualizado, id);
        existente.setNome(atualizado.getNome().trim());
        existente.setDescricao(limpar(atualizado.getDescricao()));
        existente.setAtivo(atualizado.getAtivo() != null ? atualizado.getAtivo() : true);
        copiarPermissoes(atualizado, existente);
        return cargoRepository.save(existente);
    }

    public void deletar(Long id) {
        cargoRepository.delete(buscarPorId(id));
    }

    private void prepararDefaults(Cargo cargo) {
        cargo.setNome(cargo.getNome().trim());
        cargo.setDescricao(limpar(cargo.getDescricao()));
        if (cargo.getAtivo() == null) cargo.setAtivo(true);
        normalizarPermissoes(cargo);
    }

    private void copiarPermissoes(Cargo origem, Cargo destino) {
        destino.setAcessoProdutos(Boolean.TRUE.equals(origem.getAcessoProdutos()));
        destino.setAcessoCategorias(Boolean.TRUE.equals(origem.getAcessoCategorias()));
        destino.setAcessoPromocoes(Boolean.TRUE.equals(origem.getAcessoPromocoes()));
        destino.setAcessoUsuarios(Boolean.TRUE.equals(origem.getAcessoUsuarios()));
        destino.setAcessoCargos(Boolean.TRUE.equals(origem.getAcessoCargos()));
        destino.setAcessoEstoque(Boolean.TRUE.equals(origem.getAcessoEstoque()));
        destino.setAcessoSuporte(Boolean.TRUE.equals(origem.getAcessoSuporte()));
    }

    private void normalizarPermissoes(Cargo cargo) {
        cargo.setAcessoProdutos(Boolean.TRUE.equals(cargo.getAcessoProdutos()));
        cargo.setAcessoCategorias(Boolean.TRUE.equals(cargo.getAcessoCategorias()));
        cargo.setAcessoPromocoes(Boolean.TRUE.equals(cargo.getAcessoPromocoes()));
        cargo.setAcessoUsuarios(Boolean.TRUE.equals(cargo.getAcessoUsuarios()));
        cargo.setAcessoCargos(Boolean.TRUE.equals(cargo.getAcessoCargos()));
        cargo.setAcessoEstoque(Boolean.TRUE.equals(cargo.getAcessoEstoque()));
        cargo.setAcessoSuporte(Boolean.TRUE.equals(cargo.getAcessoSuporte()));
    }

    private void validar(Cargo cargo, Long idAtual) {
        if (cargo == null || cargo.getNome() == null || cargo.getNome().trim().isEmpty()) {
            throw new IllegalArgumentException("Informe o nome do cargo.");
        }
        cargoRepository.findByNomeIgnoreCase(cargo.getNome().trim()).ifPresent(existente -> {
            if (idAtual == null || !existente.getId().equals(idAtual)) {
                throw new IllegalArgumentException("Já existe um cargo com este nome.");
            }
        });
    }

    private String limpar(String valor) {
        return valor != null && !valor.trim().isEmpty() ? valor.trim() : null;
    }
}
