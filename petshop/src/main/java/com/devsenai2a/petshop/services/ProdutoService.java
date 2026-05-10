package com.devsenai2a.petshop.services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.devsenai2a.petshop.entities.Produto;
import com.devsenai2a.petshop.repositories.ProdutoRepository;

@Service
public class ProdutoService {

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private CategoriaService categoriaService;

    public List<Produto> listarTodos() {
        return produtoRepository.findAll();
    }

    public List<Produto> buscarPorNome(String nome) {
        if (nome == null || nome.trim().isEmpty()) {
            return listarTodos();
        }
        return produtoRepository.findByNomeContainingIgnoreCase(nome.trim());
    }

    public Produto buscarPorId(Long id) {
        return produtoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Produto nÃ£o encontrado com id: " + id));
    }

    public Produto criar(Produto produto) {
        if (produto.getCategoria() != null && produto.getCategoria().getId() != null) {
            produto.setCategoria(categoriaService.buscarPorId(produto.getCategoria().getId()));
        }
        if (produto.getAtivo() == null) {
            produto.setAtivo(true);
        }
        if (produto.getDestaque() == null) {
            produto.setDestaque(false);
        }
        if (produto.getQtdEstoque() == null) {
            produto.setQtdEstoque(0);
        }
        if (produto.getPrecoDesconto() == null) {
            produto.setPrecoDesconto(produto.getPreco());
        }
        return produtoRepository.save(produto);
    }

    public Produto atualizar(Long id, Produto produtoAtualizado) {
        Produto existing = buscarPorId(id);
        
        existing.setNome(produtoAtualizado.getNome());
        existing.setDescricao(produtoAtualizado.getDescricao());
        existing.setPreco(produtoAtualizado.getPreco());
        existing.setPrecoDesconto(produtoAtualizado.getPrecoDesconto() != null ? produtoAtualizado.getPrecoDesconto() : produtoAtualizado.getPreco());
        existing.setImagem(produtoAtualizado.getImagem());
        existing.setDestaque(produtoAtualizado.getDestaque() != null ? produtoAtualizado.getDestaque() : false);
        existing.setQtdEstoque(produtoAtualizado.getQtdEstoque() != null ? produtoAtualizado.getQtdEstoque() : 0);
        existing.setAtivo(produtoAtualizado.getAtivo() != null ? produtoAtualizado.getAtivo() : true);
        
        if (produtoAtualizado.getCategoria() != null && produtoAtualizado.getCategoria().getId() != null) {
            existing.setCategoria(categoriaService.buscarPorId(produtoAtualizado.getCategoria().getId()));
        } else {
            existing.setCategoria(null);
        }
        
        return produtoRepository.save(existing);
    }


    public Produto atualizarEstoque(Long id, Integer qtdEstoque) {
        Produto produto = buscarPorId(id);
        produto.setQtdEstoque(qtdEstoque != null ? qtdEstoque : 0);
        return produtoRepository.save(produto);
    }

    public void deletar(Long id) {
        Produto produto = buscarPorId(id);
        produtoRepository.delete(produto);
        System.out.println("Produto " + id + " deletado com sucesso!");
    }
}
