package com.devsenai2a.petshop.services;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.devsenai2a.petshop.entities.Categoria;
import com.devsenai2a.petshop.entities.Produto;
import com.devsenai2a.petshop.entities.Promocao;
import com.devsenai2a.petshop.entities.Usuario;

@Service
public class DiscordLogService {

    private final WebClient webClient;

    @Value("${discord.bot.url:http://localhost:3001}")
    private String botUrl;

    @Value("${discord.bot.api-key:petzilla-secret-123}")
    private String apiKey;

    public DiscordLogService(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    private void enviar(String endpoint, Map<String, Object> payload) {
        try {
            webClient.post()
                    .uri(botUrl + "/api/" + endpoint)
                    .header("x-api-key", apiKey)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe();
        } catch (Exception e) {
            System.out.println("Erro ao enviar log para Discord: " + e.getMessage());
        }
    }

    public void logProduto(String acao, Produto produto) {
        if (produto == null) return;
        Map<String, Object> payload = new HashMap<>();
        payload.put("acao", acao);
        payload.put("id", produto.getId());
        payload.put("nome", produto.getNome());
        payload.put("preco", produto.getPreco());
        payload.put("precoDesconto", produto.getPrecoDesconto());
        payload.put("estoque", produto.getQtdEstoque());
        payload.put("ativo", produto.getAtivo());
        payload.put("categoria", produto.getCategoria() != null ? produto.getCategoria().getNome() : "Sem categoria");
        enviar("produto", payload);
    }

    public void logCategoria(String acao, Categoria categoria) {
        if (categoria == null) return;
        Map<String, Object> payload = new HashMap<>();
        payload.put("acao", acao);
        payload.put("id", categoria.getId());
        payload.put("nome", categoria.getNome());
        payload.put("ativo", categoria.getAtivo());
        enviar("categoria", payload);
    }

    public void logPromocao(String acao, Promocao promocao) {
        if (promocao == null) return;
        Map<String, Object> payload = new HashMap<>();
        payload.put("acao", acao);
        payload.put("id", promocao.getId());
        payload.put("nomeEvento", promocao.getNomeEvento());
        payload.put("percentualDesconto", promocao.getPercentualDesconto());
        payload.put("ativo", promocao.getAtivo());
        payload.put("quantidadeProdutos", promocao.getProdutos() != null ? promocao.getProdutos().size() : 0);
        enviar("promocao", payload);
    }

    public void logUsuario(String acao, Usuario usuario) {
        if (usuario == null) return;
        Map<String, Object> payload = new HashMap<>();
        payload.put("acao", acao);
        payload.put("id", usuario.getId());
        payload.put("nome", usuario.getNome());
        payload.put("usuario", usuario.getUsuario());
        payload.put("email", usuario.getEmail());
        payload.put("perfil", usuario.getPerfil());
        enviar("usuario", payload);
    }

    public void logSistema(String level, String message, String source) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("level", level);
        payload.put("message", message);
        payload.put("source", source);
        enviar("logs", payload);
    }
}
