
package com.devsenai2a.petshop.services;

import com.devsenai2a.petshop.entities.SuporteMensagem;
import com.devsenai2a.petshop.entities.SuporteTicket;
import com.devsenai2a.petshop.entities.Usuario;
import com.devsenai2a.petshop.repositories.SuporteMensagemRepository;
import com.devsenai2a.petshop.repositories.SuporteTicketRepository;
import com.devsenai2a.petshop.repositories.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SuporteService {
    private final SuporteTicketRepository ticketRepository;
    private final SuporteMensagemRepository mensagemRepository;
    private final UsuarioRepository usuarioRepository;
    private final DiscordBotService discordBotService;

    public SuporteService(SuporteTicketRepository ticketRepository, SuporteMensagemRepository mensagemRepository,
                          UsuarioRepository usuarioRepository, DiscordBotService discordBotService) {
        this.ticketRepository = ticketRepository;
        this.mensagemRepository = mensagemRepository;
        this.usuarioRepository = usuarioRepository;
        this.discordBotService = discordBotService;
    }

    public SuporteTicket criarTicket(String nome, String email, String assunto, String mensagem, String autorFoto) {
        validarTexto(nome, "Informe o nome.");
        validarTexto(email, "Informe o e-mail.");
        validarTexto(mensagem, "Informe a mensagem.");
        if (!email.contains("@")) throw new IllegalArgumentException("Informe um e-mail vÃ¡lido.");

        SuporteTicket ticket = new SuporteTicket();
        ticket.setNome(nome.trim());
        ticket.setEmail(email.trim().toLowerCase());
        ticket.setAssunto(assunto != null && !assunto.isBlank() ? assunto.trim() : "Suporte PetZilla");
        ticket.setStatus("ABERTO");
        ticket.setCriadoEm(LocalDateTime.now());
        ticket.setAtualizadoEm(LocalDateTime.now());
        SuporteTicket salvo = ticketRepository.save(ticket);

        adicionarMensagemInterna(salvo, "CLIENTE", salvo.getNome(), autorFoto, mensagem);
        Map<String, Object> detalhes = new LinkedHashMap<>();
        detalhes.put("email", salvo.getEmail());
        detalhes.put("assunto", salvo.getAssunto());
        discordBotService.enviarLogAcao("SUPORTE", "Novo ticket criado", "Ticket #" + salvo.getId(), Map.of("nome", salvo.getNome(), "usuario", salvo.getEmail(), "cargo", "Cliente"), detalhes);
        return buscarPorId(salvo.getId());
    }

    public SuporteTicket buscarPorId(Long id) {
        return ticketRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Ticket nÃ£o encontrado."));
    }

    public List<SuporteTicket> listar(String status) {
        if (status != null && !status.isBlank()) return ticketRepository.findByStatusOrderByCriadoEmDesc(status.trim().toUpperCase());
        return ticketRepository.findAllByOrderByCriadoEmDesc();
    }

    public Map<String, Object> stats() {
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("abertos", ticketRepository.countByStatus("ABERTO"));
        dados.put("fechados", ticketRepository.countByStatus("FECHADO"));
        dados.put("total", ticketRepository.count());
        return dados;
    }

    public SuporteMensagem adicionarMensagem(Long ticketId, String autorTipo, String autorNome, String autorFoto, String mensagem) {
        validarTexto(mensagem, "Informe a mensagem.");
        SuporteTicket ticket = buscarPorId(ticketId);
        if ("FECHADO".equalsIgnoreCase(ticket.getStatus())) throw new IllegalArgumentException("Ticket jÃ¡ estÃ¡ fechado.");
        SuporteMensagem msg = adicionarMensagemInterna(ticket, autorTipo, autorNome, autorFoto, mensagem);
        ticket.setAtualizadoEm(LocalDateTime.now());
        ticketRepository.save(ticket);
        return msg;
    }

    private SuporteMensagem adicionarMensagemInterna(SuporteTicket ticket, String autorTipo, String autorNome, String autorFoto, String mensagem) {
        SuporteMensagem msg = new SuporteMensagem();
        msg.setTicket(ticket);
        msg.setAutorTipo(autorTipo != null && !autorTipo.isBlank() ? autorTipo.trim().toUpperCase() : "SISTEMA");
        msg.setAutorNome(autorNome != null && !autorNome.isBlank() ? autorNome.trim() : msg.getAutorTipo());
        msg.setAutorFoto(autorFoto != null && !autorFoto.isBlank() ? autorFoto.trim() : null);
        msg.setMensagem(mensagem.trim());
        msg.setCriadoEm(LocalDateTime.now());
        return mensagemRepository.save(msg);
    }

    public List<SuporteMensagem> mensagens(Long ticketId) {
        buscarPorId(ticketId);
        return mensagemRepository.findByTicketIdOrderByCriadoEmAsc(ticketId);
    }

    public SuporteTicket fechar(Long ticketId, Long adminId) {
        SuporteTicket ticket = buscarPorId(ticketId);
        if ("FECHADO".equalsIgnoreCase(ticket.getStatus())) return ticket;
        Usuario admin = null;
        if (adminId != null) admin = usuarioRepository.findById(adminId).orElse(null);

        ticket.setStatus("FECHADO");
        ticket.setFechadoEm(LocalDateTime.now());
        ticket.setFechadoPor(admin);
        ticket.setAtualizadoEm(LocalDateTime.now());
        SuporteTicket fechado = ticketRepository.save(ticket);

        enviarTranscriptDiscord(fechado, admin);
        return fechado;
    }

    private void enviarTranscriptDiscord(SuporteTicket ticket, Usuario admin) {
        List<Map<String, Object>> mensagens = mensagemRepository.findByTicketIdOrderByCriadoEmAsc(ticket.getId()).stream().map(m -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("autorTipo", m.getAutorTipo());
            item.put("autorNome", m.getAutorNome());
            item.put("mensagem", m.getMensagem());
            item.put("criadoEm", m.getCriadoEm());
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ticketId", ticket.getId());
        payload.put("cliente", Map.of("nome", ticket.getNome(), "email", ticket.getEmail(), "assunto", ticket.getAssunto()));
        payload.put("fechadoPor", actor(admin));
        payload.put("mensagens", mensagens);
        discordBotService.enviarConversaFinalizada(payload);
    }

    private Map<String, Object> actor(Usuario usuario) {
        if (usuario == null) return Map.of("nome", "Sistema", "usuario", "sistema", "cargo", "Sistema");
        Map<String, Object> actor = new LinkedHashMap<>();
        actor.put("id", usuario.getId());
        actor.put("nome", usuario.getNome());
        actor.put("usuario", usuario.getUsuario());
        actor.put("perfil", usuario.getPerfil());
        actor.put("cargo", usuario.getCargo() != null ? usuario.getCargo().getNome() : usuario.getPerfil());
        return actor;
    }

    private void validarTexto(String texto, String erro) {
        if (texto == null || texto.trim().isEmpty()) throw new IllegalArgumentException(erro);
    }
}


