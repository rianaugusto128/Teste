
package com.devsenai2a.petshop.controllers;

import com.devsenai2a.petshop.services.SiteActionLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/site-logs")
@CrossOrigin(origins = "*")
public class SiteLogController {
    private final SiteActionLogService siteActionLogService;

    public SiteLogController(SiteActionLogService siteActionLogService) {
        this.siteActionLogService = siteActionLogService;
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody SiteLogRequest request) {
        try {
            Map<String, Object> detalhes = request.detalhes != null ? request.detalhes : new LinkedHashMap<>();
            detalhes.put("origem", request.origem);
            detalhes.put("sucesso", request.sucesso);
            detalhes.put("statusHttp", request.statusHttp);
            siteActionLogService.registrar(request.area, request.acao, request.alvo, request.actor, detalhes);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("ok", false));
        }
    }

    public static class SiteLogRequest {
        public String area;
        public String acao;
        public String alvo;
        public Boolean sucesso;
        public Integer statusHttp;
        public String origem;
        public Object actor;
        public Map<String, Object> detalhes;
    }
}
