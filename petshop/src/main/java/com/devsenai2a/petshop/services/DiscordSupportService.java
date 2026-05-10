package com.devsenai2a.petshop.services;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.devsenai2a.petshop.entities.SuporteMensagem;
import com.devsenai2a.petshop.entities.SuporteTicket;

@Service
public class DiscordSupportService {

    private final WebClient webClient;

    @Value("${discord.bot.url:http://localhost:3001}")
    private String botUrl;

    @Value("${discord.bot.api-key:petzilla-secret-123}")
    private String apiKey;

    public DiscordSupportService(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    public String criarCanalTicket(SuporteTicket ticket, String mensagemInicial) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("ticketId", ticket.getId());
            payload.put("nome", ticket.getNome());
            payload.put("email", ticket.getEmail());
            payload.put("assunto", ticket.getAssunto());
            payload.put("mensagem", mensagemInicial);

            DiscordTicketResponse response = webClient.post()
                    .uri(botUrl + "/api/suporte/ticket")
                    .header("x-api-key", apiKey)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(DiscordTicketResponse.class)
                    .block();

            if (response != null && response.isSuccess()) {
                return response.getChannelId();
            }
        } catch (Exception e) {
            System.out.println("Erro ao criar canal de suporte no Discord: " + e.getMessage());
        }

        return null;
    }

    public void enviarMensagemCliente(SuporteTicket ticket, SuporteMensagem mensagem) {
        if (ticket == null || mensagem == null || ticket.getDiscordChannelId() == null || ticket.getDiscordChannelId().isBlank()) {
            return;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("ticketId", ticket.getId());
            payload.put("channelId", ticket.getDiscordChannelId());
            payload.put("autorNome", mensagem.getAutorNome());
            payload.put("mensagem", mensagem.getMensagem());

            webClient.post()
                    .uri(botUrl + "/api/suporte/mensagem-cliente")
                    .header("x-api-key", apiKey)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe();
        } catch (Exception e) {
            System.out.println("Erro ao enviar mensagem do cliente para o Discord: " + e.getMessage());
        }
    }

    public void enviarLog(String level, String message, String source, Map<String, Object> data) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("level", level);
            payload.put("message", message);
            payload.put("source", source);
            if (data != null) payload.put("data", data);

            webClient.post()
                    .uri(botUrl + "/api/logs")
                    .header("x-api-key", apiKey)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .subscribe();
        } catch (Exception e) {
            System.out.println("Erro ao enviar log para o Discord: " + e.getMessage());
        }
    }

    public static class DiscordTicketResponse {
        private boolean success;
        private String channelId;
        private String channelName;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getChannelId() { return channelId; }
        public void setChannelId(String channelId) { this.channelId = channelId; }
        public String getChannelName() { return channelName; }
        public void setChannelName(String channelName) { this.channelName = channelName; }
    }
}
