
package com.devsenai2a.petshop.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class DiscordBotService {
    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper;

    @Value("${discord.bot.url:http://localhost:3001}")
    private String botUrl;

    @Value("${discord.bot.api-key:petzilla-secret-123}")
    private String apiKey;

    public DiscordBotService() {
        mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
    }

    private void postAsync(String endpoint, Object payload) {
        try {
            String json = mapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(botUrl + "/api/" + endpoint))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .exceptionally(error -> {
                        System.out.println("Bot Discord indisponível: " + error.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            System.out.println("Erro ao preparar envio para bot Discord: " + e.getMessage());
        }
    }

    public void enviarLogAcao(String area, String acao, String alvo, Object actor, Map<String, Object> detalhes) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("area", area);
        payload.put("acao", acao);
        payload.put("alvo", alvo);
        payload.put("actor", actor);
        payload.put("detalhes", detalhes);
        postAsync("site/log", payload);
    }

    public void enviarConversaFinalizada(Map<String, Object> transcript) {
        postAsync("support/transcript", transcript);
    }
}
