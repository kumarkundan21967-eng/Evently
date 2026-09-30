package com.evently.evently.model;

import jakarta.persistence.*;

@Entity
@Table(name = "event")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "location")
    private String location;

    @Column(name = "date")
    private String date;

    @Column(name = "time")
    private String time;

    @Column(name = "organizer")
    private String organizer;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "organizer_email")
    private String organizerEmail;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "status")
    private String status = "PENDING";


    // ID
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


    // NAME
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }


    // DESCRIPTION
    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }


    // LOCATION
    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }


    // DATE
    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }


    // TIME
    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }


    // ORGANIZER
    public String getOrganizer() {
        return organizer;
    }

    public void setOrganizer(String organizer) {
        this.organizer = organizer;
    }

    public String getOrganizerEmail() { return organizerEmail; }
    public void setOrganizerEmail(String organizerEmail) { this.organizerEmail = organizerEmail; }


    // CAPACITY
    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }


    // STATUS
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
