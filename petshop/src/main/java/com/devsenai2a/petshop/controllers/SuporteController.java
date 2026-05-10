
package com.devsenai2a.petshop.controllers;

import com.devsenai2a.petshop.entities.SuporteMensagem;
import com.devsenai2a.petshop.entities.SuporteTicket;
import com.devsenai2a.petshop.services.SuporteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/suporte")
@CrossOrigin(origins = "*")
public class SuporteController {
    private final SuporteService suporteService;
    private static final Map<Long, TypingState> typingStates = new ConcurrentHashMap<>();

    public SuporteController(SuporteService suporteService) {
        this.suporteService = suporteService;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() { return ResponseEntity.ok(new SimpleResponse(true, "Suporte online")); }

    @PostMapping("/tickets")
    public ResponseEntity<?> criar(@RequestBody CriarTicketRequest request) {
        try {
            if (request == null) throw new IllegalArgumentException("Informe os dados do ticket.");
            SuporteTicket ticket = suporteService.criarTicket(request.nome, request.email, request.assunto, request.mensagem, request.autorFoto);
            return ResponseEntity.ok(TicketResponse.from(ticket));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(new ErrorResponse("Erro ao criar ticket. Verifique se as tabelas suporte_ticket e suporte_mensagem existem no banco."));
        }
    }

    @GetMapping("/tickets")
    public ResponseEntity<?> listar(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(suporteService.listar(status).stream().map(TicketResponse::from).toList());
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<?> buscar(@PathVariable Long id) {
        try { return ResponseEntity.ok(TicketResponse.from(suporteService.buscarPorId(id))); }
        catch (IllegalArgumentException e) { return ResponseEntity.status(404).body(new ErrorResponse(e.getMessage())); }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() { return ResponseEntity.ok(suporteService.stats()); }

    @GetMapping("/tickets/{id}/mensagens")
    public ResponseEntity<?> mensagens(@PathVariable Long id) {
        try { return ResponseEntity.ok(suporteService.mensagens(id).stream().map(MensagemResponse::from).toList()); }
        catch (IllegalArgumentException e) { return ResponseEntity.status(404).body(new ErrorResponse(e.getMessage())); }
    }

    @GetMapping("/tickets/{id}/typing")
    public ResponseEntity<?> typing(@PathVariable Long id) {
        TypingState state = typingStates.get(id);
        boolean active = state != null && state.digitando && Instant.now().toEpochMilli() - state.atualizadoEm < 4500;
        if (!active && state != null) typingStates.remove(id);
        return ResponseEntity.ok(new TypingResponse(active, active ? state.autorTipo : null, active ? state.autorNome : null));
    }

    @PostMapping("/tickets/{id}/typing")
    public ResponseEntity<?> typing(@PathVariable Long id, @RequestBody TypingRequest request) {
        if (request == null || !request.digitando) {
            typingStates.remove(id);
            return ResponseEntity.ok(new TypingResponse(false, null, null));
        }

        TypingState state = new TypingState();
        state.autorTipo = request.autorTipo != null && !request.autorTipo.isBlank() ? request.autorTipo.trim().toUpperCase() : "ATENDENTE";
        state.autorNome = request.autorNome != null && !request.autorNome.isBlank() ? request.autorNome.trim() : state.autorTipo;
        state.digitando = true;
        state.atualizadoEm = Instant.now().toEpochMilli();
        typingStates.put(id, state);
        return ResponseEntity.ok(new TypingResponse(true, state.autorTipo, state.autorNome));
    }

    @PostMapping("/tickets/{id}/mensagens")
    public ResponseEntity<?> mensagem(@PathVariable Long id, @RequestBody NovaMensagemRequest request) {
        try {
            if (request == null) throw new IllegalArgumentException("Informe a mensagem.");
            SuporteMensagem msg = suporteService.adicionarMensagem(id, request.autorTipo, request.autorNome, request.autorFoto, request.mensagem);
            return ResponseEntity.ok(MensagemResponse.from(msg));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(new ErrorResponse("Erro ao salvar mensagem de suporte."));
        }
    }

    @PostMapping("/tickets/{id}/fechar")
    public ResponseEntity<?> fechar(@PathVariable Long id, @RequestBody(required = false) FecharTicketRequest request) {
        try {
            Long adminId = request != null ? request.adminId : null;
            return ResponseEntity.ok(TicketResponse.from(suporteService.fechar(id, adminId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    public static class CriarTicketRequest { public String nome; public String email; public String assunto; public String mensagem; public String autorFoto; }
    public static class NovaMensagemRequest { public String autorTipo; public String autorNome; public String autorFoto; public String mensagem; }
    public static class FecharTicketRequest { public Long adminId; }
    public static class TypingRequest { public String autorTipo; public String autorNome; public boolean digitando; }
    public static class ErrorResponse { public String mensagem; public ErrorResponse(String mensagem) { this.mensagem = mensagem; } }
    public static class SimpleResponse { public boolean ok; public String mensagem; public SimpleResponse(boolean ok, String mensagem) { this.ok = ok; this.mensagem = mensagem; } }

    private static class TypingState {
        public String autorTipo;
        public String autorNome;
        public boolean digitando;
        public long atualizadoEm;
    }

    public static class TypingResponse {
        public boolean digitando;
        public String autorTipo;
        public String autorNome;

        public TypingResponse(boolean digitando, String autorTipo, String autorNome) {
            this.digitando = digitando;
            this.autorTipo = autorTipo;
            this.autorNome = autorNome;
        }
    }

    public static class TicketResponse {
        public Long id;
        public String nome;
        public String email;
        public String assunto;
        public String status;
        public Object criadoEm;
        public Object atualizadoEm;
        public Object fechadoEm;

        public static TicketResponse from(SuporteTicket ticket) {
            TicketResponse response = new TicketResponse();
            response.id = ticket.getId();
            response.nome = ticket.getNome();
            response.email = ticket.getEmail();
            response.assunto = ticket.getAssunto();
            response.status = ticket.getStatus();
            response.criadoEm = ticket.getCriadoEm();
            response.atualizadoEm = ticket.getAtualizadoEm();
            response.fechadoEm = ticket.getFechadoEm();
            return response;
        }
    }

    public static class MensagemResponse {
        public Long id;
        public String autorTipo;
        public String autorNome;
        public String autorFoto;
        public String mensagem;
        public Object criadoEm;

        public static MensagemResponse from(SuporteMensagem mensagem) {
            MensagemResponse response = new MensagemResponse();
            response.id = mensagem.getId();
            response.autorTipo = mensagem.getAutorTipo();
            response.autorNome = mensagem.getAutorNome();
            response.autorFoto = mensagem.getAutorFoto();
            response.mensagem = mensagem.getMensagem();
            response.criadoEm = mensagem.getCriadoEm();
            return response;
        }
    }
}


