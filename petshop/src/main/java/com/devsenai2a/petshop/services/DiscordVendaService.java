package com.devsenai2a.petshop.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class DiscordVendaService {
    private final WebClient webClient;

    @Value("${discord.bot.url:http://localhost:3001}")
    private String botUrl;

    @Value("${discord.bot.api-key:petzilla-secret-123}")
    private String apiKey;

    public DiscordVendaService(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    public void enviarVenda(Map<String, Object> payload) {
        try {
            webClient.post()
                    .uri(botUrl + "/api/vendas")
                    .header("x-api-key", apiKey)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe();
        } catch (Exception e) {
            System.out.println("Erro ao enviar venda para o bot Discord: " + e.getMessage());
        }
    }
}
