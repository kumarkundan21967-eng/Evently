package com.evently.evently.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Hellocontroller {

    @GetMapping("/")
    public String home() {
        return "Evently Backend is Running!";
    }
}