
package com.devsenai2a.petshop.services;

import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class SiteActionLogService {
    private final DiscordBotService discordBotService;

    public SiteActionLogService(DiscordBotService discordBotService) {
        this.discordBotService = discordBotService;
    }

    public void registrar(String area, String acao, String alvo, Object actor, Map<String, Object> detalhes) {
        Map<String, Object> safe = detalhes != null ? detalhes : new LinkedHashMap<>();
        discordBotService.enviarLogAcao(area, acao, alvo, actor, safe);
    }
}
