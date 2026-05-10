package com.devsenai2a.petshop.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class VendaStoreService {
    private final ObjectMapper mapper;
    private final Path arquivo;

    public VendaStoreService(ObjectMapper mapper) {
        this.mapper = mapper.copy().findAndRegisterModules().enable(SerializationFeature.INDENT_OUTPUT);
        this.arquivo = Paths.get("target", "petzilla-vendas.json");
    }

    public synchronized Map<String, Object> salvar(Map<String, Object> venda) {
        List<Map<String, Object>> vendas = carregarTodas();
        Map<String, Object> registro = new LinkedHashMap<>(venda);
        registro.putIfAbsent("statusEntrega", "RECEBIDO");
        registro.putIfAbsent("observacoesInternas", "");
        registro.putIfAbsent("codigoRastreio", "");
        registro.putIfAbsent("criadoEm", LocalDateTime.now().toString());
        registro.put("atualizadoEm", LocalDateTime.now().toString());
        vendas.add(registro);
        salvarTodas(vendas);
        return registro;
    }

    public synchronized List<Map<String, Object>> listar() {
        List<Map<String, Object>> vendas = carregarTodas();
        vendas.sort(Comparator.comparing(v -> String.valueOf(v.getOrDefault("criadoEm", "")), Comparator.reverseOrder()));
        return vendas;
    }

    public synchronized Map<String, Object> atualizarStatus(String pedidoId, String statusEntrega, String observacoesInternas, String codigoRastreio) {
        List<Map<String, Object>> vendas = carregarTodas();
        for (Map<String, Object> venda : vendas) {
            if (String.valueOf(venda.get("pedidoId")).equalsIgnoreCase(pedidoId)) {
                if (statusEntrega != null && !statusEntrega.isBlank()) venda.put("statusEntrega", statusEntrega.trim().toUpperCase());
                if (observacoesInternas != null) venda.put("observacoesInternas", observacoesInternas.trim());
                if (codigoRastreio != null) venda.put("codigoRastreio", codigoRastreio.trim());
                venda.put("atualizadoEm", LocalDateTime.now().toString());
                salvarTodas(vendas);
                return venda;
            }
        }
        throw new IllegalArgumentException("Pedido nao encontrado.");
    }

    public synchronized Map<String, Object> stats() {
        List<Map<String, Object>> vendas = carregarTodas();
        BigDecimal totalVendido = BigDecimal.ZERO;
        int itensVendidos = 0;
        Map<String, Integer> porStatus = new LinkedHashMap<>();
        Map<String, Integer> produtoQuantidade = new LinkedHashMap<>();
        Map<String, BigDecimal> produtoTotal = new LinkedHashMap<>();

        for (Map<String, Object> venda : vendas) {
            totalVendido = totalVendido.add(toBigDecimal(venda.get("total")));
            String status = String.valueOf(venda.getOrDefault("statusEntrega", "RECEBIDO"));
            porStatus.put(status, porStatus.getOrDefault(status, 0) + 1);
            Object produtosObj = venda.get("produtos");
            if (produtosObj instanceof List<?> produtos) {
                for (Object obj : produtos) {
                    if (!(obj instanceof Map<?, ?> p)) continue;
                    String nome = String.valueOf(p.get("nome") != null ? p.get("nome") : "Produto");
                    int qtd = toInt(p.get("quantidade"));
                    BigDecimal preco = toBigDecimal(p.get("precoFinal"));
                    itensVendidos += qtd;
                    produtoQuantidade.put(nome, produtoQuantidade.getOrDefault(nome, 0) + qtd);
                    produtoTotal.put(nome, produtoTotal.getOrDefault(nome, BigDecimal.ZERO).add(preco.multiply(BigDecimal.valueOf(qtd))));
                }
            }
        }

        List<Map<String, Object>> topProdutos = produtoQuantidade.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(e -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("nome", e.getKey());
                    item.put("quantidade", e.getValue());
                    item.put("total", produtoTotal.getOrDefault(e.getKey(), BigDecimal.ZERO));
                    return item;
                }).toList();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalVendido", totalVendido);
        stats.put("totalPedidos", vendas.size());
        stats.put("ticketMedio", vendas.isEmpty() ? BigDecimal.ZERO : totalVendido.divide(BigDecimal.valueOf(vendas.size()), 2, java.math.RoundingMode.HALF_UP));
        stats.put("itensVendidos", itensVendidos);
        stats.put("porStatus", porStatus);
        stats.put("topProdutos", topProdutos);
        return stats;
    }

    private List<Map<String, Object>> carregarTodas() {
        try {
            if (!Files.exists(arquivo)) return new ArrayList<>();
            return mapper.readValue(Files.readString(arquivo), new TypeReference<List<Map<String, Object>>>() {});
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    private void salvarTodas(List<Map<String, Object>> vendas) {
        try {
            Files.createDirectories(arquivo.getParent());
            mapper.writeValue(arquivo.toFile(), vendas);
        } catch (IOException e) {
            throw new IllegalStateException("Nao foi possivel salvar as vendas.", e);
        }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(String.valueOf(value)); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private int toInt(Object value) {
        if (value instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(value)); } catch (Exception e) { return 0; }
    }
}

