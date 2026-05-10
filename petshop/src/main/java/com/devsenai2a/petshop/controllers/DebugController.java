package com.devsenai2a.petshop.controllers;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devsenai2a.petshop.repositories.CargoRepository;
import com.devsenai2a.petshop.repositories.CategoriaRepository;
import com.devsenai2a.petshop.repositories.ProdutoRepository;
import com.devsenai2a.petshop.repositories.PromocaoRepository;
import com.devsenai2a.petshop.repositories.UsuarioRepository;

@RestController
@RequestMapping("/api/debug")
@CrossOrigin(origins = "*")
public class DebugController {

    @Autowired private ProdutoRepository produtoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private PromocaoRepository promocaoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CargoRepository cargoRepository;

    @GetMapping("/counts")
    public Map<String, Long> counts() {
        Map<String, Long> dados = new LinkedHashMap<>();
        dados.put("produtos", produtoRepository.count());
        dados.put("categorias", categoriaRepository.count());
        dados.put("promocoes", promocaoRepository.count());
        dados.put("usuarios", usuarioRepository.count());
        dados.put("cargos", cargoRepository.count());
        return dados;
    }
}
