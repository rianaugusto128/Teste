package com.devsenai2a.petshop.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.devsenai2a.petshop.entities.Produto;
import com.devsenai2a.petshop.entities.Promocao;
import com.devsenai2a.petshop.repositories.PromocaoRepository;

@Service
public class PromocaoService {

    @Autowired
    private PromocaoRepository promocaoRepository;

    @Autowired
    private ProdutoService produtoService;

    public List<Promocao> listarTodas() {
        return promocaoRepository.findAll();
    }

    public List<Promocao> listarAtivasAgora() {
        return promocaoRepository.buscarPromocoesAtivas(LocalDateTime.now());
    }

    public Promocao buscarPorId(Long id) {
        return promocaoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Promoção não encontrada com id: " + id));
    }

    public Promocao criar(Promocao promocao) {
        prepararPromocao(promocao);
        return promocaoRepository.save(promocao);
    }

    public Promocao atualizar(Long id, Promocao promocaoAtualizada) {
        Promocao existente = buscarPorId(id);
        existente.setNomeEvento(promocaoAtualizada.getNomeEvento());
        existente.setDescricao(promocaoAtualizada.getDescricao());
        existente.setPercentualDesconto(promocaoAtualizada.getPercentualDesconto());
        existente.setDataInicio(promocaoAtualizada.getDataInicio());
        existente.setDataFim(promocaoAtualizada.getDataFim());
        existente.setAtivo(promocaoAtualizada.getAtivo());
        existente.setProdutos(resolverProdutos(promocaoAtualizada.getProdutos()));
        validarPromocao(existente);
        return promocaoRepository.save(existente);
    }

    public void deletar(Long id) {
        Promocao promocao = buscarPorId(id);
        promocaoRepository.delete(promocao);
    }

    private void prepararPromocao(Promocao promocao) {
        if (promocao.getAtivo() == null) {
            promocao.setAtivo(true);
        }
        promocao.setProdutos(resolverProdutos(promocao.getProdutos()));
        validarPromocao(promocao);
    }

    private List<Produto> resolverProdutos(List<Produto> produtosRecebidos) {
        List<Produto> produtos = new ArrayList<>();
        if (produtosRecebidos == null) {
            return produtos;
        }
        for (Produto produto : produtosRecebidos) {
            if (produto != null && produto.getId() != null) {
                produtos.add(produtoService.buscarPorId(produto.getId()));
            }
        }
        return produtos;
    }

    private void validarPromocao(Promocao promocao) {
        if (promocao.getNomeEvento() == null || promocao.getNomeEvento().trim().isEmpty()) {
            throw new IllegalArgumentException("Informe o nome do evento da promoção.");
        }
        if (promocao.getPercentualDesconto() == null) {
            throw new IllegalArgumentException("Informe a porcentagem de desconto.");
        }
        BigDecimal zero = BigDecimal.ZERO;
        BigDecimal maximo = new BigDecimal("40");
        if (promocao.getPercentualDesconto().compareTo(zero) <= 0 || promocao.getPercentualDesconto().compareTo(maximo) > 0) {
            throw new IllegalArgumentException("A porcentagem precisa ser maior que 0 e no máximo 40.");
        }
        if (promocao.getDataInicio() == null || promocao.getDataFim() == null) {
            throw new IllegalArgumentException("Informe a data inicial e final da promoção.");
        }
        if (!promocao.getDataFim().isAfter(promocao.getDataInicio())) {
            throw new IllegalArgumentException("A data final precisa ser maior que a data inicial.");
        }
        if (promocao.getProdutos() == null || promocao.getProdutos().isEmpty()) {
            throw new IllegalArgumentException("Selecione pelo menos um produto para a promoção.");
        }
    }
}
